import { getPage, safeEval, text, shot } from './lib2.mjs';
const { browser, page } = await getPage();
const T = async (n=800) => { const t = await text(page, n); return typeof t === 'string' ? t : ''; };
for (let i = 0; i < 5; i++) {
  await page.waitForTimeout(3000);
  const v = await safeEval(page, () => {
    const vv = document.querySelector('video');
    if (!vv) return null;
    return { t: +vv.currentTime.toFixed(1), dur: +(vv.duration||0).toFixed(1), paused: vv.paused, muted: vv.muted, vol: vv.volume, src: (vv.currentSrc||'').split('/').pop() };
  });
  console.log(i, JSON.stringify(v));
  await shot(page, '290-film-' + i);
  if (!v) break;
}
const btns = await safeEval(page, () => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean));
console.log('BTNS:', JSON.stringify(btns));
console.log('TXT:', JSON.stringify(await T(600)));
await browser.close();
