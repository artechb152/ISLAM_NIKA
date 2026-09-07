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
import { existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

if (process.env.GH_PAGES !== 'true') {
  console.log('[fix-basepath] GH_PAGES!=true — skipping (local build unchanged).')
  process.exit(0)
}

const BASE = '/ISLAM_NIKA'

/* WHERE THE EXPORT ACTUALLY LANDED, not where it usually does. `out` was hardcoded here, and
   a build run as `NEXT_DIST_DIR=.next-pages npm run build` — which is how a Pages build is run
   while the dev server is up, so that it does not rewrite the directory the dev server serves
   from — puts the export in .next-pages/ instead. The script then walked a STALE `out` from an
   earlier build, found everything in it already prefixed, and printed „prefixed in 0" as if all
   were well. The deploy that followed shipped every hand-written /assets/ URL unprefixed: they
   request the domain root instead of the project subpath and 404. That is how chapter 5 went
   live with nine broken images. Resolve the directory, and never assume it. */
const OUT = [process.env.PAGES_OUT_DIR, process.env.NEXT_DIST_DIR, 'out']
  .filter(Boolean)
  .map((d) => join(process.cwd(), d))
  .find((p) => existsSync(join(p, 'index.html')))

if (!OUT) {
  console.error('[fix-basepath] no static export found (looked for index.html in PAGES_OUT_DIR, NEXT_DIST_DIR, out/).')
  process.exit(1)
}
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
console.log(`[fix-basepath] ${OUT}: scanned ${scanned} text files; prefixed /assets/ -> ${BASE}/assets/ in ${changed}.`)

/* THE GATE. „changed > 0" is the wrong test — the pass is idempotent, so a second run over the
   same export legitimately changes nothing. The invariant that matters is that NOTHING is left
   pointing at the domain root. Re-scan and fail the build on the first survivor; a Pages deploy
   must not be able to leave here with an asset URL that 404s. */
const leftovers = []
function audit(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { audit(p); continue }
    const dot = name.lastIndexOf('.')
    if (!EXT.has(dot >= 0 ? name.slice(dot) : '')) continue
    if (RE.test(readFileSync(p, 'utf8'))) leftovers.push(p.slice(OUT.length + 1))
    RE.lastIndex = 0
  }
}
audit(OUT)
if (leftovers.length) {
  console.error(`[fix-basepath] ${leftovers.length} file(s) still reference /assets/ without the basePath:`)
  for (const f of leftovers.slice(0, 10)) console.error('  · ' + f)
  process.exit(1)
}
console.log('[fix-basepath] ✅ no unprefixed /assets/ left in the export.')
