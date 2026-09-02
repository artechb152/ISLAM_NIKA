import { getPage, shot, safeEval, text, hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
await ensureGame(page);
const btn = page.locator('button', { hasText: 'הלאה' }).last();
await btn.click().catch(async e => {
  console.log('btnErr, trying last text');
  await page.getByText('הלאה', { exact: true }).last().click().catch(()=>{});
});
await page.waitForTimeout(2000);
console.log('TXT:', JSON.stringify(await text(page, 600)));
await shot(page, '188-verdict-closed');
await browser.close();
