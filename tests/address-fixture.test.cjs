const {test}=require('node:test');const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
test('address state selection is bound to the evaluated selection receipt inputs',async()=>{
 const {resolveEvalFixture}=await import('../verification/resolve-eval-fixture.mjs');
 const registry=JSON.parse(readFileSync('verification/generated-registry.json'));
 const result=resolveEvalFixture({selectionJson:JSON.stringify({mutation_id:'baseline',nonce:'test-address',state_id:'address.company.fixture-v1'}),registry,baselineFixture:{}});
 assert.equal(result.addressStateId,'address.company.fixture-v1');
 assert.throws(()=>resolveEvalFixture({selectionJson:JSON.stringify({mutation_id:'baseline',nonce:'test-address',state_id:'address.missing.fixture-v1'}),registry,baselineFixture:{}}));
});
