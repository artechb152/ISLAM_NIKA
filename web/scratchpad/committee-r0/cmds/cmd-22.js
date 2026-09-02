return await page.evaluate(() => {
  const l = window.__ch1Live;
  const p = l.player;
  const me = { x: +p.x.toFixed(1), y: +p.y.toFixed(1), z: +p.z.toFixed(1) };
  let markerKeys = null, markerSample = null;
  try {
    markerKeys = Object.keys(l.markerEls);
    const first = l.markerEls[markerKeys[0]];
    markerSample = first && Object.keys(first);
  } catch (e) {}
  return { me, yaw: l.yaw, nearWho: l.nearWho, nearFind: l.nearFind, atTask: l.atTask, rawiPos: l.rawiPos && { x: l.rawiPos.x, z: l.rawiPos.z }, markerKeys, markerSample };
});
