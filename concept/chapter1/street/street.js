/* ══════════════════════════════════════════════════════════════
   POC טכני — פינת רחוב במכה, בזמן אמת בדפדפן.

   השאלה היחידה שהקובץ הזה עונה עליה: כמה קרוב דפדפן מגיע
   לסרטון הקונספט. ולכן הכל כאן משרת מראה, לא מכניקה.

   שלוש החלטות שנושאות את המראה:
   1. גיאומטריה = תיבות. ארכיטקטורת בוץ שטוחת־גג היא בדיוק זה.
   2. האור עושה את העבודה: שמש נמוכה עם צללים רכים, ואור חצי־כדור
      שמזריק חזרה חום מהקרקע — זה מה שמזייף אור מוחזר בלי לחשב אותו.
   3. כל מה שרחוק מ־120 מטר הוא תמונה מצוירת על גליל, לא גיאומטריה.
   ══════════════════════════════════════════════════════════════ */

import * as THREE from 'three'
import { PointerLockControls } from './lib/jsm/controls/PointerLockControls.js'
import { EffectComposer } from './lib/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from './lib/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from './lib/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from './lib/jsm/postprocessing/OutputPass.js'

const SUN = new THREE.Color('#ffd9a0')
const SKY = new THREE.Color('#e8c9a4')
const BOUNCE = new THREE.Color('#bd8f63')   /* חום שחוזר מהחול */
const HAZE = new THREE.Color('#e6c6a2')

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(HAZE, 0.0042)

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 900)
camera.position.set(0, 1.62, 26)

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(2, devicePixelRatio))
renderer.setSize(innerWidth, innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.16
document.getElementById('app').appendChild(renderer.domElement)

/* ── טעינת נכסים ─────────────────────────────────────────── */
const tl = new THREE.TextureLoader()
function tile(url, rx, ry){
  const t = tl.load(url)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
const texBrick  = tile('brick.jpg', 1, 1)
const texGround = tile('ground.jpg', 26, 26)
const texCloth  = tile('cloth.jpg', 3, 1)

/* ── האור ────────────────────────────────────────────────────
   שמש נמוכה מאוד. הצללים הארוכים הם חצי מהמראה של הסרטון. */
const sun = new THREE.DirectionalLight(SUN, 2.75)
sun.position.set(-46, 17, 30)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
sun.shadow.camera.near = 1
sun.shadow.camera.far = 190
const S = 62
Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S })
sun.shadow.bias = -0.0008
sun.shadow.normalBias = 0.05
scene.add(sun, sun.target)

/* אור חצי־כדור — שמיים מלמעלה, חול מלמטה. זה מה שממלא את הצללים
   בחום במקום בשחור, ובלעדיו הכל נראה כמו רינדור זול. */
scene.add(new THREE.HemisphereLight(SKY, BOUNCE, 1.15))
scene.add(new THREE.AmbientLight(HAZE, 0.22))

/* ── שמיים והרים ─────────────────────────────────────────────
   כל מה שרחוק הוא לוח מצויר על גליל. אותה טכניקה בדיוק שמשחקים
   אמיתיים משתמשים בה, ואותה תמונה שיצרנו ל־Higgsfield. */
const skyGeo = new THREE.SphereGeometry(600, 32, 16)
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color('#c9cbd6') }, bot: { value: new THREE.Color('#f7e2c0') } },
  vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.05, 0.55, h)), 1.0); }',
})
scene.add(new THREE.Mesh(skyGeo, skyMat))

const panTex = tl.load('pano.jpg')
panTex.colorSpace = THREE.SRGBColorSpace
panTex.wrapS = THREE.RepeatWrapping
panTex.repeat.x = 2.0
const pano = new THREE.Mesh(
  new THREE.CylinderGeometry(210, 210, 190, 96, 1, true),
  new THREE.MeshBasicMaterial({ map: panTex, side: THREE.BackSide, transparent: true,
                                depthWrite: false, fog: false, opacity: 0.98 }),
)
pano.position.y = 58
scene.add(pano)

/* ── הקרקע ───────────────────────────────────────────────── */
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(620, 620),
  new THREE.MeshStandardMaterial({ map: texGround, roughness: 1, metalness: 0, color: 0xffffff }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

/* ── עיר הבוץ ────────────────────────────────────────────────
   בית = תיבה. מה שהופך אותו לבית זה קורות בולטות, שקע חלון,
   ושפת גג. שלושה פרטים, ומקבלים ארכיטקטורה. */
/* קיר בגודל אחר צריך חזרות אחרות, אחרת ה"לבנים" נמתחות לשני מטרים
   על קיר גדול ונשארות זעירות על קטן. כל בית מקבל שיבוט טקסטורה
   שהחזרות שלו נגזרות מהמידות שלו. התמונה עצמה משותפת. */
const BRICK_M = 2.6
const TONES = ['#f0e2c8', '#e6d3b2', '#d9c19d']
function brickMat(w, h, tone){
  const t = texBrick.clone(); t.needsUpdate = true
  t.repeat.set(w / BRICK_M, h / BRICK_M)
  t.offset.set(rnd() * 3, rnd() * 3)
  return new THREE.MeshStandardMaterial({ map: t, color: tone, roughness: .97, metalness: 0 })
}
const matWood = new THREE.MeshStandardMaterial({ color: '#6b5136', roughness: .95 })
const matDark = new THREE.MeshStandardMaterial({ color: '#241a12', roughness: 1 })

const city = new THREE.Group()
scene.add(city)

let seed = 20260819
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const pick = (a) => a[Math.floor(rnd() * a.length)]

function house(x, z, w, d, h, rot = 0){
  const g = new THREE.Group()
  g.position.set(x, 0, z); g.rotation.y = rot

  const tone = pick(TONES)
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), brickMat(w, h, tone))
  body.position.y = h / 2
  body.castShadow = body.receiveShadow = true
  g.add(body)

  /* שפת הגג — קו האור העליון שמפריד את הבית מהשמיים */
  const lip = new THREE.Mesh(new THREE.BoxGeometry(w + .34, .34, d + .34), brickMat(w, .34, tone))
  lip.position.y = h + .1
  lip.castShadow = lip.receiveShadow = true
  g.add(lip)

  /* קצות קורות דקל בולטים מתחת לגג */
  const beams = Math.max(2, Math.round(w / 1.15))
  for (let i = 0; i < beams; i++){
    for (const s of [1, -1]){
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.085, .095, .5, 6), matWood)
      b.rotation.x = Math.PI / 2
      b.position.set(-w / 2 + (i + .5) * (w / beams), h - .52, s * (d / 2 + .16))
      b.castShadow = true
      g.add(b)
    }
  }

  /* חלונות — ריבועים קטנים ושקועים, בלי קשתות */
  const wins = Math.max(1, Math.round(w / 2.4))
  for (let i = 0; i < wins; i++){
    if (rnd() < .28) continue
    const wq = new THREE.Mesh(new THREE.BoxGeometry(.5, .58, .22), matDark)
    wq.position.set(-w / 2 + (i + .5) * (w / wins), h * (.52 + rnd() * .22), d / 2 + .01)
    g.add(wq)
    const sill = new THREE.Mesh(new THREE.BoxGeometry(.66, .1, .3), matWood)
    sill.position.set(wq.position.x, wq.position.y - .36, d / 2 + .06)
    sill.castShadow = true
    g.add(sill)
  }

  /* פתח כניסה */
  if (rnd() < .6){
    const door = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.95, .22), matDark)
    door.position.set((rnd() - .5) * (w - 1.6), .97, d / 2 + .01)
    g.add(door)
    const lint = new THREE.Mesh(new THREE.BoxGeometry(1.3, .16, .34), matWood)
    lint.position.set(door.position.x, 2.02, d / 2 + .08)
    lint.castShadow = true
    g.add(lint)
  }
  city.add(g)
  return g
}

/* שני טורי בתים שיוצרים סמטה שמובילה אל הכיכר */
for (let i = 0; i < 9; i++){
  const z = 22 - i * 5.4
  house(-8.6 - rnd() * 1.4, z, 4.6 + rnd() * 2.4, 4.8 + rnd() * 1.8, 2.9 + rnd() * 1.9, (rnd() - .5) * .09)
  house( 8.6 + rnd() * 1.4, z, 4.6 + rnd() * 2.4, 4.8 + rnd() * 1.8, 2.9 + rnd() * 1.9, (rnd() - .5) * .09)
}
/* בתים מאחורי הכיכר, שמסתירים את קצה העולם */
for (let i = 0; i < 26; i++){
  const a = (i / 26) * Math.PI * 2
  const r = 40 + rnd() * 26
  house(Math.cos(a) * r, -34 + Math.sin(a) * r * .55, 4 + rnd() * 4, 4 + rnd() * 4, 2.6 + rnd() * 2.6, rnd() * Math.PI)
}

/* ── הכעבה ───────────────────────────────────────────────────
   קובייה. בסיס אבן בהיר, ומעליו בד כהה — הדבר הכהה היחיד בתמונה,
   וזה בדיוק מה שהופך אותה ל־Landmark בלי שום סמן. */
const kaaba = new THREE.Group()
kaaba.position.set(0, 0, -36)
const kbTex = texBrick.clone(); kbTex.needsUpdate = true; kbTex.repeat.set(4.4, 1)
const base = new THREE.Mesh(new THREE.BoxGeometry(11.4, 2.5, 11.4),
  new THREE.MeshStandardMaterial({ map: kbTex, color: '#eaddc0', roughness: .95 }))
base.position.y = 1.25
base.castShadow = base.receiveShadow = true
kaaba.add(base)
const drapeTex = texCloth.clone(); drapeTex.needsUpdate = true
drapeTex.repeat.set(9, 5)
const drape = new THREE.Mesh(new THREE.BoxGeometry(11.7, 7.4, 11.7),
  new THREE.MeshStandardMaterial({ map: drapeTex, color: '#6b6552', roughness: .99 }))
drape.position.y = 2.5 + 3.7
drape.castShadow = drape.receiveShadow = true
kaaba.add(drape)
const band = new THREE.Mesh(new THREE.BoxGeometry(11.85, .5, 11.85),
  new THREE.MeshStandardMaterial({ color: '#6a6047', roughness: .99 }))
band.position.y = 2.5 + 6.1
kaaba.add(band)
scene.add(kaaba)

/* האבן השחורה בפינה */
const stone = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 14),
  new THREE.MeshStandardMaterial({ color: '#15100e', roughness: .22, metalness: .1 }))
stone.scale.set(1, 1.25, .55)
stone.position.set(5.7, 1.55, 5.7)
kaaba.add(stone)

/* ── סוככים ─────────────────────────────────────────────────
   בד מתוח בין הבתים. זה מה שיוצר את הפסים על הרצפה, וזה כמעט
   כל מה שנותן לסמטה עומק. */
const matClothM = new THREE.MeshStandardMaterial({
  map: texCloth, color: '#e9dcc0', roughness: 1, side: THREE.DoubleSide,
  transparent: true, opacity: .96,
})
function awning(z, sag = .5){
  const seg = 12
  const g = new THREE.PlaneGeometry(9.4, 3.6, seg, 3)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++){
    const x = p.getX(i)
    p.setZ(i, -Math.cos((x / 4.7) * Math.PI / 2) * sag - Math.sin(x * 1.7 + z) * .09)
  }
  g.computeVertexNormals()
  const m = new THREE.Mesh(g, matClothM)
  m.rotation.x = -Math.PI / 2
  m.position.set((rnd() - .5) * 3, 3.9 + rnd() * .6, z)
  m.castShadow = true
  scene.add(m)
  for (const s of [-1, 1]){
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.075, .085, 3.9, 6), matWood)
    pole.position.set(m.position.x + s * 4.6, 1.95, z)
    pole.castShadow = true
    scene.add(pole)
  }
}
for (let i = 0; i < 4; i++) awning(15 - i * 8.4, .34 + rnd() * .34)

/* ── כלים על הקרקע ─────────────────────────────────────────── */
const matClay = new THREE.MeshStandardMaterial({ color: '#9c6a4a', roughness: .92 })
const matBasket = new THREE.MeshStandardMaterial({ color: '#b8955f', roughness: .95 })

/* כתם כהה רך שמודבק לקרקע מתחת לחפץ. זה מה שמצמיד אותו. */
const contactTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const x = c.getContext('2d')
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(40,26,16,.5)')
  g.addColorStop(.6, 'rgba(40,26,16,.18)')
  g.addColorStop(1, 'rgba(40,26,16,0)')
  x.fillStyle = g; x.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
})()
const contactMat = new THREE.MeshBasicMaterial({ map: contactTex, transparent: true,
  depthWrite: false, opacity: .85 })
function contact(x, z, r){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.6, r * 2.6), contactMat)
  m.rotation.x = -Math.PI / 2
  m.position.set(x, .015, z)
  m.renderOrder = 1
  scene.add(m)
}

function jar(x, z, s = 1){
  /* פרופיל כד אמיתי: בסיס צר, כתף רחבה, צוואר. הגרסה הקודמת יצרה
     חצי־כדור שנראה כמו גוש אדום. */
  const P = [[.10,0],[.19,.06],[.27,.20],[.30,.38],[.26,.56],[.17,.68],[.13,.74],[.15,.78]]
  const pts = P.map(([r, y]) => new THREE.Vector2(r * s * .78, y * s * .80))
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), matClay)
  m.position.set(x, 0, z)
  m.castShadow = m.receiveShadow = true
  scene.add(m)
  contact(x, z, .28 * s)
}
function basket(x, z, s = 1){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.36 * s, .28 * s, .42 * s, 12), matBasket)
  m.position.set(x, .21 * s, z)
  m.castShadow = m.receiveShadow = true
  scene.add(m)
  contact(x, z, .36 * s)
}
for (let i = 0; i < 22; i++){
  const side = rnd() < .5 ? -1 : 1
  const x = side * (3.4 + rnd() * 1.4)
  const z = 20 - rnd() * 44
  if (rnd() < .55) jar(x, z, .55 + rnd() * .45); else basket(x, z, .5 + rnd() * .4)
}

/* ── הקהל ────────────────────────────────────────────────────
   לוחות שתמיד פונים למצלמה. במרחק זה בלתי ניתן להבחנה ממודל
   אמיתי, וזה עולה כמעט כלום. הכשל היחיד הוא קלוז־אפ — ולכן
   הם אף פעם לא מתקרבים. */
const people = []
const walkerTex = []
for (let i = 0; i < 8; i++){
  const t = tl.load(`people/p${i}.png`)
  t.colorSpace = THREE.SRGBColorSpace
  walkerTex.push(t)
}
function person(x, z, dir, speed){
  const tex = walkerTex[Math.floor(rnd() * walkerTex.length)]
  const h = 1.62 + rnd() * .16
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(h * 0.42, h),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .5,
                                     roughness: 1, side: THREE.DoubleSide }),
  )
  m.position.set(x, h / 2, z)
  m.castShadow = true
  scene.add(m)
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), contactMat)
  sh.rotation.x = -Math.PI / 2
  sh.position.set(x, .016, z)
  sh.renderOrder = 1
  scene.add(sh)
  people.push({ m, sh, dir, speed, ph: rnd() * 6.28, h, x0: x })
}
for (let i = 0; i < 7; i++) person((rnd() - .5) * 5.6, 18 - rnd() * 40, rnd() < .5 ? 1 : -1, .55 + rnd() * .5)
/* מקיפים את הכעבה */
for (let i = 0; i < 16; i++){
  const a = (i / 16) * Math.PI * 2
  const r = 9.5 + rnd() * 3
  person(Math.cos(a) * r, -36 + Math.sin(a) * r, 1, .0)
  people[people.length - 1].orbit = { a, r, sp: .12 + rnd() * .05 }
}

/* ── אבק באוויר ─────────────────────────────────────────────
   הפרט הכי זול והכי משמעותי. בלעדיו האוויר ריק והכל נראה כמו
   רינדור; איתו יש שמש. */
const DUST = 1400
const dg = new THREE.BufferGeometry()
const dp = new Float32Array(DUST * 3)
for (let i = 0; i < DUST; i++){
  dp[i * 3] = (Math.random() - .5) * 90
  dp[i * 3 + 1] = Math.random() * 13
  dp[i * 3 + 2] = (Math.random() - .5) * 90
}
dg.setAttribute('position', new THREE.BufferAttribute(dp, 3))
/* נקודה בלי מפה היא ריבוע לבן. סְפרייט עגול ורך פותר את זה. */
const dc = document.createElement('canvas'); dc.width = dc.height = 64
const dx = dc.getContext('2d')
const dgr = dx.createRadialGradient(32, 32, 0, 32, 32, 32)
dgr.addColorStop(0, 'rgba(255,236,205,1)')
dgr.addColorStop(.45, 'rgba(255,225,180,.35)')
dgr.addColorStop(1, 'rgba(255,220,170,0)')
dx.fillStyle = dgr; dx.fillRect(0, 0, 64, 64)
const dustTex = new THREE.CanvasTexture(dc)
const dust = new THREE.Points(dg, new THREE.PointsMaterial({
  map: dustTex, color: '#ffe8c2', size: .09, sizeAttenuation: true,
  transparent: true, opacity: .34, depthWrite: false, blending: THREE.AdditiveBlending,
}))
scene.add(dust)

/* ── פוסט ────────────────────────────────────────────────── */
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.42, 0.72, 0.82)
composer.addPass(bloom)
composer.addPass(new OutputPass())

/* ── תנועה ───────────────────────────────────────────────── */
const controls = new PointerLockControls(camera, renderer.domElement)
const keys = new Set()
addEventListener('keydown', e => keys.add(e.code))
addEventListener('keyup', e => keys.delete(e.code))
document.getElementById('app').addEventListener('click', () => controls.lock())
controls.addEventListener('lock', () => document.body.classList.add('playing'))
controls.addEventListener('unlock', () => document.body.classList.remove('playing'))

const vel = new THREE.Vector3()
let bob = 0

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
  composer.setSize(innerWidth, innerHeight)
})

const clock = new THREE.Clock()
function frame(){
  requestAnimationFrame(frame)
  const dt = Math.min(.05, clock.getDelta())
  const t = clock.elapsedTime

  /* הליכה, עם נדנוד קל — בלעדיו זה מרחף */
  const sp = (keys.has('ShiftLeft') ? 5.4 : 2.6)
  const f = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0)
  const r = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0)
  vel.set(r, 0, -f)
  if (vel.lengthSq() > 0){
    vel.normalize().multiplyScalar(sp * dt)
    vel.applyEuler(new THREE.Euler(0, camera.rotation.y, 0, 'YXZ'))
    camera.position.x += vel.x
    camera.position.z += vel.z
    bob += dt * 9.5
  }
  camera.position.y = 1.62 + Math.sin(bob) * .028

  /* השמש עוקבת אחרי השחקן כדי שהצללים יישארו חדים סביבו */
  sun.target.position.set(camera.position.x, 0, camera.position.z)
  sun.position.set(camera.position.x - 46, 17, camera.position.z + 30)

  for (const p of people){
    if (p.orbit){
      p.orbit.a += p.orbit.sp * dt
      p.m.position.x = Math.cos(p.orbit.a) * p.orbit.r
      p.m.position.z = -36 + Math.sin(p.orbit.a) * p.orbit.r
    } else {
      p.m.position.z += p.dir * p.speed * dt * 8
      if (p.m.position.z > 22){ p.m.position.z = -22 }
      if (p.m.position.z < -22){ p.m.position.z = 22 }
    }
    /* נדנוד הליכה — עלייה־ירידה קלה והטיה */
    p.ph += dt * 6
    p.m.position.y = p.h / 2 + Math.abs(Math.sin(p.ph)) * .035
    p.m.rotation.z = Math.sin(p.ph) * .022
    /* פונים למצלמה סביב Y בלבד */
    p.m.rotation.y = Math.atan2(camera.position.x - p.m.position.x, camera.position.z - p.m.position.z)
    p.sh.position.set(p.m.position.x, .016, p.m.position.z)
  }

  dust.rotation.y = t * .006
  dust.position.y = Math.sin(t * .18) * .5
  pano.rotation.y = t * .0004

  composer.render()
}
frame()

/* חשיפה לבדיקה אוטומטית */
window.__poc = { camera, renderer, scene, ready: () => renderer.info.render.frame > 4 }
