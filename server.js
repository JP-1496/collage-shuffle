import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const http = createServer(app);
const wss = new WebSocketServer({ server: http, path: '/ws' });
const PORT = process.env.PORT || 10000;
const games = new Map();
const sockets = new Map();
const id = () => crypto.randomUUID();
const code = () => Math.random().toString(36).slice(2, 6).toUpperCase();
const shuffle = a => [...a].sort(() => Math.random() - .5);
const clone = x => JSON.parse(JSON.stringify(x));

app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('/health', (_, res) => res.json({ ok: true, version: '1.1.2' }));
app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function send(pid, msg) {
  const ws = sockets.get(pid);
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}
function broadcast(g) { for (const p of g.players) send(p.id, { type: 'STATE', state: stateFor(g, p.id) }); }
function stateFor(g, pid) {
  const s = clone(g);
  // Keep image traffic small: during submission, ordinary players only need their own images.
  if (g.phase === 'IMAGE_SUBMISSION' && !g.players.find(x => x.id === pid)?.host) {
    s.sources = g.sources.filter(x => x.ownerId === pid);
  }
  // Hide source images outside a player's personal R1 selection.
  if (g.phase === 'ROUND' && g.round === 0) {
    const allowed = new Set(g.roundSources[pid] || []);
    s.sources = g.sources.filter(x => allowed.has(x.id));
  } else if (g.phase !== 'IMAGE_SUBMISSION' && g.phase !== 'HOST_APPROVAL') s.sources = [];
  // Never expose owner identity during voting/reveal through collage records.
  if (g.phase === 'VOTING' || g.phase === 'REVEAL') {
    s.collages = Object.fromEntries(Object.entries(g.collages).map(([k, c]) => [k, { ...c, ownerLabel: undefined }]));
  }
  return s;
}
function newGame(name, settings, host) {
  const g = { code: code(), name, phase:'LOBBY', settings, players:[host], sources:[], prompts:[], promptOrder:[], round:0, roundSources:{}, roundPlayerSets:{}, collages:{}, votes:{}, scores:{}, timerEndsAt:null, submittedSources:{}, disconnected:false };
  games.set(g.code, g); return g;
}
function transition(g, phase) { g.phase = phase; g.timerEndsAt = null; broadcast(g); }
function startGame(g) { transition(g, 'IMAGE_SUBMISSION'); }
function sourceCount(g, pid) { return g.sources.filter(s => s.ownerId === pid).length; }
function beginPrompts(g) { g.phase='PROMPT_SUBMISSION'; g.prompts=[]; broadcast(g); }
function assignRound1Sources(g) {
  const pool = g.sources.filter(s => s.approved !== false);
  for (const p of g.players) {
    const wanted = Math.min(g.settings.round1Images, pool.length);
    g.roundSources[p.id] = shuffle(pool).slice(0, wanted).map(x => x.id);
  }
}
function beginRound(g) {
  if (!g.promptOrder.length) g.promptOrder = shuffle(g.prompts.map(p => p.id));
  if (g.round >= g.players.length) { transition(g, 'FINAL'); return; }
  const ids = g.players.map(p => p.id);
  const promptId = g.promptOrder[g.round];
  g.currentPromptId = promptId;
  g.roundPlayerSets = {};
  for (let i=0;i<ids.length;i++) g.roundPlayerSets[ids[i]] = ids[(i+g.round)%ids.length];
  g.collages = {};
  g.votes = {};
  if (g.round === 0) assignRound1Sources(g);
  else {
    for (const p of g.players) {
      const owner = g.roundPlayerSets[p.id];
      const prior = g.travelingSets[owner] || [];
      g.collages[p.id] = { playerId:p.id, promptId, pieces: scatter(prior), submitted:false };
    }
  }
  if (g.round === 0) for (const p of g.players) g.collages[p.id] = { playerId:p.id, promptId, pieces:[], submitted:false };
  g.phase='ROUND';
  g.timerEndsAt = Date.now() + g.settings.creationSeconds*1000;
  broadcast(g);
  scheduleTimer(g, g.settings.creationSeconds*1000, () => { if (g.phase==='ROUND') { for (const c of Object.values(g.collages)) c.submitted=true; startVoting(g); }});
}
function scatter(pieces) { return pieces.map((p,i)=>({...p,id:id(),x:15+((i*29)%70),y:15+((i*47)%70),z:i})); }
function startVoting(g) {
  g.phase='VOTING'; g.timerEndsAt=Date.now()+g.settings.votingSeconds*1000; broadcast(g);
  scheduleTimer(g,g.settings.votingSeconds*1000,()=>{ if(g.phase==='VOTING') finishVoting(g); });
}
function finishVoting(g) {
  const tally={};
  for (const votes of Object.values(g.votes)) { const target=votes[g.currentPromptId]; if(target) tally[target]=(tally[target]||0)+1; }
  for (const [pid, pts] of Object.entries(tally)) g.scores[pid]=(g.scores[pid]||0)+pts;
  g.lastTally=tally; g.phase='REVEAL'; g.timerEndsAt=null; broadcast(g);
}
function scheduleTimer(g, ms, fn) { const marker=g.phase+':'+g.round+':'+Date.now(); g.timerMarker=marker; setTimeout(()=>{ if(g.timerMarker===marker) fn(); }, ms); }
function handle(g,pid,m) {
  const p=g.players.find(x=>x.id===pid); if(!p) return;
  switch(m.type) {
    case 'SET_READY': if(g.phase==='LOBBY'&&!p.host)p.ready=!!m.ready; break;
    case 'SET_SETTINGS': if(g.phase==='LOBBY'&&p.host) g.settings={...g.settings,...m.settings}; break;
    case 'START': if(g.phase==='LOBBY'&&p.host&&g.players.length>=3) startGame(g); break;
    case 'ADD_SOURCE': if(g.phase==='IMAGE_SUBMISSION'&&sourceCount(g,pid)<g.settings.imagesPerPlayer&&typeof m.data==='string'&&m.data.startsWith('data:image/')) { g.sources.push({id:id(),data:m.data,ownerId:pid,approved:true}); if(g.players.every(x=>sourceCount(g,x.id)>=g.settings.imagesPerPlayer)) { if(g.settings.hostApproval) transition(g,'HOST_APPROVAL'); else beginPrompts(g); } } break;
    case 'APPROVAL_DONE': if(g.phase==='HOST_APPROVAL'&&p.host) { g.sources=g.sources.filter(x=>x.approved!==false); if(g.sources.length) beginPrompts(g); } break;
    case 'DELETE_SOURCE': if(g.phase==='HOST_APPROVAL'&&p.host) g.sources=g.sources.filter(x=>x.id!==m.sourceId); break;
    case 'ADD_PROMPT': if(g.phase==='PROMPT_SUBMISSION'&&!g.prompts.some(x=>x.ownerId===pid)&&String(m.text).trim()) { g.prompts.push({id:id(),text:String(m.text).trim().slice(0,500),ownerId:pid}); if(g.prompts.length===g.players.length) { g.promptOrder=shuffle(g.prompts.map(x=>x.id)); g.round=0; beginRound(g); } } break;
    case 'SUBMIT_COLLAGE': if(g.phase==='ROUND') { const c=g.collages[pid]; if(c&&!c.submitted) { c.pieces=(Array.isArray(m.pieces)?m.pieces:[]).slice(0,100).map((x,i)=>({...x,id:x.id||id(),z:i})); c.submitted=true; g.travelingSets ??={}; g.travelingSets[pid]=clone(c.pieces); } if(Object.values(g.collages).every(c=>c.submitted)) startVoting(g); } break;
    case 'VOTE': if(g.phase==='VOTING'&&m.targetId&&m.targetId!==pid) { g.votes[pid] ??={}; g.votes[pid][g.currentPromptId]=m.targetId; if(Object.keys(g.votes).filter(k=>g.players.find(x=>x.id===k)?.connected).length>=g.players.filter(x=>x.connected).length) finishVoting(g); } break;
    case 'NEXT': if(g.phase==='REVEAL'&&p.host) { g.round++; beginRound(g); } break;
  }
  broadcast(g);
}

wss.on('connection', ws => {
  ws.on('message', raw => {
    try {
      const m=JSON.parse(String(raw));
      if(m.type==='HOST_CREATE') {
        const pid=id(); const host={id:pid,name:String(m.name||'Player').slice(0,24),avatar:m.avatar||'😀',host:true,ready:true,connected:true};
        const settings={capacity:Math.max(3,Math.min(16,Number(m.settings?.capacity)||8)),imagesPerPlayer:Math.max(1,Math.min(10,Number(m.settings?.imagesPerPlayer)||2)),round1Images:Math.max(1,Math.min(12,Number(m.settings?.round1Images)||4)),hostApproval:!!m.settings?.hostApproval,creationSeconds:Math.max(30,Number(m.settings?.creationSeconds)||120),votingSeconds:Math.max(15,Number(m.settings?.votingSeconds)||45)};
        const g=newGame(String(m.lobbyName||'Collage Game').slice(0,40),settings,host); sockets.set(pid,ws); ws.send(JSON.stringify({type:'JOINED',playerId:pid,code:g.code})); broadcast(g); return;
      }
      if(m.type==='JOIN') {
        const g=games.get(String(m.code||'').toUpperCase());
        if(!g||g.phase!=='LOBBY'||g.players.length>=g.settings.capacity){ws.send(JSON.stringify({type:'ERROR',message:'That lobby is unavailable.'}));return;}
        const pid=id(); const pl={id:pid,name:String(m.name||'Player').slice(0,24),avatar:m.avatar||'😀',host:false,ready:false,connected:true}; g.players.push(pl); sockets.set(pid,ws); ws.send(JSON.stringify({type:'JOINED',playerId:pid,code:g.code})); broadcast(g); return;
      }
      if(m.type==='ACTION') { const pid=m.playerId; if(sockets.get(pid)!==ws)return; const g=[...games.values()].find(x=>x.players.some(p=>p.id===pid)); if(g) handle(g,pid,m.action); }
    } catch { ws.send(JSON.stringify({type:'ERROR',message:'Invalid message.'})); }
  });
  ws.on('close',()=>{ for(const g of games.values()){ const p=g.players.find(p=>sockets.get(p.id)===ws); if(p){p.connected=false; broadcast(g);} } });
});

http.listen(PORT,'0.0.0.0',()=>console.log(`Collage 1.1.1 listening on 0.0.0.0:${PORT}`));
