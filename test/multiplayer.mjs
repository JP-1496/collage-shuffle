import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const PORT = 18742;
const BASE = `http://127.0.0.1:${PORT}`;
const WS = `ws://127.0.0.1:${PORT}/ws`;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const fs=await import('node:fs/promises');
const packageJson=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
const serverSource=await fs.readFile(new URL('../server.js',import.meta.url),'utf8');
const appSource=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
assert.match(packageJson.version,/^\d+\.\d+\.\d+$/);
assert.match(serverSource,/readFileSync\(new URL\('\.\/package\.json'/);
assert.match(serverSource,/app\.get\('\/build\.js'/);
assert.match(appSource,/globalThis\.COLLAGE_VERSION/);
assert.match(serverSource,/MAX_SEARCH_RESULTS=100/);
assert.match(serverSource,/dgControl_list/);
assert.match(serverSource,/MAX_IMAGE_WIDTH=3840/);
assert.match(serverSource,/MAX_IMAGE_HEIGHT=2160/);
assert.match(serverSource,/MAX_IMAGE_WIDTH\*MAX_IMAGE_HEIGHT/);
assert.match(serverSource,/SEARCH_THUMB_WIDTH=600/);
assert.match(appSource,/loading="lazy"/);


const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, timeout=5000){
  const end=Date.now()+timeout;
  while(Date.now()<end){const v=await fn();if(v)return v;await sleep(20);}
  throw new Error('Timed out waiting for condition');
}
function connect(){
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(WS);
    const messages=[];
    ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));
    ws.addEventListener('open',()=>resolve({ws,messages}));
    ws.addEventListener('error',reject);
  });
}
async function nextState(client, predicate){
  return waitFor(()=>[...client.messages].reverse().find(m=>m.type==='STATE'&&predicate(m.state))?.state);
}
function action(client,playerId,action){client.ws.send(JSON.stringify({type:'ACTION',playerId,action}));}

async function runSubmissionCountScenario(playerCount, reverseOrder=false){
  const clients=[];
  try{
    const host=await connect();
    clients.push(host);
    host.ws.send(JSON.stringify({type:'HOST_CREATE',name:'CountHost',lobbyName:`Count Test ${playerCount}`,settings:{capacity:playerCount,imagesPerPlayer:1,round1Images:1,hostApproval:false}}));
    const joined=await waitFor(()=>host.messages.find(m=>m.type==='JOINED'));
    const players=[{client:host,playerId:joined.playerId}];

    for(let i=1;i<playerCount;i++){
      const guest=await connect();
      clients.push(guest);
      guest.ws.send(JSON.stringify({type:'JOIN',name:`CountGuest${i}`,code:joined.code}));
      const gj=await waitFor(()=>guest.messages.find(m=>m.type==='JOINED'));
      players.push({client:guest,playerId:gj.playerId});
    }

    await nextState(host,s=>s.phase==='LOBBY'&&s.players.length===playerCount);
    for(const p of players.slice(1))action(p.client,p.playerId,{type:'SET_READY',ready:true});
    action(host,joined.playerId,{type:'START'});
    await nextState(host,s=>s.phase==='IMAGE_SUBMISSION');

    for(const p of players)action(p.client,p.playerId,{type:'ADD_SOURCE',data:PNG});
    for(const p of players)action(p.client,p.playerId,{type:'IMAGE_READY'});
    await nextState(host,s=>s.phase==='PROMPT_SUBMISSION');

    for(let i=0;i<players.length;i++)action(players[i].client,players[i].playerId,{type:'ADD_PROMPT',text:`Count prompt ${i+1}`});
    await nextState(host,s=>s.phase==='ROUND'&&s.round===0);

    const pieces=[{src:PNG,x:50,y:50,w:25,rotation:0,flipX:false,flipY:false,z:0}];
    const submitOrder=reverseOrder?[...players].reverse():players;
    for(let i=0;i<submitOrder.length;i++){
      action(submitOrder[i].client,submitOrder[i].playerId,{type:'SUBMIT_COLLAGE',pieces});
      const expected=i+1;
      const receivedStates=await Promise.all(players.map(p=>nextState(p.client,s=>s.phase==='ROUND'&&s.round===0&&Object.values(s.submissionStatus||{}).filter(Boolean).length===expected)));
      for(const state of receivedStates){
        assert.equal(Object.values(state.submissionStatus).filter(Boolean).length,expected);
        assert.equal(state.players.length,playerCount);
      }
    }

    const r2=await nextState(host,s=>s.phase==='ROUND'&&s.round===1);
    assert.equal(r2.round,1);
    assert.ok(r2.timerEndsAt>Date.now());
    await sleep(250);
    const stillR2=await nextState(host,s=>s.phase==='ROUND'&&s.round===1);
    assert.equal(stillR2.round,1);
  }finally{
    for(const client of clients)client.ws.close();
  }
}

async function main(){
  const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT),COLLAGE_TEST_MODE:'1'},stdio:['ignore','pipe','pipe']});
  let output='';
  server.stdout.on('data',d=>output+=d);
  server.stderr.on('data',d=>output+=d);
  try{
    await waitFor(async()=>{try{return (await fetch(BASE+'/health')).ok}catch{return false}},5000);
    const health=await (await fetch(BASE+'/health')).json();
    assert.equal(health.version,packageJson.version);
    const buildSource=await (await fetch(BASE+'/build.js')).text();
    assert.ok(buildSource.includes(`COLLAGE_VERSION=${JSON.stringify(packageJson.version)}`));

    // Integration check: broad image searches should return a genuinely large,
    // deduplicated result set rather than the old ~27-image ceiling.
    let imageSearch;
    for(let attempt=0;attempt<3;attempt++){
      imageSearch=await (await fetch(BASE+'/api/image-search?q=ocean')).json();
      if(Array.isArray(imageSearch.results))break;
      await sleep(1000);
    }
    assert.ok(Array.isArray(imageSearch.results), JSON.stringify(imageSearch));
    assert.ok(imageSearch.results.length>=10, `Expected at least 10 ocean images, got ${imageSearch.results.length}`);
    assert.ok(imageSearch.results.length<=100);
    assert.equal(imageSearch.provider,'Bing Images');
    assert.equal(new Set(imageSearch.results.map(x=>x.url)).size,imageSearch.results.length);
    assert.ok(imageSearch.results.every(x=>x.thumb&&x.fetchId&&x.thumbFetchId),'Every result must provide a thumbnail and lazy fetch references');
    const searchQueries=['avatar','jaguar','apple','bat','dog','Minecraft','red Ferrari','ocean','joe rogan'];
    for(const query of searchQueries){
      const search=await (await fetch(BASE+'/api/image-search?q='+encodeURIComponent(query))).json();
      assert.ok(Array.isArray(search.results), query+' search returned invalid response');
      assert.ok(search.results.length>=5, query+' should return at least 5 image results, got '+search.results.length);
      assert.ok(search.results.length<=100);
      assert.equal(search.provider,'Bing Images');
      assert.equal(new Set(search.results.map(x=>x.url)).size,search.results.length,query+' results must be unique');
      assert.ok(search.results.every(x=>x.thumb&&x.fetchId&&x.thumbFetchId),query+' results need thumbnail and lazy fetch references');
      assert.ok(search.results.every(x=>x.url.startsWith('https://')&&x.thumb.startsWith('https://')),query+' results must use HTTPS');
      if(query==='joe rogan'){
        const relevant=search.results.slice(0,10).filter(x=>/joe|rogan/i.test([x.title,x.snippet,x.sourceUrl].filter(Boolean).join(' '))).length;
        assert.ok(relevant>=3,'Joe Rogan results should contain relevant Bing metadata in the first 10 results');
      }
    }
    for(const image of imageSearch.results){
      if(image.width&&image.height){
        assert.ok(image.width<=3840&&image.height<=2160);
        assert.ok(image.width*image.height<=8294400);
      }
    }
    const host=await connect();
    host.ws.send(JSON.stringify({type:'HOST_CREATE',name:'Host',lobbyName:'Test',settings:{capacity:2,imagesPerPlayer:1,round1Images:1,hostApproval:false}}));
    const hj=await waitFor(()=>host.messages.find(m=>m.type==='JOINED'));
    assert.match(hj.code,/^[A-HJ-NP-Z2-9]{4}$/);
    assert.ok(!/[O01I]/.test(hj.code));
    const guest=await connect();
    guest.ws.send(JSON.stringify({type:'JOIN',name:'Guest',code:hj.code}));
    const gj=await waitFor(()=>guest.messages.find(m=>m.type==='JOINED'));

    await nextState(host,s=>s.phase==='LOBBY'&&s.players.length===2);
    action(guest,gj.playerId,{type:'SET_READY',ready:true});
    action(host,hj.playerId,{type:'START'});
    await nextState(host,s=>s.phase==='IMAGE_SUBMISSION');
    action(host,hj.playerId,{type:'ADD_SOURCE',data:PNG});
    action(guest,gj.playerId,{type:'ADD_SOURCE',data:PNG});
    action(host,hj.playerId,{type:'IMAGE_READY'});
    const imageReadyState=await nextState(host,s=>s.phase==='IMAGE_SUBMISSION'&&s.imageReady?.[hj.playerId]===true);
    assert.equal(imageReadyState.imageReady[hj.playerId],true);
    action(guest,gj.playerId,{type:'IMAGE_READY'});
    await nextState(host,s=>s.phase==='PROMPT_SUBMISSION');
    action(host,hj.playerId,{type:'ADD_PROMPT',text:'Make a terrible hat'});
    const onePrompt=await nextState(host,s=>s.phase==='PROMPT_SUBMISSION'&&s.prompts.length===1);
    assert.equal(onePrompt.prompts.length,1);
    action(guest,gj.playerId,{type:'ADD_PROMPT',text:'Make a tiny car'});

    const r1h=await nextState(host,s=>s.phase==='ROUND'&&s.round===0);
    const r1g=await nextState(guest,s=>s.phase==='ROUND'&&s.round===0);
    assert.equal(r1h.sources.length,1);
    assert.equal(r1g.sources.length,1);
    assert.ok(!('travelingSets' in r1h));
    assert.ok(r1h.finalResults.every(r=>!r.collages));

    const p1=[{src:PNG,x:50,y:50,w:25,rotation:0,flipX:false,flipY:false,z:0}];
    const p2=[{src:PNG,x:60,y:40,w:30,rotation:15,flipX:true,flipY:false,z:0}];
    action(host,hj.playerId,{type:'SYNC_COLLAGE',pieces:p1});
    action(guest,gj.playerId,{type:'SYNC_COLLAGE',pieces:p2});
    action(host,hj.playerId,{type:'SUBMIT_COLLAGE',pieces:p1});