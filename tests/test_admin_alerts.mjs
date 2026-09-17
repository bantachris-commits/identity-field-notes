import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler, commentLink, emailPayload} from '../supabase/functions/comment-admin-alerts/worker.mjs';

const row = {id:'alert-1',lease_id:'lease-1',snapshot:{sender:'IFN <alerts@example.com>',recipient:'admin@example.com',
  author:'<script>bad()</script>',article_id:'2026-09-17-morning-brief::story-2',body:'Reader comment <img src=x>',
  title:null,kind:'comment',is_reply:true,status:'published',created_at:'2026-09-17T17:00:00Z'}};
const token = 'a'.repeat(64);
function harness({key='test-key',auth=true,rows=[row],provider=()=>new Response('{"id":"email-1"}'),failFinish=false}={}) {
  const calls=[];
  const handler = createHandler({env:name=>({SUPABASE_URL:'https://project.example',SUPABASE_SERVICE_ROLE_KEY:'service-key',RESEND_API_KEY:key})[name],
    pause:async()=>{},fetchFn:async(url,init)=>{
      const body=JSON.parse(init.body);calls.push({url,init,body});
      if(url==='https://api.resend.com/emails')return provider();
      const name=url.split('/').at(-1);
      if(name==='ifn_alert_auth')return Response.json(auth);
      if(name==='ifn_alert_health')return new Response(null,{status:204});
      if(name==='ifn_alert_claim')return Response.json(rows);
      if(name==='ifn_alert_finish')return failFinish ? new Response(null,{status:500}) : Response.json(true);
      throw Error('Unexpected request');
    }});
  const run=(headers={'x-ifn-alert-key':token})=>handler(new Request('https://worker.example',{method:'POST',headers,
    body:JSON.stringify({to:'attacker@example.com'})}));
  return {calls,run};
}
test('unauthenticated and invalid-token calls cannot access queue or send',async()=>{
  const missing=harness();assert.equal((await missing.run({})).status,401);assert.equal(missing.calls.length,0);
  const invalid=harness({auth:false});assert.equal((await invalid.run()).status,401);assert.equal(invalid.calls.length,1);
});
test('missing API key records configuration state without claiming alerts',async()=>{
  const h=harness({key:''});assert.equal((await h.run()).status,503);
  assert.deepEqual(h.calls.map(x=>x.url.split('/').at(-1)),['ifn_alert_auth','ifn_alert_health']);
  assert.equal(h.calls[1].body.p_health,'missing_resend_api_key');
});
test('admin recipient is fixed, user text stays plain, and provider acceptance is recorded',async()=>{
  const h=harness();const res=await h.run();assert.deepEqual(await res.json(),{accepted:1,deferred:0,failed:0});
  const send=h.calls.find(x=>x.url==='https://api.resend.com/emails');
  assert.deepEqual(send.body.to,['admin@example.com']);assert.equal(send.body.html,undefined);
  assert.ok(send.body.text.includes(row.snapshot.body));assert.equal(send.init.headers['Idempotency-Key'],'ifn-comment/alert-1');
  const finish=h.calls.find(x=>x.url.endsWith('/ifn_alert_finish'));
  assert.equal(finish.body.p_state,'accepted');assert.equal(finish.body.p_provider_id,'email-1');
});
test('temporary provider failure defers; permanent rejection does not retry',async()=>{
  for(const [status,state] of [[429,'pending'],[503,'pending'],[403,'failed']]){
    const h=harness({provider:()=>Response.json({name:'validation_error'},{status})});await h.run();
    assert.equal(h.calls.find(x=>x.url.endsWith('/ifn_alert_finish')).body.p_state,state);
  }
});
test('an interrupted send and lost completion keep the same deterministic payload and key',async()=>{
  const first=harness({provider:()=>{throw Error('timeout')}});await first.run();
  assert.equal(first.calls.find(x=>x.url.endsWith('/ifn_alert_finish')).body.p_state,'pending');
  const second=harness({failFinish:true});assert.equal((await second.run()).status,503);
  const requests=[first,second].map(h=>h.calls.find(x=>x.url==='https://api.resend.com/emails'));
  assert.equal(requests[0].init.body,requests[1].init.body);
  assert.equal(requests[0].init.headers['Idempotency-Key'],requests[1].init.headers['Idempotency-Key']);
});
test('links stay on IFN and support story and community discussions',()=>{
  assert.equal(commentLink('community-general'),'https://identityfieldnotes.com/community.html');
  assert.equal(commentLink(row.snapshot.article_id),'https://identityfieldnotes.com/article.html?id=2026-09-17-morning-brief#story-2');
  assert.equal(new URL(commentLink('https://evil.example/?id=x')).origin,'https://identityfieldnotes.com');
  assert.ok(emailPayload(row).subject.includes('reply'));
});
test('empty queue sends no email',async()=>{
  const h=harness({rows:[]});assert.deepEqual(await (await h.run()).json(),{accepted:0,deferred:0,failed:0});
  assert.equal(h.calls.some(x=>x.url==='https://api.resend.com/emails'),false);
});
test('setup test is explicitly labelled and retains the configured admin recipient',()=>{
  const payload=emailPayload({...row,snapshot:{...row.snapshot,kind:'setup_test',is_reply:false}});
  assert.equal(payload.subject,'IFN: Admin comment alerts — setup test');
  assert.deepEqual(payload.to,['admin@example.com']);
});
