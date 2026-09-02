import { hold } from './lib2.mjs';
import { pos2 } from './lib3.mjs';
import { ensureGame } from './lib4.mjs';
import { rotate } from './seek.mjs';

// walk toward world (tx,tz); returns final pos
export async function goto(page, tx, tz, opts = {}) {
  const { run = false, maxIter = 40, tol = 2, log = true } = opts;
  let prev = await pos2(page);
  for (let i = 0; i < maxIter; i++) {
    if (!prev || prev.__err) { await ensureGame(page); prev = await pos2(page); continue; }
    const dist = Math.hypot(tx - prev.x, tz - prev.z);
    if (dist < tol) return prev;
    await hold(page, run && dist > 8 ? ['Shift','w'] : ['w'], 700);
    let cur = await pos2(page);
    if (!cur || cur.__err) { await ensureGame(page); prev = await pos2(page); continue; }
    const mvx = cur.x - prev.x, mvz = cur.z - prev.z;
    const moved = Math.hypot(mvx, mvz);
    const want = Math.atan2(tx - cur.x, tz - cur.z);
    if (moved > 0.3) {
      const head = Math.atan2(mvx, mvz);
      let err = want - head;
      while (err > Math.PI) err -= 2*Math.PI;
      while (err < -Math.PI) err += 2*Math.PI;
      if (log) console.log(i, cur.x, cur.z, 'dist', dist.toFixed(1), 'err', (err*180/Math.PI).toFixed(0));
      if (Math.abs(err) > 0.15) await rotate(page, Math.max(-320, Math.min(320, -err * 180)));
    } else {
      // stuck: sidestep
      if (log) console.log(i, cur.x, cur.z, 'STUCK, sidestep');
      await hold(page, [Math.random() < 0.5 ? 'a' : 'd'], 800);
      await rotate(page, Math.random() < 0.5 ? 150 : -150);
    }
    prev = cur;
  }
  return prev;
}
