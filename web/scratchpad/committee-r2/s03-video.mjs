import { getPage, shot, safeEval } from './lib.mjs';
const { browser, page } = await getPage();
for (let i = 0; i < 3; i++) {
  await page.waitForTimeout(4000);
  const v = await safeEval(page, () => {
    const vids = [...document.querySelectorAll('video')];
    return vids.map(v => ({ src: (v.currentSrc||v.src||'').split('/').slice(-1)[0], t: +v.currentTime.toFixed(1), dur: +((v.duration||0).toFixed(1)), paused: v.paused, ready: v.readyState, w: v.videoWidth, err: v.error ? v.error.code : null }));
  });
  console.log('VID', i, JSON.stringify(v));
}
await shot(page, '01-intro-t20');
const btns = await safeEval(page, () => [...document.querySelectorAll('button,[role=button]')].map(b => b.innerText.trim()).filter(Boolean));
console.log('BUTTONS:', JSON.stringify(btns));
await browser.close();
