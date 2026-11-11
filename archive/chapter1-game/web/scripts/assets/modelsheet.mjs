/* Stage a throwaway page that renders one model, alone, on neutral grey.
 *
 * Half the faults in this chapter's assets were invisible in the file and
 * obvious the moment you looked at the model by itself: a "dry stone wall" that
 * was a heap of chips, houses with no roof, a "pergola" that was a patio table.
 * A contact sheet of all of them takes two minutes to read and would have saved
 * weeks.
 *
 * The page has to be served from public/ so the GLBs resolve on the same origin,
 * but it ships a megabyte of three.js and has no business in a build — so it is
 * staged on demand and removed again.
 *
 *   node scripts/assets/modelsheet.mjs        # stage it
 *   node scripts/assets/modelsheet.mjs --off  # remove it
 *
 * Then restart `next start` (it caches the public listing at boot) and point a
 * browser or scratchpad/verify/sheet.mjs at
 * http://localhost:3100/modelsheet/index.html?model=NAME&h=2
 */
import { copyFileSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'

const OUT = 'public/modelsheet'
const THREE = 'node_modules/three'

if (process.argv.includes('--off')) {
  rmSync(OUT, { recursive: true, force: true })
  console.log('model sheet removed')
  process.exit(0)
}

mkdirSync(`${OUT}/jsm/loaders`, { recursive: true })
mkdirSync(`${OUT}/jsm/utils`, { recursive: true })
for (const [from, to] of [
  [`${THREE}/build/three.module.js`, `${OUT}/three.module.js`],
  [`${THREE}/build/three.core.js`, `${OUT}/three.core.js`],
  [`${THREE}/examples/jsm/loaders/GLTFLoader.js`, `${OUT}/jsm/loaders/GLTFLoader.js`],
  [`${THREE}/examples/jsm/utils/BufferGeometryUtils.js`, `${OUT}/jsm/utils/BufferGeometryUtils.js`],
  [`${THREE}/examples/jsm/utils/SkeletonUtils.js`, `${OUT}/jsm/utils/SkeletonUtils.js`],
]) {
  if (!existsSync(from)) { console.error('missing ' + from); process.exit(1) }
  copyFileSync(from, to)
}

writeFileSync(
  `${OUT}/index.html`,
  `<!doctype html>
<meta charset="utf-8">
<title>model sheet</title>
<style>html,body{margin:0;background:#8a8f96}canvas{display:block}</style>
<script type="importmap">
{"imports":{"three":"/modelsheet/three.module.js","three/addons/":"/modelsheet/jsm/"}}
</script>
<script type="module">
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const q = new URLSearchParams(location.search)
const name = q.get('model')
const H = +(q.get('h') ?? 2)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(420, 420)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.1
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#8a8f96')
/* A plain studio: one key, one fill, one ground. Nothing that could flatter a
   fault, and nothing that could hide one the way the game's own grade might. */
const key = new THREE.DirectionalLight('#fff6e8', 2.6)
key.position.set(4, 6, 5); key.castShadow = true
key.shadow.mapSize.set(1024, 1024)
scene.add(key, new THREE.HemisphereLight('#cfe0f5', '#6b6255', 1.1))
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: '#9aa0a7', roughness: 1 }))
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true
scene.add(floor)

const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 400)

new GLTFLoader().load(\`/assets/chapter1/models/\${name}.glb\`, (g) => {
  const o = g.scene
  const size0 = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3())
  o.scale.setScalar(size0.y > 0 ? H / size0.y : 1)
  o.position.y -= new THREE.Box3().setFromObject(o).min.y
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
  scene.add(o)
  const b = new THREE.Box3().setFromObject(o)
  const c = b.getCenter(new THREE.Vector3())
  const d = (b.getSize(new THREE.Vector3()).length() / 2) / Math.tan((38 * Math.PI) / 360) * 1.25
  camera.position.set(c.x + d * 0.62, c.y + d * 0.42, c.z + d * 0.72)
  camera.lookAt(c)
  renderer.render(scene, camera)
  const dims = b.getSize(new THREE.Vector3())
  window.__sheet = { ok: true, size: [+dims.x.toFixed(2), +dims.y.toFixed(2), +dims.z.toFixed(2)] }
}, undefined, (e) => { window.__sheet = { ok: false, error: String(e) } })
</script>
`,
)
console.log(`model sheet staged at ${OUT}/index.html — restart next start, then remove it with --off`)
