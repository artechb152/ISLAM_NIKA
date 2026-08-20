/* Drive Mixamo via its REST API: find character, search product, export, download.
   Usage: node mixamo-api.mjs "<search>" <out.fbx> <withSkin|noSkin> [inPlace] */
import { readFile, writeFile } from 'node:fs/promises'

const [query, outName, skinMode, inPlace] = process.argv.slice(2)
const token = (await readFile('mixamo-token.txt', 'utf8')).trim()
const H = { Authorization: `Bearer ${token}`, 'X-Api-Key': 'mixamo2', 'Content-Type': 'application/json' }
const api = async (path, opts = {}) => {
  const r = await fetch('https://www.mixamo.com/api/v1' + path, { headers: H, ...opts })
  if (!r.ok) throw new Error(path + ' -> ' + r.status + ' ' + (await r.text()).slice(0, 200))
  return r.json()
}

// active character
const char = await api('/characters/primary')
const charId = char.primary_character_id ?? char.id
console.log('character:', charId, char.primary_character_name ?? '')

// search animation
const res = await api(`/products?page=1&limit=24&order=&type=Motion&query=${encodeURIComponent(query)}`)
const hit = res.results.find((x) => x.description || x.name) && res.results.find((x) => x.name.toLowerCase() === query.toLowerCase()) || res.results[0]
console.log('product:', hit.id, '|', hit.name)

// product details (gms_hash template)
const prod = await api(`/products/${hit.id}?similar=0&character_id=${charId}`)
const gms = prod.details.gms_hash
// build export gms_hash: params -> comma-joined default values; inplace flag if supported
const params = (gms.params ?? []).map(([name, v]) => (/in ?place/i.test(name) && inPlace === 'inPlace' ? 1 : v)).join(',')
const exportHash = { ...gms, params }

const body = {
  character_id: charId,
  gms_hash: [exportHash],
  preferences: {
    format: 'fbx7_2019',
    skin: skinMode === 'withSkin' ? 'true' : 'false',
    fps: '30',
    reducekf: '0',
  },
  product_name: hit.name,
  type: 'Motion',
}
await api('/animations/export', { method: 'POST', body: JSON.stringify(body) })
console.log('export requested, polling...')

let url = null
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 3000))
  const mon = await fetch(`https://www.mixamo.com/api/v1/characters/${charId}/monitor`, { headers: H })
  if (mon.status === 404) { process.stdout.write('?'); continue }
  const j = await mon.json()
  if (j.status === 'completed') { url = j.job_result; break }
  if (j.status === 'failed') throw new Error('export failed: ' + JSON.stringify(j).slice(0, 200))
  process.stdout.write('.')
}
if (!url) throw new Error('timeout')
const file = await fetch(url)
const buf = Buffer.from(await file.arrayBuffer())
const out = 'C:/Users/nikag/Downloads/ISLAM_NIKA/concept/chapter1/rawi-3d/mixamo/' + outName
await writeFile(out, buf)
console.log('\nsaved', outName, Math.round(buf.length / 1024), 'KB')
