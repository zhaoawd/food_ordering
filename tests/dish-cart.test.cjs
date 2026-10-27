const {test,beforeEach}=require('node:test');
const assert=require('node:assert/strict');
const {buildSync}=require('esbuild');
const {Module}=require('node:module');
const path=require('node:path');
const load=(file)=>{
 const filename=path.resolve(file);
 const output=buildSync({entryPoints:[filename],bundle:true,platform:'node',format:'cjs',write:false,external:['react','zustand']}).outputFiles[0].text;
 const compiled=new Module(filename,module);compiled.paths=module.paths;compiled._compile(output,filename);return compiled.exports;
};
const catalog=load('store/dish.catalog.ts');
const {useCartStore,cartLineKey,cartLineStableId}=load('store/cart.store.ts');
const beef='beef-bowl-001';
const item=(portion,extras)=>catalog.cartItemFor(beef,{portion,extras});
const cart=()=>useCartStore.getState();
let nonce=0;
beforeEach(()=>{cart().loadFixture('dish.default.fixture-v1',`n${++nonce}`)});

test('totals use integer cents and display yuan',()=>{
 assert.equal(catalog.formatYuan(catalog.totalCents(beef,catalog.defaultSelection)),'¥32');
 assert.equal(catalog.formatYuan(catalog.totalCents(beef,{portion:'large',extras:['egg'],quantity:2})),'¥82');
 assert.equal(catalog.formatYuan(catalog.unitPriceCents(beef,{portion:'large',extras:['egg']})),'¥41');
 assert.equal(catalog.formatYuan(catalog.totalCents(beef,{portion:'standard',extras:[],quantity:9})),'¥288');
 assert.equal(catalog.formatYuan(1250),'¥12.50');
});
test('summaries list extras in option order regardless of click order',()=>{
 assert.equal(catalog.selectionSummary({portion:'large',extras:['vegetables','egg'],quantity:2}),'大份 · 加蛋、蔬菜 · 2 份');
 assert.equal(catalog.selectionSummary(catalog.defaultSelection),'标准份 · 不加料 · 1 份');
});
test('dish ids are validated against the catalog',()=>{
 assert.equal(catalog.isDishId(beef),true);assert.equal(catalog.isDishId('unknown'),false);assert.equal(catalog.isDishId('__proto__'),false);
});
test('a session starts with two standard beef bowls',()=>{
 const fresh=load('store/cart.store.ts').useCartStore.getState();
 assert.equal(fresh.getTotalItems(),2);assert.equal(fresh.items[0].id,beef);assert.equal(cartLineKey(fresh.items[0]),'beef-bowl-001.portion:standard');
});
test('adding N merges identical specifications and ignores extras order',()=>{
 assert.equal(cart().addItems(item('large',['egg','tofu']),2),'added');
 assert.equal(cart().addItems(item('large',['tofu','egg']),2),'added');
 assert.equal(cart().items.length,1);assert.equal(cart().getTotalItems(),4);
});
test('different portions or extras form separate lines with stable ids',()=>{
 cart().addItems(item('large',['egg']),2);cart().addItems(item('standard',[]),1);
 assert.equal(cart().items.length,2);assert.equal(cart().getTotalItems(),3);
 assert.equal(catalog.formatYuan(cart().getTotalPrice()),'¥114');
 assert.deepEqual(cart().items.map(cartLineStableId),['cart.line.beef-bowl-001.extra-egg+portion-large','cart.line.beef-bowl-001.portion-standard']);
});
test('a merge over nine is refused without changing the cart',()=>{
 cart().addItems(item('large',['egg']),2);cart().addItems(item('large',['egg']),2);
 const before=JSON.stringify(cart().items);
 assert.equal(cart().addItems(item('large',['egg']),6),'line_limit');
 assert.equal(JSON.stringify(cart().items),before);
 assert.equal(catalog.formatYuan(cart().getTotalPrice()),'¥164');
 assert.equal(cart().addItems(item('large',['egg']),5),'added');assert.equal(cart().getTotalItems(),9);
});
test('quantities outside 1-9 are rejected',()=>{
 for(const quantity of [0,10,1.5,-1])assert.equal(cart().addItems(item('standard',[]),quantity),'invalid_quantity');
 assert.equal(cart().items.length,0);
});
test('increase stops at nine and removing the last line empties the cart',()=>{
 cart().addItems(item('standard',[]),8);const line=cart().items[0];
 cart().increaseQty(beef,line.customizations);cart().increaseQty(beef,line.customizations);
 assert.equal(cart().getTotalItems(),9);
 cart().removeItem(beef,line.customizations);assert.equal(cart().items.length,0);
});
test('fixtures empty the cart once per nonce and reject unknown states',()=>{
 cart().addItems(item('standard',[]),3);cart().loadFixture('dish.default.fixture-v1',`n${nonce}`);
 assert.equal(cart().getTotalItems(),3);
 cart().loadFixture('cart.empty.fixture-v1','other');assert.equal(cart().items.length,0);
 assert.throws(()=>cart().loadFixture('home.default.fixture-v1','x'));
 assert.throws(()=>cart().loadFixture('dish.default.fixture-v1',''));
});
