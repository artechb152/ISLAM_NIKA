import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
const dlg = async () => await safeEval(page, () => {
  const t = document.body.innerText;
  const i = t.indexOf('רָאוִי');
  return t.slice(Math.max(0,i), i+300);
});
await page.keyboard.press(' ');
await page.waitForTimeout(1800);
console.log('L2:', JSON.stringify(await dlg()));
await shot(page, '04-area1-dialog-line2');
// Escape mid-dialog
await page.keyboard.press('Escape');
await page.waitForTimeout(1200);
await shot(page, '05-area1-after-escape');
const txt = await safeEval(page, () => document.body.innerText.slice(0, 900));
console.log('AFTER ESC:', JSON.stringify(txt));
await browser.close();
