return await page.evaluate(() => {
  const els = [...document.querySelectorAll('body *')].filter(e => {
    const t = (e.textContent || '').trim();
    return (t === '✦' || t === '?') && e.children.length === 0;
  });
  return els.map(e => {
    const r = e.getBoundingClientRect();
    return { t: e.textContent.trim(), x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), visible: r.width > 0 };
  });
});
