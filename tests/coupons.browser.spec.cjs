const {test,expect}=require('@playwright/test');
const DESIGN='.autophone/feature-designs/20261027-coupons-full-visual/packages';
const STANDARD='cart.line.beef-bowl-001.portion-standard';
const toCart=async page=>{await page.getByTestId('home.header.cart').click();await expect(page.getByTestId('cart.summary.payable')).toBeVisible()};
const open=async page=>{await toCart(page);await page.getByTestId('cart.coupon.entry').click();await expect(page.getByTestId('coupons.title')).toBeVisible()};
const checked=(page,id,value)=>expect(page.getByTestId(id)).toHaveAttribute('aria-checked',String(value));
const text=(page,id,value)=>expect(page.getByTestId(id)).toHaveText(value);
const cartBill=async(page,[subtotal,packaging,delivery,discount,payable])=>{
 await text(page,'cart.summary.subtotal',subtotal);await text(page,'cart.summary.packaging',packaging);
 await text(page,'cart.summary.delivery',delivery);await text(page,'cart.summary.discount',discount);await text(page,'cart.summary.payable',payable);
};
const apply=async(page,coupon)=>{await open(page);await page.getByTestId(`coupons.option.${coupon}`).click();await page.getByTestId('coupons.confirm').click();await expect(page.getByTestId('cart.summary.payable')).toBeVisible()};
test.beforeEach(async({page})=>{await page.goto('/?fixture=coupons.default.fixture-v1')});
test('C01 the cart bills two standard bowls and the coupon page shows the same bill',async({page})=>{
 await toCart(page);await cartBill(page,['¥64','¥4','¥3','¥0','¥71']);
 await page.getByTestId('cart.coupon.entry').click();
 await checked(page,'coupons.option.none',true);
 await text(page,'coupons.bill.goods','¥64');await text(page,'coupons.bill.fees','¥7');await text(page,'coupons.bill.discount','¥0');await text(page,'coupons.payable','¥71');
});
test('C02 choosing save6 previews and then applies the discount',async({page})=>{
 await open(page);await page.getByTestId('coupons.option.save6').click();
 await text(page,'coupons.bill.discount','−¥6');await text(page,'coupons.payable','¥65');
 await page.getByTestId('coupons.confirm').click();
 await cartBill(page,['¥64','¥4','¥3','−¥6','¥65']);
 await expect(page.getByTestId('cart.coupon.entry')).toHaveAttribute('aria-label','优惠券，满 ¥32 减 ¥6');
});
test('C03 save20 is listed as unavailable with its shortfall and cannot be chosen',async({page})=>{
 await open(page);
 await text(page,'coupons.unavailable.save20.title','满 ¥100 减 ¥20');await text(page,'coupons.unavailable.save20.reason','还差 ¥36 可用');
 await expect(page.getByTestId('coupons.option.save20')).toHaveCount(0);
 await page.getByTestId('coupons.unavailable.save20').click();
 await checked(page,'coupons.option.none',true);await text(page,'coupons.payable','¥71');
});
test('C04 a goods amount equal to the threshold makes save6 available',async({page})=>{
 await toCart(page);await page.getByTestId(`${STANDARD}.decrease`).click();
 await cartBill(page,['¥32','¥2','¥3','¥0','¥37']);
 await page.getByTestId('cart.coupon.entry').click();
 await expect(page.getByTestId('coupons.option.save10')).toHaveCount(0);await text(page,'coupons.unavailable.save10.reason','还差 ¥28 可用');
 await page.getByTestId('coupons.option.save6').click();await text(page,'coupons.payable','¥31');
});
test('C05 reducing quantity invalidates the saved coupon and does not reselect it',async({page})=>{
 await apply(page,'save10');await cartBill(page,['¥64','¥4','¥3','−¥10','¥61']);
 await page.getByTestId(`${STANDARD}.decrease`).click();
 await cartBill(page,['¥32','¥2','¥3','¥0','¥37']);
 await text(page,'cart.coupon.notice','优惠券已失效，请重新选择');
 await page.getByTestId(`${STANDARD}.increase`).click();
 await text(page,'cart.summary.discount','¥0');await text(page,'cart.summary.payable','¥71');
});
for(const method of ['button','history'])test(`C06 ${method} back keeps the saved coupon`,async({page})=>{
 await apply(page,'save6');await page.getByTestId('cart.coupon.entry').click();
 await page.getByTestId('coupons.option.save10').click();await text(page,'coupons.payable','¥61');
 if(method==='button')await page.getByTestId('coupons.back').click();else await page.goBack();
 await cartBill(page,['¥64','¥4','¥3','−¥6','¥65']);
 await page.getByTestId('cart.coupon.entry').click();await checked(page,'coupons.option.save6',true);
});
test('C07 removing every line returns to the original empty cart and clears the coupon',async({page})=>{
 await apply(page,'save6');await page.getByTestId(`${STANDARD}.remove`).click();
 await text(page,'cart.empty.message','购物车还是空的');
 await expect(page.getByTestId('cart.coupon.entry')).toHaveCount(0);
 expect(await page.evaluate(()=>window.couponStore.getState().applied)).toBe('none');
});
test('C08 confirm revalidates against the current cart',async({page})=>{
 await open(page);await page.getByTestId('coupons.option.save10').click();
 // 测试状态通道：在优惠页停留时把购物车减为标准份 1 份。
 await page.evaluate(()=>{const s=window.cartStore.getState();const item=s.items[0];s.decreaseQty(item.id,item.customizations)});
 await page.getByTestId('coupons.confirm').click();
 await text(page,'coupons.error','订单金额变化，请重新选择优惠券');
 await expect(page.getByTestId('coupons.title')).toBeVisible();
 await checked(page,'coupons.option.none',true);await text(page,'coupons.payable','¥37');
 expect(await page.evaluate(()=>window.couponStore.getState().applied)).toBe('none');
});
test('narrow viewport keeps confirmation visible without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:320,height:568});await open(page);
 const box=await page.getByTestId('coupons.confirm').boundingBox();
 expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);expect(box.y+box.height).toBeLessThanOrEqual(568-37);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
for (const state of ['default','selected']) test(`frozen ${state} design properties`,async({page})=>{
 const fs=require('node:fs');
 const design=JSON.parse(fs.readFileSync(`${DESIGN}/coupons-${state}/design-package.json`));
 await open(page);if(state==='selected')await page.getByTestId('coupons.option.save6').click();
 for(const element of design.elements){
   const actual=await page.getByTestId(element.stable_id).evaluate(el=>{
     const box=el.getBoundingClientRect();const style=getComputedStyle(el);
     const textEl=el.querySelector('[dir="auto"]')||el;
     const hex=s=>{const rgb=s.match(/\d+/g);return '#'+rgb.slice(0,3).map(x=>Number(x).toString(16).padStart(2,'0')).join('').toUpperCase()};
     return {text:el.textContent,'resolved_style.color':hex(getComputedStyle(textEl).color),'resolved_style.backgroundColor':hex(style.backgroundColor),'resolved_style.borderRadius':parseFloat(style.borderRadius),'resolved_style.fontSize':String(parseFloat(getComputedStyle(textEl).fontSize)),'frame.x':box.x,'frame.y':box.y,'frame.width':box.width,'frame.height':box.height};
   });
   for(const property of element.properties){
     const key=property.property;const value=property.value;
     if(key.startsWith('frame.'))expect.soft(Math.abs(actual[key]-Number(value)),`${element.stable_id} ${key}`).toBeLessThanOrEqual(0.5);
     else if(key.endsWith('borderRadius'))expect.soft(actual[key],element.stable_id).toBe(Number(value));
     else expect.soft(actual[key],`${element.stable_id} ${key}`).toBe(value);
   }
 }
});
