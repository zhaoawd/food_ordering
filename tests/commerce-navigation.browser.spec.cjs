const {test,expect}=require('@playwright/test');
const pages=[['nav.home','/','home.brand'],['nav.menu','/menu','menu.search'],['nav.coupons','/rewards','rewards.title'],['nav.orders','/orders','orders.title'],['nav.member','/profile','profile.title']];
test('T003 all five entries navigate and exclusively select the destination',async({page})=>{
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('/');
 for(const [tab,path,marker] of [...pages.slice(1),pages[0]]){
  await page.getByTestId(tab).click();
  await expect(page).toHaveURL(new RegExp(path==='/'?'/$':path+'$'));
  await expect(page.getByTestId(marker)).toHaveCount(1);
  await expect(page.getByTestId(marker)).toBeVisible();
  for(const [other] of pages)await expect(page.getByTestId(other)).toHaveAttribute('aria-selected',String(other===tab));
 }
 await expect(page.getByTestId('home.brand')).toHaveText('食刻');
});
