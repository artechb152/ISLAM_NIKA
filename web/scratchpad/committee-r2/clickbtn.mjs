import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
const label = process.argv[2];
const r = await safeEval(page, (lbl) => {
  const els = [...document.querySelectorAll('button,[role=button],a')];
  const el = els.find(b => b.innerText.trim() === lbl);
  if (el) { el.click(); return 'clicked'; }
  return 'notfound: ' + els.map(b=>b.innerText.trim().slice(0,20)).join('|');
}, label);
console.log(r);
await page.waitForTimeout(1200);
await shot(page, process.argv[3] || 'clickedbtn');
console.log('TXT:', JSON.stringify(await safeEval(page, () => document.body.innerText.slice(0, 600))));
await browser.close();
