import { open } from './lib-probe.mjs'
import fs from 'node:fs'
const tag = process.argv[2] || 'before'
const regions = process.argv[3] ? [process.argv[3]] : ['yemen-heights','night-camp','border-post','narrow-pass','loading-road','yathrib','monastery','mecca','exit']
const dir = `scratchpad/shots/${tag}`
fs.mkdirSync(dir, { recursive: true })
for (const r of regions) {
  try {
    const { browser, page, errors } = await open(r)
    await page.waitForTimeout(2500)
    await page.screenshot({ path: `${dir}/${r}.png` })
    // orbit 180deg for a second angle
    const box = await page.$('canvas')
    if (box) {
      const b = await box.boundingBox()
      await page.mouse.move(b.x + b.width/2, b.y + b.height/2)
      await page.mouse.down()
      await page.mouse.move(b.x + b.width/2 + 380, b.y + b.height/2, { steps: 12 })
      await page.mouse.up()
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${dir}/${r}-b.png` })
    }
    console.log(r, 'ok', errors.length ? errors : '')
    await browser.close()
  } catch (e) { console.log(r, 'FAIL', String(e).slice(0,140)) }
}
