/* Chapter 9 — fetch the image of a ChatGPT conversation by its title (the shared
   web/scripts/chatgpt-image.mjs sometimes generates but misses the <img>; it is owned by
   the chapter 8 session, so this does not edit it). Same profile, same lock, off-screen.
   node concept/chapter9/tools/gpt-fetch.mjs "<conversation title>" out.png
   node concept/chapter9/tools/gpt-fetch.mjs --gen "<prompt>" out.png [ref.png]  (new chat) */
import { chromium } from '/Users/nikagreenbaum/Desktop/islam_nika/web/node_modules/playwright-core/index.mjs'
import { open, unlink, stat, writeFile } from 'node:fs/promises'
const ROOT = '/Users/nikagreenbaum/Desktop/ISLAM_NIKA', LOCK = ROOT + '/.chatgpt-profile.lock'
const argv = process.argv.slice(2)
const GEN = argv[0] === '--gen'
const [title, out, ref] = GEN ? argv.slice(1) : argv
let got = false
for (let i = 0; i < 360 && !got; i++) {
  try { const h = await open(LOCK, 'wx'); await h.write(String(process.pid)); await h.close(); got = true }
  catch { try { const s = await stat(LOCK); if (Date.now() - s.mtimeMs > 15 * 60 * 1000) { await unlink(LOCK); continue } } catch {} await new Promise((r) => setTimeout(r, 5000)) }
}
if (!got) { console.log('BUSY'); process.exit(4) }
try {
  const ctx = await chromium.launchPersistentContext(ROOT + '/.chatgpt-profile', { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: false, viewport: { width: 1280, height: 900 }, args: ['--disable-blink-features=AutomationControlled', '--window-position=-3000,-3000', '--window-size=1280,900'] })
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(6000)
  if (GEN) {
    if (ref) { await page.locator('input[type="file"]').first().setInputFiles(ref); await page.waitForTimeout(5000) }
    /* every image already on the page (the attachment preview!) is NOT the answer */
    await page.evaluate(() => { for (const i of document.querySelectorAll('img')) i.dataset.before = '1' })
    await page.locator('#prompt-textarea, div[contenteditable="true"]').first().click()
    await page.keyboard.insertText(title); await page.waitForTimeout(600); await page.keyboard.press('Enter')
    await page.waitForTimeout(8000)
    const t0 = Date.now()
    while (Date.now() - t0 < 7 * 60 * 1000) {
      await page.waitForTimeout(5000)
      const ready = await page.evaluate(() => !document.querySelector('[data-testid="stop-button"]') &&
        [...document.querySelectorAll('main img')].some((i) => /^Generated image/i.test(i.alt) && i.naturalWidth >= 512))
      if (ready) break
    }
    await page.waitForTimeout(3000)
  } else { await page.getByText(title, { exact: true }).first().click(); await page.waitForTimeout(8000) }
  if (process.env.DEBUG) console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('main img')].map((i) => ({ w: i.naturalWidth, h: i.naturalHeight, src: i.src.slice(0, 50), before: !!i.dataset.before, role: i.closest('[data-message-author-role]')?.dataset.messageAuthorRole ?? null, turn: i.closest('[data-testid^="conversation-turn"]')?.dataset.testid ?? null, alt: i.alt.slice(0, 30) }))), null, 1))
  const src = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('main img')].filter((i) => /^Generated image/i.test(i.alt) && i.naturalWidth >= 512)  /* ChatGPT labels its result „Generated image N"; the attachment is „User attachment" */
    imgs.sort((a, b) => b.naturalWidth * b.naturalHeight - a.naturalWidth * a.naturalHeight)
    return imgs[0]?.src ?? null
  })
  if (!src) { console.log('NO_IMAGE'); await page.screenshot({ path: out + '.debug.png' }) }
  else {
    /* ChatGPT now renders the result as a blob: URL — read it inside the page */
    const b64 = await page.evaluate(async (u) => {
      const blob = await (await fetch(u)).blob()
      return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(String(f.result).split(',')[1]); f.readAsDataURL(blob) })
    }, src)
    await writeFile(out, Buffer.from(b64, 'base64')); console.log('saved', out)
  }
  await ctx.close()
} finally { await unlink(LOCK).catch(() => {}) }
