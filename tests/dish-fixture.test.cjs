const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
test('dish and cart-empty states select an empty cart; other states keep the session cart',async()=>{
 const {resolveEvalFixture}=await import('../verification/resolve-eval-fixture.mjs');
 const registry=JSON.parse(readFileSync('verification/generated-registry.json'));
 const resolve=(state_id)=>resolveEvalFixture({selectionJson:JSON.stringify({mutation_id:'baseline',nonce:'test-dish',...(state_id?{state_id}:{})}),registry,baselineFixture:{}});
 for(const state of ['dish.default.fixture-v1','dish.customized.fixture-v1','cart.empty.fixture-v1'])assert.equal(resolve(state).cartStateId,state);
 for(const state of [undefined,'home.default.fixture-v1','address.default.fixture-v1','preferences.default.fixture-v2'])assert.equal(resolve(state).cartStateId,null);
});
