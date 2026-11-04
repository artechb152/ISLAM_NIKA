/* פרק 12 · תוויות התיקים — חמש תוויות נייר, מסודרות ב-Kedem, מצולמות ל-PNG ומודבקות על
   התיקים בבלנדר. הכיתוב עורכי (כלל 24): כותרות המקור, המונח בערבית או השנים שבמקור.
   לא מחולל — אנחנו מסדרים את האותיות, ולכן כלל 40 לא נפגע.
   ריצה (מתוך web/): node ../concept/chapter12/blender/labels.mjs */
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { mkdir, readFile } from 'node:fs/promises'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(here, '../../../web/package.json'))
const { chromium } = require('playwright-core')
/* setContent רץ על about:blank, שלא קורא file:// — הגופן נכנס כ-data URI */
const font = async (f) => 'data:font/otf;base64,' + (await readFile(path.join(here, '../../../web/public/assets/fonts', f))).toString('base64')
const K900 = await font('kedem-black-aaa.otf'), K400 = await font('kedem-regular-aaa.otf')
const out = path.join(here, 'labels'); await mkdir(out, { recursive: true })

const LABELS = [
  ['01', 'ג׳האד', 'جهاد', 'ar'],
  ['02', 'שורשי האידאולוגיה', '1918–1989', 'ltr'],
  ['03', 'רבאט', 'رباط', 'ar'],
  ['04', 'אסתשהאד', 'استشهاد', 'ar'],
  ['05', 'אמנת חמאס', '1988', 'ltr'],
]

const css = `
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@700&display=block');
@font-face{font-family:Kedem;font-weight:900;src:url(${K900})}
@font-face{font-family:Kedem;font-weight:400;src:url(${K400})}
html,body{margin:0;background:transparent}
.l{box-sizing:border-box;width:1300px;height:520px;background:#e3cb98;position:relative;
  padding:46px 70px;display:flex;align-items:center;gap:56px;direction:rtl;
  box-shadow:inset 0 0 0 4px #e3cb98,inset 0 0 0 7px rgba(138,39,51,.55)}
.n{font:900 190px/1 Kedem;color:#a5322f;letter-spacing:-4px}
.t{display:flex;flex-direction:column;gap:18px;border-inline-start:3px solid rgba(138,39,51,.35);padding-inline-start:52px}
.h{font:900 112px/1.05 Kedem;color:#571820}
.a{font:700 112px/1.05 Amiri,serif;color:#6e4f12}
.y{font:400 84px/1 Kedem;color:#6e4f12;direction:ltr;text-align:right;font-variant-numeric:tabular-nums}`

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1300, height: 520 } })
for (const [n, h, term, kind] of LABELS) {
  const t = kind === 'ar' ? `<div class="a" lang="ar" dir="rtl">${term}</div>` : `<div class="y">${term}</div>`
  await page.setContent(`<style>${css}</style><div class="l"><div class="n">${n}</div><div class="t"><div class="h">${h}</div>${t}</div></div>`)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.l').screenshot({ path: path.join(out, `label${n}.png`), omitBackground: true })
}
await browser.close()
console.log('✓ 5 labels →', out)
