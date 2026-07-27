/* Postbuild fix for the GitHub Pages project site (https://<user>.github.io/ISLAM_NIKA/).
 *
 * Next.js `basePath` prefixes its OWN output — the _next/ bundle and <Link>/router routes —
 * but it does NOT rewrite the app's hand-written absolute public-asset URLs. This app has many
 * of those: `/assets/...` in TSX (src/poster) and in CSS @font-face url()/background. Served
 * from the /ISLAM_NIKA/ subpath, each of those requests the domain root and 404s (that is what
 * makes the entrance screen — corridor image, logo, frames — disappear).
 *
 * So after `next build`, walk the static export and prefix every `/assets/` reference with the
 * basePath. Runs only when GH_PAGES=true; a normal local build is untouched. Idempotent: a
 * negative lookbehind skips paths that are already prefixed.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

if (process.env.GH_PAGES !== 'true') {
  console.log('[fix-basepath] GH_PAGES!=true — skipping (local build unchanged).')
  process.exit(0)
}

const BASE = '/ISLAM_NIKA'
const OUT = join(process.cwd(), 'out')
const EXT = new Set(['.html', '.css', '.js', '.txt', '.json'])
const RE = /(?<!ISLAM_NIKA)\/assets\//g

let scanned = 0
let changed = 0

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      walk(p)
      continue
    }
    const dot = name.lastIndexOf('.')
    if (!EXT.has(dot >= 0 ? name.slice(dot) : '')) continue
    scanned++
    const src = readFileSync(p, 'utf8')
    if (!src.includes('/assets/')) continue
    const out = src.replace(RE, `${BASE}/assets/`)
    if (out !== src) {
      writeFileSync(p, out)
      changed++
    }
  }
}

walk(OUT)
console.log(`[fix-basepath] scanned ${scanned} text files; prefixed /assets/ -> ${BASE}/assets/ in ${changed}.`)
