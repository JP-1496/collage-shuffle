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
    action(host,hj.playerId,{type:'SUBMIT_COLLAGE',pieces:p1});
    await sleep(100);
    const duplicateState=host.messages.slice(-10).reverse().find(m=>m.type==='STATE'&&m.state.phase==='ROUND')?.state;
    assert.equal(duplicateState?.submissionStatus?.[hj.playerId],true);
    const submittedHost=await nextState(host,s=>s.phase==='ROUND'&&s.round===0&&s.submissionStatus?.[hj.playerId]===true);
    assert.equal(submittedHost.submissionStatus[hj.playerId],true);
    assert.equal(submittedHost.submissionStatus[gj.playerId],false);
    action(guest,gj.playerId,{type:'SUBMIT_COLLAGE',pieces:p2});
    const submittedBoth=await Promise.all([
      nextState(host,s=>s.phase==='ROUND'&&s.round===0&&Object.values(s.submissionStatus||{}).filter(Boolean).length===2),
      nextState(guest,s=>s.phase==='ROUND'&&s.round===0&&Object.values(s.submissionStatus||{}).filter(Boolean).length===2)
    ]);
    for(const s of submittedBoth)assert.equal(Object.values(s.submissionStatus).filter(Boolean).length,2);

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
    await nextState(host,s=>s.phase==='FINAL_SHOWCASE'&&s.finalIndex===1);
    action(host,hj.playerId,{type:'FINAL_VOTE',targetId:gj.playerId});
    action(guest,gj.playerId,{type:'FINAL_VOTE',targetId:hj.playerId});
    await nextState(host,s=>s.phase==='FINAL');

    assert.equal((await fetch(BASE+'/health').then(r=>r.json())).version   ,'1.4.54');
    host.ws.close();guest.ws.close();

    // Repeat the final-submission transition repeatedly and in both orders.
    for(let i=0;i<5;i++) await runSubmissionCountScenario(2,i%2===1);
    for(let i=0;i<3;i++) await runSubmissionCountScenario(3,i%2===1);
    await runSubmissionCountScenario(4,false);
    await runSubmissionCountScenario(4,true);
    await runSubmissionCountScenario(8,false);
    await runSubmissionCountScenario(8,true);

    const expiryHost=await connect();
    expiryHost.ws.send(JSON.stringify({type:'HOST_CREATE',name:'ExpiryHost',lobbyName:'Timer Expiry Test',settings:{capacity:2,imagesPerPlayer:1,round1Images:1,hostApproval:false,creationSeconds:1}}));
    const ehj=await waitFor(()=>expiryHost.messages.find(m=>m.type==='JOINED'));
    const expiryGuest=await connect();
    expiryGuest.ws.send(JSON.stringify({type:'JOIN',name:'ExpiryGuest',code:ehj.code}));
    const egj=await waitFor(()=>expiryGuest.messages.find(m=>m.type==='JOINED'));
    action(expiryGuest,egj.playerId,{type:'SET_READY',ready:true});
    action(expiryHost,ehj.playerId,{type:'START'});
    await nextState(expiryHost,s=>s.phase==='IMAGE_SUBMISSION');
    action(expiryHost,ehj.playerId,{type:'ADD_SOURCE',data:PNG});
    action(expiryGuest,egj.playerId,{type:'ADD_SOURCE',data:PNG});
    action(expiryHost,ehj.playerId,{type:'IMAGE_READY'});
    action(expiryGuest,egj.playerId,{type:'IMAGE_READY'});
    await nextState(expiryHost,s=>s.phase==='PROMPT_SUBMISSION');
    action(expiryHost,ehj.playerId,{type:'ADD_PROMPT',text:'Expiry prompt host'});
    action(expiryGuest,egj.playerId,{type:'ADD_PROMPT',text:'Expiry prompt guest'});
    await nextState(expiryHost,s=>s.phase==='ROUND'&&s.round===0);
    await nextState(expiryHost,s=>s.phase==='ROUND'&&s.round===1,4000);

    // Partial-submit timer expiry: one player submits, the other does not; the timer must still advance.
    const partialHost=await connect();
    partialHost.ws.send(JSON.stringify({type:'HOST_CREATE',name:'PartialHost',lobbyName:'Partial Timer Test',settings:{capacity:2,imagesPerPlayer:1,round1Images:1,hostApproval:false,creationSeconds:1}}));
    const phj=await waitFor(()=>partialHost.messages.find(m=>m.type==='JOINED'));
    const partialGuest=await connect();
    partialGuest.ws.send(JSON.stringify({type:'JOIN',name:'PartialGuest',code:phj.code}));
    const pgj=await waitFor(()=>partialGuest.messages.find(m=>m.type==='JOINED'));
    action(partialGuest,pgj.playerId,{type:'SET_READY',ready:true});
    action(partialHost,phj.playerId,{type:'START'});
    await nextState(partialHost,s=>s.phase==='IMAGE_SUBMISSION');
    action(partialHost,phj.playerId,{type:'ADD_SOURCE',data:PNG}); action(partialGuest,pgj.playerId,{type:'ADD_SOURCE',data:PNG});
    action(partialHost,phj.playerId,{type:'IMAGE_READY'}); action(partialGuest,pgj.playerId,{type:'IMAGE_READY'});
    await nextState(partialHost,s=>s.phase==='PROMPT_SUBMISSION');
    action(partialHost,phj.playerId,{type:'ADD_PROMPT',text:'Partial timer host'}); action(partialGuest,pgj.playerId,{type:'ADD_PROMPT',text:'Partial timer guest'});
    await nextState(partialHost,s=>s.phase==='ROUND'&&s.round===0);
    action(partialHost,phj.playerId,{type:'SUBMIT_COLLAGE',pieces:p1});
    await nextState(partialHost,s=>s.phase==='ROUND'&&s.round===1,4000);
    partialHost.ws.close(); partialGuest.ws.close();
    expiryHost.ws.close();
    expiryGuest.ws.close();

    const dhost=await connect();
    dhost.ws.send(JSON.stringify({type:'HOST_CREATE',name:'DisconnectHost',lobbyName:'Disconnect Test',settings:{capacity:2,imagesPerPlayer:1,round1Images:1,hostApproval:false}}));
    const dhj=await waitFor(()=>dhost.messages.find(m=>m.type==='JOINED'));
    const dguest=await connect();
    dguest.ws.send(JSON.stringify({type:'JOIN',name:'DisconnectGuest',code:dhj.code}));
    const dgj=await waitFor(()=>dguest.messages.find(m=>m.type==='JOINED'));
    await nextState(dhost,s=>s.phase==='LOBBY'&&s.players.length===2);
    action(dhost,dhj.playerId,{type:'START'});
    await nextState(dhost,s=>s.phase==='IMAGE_SUBMISSION');
    action(dhost,dhj.playerId,{type:'ADD_SOURCE',data:PNG});
    action(dguest,dgj.playerId,{type:'ADD_SOURCE',data:PNG});
    action(dhost,dhj.playerId,{type:'IMAGE_READY'});
    action(dguest,dgj.playerId,{type:'IMAGE_READY'});
    await nextState(dhost,s=>s.phase==='PROMPT_SUBMISSION');
    action(dhost,dhj.playerId,{type:'ADD_PROMPT',text:'Continue after disconnect'});
    dguest.ws.close();
    const disconnectedRound=await nextState(dhost,s=>s.phase==='ROUND'&&s.round===0);
    assert.ok(disconnectedRound.prompts.some(p=>p.ownerId===dgj.playerId&&p.placeholder===true));
    dhost.ws.close();

    // Connection recovery: a player can reconnect with the same identity and continue submitting.
    const resumeHost=await connect();
    resumeHost.ws.send(JSON.stringify({type:'HOST_CREATE',name:'ResumeHost',lobbyName:'Resume Test',settings:{capacity:2,imagesPerPlayer:1,round1Images:1,hostApproval:false}}));
    const rhj=await waitFor(()=>resumeHost.messages.find(m=>m.type==='JOINED'));
    const resumeGuest=await connect();
    resumeGuest.ws.send(JSON.stringify({type:'JOIN',name:'ResumeGuest',code:rhj.code}));
    const rgj=await waitFor(()=>resumeGuest.messages.find(m=>m.type==='JOINED'));
    action(resumeGuest,rgj.playerId,{type:'SET_READY',ready:true});
    action(resumeHost,rhj.playerId,{type:'START'});
    await nextState(resumeHost,s=>s.phase==='IMAGE_SUBMISSION');
    action(resumeHost,rhj.playerId,{type:'ADD_SOURCE',data:PNG}); action(resumeGuest,rgj.playerId,{type:'ADD_SOURCE',data:PNG});
    action(resumeHost,rhj.playerId,{type:'IMAGE_READY'}); action(resumeGuest,rgj.playerId,{type:'IMAGE_READY'});
    await nextState(resumeHost,s=>s.phase==='PROMPT_SUBMISSION');
    action(resumeHost,rhj.playerId,{type:'ADD_PROMPT',text:'Resume host'}); action(resumeGuest,rgj.playerId,{type:'ADD_PROMPT',text:'Resume guest'});
    await nextState(resumeHost,s=>s.phase==='ROUND'&&s.round===0);
    resumeGuest.ws.close();
    await nextState(resumeHost,s=>s.phase==='ROUND'&&s.players.some(p=>p.id===rgj.playerId&&!p.connected));
    const resumedGuest=await connect();
    resumedGuest.ws.send(JSON.stringify({type:'RESUME',playerId:rgj.playerId,code:rhj.code}));
    await waitFor(()=>resumedGuest.messages.find(m=>m.type==='JOINED'&&m.resumed===true));
    const resumedState=await nextState(resumeHost,s=>s.phase==='ROUND'&&s.players.every(p=>p.connected));
    assert.equal(resumedState.round,0);
    action(resumeHost,rhj.playerId,{type:'SUBMIT_COLLAGE',pieces:p1});
    action(resumedGuest,rgj.playerId,{type:'SUBMIT_COLLAGE',pieces:p2});
    await Promise.all([nextState(resumeHost,s=>s.phase==='ROUND'&&s.round===1),nextState(resumedGuest,s=>s.phase==='ROUND'&&s.round===1)]);
    resumeHost.ws.close(); resumedGuest.ws.close();

    console.log('PASS: multiplayer flow, privacy filtering, rotation, vote locking, disconnect handling and version endpoint');
  }finally{
    server.kill();
    await sleep(100);
    if(output.includes('SyntaxError')){console.error(output);process.exitCode=1;}
  }
}
main().catch(err=>{console.error('FAIL:',err);process.exitCode=1;});
