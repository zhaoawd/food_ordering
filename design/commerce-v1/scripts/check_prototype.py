#!/usr/bin/env python3
"""Behavior checks for the standalone HTML DESIGN PROTOTYPE, not RN/iOS."""
from __future__ import annotations
import json
import os
from pathlib import Path
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'ui/prototype.html').read_text(encoding='utf-8')
results=[]
def check(name,condition,detail=''):
    results.append({'name':name,'passed':bool(condition),'detail':detail})

def main():
    with sync_playwright() as pw:
        browser_path=os.environ.get('CHROMIUM_PATH')
        if not browser_path and Path('/usr/bin/chromium').exists():browser_path='/usr/bin/chromium'
        opts={'args':['--no-sandbox']}
        if browser_path:opts['executable_path']=browser_path
        browser=pw.chromium.launch(**opts)
        p=browser.new_page(viewport={'width':1400,'height':1000},device_scale_factor=1)
        errors=[]
        p.on('pageerror',lambda e:errors.append(str(e)))
        def load(page='home',state='default',width=390):
            p.goto('about:blank')
            query=f'page={page}&state={state}&width={width}'
            p.set_content(HTML.replace('let qp=new URLSearchParams(location.search);',f"let qp=new URLSearchParams('{query}');"))
        def state():return p.evaluate('window.designPrototype.getState()')
        def click(id):p.get_by_test_id(id).click()
        for name in ['home','stores','menu','product','cart','coupons','checkout','payment','order','orders','member','address','ai']:
            load(name);check('render_'+name,p.locator('#app').inner_text().strip()!='' and state()['page']==name)
        check('no_javascript_errors',not errors,'; '.join(errors))
        load();check('initial_sample_total',state()['bill']['total']==5980)
        p.evaluate("window.designPrototype.navigate('orders')")
        check('orders_is_not_cart',state()['page']=='orders' and '我的订单' in p.locator('#app').inner_text())
        p.evaluate('window.designPrototype.reset(false)')
        p.evaluate("window.designPrototype.navigate('cart')")
        check('empty_cart_visible',p.get_by_test_id('cart.empty.primary_action').is_visible() and state()['qty']==0)
        click('cart.empty.primary_action');click('menu.product.combo-chicken-001.open')
        click('product.quantity.increase');click('product.add')
        check('standard_combo_added_twice',state()['qty']==2)
        click('menu.cart.open');click('cart.coupon.entry')
        check('coupon_above_threshold_disabled',p.get_by_test_id('coupons.coupon.save20.select').is_disabled())
        click('coupons.coupon.save10.select');click('coupons.confirm')
        check('coupon_confirm_total',state()['coupon']=='save10' and state()['bill']['total']==5980)
        click('cart.coupon.entry');click('coupons.coupon.save6.select');click('coupons.cancel')
        check('coupon_cancel_retains_applied',state()['coupon']=='save10')
        click('cart.line.combo-chicken-001.drink-tea-ice-less.decrease')
        check('invalid_coupon_clears',state()['qty']==1 and state()['coupon']=='none' and state()['bill']['total']==3490)
        p.evaluate('window.designPrototype.reset(true)');p.evaluate("window.designPrototype.navigate('checkout')")
        check('submit_requires_store_confirmation',p.get_by_test_id('checkout.submit').is_disabled())
        p.get_by_test_id('checkout.store.confirm').check();click('checkout.submit')
        check('mock_order_created',state()['page']=='payment' and state()['orderId']=='DEMO-20261105-001')
        click('payment.confirm_mock')
        check('mock_success_shows_order',state()['page']=='order' and 'A108' in p.locator('#app').inner_text())
        load('checkout','quote_expired');p.get_by_test_id('checkout.store.confirm').check()
        check('expired_quote_blocks_submit',p.get_by_test_id('checkout.submit').is_disabled())
        click('checkout.quote.accept')
        check('quote_refresh_requires_confirmation',not p.get_by_test_id('checkout.store.confirm').is_checked() and p.get_by_test_id('checkout.submit').is_disabled())
        load('payment','unknown');check('unknown_payment_queries_original',p.get_by_test_id('payment.retry_status').is_visible() and p.get_by_test_id('payment.confirm_mock').count()==0)
        load('product','soldout');check('soldout_blocks_add',p.get_by_test_id('product.add').is_disabled())
        load('menu');before=state();p.locator('#size').select_option('760')
        check('wide_layout_rendered',p.locator('#device').bounding_box()['width']==760)
        p.locator('#size').select_option('390');after=state()
        check('resize_preserves_cart',all(before[k]==after[k] for k in ['qty','coupon','mode']) and before['bill']==after['bill'])
        load('cart');
        for _ in range(15):click('cart.line.combo-chicken-001.drink-tea-ice-less.increase')
        check('quantity_capped_at_nine',state()['qty']==9)
        check('no_errors_after_interactions',not errors,'; '.join(errors))
        browser.close()
    report={'scope':'standalone HTML design prototype only; NOT RN Web/native/backend acceptance','checked_at_utc':datetime.now(timezone.utc).isoformat(),'passed':sum(r['passed'] for r in results),'total':len(results),'checks':results,'native_execution':'not_run','backend_execution':'not_run','payment_execution':'mock_in_memory_only','known_limitations':['Only the standard combo path has a complete demo calculation.','No authentication, inventory concurrency, payment webhook or refund implementation.','The prototype intentionally includes static sample membership/order pages.','No full accessibility audit or pixel-perfect RN comparison was performed.']}
    (ROOT/'evidence/prototype-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return 0 if all(r['passed'] for r in results) else 1
if __name__=='__main__':raise SystemExit(main())
