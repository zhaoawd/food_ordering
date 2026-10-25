// 校验编译原型的布局与内容，不执行产品行为验收。
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--autophone-root') || !args.includes('--packages')) {
  throw new Error('usage: node verify_layout.cjs --autophone-root PATH --packages PATH');
}
const root = path.resolve(option('--packages'));
const requireAutophone = createRequire(path.join(path.resolve(option('--autophone-root')), 'package.json'));
const { chromium } = requireAutophone('@playwright/test');
const read = name => JSON.parse(fs.readFileSync(name, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async () => {
  const browser = await chromium.launch({headless: true, args: ['--disable-gpu', '--disable-gpu-compositing']});
  const reports = [];
  try {
    const validation = read(path.join(root, 'validation-report.json'));
    for (const state of validation.states) {
      const directory = path.join(root, state.package);
      const manifest = read(path.join(directory, 'design-package.json'));
      const document = read(path.join(directory, 'prototype/ui-document.json'));
      if (sha(path.join(directory, 'design-package.json')) !== state.manifest_sha256 || sha(path.join(directory, 'reference.png')) !== state.reference_sha256) throw new Error(`hash mismatch: ${state.package}`);
      const png = fs.readFileSync(path.join(directory, 'reference.png'));
      if (png.readUInt32BE(16) !== 1290 || png.readUInt32BE(20) !== 2796) throw new Error(`PNG size mismatch: ${state.package}`);
      const targets = document.acceptance[0].targets;
      for (const target of targets) {
        const element = manifest.elements.find(e => e.stable_id === target.stable_id);
        if (!element || [...target.properties].sort().join() !== element.properties.map(p => p.property).sort().join()) throw new Error(`property scope mismatch: ${target.stable_id}`);
      }
      const page = await browser.newPage({viewport: {width:430,height:932}, deviceScaleFactor:3});
      await page.goto(pathToFileURL(path.join(directory, 'prototype/compiled/index.html')).href);
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(({ids, screen}) => {
        const failures=[];
        const elements=ids.map(id => [...document.querySelectorAll('[data-stable-id]')].find(e=>e.dataset.stableId===id));
        const footer=document.getElementById(screen+'.footer');
        const content=document.getElementById(screen+'.content');
        for(let i=0;i<ids.length;i++) {
          const e=elements[i];
          if(!e){failures.push(`${ids[i]} missing`);continue;}
          const r=e.getBoundingClientRect();
          if(r.left < -0.1 || r.right>430.1 || r.top<58.9 || r.bottom>895.1 || r.width<=0 || r.height<=0) failures.push(`${ids[i]} outside safe content`);
          if(e.scrollWidth>e.clientWidth+1 || e.scrollHeight>e.clientHeight+1) failures.push(`${ids[i]} overflowing text`);
          if(content.contains(e) && r.bottom>footer.getBoundingClientRect().top+0.1) failures.push(`${ids[i]} covered by footer`);
        }
        const buttons=[...document.querySelectorAll('button')];
        for(let i=0;i<buttons.length;i++) for(let j=i+1;j<buttons.length;j++) {
          const a=buttons[i].getBoundingClientRect(),b=buttons[j].getBoundingClientRect();
          if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>0.5 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0.5) failures.push(`buttons overlap: ${buttons[i].id}, ${buttons[j].id}`);
        }
        return {elements:ids.length, failures};
      },{ids:manifest.elements.map(e=>e.stable_id),screen:manifest.screen_id});
      reports.push({state_id:state.state_id,...result});
      await page.close();
    }
  } finally {await browser.close();}
  fs.writeFileSync(path.join(root,'layout-report.json'),JSON.stringify({scope:'browser_layout_and_package_integrity',device_verified:false,states:reports},null,2)+'\n');
  for(const result of reports) console.log(`${result.state_id}: ${result.elements} elements, ${result.failures.length} failures`,...result.failures);
  if(reports.some(r=>r.failures.length)) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
