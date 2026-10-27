const {test,expect}=require('@playwright/test');
const DESIGN='.autophone/feature-designs/20261027-dish-full-visual/packages';
const open=async page=>{await page.getByTestId('home.recommendation.details').click();await expect(page.getByTestId('dish.title')).toBeVisible()};
// React Native Web 在未禁用时省略 aria-disabled。
const disabled=(page,id,value)=>value?expect(page.getByTestId(id)).toHaveAttribute('aria-disabled','true'):expect(page.getByTestId(id)).not.toHaveAttribute('aria-disabled','true');
const customize=async page=>{
 await page.getByTestId('dish.portion.large').click();await page.getByTestId('dish.extras.egg').click();await page.getByTestId('dish.quantity.increase').click();
};
const badge=page=>page.getByTestId('home.header.cart_badge');
const cartLines=page=>page.evaluate(()=>window.cartStore.getState().items.map(i=>`${i.id}|${i.customizations.map(c=>c.id).sort().join('+')}|${i.quantity}`));
test.beforeEach(async({page})=>{await page.goto('/?fixture=dish.default.fixture-v1')});
test('D01 the recommendation title opens the default dish with minus disabled',async({page})=>{
 await expect(page.getByTestId('home.recommendation.title')).toHaveText('炙烤牛肉拌饭');
 await expect(page.getByTestId('home.recommendation.details')).toHaveAttribute('aria-label','查看炙烤牛肉拌饭规格');
 await open(page);
 await expect(page.getByTestId('dish.total')).toHaveText('¥32');await expect(page.getByTestId('dish.quantity.value')).toHaveText('1');
 await disabled(page,'dish.quantity.decrease',true);await disabled(page,'dish.quantity.increase',false);
 await expect(page.getByTestId('dish.portion.standard')).toHaveAttribute('aria-checked','true');
});
test('D02 options and quantity recalculate the total immediately',async({page})=>{
 await open(page);await customize(page);
 await expect(page.getByTestId('dish.total')).toHaveText('¥82');await expect(page.getByTestId('dish.quantity.value')).toHaveText('2');
 await expect(page.getByTestId('dish.selection')).toHaveText('大份 · 加蛋 · 2 份');
 expect(await cartLines(page)).toEqual([]);
});
test('D03 quantity stays within one to nine',async({page})=>{
 await open(page);await page.getByTestId('dish.quantity.decrease').click({force:true});
 await expect(page.getByTestId('dish.quantity.value')).toHaveText('1');
 for(let i=0;i<8;i++)await page.getByTestId('dish.quantity.increase').click();
 await disabled(page,'dish.quantity.increase',true);await page.getByTestId('dish.quantity.increase').click({force:true});
 await expect(page.getByTestId('dish.quantity.value')).toHaveText('9');await expect(page.getByTestId('dish.total')).toHaveText('¥288');
});
test('D04 adding returns home and the badge, lines and subtotal agree',async({page})=>{
 await open(page);await customize(page);await page.getByTestId('dish.add').click();
 await expect(badge(page)).toHaveText('2');
 await page.getByTestId('home.header.cart').click();
 await expect(page.getByTestId('cart.summary.quantity')).toHaveText('2');await expect(page.getByTestId('cart.summary.subtotal')).toHaveText('¥82');
 const line='cart.line.beef-bowl-001.extra-egg+portion-large';
 await expect(page.getByTestId(`${line}.spec`)).toHaveText('大份 · 加蛋');await expect(page.getByTestId(`${line}.quantity`)).toHaveText('2 份');
});
test('D05 identical specifications merge and an over-limit merge leaves the cart unchanged',async({page})=>{
 for(let round=0;round<2;round++){await open(page);await customize(page);await page.getByTestId('dish.add').click();await expect(page.getByTestId('home.recommendation.title')).toBeVisible();}
 await expect(badge(page)).toHaveText('4');
 await open(page);await page.getByTestId('dish.extras.egg').click();await page.getByTestId('dish.portion.large').click();
 for(let i=0;i<5;i++)await page.getByTestId('dish.quantity.increase').click();
 await page.getByTestId('dish.add').click();
 await expect(page.getByTestId('dish.cart.error')).toHaveText('同一规格最多 9 份');
 await expect(page.getByTestId('dish.title')).toBeVisible();
 expect(await cartLines(page)).toEqual(['beef-bowl-001|extra:egg+portion:large|4']);
 await page.getByTestId('dish.back').click();await page.getByTestId('home.header.cart').click();
 await expect(page.getByTestId('cart.summary.subtotal')).toHaveText('¥164');
});
test('D06 different specifications form lines and cancelling leaves the cart unchanged',async({page})=>{
 await open(page);await customize(page);await page.getByTestId('dish.add').click();
 await open(page);await page.getByTestId('dish.add').click();
 await open(page);await customize(page);await page.getByTestId('dish.back').click();
 await expect(badge(page)).toHaveText('3');
 await page.getByTestId('home.header.cart').click();
 await expect(page.getByTestId('cart.summary.quantity')).toHaveText('3');await expect(page.getByTestId('cart.summary.subtotal')).toHaveText('¥114');
 await expect(page.getByTestId('cart.line.beef-bowl-001.portion-standard.quantity')).toHaveText('1 份');
});
test('D07 an unknown dish shows a way home and does not touch the cart',async({page})=>{
 await page.goto('/dish-detail?dishId=unknown&fixture=dish.default.fixture-v1');
 await expect(page.getByTestId('dish.missing.message')).toHaveText('菜品不存在');
 await page.getByTestId('dish.missing.home').click();await expect(page.getByTestId('home.recommendation.title')).toBeVisible();
 expect(await cartLines(page)).toEqual([]);
});
test('removing the last line returns to the original empty cart',async({page})=>{
 await open(page);await page.getByTestId('dish.add').click();await page.getByTestId('home.header.cart').click();
 await page.getByTestId('cart.line.beef-bowl-001.portion-standard.remove').click();
 await expect(page.getByTestId('cart.empty.message')).toHaveText('购物车还是空的');
});
test('order now adds one standard portion through the shared cart',async({page})=>{
 await page.goto('/');await expect(badge(page)).toHaveText('2');
 await page.getByTestId('home.recommendation.primary_action').click();await expect(badge(page)).toHaveText('3');
 expect(await cartLines(page)).toEqual(['beef-bowl-001|portion:standard|3']);
 await page.getByTestId('home.header.cart').click();await expect(page.getByTestId('cart.summary.subtotal')).toHaveText('¥96');
});
test('the details entry is offered only for the beef recommendation',async({page})=>{
 await page.getByTestId('home.recommendation.next_action').click();
 await expect(page.getByTestId('home.recommendation.title')).toHaveText('香辣鸡腿拌饭');
 await expect(page.getByTestId('home.recommendation.details')).toHaveCount(0);
});
test('narrow viewport keeps the add button visible without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:320,height:568});await open(page);
 const box=await page.getByTestId('dish.add').boundingBox();
 expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);expect(box.y+box.height).toBeLessThanOrEqual(568-37);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
for (const state of ['default','customized']) test(`frozen ${state} design properties`,async({page})=>{
 const fs=require('node:fs');
 const design=JSON.parse(fs.readFileSync(`${DESIGN}/dish-${state}/design-package.json`));
 await open(page);if(state==='customized')await customize(page);
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
