const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const {Module}=require('node:module');
const path=require('node:path');
const filename=path.resolve('store/preferences.store.ts');
const output=buildSync({entryPoints:[filename],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const compiled=new Module(filename,module);compiled.paths=module.paths;compiled._compile(output,filename);
const {createPreferencesStore,preferenceSummary,defaultPreferences}=compiled.exports;
const editing=()=>{const s=createPreferencesStore();s.getState().beginEditing();return s;};
test('defaults are mild, no avoidance and under 40',()=>{
 const s=editing();
 assert.deepEqual(s.getState().draft,{spice:'mild',avoid:[],budget:'under40'});
 assert.equal(preferenceSummary(s.getState().draft),'微辣 · 无忌口 · ¥40 内');
});
test('combined edits update only the draft and keep a fixed avoidance order',()=>{
 const s=editing();s.getState().selectSpice('none');s.getState().toggleAvoid('peanut');s.getState().toggleAvoid('coriander');s.getState().selectBudget('under30');
 assert.equal(preferenceSummary(s.getState().draft),'不辣 · 不要香菜、花生 · ¥30 内');
 assert.deepEqual(s.getState().committed,defaultPreferences);
});
test('a third avoidance is refused with an error that clears after removing one',()=>{
 const s=editing();s.getState().toggleAvoid('coriander');s.getState().toggleAvoid('peanut');
 s.getState().toggleAvoid('onion');
 assert.deepEqual(s.getState().draft.avoid,['coriander','peanut']);assert.equal(s.getState().avoidLimitReached,true);
 s.getState().toggleAvoid('coriander');assert.equal(s.getState().avoidLimitReached,false);
 s.getState().toggleAvoid('onion');
 assert.equal(preferenceSummary(s.getState().draft),'微辣 · 不要洋葱、花生 · ¥40 内');
});
test('the limit error does not block saving two valid avoidances',()=>{
 const s=editing();s.getState().toggleAvoid('coriander');s.getState().toggleAvoid('peanut');s.getState().toggleAvoid('onion');
 s.getState().save();
 assert.deepEqual(s.getState().committed.avoid,['coriander','peanut']);assert.equal(s.getState().avoidLimitReached,false);
});
test('reset only restores the draft and does not save',()=>{
 const s=editing();s.getState().selectSpice('hot');s.getState().save();s.getState().beginEditing();
 s.getState().selectBudget('any');s.getState().resetDraft();
 assert.deepEqual(s.getState().draft,defaultPreferences);assert.equal(s.getState().committed.spice,'hot');
});
test('cancel discards the draft and reopening shows the saved values',()=>{
 const s=editing();s.getState().selectSpice('none');s.getState().toggleAvoid('onion');s.getState().cancel();s.getState().beginEditing();
 assert.deepEqual(s.getState().draft,defaultPreferences);
 s.getState().selectSpice('none');s.getState().toggleAvoid('coriander');s.getState().save();s.getState().beginEditing();
 assert.deepEqual(s.getState().draft,{spice:'none',avoid:['coriander'],budget:'under40'});
});
test('saved values are copied so later draft edits cannot change them',()=>{
 const s=editing();s.getState().toggleAvoid('onion');s.getState().save();s.getState().beginEditing();s.getState().toggleAvoid('peanut');
 assert.deepEqual(s.getState().committed.avoid,['onion']);
});
test('fixtures reset to defaults once per nonce and reject unknown states',()=>{
 const s=editing();s.getState().selectSpice('hot');s.getState().save();
 s.getState().loadFixture('preferences.edited.fixture-v2','a');
 assert.deepEqual(s.getState().committed,defaultPreferences);
 s.getState().beginEditing();s.getState().selectSpice('none');s.getState().save();
 s.getState().loadFixture('preferences.edited.fixture-v2','a');
 assert.equal(s.getState().committed.spice,'none');
 assert.throws(()=>s.getState().loadFixture('preferences.default.fixture-v1','b'));
 assert.throws(()=>s.getState().loadFixture('preferences.default.fixture-v2',''));
});
test('invalid options fail without changing the draft',()=>{
 const s=editing();
 assert.throws(()=>s.getState().selectSpice('extra'));assert.throws(()=>s.getState().toggleAvoid('garlic'));assert.throws(()=>s.getState().selectBudget('free'));
 assert.deepEqual(s.getState().draft,defaultPreferences);
});
test('a new session restores defaults',()=>{
 const s=editing();s.getState().selectSpice('none');s.getState().save();
 assert.deepEqual(createPreferencesStore().getState().committed,defaultPreferences);
});
