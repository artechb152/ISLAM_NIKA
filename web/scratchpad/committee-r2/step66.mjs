import { getPage, shot, safeEval, text } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await page.getByText('אחר כך').click().catch(()=>{});
await page.waitForTimeout(800);
for (const [key, name] of [['inscription','200-tribalmark'], ['pass-coin','202-passcoin']]) {
  const p = await seekFind(page, key, 30);
  console.log(key, 'AT:', JSON.stringify(p));
  if (p && p.nearFind && p.nearFind.includes(key.replace('pass-',''))) {
    await shot(page, name + '-near');
    await page.keyboard.press('f');
    await page.waitForTimeout(2300);
    await shot(page, name + '-card');
    const t = await text(page, 1100);
    const j = typeof t === 'string' ? t.lastIndexOf('נמצא') : -1;
    console.log(key, 'CARD:', JSON.stringify(j>=0 ? t.slice(j, j+330) : t));
    await page.getByText('המשיכו').click().catch(()=>{});
    await page.waitForTimeout(1000);
  }
}
await browser.close();
