const {test,expect}=require('@playwright/test');
const DESIGN='.autophone/feature-designs/20261027-preferences-full-visual/packages';
const open=async page=>{
 await page.getByTestId('home.navigation.profile').click();await expect(page.getByTestId('profile.title')).toBeVisible();
 await page.getByTestId('profile.preferences').click();await expect(page.getByTestId('preferences.title')).toBeVisible();
};
const checked=(page,id,value)=>expect(page.getByTestId(id)).toHaveAttribute('aria-checked',String(value));
const edit=async page=>{
 await page.getByTestId('preferences.spice.none').click();
 await page.getByTestId('preferences.avoid.coriander').click();await page.getByTestId('preferences.avoid.peanut').click();
 await page.getByTestId('preferences.budget.under30').click();
};
test.beforeEach(async({page})=>{await page.goto('/?fixture=preferences.default.fixture-v2')});
test('P01 profile entry opens the saved defaults',async({page})=>{
 await open(page);
 await checked(page,'preferences.spice.mild',true);await checked(page,'preferences.budget.under40',true);
 for(const id of ['coriander','onion','peanut'])await checked(page,`preferences.avoid.${id}`,false);
 await expect(page.getByTestId('preferences.summary')).toHaveText('微辣 · 无忌口 · ¥40 内');
});
test('P02 combined edits update the live summary without saving',async({page})=>{
 await open(page);await edit(page);
 await expect(page.getByTestId('preferences.summary')).toHaveText('不辣 · 不要香菜、花生 · ¥30 内');
 expect(await page.evaluate(()=>window.preferencesStore.getState().committed.spice)).toBe('mild');
});
test('P03 a third avoidance is refused until one is cleared and order stays fixed',async({page})=>{
 await open(page);await edit(page);
 await page.getByTestId('preferences.avoid.onion').click();
 await checked(page,'preferences.avoid.onion',false);await checked(page,'preferences.avoid.coriander',true);await checked(page,'preferences.avoid.peanut',true);
 await expect(page.getByTestId('preferences.avoid.error')).toHaveText('最多选择 2 项忌口');
 await page.getByTestId('preferences.avoid.coriander').click();
 await expect(page.getByTestId('preferences.avoid.error')).toHaveCount(0);
 await page.getByTestId('preferences.avoid.onion').click();
 await expect(page.getByTestId('preferences.summary')).toHaveText('不辣 · 不要洋葱、花生 · ¥30 内');
});
for(const method of ['button','history'])test(`P04 ${method} back discards the draft`,async({page})=>{
 await open(page);await edit(page);
 if(method==='button')await page.getByTestId('preferences.back').click();else await page.goBack();
 await expect(page.getByTestId('profile.preferences.summary')).toHaveText('微辣 · 无忌口 · ¥40 内');
 await page.getByTestId('profile.preferences').click();
 await checked(page,'preferences.spice.mild',true);await expect(page.getByTestId('preferences.summary')).toHaveText('微辣 · 无忌口 · ¥40 内');
});
test('P05 reset restores the draft defaults without saving or leaving',async({page})=>{
 await open(page);await edit(page);await page.getByTestId('preferences.reset').click();
 await expect(page.getByTestId('preferences.title')).toBeVisible();
 await checked(page,'preferences.spice.mild',true);await checked(page,'preferences.budget.under40',true);
 await expect(page.getByTestId('preferences.summary')).toHaveText('微辣 · 无忌口 · ¥40 内');
 expect(await page.evaluate(()=>window.__backCalls||0)).toBe(0);
});
test('P06 save returns to profile and reopening keeps the saved values',async({page})=>{
 await open(page);await edit(page);await page.getByTestId('preferences.save').click();
 await expect(page.getByTestId('profile.preferences.summary')).toHaveText('不辣 · 不要香菜、花生 · ¥30 内');
 await page.getByTestId('profile.preferences').click();
 await checked(page,'preferences.spice.none',true);await checked(page,'preferences.avoid.coriander',true);await checked(page,'preferences.avoid.peanut',true);await checked(page,'preferences.budget.under30',true);
});
test('choice roles expose single and multiple selection',async({page})=>{
 await open(page);
 await expect(page.getByTestId('preferences.spice.mild')).toHaveAttribute('role','radio');
 await expect(page.getByTestId('preferences.avoid.onion')).toHaveAttribute('role','checkbox');
});
test('narrow viewport keeps both actions visible without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:320,height:568});await open(page);
 for(const id of ['preferences.reset','preferences.save']){
   const box=await page.getByTestId(id).boundingBox();
   expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(320);expect(box.y+box.height).toBeLessThanOrEqual(568-37);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
for (const state of ['default','edited']) test(`frozen ${state} design properties and screenshot`,async({page},testInfo)=>{
 const fs=require('node:fs');
 const design=JSON.parse(fs.readFileSync(`${DESIGN}/preferences-${state}/design-package.json`));
 await open(page);if(state==='edited')await edit(page);
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
 await page.screenshot({path:testInfo.outputPath(`${state}.png`)});
});
