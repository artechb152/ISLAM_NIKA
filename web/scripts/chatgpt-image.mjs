/* Make an image through ChatGPT, driven by Playwright — instead of Higgsfield (the user, 12.10.2026).

   It does what a person does in chatgpt.com: a new chat, an optional reference picture
   attached, the prompt typed and sent, then it waits for the generated image and saves it.

   THE LOGIN IS THE USER'S, ONCE. The script keeps its own Chrome profile in
   ~/.islam-nika-chatgpt (outside the repo, outside the user's own Chrome). The first run is

     node scripts/chatgpt-image.mjs --login

   which opens ONE visible window on chatgpt.com; the user signs in and closes it.

   NOT HEADLESS. chatgpt.com answers a headless browser with its „Just a moment…" challenge
   and never shows the chat (tested 12.10). Every run after the login therefore opens a real
   window, but positioned far off the edge of the screen, so nothing appears on the user's
   desktop (her standing preference: no visible browser windows):

     node scripts/chatgpt-image.mjs --prompt-file p.txt --ref a.png [--ref b.png] --out out.png

   Flags: --prompt "…" or --prompt-file f · --ref (repeatable) · --out (required)
          --show    put the window on screen (to look at a problem)
          --timeout minutes to wait for the image (default 6) */
import { chromium } from 'playwright-core'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'

const argv = process.argv.slice(2)
const flag = (k) => argv.includes(k)
const val = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined }
const all = (k) => argv.flatMap((a, i) => (a === k ? [argv[i + 1]] : []))
const PROFILE = resolve(homedir(), '.islam-nika-chatgpt')
const URL = 'https://chatgpt.com/'

if (flag('--login')) {
  await mkdir(PROFILE, { recursive: true })
  const ctx = await chromium.launchPersistentContext(PROFILE, { channel: 'chrome', headless: false, viewport: null, args: ['--window-size=1100,860'] })
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.goto(URL)
  console.log('התחברו ל-ChatGPT בחלון שנפתח, ואז סגרו אותו. ההתחברות נשמרת לפעמים הבאות.')
  await new Promise((r) => ctx.on('close', r))
  process.exit(0)
}

const OUT = val('--out')
let PROMPT = val('--prompt')
if (val('--prompt-file')) PROMPT = (await readFile(val('--prompt-file'), 'utf8')).trim()
if (!OUT || !PROMPT) { console.error('need --out and --prompt/--prompt-file (or --login first)'); process.exit(2) }
const REFS = all('--ref').map((p) => resolve(p))
const TIMEOUT = Number(val('--timeout') ?? 6) * 60_000

const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'chrome',
  headless: false,
  viewport: { width: 1280, height: 900 },
  args: flag('--show') ? [] : ['--window-position=-3000,-3000', '--window-size=1280,900'],
  acceptDownloads: true,
})
const page = ctx.pages()[0] ?? (await ctx.newPage())
const fail = async (msg) => {
  await page.screenshot({ path: resolve(dirname(OUT), 'chatgpt-error.png') }).catch(() => {})
  console.error('✗ ' + msg + ` (screenshot: ${resolve(dirname(OUT), 'chatgpt-error.png')})`)
  await ctx.close(); process.exit(1)
}

await page.goto(URL, { waitUntil: 'domcontentloaded' })
/* the challenge page usually clears itself within a few seconds in a real window */
for (let i = 0; i < 15 && /just a moment/i.test(await page.title()); i++) await page.waitForTimeout(2000)
const box = page.locator('#prompt-textarea')
try { await box.waitFor({ timeout: 45_000 }) } catch {
  const url = page.url(), title = await page.title()
  if (/log-?in|auth/i.test(url) || /log in|sign up/i.test(await page.locator('body').innerText().catch(() => ''))) await fail('not signed in — run with --login first')
  await fail(`the chat box did not appear (${title} · ${url}) — a challenge page that did not clear? retry with --show to look`)
}

/* the reference pictures, through the composer's own file input */
if (REFS.length) {
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles(REFS)
  /* wait until every upload has a thumbnail and no spinner is left */
  await page.waitForTimeout(2500)
  await page.waitForFunction(() => !document.querySelector('[role="progressbar"], .animate-spin'), null, { timeout: 120_000 }).catch(() => {})
}

/* how many images are on the page before we ask — the new one is the one after these */
const before = await page.locator('img[alt*="Generated"], img[alt*="נוצר"]').count()
await box.click()
await page.keyboard.insertText(PROMPT)
await page.waitForTimeout(400)
const send = page.locator('[data-testid="send-button"]')
if (await send.count()) await send.click(); else await page.keyboard.press('Enter')
console.log('· sent; waiting for the image…')

const started = Date.now()
let src = null
while (Date.now() - started < TIMEOUT) {
  await page.waitForTimeout(4000)
  const imgs = page.locator('img[alt*="Generated"], img[alt*="נוצר"]')
  const n = await imgs.count()
  const streaming = await page.locator('[data-testid="stop-button"]').count()
  if (n > before && !streaming) {
    /* the final image, fully loaded — the preview may be a blurred placeholder first */
    const last = imgs.nth(n - 1)
    const ok = await last.evaluate((im) => im.complete && im.naturalWidth > 600).catch(() => false)
    if (ok) { src = await last.getAttribute('src'); break }
  }
  /* a refusal or a question back instead of an image */
  if (!streaming && Date.now() - started > 90_000 && n === before) {
    const reply = await page.locator('[data-message-author-role="assistant"]').last().innerText().catch(() => '')
    if (reply) await fail('ChatGPT answered in text instead of an image:\n' + reply.slice(0, 600))
  }
}
if (!src) await fail(`no image after ${TIMEOUT / 60000} minutes`)

/* fetch it inside the page, so the signed-in session's cookies go with the request */
const b64 = await page.evaluate(async (u) => {
  const r = await fetch(u); const b = new Uint8Array(await r.arrayBuffer())
  let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}, src)
await mkdir(dirname(resolve(OUT)), { recursive: true })
await writeFile(OUT, Buffer.from(b64, 'base64'))
console.log(`✓ saved ${OUT} (${Math.round(Buffer.from(b64, 'base64').length / 1024)}KB) · chat: ${page.url()}`)
await ctx.close()
