return await page.evaluate(() => {
  const l = window.__ch1Live;
  if (!l) return 'no live handle';
  const keys = Object.keys(l);
  let player = null;
  try { player = l.player && l.player.get ? l.player.get() : null; } catch(e) {}
  return { keys, player: player ? JSON.stringify(player) : String(l.player && Object.keys(l.player)) };
});
