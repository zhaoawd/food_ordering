from pathlib import Path
from playwright.sync_api import sync_playwright
import json
P=Path(__file__).resolve().parents[1]; O=P/'ui'/'screens'; O.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844}, device_scale_factor=1)
 errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 for s in ['home','stores','menu','product','cart','coupons','checkout','payment','order','orders','member','address','ai']:
  page.goto('about:blank');page.set_content((P/'ui/prototype.html').read_text().replace('let qp=new URLSearchParams(location.search);',f"let qp=new URLSearchParams('embed=1&page={s}&width=390');"));page.wait_for_timeout(100)
  page.screenshot(path=str(O/f'{s}.png'))
 print('ERRORS',errs)
 page.set_viewport_size({'width':760,'height':844});page.goto('about:blank');page.set_content((P/'ui/prototype.html').read_text().replace('let qp=new URLSearchParams(location.search);',"let qp=new URLSearchParams('embed=1&page=menu&width=760');"));page.screenshot(path=str(O/'duo-menu.png'))
 page.set_viewport_size({'width':1780,'height':1050});page.set_content((P/'ui/overview.html').read_text());page.wait_for_timeout(300);page.screenshot(path=str(P/'ui/overview.png'),full_page=True)
 print('states', page.locator('iframe').count());b.close()
