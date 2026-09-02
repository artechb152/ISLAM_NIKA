import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { seekFind } from './seek.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
await page.getByText('אחר כך').click().catch(()=>{});
await page.waitForTimeout(900);
for (const [key, name] of [['drachm','172-drachm'], ['seal','174-seal']]) {
  const p = await seekFind(page, key, 30);
  console.log(key, 'AT:', JSON.stringify(p));
  if (p && p.nearFind && p.nearFind.includes(key)) {
    await shot(page, name + '-near');
    await page.keyboard.press('f');
    await page.waitForTimeout(2300);
    await shot(page, name + '-card');
    console.log(key, 'CARD:', JSON.stringify(await text(page, 1000)));
    await page.getByText('המשיכו').click().catch(()=>{});
    await page.waitForTimeout(1000);
  }
}
await browser.close();
