const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=()=>import(pathToFileURL(path.resolve('verification/test-command.mjs')).href);
const NONCE='a'.repeat(32);
const ID='0123456789abcdef';
const command=(fields)=>JSON.stringify({schema_version:'food-ordering-test-command/v1',command_id:ID,nonce:NONCE,...fields});

test('C08 decreases one cart line addressed by its stable id',async()=>{
 const {parseTestCommand,planDecreaseLine}=await load();
 const parsed=parseTestCommand(command({op:'cart.decrease_line',line:'cart.line.beef-bowl-001.portion-standard'}),{sessionNonce:NONCE});
 assert.deepEqual(parsed,{ok:true,command:{commandId:ID,op:'cart.decrease_line',line:'cart.line.beef-bowl-001.portion-standard'}});
 const line={stableId:'cart.line.beef-bowl-001.portion-standard',id:'beef-bowl-001',customizations:[]};
 assert.deepEqual(planDecreaseLine(parsed.command,[line,{stableId:'cart.line.other',id:'x',customizations:[]}]),{ok:true,line});
 assert.deepEqual(planDecreaseLine(parsed.command,[]),{ok:false,error:'line_not_found'});
});
test('D07 navigates only to the dish detail route',async()=>{
 const {parseTestCommand}=await load();
 assert.deepEqual(parseTestCommand(command({op:'navigate',path:'/dish-detail?dishId=unknown'}),{sessionNonce:NONCE}),
  {ok:true,command:{commandId:ID,op:'navigate',path:'/dish-detail?dishId=unknown'}});
 for (const p of ['/coupons','https://example.com/dish-detail','//evil/dish-detail','dish-detail','/dish-detail/../coupons'])
  assert.equal(parseTestCommand(command({op:'navigate',path:p}),{sessionNonce:NONCE}).error,'path_not_allowed',p);
});
test('commands bound to another session, schema or op are refused with their id',async()=>{
 const {parseTestCommand}=await load();
 const refuse=(text,nonce=NONCE)=>parseTestCommand(text,{sessionNonce:nonce});
 assert.deepEqual(refuse(command({op:'cart.decrease_line',line:'cart.line.x'}),null),{ok:false,commandId:ID,error:'session_not_ready'});
 assert.equal(refuse(command({nonce:'b'.repeat(32),op:'navigate',path:'/dish-detail'})).error,'nonce_mismatch');
 assert.equal(refuse(command({schema_version:'v0',op:'navigate',path:'/dish-detail'})).error,'schema_version_unsupported');
 assert.equal(refuse(command({op:'cart.clear'})).error,'op_unsupported');
 assert.equal(refuse(command({op:'cart.decrease_line',line:'home.header.cart'})).error,'line_invalid');
 assert.equal(refuse(command({op:'navigate',path:42})).error,'path_invalid');
});
test('an unreadable command id is refused without an id to answer',async()=>{
 const {parseTestCommand}=await load();
 assert.deepEqual(parseTestCommand('not json',{sessionNonce:NONCE}),{ok:false,commandId:null,error:'command_not_json'});
 assert.deepEqual(parseTestCommand('[]',{sessionNonce:NONCE}),{ok:false,commandId:null,error:'command_not_object'});
 assert.deepEqual(parseTestCommand(command({command_id:'../x'}),{sessionNonce:NONCE}),{ok:false,commandId:null,error:'command_id_invalid'});
});
test('the result echoes the command, session and current cart lines',async()=>{
 const {testCommandResult}=await load();
 assert.deepEqual(testCommandResult({commandId:ID,sessionNonce:NONCE,ok:false,error:'line_not_found',cartLines:[{stable_id:'cart.line.x',quantity:1}]}),
  {schema_version:'food-ordering-test-command-result/v1',command_id:ID,nonce:NONCE,ok:false,error:'line_not_found',cart_lines:[{stable_id:'cart.line.x',quantity:1}]});
});
