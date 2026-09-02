export async function pos2(page) {
  try {
    return await page.evaluate(() => {
      const l = window.__ch1Live;
      if (!l || !l.player) return null;
      return { x: +l.player.x.toFixed(1), z: +l.player.z.toFixed(1), yaw: l.yaw ? +l.yaw.toFixed(2) : null,
               nearWho: l.nearWho || null, nearFind: l.nearFind || null, atTask: l.atTask || null };
    });
  } catch (e) { return { __err: String(e).slice(0,150) }; }
}
