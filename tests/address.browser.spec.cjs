const {test,expect}=require('@playwright/test');
const open=async page=>{await page.getByTestId('home.header.location').click();await expect(page.getByTestId('address.title')).toBeVisible()};
test.beforeEach(async({page})=>{await page.goto('/')});
test('A01 opening from home shows the committed address',async({page})=>{
 await open(page);await expect(page.getByTestId('address.option.home')).toHaveAttribute('aria-checked','true');
 await expect(page.getByTestId('address.detail.address')).toHaveText('北京市朝阳区望京街 10 号');
});
test('A02 switching draft changes details without committing',async({page})=>{
 await open(page);await page.getByTestId('address.option.company').click();
 await expect(page.getByTestId('address.option.company')).toHaveAttribute('aria-checked','true');
 await expect(page.getByTestId('address.option.home')).toHaveAttribute('aria-checked','false');
 await expect(page.getByTestId('address.detail.address')).toHaveText('北京市海淀区中关村东路 8 号');
 expect(await page.evaluate(()=>window.addressStore.getState().committed)).toBe('home');
});
test('A03 and A05 confirmation updates home and persists when reopened',async({page})=>{
 await open(page);await page.getByTestId('address.option.company').click();await page.getByTestId('address.confirm').click();
 await expect(page.getByTestId('home.header.location')).toHaveText('送至 · 中关村');
 await open(page);await expect(page.getByTestId('address.option.company')).toHaveAttribute('aria-checked','true');
});
for(const method of ['button','history'])test(`A04 ${method} back cancels draft`,async({page})=>{
 await open(page);await page.getByTestId('address.option.company').click();
 if(method==='button')await page.getByTestId('address.back').click();else await page.goBack();
 await expect(page.getByTestId('home.header.location')).toHaveText('送至 · 望京');
 await open(page);await expect(page.getByTestId('address.option.home')).toHaveAttribute('aria-checked','true');
});
test('A06 rapid confirmation returns once and preserves recommendation and bag',async({page})=>{
 await page.getByTestId('home.recommendation.next_action').click();await expect(page.getByTestId('home.recommendation.title')).toHaveText('香辣鸡腿拌饭');
 await page.getByTestId('home.recommendation.primary_action').click();await expect(page.getByTestId('home.header.cart_badge')).toHaveText('3');
 await expect(page.getByTestId('home.recommendation.primary_action')).toHaveText('立即下单');
 await open(page);await page.getByTestId('address.option.company').click();
 await page.getByTestId('address.confirm').evaluate(el=>{el.click();el.click()});
 await expect(page.getByTestId('home.header.location')).toHaveText('送至 · 中关村');
 expect(await page.evaluate(()=>window.__backCalls)).toBe(1);
 await expect(page.getByTestId('home.recommendation.title')).toHaveText('香辣鸡腿拌饭');
 await expect(page.getByTestId('home.header.cart_badge')).toHaveText('3');
});
test('company fixture can cancel without committing and is consumed once',async({page})=>{
 await page.goto('/?fixture=address.company.fixture-v1');await open(page);
 await expect(page.getByTestId('address.option.company')).toHaveAttribute('aria-checked','true');
 await page.getByTestId('address.back').click();await open(page);
 await expect(page.getByTestId('address.option.home')).toHaveAttribute('aria-checked','true');
});
test('narrow viewport keeps confirmation visible and content scrollable',async({page})=>{
 await page.setViewportSize({width:320,height:568});await open(page);
 const button=await page.getByTestId('address.confirm').boundingBox();expect(button.x).toBeGreaterThanOrEqual(0);expect(button.x+button.width).toBeLessThanOrEqual(320);expect(button.y+button.height).toBeLessThanOrEqual(568-37);
 await page.getByTestId('address.option.company').click();await page.getByTestId('address.confirm').click();await expect(page.getByTestId('home.header.location')).toHaveText('送至 · 中关村');
});
for (const state of ['default','company']) test(`frozen ${state} design properties and screenshot`,async({page},testInfo)=>{
 const fs=require('node:fs');
 const design=JSON.parse(fs.readFileSync(`.autophone/feature-designs/20261024-v1/packages-v2/address-${state}/design-package.json`));
 await open(page);if(state==='company')await page.getByTestId('address.option.company').click();
 for(const element of design.elements){
   const actual=await page.getByTestId(element.stable_id).evaluate(el=>{
     const box=el.getBoundingClientRect();const style=getComputedStyle(el);
     const textEl=el.querySelector('[dir="auto"]')||el;
     const color=getComputedStyle(textEl).color;
     const hex=s=>{const rgb=s.match(/\d+/g);return '#'+rgb.slice(0,3).map(x=>Number(x).toString(16).padStart(2,'0')).join('').toUpperCase()};
     return {text:el.textContent,'resolved_style.color':hex(color),'resolved_style.backgroundColor':hex(style.backgroundColor),'resolved_style.borderRadius':parseFloat(style.borderRadius),'frame.x':box.x,'frame.y':box.y,'frame.width':box.width,'frame.height':box.height};
   });
   for(const property of element.properties){
     const key=property.property;const value=property.value;
     if(key.startsWith('frame.'))expect.soft(Math.abs(actual[key]-Number(value)),`${element.stable_id} ${key}`).toBeLessThanOrEqual(0.5);
     else if(key.endsWith('borderRadius'))expect.soft(actual[key],element.stable_id).toBe(Number(value));
     else expect.soft(actual[key],`${element.stable_id} ${key}`).toBe(value);
   }
 }
 await page.screenshot({path:testInfo.outputPath(`${state}.png`)});
});
test('address choice labels and checkmark form a centered group as designed',async({page})=>{
 await open(page);
 const boxes=await page.getByTestId('address.option.home').evaluate(el=>{
 const outer=el.getBoundingClientRect(),text=el.querySelector('[dir="auto"]').getBoundingClientRect();
 return {outerCenter:(outer.left+outer.right)/2,textCenter:(text.left+text.right)/2};
 });
 expect(Math.abs(boxes.outerCenter-boxes.textCenter)).toBeLessThanOrEqual(10);
});

test('native 34pt bottom inset preserves frozen footer geometry',async({page})=>{
 await page.goto('/?bottomInset=34');await open(page);
 const button=await page.getByTestId('address.confirm').boundingBox();
 expect(button.y).toBe(831);expect(button.height).toBe(48);
});
test('larger native safe area is respected',async({page})=>{
 await page.goto('/?bottomInset=50&topInset=64');await open(page);
 const back=await page.getByTestId('address.back').boundingBox(),button=await page.getByTestId('address.confirm').boundingBox();
 expect(back.y).toBeGreaterThanOrEqual(64);expect(button.y+button.height).toBeLessThanOrEqual(932-50);
});
