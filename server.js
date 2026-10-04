import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import { readFileSync } from 'node:fs';

const VERSION = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
const HEARTBEAT_MS = 10000;
const MIN_PLAYERS = 1;
const app = express();
const http = createServer(app);
const wss = new WebSocketServer({ server: http, path: '/ws' });
const PORT = Number(process.env.PORT || 10000);
const TEST_MODE = process.env.COLLAGE_TEST_MODE === '1';
const BOTS_ENABLED = true;
const games = new Map();
const sockets = new Map();
const timers = new Map();
const botJobs = new Map();
const id = () => crypto.randomUUID();
const CODE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = () => { let c; do { c=''; for(let i=0;i<4;i++) c+=CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]; } while(games.has(c)); return c; };
const shuffle = a => [...a].sort(() => Math.random() - 0.5);
const clone = x => JSON.parse(JSON.stringify(x));
const avatar = a => /^(?:[1-9]|1[0-9]|2[0-4])$/.test(String(a||'')) ? String(a) : '1';

app.use(express.static('public', { setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') }));
app.get('/health', (_, res) => res.json({ ok:true, version:VERSION }));
app.get('/build.js', (_, res) => { res.type('application/javascript').set('Cache-Control','no-store').send('globalThis.COLLAGE_VERSION='+JSON.stringify(VERSION)+';'); });
const MAX_IMAGE_WIDTH=3840;
const MAX_IMAGE_HEIGHT=2160;
const MAX_IMAGE_PIXELS=MAX_IMAGE_WIDTH*MAX_IMAGE_HEIGHT;
const MAX_SEARCH_RESULTS=100;
const SEARCH_THUMB_WIDTH=600;
const SEARCH_PAGE_SIZE=35;
const SEARCH_PAGES=3;
const SEARCH_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36';
const imageFetchCache=new Map();
function rememberImageUrl(url){
  const raw=String(url||'');
  if(!/^https:\/\//i.test(raw))return null;
  const token=crypto.createHash('sha256').update(raw).digest('hex').slice(0,40);
  imageFetchCache.set(token,{url:raw,expiresAt:Date.now()+10*60*1000});
  return token;
}
function pruneImageFetchCache(){
  const now=Date.now();
  for(const [token,item] of imageFetchCache)if(item.expiresAt<=now)imageFetchCache.delete(token);
}
function decodeHtmlEntities(value=''){
  return String(value).replace(/&quot;/gi,'"').replace(/&#34;/gi,'"').replace(/&apos;/gi,"'").replace(/&#39;/gi,"'").replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
}
function decodeBingMetadata(raw=''){
  try{return JSON.parse(decodeHtmlEntities(raw));}catch{return null;}
}
function parseBingImageResults(html=''){
  const results=[];
  // Bing can place other image metadata on the page outside the actual result grid.
  // Restrict parsing to the same dgControl_list container used by SearXNG's Bing engine,
  // so unrelated/recommended image tiles cannot leak into a user's search results.
  const listRe=/<ul\b[^>]*class=["'][^"']*\bdgControl_list\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi;
  const blocks=[];
  let listMatch;
  while((listMatch=listRe.exec(html)))blocks.push(listMatch[1]);
  if(!blocks.length)return results;
  const anchorRe=/<a\b[^>]*class=["'][^"']*\biusc\b[^"']*["'][^>]*>/gi;
  for(const block of blocks){
    let match;
    while((match=anchorRe.exec(block))){
      const tag=match[0];
      const metadataMatch=tag.match(/\bm=["']([^"']+)["']/i);
      if(!metadataMatch)continue;
      const meta=decodeBingMetadata(metadataMatch[1]);
      if(!meta?.murl||!meta?.turl)continue;
      const title=String(meta.t||meta.title||'').replace(/<[^>]+>/g,'').trim();
      results.push({title,snippet:String(meta.desc||''),thumb:meta.turl,url:meta.murl,sourceUrl:meta.purl||meta.murl,mime:meta.m||'',width:Number(meta.w||0),height:Number(meta.h||0)});
    }
  }
  return results;
}
function normaliseSearchText(value=''){
  return String(value).toLowerCase().replace(/https?:\/\/[^\s]+/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function scoreImageResult(item,query,position){
  const q=normaliseSearchText(query);
  const title=normaliseSearchText(item.title);
  const snippet=normaliseSearchText(item.snippet);
  const source=normaliseSearchText(item.sourceUrl);
  const tokens=[...new Set(q.split(' ').filter(t=>t.length>1))];
  if(!tokens.length)return 0;
  let score=Math.max(0,100-position*0.15);
  if(title===q)score+=70;
  if(title.includes(q))score+=45;
  if(snippet.includes(q))score+=20;
  if(source.includes(q))score+=10;
  let matched=0;
  for(const token of tokens){
    if(title.split(' ').includes(token)){score+=18;matched++}
    else if(title.includes(token)){score+=9;matched++}
    else if(snippet.includes(token)){score+=5;matched++}
    else if(source.includes(token)){score+=2;matched++}
  }
  if(matched===tokens.length)score+=25;
  else if(matched===0)score-=35;
  if(tokens.length>1 && !title.includes(q))score-=10;
  return score;
}
function rankImageResults(results,q){
  return results.map((item,index)=>({...item,_relevance:scoreImageResult(item,q,index),_searchIndex:index}))
    .sort((a,b)=>b._relevance-a._relevance || a._searchIndex-b._searchIndex)
    .map(({_relevance,_searchIndex,...item})=>item);
}
async function fetchBingUrl(path){
  const r=await fetch(new URL(path,'https://www.bing.com'),{headers:{'User-Agent':SEARCH_USER_AGENT,'Accept':'text/html,application/xhtml+xml','Accept-Language':'en-GB,en;q=0.9'}});
  if(!r.ok)throw new Error('Bing image search '+r.status);
  return r.text();
}
async function fetchBingPage(q,page){
  const first=(page-1)*SEARCH_PAGE_SIZE+1;
  const asyncPath='/images/async?q='+encodeURIComponent(q)+'&mmasync=1&first='+first+'&count='+SEARCH_PAGE_SIZE+'&setlang=en&cc=GB';
  const html=await fetchBingUrl(asyncPath);
  if(parseBingImageResults(html).length)return html;
  const fallback='/images/search?q='+encodeURIComponent(q)+'&first='+first+'&count='+SEARCH_PAGE_SIZE+'&setlang=en-GB';
  return fetchBingUrl(fallback);
}
app.get('/api/image-search',async(req,res)=>{try{
  const q=String(req.query.q||'').trim().slice(0,120);
  if(!q)return res.json({results:[]});
  pruneImageFetchCache();
  const collected=new Map();
  for(let page=1;page<=SEARCH_PAGES&&collected.size<MAX_SEARCH_RESULTS;page++){
    const html=await fetchBingPage(q,page);
    for(const item of parseBingImageResults(html)){
      if(!/^https:\/\//i.test(item.url)||!/^https:\/\//i.test(item.thumb))continue;
      if(!/^image\//i.test(item.mime)&&item.mime&& !/^(?:jpg|jpeg|png|webp)$/i.test(item.mime))continue;
      const key=item.url.split('#')[0];
      if(collected.has(key))continue;
      const fetchId=rememberImageUrl(item.url),thumbFetchId=rememberImageUrl(item.thumb);
      if(!fetchId||!thumbFetchId)continue;
      collected.set(key,{...item,fetchId,thumbFetchId});
    }
  }
  res.json({results:rankImageResults([...collected.values()],q).slice(0,MAX_SEARCH_RESULTS),maxWidth:MAX_IMAGE_WIDTH,maxHeight:MAX_IMAGE_HEIGHT,maxPixels:MAX_IMAGE_PIXELS,provider:'Bing Images',thumbnailWidth:SEARCH_THUMB_WIDTH});
}catch(e){
  console.error('Image search failed:',e);
  res.status(502).json({error:'Image search unavailable',...(TEST_MODE?{detail:String(e?.message||e)}:{})});
}});
app.get('/api/image-fetch', async (req,res)=>{try{
  pruneImageFetchCache();
  const token=String(req.query.id||'');
  const cached=imageFetchCache.get(token);
  if(!cached)return res.status(400).json({error:'Invalid or expired image reference'});
  const u=new URL(cached.url);
  if(u.protocol!=='https:')return res.status(400).json({error:'Unsupported image source'});
  const r=await fetch(u,{headers:{'User-Agent':'CollageShuffle/1.5.0 (image fetch feature)','Accept':'image/*'}});
  if(!r.ok)throw new Error('fetch '+r.status);
  const type=r.headers.get('content-type')||'image/jpeg';
  if(!type.startsWith('image/'))return res.status(400).json({error:'Not an image'});
  const buf=Buffer.from(await r.arrayBuffer());
  if(buf.length>8*1024*1024)return res.status(413).json({error:'Image too large'});
  res.json({data:`data:${type};base64,${buf.toString('base64')}`});
}catch(e){console.error('Image fetch failed:',e);res.status(502).json({error:'Could not load image'});}});
app.get('*', (_, res) => res.sendFile(process.cwd() + '/public/index.html'));

function send(pid, msg){ const ws=sockets.get(pid); if(ws?.readyState===WebSocket.OPEN) ws.send(JSON.stringify(msg)); }
function broadcast(g){ for(const p of g.players) send(p.id,{type:'STATE',state:stateFor(g,p.id)}); }
function botList(g){ return g.players.filter(p=>p.isBot); }
function botDelay(g,fn,ms=500){
  if(!BOTS_ENABLED)return;
  const job=setTimeout(()=>{const jobs=botJobs.get(g.code);jobs?.delete(job);if(g.phase!=='FINAL'||g.players.some(p=>p.isBot))fn();},ms);
  if(!botJobs.has(g.code))botJobs.set(g.code,new Set());
  botJobs.get(g.code).add(job);
}
function clearBotJobs(g){const jobs=botJobs.get(g.code);if(jobs){for(const job of jobs)clearTimeout(job);botJobs.delete(g.code);}}
function botAction(g,pid,action){if(g.players.some(p=>p.id===pid&&p.isBot))handle(g,pid,action);}
const BOT_PROMPTS=[
  'Make this look like it was designed by a sleep-deprived genius.',
  'Turn ordinary chaos into something suspiciously impressive.',
  'Create something that absolutely should not exist.',
  'Make it dramatic. Way more dramatic than necessary.',
  'Build the weirdest masterpiece you can justify.',
  'Make this look like a terrible idea that somehow worked.',
  'Create something that belongs in a museum nobody visits.',
  'Make the pieces tell a completely ridiculous story.'
];
const BOT_NAMES=[
  'Jeffrey','Alakazam','Gizmo','Biscuit','Waffle','Pickle','Nigel','Kevin','Marmalade','Baz','Terry','Professor Noodle','Bongo','Derek','Beans','Sir Fluffington','Reginald','Gary','Toast','Barry','Zippy','Colin','Mochi','Trevor','Winston','Pudding','Keith','Banjo','Dave','Crumpet'
];
const BOT_IMAGES=[
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2ZmNGY4NyIvPjxjaXJjbGUgY3g9IjEwMCIgY3k9IjE1MCIgcj0iNzAiIGZpbGw9IiNmZmQ4NGQiLz48L3N2Zz4=',
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzU1YzhmZiIvPjxjaXJjbGUgY3g9IjI4MCIgY3k9IjE1MCIgcj0iOTAiIGZpbGw9IiM3MzU3ZmYiLz48L3N2Zz4=',
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzYxZGY5YSIvPjxwYXRoIGQ9Ik0yMCAyNTAgTDIwMCAzMCBMMzgwIDI1MCBaIiBmaWxsPSIjZmY0Zjg3Ii8+PC9zdmc+'
];
function botPieces(g,pid){
  if(g.round===0){
    const sourceIds=g.roundSources[pid]||[];
    const sources=sourceIds.map(x=>g.sources.find(s=>s.id===x)).filter(Boolean);
    return sources.map((s,i)=>({id:id(),src:s.data,x:25+i*45,y:30+i*32,w:28+i*5,rotation:(i%2?12:-9),flipX:i%3===0,flipY:false,z:i}));
  }
  const pieces=clone(g.collages[pid]?.pieces||[]);
  return pieces.map((p,i)=>({...p,x:Math.max(5,Math.min(95,(p.x||50)+((i%3)-1)*9)),y:Math.max(5,Math.min(95,(p.y||50)+((i%2)?8:-6))),rotation:(p.rotation||0)+(i%2?15:-10),flipX:i%3===0?!p.flipX:p.flipX,w:Math.max(5,Math.min(80,(p.w||24)+(i%2?5:-3))),z:i}));
}
function runBotsForImageSubmission(g){
  botList(g).forEach((p,bi)=>{
    const chosenImages=shuffle(BOT_IMAGES).slice(0,Math.min(g.settings.imagesPerPlayer,BOT_IMAGES.length));
    for(let i=0;i<g.settings.imagesPerPlayer;i++)botDelay(g,()=>botAction(g,p.id,{type:'ADD_SOURCE',data:chosenImages[i%chosenImages.length]}),350+bi*180+i*220);
    botDelay(g,()=>botAction(g,p.id,{type:'IMAGE_READY'}),350+bi*180+g.settings.imagesPerPlayer*220+180);
  });
}
function runBotsForPrompts(g){
  botList(g).forEach((p,bi)=>{
    const text=BOT_PROMPTS[Math.floor(Math.random()*BOT_PROMPTS.length)];
    botDelay(g,()=>botAction(g,p.id,{type:'ADD_PROMPT',text}),450+bi*220);
  });
}
function runBotsForRound(g){
  botList(g).forEach((p,bi)=>{
    botDelay(g,()=>{
      const pieces=botPieces(g,p.id);
      botAction(g,p.id,{type:'SYNC_COLLAGE',pieces});
      botDelay(g,()=>botAction(g,p.id,{type:'SUBMIT_COLLAGE',pieces}),350+bi*180);
    },600+bi*250);
  });
}
function runBotsForFinalShowcase(g){
  botList(g).forEach((p,bi)=>{
    botDelay(g,()=>{
      const result=g.finalResults[g.finalIndex];
      const choices=Object.keys(result?.collages||{}).filter(target=>target!==p.id);
      if(choices.length)botAction(g,p.id,{type:'FINAL_VOTE',targetId:choices[(bi+g.finalIndex)%choices.length]});
    },450+bi*180);
  });
}
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
function startGame(g){g.phase='IMAGE_SUBMISSION';g.imageReady={};g.timerEndsAt=Date.now()+g.settings.imageSeconds*1000;broadcast(g);runBotsForImageSubmission(g);schedule(g,g.settings.imageSeconds*1000,()=>finishImageSubmission(g));}
function finishImageSubmission(g){if(g.phase!=='IMAGE_SUBMISSION')return;for(const p of g.players)g.imageReady[p.id]=true;g.submittedSources={};for(const p of g.players)g.submittedSources[p.id]=true;if(g.settings.hostApproval)transition(g,'HOST_APPROVAL');else beginPrompts(g);}
function beginPrompts(g){g.phase='PROMPT_SUBMISSION';g.prompts=[];g.promptOrder=[];g.timerEndsAt=Date.now()+g.settings.promptSeconds*1000;broadcast(g);runBotsForPrompts(g);schedule(g,g.settings.promptSeconds*1000,()=>finishPromptSubmission(g));}
function finishPromptSubmission(g){
  if(g.phase!=='PROMPT_SUBMISSION')return;
  const connected=g.players.filter(p=>p.connected);
  for(const p of g.players){
    if(!g.prompts.some(x=>x.ownerId===p.id))
      g.prompts.push({id:id(),text:p.connected?'Create something for this player who ran out of time.':'Create something for this player who disconnected.',ownerId:p.id,placeholder:true});
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
  g.phase='ROUND';g.timerEndsAt=Date.now()+g.settings.creationSeconds*1000;broadcast(g);runBotsForRound(g);
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
function startFinalShowcase(g){g.finalIndex=0;g.finalVotes={};g.phase='FINAL_SHOWCASE';g.currentPromptId=g.finalResults[0]?.promptId||null;g.timerEndsAt=Date.now()+g.settings.votingSeconds*1000;broadcast(g);runBotsForFinalShowcase(g);schedule(g,g.settings.votingSeconds*1000,()=>finishFinalPrompt(g));}
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
  runBotsForFinalShowcase(g);
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
  clearBotJobs(g);
  broadcast(g);
}
function handle(g,pid,a){
  const p=g.players.find(x=>x.id===pid);if(!p)return;
  switch(a.type){
    case 'ADD_BOT': {
      if(g.phase!=='LOBBY') { send(pid,{type:'ERROR',message:'Bots can only be added from the lobby.'}); break; }
      if(!p.host) { send(pid,{type:'ERROR',message:'Only the host can add bots.'}); break; }
      if(g.players.length>=g.settings.capacity) { send(pid,{type:'ERROR',message:'The lobby is full.'}); break; }
      let n=1;while(g.players.some(x=>x.isBot&&x.botNumber===n))n++;
      const usedNames=new Set(g.players.filter(x=>x.isBot).map(x=>x.name));
      const availableNames=BOT_NAMES.filter(x=>!usedNames.has(`Bot ${x}`));
      const botName=availableNames.length?availableNames[Math.floor(Math.random()*availableNames.length)]:`Guest ${n}`;
      const bot={id:id(),name:`Bot ${botName}`,avatar:String(Math.floor(Math.random()*24)+1),host:false,ready:true,connected:true,isBot:true,botNumber:n};
      g.players.push(bot);
      console.log(`[BOT] ADD_BOT received from ${p.name} — created ${bot.name} (${bot.id}) in lobby ${g.code}`);
      send(pid,{type:'BOT_ADDED',bot:{id:bot.id,name:bot.name,avatar:bot.avatar}});
      break;
    }
    case 'REMOVE_BOT': { if(g.phase==='LOBBY'&&p.host){const target=g.players.find(x=>x.id===String(a.botId)&&x.isBot);if(target)g.players=g.players.filter(x=>x.id!==target.id);} break; }
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
  ws.isAlive=true;
  ws.on('pong',()=>{ws.isAlive=true;});
  ws.on('message',raw=>{try{const m=JSON.parse(String(raw));
    if(m.type==='CLIENT_PING'){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'CLIENT_PONG'}));return;}
    if(m.type==='RESUME'){const c=String(m.code||'').trim().toUpperCase(),g=games.get(c),pid=String(m.playerId||'');const p=g?.players.find(x=>x.id===pid);if(!g||!p){ws.send(JSON.stringify({type:'ERROR',message:'That game session is no longer available.'}));return;}const old=sockets.get(pid);if(old&&old!==ws){try{old.close(4000,'Reconnected')}catch{}}p.connected=true;sockets.set(pid,ws);ws.send(JSON.stringify({type:'JOINED',playerId:pid,code:g.code,resumed:true}));broadcast(g);return;}
    if(m.type==='HOST_CREATE'){const pid=id();const host={id:pid,name:String(m.name||'Player').trim().slice(0,24)||'Player',avatar:avatar(m.avatar),host:true,ready:true,connected:true,isBot:false};const st=m.settings||{};const settings={capacity:Math.max(2,Math.min(16,Number(st.capacity)||8)),imagesPerPlayer:Math.max(1,Math.min(20,Number(st.imagesPerPlayer)||2)),round1Images:st.round1Images==='all'?'all':Math.max(1,Math.min(320,Number(st.round1Images)||4)),imageSeconds:Math.max(30,Math.min(600,Number(st.imageSeconds)||120)),hostApproval:!!st.hostApproval,creationSeconds:Math.max(TEST_MODE?1:30,Math.min(600,Number(st.creationSeconds)||120)),votingSeconds:Math.max(15,Math.min(300,Number(st.votingSeconds)||45)),promptSeconds:Math.max(15,Math.min(300,Number(st.promptSeconds)||60))};const g=newGame(String(m.lobbyName||'Collage Game').slice(0,40),settings,host);sockets.set(pid,ws);ws.send(JSON.stringify({type:'JOINED',playerId:pid,code:g.code}));broadcast(g);return;}
    if(m.type==='JOIN'){const c=String(m.code||'').trim().toUpperCase(),g=games.get(c),name=String(m.name||'').trim();if(!g||g.phase!=='LOBBY'){ws.send(JSON.stringify({type:'ERROR',message:'That lobby is unavailable.'}));return;}if(g.players.length>=g.settings.capacity){ws.send(JSON.stringify({type:'ERROR',message:'That lobby is full.'}));return;}if(!name){ws.send(JSON.stringify({type:'ERROR',message:'Enter a nickname before joining.'}));return;}const pid=id();const pl={id:pid,name:name.slice(0,24),avatar:avatar(m.avatar),host:false,ready:false,connected:true,isBot:false};g.players.push(pl);sockets.set(pid,ws);ws.send(JSON.stringify({type:'JOINED',playerId:pid,code:g.code}));broadcast(g);return;}
    if(m.type==='ACTION'){const pid=m.playerId;if(sockets.get(pid)!==ws)return;const g=[...games.values()].find(x=>x.players.some(p=>p.id===pid));if(g)handle(g,pid,m.action);}
  }catch(e){ws.send(JSON.stringify({type:'ERROR',message:'Invalid message.'}));}});
  ws.on('error',()=>{});
  ws.on('close',()=>{for(const g of games.values()){const p=g.players.find(p=>sockets.get(p.id)===ws);if(p){p.connected=false;if(g.phase==='PROMPT_SUBMISSION')finishPromptSubmission(g);else broadcast(g);}}});
});
setInterval(()=>{for(const ws of wss.clients){if(ws.isAlive===false){ws.terminate();continue;}ws.isAlive=false;try{ws.ping()}catch{}}},HEARTBEAT_MS);
setInterval(checkExpiredRounds,250);
http.listen(PORT,'0.0.0.0',()=>console.log(`Collage ${VERSION} listening on ${PORT}`));
