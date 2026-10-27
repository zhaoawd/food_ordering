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
// 一次打包让优惠券与购物车共用同一份 Store 实例（订阅关系才成立）。
const {coupon,cart,catalog}=load('tests/coupons-entry.ts');
const beef='beef-bowl-001';
const standard=catalog.cartItemFor(beef,catalog.defaultSelection);
const items=()=>cart.useCartStore.getState().items;
const store=()=>coupon.couponStore.getState();
const yuan=c=>catalog.formatYuan(c);
let nonce=0;
beforeEach(()=>{
 cart.useCartStore.getState().loadFixture('coupons.default.fixture-v1',`c${++nonce}`);
 store().loadFixture('coupons.default.fixture-v1',`c${nonce}`);
});
const bill=(choice=store().applied)=>coupon.computeBill(items(),choice);

test('C01 two standard bowls bill goods ¥64, fees ¥7, no discount and ¥71 payable',()=>{
 const b=bill();
 assert.deepEqual([b.subtotalCents,b.packagingCents,b.deliveryCents,b.discountCents,b.payableCents].map(yuan),['¥64','¥4','¥3','¥0','¥71']);
});
test('C02 confirming save6 applies a ¥6 discount',()=>{
 store().beginEditing();store().selectDraft('save6',items());
 assert.equal(yuan(bill(store().draft).payableCents),'¥65');assert.equal(store().applied,'none');
 assert.equal(store().confirm(items()),true);assert.equal(store().applied,'save6');assert.equal(yuan(bill().payableCents),'¥65');
 assert.equal(yuan(bill('save10').payableCents),'¥61');
});
test('C03 save20 is unavailable with a ¥36 shortfall and cannot be selected',()=>{
 assert.equal(coupon.isCouponAvailable('save20',items()),false);assert.equal(yuan(coupon.shortfallCents('save20',items())),'¥36');
 store().beginEditing();store().selectDraft('save20',items());
 assert.equal(store().draft,'none');assert.equal(yuan(bill(store().draft).payableCents),'¥71');
});
test('C04 the threshold includes equality and ignores packaging and delivery',()=>{
 cart.useCartStore.getState().decreaseQty(beef,standard.customizations);
 const b=coupon.computeBill(items(),'save6');
 assert.equal(coupon.isCouponAvailable('save6',items()),true);
 assert.deepEqual([b.subtotalCents,b.packagingCents,b.deliveryCents,b.payableCents].map(yuan),['¥32','¥2','¥3','¥31']);
});
test('C05 reducing quantity invalidates a saved coupon without reselecting it later',()=>{
 store().beginEditing();store().selectDraft('save10',items());store().confirm(items());
 cart.useCartStore.getState().decreaseQty(beef,standard.customizations);
 assert.equal(store().applied,'none');assert.equal(store().invalidated,true);
 assert.deepEqual([bill().subtotalCents,bill().discountCents,bill().payableCents].map(yuan),['¥32','¥0','¥37']);
 cart.useCartStore.getState().increaseQty(beef,standard.customizations);
 assert.equal(store().applied,'none');
});
test('C06 cancelling discards the draft and keeps the saved coupon',()=>{
 store().beginEditing();store().selectDraft('save6',items());store().confirm(items());
 store().beginEditing();store().selectDraft('save10',items());store().cancel();
 assert.equal(store().applied,'save6');assert.equal(yuan(bill().payableCents),'¥65');
 store().beginEditing();assert.equal(store().draft,'save6');
});
test('C07 an empty cart bills zero and restores no coupon',()=>{
 store().beginEditing();store().selectDraft('save6',items());store().confirm(items());
 cart.useCartStore.getState().removeItem(beef,standard.customizations);
 const b=bill();
 assert.deepEqual([b.subtotalCents,b.packagingCents,b.deliveryCents,b.discountCents,b.payableCents],[0,0,0,0,0]);
 assert.equal(store().applied,'none');assert.equal(store().invalidated,false);
});
test('C08 confirm revalidates against the current cart and resets the draft',()=>{
 store().beginEditing();store().selectDraft('save10',items());
 cart.useCartStore.getState().decreaseQty(beef,standard.customizations);
 assert.equal(store().confirm(items()),false);
 assert.equal(store().applied,'none');assert.equal(store().draft,'none');assert.equal(store().confirmRejected,true);
 assert.equal(yuan(bill(store().draft).payableCents),'¥37');
});
test('payable never goes below zero and unknown coupons are rejected',()=>{
 assert.equal(coupon.computeBill([],'save6').payableCents,0);
 assert.throws(()=>store().selectDraft('save99',items()));
 assert.throws(()=>store().loadFixture('dish.default.fixture-v1','x'));
});
test('coupon fixtures seed two standard bowls once per nonce',()=>{
 cart.useCartStore.getState().addItems(standard,3);
 cart.useCartStore.getState().loadFixture('coupons.default.fixture-v1',`c${nonce}`);
 assert.equal(cart.useCartStore.getState().getTotalItems(),5);
 cart.useCartStore.getState().loadFixture('coupons.selected.fixture-v1','fresh');
 assert.equal(cart.useCartStore.getState().getTotalItems(),2);
});
