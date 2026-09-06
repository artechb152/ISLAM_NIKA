import { open } from './lib-probe.mjs'
import { writeFileSync } from 'node:fs'
const REGIONS = ['yemen-heights','night-camp','border-post','narrow-pass','loading-road','yathrib','monastery','mecca','exit']
const out = []
for (const r of REGIONS) {
  let rec = { region: r }
  try {
    const { browser, page, errors } = await open(r, { w: 1600, h: 900 })
    await page.waitForTimeout(2500)
    rec = { ...rec, ...await page.evaluate(() => {
      const live = window.__ch1Live
      const txt = (s) => document.querySelector(s)?.innerText?.trim().replace(/\s+/g,' ').slice(0,80) ?? null
      const hud = [...document.querySelectorAll('.hud-panel')].map(e => (e.className+': '+e.innerText.replace(/\s+/g,' ')).slice(0,90))
      return {
        spawn: { x:+live.player.x.toFixed(2), z:+live.player.z.toFixed(2) },
        goal: txt('.hud-goal'), progress: txt('.hud-progress'),
        hudPanels: hud.length, hud,
        canvas: !!document.querySelector('canvas'),
        prompts: [...document.querySelectorAll('[class*="prompt"],[class*="hint"]')].map(e=>e.innerText.replace(/\s+/g,' ').slice(0,40)).filter(Boolean),
      }
    }) }
    // FPS sample
    rec.fps = await page.evaluate(() => new Promise(res => { let n=0; const t0=performance.now();
      const tick=()=>{n++; if(performance.now()-t0<2000) requestAnimationFrame(tick); else res(Math.round(n/((performance.now()-t0)/1000)))}; requestAnimationFrame(tick) }))
    await page.screenshot({ path: `scratchpad/round2/${r}.png` })
    rec.errors = errors
    await browser.close()
  } catch (e) { rec.FAILED = String(e).slice(0,160) }
  console.log(JSON.stringify(rec))
  out.push(rec)
}
writeFileSync('scratchpad/round2/survey.json', JSON.stringify(out,null,1))
