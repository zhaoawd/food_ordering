const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=()=>import(pathToFileURL(path.resolve('verification/business-events.mjs')).href);
const AT='2026-11-07T10:00:00.000Z';

test('a log starts with the session nonce and appends events with increasing seq',async()=>{
 const {startLine,appendLine,BUSINESS_EVENT_SCHEMA}=await load();
 let log=`${startLine('nonce-1',AT)}\n`;
 log=appendLine(log,{nonce:'nonce-1',event:'fixture_applied',at:AT,data:{state_id:'home.guest.v1',account_kind:'guest'}});
 log=appendLine(log,{nonce:'nonce-1',event:'tab_navigated',at:AT,data:{tab:'nav.menu',route:'/menu'}});
 const lines=log.trim().split('\n').map(JSON.parse);
 assert.deepEqual(lines.map(l=>[l.seq,l.event,l.nonce]),[[0,'session_started','nonce-1'],[1,'fixture_applied','nonce-1'],[2,'tab_navigated','nonce-1']]);
 assert.ok(lines.every(l=>l.schema_version===BUSINESS_EVENT_SCHEMA));
});

test('account creation is a registered event so a guest flow that creates one is detectable',async()=>{
 const {startLine,appendLine}=await load();
 const log=appendLine(`${startLine('n',AT)}\n`,{nonce:'n',event:'account_created',at:AT,data:{account_id:'a'}});
 assert.equal(JSON.parse(log.trim().split('\n')[1]).event,'account_created');
});

test('appending refuses unknown events, foreign sessions and an unstarted log',async()=>{
 const {startLine,appendLine}=await load();
 const log=`${startLine('mine',AT)}\n`;
 assert.throws(()=>appendLine(log,{nonce:'mine',event:'order_paid',at:AT}),/not registered/);
 assert.throws(()=>appendLine(log,{nonce:'mine',event:'session_started',at:AT}),/not registered/);
 assert.throws(()=>appendLine(log,{nonce:'other',event:'tab_navigated',at:AT}),/another session/);
 assert.throws(()=>appendLine('',{nonce:'mine',event:'tab_navigated',at:AT}),/not started/);
 assert.throws(()=>startLine('bad nonce/x',AT),/nonce is invalid/);
});
