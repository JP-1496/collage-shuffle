import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

const VERSION = '1.4.50';
const MIN_PLAYERS = 2;
const app = express();
const http = createServer(app);
const wss = new WebSocketServer({ server: http, path: '/ws' });
const PORT = Number(process.env.PORT || 10000);
const TEST_MODE = process.env.COLLAGE_TEST_MODE === '1';
const games = new Map();
const sockets = new Map();
const timers = new Map();
const id = () => crypto.randomUUID();
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = () => { let c; do { c=''; for(let i=0;i<4;i++) c+=CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]; } while(games.has(c)); return c; };
const shuffle = a => [...a].sort(() => Math.random() - 0.5);
const clone = x => JSON.parse(JSON.stringify(x));

app.use(express.static('public', { setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') }));
app.get('/health', (_, res) => res.json({ ok:true, version:VERSION }));
app.get('/api/image-search', async (req,res)=>{try{const q=String(req.query.q||'').trim().slice(0,120);if(!q)return res.json({results:[]});const u=new URL('https://commons.wikimedia.org/w/api.php');u.searchParams.set('action','query');u.searchParams.set('generator','search');u.searchParams.set('gsrsearch',q);u.searchParams.set('gsrnamespace','6');u.searchParams.set('gsrlimit','100');u.searchParams.set('prop','imageinfo');u.searchParams.set('iiprop','url|mime');u.searchParams.set('iiurlwidth','320');u.searchParams.set('format','json');const r=await fetch(u,{headers:{'User-Agent':'CollageShuffle/1.4.47 (image search feature)'}});if(!r.ok)throw new Error('search');const j=await r.json();const results=Object.values(j.query?.pages||{}).map(x=>x.imageinfo?.[0]).filter(x=>x?.url&&x?.mime?.startsWith('image/')).map(x=>({thumb:x.thumburl||x.url,url:x.url}));res.json({results});}catch(e){res.status(502).json({error:'Image search unavailable'});}});
app.get('/api/image-fetch', async (req,res)=>{try{const raw=String(req.query.url||'');const u=new URL(raw);if(!['upload.wikimedia.org','commons.wikimedia.org'].includes(u.hostname))return res.status(400).json({error:'Unsupported image source'});const r=await fetch(u,{headers:{'User-Agent':'CollageShuffle/1.4.47 (image search feature)'}});if(!r.ok)throw new Error('fetch');const type=r.headers.get('content-type')||'image/jpeg';if(!type.startsWith('image/'))return res.status(400).json({error:'Not an image'});const buf=Buffer.from(await r.arrayBuffer());if(buf.length>8*1024*1024)return res.status(413).json({error:'Image too large'});res.json({data:`data:${type};base64,${buf.toString('base64')}`});}catch(e){res.status(502).json({error:'Could not load image'});}});
app.get('*', (_, res) => res.sendFile(process.cwd() + '/public/index.html'));

function send(pid, msg){ const ws=sockets.get(pid); if(ws?.readyState===WebSocket.OPEN) ws.send(JSON.stringify(msg)); }
function broadcast(g){ for(const p of g.players) send(p.id,{type:'STATE',state:stateFor(g,p.id)}); }
function checkExpiredRounds(){
  const now=Date.now();
  for(const g of games.values()){
    if(g.timerEndsAt && now>=g.timerEndsAt){
      if(g.phase==='ROUND') finishRound(g);
      else if(g.phase==='FINAL_SHOWCASE') finishFinalPrompt(g);
      else if(g.phase==='IMAGE_SUBMISSION') finishImageSubmission(g);
    }
  }
}
function stateFor(g,pid){
  const s={
    code:g.code,name:g.name,phase:g.phase,minPlayers:g.minPlayers,settings:g.settings,
    players:g.players,prompts:g.prompts,promptOrder:g.promptOrder,round:g.round,
    currentPromptId:g.currentPromptId,roundPlayerSets:{},timerEndsAt:g.timerEndsAt,
    serverNow:Date.now(),sources:[],imageReady:g.phase==='IMAGE_SUBMISSION'?g.imageReady:{},collages:{},submissionStatus:{},
    finalResults:[],finalIndex:g.finalIndex,scores:g.scores,bestCollages:g.phase==='FINAL'?g.bestCollages:{}
  };
  if(g.phase==='IMAGE_SUBMISSION') s.sources=g.sources.filter(x=>x.ownerId===pid);
  else if(g.phase==='HOST_APPROVAL') s.sources=g.sources;
  else if(g.phase==='ROUND' && g.round===0){
    const allowed=new Set(g.roundSources[pid]||[]);
    s.sources=g.sources.filter(x=>allowed.has(x.id));
  }
  if(g.phase==='ROUND'){
    s.currentPieces=clone(g.collages[pid]?.pieces||[]);
    s.roundPlayerSets[pid]=g.roundPlayerSets[pid]||null;
    s.submissionStatus=Object.fromEntries(Object.entries(g.collages).map(([k,c])=>[k,!!c.submitted]));
  }
  if(g.phase==='FINAL_SHOWCASE'){
    s.finalResults=g.finalResults.map((r,i)=>i===g.finalIndex
      ? {promptId:r.promptId,collages:Object.fromEntries(Object.entries(r.collages||{}).map(([k,c])=>[k,{...c,playerId:k}]))}
      : {promptId:r.promptId});
    s.myFinalVote=g.finalVotes[g.finalIndex]?.[pid]||null;
  }
  return s;
}
function newGame(name,settings,host){ const g={code:code(),name,phase:'LOBBY',minPlayers:MIN_PLAYERS,settings,players:[host],sources:[],submittedSources:{},prompts:[],promptOrder:[],round:0,currentPromptId:null,roundSources:{},roundPlayerSets:{},collages:{},travelingSets:{},votes:{},scores:{},lastTally:{},finalResults:[],finalIndex:0,finalVotes:{},bestCollages:{},timerEndsAt:null}; games.set(g.code,g); return g; }
function cancelTimer(g){ const t=timers.get(g.code); if(t) clearTimeout(t); timers.delete(g.code); }
function schedule(g,ms,fn){ cancelTimer(g); const marker=Date.now()+':'+g.phase+':'+g.round; g.timerMarker=marker; timers.set(g.code,setTimeout(()=>{timers.delete(g.code);if(g.timerMarker===marker)fn();},ms)); }
function transition(g,phase){cancelTimer(g);g.phase=phase;g.timerEndsAt=null;broadcast(g);}
function startGame(g){g.phase='IMAGE_SUBMISSION';g.imageReady={};g.timerEndsAt=Date.now()+g.settings.imageSeconds*1000;broadcast(g);schedule(g,g.settings.imageSeconds*1000,()=>finishImageSubmission(g));}
function finishImageSubmission(g){if(g.phase!=='IMAGE_SUBMISSION')return;for(const p of g.players)g.imageReady[p.id]=true;g.submittedSources={};for(const p of g.players)g.submittedSources[p.id]=true;if(g.settings.hostApproval)transition(g,'HOST_APPROVAL');else beginPrompts(g);}
function beginPrompts(g){g.phase='PROMPT_SUBMISSION';g.prompts=[];g.promptOrder=[];g.timerEndsAt=null;broadcast(g);}
function finishPromptSubmission(g){
  if(g.phase!=='PROMPT_SUBMISSION')return;
  const connected=g.players.filter(p=>p.connected);
  for(const p of g.players){
    if(!p.connected&&!g.prompts.some(x=>x.ownerId===p.id))
      g.prompts.push({id:id(),text:'Create something for this player who disconnected.',ownerId:p.id,placeholder:true});
  }
  if(connected.every(p=>g.prompts.some(x=>x.ownerId===p.id))||connected.length===0){
    g.promptOrder=shuffle(g.prompts.map(x=>x.id));
    g.round=0;
    beginRound(g);
  }
}
function assignRound1Sources(g){
  const pool=g.sources.filter(s=>s.approved!==false);
  for(const p of g.players){ const wanted=g.settings.round1Images==='all'?pool.length:Math.min(g.settings.round1Images,pool.length); g.roundSources[p.id]=shuffle(pool).slice(0,wanted).map(x=>x.id); }
}
function scatter(pieces){ return pieces.map((p,i)=>({...clone(p),id:id(),x:15+((i*37)%70),y:15+((i*53)%70),z:i})); }
function beginRound(g){
  g.roundFinishing=false;
  if(!g.promptOrder.length) g.promptOrder=shuffle(g.prompts.map(p=>p.id));
  if(g.round>=g.players.length){transition(g,'FINAL');return;}
  const ids=g.players.map(p=>p.id);
  g.currentPromptId=g.promptOrder[g.round];
  const previous=g.roundPlayerSets;
  g.roundPlayerSets={};
  // Every round uses a derangement: every set goes to a different player,
  // and no set can ever return to its original owner. This intentionally
  // allows a set to revisit a player in later rounds because N rounds and
  // "visit every other player exactly once" cannot both be true while
  // also forbidding the original owner.
  const n=ids.length;
  let perm;
  const previousMap=g.round>0?previous:null;
  do{
    perm=shuffle(ids);
  }while(n>1 && perm.some((recipient,i)=>recipient===ids[i]) ||
         (previousMap && n>2 && perm.some((recipient,i)=>recipient===previousMap[ids[i]])));
  for(let i=0;i<n;i++)g.roundPlayerSets[ids[i]]=perm[i];
  g.votes={};g.collages={};
  if(g.round===0){assignRound1Sources(g);for(const p of g.players)g.collages[p.id]={playerId:p.id,promptId:g.currentPromptId,pieces:[],submitted:false};}
  else {for(const p of g.players){const owner=g.roundPlayerSets[p.id];g.collages[p.id]={playerId:p.id,promptId:g.currentPromptId,pieces:scatter(g.travelingSets[owner]||[]),submitted:false};}}
  if(!g.finalResults[g.round])g.finalResults[g.round]={promptId:g.currentPromptId,collages:{}};
  g.phase='ROUND';g.timerEndsAt=Date.now()+g.settings.creationSeconds*1000;broadcast(g);
  schedule(g,g.settings.creationSeconds*1000,()=>finishRound(g));
}
function finishRound(g){
  if(g.phase!=='ROUND' || g.roundFinishing)return;
  // Lock completion before doing any work so a submission and timer cannot
  // both advance the same round.
  g.roundFinishing=true;
  cancelTimer(g);
  for(const [pid,c] of Object.entries(g.collages)){
    if(!c.submitted){
      c.submitted=true;
      g.travelingSets[pid]=clone(c.pieces||[]);
      g.finalResults[g.round].collages[pid]=clone(c);
    }
  }
  if(g.round+1>=g.players.length){
    startFinalShowcase(g);
  }else{
    g.round++;
    beginRound(g);
  }
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
    case 'ADD_SOURCE': if(g.phase==='IMAGE_SUBMISSION'&&!g.imageReady?.[pid]&&g.sources.filter(s=>s.ownerId===pid).length<g.settings.imagesPerPlayer&&typeof a.data==='string'&&a.data.startsWith('data:image/'))g.sources.push({id:id(),data:a.data,ownerId:pid,approved:true}); break;
    case 'ADD_SOURCES_BATCH': if(g.phase==='IMAGE_SUBMISSION'&&!g.imageReady?.[pid]&&!Array.isArray(a.images)===false){const existing=g.sources.filter(s=>s.ownerId===pid);const room=Math.max(0,g.settings.imagesPerPlayer-existing.length);const seen=new Set(existing.map(s=>s.data));for(const data of a.images.slice(0,room)){if(typeof data==='string'&&data.startsWith('data:image/')&&!seen.has(data)){g.sources.push({id:id(),data,ownerId:pid,approved:true});seen.add(data);}}} break;
    case 'ADD_SOURCE_URL': if(g.phase==='IMAGE_SUBMISSION'&&!g.imageReady?.[pid]&&g.sources.filter(s=>s.ownerId===pid).length<g.settings.imagesPerPlayer&&typeof a.data==='string'&&a.data.startsWith('data:image/'))g.sources.push({id:id(),data:a.data,ownerId:pid,approved:true}); break;
    case 'DELETE_OWN_SOURCE': if(g.phase==='IMAGE_SUBMISSION'&&!g.imageReady?.[pid])g.sources=g.sources.filter(s=>!(s.id===a.sourceId&&s.ownerId===pid)); break;
    case 'IMAGE_READY': if(g.phase==='IMAGE_SUBMISSION'&&!g.imageReady?.[pid]&&g.sources.filter(s=>s.ownerId===pid).length===g.settings.imagesPerPlayer){g.imageReady[pid]=true;if(g.players.filter(x=>x.connected).every(x=>g.imageReady[x.id]))finishImageSubmission(g);} break;
    case 'IMAGE_UNREADY': if(g.phase==='IMAGE_SUBMISSION'&&g.imageReady?.[pid]){g.imageReady[pid]=false;} break;
    case 'DELETE_SOURCE': if(g.phase==='HOST_APPROVAL'&&p.host)g.sources=g.sources.filter(x=>x.id!==a.sourceId); break;
    case 'APPROVAL_DONE': if(g.phase==='HOST_APPROVAL'&&p.host){g.sources=g.sources.filter(x=>x.approved!==false);if(g.sources.length)beginPrompts(g);} break;
    case 'ADD_PROMPT': if(g.phase==='PROMPT_SUBMISSION'&&!g.prompts.some(x=>x.ownerId===pid)&&String(a.text||'').trim()){g.prompts.push({id:id(),text:String(a.text).trim().slice(0,500),ownerId:pid});if(g.prompts.length===g.players.length){g.promptOrder=shuffle(g.prompts.map(x=>x.id));g.round=0;beginRound(g);}} break;
    case 'SYNC_COLLAGE': if(g.phase==='ROUND'){const c=g.collages[pid];if(c&&!c.submitted){c.pieces=(Array.isArray(a.pieces)?a.pieces:[]).slice(0,100).map((x,i)=>({...x,id:x.id||id(),z:i}));}}break;
    case 'SUBMIT_COLLAGE': {
      if(g.phase!=='ROUND')break;
      const c=g.collages[pid];
      if(!c || c.submitted)break;
      c.pieces=(Array.isArray(a.pieces)?a.pieces:[]).slice(0,100).map((x,i)=>({...x,id:x.id||id(),z:i}));
      c.submitted=true;
      g.travelingSets[pid]=clone(c.pieces);
      g.finalResults[g.round].collages[pid]=clone(c);
      sockets.get(pid)?.send(JSON.stringify({type:'SUBMISSION_ACCEPTED',round:g.round}));
      const connected=g.players.filter(x=>x.connected);
      const submitted=connected.filter(x=>g.collages[x.id]?.submitted).length;
      // Broadcast the accepted count first. WebSocket delivery preserves message
      // order, so clients receive 2/2 before the Round 2 state.
      broadcast(g);
      if(connected.length>0 && submitted===connected.length) finishRound(g);
      break;
    }
    case 'FINAL_VOTE': {const result=g.finalResults[g.finalIndex];const target=String(a.targetId||'');if(g.phase==='FINAL_SHOWCASE'&&result?.collages?.[target]&&target!==pid&&!g.finalVotes[g.finalIndex]?.[pid]){g.finalVotes[g.finalIndex]??={};g.finalVotes[g.finalIndex][pid]=target;const connected=g.players.filter(x=>x.connected).length;if(Object.keys(g.finalVotes[g.finalIndex]).filter(k=>g.players.some(x=>x.id===k&&x.connected)).length>=connected)finishFinalPrompt(g);}}break;
  }
  broadcast(g);
}
wss.on('connection',ws=>{
  ws.on('message',raw=>{try{const m=JSON.parse(String(raw));
    if(m.type==='HOST_CREATE'){const pid=id();const host={id:pid,name:String(m.name||'Player').trim().slice(0,24)||'Player',avatar:m.avatar||'😀',host:true,ready:true,connected:true};const st=m.settings||{};const settings={capacity:Math.max(2,Math.min(16,Number(st.capacity)||8)),imagesPerPlayer:Math.max(1,Math.min(20,Number(st.imagesPerPlayer)||2)),round1Images:st.round1Images==='all'?'all':Math.max(1,Math.min(20,Number(st.round1Images)||4)),imageSeconds:Math.max(30,Math.min(600,Number(st.imageSeconds)||120)),hostApproval:!!st.hostApproval,creationSeconds:Math.max(TEST_MODE?1:30,Math.min(600,Number(st.creationSeconds)||120)),votingSeconds:Math.max(15,Math.min(300,Number(st.votingSeconds)||45))};const g=newGame(String(m.lobbyName||'Collage Game').slice(0,40),settings,host);sockets.set(pid,ws);ws.send(JSON.stringify({type:'JOINED',playerId:pid,code:g.code}));broadcast(g);return;}
    if(m.type==='JOIN'){const c=String(m.code||'').trim().toUpperCase(),g=games.get(c),name=String(m.name||'').trim();if(!g||g.phase!=='LOBBY'){ws.send(JSON.stringify({type:'ERROR',message:'That lobby is unavailable.'}));return;}if(g.players.length>=g.settings.capacity){ws.send(JSON.stringify({type:'ERROR',message:'That lobby is full.'}));return;}if(!name){ws.send(JSON.stringify({type:'ERROR',message:'Enter a nickname before joining.'}));return;}const pid=id();const pl={id:pid,name:name.slice(0,24),avatar:m.avatar||'😀',host:false,ready:false,connected:true};g.players.push(pl);sockets.set(pid,ws);ws.send(JSON.stringify({type:'JOINED',playerId:pid,code:g.code}));broadcast(g);return;}
    if(m.type==='ACTION'){const pid=m.playerId;if(sockets.get(pid)!==ws)return;const g=[...games.values()].find(x=>x.players.some(p=>p.id===pid));if(g)handle(g,pid,m.action);}
  }catch(e){ws.send(JSON.stringify({type:'ERROR',message:'Invalid message.'}));}});
  ws.on('close',()=>{for(const g of games.values()){const p=g.players.find(p=>sockets.get(p.id)===ws);if(p){p.connected=false;if(g.phase==='PROMPT_SUBMISSION')finishPromptSubmission(g);else broadcast(g);}}});
});
setInterval(checkExpiredRounds,250);
http.listen(PORT,'0.0.0.0',()=>console.log(`Collage ${VERSION} listening on ${PORT}`));
