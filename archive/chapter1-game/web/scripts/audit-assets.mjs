/* What is in public/assets that nothing asks for?
 *
 * The chapter loads on a phone over a hotel connection, and the asset folder
 * has grown to a quarter of a gigabyte across three chapters, a concept folder,
 * two backup folders and a `_src`. The handoff has carried "compress the
 * assets" as an open item for weeks without anyone first asking the cheaper
 * question: how much of this is shipped at all.
 *
 * Deleting an asset is irreversible in the way that matters — the .blend
 * sources are gitignored — so this only reports. Nothing here removes a file.
 *
 * A file counts as referenced if any source file names it:
 *   · by path or filename          `/assets/chapter1/models/palm.glb`, 'palm.glb'
 *   · by bare model name           layout props are `{ "model": "palm" }`
 *   · by a frame-sequence template `entrance-frames/f${String(i)}.jpg`
 * The last is why the numbered sequences are folded into one entry before the
 * search: asking whether `f0042.jpg` appears in the source would condemn all
 * sixty-one of them, and they are all on screen.
 *
 *   node scripts/audit-assets.mjs [--all]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, extname, basename } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, '..')
const ASSETS = join(WEB, 'public', 'assets')
const SHOW_ALL = process.argv.includes('--all')

const MB = (b) => (b / 1024 / 1024).toFixed(2)

/** every file under a directory, recursively */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

/* ── the haystack ──────────────────────────────────────────────────────────
   Everything that could name an asset: components, data, styles, the layout
   JSONs, and the scripts — a model referenced only by a build script is still
   referenced. node_modules and the build output are excluded; .next in
   particular contains compiled copies of every string in src and would make
   the search always succeed. */
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.css', '.md', '.html', '.py', '.vtt'])
const slurp = (dirs) => {
  let s = ''
  for (const d of dirs) {
    let files
    try { files = walk(join(WEB, d)) } catch { continue }
    for (const f of files) {
      if (!SOURCE_EXT.has(extname(f))) continue
      s += readFileSync(f, 'utf8') + '\n'
    }
  }
  return s
}

/* Two haystacks, because "referenced" turns out to be two different questions.
   `make-player.py` writes traveler-walk.glb, traveler-stride.glb and
   traveler-passing.glb into public/ and the game loads none of them — 15 MB of
   Blender output that every visitor downloads the folder listing of and no
   browser ever requests. A single search cannot see that: the filenames are
   right there in the script that made them. */
const runtime = slurp(['src', 'content'])
const tooling = slurp(['scripts'])
const haystack = runtime + tooling

/* ── the needles ───────────────────────────────────────────────────────────
   Numbered frame sequences are generated names — `f0001.jpg` … `f0061.jpg` are
   built in a loop and never written out one by one. Collapse each run to a
   single stem and judge the whole sequence on that. */
const files = walk(ASSETS).map((p) => ({
  path: p,
  rel: relative(join(WEB, 'public'), p).replace(/\\/g, '/'),
  size: statSync(p).size,
}))

const SEQ = /^(.*?)(\d{2,})(\.[a-z0-9]+)$/i
const groups = new Map()
for (const f of files) {
  const m = SEQ.exec(basename(f.path))
  const key = m ? join(dirname(f.path), m[1] + '#' + m[3]) : f.path
  const g = groups.get(key) ?? { key, files: [], size: 0, seq: !!m, stem: m ? m[1] : null }
  g.files.push(f)
  g.size += f.size
  groups.set(key, g)
}

/* Half the asset paths in this codebase are assembled at runtime:
   `/assets/chapters/ch${number}.jpg`, `/assets/anim-video/${encounter.film}`,
   `/assets/chapter1/tex/${mood.sky}`. Searching for the finished filename finds
   none of them, and a report that calls forty live chapter covers dead is a
   report nobody will run twice.

   So collect the literal head of every interpolated asset string first. A file
   whose path begins with one of those heads is reachable through that template,
   and this cannot say which of the candidates the template actually produces —
   which is the honest answer, and why the summary says "check before you
   delete". */
const TEMPLATE_HEAD = /\/assets\/[^`'"$]*(?=\$\{)/g
const templateHeads = [...new Set(haystack.match(TEMPLATE_HEAD) ?? [])]
  /* a bare `/assets/` head interpolates the whole path and would absolve
     everything — it says nothing, so it does not get a vote */
  .filter((h) => h.length > '/assets/'.length + 2)

/* This tree already has a convention for "kept in case we need it back":
   a leading underscore — `_backup-ch6-story`, `_lowpoly-backup`, `_src`,
   `_backup-content`. Nothing under one of those is served to a player, and the
   searches above cannot tell: a backup keeps the original's filename, so the
   live file's own reference absolves its copy. They are counted apart. */
const isSetAside = (rel) => rel.split('/').some((seg) => seg.startsWith('_'))

/** Does anything in `hay` name this group? Pass the runtime sources to ask the
    narrower question: does the game itself ever load this file. */
function referenced(g, hay = haystack) {
  const probe = (s) => s && hay.includes(s)
  const viaTemplate = (rel) => templateHeads.some((h) => ('/' + rel).startsWith(h))

  if (g.seq) {
    /* the loop that builds the names has to mention the stem or the folder */
    const folder = relative(join(WEB, 'public', 'assets'), dirname(g.key)).replace(/\\/g, '/')
    return probe(g.stem) || probe(folder + '/') || viaTemplate(g.files[0].rel)
  }
  const f = g.files[0]
  const name = basename(f.path)
  /* full path, bare filename, and — for models — the stem alone, because the
     layout files spell a prop as { "model": "palm" } with no extension */
  if (probe('/' + f.rel) || probe(name)) return true
  const stem = name.replace(/\.[^.]+$/, '')
  if (extname(name) === '.glb') {
    /* A model is named exactly, by stem or by full path — never assembled from
       a variable. Letting `/assets/chapter1/models/${...}` vouch for the folder
       would absolve all 78 MB of it, backups and Blender sources included. */
    return probe(`"${stem}"`) || probe(`'${stem}'`)
  }
  return viaTemplate(f.rel)
}

const dead = []
const aside = []
const toolingOnly = []
let totalSize = 0
let deadSize = 0
let asideSize = 0
let toolingSize = 0
for (const g of groups.values()) {
  totalSize += g.size
  const rel = relative(ASSETS, g.files[0].path).replace(/\\/g, '/')
  if (isSetAside(rel)) { aside.push(g); asideSize += g.size; continue }
  if (!referenced(g)) { dead.push(g); deadSize += g.size; continue }
  if (!referenced(g, runtime)) { toolingOnly.push(g); toolingSize += g.size }
}

const label = (g) => (g.seq
  ? `${relative(ASSETS, dirname(g.key)).replace(/\\/g, '/')}/${g.stem}*  (${g.files.length} files)`
  : relative(ASSETS, g.files[0].path).replace(/\\/g, '/'))

dead.sort((a, b) => b.size - a.size)
aside.sort((a, b) => b.size - a.size)
toolingOnly.sort((a, b) => b.size - a.size)

console.log('\npublic/assets — what nothing in the source asks for\n')
if (!dead.length) console.log('  every asset is referenced.\n')
else for (const g of dead) console.log(`  ${MB(g.size).padStart(8)} MB   ${label(g)}`)

if (toolingOnly.length) {
  console.log('\n  written by a script in scripts/, never loaded by the game:\n')
  for (const g of toolingOnly) console.log(`  ${MB(g.size).padStart(8)} MB   ${label(g)}`)
}

if (aside.length) {
  console.log('\n  kept aside (a path segment starts with _) — shipped, never served:\n')
  /* one line per folder: thirty backup files listed one by one is a wall, and
     the decision is taken per folder anyway */
  const byFolder = new Map()
  for (const g of aside) {
    const seg = label(g).split('/').filter((s) => s.startsWith('_'))[0]
    const folder = label(g).slice(0, label(g).indexOf(seg) + seg.length)
    const e = byFolder.get(folder) ?? { size: 0, n: 0 }
    e.size += g.size
    e.n += g.files.length
    byFolder.set(folder, e)
  }
  for (const [folder, e] of [...byFolder].sort((a, b) => b[1].size - a[1].size))
    console.log(`  ${MB(e.size).padStart(8)} MB   ${folder}/  (${e.n} files)`)
}

/* Identical bytes under two names is the other half of the same waste, and the
   grep above cannot see it: both names are referenced, so both files ship. */
const byHash = new Map()
for (const f of files) {
  if (f.size < 1024 * 512) continue
  const key = f.size + ':' + readFileSync(f.path).subarray(0, 4096).toString('base64')
  const list = byHash.get(key) ?? []
  list.push(f)
  byHash.set(key, list)
}
const dupes = [...byHash.values()].filter((l) => l.length > 1)
let dupeSize = 0
if (dupes.length) {
  console.log('\n  the same bytes under more than one name:\n')
  for (const l of dupes) {
    dupeSize += l[0].size * (l.length - 1)
    console.log(`  ${MB(l[0].size).padStart(8)} MB × ${l.length}   ${l.map((f) => relative(ASSETS, f.path).replace(/\\/g, '/')).join('  =  ')}`)
  }
}

console.log(`\n  total          ${MB(totalSize).padStart(7)} MB`)
console.log(`  unreferenced   ${MB(deadSize).padStart(7)} MB  (${((deadSize / totalSize) * 100).toFixed(0)}%)`)
if (toolingSize) console.log(`  tooling only   ${MB(toolingSize).padStart(7)} MB  (${((toolingSize / totalSize) * 100).toFixed(0)}%)`)
if (asideSize) console.log(`  kept aside     ${MB(asideSize).padStart(7)} MB  (${((asideSize / totalSize) * 100).toFixed(0)}%)`)
if (dupeSize) console.log(`  duplicated     ${MB(dupeSize).padStart(7)} MB`)
console.log(`\n  This report does not delete anything. Check a file is truly unused before`)
console.log(`  removing it: a name built at runtime from parts will not be found here.\n`)

if (SHOW_ALL) {
  console.log('  everything, largest first:\n')
  for (const g of [...groups.values()].sort((a, b) => b.size - a.size).slice(0, 40)) {
    const label = g.seq
      ? `${relative(ASSETS, dirname(g.key)).replace(/\\/g, '/')}/${g.stem}*`
      : relative(ASSETS, g.files[0].path).replace(/\\/g, '/')
    console.log(`  ${MB(g.size).padStart(8)} MB   ${referenced(g) ? ' ' : '×'} ${label}`)
  }
  console.log('')
}
