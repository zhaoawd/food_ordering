const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
test('preferences state selection is bound to the evaluated selection receipt inputs',async()=>{
 const {resolveEvalFixture}=await import('../verification/resolve-eval-fixture.mjs');
 const registry=JSON.parse(readFileSync('verification/generated-registry.json'));
 const resolve=(state_id)=>resolveEvalFixture({selectionJson:JSON.stringify({mutation_id:'baseline',nonce:'test-preferences',state_id}),registry,baselineFixture:{}});
 assert.equal(resolve('preferences.edited.fixture-v2').preferencesStateId,'preferences.edited.fixture-v2');
 assert.equal(resolve('preferences.edited.fixture-v2').addressStateId,null);
 assert.equal(resolve('address.default.fixture-v1').preferencesStateId,null);
 // v1 状态 ID 属于 autophone 的旧偏好流程，不能被当成本页面的 Fixture。
 assert.throws(()=>resolve('preferences.default.fixture-v1'));
});
