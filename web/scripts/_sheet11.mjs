/* contact sheet of a shot folder → sheet.png (6 per row) */
import { chromium } from 'playwright-core'
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const [dir, cols = '4', pat = ''] = process.argv.slice(2)
const files = readdirSync(dir).filter((f) => f.endsWith('.png') && f !== 'sheet.png' && f.includes(pat)).sort()
const html = `<body style="margin:0;background:#333;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px">` +
  files.map((f) => `<div style="position:relative"><img src="${f}" style="width:100%;display:block"><b style="position:absolute;top:4px;left:4px;background:#000;color:#fff;font:14px sans-serif;padding:2px 6px">${f}</b></div>`).join('') + '</body>'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const p = await b.newPage({ viewport: { width: 2000, height: 800 } })
const { writeFileSync } = await import('node:fs'); writeFileSync(dir + '/sheet.html', html); await p.goto(pathToFileURL(dir + '/sheet.html').href); await p.waitForTimeout(800)
await p.screenshot({ path: dir + '/sheet.png', fullPage: true }); await b.close()
