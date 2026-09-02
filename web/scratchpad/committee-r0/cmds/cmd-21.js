return await page.evaluate(() => {
  const l = window.__ch1Live;
  const p = l.player;
  const markers = (l.markerEls || []).map(m => {
    try { return { label: m.label || m.name || m.id || (m.el && m.el.textContent), x: m.x, z: m.z }; } catch(e) { return String(m); }
  });
  return { player: { x: p.x, y: p.y, z: p.z }, yaw: l.yaw, nearWho: l.nearWho, nearFind: l.nearFind, atTask: l.atTask, markers: markers.slice(0, 20) };
});
