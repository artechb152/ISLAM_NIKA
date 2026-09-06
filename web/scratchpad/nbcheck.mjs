import { open } from './lib-probe.mjs'
const { browser, page, errors } = await open('yemen-heights', { w: 1400, h: 900 })
await page.keyboard.press('KeyJ'); await page.waitForTimeout(1200)
const r = await page.evaluate(() => {
  const s = document.querySelector('.nb-questions')
  return { open: !!document.querySelector('.nb-page'), qs: s ? [...s.querySelectorAll('li')].map(l=>l.innerText.trim()) : null,
           title: document.querySelector('.nb-questions-title')?.innerText }
})
console.log(JSON.stringify(r, null, 1))
await page.screenshot({ path: 'scratchpad/survey/notebook.png' })
console.log('errors:', errors.length ? errors : 'none')
await browser.close()
