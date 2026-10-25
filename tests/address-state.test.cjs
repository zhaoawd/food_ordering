const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const {Module}=require('node:module');
const path=require('node:path');
const filename=path.resolve('store/address.store.ts');
const output=buildSync({entryPoints:[filename],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const compiled=new Module(filename,module);compiled.paths=module.paths;compiled._compile(output,filename);
const {createAddressStore}=compiled.exports;
test('selecting a draft cannot change the committed address',()=>{
 const s=createAddressStore();s.getState().beginEditing();s.getState().select('company');
 assert.equal(s.getState().committed,'home');assert.equal(s.getState().draft,'company');
});
test('cancel discards the draft and reopening starts from the saved address',()=>{
 const s=createAddressStore();s.getState().beginEditing();s.getState().select('company');s.getState().cancel();s.getState().beginEditing();
 assert.equal(s.getState().draft,'home');
});
test('confirmation commits once and reopening restores the saved address',()=>{
 const s=createAddressStore();s.getState().beginEditing();s.getState().select('company');
 assert.equal(s.getState().confirm(),true);assert.equal(s.getState().confirm(),false);
 s.getState().beginEditing();assert.equal(s.getState().draft,'company');
});
test('company fixture initializes a draft without saving and is applied once per nonce',()=>{
 const s=createAddressStore();s.getState().loadFixture('address.company.fixture-v1','a');s.getState().beginEditing();
 assert.equal(s.getState().committed,'home');assert.equal(s.getState().draft,'company');
 s.getState().confirm();s.getState().loadFixture('address.company.fixture-v1','a');
 assert.equal(s.getState().committed,'company');
 s.getState().loadFixture('address.default.fixture-v1','b');s.getState().beginEditing();
 assert.equal(s.getState().committed,'home');assert.equal(s.getState().draft,'home');
});
test('invalid fixture and invalid selection fail without changing state',()=>{
 const s=createAddressStore();assert.throws(()=>s.getState().loadFixture('address.unknown','a'));
 assert.throws(()=>s.getState().loadFixture('address.default.fixture-v1',''));
 s.getState().beginEditing();assert.throws(()=>s.getState().select('invalid'));assert.equal(s.getState().draft,'home');
});
test('a new session restores home rather than persisting a previous session',()=>{
 const s=createAddressStore();s.getState().beginEditing();s.getState().select('company');s.getState().confirm();
 assert.equal(createAddressStore().getState().committed,'home');
});
