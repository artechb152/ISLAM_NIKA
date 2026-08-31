/* The two browser gates, made runnable with one command.
 *
 * `check-yaw.mjs` and `check-notebook.mjs` are the gates that play the game —
 * the first asks whether the player walks where they are pointed, the second
 * plays all nine regions and asks whether the notebook fills. They stayed out
 * of `npm run verify` for a documented reason: they need a Chrome binary and a
 * server on :3000, and a gate that fails on machines missing either is a gate
 * that gets deleted. The static gates stay fast and dependency-free; this
 * wrapper is for when you want the full answer.
 *
 * It preflights instead of crashing: finds Chrome in the usual places (or
 * CHROME), reuses a server that is already up on BASE/:3000, and otherwise
 * starts `next dev` itself and tears it down after. Each missing piece is
 * named before anything runs.
 *
 *   npm run verify:live            the two browser gates
 *   npm run verify:all             the static chain, then this
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, '..')
const PORT = process.env.PORT || 3000
const BASE = process.env.BASE || `http://localhost:${PORT}`

/* ── Chrome ── */
const CHROME_CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)
const chrome = CHROME_CANDIDATES.find((p) => existsSync(p))
if (!chrome) {
  console.error('verify:live needs a Chromium browser and found none of:')
  for (const c of CHROME_CANDIDATES) console.error('  ' + c)
  console.error('point CHROME at one and run again.')
  process.exit(1)
}

/* ── a server ── */
const up = async () => {
  try {
    const r = await fetch(BASE + '/chapter1', { signal: AbortSignal.timeout(4000) })
    return r.ok
  } catch { return false }
}

let server = null
if (await up()) {
  console.log(`server already up on ${BASE} — using it`)
} else {
  console.log(`no server on ${BASE} — starting next dev`)
  server = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    cwd: WEB,
    stdio: 'ignore',
    shell: process.platform === 'win32',
    detached: false,
  })
  const deadline = Date.now() + 120_000
  let ready = false
  while (Date.now() < deadline) {
    if (await up()) { ready = true; break }
    await new Promise((r) => setTimeout(r, 2000))
  }
  if (!ready) {
    console.error('the dev server did not answer on ' + BASE + ' within two minutes')
    server.kill()
    process.exit(1)
  }
  console.log('server is up')
}

/* ── the gates, in the order of cheap-first ── */
const run = (script) => new Promise((resolve) => {
  console.log(`\n━━ ${script} ━━\n`)
  const p = spawn(process.execPath, [join(HERE, script)], {
    cwd: WEB,
    stdio: 'inherit',
    env: { ...process.env, CHROME: chrome, PORT: String(PORT) },
  })
  p.on('close', (code) => resolve(code ?? 1))
})

let failed = 0
for (const gate of ['check-yaw.mjs', 'check-notebook.mjs']) {
  if (await run(gate)) { failed++; break /* the second gate's answer means nothing on a broken first */ }
}

if (server) server.kill()
process.exit(failed ? 1 : 0)
