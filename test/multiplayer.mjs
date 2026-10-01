import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const PORT = 18742;
const BASE = `http://127.0.0.1:${PORT}`;
const WS = `ws://127.0.0.1:${PORT}/ws`;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

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

async function main(){
  const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
  let output='';
  server.stdout.on('data',d=>output+=d);
  server.stderr.on('data',d=>output+=d);
  try{
    await waitFor(async()=>{try{return (await fetch(BASE+'/health')).ok}catch{return false}},5000);
    const host=await connect();
    host.ws.send(JSON.stringify({type:'HOST_CREATE',name:'Host',lobbyName:'Test',settings:{capacity:2,imagesPerPlayer:1,round1Images:1,hostApproval:false}}));
    const hj=await waitFor(()=>host.messages.find(m=>m.type==='JOINED'));
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
    action(guest,gj.playerId,{type:'IMAGE_READY'});
    await nextState(host,s=>s.phase==='PROMPT_SUBMISSION');
    action(host,hj.playerId,{type:'ADD_PROMPT',text:'Make a terrible hat'});
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
    action(guest,gj.playerId,{type:'SUBMIT_COLLAGE',pieces:p2});

    const r2h=await nextState(host,s=>s.phase==='ROUND'&&s.round===1);
    const r2g=await nextState(guest,s=>s.phase==='ROUND'&&s.round===1);
    assert.equal(r2h.roundPlayerSets[hj.playerId],gj.playerId);
    assert.equal(r2g.roundPlayerSets[gj.playerId],hj.playerId);
    assert.equal(r2h.currentPieces.length,1);
    assert.equal(r2g.currentPieces.length,1);
    assert.ok(!('travelingSets' in r2h));

    action(host,hj.playerId,{type:'SUBMIT_COLLAGE',pieces:r2h.currentPieces});
    action(guest,gj.playerId,{type:'SUBMIT_COLLAGE',pieces:r2g.currentPieces});

    const show=await nextState(host,s=>s.phase==='FINAL_SHOWCASE');
    assert.ok(show.finalResults[0].collages);
    assert.ok(show.finalResults[0].collages[hj.playerId]);
    assert.ok(!show.finalResults[1].collages);

    action(host,hj.playerId,{type:'FINAL_VOTE',targetId:gj.playerId});
    await nextState(host,s=>s.phase==='FINAL_SHOWCASE'&&s.myFinalVote===gj.playerId);
    action(host,hj.playerId,{type:'FINAL_VOTE',targetId:hj.playerId});
    const afterInvalid=host.messages.at(-1)?.state;
    assert.equal(afterInvalid?.myFinalVote,gj.playerId);
    action(guest,gj.playerId,{type:'FINAL_VOTE',targetId:hj.playerId});
    await nextState(host,s=>s.phase==='FINAL');

    assert.equal((await fetch(BASE+'/health').then(r=>r.json())).version,'1.4.20');
    host.ws.close();guest.ws.close();
    console.log('PASS: multiplayer flow, privacy filtering, rotation, vote locking and version endpoint');
  }finally{
    server.kill();
    await sleep(100);
    if(output.includes('SyntaxError')){console.error(output);process.exitCode=1;}
  }
}
main().catch(err=>{console.error('FAIL:',err);process.exitCode=1;});
