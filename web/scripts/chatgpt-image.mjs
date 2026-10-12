/* Generate an image in ChatGPT (chatgpt.com) through Playwright — the user's choice
   instead of Higgsfield (12.10.2026). Shared by the chapter sessions; ONE owner edits it
   (the chapter 8 session), the others only run it.

   It drives the user's own ChatGPT account from a SEPARATE browser profile in
   ISLAM_NIKA/.chatgpt-profile/ (git-ignored). It never reads the user's Chrome profile.

   MEASURED 12.10: chatgpt.com answers HEADLESS Chrome with Cloudflare's „Just a moment…"
   page on every profile, with or without --disable-blink-features. A real window placed
   off-screen passes. So `gen` runs headed at -3000,-3000: nothing appears on the screen.

   1 · once, to sign in — a visible window with a maroon strip; it closes ITSELF the moment
       the sign-in is real (no „Log in" button, a composer present), then re-opens off-screen
       to prove the session persisted:
         node web/scripts/chatgpt-image.mjs login
   2 · generate:
         node web/scripts/chatgpt-image.mjs gen "<prompt>" out.png [ref1.png ref2.png …]
   3 · check, no window:
         node web/scripts/chatgpt-image.mjs status

   Exit codes / last line: `saved <out>` 0 · NOT_SIGNED_IN 2 · NO_IMAGE 3 · BUSY 4.
   A lock file stops two sessions from opening the profile at once (Chrome's SingletonLock
   would otherwise fail one of them). */
import { chromium } from 'playwright-core'
import { mkdir, writeFile, open, unlink, stat } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const PROFILE = path.join(ROOT, '.chatgpt-profile')
const LOCK = path.join(ROOT, '.chatgpt-profile.lock')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const [mode, prompt, out, ...refs] = process.argv.slice(2)
const OFFSCREEN = ['--window-position=-3000,-3000', '--window-size=1280,900']

await mkdir(PROFILE, { recursive: true })

/* ---- lock: one Chrome on the profile at a time; a lock older than 15 min is stale ---- */
async function lock() {
  /* up to 30 min: a generation takes up to 7, and several sessions queue on this */
  for (let i = 0; i < 360; i++) {
    try { const h = await open(LOCK, 'wx'); await h.write(String(process.pid)); await h.close(); return true }
    catch {
      try { const s = await stat(LOCK); if (Date.now() - s.mtimeMs > 15 * 60 * 1000) { await unlink(LOCK); continue } } catch {}
      await new Promise((r) => setTimeout(r, 5000))
    }
  }
  return false
}
const unlock = () => unlink(LOCK).catch(() => {})
if (!(await lock())) { console.log('BUSY'); process.exit(4) }

const launch = (visible) => chromium.launchPersistentContext(PROFILE, {
  executablePath: CHROME, headless: false, viewport: { width: 1280, height: 900 },
  args: ['--disable-blink-features=AutomationControlled', ...(visible ? [] : OFFSCREEN)],
})

/* signed in = a composer and no „Log in" button anywhere */
const state = (page) => page.evaluate(() => ({
  composer: !!document.querySelector('#prompt-textarea, div[contenteditable="true"], textarea'),
  login: [...document.querySelectorAll('button, a')].some((b) => /^(log in|התחברות|התחבר)$/i.test(b.textContent.trim())),
  challenge: /just a moment/i.test(document.title),
})).catch(() => ({ composer: false, login: true, challenge: false }))
const signedIn = async (page) => { const s = await state(page); return s.composer && !s.login }

async function openChat(visible) {
  const ctx = await launch(visible)
  const page = ctx.pages()[0] ?? (await ctx.newPage())
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' })
  for (let i = 0; i < 20; i++) { const s = await state(page); if (s.composer && !s.challenge) break; await page.waitForTimeout(1000) }
  await page.waitForTimeout(2000)
  return { ctx, page }
}

try {
  if (mode === 'status') {
    const { ctx, page } = await openChat(false)
    const ok = await signedIn(page); await ctx.close()
    console.log(ok ? 'SIGNED_IN' : 'NOT_SIGNED_IN'); await unlock(); process.exit(ok ? 0 : 2)
  }

  if (mode === 'login') {
    const { ctx, page } = await openChat(true)
    const mark = () => page.evaluate(() => {
      if (document.getElementById('islam-nika-mark')) return
      const d = document.createElement('div'); d.id = 'islam-nika-mark'
      d.textContent = 'ISLAM_NIKA · להתחבר ל-ChatGPT בחלון הזה. כשההתחברות תושלם החלון ייסגר לבד.'
      d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#571820;color:#f5ecd6;font:600 16px system-ui;text-align:center;padding:10px;direction:rtl;pointer-events:none'
      document.body.appendChild(d)
    }).catch(() => {})
    page.on('load', mark); await mark()
    console.log('Sign in to ChatGPT in the window with the maroon strip; it closes by itself.')
    const until = Date.now() + 20 * 60 * 1000
    let ok = false
    while (Date.now() < until) {
      const pages = ctx.pages(); if (!pages.length) break
      for (const pg of pages) if (/chatgpt\.com/.test(pg.url()) && (await signedIn(pg))) ok = true
      if (ok) break
      await new Promise((r) => setTimeout(r, 3000))
    }
    await new Promise((r) => setTimeout(r, 4000)) /* let the session cookies settle */
    await ctx.close().catch(() => {})
    if (!ok) { console.log('NOT_SIGNED_IN'); await unlock(); process.exit(2) }
    /* prove it persisted */
    const again = await openChat(false); const kept = await signedIn(again.page); await again.ctx.close()
    console.log(kept ? 'SIGNED_IN (persisted)' : 'NOT_SIGNED_IN (did not persist)'); await unlock(); process.exit(kept ? 0 : 2)
  }

  if (mode !== 'gen' || !prompt || !out) { console.error('usage: gen "<prompt>" out.png [refs…] | login | status'); await unlock(); process.exit(1) }

  const { ctx, page } = await openChat(false)
  if (!(await signedIn(page))) { console.log('NOT_SIGNED_IN'); await ctx.close(); await unlock(); process.exit(2) }
  const box = page.locator('#prompt-textarea, div[contenteditable="true"]').first()
  if (refs.length) {
    /* NOT the first file input: that is ChatGPT's camera input (capture="environment",
       single file). Take the multi-file upload input; if there is none, send the refs one
       at a time through any non-camera input (bug found by the chapter 7 session, 12.10). */
    const files = refs.map((r) => path.resolve(r))
    const multi = page.locator('input[type="file"][multiple]:not([capture])').first()
    if (await multi.count()) await multi.setInputFiles(files)
    else for (const f of files) await page.locator('input[type="file"]:not([capture])').first().setInputFiles(f)
    await page.waitForTimeout(4000 + 2000 * files.length)
  }
  await box.click()
  await page.keyboard.insertText(prompt)
  await page.waitForTimeout(600)
  await page.keyboard.press('Enter')

  /* the generated image (measured 12.10): an <img alt="Generated image N"> with a blob:
     src, NOT inside the [data-message-author-role="assistant"] node. Done when a new one
     exists at full size and the stop button is gone. */
  const t0 = Date.now()
  let src = null
  while (Date.now() - t0 < 7 * 60 * 1000) {
    await page.waitForTimeout(5000)
    src = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('main img')].filter((i) => /^Generated image/i.test(i.alt) && i.complete && i.naturalWidth >= 512)
      const working = !!document.querySelector('[data-testid="stop-button"]')
      return imgs.length && !working ? imgs[imgs.length - 1].src : null
    })
    if (src) break
  }
  if (!src) {
    const reply = await page.evaluate(() => [...document.querySelectorAll('[data-message-author-role="assistant"]')].pop()?.innerText?.slice(0, 240) ?? '').catch(() => '')
    await page.screenshot({ path: out + '.debug.png' }).catch(() => {})
    console.log('NO_IMAGE' + (reply ? ' — ' + reply.replace(/\s+/g, ' ') : ''))
    await ctx.close(); await unlock(); process.exit(3)
  }
  /* a blob: URL lives only in the page — read it there */
  const b64 = await page.evaluate(async (u) => {
    const b = await (await fetch(u)).blob()
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(b) })
  }, src)
  await writeFile(out, Buffer.from(b64, 'base64'))
  await ctx.close()
  console.log('saved', out)
} finally {
  await unlock()
}
