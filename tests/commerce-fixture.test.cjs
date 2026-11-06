const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const registry=()=>JSON.parse(readFileSync('verification/generated-registry.json'));
const select=(state_id)=>JSON.stringify({mutation_id:'baseline',nonce:'test-commerce',state_id});

test('commerce-v1 A01 states select their recipe by state_id',async()=>{
 const {resolveEvalFixture}=await import('../verification/resolve-eval-fixture.mjs');
 for(const id of ['home.default.v1','home.guest.v1','orders.empty.v1']){
  assert.equal(resolveEvalFixture({selectionJson:select(id),registry:registry(),baselineFixture:{}}).commerceStateId,id);
 }
});

test('an unknown commerce state is refused, other states are untouched',async()=>{
 const {resolveEvalFixture}=await import('../verification/resolve-eval-fixture.mjs');
 assert.throws(()=>resolveEvalFixture({selectionJson:select('home.loading.v1'),registry:registry(),baselineFixture:{}}),/unknown commerce state_id/);
 assert.equal(resolveEvalFixture({selectionJson:select('address.company.fixture-v1'),registry:registry(),baselineFixture:{}}).commerceStateId,null);
});

test('member strip and money follow decisions D1 and D3',async()=>{
 const ts=require('typescript');
 const source=ts.transpileModule(readFileSync('store/commerce.fixture.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports',source)((name)=>name.startsWith('zustand')?{useStore:()=>null,createStore:()=>()=>({})}:require(name),mod,mod.exports);
 const {formatCents,memberStripAction,COMMERCE_FIXTURE}=mod.exports;
 assert.equal(memberStripAction({kind:'guest'}),'登录 ›');
 assert.equal(memberStripAction({kind:'member',userId:'user-demo-001'}),'3 张券 ›');
 assert.equal(formatCents(3290),'¥32.90');
 assert.equal(formatCents(3890),'¥38.90');
 assert.equal(COMMERCE_FIXTURE.clock,'2026-11-05T12:00:00+08:00');
});
