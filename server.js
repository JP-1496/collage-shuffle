import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

const VERSION = '1.4.0';
const MIN_PLAYERS = 2;
const app = express();
const http = createServer(app);
const wss = new WebSocketServer({ server: http, path: '/ws' });
const PORT = Number(process.env.PORT || 10000);
const games = new Map();
const sockets = new Map();
const timers = new Map();
const id = () => crypto.randomUUID();
const code = () => { let c; do c=Math.random().toString(36).slice(2,6).toUpperCase(); while(games.has(c)); return c; };
const shuffle = a => [...a].sort(() => Math.random() - 0.5);
const clone = x => JSON.parse(JSON.stringify(x));

app.use(express.static('public', { setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') }));
app.get('/health', (_, res) => res.json({ ok:true, version:VERSION }));
app.get('*', (_, res) => res.sendFile(process.cwd() + '/public/index.html'));

function send(pid, msg){ const ws=sockets.get(pid); if(ws?.readyState===WebSocket.OPEN) ws.send(JSON.stringify(msg)); }
function broadcast(g){ for(const p of g.players) send(p.id,{type:'STATE',state:stateFor(g,p.id)}); }
function stateFor(g,pid){
  const s=clone(g);
  // Never expose every player's source images to everyone during normal submission.
  if(g.phase==='IMAGE_SUBMISSION') s.sources=g.sources.filter(x=>x.ownerId===pid);
  else if(g.phase==='HOST_APPROVAL') s.sources=g.sources;
  else if(g.phase==='ROUND' && g.round===0){ const allowed=new Set(g.roundSources[pid]||[]); s.sources=g.sources.filter(x=>allowed.has(x.id)); }
  else s.sources=[];
  // Creations are completely hidden during all creation rounds. They are only exposed in the final showcase.
  if(g.phase==='ROUND') s.collages={};
  if(g.phase==='FINAL_SHOWCASE'){const r=g.finalResults[g.finalIndex]||{collages:{}};s.collages=Object.fromEntries(Object.entries(r.collages).map(([k,c])=>[k,{...c,playerId:k}]));}
  else s.collages={};
  return s;
}
function newGame(name,settings,host){ const g={code:code(),name,phase:'LOBBY',minPlayers:MIN_PLAYERS,settings,players:[host],sources:[],submittedSources:{},prompts:[],promptOrder:[],round:0,currentPromptId:null,roundSources:{},roundPlayerSets:{},collages:{},travelingSets:{},votes:{},scores:{},lastTally:{},finalResults:[],finalIndex:0,finalVotes:{},bestCollages:{},timerEndsAt:null}; games.set(g.code,g); return g; }
function cancelTimer(g){ const t=timers.get(g.code); if(t) clearTimeout(t); timers.delete(g.code); }
function schedule(g,ms,fn){ cancelTimer(g); const marker=Date.now()+':'+g.phase+':'+g.round; g.timerMarker=marker; timers.set(g.code,setTimeout(()=>{timers.delete(g.code);if(g.timerMarker===marker)fn();},ms)); }
function transition(g,phase){cancelTimer(g);g.phase=phase;g.timerEndsAt=null;broadcast(g);}
function startGame(g){g.phase='IMAGE_SUBMISSION';broadcast(g);}
function beginPrompts(g){g.phase='PROMPT_SUBMISSION';g.prompts=[];g.promptOrder=[];broadcast(g);}
function assignRound1Sources(g){
  const pool=g.sources.filter(s=>s.approved!==false);
  for(const p of g.players){ const wanted=Math.min(g.settings.round1Images,pool.length); g.roundSources[p.id]=shuffle(pool).slice(0,wanted).map(x=>x.id); }
}
function scatter(pieces){ return pieces.map((p,i)=>({...clone(p),id:id(),x:15+((i*37)%70),y:15+((i*53)%70),z:i})); }
function beginRound(g){
  if(!g.promptOrder.length) g.promptOrder=shuffle(g.prompts.map(p=>p.id));
  if(g.round>=g.players.length){transition(g,'FINAL');return;}
  const ids=g.players.map(p=>p.id);
  g.currentPromptId=g.promptOrder[g.round];
  g.roundPlayerSets={};
  for(let i=0;i<ids.length;i++) g.roundPlayerSets[ids[i]]=ids[(i+g.round)%ids.length];
  g.votes={};g.collages={};
  if(g.round===0){assignRound1Sources(g);for(const p of g.players)g.collages[p.id]={playerId:p.id,promptId:g.currentPromptId,pieces:[],submitted:false};}
  else {for(const p of g.players){const owner=g.roundPlayerSets[p.id];g.collages[p.id]={playerId:p.id,promptId:g.currentPromptId,pieces:scatter(g.travelingSets[owner]||[]),submitted:false};}}
  if(!g.finalResults[g.round])g.finalResults[g.round]={promptId:g.currentPromptId,collages:{}};
  g.phase='ROUND';g.timerEndsAt=Date.now()+g.settings.creationSeconds*1000;broadcast(g);
  schedule(g,g.settings.creationSeconds*1000,()=>{if(g.phase==='ROUND'){for(const c of Object.values(g.collages))c.submitted=true;for(const [pid,c] of Object.entries(g.collages))g.finalResults[g.round].collages[pid]=clone(c);if(g.round+1>=g.players.length)startFinalShowcase(g);else{g.round++;beginRound(g);}}});
}
function startFinalShowcase(g){g.finalIndex=0;g.finalVotes={};g.phase='FINAL_SHOWCASE';g.currentPromptId=g.finalResults[0]?.promptId||null;g.timerEndsAt=Date.now()+g.settings.votingSeconds*1000;broadcast(g);schedule(g,g.settings.votingSeconds*1000,()=>finishFinalPrompt(g));}
function finishFinalPrompt(g){
  const r=g.finalResults[g.finalIndex];
  if(!r){finishFinalGame(g);return;}
  const tally={};
  for(const [pid,target] of Object.entries(g.finalVotes[g.finalIndex]||{})) if(target) tally[target]=(tally[target]||0)+1;
  r.tally=tally;
  for(const [pid,pts] of Object.entries(tally)) g.scores[pid]=(g.scores[pid]||0)+pts;
  g.finalIndex++;
  if(g.finalIndex>=g.finalResults.length){finishFinalGame(g);return;}
  g.currentPromptId=g.finalResults[g.finalIndex].promptId;
  g.timerEndsAt=Date.now()+g.settings.votingSeconds*1000;
  g.finalVotes[g.finalIndex]={};
  broadcast(g);
  schedule(g,g.settings.votingSeconds*1000,()=>finishFinalPrompt(g));
}
function finishFinalGame(g){
  g.bestCollages={};
  for(const p of g.players){
    let best=0;
    for(const r of g.finalResults) best=Math.max(best,r.tally?.[p.id]||0);
    g.bestCollages[p.id]=g.finalResults
      .filter(r=>(r.tally?.[p.id]||0)===best)
      .map(r=>({promptId:r.promptId,pieces:clone(r.collages[p.id]?.pieces||[]),votes:best}));
  }
  g.phase='FINAL';
  g.timerEndsAt=null;
  broadcast(g);
}
function handle(g,pid,a){
  const p=g.players.find(x=>x.id===pid);if(!p)return;
  switch(a.type){
    case 'SET_READY': if(g.phase==='LOBBY'&&!p.host)p.ready=!!a.ready; break;
    case 'START': if(g.phase==='LOBBY'&&p.host&&g.players.filter(x=>x.connected).length>=MIN_PLAYERS)startGame(g); break;
    case 'ADD_SOURCE': if(g.phase==='IMAGE_SUBMISSION'&&(g.settings.imagesPerPlayer==='all'||g.sources.filter(s=>s.ownerId===pid).length<g.settings.imagesPerPlayer)&&typeof a.data==='string'&&a.data.startsWith('data:image/'))g.sources.push({id:id(),data:a.data,ownerId:pid,approved:true}); break;
    case 'SUBMIT_SOURCES': if(g.phase==='IMAGE_SUBMISSION'&&(g.settings.imagesPerPlayer==='all'||g.sources.filter(s=>s.ownerId===pid).length>=g.settings.imagesPerPlayer)){g.submittedSources[pid]=true;if(g.players.every(x=>g.submittedSources[x.id]))g.settings.hostApproval?transition(g,'HOST_APPROVAL'):beginPrompts(g);} break;
    case 'DELETE_SOURCE': if(g.phase==='HOST_APPROVAL'&&p.host)g.sources=g.sources.filter(x=>x.id!==a.sourceId); break;
    case 'APPROVAL_DONE': if(g.phase==='HOST_APPROVAL'&&p.host){g.sources=g.sources.filter(x=>x.approved!==false);if(g.sources.length)beginPrompts(g);} break;
    case 'ADD_PROMPT': if(g.phase==='PROMPT_SUBMISSION'&&!g.prompts.some(x=>x.ownerId===pid)&&String(a.text||'').trim()){g.prompts.push({id:id(),text:String(a.text).trim().slice(0,500),ownerId:pid});if(g.prompts.length===g.players.length){g.promptOrder=shuffle(g.prompts.map(x=>x.id));g.round=0;beginRound(g);}} break;
    case 'SUBMIT_COLLAGE': if(g.phase==='ROUND'){const c=g.collages[pid];if(c&&!c.submitted){c.pieces=(Array.isArray(a.pieces)?a.pieces:[]).slice(0,100).map((x,i)=>({...x,id:x.id||id(),z:i}));c.submitted=true;g.travelingSets[pid]=clone(c.pieces);g.finalResults[g.round].collages[pid]=clone(c);}if(Object.values(g.collages).every(c=>c.submitted)){if(g.round+1>=g.players.length)startFinalShowcase(g);else{g.round++;beginRound(g);}}}break;
    case 'FINAL_VOTE': if(g.phase==='FINAL_SHOWCASE'&&a.targetId&&a.targetId!==pid){g.finalVotes[g.finalIndex]??={};g.finalVotes[g.finalIndex][pid]=a.targetId;const connected=g.players.filter(x=>x.connected).length;if(Object.keys(g.finalVotes[g.finalIndex]).filter(k=>g.players.some(x=>x.id===k&&x.connected)).length>=connected)finishFinalPrompt(g);}break;
  }
  broadcast(g);
}
wss.on('connection',ws=>{
  ws.on('message',raw=>{try{const m=JSON.parse(String(raw));
    if(m.type==='HOST_CREATE'){const pid=id();const host={id:pid,name:String(m.name||'Player').trim().slice(0,24)||'Player',avatar:m.avatar||'😀',host:true,ready:true,connected:true};const st=m.settings||{};const settings={capacity:Math.max(2,Math.min(16,Number(st.capacity)||8)),imagesPerPlayer:st.imagesPerPlayer==='all'?'all':Math.max(1,Math.min(10,Number(st.imagesPerPlayer)||2)),round1Images:Math.max(1,Math.min(12,Number(st.round1Images)||4)),hostApproval:!!st.hostApproval,creationSeconds:Math.max(30,Math.min(600,Number(st.creationSeconds)||120)),votingSeconds:Math.max(15,Math.min(300,Number(st.votingSeconds)||45))};const g=newGame(String(m.lobbyName||'Collage Game').slice(0,40),settings,host);sockets.set(pid,ws);ws.send(JSON.stringify({type:'JOINED',playerId:pid,code:g.code}));broadcast(g);return;}
    if(m.type==='JOIN'){const c=String(m.code||'').trim().toUpperCase(),g=games.get(c),name=String(m.name||'').trim();if(!g||g.phase!=='LOBBY'){ws.send(JSON.stringify({type:'ERROR',message:'That lobby is unavailable.'}));return;}if(g.players.length>=g.settings.capacity){ws.send(JSON.stringify({type:'ERROR',message:'That lobby is full.'}));return;}if(!name){ws.send(JSON.stringify({type:'ERROR',message:'Enter a nickname before joining.'}));return;}const pid=id();const pl={id:pid,name:name.slice(0,24),avatar:m.avatar||'😀',host:false,ready:false,connected:true};g.players.push(pl);sockets.set(pid,ws);ws.send(JSON.stringify({type:'JOINED',playerId:pid,code:g.code}));broadcast(g);return;}
    if(m.type==='ACTION'){const pid=m.playerId;if(sockets.get(pid)!==ws)return;const g=[...games.values()].find(x=>x.players.some(p=>p.id===pid));if(g)handle(g,pid,m.action);}
  }catch(e){ws.send(JSON.stringify({type:'ERROR',message:'Invalid message.'}));}});
  ws.on('close',()=>{for(const g of games.values()){const p=g.players.find(p=>sockets.get(p.id)===ws);if(p){p.connected=false;broadcast(g);}}});
});
http.listen(PORT,'0.0.0.0',()=>console.log(`Collage ${VERSION} listening on ${PORT}`));
