async function clickBtn(re) {
  const el = await page.evaluate((reS) => {
    const rx = new RegExp(reS);
    const b = [...document.querySelectorAll('button')].find(e => rx.test((e.innerText||'').trim()));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.x + r.width/2, y: r.y + r.height/2, t: b.innerText.trim() };
  }, re.source || re);
  if (el) { await page.mouse.click(el.x, el.y); return el.t; }
  return null;
}
async function talkState() { return await page.evaluate(() => ({ talk: !!window.__ch1Live.talk, at: window.__ch1Live.atTask, nf: window.__ch1Live.nearFind })); }
async function clearTalk(maxIter, choiceRe) {
  const log = [];
  for (let i=0;i<maxIter;i++){
    const st = await talkState();
    if (!st.talk) { log.push('clear@'+i); break; }
    await page.waitForTimeout(1900);
    let c = null;
    if (choiceRe) c = await clickBtn(choiceRe);
    if (!c) c = await clickBtn('^(המשך|הלאה|מספיק)');
    if (!c) { await page.keyboard.press('Space'); c='space'; } log.push(c);
    await page.waitForTimeout(700);
  }
  return log;
}
async function steerTo(name, stop, maxIter) {
  for (let iter = 0; iter < maxIter; iter++) {
    const st = await talkState();
    if (stop(st)) return { ok: true, iter };
    if (st.talk) return { ok: false, why: 'talk' };
    const mx = await page.evaluate((n) => {
      const m = window.__ch1Live.markerEls.get(n);
      if (!m) return 'none';
      const r = m.getBoundingClientRect();
      return (r.width === 0 && r.height === 0) ? 'hidden' : { x: r.x + r.width/2 };
    }, name);
    if (mx === 'none') return { ok: false, why: 'noMarker' };
    if (mx === 'hidden') {
      await page.mouse.move(800,450); await page.mouse.down();
      await page.mouse.move(1080,450,{steps:8}); await page.mouse.up();
      await page.waitForTimeout(200); continue;
    }
    const off = mx.x - 800;
    if (Math.abs(off) > 100) {
      await page.mouse.move(800,450); await page.mouse.down();
      await page.mouse.move(800 + Math.sign(off)*Math.min(260, Math.abs(off)*0.6), 450, {steps:6});
      await page.mouse.up(); await page.waitForTimeout(180);
    }
    await page.keyboard.down('Shift'); await page.keyboard.down('w');
    await page.waitForTimeout(500);
    await page.keyboard.up('w'); await page.keyboard.up('Shift');
  }
  return { ok: false, why: 'maxIter' };
}
