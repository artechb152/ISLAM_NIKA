import { getPage, safeEval, text, shot } from './lib2.mjs';
import { ensureGame } from './lib4.mjs';
const { browser, page } = await getPage();
const B = (t) => page.locator('button', { hasText: t }).last();
const T = async (n=1500) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
await ensureGame(page);
for (const [ans, name] of [['ודּ, סֻוַאע ויע׳וּת','277-stones-wrong1'], ['אין להן שמות','278-stones-wrong2'], ['אללאת, אלעזה ומנאת','279-stones-correct']]) {
  await B(ans).click().catch(e=>console.log('err', ans));
  await page.waitForTimeout(1900);
  const t = await T(2200);
  const tail = t.slice(-330);
  console.log(JSON.stringify(ans), '->', JSON.stringify(tail.slice(tail.lastIndexOf('\n\n'))));
  await shot(page, name);
}
console.log('FINAL:', JSON.stringify((await T(2400)).slice(-450)));
await browser.close();
