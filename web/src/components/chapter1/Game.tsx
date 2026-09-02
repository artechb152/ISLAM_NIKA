'use client'

/* Chapter 1 game shell — milestone 1.
   Structure: site header (identical to the article chapters) + R3F canvas +
   DOM HUD. The HUD lives entirely outside WebGL so RTL, fonts and keyboard
   accessibility come from the regular page. World markers are DOM nodes whose
   screen positions are written imperatively each frame (no per-frame React
   state) — the same discipline as the chapter 6 scroll engine. */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Html, useAnimations, useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { LAYOUTS, PLAYABLE, type Layout } from '@/lib/chapter1/worlds'
import { FINDS_TOTAL, FIND_RANGE, findsIn, type Find } from '@/lib/chapter1/finds'
import { TASK_RANGE, taskIn } from '@/lib/chapter1/tasks'
import { FindCard } from './FindCard'
import { wrapPi } from '@/lib/chapter1/angles'
import { cue, footstep, isMuted, setMuted, startAmbience, stopAmbience, unlock } from '@/lib/chapter1/audio'
import { TaskPanel } from './TaskPanel'
import { ContactShadow, Npc, Rawi, fitToGround, type RawiClip } from './Characters'
import { DialogueHud } from './DialogueHud'
import { Notebook } from './Notebook'
import { WorldMap } from './WorldMap'
import { MODEL, NOTEBOOK_TOTAL, SPEAKERS, regionById, type Encounter, type Gesture } from '@/lib/chapter1/dialogue'
import { PLACEMENTS, type Placement } from '@/lib/chapter1/placements'
import { notebookCount, readNotebook, recordEncounter, recordFind, recordTask, setRegion } from '@/lib/chapter1/notebook'

/* The open world, one region at a time. There are no stations and no info
   cards: every word taught here is spoken by somebody, and lives in
   dialogue.json where each line carries the §N of the source passage it
   paraphrases.

   The region comes from the URL (?region=border-post). Module scope is safe
   ground for reading location: this file is loaded via dynamic(ssr:false), so
   it only ever evaluates in the browser. A region that has no authored layout
   falls back to the camp instead of crashing — the journey grows one region at
   a time and half-built regions are the normal state of the world. */
/* The chapter opens where the road opens. The default used to be the night
   camp — the second region — so anyone starting the chapter normally skipped
   the Yemen heights entirely, and with them the narrator's opening line: one of
   the twenty-seven notebook entries was unreachable in ordinary play. */
const FIRST_REGION = PLAYABLE[0]
function requestedRegion(): string {
  if (typeof window === 'undefined') return FIRST_REGION
  const wanted = new URLSearchParams(window.location.search).get('region')
  return wanted && LAYOUTS[wanted] ? wanted : FIRST_REGION
}
const REGION = regionById(requestedRegion())

/** Who stands where in this region. Empty until the region's cast is placed.
    Defined further down, once the region's world has been built. */

/** How close you must stand before a character will talk to you, in metres. */
const TALK_RANGE = 3.6

/* ---------------- shared mutable channel between canvas and HUD ---------------- */

/** Circular footprint the player cannot walk into. */
interface Collider {
  x: number
  z: number
  r: number
}

interface Live {
  player: THREE.Vector3
  yaw: number
  keys: Set<string>
  /** approach rings, keyed by the id of the character they belong to */
  markerEls: Map<string, HTMLElement>
  /** the character close enough to talk to, if any */
  nearWho: string | null
  /** the piece of evidence close enough to pick up, if any */
  nearFind: string | null
  /** true when standing at this region's task station */
  atTask: boolean
  /** static props (tents, palms, well…) */
  colliders: Collider[]
  /** moving props (wandering camels) — mutated in place each frame */
  dynamic: Collider[]
  /** performance.now() of the last look-drag, so the camera knows when it is
      allowed to steer itself and when the player is steering it */
  lastDrag: number
  /** where Rawi is standing right now — the companion writes it every frame,
      so the talk camera can frame him without owning him */
  rawiPos: { x: number; z: number }
  /** the open conversation, if its speaker has a body in the world. The talk
      camera reads this; `null` means follow the walk. */
  talk: { who: string } | null
  /** performance.now() of stepping through a gate, or 0. While set, the camera
      rises away from the shoulder until the region reads as a model — the
      leaving gesture. The travel banner waits for it before dimming. */
  riseAt: number
  /** a task prop is in hand — the camera's mouse-look must not fight the drag */
  taskDrag: boolean
}

/* Where the traveller is standing when this region opens. Normally the layout's
   own spawn — but arriving on foot from a neighbour means arriving at the gate
   that faces them, a few metres inside it, already looking into the new place.
   That is what makes the road continuous rather than a set of front doors. */
function entryPoint(): { x: number; z: number; yaw: number } {
  const spawn = WORLD.layout.player ?? { x: 0, z: 4 }
  if (typeof window === 'undefined') return { ...spawn, yaw: 0 }
  const from = new URLSearchParams(window.location.search).get('from')
  const gate = from && WORLD.layout.exits?.find((e) => e.to === from)
  if (!gate) return { ...spawn, yaw: 0 }
  /* Step in from the gate toward the middle of the region, and face that way.
     Forward at yaw y is (sin y, −cos y), so to look along (−gx, −gz) the yaw is
     atan2(−gx, gz) — NOT atan2(−gx, −gz), which points you back out through the
     gate you just walked in by. With the sign wrong, pressing forward on
     arrival returns you to the region you came from, and the journey becomes a
     loop between two neighbours that you cannot escape by walking. */
  const d = Math.hypot(gate.x, gate.z) || 1
  const inward = gate.r + 2.2
  return {
    x: +(gate.x - (gate.x / d) * inward).toFixed(2),
    z: +(gate.z - (gate.z / d) * inward).toFixed(2),
    yaw: Math.atan2(-gate.x, gate.z),
  }
}

function makeLive(): Live {
  const spawn = entryPoint()
  return {
    player: new THREE.Vector3(spawn.x, 0, spawn.z),
    yaw: spawn.yaw,
    keys: new Set(),
    markerEls: new Map(),
    nearWho: null,
    nearFind: null,
    atTask: false,
    colliders: [],
    dynamic: [],
    lastDrag: 0,
    rawiPos: { x: spawn.x, z: spawn.z },
    talk: null,
    riseAt: 0,
    taskDrag: false,
  }
}

/* ---------------- 3D world ---------------- */

/* Painted 360° panorama as the scene background — this single texture does most
   of the visual heavy lifting (mountains, sun glow, sky gradient). Which one
   plays, and how hard it lights the scene, is the region's own choice. */
function Sky() {
  const mood = WORLD.layout.mood
  const tex = useLoader(THREE.TextureLoader, `/assets/chapter1/tex/${mood?.sky ?? 'sky-dawn.png'}`)
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.colorSpace = THREE.SRGBColorSpace
    scene.background = tex
    scene.environment = tex
    /* the painted panorama is LDR — at full strength it acts as a second sun
       from everywhere and flattens all form; the directional must dominate */
    scene.environmentIntensity = mood?.skyLight ?? 0.7
    gl.toneMappingExposure = mood?.exposure ?? 1.1
    if (process.env.NODE_ENV !== 'production') {
      ;(window as unknown as Record<string, unknown>).__ch1Gl = gl
      ;(window as unknown as Record<string, unknown>).__ch1Scene = scene
      ;(window as unknown as Record<string, unknown>).__ch1Cam = camera
      ;(window as unknown as Record<string, unknown>).__ch1Env = () => ({
        fog: scene.fog ? { color: (scene.fog as THREE.Fog).color.getHexString(), near: (scene.fog as THREE.Fog).near, far: (scene.fog as THREE.Fog).far } : null,
        envInt: scene.environmentIntensity,
      })
    }
    return () => {
      scene.background = null
      scene.environment = null
      scene.environmentIntensity = 1
    }
  }, [scene, tex, gl, camera, mood])
  return null
}

/* The world rendered as an illustration: outgoing light quantized into bands,
   so the 3D scene speaks the same gouache language as the painted characters.
   This was the widest gap in the chapter — hand-painted figures standing in a
   world that tried for realism and missed — and it closes from the world's
   side, in one shader patch, at a strength each region chooses in its mood.
   Proven live before it was written: scratchpad/lab.mjs `paint`/`combo`.

   Materials arrive gradually (models load under Suspense, characters clone
   their own), so the patch is applied by a low-frequency sweep instead of a
   one-shot effect. Characters already carry an onBeforeCompile for breathing;
   theirs runs first and this appends — and the program cache key must keep the
   two variants apart, because toString() of the shared wrapper is identical
   for both closures and three would otherwise hand one of them the other's
   compiled program. */
const PAINT_UNIFORM = { value: 0.7 }
const PAINT_SEEN = new WeakSet<THREE.Material>()
function Painterly({ strength }: { strength: number }) {
  const scene = useThree((s) => s.scene)
  const tick = useRef(0)
  useEffect(() => {
    PAINT_UNIFORM.value = strength
  }, [strength])
  useFrame(() => {
    if (strength <= 0 || (tick.current++ & 63) !== 0) return
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        if (!m || PAINT_SEEN.has(m) || !(m as THREE.MeshStandardMaterial).isMeshStandardMaterial) continue
        PAINT_SEEN.add(m)
        const prior = m.onBeforeCompile
        const priorKey = prior ? prior.toString() : ''
        m.onBeforeCompile = (shader, renderer) => {
          if (prior) prior.call(m, shader, renderer)
          shader.uniforms.uPaint = PAINT_UNIFORM
          shader.fragmentShader =
            'uniform float uPaint;\n' +
            shader.fragmentShader.replace(
              '#include <dithering_fragment>',
              'float ch1L = dot(gl_FragColor.rgb, vec3(.299,.587,.114));\n' +
                'float ch1Q = (floor(ch1L*6.0)+0.5)/6.0;\n' +
                /* בצללים המדרגות הופכות לכתמים — קרקע כהה נצבעה טלאים-
                   טלאים. ההשטחה דועכת מתחת ללומיננס 0.14, והצל נשאר צל. */
                'gl_FragColor.rgb *= mix(1.0, ch1Q/max(ch1L,1e-3), uPaint * smoothstep(0.03, 0.14, ch1L));\n' +
                '#include <dithering_fragment>',
            )
        }
        m.customProgramCacheKey = () => priorKey + '|ch1paint'
        m.needsUpdate = true
      }
    })
  })
  return null
}

/* Footstep dust. The ground never acknowledged being walked on — the cheapest
   "this place is real" signal a walk can get, proven live and recorded before
   it was written (scratchpad/lab2.mjs `walkdust`). The player's step trigger
   (the same boundary that fires the footstep sound) pushes here; a small pool
   of billboard puffs rises, widens and fades in just over half a second.
   Deliberately faint — in motion it should sit right under conscious notice. */
const DUST_QUEUE: { x: number; z: number; big: boolean }[] = []
const DUST_LIFE = 0.55
function Dust({ groundAt }: { groundAt: (x: number, z: number) => number }) {
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const ages = useRef<number[]>(Array.from({ length: 10 }, () => -1))
  const tex = useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = cv.height = 64
    const g = cv.getContext('2d')!
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30)
    grad.addColorStop(0, 'rgba(214,190,150,.85)')
    grad.addColorStop(1, 'rgba(214,190,150,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    const t = new THREE.CanvasTexture(cv)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  useFrame(({ camera }, dt) => {
    while (DUST_QUEUE.length) {
      const spawn = DUST_QUEUE.pop()!
      const free = ages.current.findIndex((a) => a < 0)
      if (free < 0) break
      const m = meshes.current[free]
      if (!m) break
      ages.current[free] = 0
      m.position.set(
        spawn.x + (Math.random() - 0.5) * 0.3,
        groundAt(spawn.x, spawn.z) + 0.12,
        spawn.z + (Math.random() - 0.5) * 0.3,
      )
      m.scale.setScalar(spawn.big ? 0.7 : 0.5)
      m.visible = true
    }
    for (let i = 0; i < ages.current.length; i++) {
      if (ages.current[i] < 0) continue
      const m = meshes.current[i]
      if (!m) continue
      ages.current[i] += dt
      const a = ages.current[i]
      if (a > DUST_LIFE) {
        ages.current[i] = -1
        m.visible = false
        continue
      }
      m.position.y += dt * 0.35
      const s = m.scale.x * (1 + dt * 2.2)
      m.scale.setScalar(s)
      ;(m.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - a / DUST_LIFE)
      m.quaternion.copy(camera.quaternion)
    }
  })
  return (
    <group>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} ref={(el) => { meshes.current[i] = el }} visible={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} transparent depthWrite={false} opacity={0} />
        </mesh>
      ))}
    </group>
  )
}

/* Terrain baked in Blender: already scaled, positioned and flattened there, so
   the game only has to give it a material. A procedural Blender material cannot
   survive glTF, so when the export carries no image we keep the tiling sand and
   tint it with the material's base colour. */
/* The land beyond the walk.
 *
 * Chapter 1 was played on a plate. The shared terrain mesh is dead level for
 * its first hundred metres and only begins to move at two hundred, so every
 * one of the nine regions — the Yemen highlands, a pass through the hills,
 * Mecca in its bowl of mountains — presented the same flat table with props
 * standing on it, and no amount of dressing fixed that read.
 *
 * This raises the ground outside the region's own walkable circle. Inside it,
 * nothing changes: the player, the props and the roads all stand on y = 0 and
 * none of them need to know about this. Immediately past the boundary the land
 * begins to rise, and how hard it rises, and at what wavelength, is the
 * region's own — the pass gets close ridges, the oasis a low basin, Mecca a
 * ring of hills. It is the silhouette that tells you where you are.
 */
function reliefAt(x: number, z: number, inner: number, amp: number, wave: number) {
  const d = Math.hypot(x, z)
  if (d <= inner) return 0
  /* smoothstep out of the flat, so the seam at the boundary is not a step */
  const t = Math.min(1, (d - inner) / 55)
  const ease = t * t * (3 - 2 * t)
  /* three octaves of ridged sine — cheap, seamless and deterministic */
  const w = (2 * Math.PI) / wave
  const n =
    Math.sin(x * w + Math.cos(z * w * 0.7) * 1.7) * 0.6 +
    Math.sin(z * w * 1.31 - x * w * 0.4) * 0.3 +
    Math.sin((x + z) * w * 2.7) * 0.12
  /* keep the far field climbing so the horizon closes rather than falling away */
  const climb = Math.min(1, (d - inner) / 240)
  return ease * amp * (n + climb * 1.3)
}

/* גובה פני הקרקע בנקודה.

   הטרסה האפויה אינה יושבת על y=0 — ליד נקודת ההתחלה של מחנה
   הלילה פניה נמצאים ב-0.17, ולכן כל דמות שהוצבה על אפס נראתה
   שקועה עד הקרסול בחול. הגמלים לא סבלו מזה כי העדר ממוקם בנפרד.

   הפתרון הוא קרן אחת כלפי מטה אל רשת הטרסה. היא נשמרת במטמון
   לפי רבע מטר, כך שהליכה לא משלמת קרן בכל פריים, והתוצאה עוקבת
   גם אחרי התבליט שמורם בקוד ולא רק אחרי הקובץ. */
const groundRay = new THREE.Raycaster()
const GROUND_DOWN = new THREE.Vector3(0, -1, 0)
const groundCache = new Map<string, number>()
let terrainMesh: THREE.Mesh | null = null

/* הטרסה נטענת אחרי חלק מהפרופים, ואלה מחשבים את גובהם פעם אחת
   בלבד. בלי הודעה על כך שהקרקע הגיעה, כל מה שנבנה לפניה נשאר
   תקוע על אפס — מרחף מעל הקרקע במעבר הצר ושקוע בחול במחנה.
   המנוי הזה מרנדר אותם מחדש ברגע שיש במה לפגוע. */
let terrainVersion = 0
const terrainSubs = new Set<() => void>()
function subscribeTerrain(cb: () => void) {
  terrainSubs.add(cb)
  return () => { terrainSubs.delete(cb) }
}
function terrainSnapshot() {
  return terrainVersion
}
/** מרנדר מחדש כל מה שתלוי בגובה הקרקע. */
export function useGroundReady() {
  return useSyncExternalStore(subscribeTerrain, terrainSnapshot, terrainSnapshot)
}

function registerTerrain(obj: THREE.Object3D) {
  /* הרשת הרחבה ביותר היא הקרקע — אבל רק בתוך הטרסה עצמה. חיפוש
     בכל הסצנה היה עלול לבחור סלע ענק, ואז כל גובה בעולם נמדד
     ביחס לסלע. */
  let best: THREE.Mesh | null = null
  let bestArea = 0
  obj.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    m.geometry.computeBoundingBox()
    const bb = m.geometry.boundingBox
    if (!bb) return
    const a = (bb.max.x - bb.min.x) * (bb.max.z - bb.min.z)
    if (a > bestArea) { bestArea = a; best = m }
  })
  terrainMesh = best
  groundCache.clear()
  terrainVersion++
  /* מחוץ לשלב הרינדור, אחרת React מתלונן על עדכון בזמן רינדור */
  queueMicrotask(() => { for (const cb of terrainSubs) cb() })
}

const GROUND_UP = new THREE.Vector3(0, 1, 0)
const groundOrigin = new THREE.Vector3()

export function groundYAt(x: number, z: number): number {
  if (!terrainMesh) return 0
  const key = `${Math.round(x * 4)},${Math.round(z * 4)}`
  const hit = groundCache.get(key)
  if (hit !== undefined) return hit

  /* מטריצת העולם של הטרסה מתעדכנת רק כשהיא נכנסת לגרף; קרן
     שנורית לפני כן מפספסת בשקט ומחזירה אפס — וזה בדיוק מה
     שהשאיר אבנים באוויר. */
  terrainMesh.updateMatrixWorld(true)
  groundRay.set(groundOrigin.set(x, 400, z), GROUND_DOWN)
  let res = groundRay.intersectObject(terrainMesh, true)
  if (!res.length) {
    /* גם מלמטה: פרופ שמונח על מדרון תלול יכול לשבת מתחת לפני
       הקרקע, ואז הקרן היורדת עוברת מעליו בלי לפגוע. */
    groundRay.set(groundOrigin.set(x, -400, z), GROUND_UP)
    res = groundRay.intersectObject(terrainMesh, true)
  }
  /* כישלון אמיתי לא נכנס למטמון: הטרסה עוד עשויה להגיע. */
  if (!res.length) return 0
  const y = res[0].point.y
  groundCache.set(key, y)
  return y
}

function BakedTerrain({ url, hasImage, tint }: { url: string; hasImage: boolean; tint?: string }) {
  const { scene } = useGLTF(url)
  const ground = campLayout.terrain?.ground ?? 'sand.jpg'
  const tiles = campLayout.terrain?.repeat ?? 90
  const sandSrc = useLoader(THREE.TextureLoader, `/assets/chapter1/tex/${ground}`)
  const obj = useMemo(() => {
    const c = scene.clone(true)
    if (!hasImage) {
      const sand = sandSrc.clone()
      sand.needsUpdate = true
      sand.wrapS = sand.wrapT = THREE.RepeatWrapping
      sand.colorSpace = THREE.SRGBColorSpace
      sand.repeat.set(tiles, tiles)
      sand.anisotropy = 16 // grazing-angle speckle in the foreground otherwise
      c.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const src = m.material as THREE.MeshStandardMaterial
        /* The tint MULTIPLIES the ground texture, so a dark tint over an
           already-dark surface lands at a few percent reflectance — the scree
           and soil grounds were measuring darker than coal.

           The fix for that was to drop the tint entirely whenever a region
           named its own ground texture, which every region now does — so the
           tint was dead code and all nine regions stood on the same neutral
           #e8e2d8. What the tint is for is the region's HOUR: the ground under
           a first-light sky leans cool, the same gravel at gold hour leans
           warm, and scripts/grade-regions.mjs derives that lean from the very
           panorama hanging behind it. It is written at a fixed brightness so it
           can only change which way the ground leans, never how dark it is. */
        const mat = new THREE.MeshStandardMaterial({
          color: tint ?? (campLayout.terrain?.ground ? '#e8e2d8' : '#e9c9a4'),
          map: sand,
          normalMap: src?.normalMap ?? null,
          roughness: 1,
          metalness: 0,
          side: THREE.FrontSide,
        })
        /* 0.3 השאיר את הקרקע כמעט שטוחה, וקרקע שטוחה שתופסת שני
           שלישים מהפריים היא רוב מה שנקרא כ״לא גמור״. בערך גבוה
           יותר השמש הנמוכה מייצרת אור וצל על אותה חול עצמה, וזה
           מה שנותן לרצפה חומר במקום צבע. */
        mat.normalScale = new THREE.Vector2(0.55, 0.55)
        m.material = mat
      })
    }
    /* Raise the land outside the walkable circle. Done on the geometry rather
       than in a shader so the shadows, the fog and the silhouette against the
       painted sky all agree with it. */
    const relief = campLayout.terrain?.relief
    if (relief) {
      const inner = (campLayout.bound ?? 24) + 6
      c.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const g = (m.geometry = m.geometry.clone())
        const pos = g.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          const z = pos.getZ(i)
          pos.setY(i, pos.getY(i) + reliefAt(x, z, inner, relief.amp, relief.wave))
        }
        pos.needsUpdate = true
        g.computeVertexNormals()
      })
    }
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) m.receiveShadow = true
    })
    /* מרגע זה אפשר לשאול את הקרקע לגובהה בכל נקודה */
    c.updateMatrixWorld(true)
    registerTerrain(c)
    return c
  }, [scene, sandSrc, hasImage, tint])
  return <primitive object={obj} />
}

/* Generic GLB prop, normalized so `height` is its world height and it sits on the
   ground regardless of how the source model was scaled or centered. */
/* A slow whole-tree lean, phase-shifted by position — the cheapest wind there
   is. Its own component so only the palms pay for a per-frame subscription;
   putting the hook in Prop signed all 149 props up for it. */
function Sway({ x, z, children }: { x: number; z: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g) return
    const t = clock.elapsedTime
    g.rotation.z = Math.sin(t * 0.7 + x * 1.3) * 0.015
    g.rotation.x = Math.sin(t * 0.53 + z * 1.1) * 0.01
  })
  return <group ref={ref}>{children}</group>
}

/* עד 193 פרופים נפרשו בבת אחת בפריים אחד — פענוח ושכפול של כולם נערמו
   למשימת main-thread אחת של יותר משתי שניות, וזו הקפיאה שדווחה בכניסה
   לאזור הראשון. כאן העולם נבנה מהשחקן החוצה: המנה הראשונה היא מה שרואים
   בנקודת הכניסה (והיא לבדה מעכבת את לוח ההגעה), והשאר מצטרפים במנות
   קטנות מאחורי הערפל. כל פרופ מאוחר בגבול Suspense משלו כדי שמודל אחד
   איטי לא יחביא את האזור. */
function StagedProps({ placed, live }: { placed: CampProp[]; live: Live }) {
  const FIRST_BATCH = 30
  const ordered = useMemo(() => {
    const px = live.player.x
    const pz = live.player.z
    return [...placed].sort(
      (a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz),
    )
    // המיקום נדגם פעם אחת, בהרכבה — הסדר חייב להישאר יציב כדי שה-keys לא ינדדו
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed])
  const [count, setCount] = useState(Math.min(FIRST_BATCH, ordered.length))
  useEffect(() => {
    if (count >= ordered.length) return
    const t = window.setInterval(() => {
      setCount((c) => Math.min(c + 12, ordered.length))
    }, 120)
    return () => window.clearInterval(t)
  }, [count, ordered.length])
  return (
    <>
      {ordered.slice(0, count).map((p, i) =>
        i < FIRST_BATCH ? (
          <Prop key={i} url={p.url} x={p.x} z={p.z} ry={p.ry} height={p.h} tint={p.tint} sink={p.sink} widen={p.widen} />
        ) : (
          <Suspense key={i} fallback={null}>
            <Prop url={p.url} x={p.x} z={p.z} ry={p.ry} height={p.h} tint={p.tint} sink={p.sink} widen={p.widen} />
          </Suspense>
        ),
      )}
    </>
  )
}

function Prop({ url, x, z, ry = 0, height, liner, tint, sink = 0, widen = 1 }: {
  url: string
  x: number
  z: number
  ry?: number
  height: number
  /** Stretch across the model's own x only. A gate is the one prop whose
      opening is load-bearing on the game: gate-post's archway is 1.8 m in the
      mesh, which leaves a 90 cm lane once the player's own radius is taken off
      both piers — passable on paper and a scrape in practice. Widening the
      gate is the honest fix; scaling it uniformly would put a 10 m tower on a
      mudbrick frontier wall. */
  widen?: number
  /** dark inner shell — hides gaps in generated meshes (tent canvas) */
  liner?: boolean
  /** Optional fallback tint for exported assets whose procedural colour was lost. */
  tint?: string
  /** bury the base this many metres — beds ridges/props into the sand */
  sink?: number
}) {
  const { scene } = useGLTF(url)
  /* מרנדר מחדש כשהקרקע מגיעה, אחרת הגובה נשאר על אפס לנצח */
  useGroundReady()
  const { object, dims } = useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = size.y > 0 ? height / size.y : 1
    c.scale.setScalar(s)
    c.scale.x = s * widen
    const box2 = new THREE.Box3().setFromObject(c)
    c.position.y = -box2.min.y

    let dims: [number, number, number] | null = null
    if (liner) {
      /* A plain bounding box would include the guy-ropes and stakes, which reach
         far past the canvas. Use percentiles of the vertex cloud instead: that
         is the dense body of the tent, ignoring the sparse rope outliers. */
      const xs: number[] = []
      const ys: number[] = []
      const zs: number[] = []
      c.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const p = m.geometry.attributes.position
        const step = Math.max(1, Math.floor(p.count / 6000))
        for (let i = 0; i < p.count; i += step) {
          xs.push(p.getX(i))
          ys.push(p.getY(i))
          zs.push(p.getZ(i))
        }
      })
      const pct = (arr: number[], q: number) => {
        arr.sort((a, b) => a - b)
        return arr[Math.min(arr.length - 1, Math.max(0, Math.floor(arr.length * q)))] ?? 0
      }
      if (xs.length > 20) {
        // generous span: the canvas reaches well past the middle 80 % of points
        dims = [
          (pct(xs, 0.96) - pct(xs, 0.04)) * s,
          (pct(ys, 0.97) - pct(ys, 0.0)) * s,
          (pct(zs, 0.96) - pct(zs, 0.04)) * s,
        ]
      }
    }
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      /* Horizon rock is background: it can never cast a shadow anyone sees,
         but it is huge, so putting it in the shadow pass costs a full extra
         render of the biggest meshes in the scene every frame. */
      m.castShadow = height < 18
      m.receiveShadow = true
      /* Thin surfaces (tent cloth, palm fronds, thatch) need DoubleSide or they
         vanish from behind. So do the baked buildings: their wall geometry is
         single-sided, so with back-face culling on you look straight through
         the near wall and see only the far one — a solid house reads as a lone
         leaning panel out in the sand. Rock and terrain stay culled. */
      const thin = /palm|tent|pergola|shrub|desert-bush|fodder|house|tower|wall/.test(url)
      /* Foliage is the one case DoubleSide alone doesn't solve: a frond's back
         face points away from the sun, so against a bright sky it renders pure
         black and the crown reads as torn paper. A little self-illumination in
         the leaf's own colour is the cheap standard fix. */
      const foliage = /palm|shrub|desert-bush/.test(url)
      const prepareMaterial = (mat: THREE.Material) => {
        const owned = tint || foliage ? mat.clone() : mat
        if (thin) owned.side = THREE.DoubleSide
        const colourMaterial = owned as THREE.Material & { color?: THREE.Color }
        if (tint && colourMaterial.color) colourMaterial.color.set(tint)
        if (foliage) {
          const std = owned as THREE.MeshStandardMaterial
          if (std.isMeshStandardMaterial) {
            std.emissive = new THREE.Color('#5c5a2e')
            std.emissiveIntensity = 0.22
          }
        }
        return owned
      }
      m.material = Array.isArray(m.material)
        ? m.material.map(prepareMaterial)
        : prepareMaterial(m.material)
    })
    return { object: c, dims }
  }, [scene, height, liner, tint, url])
  /* הפרופים הוצבו על y=0, אבל הטרסה האפויה אינה יושבת על אפס:
     במחנה פניה גבוהים ממנו וכלים נראו שקועים בחול, ובמעבר הצר
     נמוכים ממנו וכדים ריחפו באוויר. הצבה על פני הקרקע עצמם פותרת
     את שני הכיוונים באותו שינוי. */
  return (
    <group position={[x, groundYAt(x, z) - sink, z]} rotation={[0, ry, 0]}>
      {url.includes('palm') ? (
        <Sway x={x} z={z}>
          <primitive object={object} />
        </Sway>
      ) : (
        <primitive object={object} />
      )}
      {/* Rendered back-faces only: invisible from outside where the canvas is
          intact, and where the mesh has a gap you see dark tent interior
          instead of straight through to the desert. */}
      {dims && (
        <mesh position={[0, dims[1] * 0.46, 0]} renderOrder={-1}>
          <boxGeometry args={[dims[0], dims[1] * 0.94, dims[2]]} />
          <meshStandardMaterial color="#2b1d13" roughness={1} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  )
}

/** hand-authored camp assets supplied by the author (Blender → GLB) */
const MODEL_TENT = '/assets/chapter1/models/blacktent.glb'
const MODEL_FIREPIT = '/assets/chapter1/models/firepit.glb'
const MODEL_TORCH = '/assets/chapter1/models/torch.glb'
const MODEL_CAMEL = '/assets/chapter1/models/camel.glb'
/* make-player.py also writes traveler-stride, traveler-passing and
   traveler-walk. The game stopped loading all three when the player took
   Rawi's skeleton and the walk came from traveler-anim instead; the constants
   outlived the code that used them. */
const MODEL_TRAVELER_WALK = '/assets/chapter1/models/player4.glb'
const MODEL_PALM = '/assets/chapter1/models/palm.glb'
const MODEL_WELL = '/assets/chapter1/models/well.glb'
const MODEL_ROCKS = '/assets/chapter1/models/rocks.glb'
const MODEL_JARS = '/assets/chapter1/models/jars.glb'
const MODEL_FIREWOOD = '/assets/chapter1/models/firewood.glb'
const MODEL_SHRUB = '/assets/chapter1/models/shrub.glb'
/** same camel, split into body + four hip-pivoted legs for the walk cycle */
const MODEL_CAMEL_PARTS = '/assets/chapter1/models/camel-parts.glb'

/* המספרים שההליכה בנויה עליהם — נמדדו, לא נוחשו, על player2.glb
   (ריג Meshy, ריצת הלילה 2026-09-01) בעמוד /chapter1/dev-character:
   מד-הסקייט שם דוגם את מהירות כף הרגל הנטועה ב-timeScale=1, וזה
   בדיוק "כמה מטרים הקליפ מכסה בשנייה". מטרים-ללולאה = מהירות × אורך.

   walk (Quick_Walk):  1.332 מ/ש × 3.033 ש = 4.04 מ ללולאה
   run  (RunFast):     8.83  מ/ש × 0.5   ש = 4.41 מ ללולאה

   לראשונה יש קליפ ריצה אמיתי: הנכס הישן מתח את ההליכה פי 2.3 בריצה,
   והחדש מחליף קליפ — המשקל נודד walk→run עם runBlend, וכל קליפ מנוגן
   בקצב הליניארי שלו עצמו. */
const WALK_CLIP_SECONDS = 3.033
const WALK_CYCLE_METRES = 4.04
const RUN_CLIP_SECONDS = 0.5
const RUN_CYCLE_METRES = 4.41
/* אורך צעד לשעון הצליל/אבק/נדנוד — הקליפ החדש מכיל כמה צעדים בלולאה,
   ולכן השעון סופר צעדים (2 לכל 2π) ולא לולאות-קליפ */
const STEP_METRES = 0.78
for (const m of [MODEL_TENT, MODEL_FIREPIT, MODEL_TORCH, MODEL_CAMEL, MODEL_CAMEL_PARTS, MODEL_TRAVELER_WALK, MODEL_PALM, MODEL_WELL, MODEL_ROCKS, MODEL_JARS, MODEL_FIREWOOD, MODEL_SHRUB]) {
  useGLTF.preload(m)
}

/* The author's looping VDB campfire, rendered out of Blender to a 32-frame
   atlas (8×4). Volumetric fire has no glTF equivalent, so it plays here as a
   camera-facing quad with additive blending — the standard real-time approach. */
const FIRE_COLS = 8
const FIRE_ROWS = 4
const FIRE_FRAMES = 32

function FireSprite({ y, size, fps = 20, phase = 0 }: { y: number; size: number; fps?: number; phase?: number }) {
  const src = useLoader(THREE.TextureLoader, '/assets/chapter1/tex/fire-atlas.png')
  const mesh = useRef<THREE.Mesh>(null)
  const tex = useMemo(() => {
    const t = src.clone()
    t.needsUpdate = true
    t.colorSpace = THREE.SRGBColorSpace
    t.repeat.set(1 / FIRE_COLS, 1 / FIRE_ROWS)
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearFilter
    return t
  }, [src])

  useFrame(({ clock, camera }) => {
    const f = (Math.floor(clock.elapsedTime * fps + phase) % FIRE_FRAMES + FIRE_FRAMES) % FIRE_FRAMES
    const col = f % FIRE_COLS
    const row = Math.floor(f / FIRE_COLS)
    tex.offset.set(col / FIRE_COLS, (FIRE_ROWS - 1 - row) / FIRE_ROWS)
    // billboard: always face the camera
    if (mesh.current) mesh.current.quaternion.copy(camera.quaternion)
  })

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && mesh.current) {
      const w = new THREE.Vector3()
      mesh.current.getWorldPosition(w)
      const mat = mesh.current.material as THREE.MeshBasicMaterial
      const img = mat.map?.image as HTMLImageElement | undefined
      const g = (window as unknown as Record<string, unknown>)
      const list = (g.__ch1Fire as unknown[]) || []
      list.push({ pos: w.toArray().map((n) => +n.toFixed(2)), img: img ? [img.width, img.height] : null, visible: mesh.current.visible })
      g.__ch1Fire = list
    }
  }, [])

  return (
    <mesh ref={mesh} position={[0, y, 0]}>
      <planeGeometry args={[size, size]} />
      {/* One/One custom blend, NOT AdditiveBlending: the rendered flame's
          alpha peaks at 0.42, and additive premultiplies by alpha, which left
          the fire invisible against bright sand. Adding the raw RGB works
          because the atlas background is pure black. */}
      <meshBasicMaterial
        map={tex}
        side={THREE.DoubleSide}
        transparent
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendSrc={THREE.OneFactor}
        blendDst={THREE.OneFactor}
        blendEquation={THREE.AddEquation}
        toneMapped={false}
      />
    </mesh>
  )
}

function Campfire({ x, z }: { x: number; z: number }) {
  useGroundReady()
  const light = useRef<THREE.PointLight>(null)
  const smoke = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    /* the fire has to compete with a 3.6-intensity dawn sun or it lights
       nothing and the flame reads as a decal pinned in front of the camp */
    if (light.current) light.current.intensity = 30 + Math.sin(t * 7) * 5 + Math.sin(t * 13) * 3
    if (smoke.current) {
      smoke.current.children.forEach((p, i) => {
        const ph = (t * 0.35 + i / 3) % 1
        p.position.set(Math.sin(t * 0.8 + i * 2.1) * 0.2 * ph, 0.75 + ph * 2.8, 0)
        p.scale.setScalar(0.3 + ph * 0.9)
        const m = (p as THREE.Mesh).material as THREE.MeshBasicMaterial
        m.opacity = 0.22 * (1 - ph)
      })
    }
  })
  return (
    <group position={[x, groundYAt(x, z), z]}>
      {/* authored fire pit: stone ring, logs and scorched ground */}
      <Prop url={MODEL_FIREPIT} x={0} z={0} ry={0.4} height={0.75} />
      {/* warm glow on the ground under the fire */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 24]} />
        <meshBasicMaterial color="#ff8c2a" transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* the author's rendered volumetric flame loop */}
      <FireSprite y={1.15} size={2.4} fps={22} />
      {/* smoke puffs */}
      <group ref={smoke}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.22, 10, 8]} />
            <meshBasicMaterial color="#9b8a7a" transparent opacity={0.2} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* An iron tripod with a chain-hung cauldron is a northern-European camp
          trope and was also the darkest object in the region. The Arabian
          hearth is three stones with the pot resting on them. */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5
        return (
          <mesh key={i} position={[Math.cos(a) * 0.52, 0.13, Math.sin(a) * 0.52]} rotation={[a, a * 1.7, 0.3]} castShadow>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color="#8d7a60" roughness={1} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.36, 0]} castShadow>
        <sphereGeometry args={[0.26, 14, 10]} />
        <meshStandardMaterial color="#6d4f36" roughness={1} />
      </mesh>
      <pointLight ref={light} position={[0, 0.9, 0]} color="#ff9a3d" distance={22} decay={1.6} />
    </group>
  )
}

/* ------- camp set-dressing ------- */

/* The caravan track. A road is what turns scattered buildings into a place —
   everything in the region hangs off this line, and the player reads it as
   "the way through" long before reaching the gate. Rendered as darker,
   compacted sand: the same texture as the ground, tighter repeat, warm-brown
   multiply, faded edges via an alpha gradient so it sinks into the terrain
   instead of sitting on it like tape. */
/* A cross-road alpha ramp: transparent edges, translucent middle. Shared by
   both road shapes — the road is something you sense, not a stripe you see. */
function roadAlpha() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 4
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 64, 0)
  grad.addColorStop(0, 'rgba(255,255,255,0)')
  grad.addColorStop(0.42, 'rgba(255,255,255,0.42)')
  grad.addColorStop(0.58, 'rgba(255,255,255,0.42)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 4)
  return new THREE.CanvasTexture(c)
}


function Road({ x, z, ry = 0, len, w }: { x: number; z: number; ry?: number; len: number; w: number }) {
  useGroundReady()
  const sand = useLoader(THREE.TextureLoader, `/assets/chapter1/tex/${ROAD_GROUND}`)
  const { tex, alpha } = useMemo(() => {
    const tex = sand.clone()
    tex.needsUpdate = true
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.colorSpace = THREE.SRGBColorSpace
    tex.repeat.set(w / 2.5, len / 2.5)
    return { tex, alpha: roadAlpha() }
  }, [sand, len, w])
  return (
    <mesh position={[x, groundYAt(x, z) + 0.015, z]} rotation={[-Math.PI / 2, 0, ry]} receiveShadow>
      <planeGeometry args={[w, len]} />
      <meshStandardMaterial map={tex} alphaMap={alpha} {...ROAD_MAT} />
    </mesh>
  )
}

/* The real thing: a trampled track that wanders. Built as a ribbon along a
   Catmull-Rom centreline — width wobbles a little, and both ends taper to
   nothing so the road is born from the sand and dies into it, never cut off
   by a straight edge. Straight rectangles read as carpets; this reads as use. */
function ribbonGeometry(
  pts: { x: number; z: number }[],
  w: number,
  side: number, // lateral offset of the centreline, metres
  y: number,
  broken = false, // ruts: organic alpha breaks so the line never reads machine-drawn
) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x, 0, p.z)))
  const len = curve.getLength()
  const N = Math.max(24, Math.round(len / 1.2))
  /* four columns across: edges carry alpha 0, the inner pair alpha 1 — the
     cross-fade lives in RGBA vertex colours, NOT in an alphaMap. (three.js
     shares one uv-transform across map+alphaMap, so a repeating sand map
     dragged the alpha ramp with it and cut the edge hard.) */
  /* left column first — the triangle winding below assumes it, and flipping
     the order flips the face normals underground (invisible road, learned twice) */
  const ACROSS = [0.5, 0.22, -0.22, -0.5]
  const ALPHA = [0, 1, 1, 0]
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const p = curve.getPointAt(t)
    const tan = curve.getTangentAt(t)
    /* ground-plane left normal */
    const nx = tan.z
    const nz = -tan.x
    const fade = Math.min(1, Math.min(t, 1 - t) / 0.09)
    const wobble = 1 + 0.13 * Math.sin(i * 1.7) + 0.08 * Math.sin(i * 3.1 + 1.3)
    const cx = p.x + nx * side
    const cz = p.z + nz * side
    const v = (t * len) / 2.5
    const rowA = broken ? 0.45 + 0.55 * Math.abs(Math.sin(i * 0.83 + side * 7)) : 1
    for (let c = 0; c < 4; c++) {
      const off = ACROSS[c] * w * fade * wobble
      pos.push(cx + nx * off, y, cz + nz * off)
      uv.push(ACROSS[c] + 0.5, v)
      col.push(1, 1, 1, ALPHA[c] * rowA)
    }
    if (i < N) {
      const a = i * 4
      for (let c = 0; c < 3; c++) {
        idx.push(a + c, a + c + 1, a + c + 4, a + c + 1, a + c + 5, a + c + 4)
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return { geo, len }
}

function RoadRibbon({ pts, w }: { pts: { x: number; z: number }[]; w: number }) {
  const sand = useLoader(THREE.TextureLoader, '/assets/chapter1/tex/sand.jpg'
  )
  const parts = useMemo(() => {
    const mk = (repeatW: number) => {
      const tex = sand.clone()
      tex.needsUpdate = true
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.colorSpace = THREE.SRGBColorSpace
      tex.repeat.set(repeatW, 1)
      return tex
    }
    /* the track itself, plus two softer camel ruts riding it — the ground
       story that says "caravans pass here". The committee read v1's ruts as
       tire skid-marks: near-black, unbroken, parallel forever. Lighter tone,
       lower opacity, and organic alpha breaks fix the read. */
    return [
      { ...ribbonGeometry(pts, w, 0, 0.015), tex: mk(w / 2.5), color: ROAD_TINT, o: 0.5 },
      { ...ribbonGeometry(pts, 0.34, -0.55, 0.022, true), tex: mk(0.2), color: ROAD_TINT, o: 0.42 },
      { ...ribbonGeometry(pts, 0.3, 0.62, 0.022, true), tex: mk(0.2), color: ROAD_TINT, o: 0.36 },
    ]
  }, [sand, pts, w])
  return (
    <>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geo} receiveShadow>
          <meshStandardMaterial map={p.tex} {...ROAD_MAT} color={p.color} vertexColors opacity={p.o} />
        </mesh>
      ))}
    </>
  )
}

/* A trampled dark patch — the ground's memory of feet and hooves: under the
   well mouth, around the fire. A soft radial alpha disc, nothing more. */
/* Trampled desert ground goes LIGHTER, not darker — feet break the dark
   surface crust and expose pale dry sand underneath. The first version darkened
   it, which read as a hard grey plate laid on the dune. */
function WornPatch({ x, z, r, tone = '#bd9a78' }: { x: number; z: number; r: number; tone?: string }) {
  useGroundReady()
  const alpha = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 62)
    /* a long soft tail — a hard-edged disc reads as a plate lying on the dune,
       which is exactly how the first version looked */
    grad.addColorStop(0, 'rgba(255,255,255,0.1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.07)')
    grad.addColorStop(0.75, 'rgba(255,255,255,0.025)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <mesh position={[x, groundYAt(x, z) + 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[r, 28]} />
      <meshStandardMaterial
        color={tone}
        alphaMap={alpha}
        transparent
        depthWrite={false}
        roughness={1}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  )
}

function Rug({ x, z, ry = 0 }: { x: number; z: number; ry?: number }) {
  useGroundReady()
  const weave = useLoader(THREE.TextureLoader, '/assets/chapter1/tex/tent-weave.jpg')
  useEffect(() => {
    weave.colorSpace = THREE.SRGBColorSpace
  }, [weave])
  return (
    <mesh position={[x, groundYAt(x, z) + 0.02, z]} rotation={[-Math.PI / 2, 0, ry]} receiveShadow>
      <planeGeometry args={[1.7, 1.05]} />
      <meshStandardMaterial map={weave} color="#b98a6a" roughness={1} />
    </mesh>
  )
}

function Scrolls({ x, z }: { x: number; z: number }) {
  useGroundReady()
  return (
    <group position={[x, groundYAt(x, z), z]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[i * 0.12 - 0.12, 0.06, (i % 2) * 0.14]} rotation={[Math.PI / 2, 0, 0.4 + i * 0.9]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.52, 8]} />
          <meshStandardMaterial color="#e6d9b8" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

/* The author's Medieval Torch Stand, topped with the same rendered flame. */
function Torch({ x, z, ry = 0 }: { x: number; z: number; ry?: number }) {
  useGroundReady()
  return (
    <group position={[x, groundYAt(x, z), z]} rotation={[0, ry, 0]}>
      <Prop url={MODEL_TORCH} x={0} z={0} height={1.85} />
      <FireSprite y={1.95} size={0.85} fps={24} phase={x * 7} />
      <pointLight position={[0, 2, 0]} color="#ff9a3d" intensity={5} distance={8} decay={2} />
    </group>
  )
}

/* deterministic pseudo-random scatter (no Math.random → stable between mounts) */
function scatterRing(count: number, rMin: number, rMax: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = ((i * 137.5 + seed * 61) % 360) * (Math.PI / 180)
    const r = rMin + (((i * 73 + seed * 29) % 100) / 100) * (rMax - rMin)
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, k: ((i * 37 + seed) % 100) / 100 }
  })
}

/* Dust on the wind. Without it the air is dead — every frame identical to the
   last — and the desert reads as a photograph. One additive point cloud drifting
   downwind and recycling at the far edge costs a single draw call. */
function DustMotes({ count = 55 }: { count?: number }) {
  const pts = useRef<THREE.Points>(null)
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = 0.3 + Math.random() * 4.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80
      seed[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const mat = new THREE.PointsMaterial({
      color: '#e8cda6',
      /* additive transparency is the most expensive thing a software or
         integrated renderer draws — this field is deliberately small */
      size: 0.055,
      sizeAttenuation: true,
      transparent: true,
      /* faint enough to read as haze in the light, not as white specks on the
         sky — dust you notice only once you stop walking */
      opacity: 0.26,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geo, mat }
  }, [count])

  useFrame(({ clock }, dt) => {
    if (!pts.current) return
    const t = clock.elapsedTime
    const p = geo.attributes.position as THREE.BufferAttribute
    const s = geo.attributes.aSeed as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      const k = s.getX(i)
      /* downwind drift plus a slow bob, so the field never reads as a grid */
      let x = p.getX(i) + dt * (0.55 + k * 0.5)
      const y = p.getY(i) + Math.sin(t * (0.4 + k) + k * 9) * dt * 0.22
      if (x > 40) x -= 80
      p.setX(i, x)
      p.setY(i, y)
    }
    p.needsUpdate = true
    /* re-centre in 80 m steps so the field always surrounds the player without
       the motes visibly jumping under them */
    pts.current.position.x = Math.round(livePlayerX / 80) * 80
    pts.current.position.z = Math.round(livePlayerZ / 80) * 80
  })
  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} />
}

/* the dust field needs the player's position without threading `live` through
   every layer; the World writes it once per frame */
let livePlayerX = 0
let livePlayerZ = 0

function Pebbles() {
  useGroundReady()
  const items = useMemo(() => scatterRing(64, 3.5, 23, 7), [])
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x, groundYAt(p.x, p.z) + 0.045, p.z]} rotation={[p.k * 3, p.k * 6, 0]}>
          <dodecahedronGeometry args={[0.055 + p.k * 0.075, 0]} />
          <meshStandardMaterial color={p.k > 0.5 ? '#a08765' : '#8d7a5e'} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function GrassTufts() {
  useGroundReady()
  const items = useMemo(() => scatterRing(26, 5, 22, 3), [])
  return (
    <group>
      {items.map((p, i) => (
        <group key={i} position={[p.x, groundYAt(p.x, p.z), p.z]}>
          {[0, 1, 2, 3].map((j) => (
            <mesh key={j} position={[Math.sin(j * 1.7) * 0.06, 0.16, Math.cos(j * 2.3) * 0.06]} rotation={[Math.sin(j) * 0.35, j * 1.6, Math.cos(j) * 0.3]}>
              <coneGeometry args={[0.02, 0.4 + p.k * 0.25, 4]} />
              <meshStandardMaterial color="#a08f5c" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}


/* The physical answers. Each task option that carries a `prop` stands as a
   real object beside its station; dragging it onto the station gives that
   answer with your hands — the panel's buttons stay for keyboards, screen
   readers and the harnesses, and both routes run the same choose logic.
   The verb was proven live before it was written (scratchpad/lab4.mjs), and
   its two hard-won rules are honoured here: the drop target is measured on
   the drag plane itself, and while a prop is in hand the camera's own
   mouse-look is locked out (`live.taskDrag`) — two hands on one mouse drag
   each other. */
const TASK_PROP_SPOTS = [
  { dx: -1.5, dz: 0.7 },
  { dx: -0.4, dz: 1.5 },
  { dx: 1.2, dz: 1.0 },
]
function TaskProp({ url, tint, h, x, z, label, showLabel, taken }: {
  url: string
  tint?: string
  h: number
  x: number
  z: number
  label: string
  showLabel: boolean
  taken: boolean
}) {
  const model = useNormalizedGLB(url, h, tint)
  return (
    <group position={[x, groundYAt(x, z), z]}>
      <primitive object={model} />
      {showLabel && !taken && (
        <Html center position={[0, h + 0.42, 0]} zIndexRange={[4, 4]}>
          <span className="ch1-prop-label">{label}</span>
        </Html>
      )}
    </group>
  )
}
function TaskProps({ live, atTask, chosen, solvedTask, onChoose }: {
  live: Live
  atTask: boolean
  chosen: string[]
  solvedTask: boolean
  onChoose: (id: string) => void
}) {
  const { camera, gl } = useThree()
  const opts = useMemo(
    () => (REGION_TASK ? REGION_TASK.options.filter((o) => o.prop) : []),
    [],
  )
  /* מיקומים חיים — בית קבוע לכל חפץ, יעד משלו (spot של האופציה או התחנה),
     ומיקום נוכחי שהגרירה מזיזה */
  const state = useRef(
    opts.map((o, i) => {
      const spot = TASK_PROP_SPOTS[i % TASK_PROP_SPOTS.length]
      const home = { x: (REGION_TASK?.x ?? 0) + spot.dx, z: (REGION_TASK?.z ?? 0) + spot.dz }
      const tgt = {
        x: (REGION_TASK?.x ?? 0) + (o.spot?.dx ?? 0),
        z: (REGION_TASK?.z ?? 0) + (o.spot?.dz ?? 0),
      }
      return { id: o.id, home, tgt, cur: { ...home }, lift: 0, hop: 0, returning: false, placed: false }
    }),
  )
  const dragging = useRef<number>(-1)
  const hovering = useRef<number>(-1)
  const nearTarget = useRef(false)
  const solvedAt = useRef(0)
  const [, force] = useState(0)

  /* טבעת יעד + טבעת hover — חומרים בסיסיים, מחוץ לטווח של Painterly */
  const targetRing = useRef<THREE.Mesh>(null)
  const hoverRing = useRef<THREE.Mesh>(null)

  useEffect(() => {
    if (!REGION_TASK || !opts.length) return
    const v = new THREE.Vector3()
    const project = (i: number) => {
      const st = state.current[i]
      v.set(st.cur.x, groundYAt(st.cur.x, st.cur.z) + 0.3, st.cur.z).project(camera)
      const r = gl.domElement.getBoundingClientRect()
      return {
        x: (v.x * 0.5 + 0.5) * r.width + r.left,
        y: (-v.y * 0.5 + 0.5) * r.height + r.top,
        behind: v.z > 1,
      }
    }
    const toPlane = (cx: number, cy: number, y: number) => {
      const r = gl.domElement.getBoundingClientRect()
      v.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1), 0.5).unproject(camera)
      const dir = v.sub(camera.position).normalize()
      const t = (y - camera.position.y) / dir.y
      return {
        x: camera.position.x + dir.x * t,
        z: camera.position.z + dir.z * t,
      }
    }
    const hitAt = (cx: number, cy: number) => {
      for (let i = 0; i < state.current.length; i++) {
        if (state.current[i].placed || chosen.includes(state.current[i].id)) continue
        const p = project(i)
        if (!p.behind && Math.hypot(p.x - cx, p.y - cy) < 70) return i
      }
      return -1
    }
    const down = (e: PointerEvent) => {
      /* פאנל פתוח מעל הקנבס: לחיצה עליו לא תופסת פרופ שמאחוריו */
      if (e.target !== gl.domElement) return
      if (solvedTask || dragging.current >= 0) return
      const i = hitAt(e.clientX, e.clientY)
      if (i >= 0) {
        dragging.current = i
        state.current[i].returning = false
        live.taskDrag = true
        gl.domElement.style.cursor = 'grabbing'
        /* מגע: בלי capture הדפדפן עלול לחטוף את הרצף באמצע */
        ;(gl.domElement as Element).setPointerCapture?.(e.pointerId)
      }
    }
    const move = (e: PointerEvent) => {
      const i = dragging.current
      if (i < 0) {
        /* hover: היד יודעת שאפשר להרים עוד לפני הלחיצה */
        const h = solvedTask ? -1 : hitAt(e.clientX, e.clientY)
        if (h !== hovering.current) {
          hovering.current = h
          gl.domElement.style.cursor = h >= 0 ? 'grab' : ''
        }
        return
      }
      const st = state.current[i]
      const g = toPlane(e.clientX, e.clientY, groundYAt(st.home.x, st.home.z) + 0.3)
      /* לא נותנים לסחוב את התשובה מחוץ לזירה */
      const dx = g.x - (REGION_TASK?.x ?? 0)
      const dz = g.z - (REGION_TASK?.z ?? 0)
      const d = Math.hypot(dx, dz)
      const cap = Math.min(1, 4.5 / Math.max(d, 1e-3))
      st.cur.x = (REGION_TASK?.x ?? 0) + dx * cap
      st.cur.z = (REGION_TASK?.z ?? 0) + dz * cap
      st.lift = 0.55
      nearTarget.current = Math.hypot(st.cur.x - st.tgt.x, st.cur.z - st.tgt.z) < 1.6
    }
    const drop = (i: number) => {
      dragging.current = -1
      live.taskDrag = false
      gl.domElement.style.cursor = ''
      const st = state.current[i]
      st.lift = 0
      /* נדיב: שחרור בקרבת היעד נספר — אף פעם לא דיוק-פיקסל */
      const d = Math.hypot(st.cur.x - st.tgt.x, st.cur.z - st.tgt.z)
      if (d < 1.6) {
        const opt = opts[i]
        if (opt.right) st.placed = true
        else {
          st.returning = true
          st.hop = 1 /* קפיצת סירוב — העולם עונה, לא רק הפאנל */
        }
        onChoose(opt.id)
      } else {
        st.returning = true
      }
      nearTarget.current = false
      force((n) => n + 1)
    }
    const up = () => {
      if (dragging.current >= 0) drop(dragging.current)
    }
    const cancel = () => {
      const i = dragging.current
      if (i < 0) return
      dragging.current = -1
      live.taskDrag = false
      gl.domElement.style.cursor = ''
      state.current[i].lift = 0
      state.current[i].returning = true
    }
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', cancel, true)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', up, true)
      window.removeEventListener('pointercancel', cancel, true)
      gl.domElement.style.cursor = ''
      live.taskDrag = false
    }
  }, [camera, gl, live, opts, chosen, solvedTask, onChoose])

  useFrame((_, dt) => {
    /* רוב התחנות בכלל בלי פרופים — בלי השומר הזה הפרסום ל-__ch1Task
       ניגש ל-state.current[0] ריק וקרס ~50 פעם בשנייה (דוח השחקנית) */
    if (!state.current.length) return
    for (let i = 0; i < state.current.length; i++) {
      const st = state.current[i]
      if (st.hop > 0) st.hop = Math.max(0, st.hop - dt * 3)
      if (st.placed) {
        st.cur.x += (st.tgt.x - st.cur.x) * Math.min(1, dt * 6)
        st.cur.z += (st.tgt.z - st.cur.z) * Math.min(1, dt * 6)
        /* אחרי הפתרון: החפצים שוקעים אל תוך התחנה — הארגז "נסגר" */
        if (solvedTask && solvedAt.current > 0) {
          const k = Math.min(1, (performance.now() - solvedAt.current) / 700)
          st.lift = -0.35 * k
        }
      } else if (st.returning) {
        st.cur.x += (st.home.x - st.cur.x) * Math.min(1, dt * 5)
        st.cur.z += (st.home.z - st.cur.z) * Math.min(1, dt * 5)
        if (Math.hypot(st.cur.x - st.home.x, st.cur.z - st.home.z) < 0.03) st.returning = false
      }
    }
    if (solvedTask && solvedAt.current === 0) solvedAt.current = performance.now()
    /* טבעות: יעד בזמן גרירה (מודגשת בקרבה), hover על חפץ פנוי */
    const tr = targetRing.current
    if (tr) {
      const d = dragging.current
      tr.visible = d >= 0 && !solvedTask
      if (tr.visible) {
        const st = state.current[d]
        tr.position.set(st.tgt.x, groundYAt(st.tgt.x, st.tgt.z) + 0.03, st.tgt.z)
        const near = nearTarget.current
        const target = near ? 1.35 : 1.0
        tr.scale.x += (target - tr.scale.x) * Math.min(1, dt * 10)
        tr.scale.y = tr.scale.z = tr.scale.x
        ;(tr.material as THREE.MeshBasicMaterial).opacity = near ? 0.95 : 0.55
      }
    }
    const hr = hoverRing.current
    if (hr) {
      const h = dragging.current < 0 ? hovering.current : -1
      hr.visible = h >= 0 && !solvedTask
      if (hr.visible) {
        const st = state.current[h]
        hr.position.set(st.cur.x, groundYAt(st.cur.x, st.cur.z) + 0.03, st.cur.z)
      }
    }
    /* חלון לסוכני Playwright: מיקומי מסך חיים של החפצים והיעד */
    if (process.env.NODE_ENV !== 'production' && atTask) {
      const r = gl.domElement.getBoundingClientRect()
      const vv = new THREE.Vector3()
      const d0 = dragging.current >= 0 ? dragging.current : 0
      const st0 = state.current[d0]
      vv.set(st0.tgt.x, groundYAt(st0.tgt.x, st0.tgt.z), st0.tgt.z).project(camera)
      const tgtScreen = { x: (vv.x * 0.5 + 0.5) * r.width + r.left, y: (-vv.y * 0.5 + 0.5) * r.height + r.top }
      ;(window as unknown as Record<string, unknown>).__ch1Task = {
        props: state.current.map((st) => {
          vv.set(st.cur.x, groundYAt(st.cur.x, st.cur.z) + 0.3, st.cur.z).project(camera)
          return {
            id: st.id,
            x: (vv.x * 0.5 + 0.5) * r.width + r.left,
            y: (-vv.y * 0.5 + 0.5) * r.height + r.top,
            placed: st.placed || chosen.includes(st.id),
          }
        }),
        target: tgtScreen,
        dragging: dragging.current,
      }
    }
  })

  if (!REGION_TASK || !opts.length) return null
  return (
    <group>
      {/* טבעת היעד — נדלקת בזמן גרירה, מתרחבת ומתבהרת בקרבת snap */}
      <mesh ref={targetRing} rotation-x={-Math.PI / 2} visible={false} renderOrder={2}>
        <ringGeometry args={[0.55, 0.72, 40]} />
        <meshBasicMaterial color="#e8bf76" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* טבעת hover — "את זה אפשר להרים" */}
      <mesh ref={hoverRing} rotation-x={-Math.PI / 2} visible={false} renderOrder={2}>
        <ringGeometry args={[0.3, 0.4, 32]} />
        <meshBasicMaterial color="#f5ecd6" transparent opacity={0.8} depthWrite={false} />
      </mesh>
      {opts.map((o, i) => {
        const st = state.current[i]
        return (
          <group key={o.id} position={[st.cur.x - st.home.x, st.lift + Math.sin(st.hop * Math.PI) * 0.3, st.cur.z - st.home.z]}>
            <TaskProp
              url={`/assets/chapter1/models/${o.prop!.model}.glb`}
              tint={o.prop!.tint}
              h={o.prop!.h}
              x={st.home.x}
              z={st.home.z}
              label={o.label}
              showLabel={atTask && !solvedTask}
              taken={st.placed || chosen.includes(o.id)}
            />
          </group>
        )
      })}
    </group>
  )
}

/* A walker: somebody going somewhere, on foot. The traveller's own three baked
   poses (stand/stride/passing) in another tint, cycled exactly the way the
   player cycles them, along a camel-style ellipse. The chapter teaches a trade
   route — a road nobody walks on is a diagram. */
function WalkingExtra({ live, cx, cz, rx, rz, speed, phase, tint }: {
  live: Live
  cx: number
  cz: number
  rx: number
  rz: number
  speed: number
  phase: number
  tint?: string
}) {
  const g = useRef<THREE.Group>(null)
  /* אותו קליפ הליכה של השחקן, בגוון אחר ובקצב שנגזר ממהירות הקרקע */
  const { scene: walkScene, animations: walkAnims } = useGLTF(MODEL_TRAVELER_WALK)
  const model = useMemo(() => {
    const c = cloneSkinned(walkScene)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = false
      m.frustumCulled = false
      if (tint) {
        const mat = (m.material as THREE.MeshStandardMaterial).clone()
        mat.color.set(tint)
        m.material = mat
      }
      ;(m.material as THREE.Material).side = THREE.DoubleSide
    })
    fitToGround(c, 1.72)
    return c
  }, [walkScene, tint])
  const { actions } = useAnimations(walkAnims, model)
  const col = useMemo<Collider>(() => ({ x: cx + rx, z: cz, r: 0.45 }), [cx, cz, rx])
  useEffect(() => {
    const a = actions['walk']
    if (!a) return
    const groundSpeed = Math.abs(speed) * ((rx + rz) / 2)
    /* אותו קליפ של השחקן על גוף שממודד ל-1.72 במקום 1.78 — המחזור מתקצר ביחס */
    a.setEffectiveTimeScale(groundSpeed / ((WALK_CYCLE_METRES * 1.72) / 1.78))
    a.play()
  }, [actions, speed, rx, rz])
  useEffect(() => {
    live.dynamic.push(col)
    return () => {
      const i = live.dynamic.indexOf(col)
      if (i >= 0) live.dynamic.splice(i, 1)
    }
  }, [live, col])
  useFrame(({ clock }) => {
    const el = g.current
    if (!el) return
    const t = clock.elapsedTime * speed + phase
    const x = cx + Math.cos(t) * rx
    const z = cz + Math.sin(t) * rz
    const dx = -Math.sin(t) * rx * Math.sign(speed)
    const dz = Math.cos(t) * rz * Math.sign(speed)
    el.position.set(x, groundYAt(x, z), z)
    el.rotation.y = Math.atan2(dx, dz)
    col.x = x
    col.z = z
  })
  return (
    <group ref={g}>
      <primitive object={model} />
      <ContactShadow radius={0.42} />
    </group>
  )
}

/* An extra: a cast model standing somewhere as somebody else. The collider is
   the same shape a wandering camel registers, so the walk treats them as
   people and not as scenery you pass through. JSON hands us `who` as a plain
   string; it is narrowed here, at the point of use, as the sun's position is. */
type ExtraWho = 'envoy' | 'chief' | 'merchant' | 'jewish' | 'monk'
function Extra({ live, who, x, z, ry, tint }: {
  live: Live
  who: ExtraWho
  x: number
  z: number
  ry: number
  tint?: string
}) {
  const col = useMemo<Collider>(() => ({ x, z, r: 0.45 }), [x, z])
  /* ניצב שמתקרבים אליו מפנה מבט ומברך במחווה — ההבדל בין פסל לאדם.
     בדיקת מרחק בקצב נמוך, לא כל פריים: זו נימוסים, לא פיזיקה. */
  const [greet, setGreet] = useState(false)
  useEffect(() => {
    const t = window.setInterval(() => {
      const d = Math.hypot(live.player.x - x, live.player.z - z)
      setGreet(d < 2.8)
    }, 400)
    return () => window.clearInterval(t)
  }, [live, x, z])
  useEffect(() => {
    live.dynamic.push(col)
    return () => {
      const i = live.dynamic.indexOf(col)
      if (i >= 0) live.dynamic.splice(i, 1)
    }
  }, [live, col])
  return (
    <Npc
      who={who}
      position={[x, groundYAt(x, z), z]}
      rotationY={ry}
      speaking={greet}
      playerRef={{ current: live.player }}
      tint={tint}
    />
  )
}

/* Normalize a GLB to `height` meters with feet on the ground. The cached GLTF
   scene is NEVER mutated — all transforms go on a fresh wrapper group, so the
   math stays correct when React StrictMode re-runs the memo (mutating the
   cached scene twice is what shrank and sank the character). */
function useNormalizedGLB(url: string, height: number, tint?: string) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    /* clone (safe — these GLBs carry no skeleton), never touch the cached scene */
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = size.y > 0 ? height / size.y : 1
    c.scale.setScalar(s)
    c.position.y = -box.min.y * s
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      /* הדמות אינה מקבלת צל על עצמה. הרשת מחוספסת מהדצימציה,
         ועל משטח כזה כל פאה מצלה על שכנתה — מה שמצייר פסים
         שחורים על הגלימה ומכסה את הפנים. הצל שהיא מטילה על
         הקרקע נשאר, וזה מה שקושר אותה למקום. */
      m.receiveShadow = false
      m.frustumCulled = false
      const prepareMaterial = (mat: THREE.Material) => {
        const owned = tint ? mat.clone() : mat
        owned.side = THREE.DoubleSide
        const colourMaterial = owned as THREE.Material & { color?: THREE.Color }
        if (tint && colourMaterial.color) colourMaterial.color.set(tint)
        return owned
      }
      m.material = Array.isArray(m.material)
        ? m.material.map(prepareMaterial)
        : prepareMaterial(m.material)
    })
    return c
  }, [scene, height, tint])
}

function Player({ live }: { live: Live }) {
  const group = useRef<THREE.Group>(null)
  /* ההליכה עצמה: קליפ שלד אמיתי, כמו של ראאווי. שלוש התנוחות הקפואות
     נקראו כספר מתהפך לצידו — והשלד עם המשקולות ממילא קיים; ההבדל הוא
     keyframes ו-mixer במקום החלפת רשתות. משקל הקליפ דועך לאפס בעמידה,
     ותנוחת הכפיתה היא העמידה — כך שהעצירה עצמה היא האנימציה. */
  const walkAction = useRef<THREE.AnimationAction | null>(null)
  const idleAction = useRef<THREE.AnimationAction | null>(null)
  const runAction = useRef<THREE.AnimationAction | null>(null)
  const heading = useRef(0)
  const walkT = useRef(0)
  /** clip-seconds played since mount — dev-only, for the foot-slide harness */
  const walkPhase = useRef(0)
  const lastStep = useRef(0)
  const speed = useRef(0)
  const runBlend = useRef(0)
  const idleT = useRef(0)
  /* מצלמת השיחה. 27 המפגשים הם לב הפרק, וכולם נראו כמו עורף של
     שחקן מול חזה של דמות — המצלמה נשארה דבוקה לגב גם כשמישהו דיבר.
     כשנפתחת שיחה עם דובר שיש לו גוף בעולם, המצלמה מחליקה לצילום־
     שניים צדי וחוזרת כשהשיחה נסגרת. הוכח חי לפני שנכתב:
     scratchpad/lab2.mjs `twoshot`. */
  const talkBlend = useRef(0)
  const talkAnchor = useRef({ x: 0, z: 0 })
  const twoShotV = useRef(new THREE.Vector3())
  const lookV = useRef(new THREE.Vector3())

  useFrame(({ camera }, rawDt) => {
    const g = group.current
    if (!g) return
    /* A long frame — a texture decode, a tab regaining focus — used to move the
       player its full duration in one step: 28 metres at once in testing, which
       walks straight through walls and over the gate that carries you to the
       next region. Cap the step so one slow frame costs speed, never position. */
    const dt = Math.min(rawDt, 0.1)
    livePlayerX = live.player.x
    livePlayerZ = live.player.z
    const k = live.keys
    const running = k.has('shift')
    /* 4 m/s is a jog: it crosses the whole 687 m chapter in three minutes and
       gives the learner no time to look at anything on the way. 2.6 is a
       purposeful walk, and Shift is there when the road is long. */
    const run = running ? 6 : 2.6
    let mx = 0
    let mz = 0
    if (k.has('w')) mz -= 1
    if (k.has('s')) mz += 1
    if (k.has('a')) mx -= 1
    if (k.has('d')) mx += 1
    const moving = mx !== 0 || mz !== 0
    /* המהירות הייתה בינארית: מקש למטה = מהירות מלאה בפריים הראשון,
       מקש למעלה = עצירה מוחלטת בפריים הראשון. גוף שמגיע למהירותו
       המלאה באפס זמן נקרא כאיקון שנגרר על מפה, לא כאדם שהולך —
       וזה גם מה שגרם לנדנוד ולנטייה להידלק ולכבות בבת אחת. עלייה
       ברבע שנייה ועצירה מהירה ממנה קצת. */
    const targetSpeed = moving ? run : 0
    const ramp = moving ? 14 : 20
    speed.current += (targetSpeed - speed.current) * Math.min(1, dt * ramp)
    if (speed.current < 0.02) speed.current = 0
    const gait = speed.current / 2.6
    /* כיוון ההליכה נשמר, כדי שהעצירה תהיה אמיתית ולא רק קוסמטית:
       ההאטה נהגה מ-`speed`, אבל ההזזה עצמה ישבה בתוך `if (moving)`,
       ולכן הגוף נעצר בפריים אחד בזמן שהרגליים המשיכו לצעוד עוד
       ארבעה — כולל צליל צעד של אדם שעומד במקום. */
    if (moving) {
      MOVE_DIR.set(mx, 0, mz).normalize().applyAxisAngle(WORLD_UP, -live.yaw)
    }
    if (speed.current > 0) {
      live.player.addScaledVector(MOVE_DIR, speed.current * dt)
    }
    if (moving || speed.current > 0) {

      /* Solid props: push the player back out of any footprint they entered, so
         you can't walk through the well, a tent or a camel. Two passes settle
         the corner case of standing between two touching colliders. */
      const PLAYER_R = 0.45
      for (let pass = 0; pass < 2; pass++) {
        for (const c of [...STATIC_COLLIDERS, ...live.dynamic]) {
          const dx = live.player.x - c.x
          const dz = live.player.z - c.z
          const d = Math.hypot(dx, dz)
          const min = c.r + PLAYER_R
          if (d < min) {
            if (d < 1e-4) {
              live.player.x = c.x + min
            } else {
              live.player.x = c.x + (dx / d) * min
              live.player.z = c.z + (dz / d) * min
            }
          }
        }
      }

      // keep the player inside the region's walkable circle — each layout
      // declares its own radius (the camp's old hardcoded 24 leaked into the
      // border post and stopped travellers dead in the middle of the road)
      const dist = Math.hypot(live.player.x, live.player.z)
      const MAX = WORLD.layout.bound ?? 24
      if (dist > MAX) live.player.multiplyScalar(MAX / dist)
      if (moving) heading.current = Math.atan2(MOVE_DIR.x, MOVE_DIR.z)

      /* המצלמה מסתובבת רק בגרירת עכבר, ב-0.005 רדיאן לפיקסל — פנייה
         של 90° היא 314 פיקסלים של גרירה, ו-180° היא 628. מי שמשחק
         במקלדת בלבד לא יכול לסובב אותה בכלל: A ו-D מזיזים הצידה,
         והחצים ממופים עליהם. לכן כשהולכים קדימה בלי לגעת בעכבר,
         המצלמה מיישרת את עצמה לאט לכיוון ההליכה — מספיק איטי כדי
         לא להילחם ביד, ומספיק כדי ש-W+A יהיה פנייה שמאלה.
         היא מוותרת מיד ברגע שנוגעים בעכבר. */
      if (moving && mz < 0 && performance.now() - live.lastDrag > 1200) {
        /* הקשר בין הזווית לכיוון ההליכה הוא `heading = π − yaw`, לא
           `yaw + π`: הקלט מסובב ב-`-yaw`, ולכן זווית מקומית α נותנת
           `heading = α − yaw`, ועבור W (כלומר α = π) יוצא π − yaw.
           הזווית שמעמידה את המצלמה מאחורי כיוון נתון היא לכן
           `π − heading`. הגרסה הקודמת גררה את ה-yaw אל אפס במקום אל
           כיוון ההליכה — וזה נראה תקין רק כי כל תשעת האזורים פרושים
           על ציר ה-Z, כך שהדרך הראשית עוברת בדיוק דרך אפס. */
        live.yaw += wrapPi(Math.PI - heading.current - live.yaw) * Math.min(1, dt * 1.2)
      }
    }
    /* שעון ההליכה — הוא שמתזמן את הצליל, את האבק ואת הנדנוד, ולכן הוא
       חייב להיות באותו חוק ליניארי כמו הקליפ. כשהוא רץ על √gait והגוף
       נע ליניארית, הצעדים נשמעים בקצב אחד והרגליים נראות בקצב אחר:
       בריצה נשמעו שני שלישים מהצעדים שנראו. π רדיאנים = חצי מחזור =
       צעד אחד, ולכן 2π לסיבוב מלא של WALK_CYCLE_METRES. */
    if (speed.current > 0.05) {
      walkT.current += dt * ((speed.current / (STEP_METRES * 2)) * 2 * Math.PI)
    }
    // two-pose walk: the character is a plain static mesh (no skeleton — the
    // rigged model rendered T-pose on some GPUs). While moving we alternate
    // between the standing and mid-stride meshes at gait frequency, mirroring
    // the stride for the opposite step — deterministic on every machine.
    /* שתי תנוחות אמיתיות: העמידה והצעד הם שתי רשתות שונות — הצעד
       פורש את הרגליים קדימה ואחורה — והחלפה ביניהן בתדר ההליכה עם
       שיקוף לצעד הנגדי היא מה שקורא כהליכה.

       שתי הרשתות עצמן נבנו מחדש מרשת ה-NPC, ששומרת טקסטורה 2048
       שלמה, אחרי שהתברר שהאטלס של הנוסע הישן — 123KB של WebP —
       דחוס עד שהאיים שלו נמרחים זה לתוך זה, וזה מה שצייר את הפסים
       השחורים על הגלימה. התנוחות מופקות בשלד קטן של שלוש עצמות
       ונאפות לרשת סטטית, כך שהמנגנון כאן לא השתנה בכלל. */
    const walking = speed.current > 0.35
    const act = walkAction.current
    if (act) {
      /* המשקל נכנס ויוצא ברוך; idle משלים ל-1 תמיד, כי תנוחת הכפיתה
         של ריג מיקסאמו היא T-pose.

         הקצב ליניארי במהירות הקרקע, ולא `1.43·√gait` כפי שהיה. מרחק
         הוא ליניארי במהירות; שורש יכול להסכים איתו בנקודה אחת בדיוק,
         ובכל שאר המהירויות הרגליים מחליקות. בריצה (6 מ״ש) הקליפ רץ
         2.17 במקום 3.29 — כלומר הדמות גלשה קדימה ב-34% מהדרך. הגמל
         שהולך לידה עשה את זה נכון כל הזמן: `groundSpeed / 1.24`.

         שני המספרים נמדדו ולא נוחשו: אורך הקליפ הוא 1.042 שניות
         (`npm run measure-walk` קורא אותו מה-GLB), ואורך המחזור נגזר
         מנקודת הכיול שאושרה בעין — 1.43 בקצב הליכה של 2.6 מ״ש נותן
         2.6·1.042/1.43 ≈ 1.9 מ׳ לסיבוב. לכן בקצב הליכה החוק החדש
         מחזיר 1.426 — אותו מראה בדיוק — ומתקן את כל השאר. */
      const wantW = walking ? Math.min(1, gait * 2) : 0
      const w = act.getEffectiveWeight() + (runAction.current?.getEffectiveWeight() ?? 0)
      const w2 = w + (wantW - w) * Math.min(1, dt * 8)
      /* חלוקת המשקל בין הליכה לריצה רוכבת על runBlend של המצלמה —
         אותו אות, פריים אחד מאחור, וזה בסדר: שניהם רכים ממילא */
      const runK = runAction.current ? runBlend.current : 0
      act.setEffectiveWeight(w2 * (1 - runK))
      runAction.current?.setEffectiveWeight(w2 * runK)
      const ts = (speed.current * WALK_CLIP_SECONDS) / WALK_CYCLE_METRES
      act.setEffectiveTimeScale(ts)
      runAction.current?.setEffectiveTimeScale((speed.current * RUN_CLIP_SECONDS) / RUN_CYCLE_METRES)
      idleAction.current?.setEffectiveWeight(1 - w2)
      /* A monotonic count of clip-seconds played, so a harness can divide
         ground travelled by clip loops and see whether the feet are planted —
         the question `1.43·√gait` got wrong at every speed but one, and that no
         screenshot can answer. `action.time` cannot be used: it wraps every
         1.042 s. Read by scripts/check-slide.mjs. */
      if (process.env.NODE_ENV !== 'production') {
        /* הקליפ הדומיננטי מדווח: בריצה סופרים את קליפ הריצה, אחרת הליכה.
           `cycle` נוסף כדי שההרנס ישווה מטרים-ללולאה מול הערך הצפוי של
           הקליפ הפעיל — שני קליפים, שני אורכי מחזור. */
        const dominant = runK > 0.5
        walkPhase.current += dt * (dominant ? (speed.current * RUN_CLIP_SECONDS) / RUN_CYCLE_METRES : ts)
        ;(window as unknown as Record<string, unknown>).__ch1Walk = {
          phase: walkPhase.current, weight: w2, timeScale: ts,
          clip: dominant ? RUN_CLIP_SECONDS : WALK_CLIP_SECONDS,
          cycle: dominant ? RUN_CYCLE_METRES : WALK_CYCLE_METRES,
        }
      }
    }
    /* רגל נוגעת בקרקע בכל חצי מחזור. שעון ההליכה כבר סופר את זה,
       ולכן הצעד נשמע מאותו מקור שמצייר אותו — בלי טיימר נפרד
       שיכול להיסחף ממנו. */
    const step = Math.floor(walkT.current / Math.PI)
    if (speed.current > 0.5 && step !== lastStep.current) {
      footstep(gait > 1.6)
      /* כל צעד שנשמע גם נראה — פוך אבק קטן בכף הרגל */
      DUST_QUEUE.push({ x: live.player.x, z: live.player.z, big: gait > 1.6 })
    }
    lastStep.current = step

    // body motion: vertical bob + slight sway/lean while moving
    const ease = Math.min(1, gait)
    const bob = Math.abs(Math.cos(walkT.current)) * 0.06 * ease
    const sway = Math.sin(walkT.current) * 0.035 * ease
    g.position.set(live.player.x, groundYAt(live.player.x, live.player.z) + live.player.y + bob, live.player.z)
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, heading.current, Math.min(1, dt * 10))
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, sway, Math.min(1, dt * 8))
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0.06 * ease, Math.min(1, dt * 6))

    /* Third-person camera, framed high and close so the player is read from the
       waist up. The player mesh has no real gait (it swaps between two static
       poses — its source robe fuses the arms into the cloth, which every
       auto-rigger refuses), so keeping the feet at the very bottom of frame
       stops that flipbook from competing with Rawi's actual walk cycle beside
       you. Rawi, who is animated, stays fully visible. */
    /* 3.05 kept the player at 56% of frame height — a portrait, not a world.
       Pulled back + slightly up so the region does the talking. */
    /* ריצה והליכה נראו זהות לחלוטין: אותו מרחק, אותו גובה, אותו שדה
       ראייה — ההבדל היחיד היה תדר החלפת התנוחות. מצלמה שנסוגה מעט
       ושדה ראייה שנפתח בשבע מעלות הם ההבדל בין „המספר השתנה“ לבין
       „אני רץ“. הבלנד מוחלק בנפרד מהמהירות עצמה, כדי שהעדשה לא
       תנשום בכל תיקון קטן של הג׳ויסטיק. */
    runBlend.current += (Math.min(1, Math.max(0, (gait - 1) / 1.31)) - runBlend.current) * Math.min(1, dt * 2.5)
    const rb = runBlend.current

    /* מי הדובר, ואיפה הוא עומד. ראאווי זז — מיקומו נכתב כל פריים על
       ידי המלווה; כל השאר עומדים היכן שה-placements שם אותם. קריין
       אין לו גוף, ולכן אין לו זווית — המצלמה נשארת על ההליכה. */
    const talk = live.talk
    let speaker: { x: number; z: number } | null = null
    if (talk) {
      if (talk.who === 'rawi') speaker = live.rawiPos
      else {
        const placed = (PLACEMENTS[REGION.id] ?? []).find((c) => c.who === talk.who)
        if (placed) speaker = placed
      }
    }
    if (speaker) talkAnchor.current = { x: speaker.x, z: speaker.z }
    /* הבלנד ממשיך לדעוך אל העוגן האחרון גם אחרי שהשיחה נסגרה, כדי
       שהחזרה אל הגב תהיה נסיעה ולא קפיצה. */
    talkBlend.current += ((speaker ? 1 : 0) - talkBlend.current) * Math.min(1, dt * 2.4)
    const tb = talkBlend.current

    /* מחוות היציאה — עלייה אל הדגם. easing כפול כדי שההמראה תתחיל
       ברוך ותיגמר ברוך, על פני 1.5 שניות מתוך 2.1 של המעבר. */
    let riseK = 0
    if (live.riseAt) {
      const rt = Math.max(0, Math.min(1, (performance.now() - live.riseAt) / 1500))
      riseK = rt < 0.5 ? 2 * rt * rt : 1 - Math.pow(-2 * rt + 2, 2) / 2
    }
    /* מבט הדגם שהיה כאן ירד עם המהלך שהחזיר את M למפה בלבד. `live.modelView`
       נשאר false לתמיד, ולכן ההשמה הזאת התכנסה ל-0 ו-Math.max לא עשה כלום —
       מחוות היציאה (`riseAt`) היא היחידה שמרימה את המצלמה אל הדגם. */

    const CAM_DIST = 3.7 + rb * 0.65
    const camOffset = new THREE.Vector3(0, 2.45 - rb * 0.15, CAM_DIST).applyAxisAngle(new THREE.Vector3(0, 1, 0), -live.yaw)
    const followFov = 55 + rb * 7 + (34 - (55 + rb * 7)) * tb
    const wantFov = followFov + (28 - followFov) * riseK
    if (Math.abs((camera as THREE.PerspectiveCamera).fov - wantFov) > 0.01) {
      ;(camera as THREE.PerspectiveCamera).fov = wantFov
      ;(camera as THREE.PerspectiveCamera).updateProjectionMatrix()
    }

    /* Pull in when a trunk or tent would sit between us and the player. The
       colliders are circles on the ground plane, so this is a 2-D ray/circle
       test rather than a scene raycast — cheap enough to run every frame. */
    const ox = camOffset.x / CAM_DIST
    const oz = camOffset.z / CAM_DIST
    let dist = CAM_DIST
    for (const c of [...STATIC_COLLIDERS, ...live.dynamic]) {
      const fx = live.player.x - c.x
      const fz = live.player.z - c.z
      const r = c.r + 0.12
      const b = fx * ox + fz * oz
      const cc = fx * fx + fz * fz - r * r
      const disc = b * b - cc
      if (disc <= 0) continue
      const s = Math.sqrt(disc)
      const enter = -b - s
      const exit = -b + s
      // the camera only clips if the prop lies between the player and it.
      // 2.2 m is the floor: any closer and the player's back fills the screen.
      if (exit > 0 && enter < dist) dist = Math.max(2.2, Math.min(dist, enter - 0.1))
    }
    camOffset.multiplyScalar(dist / CAM_DIST)
    camOffset.y = 2.45 - rb * 0.15 - (CAM_DIST - dist) * 0.15 // dip when tucked in, and when running

    const target = live.player.clone().add(camOffset)
    /* עומדים במקום, והפריים קפוא לגמרי: המצלמה נעולה, השחקן סטטי,
       ורק גרגרי האבק זזים. נשימה איטית מתחת לסף המודע היא ההבדל
       בין „המשחק רץ“ לבין „זה צילום מסך“. היא נכבית ברגע שזזים. */
    const still = 1 - Math.min(1, gait * 3)
    if (still > 0.01) {
      idleT.current += dt
      target.y += Math.sin(idleT.current * 0.45) * 0.035 * still
      target.x += Math.sin(idleT.current * 0.31) * 0.02 * still
    }

    /* הפריים נפתח לכיוון ההליכה במקום להיות ממורכז על הגב, וככל
       שרצים מהר יותר — יותר. */
    const lead = 0.9 * rb
    lookV.current.set(
      live.player.x + Math.sin(heading.current) * lead,
      live.player.y + 1.5,
      live.player.z + Math.cos(heading.current) * lead,
    )

    if (tb > 0.002) {
      /* צילום־שניים: המצלמה עומדת הצידה, ניצב לקו שבין השחקן לדובר,
         בצד שבו היא כבר נמצאת — כדי לא לחצות את השיחה בדרך פנימה. */
      const sp = talkAnchor.current
      const mx = (live.player.x + sp.x) / 2
      const mz = (live.player.z + sp.z) / 2
      let ax = sp.z - live.player.z
      let az = -(sp.x - live.player.x)
      const al = Math.hypot(ax, az) || 1
      ax /= al
      az /= al
      if (ax * (camera.position.x - mx) + az * (camera.position.z - mz) < 0) {
        ax = -ax
        az = -az
      }
      /* How far back the two-shot stands has to come from the lens, not from
         the gap between the two people. It used to be `gap * 1.1 + 1.5`, and
         for Rawi — who walks at your shoulder, 1.45 m away — that put the
         camera 3.1 m out. At the 34° talk lens 3.1 m sees 1.9 m of width, and
         two bodies 1.45 m apart are about 1.95 m across: both were cropped at
         the frame edges with empty ground between them, which is what every
         arrival in the chapter opened on.

         So: take the width that has to fit — their separation plus a body
         each, plus margin — and solve for the distance at which the lens
         contains it. A pair standing further apart pushes the camera back on
         its own, which is the same thing a camera operator does. */
      const TALK_FOV = 34
      const spread = Math.hypot(sp.x - live.player.x, sp.z - live.player.z) + 0.9
      const halfNeeded = spread / 2 + 0.55
      let side = Math.max(2.7, halfNeeded / Math.tan((TALK_FOV / 2) * (Math.PI / 180)))
      /* אותה בדיקת עיגולים כמו מצלמת ההליכה, הפעם על הקרן מן האמצע
         החוצה — במעבדה קורת סוכך חצתה את הפריים, וזה הפתרון שכבר
         קיים במשחק לבעיה הזאת. */
      for (const c of [...STATIC_COLLIDERS, ...live.dynamic]) {
        const fx = mx - c.x
        const fz = mz - c.z
        const r = c.r + 0.12
        const b = fx * ax + fz * az
        const cc = fx * fx + fz * fz - r * r
        const disc = b * b - cc
        if (disc <= 0) continue
        const s = Math.sqrt(disc)
        const enter = -b - s
        if (-b + s > 0 && enter < side) side = Math.max(2.2, Math.min(side, enter - 0.1))
      }
      twoShotV.current.set(mx + ax * side, 1.9, mz + az * side)
      target.lerp(twoShotV.current, tb)
      /* המבט נודד אל נקודת האמצע, מעט מעל גובה החזה */
      lookV.current.lerp(twoShotV.current.set(mx, 1.55, mz), tb)
    }

    if (riseK > 0.001) {
      /* תנוחת הדגם מהמעבדה: הצידה, גבוה, מבט מטה אל ההולכים */
      twoShotV.current.set(live.player.x + 5.5, 7, live.player.z + 7.5)
      target.lerp(twoShotV.current, riseK)
      lookV.current.lerp(twoShotV.current.set(live.player.x, 0.9, live.player.z - 1.5), riseK)
    }

    /* Keep the lens out of the actors.
       Both blends above are straight lerps between two good camera positions,
       and the chord between them runs through whoever is standing in the
       middle — for a second or so on every conversation the frame was the
       inside of a robe. The colliders swept for props do not include people,
       and adding them there would also shove the follow camera around
       harmlessly-standing NPCs. This is the narrower rule: never end up inside
       the two bodies this shot is actually about. */
    const KEEP_OUT = 1.15
    for (const body of [live.player, talkAnchor.current]) {
      const dx = target.x - body.x
      const dz = target.z - body.z
      const d = Math.hypot(dx, dz)
      if (d < KEEP_OUT && d > 1e-4) {
        target.x = body.x + (dx / d) * KEEP_OUT
        target.z = body.z + (dz / d) * KEEP_OUT
      }
    }

    camera.position.lerp(target, Math.min(1, dt * (5 + riseK * 4)))
    camera.lookAt(lookV.current)
  })

  /* Undyed wool, not bleached cotton. The model's robe and head cloth are pure
     white, which reads as a modern Gulf thobe and ghutra — the wrong century
     entirely — and under a midday sun it clipped to a flat white silhouette
     with no folds left in it. Multiplying the texture by the colour undyed
     sheep's wool actually is puts the century back and keeps the cloth inside
     the exposure. */
  /* בלי tint. ב-three.js material.color מכפיל את טקסטורת הבסיס, ולכן
     ה-'#d6c5a6' שישב כאן הכהה כל פיקסל של השחקן ב-16%-35% ודחף אותו
     לצהוב — הוא היה הדמות היחידה במשחק שהוכהתה ידנית, מול NPC-ים
     שמוצגים בצבעם המלא. */
  /* הדגם המונפש: clone דרך SkeletonUtils — clone רגיל חולק שלד ומשאיר
     את העותק לא-קשור, ודמות סקינית קורסת בשקט. מנורמל לגובה 1.78 כמו
     קודמיו. */
  const { scene: walkScene, animations: walkAnims } = useGLTF(MODEL_TRAVELER_WALK)
  const model = useMemo(() => {
    const c = cloneSkinned(walkScene)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = false
      m.frustumCulled = false // skinned bounds go stale during clips
      /* הגלימה היא גיאומטריה פתוחה — בלי DoubleSide רואים את פנים
         הבד החיוור במקום הטקסטורה */
      ;(m.material as THREE.Material).side = THREE.DoubleSide
      /* הטקסטורה של player2 יוצאת מ-Meshy בהירה וקרירה מדי מול הפלטה,
         והחומר מגיע עם ברק PBR שמלבין אותה עוד. גוון חם עדין (לא הכהיה
         של 16% כמו ה-tint הישן שהוסר) ומאט מלא. */
      const pm = m.material as THREE.MeshStandardMaterial
      if (pm.isMeshStandardMaterial) {
        pm.color.set('#eadcbe')
        pm.roughness = 1
        pm.metalness = 0
      }
    })
    /* אותו נרמול כמו של ראאווי — עם עדכוני המטריצה שבלעדיהם Box3 מודד
       גיאומטריה גולמית בסנטימטרים והדמות נעלמת */
    fitToGround(c, 1.78)
    return c
  }, [walkScene])
  const { actions } = useAnimations(walkAnims, model)
  useEffect(() => {
    const walk = actions['walk']
    const idle = actions['idle']
    if (!walk) return
    /* תנוחת הכפיתה של הריג היא T-pose — חייב תמיד קליפ במשקל.
       idle ו-walk רצים יחד והמשקל נודד ביניהם, כמו אצל ראאווי. */
    walk.play()
    walk.setEffectiveWeight(0)
    if (idle) {
      idle.play()
      idle.setEffectiveWeight(1)
    }
    /* קליפ הריצה — חדש עם player2. אם הנכס הוחלף לישן שאין לו run,
       runAction נשאר null והמשקל כולו נשאר על ההליכה. */
    const run = actions['run']
    if (run) {
      run.play()
      run.setEffectiveWeight(0)
    }
    walkAction.current = walk
    idleAction.current = idle ?? null
    runAction.current = run ?? null
    return () => {
      walkAction.current = null
      idleAction.current = null
      runAction.current = null
    }
  }, [actions])

  // dev diagnostics: world-space bounds of the rendered figure
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const t = window.setInterval(() => {
      if (!group.current) return
      const box = new THREE.Box3().setFromObject(group.current)
      ;(window as unknown as Record<string, unknown>).__ch1Dbg = {
        min: box.min.toArray(),
        max: box.max.toArray(),
        walkWeight: walkAction.current?.getEffectiveWeight(),
      }
    }, 500)
    return () => window.clearInterval(t)
  }, [])

  return (
    <group ref={group}>
      <primitive object={model} />
      {/* הכתם שאומר שהשחקן נוגע בקרקע ולא שקוע בה */}
      <ContactShadow radius={0.5} />
    </group>
  )
}


/* Projects each placed character's approach ring to screen space and writes it
   straight to the DOM node — no per-frame React state. Also reports who is
   close enough to talk to. */
function MarkerProjector({ live, onNearChange, onNearFind, onAtTask, met, found, solved }: {
  live: Live
  onNearChange: (who: string | null) => void
  onNearFind: (id: string | null) => void
  onAtTask: (at: boolean) => void
  /** has this character said everything they have to say? */
  met: (who: string) => boolean
  found: string[]
  solved: string[]
}) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])
  /* read through refs: the frame loop must never act on a stale render */
  const foundRef = useRef(found)
  foundRef.current = found
  const solvedRef = useRef(solved)
  solvedRef.current = solved

  useFrame(() => {
    /* The gate onward, marked in the world itself. Every region has two ways
       out and nothing on screen said which one continued the journey, so the
       only way to find the road was to walk the whole boundary. The pin fades
       in past talking distance so it never sits on top of a conversation. */
    const gateEl = live.markerEls.get('__gate')
    const gate = ONWARD ? campLayout.exits?.find((e) => e.to === ONWARD) : null
    if (gateEl && gate) {
      /* Anchored above head height, and above the character bubbles too: at
         2.6 m the distance sat behind whoever happened to be standing between
         you and the gate. */
      v.set(gate.x, 5.2, gate.z)
      v.project(camera)
      const away = Math.hypot(live.player.x - gate.x, live.player.z - gate.z)
      const behind = v.z > 1
      gateEl.style.display = behind || away < 5 ? 'none' : ''
      if (!behind) {
        gateEl.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * size.width}px,${(-v.y * 0.5 + 0.5) * size.height}px)`
        const m = gateEl.querySelector('.poi-gate-dist')
        if (m) m.textContent = `${Math.round(away)} מ׳`
      }
    }
    /* (המרחק אל הדמות הקרובה נמדד כאן פעם, כדי להכריע בין E של
       שיחה ל-E של תחנת משימה. ההכרעה עברה לסדר הטיפול במקש, ולכן
       הלולאה על כל הדמויות בכל פריים נמחקה איתה.) */

    /* What is within reach on the ground. Same frame as the character check,
       so a find, a task station and a person all decide together which prompt
       the HUD is allowed to show — two prompts at once reads as a bug. */
    let bestFind: string | null = null
    let bestFindDist = FIND_RANGE
    for (const fd of REGION_FINDS) {
      /* עדות שכבר נבדקה עדיין מקבלת סמן — כבוי, בזית, בלי תווית.
         עד עכשיו הסמן פשוט נעלם, וחזרה למקום נראתה כמו סמן שנשבר
         במקום כמו „את זה כבר ראיתי“. הוא רק לא נספר יותר בתור
         הדבר הקרוב שאפשר ללחוץ עליו. */
      const done = foundRef.current.includes(fd.id)
      const d = Math.hypot(live.player.x - fd.x, live.player.z - fd.z)
      if (!done && d < bestFindDist) { bestFindDist = d; bestFind = fd.id }
      const el = live.markerEls.get('find:' + fd.id)
      if (el) {
        v.set(fd.x, groundYAt(fd.x, fd.z) + fd.h + 0.55, fd.z)
        v.project(camera)
        const behind = v.z > 1
        el.style.display = behind ? 'none' : ''
        if (!behind)
          el.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * size.width}px,${(-v.y * 0.5 + 0.5) * size.height}px)`
        el.classList.toggle('is-near', !done && d < FIND_RANGE)
        el.classList.toggle('is-done', done)
      }
    }
    if (bestFind !== live.nearFind) {
      live.nearFind = bestFind
      onNearFind(bestFind)
    }

    if (REGION_TASK) {
      const d = Math.hypot(live.player.x - REGION_TASK.x, live.player.z - REGION_TASK.z)
      /* The station and the person who sets the task stand in the same corner of
         the region — the envoy is two metres from his own toll scale. Both want
         E, so E goes to whichever you are actually closer to; otherwise the
         person wins every time and the station can never be used at all. */
      /* היה כאן גם `d < taskVsPerson`, כלומר המשימה נחשבת בהישג יד
         רק כשעומדים קרוב אליה יותר מאשר לאדם. במעבר הגבול מאזני
         המכס עומדים 2.25 מטר מהשליח, ולכן ההנחיה הבהבה עם כל תזוזה
         קטנה — ובמעבר מלא של הפרק המשימה הזאת פשוט לא נפתחה. הטווח
         עומד עכשיו בפני עצמו, וההכרעה בין השניים עברה למקום שבו היא
         שייכת: סדר הטיפול במקש. */
      const at = d < TASK_RANGE && !solvedRef.current.includes(REGION_TASK.id)
      if (at !== live.atTask) { live.atTask = at; onAtTask(at) }
      const el = live.markerEls.get('task')
      if (el) {
        v.set(REGION_TASK.x, groundYAt(REGION_TASK.x, REGION_TASK.z) + REGION_TASK.h + 0.9, REGION_TASK.z)
        v.project(camera)
        const behind = v.z > 1 || solvedRef.current.includes(REGION_TASK.id)
        el.style.display = behind ? 'none' : ''
        if (!behind)
          el.style.transform = `translate(-50%,-100%) translate(${(v.x * 0.5 + 0.5) * size.width}px,${(-v.y * 0.5 + 0.5) * size.height}px)`
        el.classList.toggle('is-near', at)
      }
    }

    let nearest: string | null = null
    let nearestDist = TALK_RANGE
    for (const c of CAST) {
      const el = live.markerEls.get(c.who)
      if (!el) continue
      v.set(c.x, 2.1, c.z)
      v.project(camera)
      const behind = v.z > 1
      el.style.display = behind ? 'none' : ''
      if (!behind) {
        const x = (v.x * 0.5 + 0.5) * size.width
        const y = (-v.y * 0.5 + 0.5) * size.height
        el.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`
      }
      const d = Math.hypot(live.player.x - c.x, live.player.z - c.z)
      /* A speaker with nothing left to say must stop calling you over — the
         bubble hanging above a finished conversation reads as an unfinished
         one, and sends the learner back across the region for nothing. */
      const done = met(c.who)
      el.classList.toggle('is-done', done)
      el.classList.toggle('is-near', !done && d < TALK_RANGE)
      if (!done && d < nearestDist) {
        nearestDist = d
        nearest = c.who
      }
    }
    if (nearest !== live.nearWho) {
      live.nearWho = nearest
      onNearChange(nearest)
    }
  })
  return null
}

/* The seam between regions. The chapter is one journey along one road, so the
   road's ends are doors: stand in one and the next region opens with you
   already inside its matching gate, facing in. Watched here rather than in the
   movement code so it stays a property of the world, not of walking. */
/** Closest approach of the step a→b to the point c. */
function segmentHitsCircle(a: { x: number; z: number }, b: { x: number; z: number }, c: { x: number; z: number }) {
  const dx = b.x - a.x
  const dz = b.z - a.z
  const len2 = dx * dx + dz * dz
  if (len2 < 1e-8) return Math.hypot(a.x - c.x, a.z - c.z)
  const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.z - a.z) * dz) / len2))
  return Math.hypot(a.x + dx * t - c.x, a.z + dz * t - c.z)
}

function ExitWatcher({ live, onReach }: { live: Live; onReach: (to: string, label: string) => void }) {
  /* Undefined until the first frame, then true if the traveller BEGAN inside a
     gate. Four regions spawn their player within their own back-gate circle, and
     you always arrive standing in the gate you came through — in both cases
     firing on contact would eject the player on the frame the region loads.
     A gate only triggers once you have stepped out of it and back in. */
  const armed = useRef<boolean | null>(null)
  const was = useRef<{ x: number; z: number } | null>(null)
  useFrame(() => {
    const exits = WORLD.layout.exits
    if (!exits?.length) return
    const prev = was.current ?? { x: live.player.x, z: live.player.z }
    was.current = { x: live.player.x, z: live.player.z }
    let inside: { to: string; label: string } | null = null
    for (const e of exits) {
      /* Test the whole step, not just where the frame ended: at low frame rates
         a stride can clear the gate entirely, and a crossing you can run past
         is a crossing that looks broken. */
      if (segmentHitsCircle(prev, live.player, e) < e.r) {
        inside = { to: e.to, label: e.label }
        break
      }
    }
    /* fire once on entering, and re-arm only after leaving — otherwise the
       crossing retriggers every frame you stand in the gate */
    if (armed.current === null) {
      /* first frame: if we start in a gate, hold it disarmed until we leave */
      armed.current = !!inside
      return
    }
    if (inside && !armed.current) {
      armed.current = true
      onReach(inside.to, inside.label)
    } else if (!inside) {
      armed.current = false
    }
  })
  return null
}

/* ---------------- camp layout ----------------
   One table drives placement AND collision. Every entry carries a footprint
   radius `r`; positions below are spacing-checked (scripts/check-camp.mjs) so
   no two models intersect and nothing buries a point of interest. */
interface CampProp {
  url: string
  /** campfire / torch props are rendered by their own component */
  role?: string
  x: number
  z: number
  ry: number
  h: number
  r: number
  tint?: string
  sink?: number
  widen?: number
}

/* Model names inside a layout map to the GLB files by filename; the handful
   that were imported under a different name are listed here. */
const MODEL_BY_NAME: Record<string, string> = {
  blacktent: MODEL_TENT,
  firepit: MODEL_FIREPIT,
  torch: MODEL_TORCH,
  palm: MODEL_PALM,
  well: MODEL_WELL,
  rocks: MODEL_ROCKS,
  jars: MODEL_JARS,
  firewood: MODEL_FIREWOOD,
  shrub: MODEL_SHRUB,
  camel: MODEL_CAMEL,
}

/** Everything the engine needs to stand a region up, derived from its layout. */
interface WorldDef {
  layout: Layout
  props: CampProp[]
  colliders: Collider[]
  herd: Layout['herd']
  cast: Placement[]
}

function buildWorld(regionId: string, layout: Layout): WorldDef {
  /* `worn-patch` is a ground decal drawn by <WornPatch/>, and `collider` is
     pure footprint — an invisible circle for masonry the walk-through models
     don't describe (the gate piers). Neither is a GLB. */
  const props: CampProp[] = layout.props
    .filter((p) => p.model !== 'worn-patch' && p.model !== 'collider')
    .map((p) => ({
    url: MODEL_BY_NAME[p.model] ?? `/assets/chapter1/models/${p.model}.glb`,
    x: p.x,
    z: p.z,
    ry: p.ry,
    h: p.h,
    r: p.r,
    tint: p.tint,
    sink: p.sink,
    widen: p.widen,
    role: p.role,
  }))
  return {
    layout,
    props,
    /* Derived from the props themselves, once. This used to be copied into
       mutable state inside an effect, which meant a hot reload (or any change
       that did not remount the World) left the OLD footprints in place —
       invisible walls where props used to stand, and no collision on the ones
       actually rendered. */
    /* `r: 0` means "no footprint", and it has to mean that here too. Without
       this filter every zero-radius prop still blocked a circle the width of
       the player: an invisible post under each pergola and inside each desert
       bush — and, worst of all, one dead in the middle of the gate-post's
       archway, which sealed the only opening in the border wall and made the
       chapter impossible to finish on foot. */
    colliders: [
      ...props.filter((p) => p.r > 0).map((p) => ({ x: p.x, z: p.z, r: p.r })),
      ...layout.props
        .filter((p) => p.model === 'collider' && p.r > 0)
        .map((p) => ({ x: p.x, z: p.z, r: p.r })),
      { ...layout.campfire },
    ],
    herd: layout.herd,
    cast: PLACEMENTS[regionId] ?? [],
  }
}

/* Built once per region at module load, so a region's footprints can never go
   stale and switching regions is a lookup rather than a rebuild. */
const WORLDS: Record<string, WorldDef> = Object.fromEntries(
  Object.entries(LAYOUTS).map(([id, layout]) => [id, buildWorld(id, layout)]),
)

/* The region being played. Everything below reads the world through this, so
   the engine no longer knows the name of any particular place. */
const WORLD: WorldDef = WORLDS[REGION.id]

/* Warm the cache for every model this region actually stands on. Without this,
   models the preload list above doesn't know about (anything that exists only
   in a layout) decode mid-walk — a multi-second frame freeze the first time
   the player turns toward them. */
for (const url of new Set(WORLD.props.map((p) => p.url))) useGLTF.preload(url)
const CAMP = WORLD.props
const STATIC_COLLIDERS = WORLD.colliders
const HERD = WORLD.herd
/* Extras' models start downloading with the region's own, so an extra whose
   model is not in the cast (a chief in Mecca) is not the last thing to arrive. */
for (const e of WORLD.layout.extras ?? []) {
  const extraUrl = MODEL[e.who as ExtraWho]
  if (extraUrl) useGLTF.preload(extraUrl)
}
const campLayout = WORLD.layout
const CAST = WORLD.cast

/* A track is not a different material from the ground it is worn into — it is
   the same earth, trodden flat and a shade darker. Painting every region's road
   in the same pale sand put a bright yellow stripe across the grey scree of the
   pass and the black soil of Mecca; both read as something spilled rather than
   something walked. Both the texture and the colour now come from whatever the
   region itself is standing on. */
const ROAD_GROUND = campLayout.terrain?.ground ?? 'sand.jpg'
const ROAD_TINT = (() => {
  const t = campLayout.terrain?.tint ?? '#cbb083'
  const rgb = (t.slice(1).match(/../g) ?? ['cb', 'b0', '83']).map((h) => parseInt(h, 16))
  return '#' + rgb.map((v) => Math.round(v * 0.72).toString(16).padStart(2, '0')).join('')
})()
const ROAD_MAT = {
  transparent: true,
  depthWrite: false,
  color: ROAD_TINT,
  roughness: 1,
  polygonOffset: true,
  polygonOffsetFactor: -1,
} as const

/* אור מילוי שנוסע עם המצלמה.

   השמש באזורים רבים עומדת מאחורי השחקן או מהצד, ולכן פנים של דמות
   שמסתובבת אליו נופלות לצל מלא. הורדת האור העקיף שהחזירה נפח לנוף
   העמיקה בדיוק את הבעיה הזאת. אור חלש מכיוון הצופה מחזיר קריאוּת
   לפנים ולידיים בלי לשנות מאיפה נופלים הצללים בעולם — ולכן הוא
   לא מטיל צל בעצמו.*/
/* מוקצים פעם אחת: כל אלה רצים בכל פריים */
const FILL_FWD = new THREE.Vector3()
const MOVE_DIR = new THREE.Vector3(0, 0, -1)
const WORLD_UP = new THREE.Vector3(0, 1, 0)

function ViewerFill({ intensity }: { intensity: number }) {
  const ref = useRef<THREE.DirectionalLight>(null)
  const { camera } = useThree()
  useFrame(() => {
    const l = ref.current
    if (!l) return
    /* מעט מעל ומימין לצופה, כדי שהמילוי ייקרא כאור סביבה ולא
       כפנס שמוצמד לפנים.

       המקור והמטרה חלקו קודם את אותם x ו-z, ולכן הכיוון היה בדיוק
       (0,-1,0) — אור מלמעלה שנגרר אחרי המצלמה. ב-DirectionalLight
       רק הכיוון קובע, ופנים הן משטח אנכי, ולכן N·L היה כמעט אפס:
       האור האיר חול וכתפיים ולא נגע בדבר היחיד שבשבילו הוא קיים.
       עכשיו הוא מכוון קדימה אל תוך הסצנה, ומוסט הצידה כדי שיישאר
       מילוי ולא פנס חזיתי. */
    FILL_FWD.set(0, 0, -1).applyQuaternion(camera.quaternion)
    FILL_FWD.y = 0
    if (FILL_FWD.lengthSq() < 1e-6) FILL_FWD.set(0, 0, -1)
    FILL_FWD.normalize()
    l.position.copy(camera.position)
    l.position.y += 2.2
    l.position.x -= FILL_FWD.z * 2.6
    l.position.z += FILL_FWD.x * 2.6
    l.target.position.set(
      camera.position.x + FILL_FWD.x * 7,
      0.95,
      camera.position.z + FILL_FWD.z * 7,
    )
    l.target.updateMatrixWorld()
  })
  return (
    <directionalLight ref={ref} intensity={intensity} color="#fff0e0" castShadow={false} />
  )
}

/* The hour this region is played at. The default is the low dusk the desert
   regions were lit for; a region that wants its own time of day says so in its
   layout and everything downstream — sky, fog, sun, fill, exposure — follows. */
const MOOD = {
  fog: campLayout.mood?.fog ?? { color: '#e2b285', near: 60, far: 460 },
  fill: campLayout.mood?.fill ?? { sky: '#ffeeda', ground: '#c2a687', intensity: 1.28 },
  sun: campLayout.mood?.sun ?? { position: [-18, 9, -14], color: '#ffd9a0', intensity: 3.6 },
  /* כמה אור מגיע מכיוון הצופה. זה היה מספר קבוע וגבוה — 1.55 — בכל
     תשעת האזורים, כלומר פי 3.7 עד 7.8 מהאור העקיף שכל אזור מגדיר
     לעצמו. אור מילוי שגדול פי כמה מהתאורה שהוא אמור להשלים אינו
     משלים אותה אלא מוחק אותה: הוא שיטח את כל תשעת העולמות לאותו
     תצלום שטוח, והתגובה לזה הייתה להעלות את השמש בכל אזור בנפרד —
     מה שרק העלה את הכל יחד. עכשיו זה שייך ל-mood כמו כל השאר. */
  viewerFill: campLayout.mood?.viewerFill ?? 0.42,
  /* עוצמת האיור — כמה מדרגות האור נאכפות. 0 מכבה את הטלאי כליל. */
  paint: campLayout.mood?.paint ?? 0.7,
  /* גרייד על הקנבס עצמו — CSS, לא GPU: חום, רוויה וניגודיות שנבדקו
     חיים לפני שנכתבו (scratchpad/lab.mjs). אזור רשאי לדרוס. */
  grade: campLayout.mood?.grade ?? 'saturate(1.16) contrast(1.06) sepia(.1) brightness(1.02)',
  /* וינייטה — אטימות הפינות. המסגרת שסוגרת את הפריים. */
  vignette: campLayout.mood?.vignette ?? 0.34,
}
const SUN_POS = MOOD.sun.position as [number, number, number]

/* The next region on the road, or null at the overlook where it ends. The
   minimap marks this gate in gold: a region you can walk out of in two
   directions and no sign of which one is onward is a region you get lost in. */
const ONWARD: string | null = PLAYABLE[PLAYABLE.indexOf(REGION.id) + 1] ?? null

/* What there is to do here besides listen: the evidence lying about, and the
   one thing this region asks you to work out. Both are data — adding either to
   a region is an edit to finds.ts or tasks.ts, never to this file. */
const REGION_FINDS = findsIn(REGION.id)
const REGION_TASK = taskIn(REGION.id)

/** Drop scattered spots that would clash with a prop or a person standing there. */
function filterFree(spots: { x: number; z: number; k: number }[], pad: number) {
  return spots.filter((p) => {
    for (const c of CAMP) if (Math.hypot(p.x - c.x, p.z - c.z) < c.r + pad) return false
    for (const c of CAST) if (Math.hypot(p.x - c.x, p.z - c.z) < 1.6 + pad) return false
    return Math.hypot(p.x, p.z + 6) > 2.4 // campfire
  })
}

/* The camel was split in Blender into a body plus four leg objects, each with
   its origin at the hip (scripts note: Blender 5.1's glTF exporter writes skin
   weights but omits the `skins` array, so a skinned rig cannot be used). Here
   the legs are simply rotated about their hips in a camel's pacing gait —
   both legs on one side swing together. */
const LEG_NAMES = ['leg_AL', 'leg_AR', 'leg_BL', 'leg_BR']

function useWalkingCamel(height: number) {
  const { scene } = useGLTF(MODEL_CAMEL_PARTS)
  const phase = useRef({ value: 0 })
  const { obj, legs } = useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = size.y > 0 ? height / size.y : 1
    c.scale.setScalar(s)
    c.position.y = -box.min.y * s

    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      m.frustumCulled = false
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) if (mat) (mat as THREE.Material).side = THREE.DoubleSide
    })

    const legs = LEG_NAMES.map((n) => c.getObjectByName(n)).filter((o): o is THREE.Object3D => !!o)
    return { obj: c, legs }
  }, [scene, height])
  return { obj, legs, phase }
}

function WanderingCamel({ live, cx, cz, rx, rz, speed, phase, h }: {
  live: Live
  cx: number
  cz: number
  rx: number
  rz: number
  speed: number
  phase: number
  h: number
}) {
  const g = useRef<THREE.Group>(null)
  const { obj: model, legs, phase: gaitPhase } = useWalkingCamel(h)
  const col = useMemo<Collider>(() => ({ x: cx + rx, z: cz, r: 1.5 }), [cx, cz, rx])

  useEffect(() => {
    live.dynamic.push(col)
    return () => {
      const i = live.dynamic.indexOf(col)
      if (i >= 0) live.dynamic.splice(i, 1)
    }
  }, [live, col])

  /* Cadence derived from ground speed so the feet do not skate: the shader
     swings each foot ±~0.3 m, i.e. a ~0.62 m step, and one step is half a
     gait cycle. */
  const groundSpeed = Math.abs(speed) * ((rx + rz) / 2)
  const gaitRate = (groundSpeed / 0.62) * Math.PI

  useFrame(({ clock }, dt) => {
    const el = g.current
    if (!el) return
    const t = clock.elapsedTime * speed + phase
    const x = cx + Math.cos(t) * rx
    const z = cz + Math.sin(t) * rz
    // heading follows the path tangent; the camel model's long axis is +Z
    const dx = -Math.sin(t) * rx * Math.sign(speed)
    const dz = Math.cos(t) * rz * Math.sign(speed)
    gaitPhase.current.value += dt * gaitRate
    const ph = gaitPhase.current.value
    for (const leg of legs) {
      const sideShift = leg.name.endsWith('L') ? 0 : Math.PI
      leg.rotation.x = Math.sin(ph + sideShift) * 0.34
    }
    // no vertical hop — a walking camel keeps its body level and sways sideways
    el.position.set(x, 0, z)
    el.rotation.y = Math.atan2(dx, dz)
    el.rotation.z = Math.sin(gaitPhase.current.value) * 0.028
    col.x = x
    col.z = z
  })

  return (
    <group ref={g}>
      <primitive object={model} />
    </group>
  )
}

/* Rawi walks the whole journey at the player's shoulder. His spot is anchored
   to the direction the player is TRAVELLING, never to the camera: looking
   around should not make your companion scurry in a circle around you. While
   the player stands still the target stays put, so a mouse drag leaves Rawi
   exactly where he was — he only turns his body to keep facing you. */
const RAWI_SIDE = 1.45
const RAWI_SPEED = 3.4
/* ── פתיחת המדריך ─────────────────────────────────────────────────────────
   מפגש היכרות מסונתז: אינו יושב ב-dialogue.json כי אינו נשען על המקור —
   אין בו אף טענה היסטורית, רק היכרות, תפקיד והזמנה. notebook: 0 מסמן
   שהוא לא נרשם במחברת. השאלות הן של השחקן; שתיהן נענות, אין שגויה. */
const INTRO_KEY = 'ch1:intro:v1'
const RAWI_INTRO: Encounter = {
  id: 'rawi-hello',
  speaker: 'rawi',
  notebook: 0,
  gesture: 'talk-happy',
  lines: [
    { source: '', text: 'שלום עליך, נוסע! חיכיתי לך. ראאווי שמי — מלווה שיירות, ואוסף סיפורים.' },
    { source: '', text: 'הדרך שלפנינו היא דרך הבשמים: מרמות תימן הירוקות האלה, דרך תחנות המסחר והמדבר, צפונה עד מכה.' },
    { source: '', text: 'אני אצעד לצידך. כל דבר ששווה לזכור — אכתוב במחברת המסע, ובסוף הדרך נדע איך נראה העולם שאל תוכו עתיד לבוא האסלאם.' },
    { source: '', text: 'קדימה — השער הראשון מחכה במעלה הדרך.' },
  ],
  choices: [
    {
      prompt: 'ראאווי — זה שם?',
      lines: [
        { source: '', text: 'זה גם שם וגם מקצוע: ראאווי פירושו מוסר־סיפורים. מה ששמעתי בדרכים אני נושא איתי — ומה שנגלה יחד, אספר הלאה.' },
      ],
    },
    {
      prompt: 'איך נדבר בדרך?',
      lines: [
        { source: '', text: 'קרא לי עם R בכל עת. ליד אנשים — E פותח שיחה, ו-F מרים דבר־מה מהקרקע אל המחברת.' },
      ],
    },
  ],
}

/* ── פעימת ההגעה ──────────────────────────────────────────────────────────
   שבעה מתשעת האזורים נפתחו בשקט מוחלט: שלט מכריז על שם המקום, נעלם, ומשם
   השחקן עומד במדבר בלי לדעת לאן ללכת ולמה. הדבר הראשון שיש לקרוא הגיע רק
   כשמצא לבד סמן — נמדד ברתמת explore: „NOTHING in 28s" בשבעה אזורים.

   ראאווי צועד לצידו בכל אזור, ולכן זה תפקידו: משפט אחד שאומר לאן הגענו ומה
   שווה כאן מבט. אלה אינם תוכן לימודי ולכן אינם ב-dialogue.json ואינם נושאים
   §: אין בהם שום טענה היסטורית — רק מקום, כיוון וסקרנות. אותו דפוס בדיוק
   של `rawi-hello`, ואותו `notebook: 0` שמוודא שהם לא גוזלים רשומה. כל טענה
   על העבר נשארת במפגשים המעוגנים. */
const ARRIVAL_KEY = (id: string) => `ch1:arrived:${id}:v1`
const RAWI_ARRIVALS: Record<string, { gesture: Gesture; text: string }> = {
  'night-camp': {
    gesture: 'talk',
    text: 'כאן נעצור ללילה. השיירה פורקת, והאנשים מדברים — זה הזמן הטוב ביותר לשאול. קרא לי ב-R כשתרצה.',
  },
  'border-post': {
    gesture: 'talk-nod',
    text: 'שים לב איך משתנה הדרך. מכאן והלאה יש למי לתת דין וחשבון — ויש שם אדם שיסביר לך למי.',
  },
  'narrow-pass': {
    gesture: 'talk',
    text: 'המעבר הזה צר, ומי ששולט בו שולט בכל מה שעובר. יש מדורה למעלה — ומי שיושב לידה יודע למה.',
  },
  'loading-road': {
    gesture: 'talk',
    text: 'דרך העמסה. כאן מעבירים סחורה מגב לגב — ולא רק סחורה עוברת בדרכים כאלה. לך, ואספר תוך כדי.',
  },
  yathrib: {
    gesture: 'talk-happy',
    text: 'ית׳רב. הדקלים והבארות הם הסיבה שיושבים כאן, ולא כולם שיושבים כאן הגיעו מאותו מקום.',
  },
  monastery: {
    gesture: 'talk-nod',
    text: 'מנזר, כאן, בקצה המדבר. מי שבחר לחיות ככה הרחק מכולם — כדאי לשמוע ממנו למה.',
  },
  mecca: {
    gesture: 'talk',
    text: 'מכה. הרבה דרכים נפגשות כאן, והרבה אמונות איתן. הסתובב לאט — הכל בעיר הזאת עומד במקומו מסיבה.',
  },
  exit: {
    gesture: 'talk-nod',
    text: 'זה המקום להביט אחורה. עברנו את כל הדרך — בוא נראה מה עומד מאחורינו.',
  },
}

function arrivalBeat(regionId: string): Encounter | null {
  const a = RAWI_ARRIVALS[regionId]
  if (!a) return null
  return {
    id: `rawi-arrive-${regionId}`,
    speaker: 'rawi',
    notebook: 0,
    gesture: a.gesture,
    lines: [{ source: '', text: a.text }],
  }
}

/* שער ליבה סגור אינו קיר שקוף: כשהמטייל נכנס לשער קדימה לפני שהליבה
   הושלמה, ראווי אומר דיאגטית מה בדיוק חסר ואיפה — לא הודעת מערכת,
   אלא בן-לוויה שמצביע. שערים אחורה לא נשערים לעולם. */
function coreHoldBeat(missing: string[]): Encounter {
  const hints = missing.map((id) => {
    const e = REGION.encounters.find((x) => x.id === id)
    if (e) {
      if (e.speaker === 'rawi') return 'יש לי עוד משהו לספר לך — קרא לי (R)'
      if (e.speaker === 'narrator') return 'יש כאן עוד רגע אחד שמחכה לקרות'
      return `${SPEAKERS[e.speaker]} עוד מחכה לדבר איתך (E)`
    }
    if (REGION_TASK && REGION_TASK.id === id) {
      return `${REGION_TASK.prompt} — התחנה של ${REGION_TASK.asker} (E)`
    }
    return id
  })
  const uniq = [...new Set(hints)]
  return {
    id: `rawi-hold-${REGION.id}`,
    speaker: 'rawi',
    notebook: 0,
    gesture: 'talk-nod',
    lines: [
      {
        source: '',
        text: `רגע — הדרך לא תברח. עוד לא סיימנו כאן: ${uniq.join(' · ')}. ואז נמשיך.`,
      },
    ],
  }
}

const RAWI_WALK_GAP = 0.45
const PLAYER_MOVE_EPS = 0.004

function RawiCompanion({ live, talking, gesture }: {
  live: Live
  talking: boolean
  gesture: RawiClip
}) {
  /* המדריך התחיל בנקודה קבועה שהיא נקודת הפתיחה של המחנה — באזור
     הראשון היא 21 מטר קדימה, ולכן הוא עמד באמצע השדה עד הצעד
     הראשון של השחקן ואז זינק אחורה. הוא מתחיל ליד מי שהוא מלווה. */
  const spawn = useMemo(entryPoint, [])
  /* בביקור הראשון ראאווי לא מתחיל צמוד לכתף אלא במעלה הדרך — והולך
     אל השחקן בזמן קריינות הפתיחה. כניסה של דמות, לא הופעה של מודל. */
  const introAhead = useMemo(() => {
    if (REGION.id !== 'yemen-heights' || typeof window === 'undefined') return false
    if (new URLSearchParams(window.location.search).get('from')) return false
    try {
      return !window.localStorage.getItem(INTRO_KEY)
    } catch {
      return false
    }
  }, [])
  const startZ = spawn.z - (introAhead ? 9 : 0)
  const pos = useRef(new THREE.Vector3(spawn.x + RAWI_SIDE, 0, startZ))
  const look = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3(spawn.x + RAWI_SIDE, 0, startZ))
  const prevPlayer = useRef(new THREE.Vector3(spawn.x, 0, spawn.z))
  const [clip, setClip] = useState<RawiClip>('idle')
  const clipRef = useRef<RawiClip>('idle')
  /** his actual ground speed this frame — the step rate is derived from it */
  const paceRef = useRef(0)

  useFrame((_, dt) => {
    const p = live.player
    const dx = p.x - prevPlayer.current.x
    const dz = p.z - prevPlayer.current.z
    const stepped = Math.hypot(dx, dz)

    // re-anchor only while actually walking, using the travel heading
    if (stepped > PLAYER_MOVE_EPS) {
      const heading = Math.atan2(dx, dz)
      target.current.set(
        p.x + Math.sin(heading + Math.PI / 2) * RAWI_SIDE,
        0,
        p.z + Math.cos(heading + Math.PI / 2) * RAWI_SIDE,
      )
    }
    prevPlayer.current.set(p.x, 0, p.z)

    const gap = pos.current.distanceTo(target.current)
    const moving = gap > RAWI_WALK_GAP && !talking
    if (moving) {
      /* הראוי הלך ב-3.4 מ״ש בזמן שהריצה היא 6, ובלי שום איבר של
         השגה — כלומר ספרינט אחד לרוחב האזור הראשון השאיר את המדריך
         כ-21 מטר מאחור, ומשם הוא כבר לא היה במסך בכלל. מדריך שאפשר
         לאבד הוא לא מדריך. הפער עצמו קובע את המהירות: קרוב — הליכה,
         רחוק — הוא מדלג חזרה לכתף ומתייצב. */
      const speed = gap > 4 ? 6.6 : gap > 2 ? 4.6 : RAWI_SPEED
      const stepLen = Math.min(speed * dt, gap - RAWI_WALK_GAP * 0.5)
      pos.current.lerp(target.current, stepLen / gap)
      look.current.copy(target.current)
      /* the distance he really covered, not the speed he was aiming for — the
         last step into the gap is clamped, and his feet should slow with it */
      paceRef.current = dt > 0 ? stepLen / dt : 0
    } else {
      /* Standing still, he watches whoever or whatever matters. Looking only at
         the player made him a man who never notices anything: you could stand
         nose-to-stone in front of a carved inscription and your guide would be
         staring at the back of your head. When the traveller is close enough to
         a piece of evidence or a task station for the prompt to be up, that is
         where his attention goes — the same thing a person walking beside you
         does, and the cheapest possible way to point without a line of dialogue. */
      const at = live.nearFind ? REGION_FINDS.find((f) => f.id === live.nearFind) : null
      const focus = at ?? (live.atTask && REGION_TASK ? REGION_TASK : null)
      if (focus) look.current.set(focus.x, 0, focus.z)
      else look.current.set(p.x, 0, p.z)
      paceRef.current = 0
    }
    const want: RawiClip = talking ? gesture : moving ? 'walk' : 'idle'
    if (want !== clipRef.current) {
      clipRef.current = want
      setClip(want)
    }
    /* מצלמת השיחה צריכה לדעת איפה ראאווי עומד — בלי להחזיק בו */
    live.rawiPos.x = pos.current.x
    live.rawiPos.z = pos.current.z
  })

  return <Rawi clip={clip} position={pos.current} lookAt={look.current} groundAt={groundYAt} speed={paceRef} />
}

function World({ live, onNearChange, onNearFind, onAtTask, talking, gesture, speakingWho, attendWho, onExit, met, found, solved }: {
  live: Live
  onNearChange: (who: string | null) => void
  onNearFind: (id: string | null) => void
  onAtTask: (at: boolean) => void
  met: (who: string) => boolean
  found: string[]
  solved: string[]
  talking: boolean
  gesture: RawiClip
  /** which placed character is mid-sentence, so only they gesture */
  speakingWho: string | null
  /** מי מהדמויות מפנה מבט אל ראאווי — כשההערה שלו היא שנאמרת */
  attendWho: string | null
  onExit: (to: string, label: string) => void
}) {
  /* Scatter rocks and shrubs only where they don't intersect a placed prop or
     a person standing there — this is what stops models growing through each other.
     The ring is the night-camp's dressing; other regions place everything through
     their layout, so the ring must not leak into them (the agave shrub is also a
     New-World plant — period-wrong everywhere but grandfathered in the camp). */
  const scattered = WORLD.layout.scatter !== false && REGION.id === 'night-camp'
  const rockSpots = useMemo(() => (scattered ? filterFree(scatterRing(11, 10, 23, 11), 1.6) : []), [scattered])
  const shrubSpots = useMemo(() => (scattered ? filterFree(scatterRing(18, 6, 23, 5), 1.1) : []), [scattered])

  return (
    <>
      <Sky />
      {/* Fog colour tracks the panorama's horizon band so distance melts into
          sky instead of cutting out against it. Every value here is the
          region's own — see `mood` in worlds.ts — with the border post's dusk
          as the default any region can simply not override. */}
      <fog attach="fog" args={[MOOD.fog.color, MOOD.fog.near, MOOD.fog.far]} />
      {/* fill low enough for form, high enough that the shadow side of rock
          reads as stone rather than a black cut-out */}
      <hemisphereLight args={[MOOD.fill.sky, MOOD.fill.ground, MOOD.fill.intensity]} />
      {/* מילוי מכיוון הצופה. בלעדיו כל פנים שהשמש מאחוריהן נקראות
          כחור שחור מתחת לכיסוי הראש — וזה מה שגורם לדמות טובה
          להיראות שבורה. הוא חלש בכוונה ולא מטיל צל: תפקידו רק
          להרים את הצד המוצל של פנים וידיים, בלי לשטח את העולם
          ובלי להתחרות בשמש שקובעת את הכיוון. */}
      <ViewerFill intensity={MOOD.viewerFill} />
      {/* sun agrees with the painted glow, so shadows fall where the sky says
          they should */}
      <directionalLight
        position={SUN_POS}
        intensity={MOOD.sun.intensity}
        color={MOOD.sun.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        /* 60 m of frustum stopped every shadow ~30 m out, so the walls, tower
           and outlying rocks stood on unshadowed sand. 100 m covers the whole
           dressed compound and the road beads either side of it. */
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        /* המרווח לאורך הנורמל הוגדל: על רשתות מחוספסות ערך נמוך
           הותיר פסים שחורים לאורך כל פאה. */
        shadow-normalBias={0.09}
      />
      {campLayout.terrain && (
          <BakedTerrain
            url={`/assets/chapter1/models/${campLayout.terrain.model}.glb`}
            hasImage={!!campLayout.terrain.hasImage}
            tint={(campLayout.terrain as { tint?: string }).tint}
          />
        )}
      {/* evidence lying where it would lie, and the region's task station */}
      {REGION_FINDS.map((fd) => (
        <Prop key={fd.id} url={`/assets/chapter1/models/${fd.model}.glb`} x={fd.x} z={fd.z} ry={fd.ry ?? 0} height={fd.h} />
      ))}
      {REGION_TASK && (
        <Prop
          url={`/assets/chapter1/models/${REGION_TASK.model}.glb`}
          x={REGION_TASK.x}
          z={REGION_TASK.z}
          ry={REGION_TASK.ry ?? 0}
          height={REGION_TASK.h}
        />
      )}

      {/* every placed prop comes from one spacing-checked layout table */}
      <StagedProps placed={CAMP.filter((p) => !p.role)} live={live} />
      {CAMP.filter((p) => p.role === 'campfire').map((p, i) => (
        <Campfire key={i} x={p.x} z={p.z} />
      ))}
      {/* camels that actually walk the valley */}
      {HERD.map((h, i) => (
        <WanderingCamel key={i} live={live} {...h} />
      ))}
      {rockSpots.map((p, i) => (
        <Prop key={`r${i}`} url={MODEL_ROCKS} x={p.x} z={p.z} ry={p.k * 6.28} height={0.5 + p.k * 0.7} />
      ))}
      {shrubSpots.map((p, i) => (
        <Prop key={`s${i}`} url={MODEL_SHRUB} x={p.x} z={p.z} ry={p.k * 6.28} height={0.4 + p.k * 0.35} />
      ))}
      {(campLayout.roads ?? []).map((r, i) =>
        r.pts ? (
          <RoadRibbon key={`road${i}`} pts={r.pts} w={r.w} />
        ) : (
          <Road key={`road${i}`} x={r.x!} z={r.z!} ry={r.ry} len={r.len!} w={r.w} />
        ),
      )}
      {campLayout.rugs.map((r, i) => (
        <Rug key={i} x={r.x} z={r.z} ry={r.ry} />
      ))}
      {campLayout.props.filter((p) => p.model === 'worn-patch').map((p, i) => (
        <WornPatch key={`wp${i}`} x={p.x} z={p.z} r={p.h} />
      ))}
      {campLayout.scrolls.map((r, i) => (
        <Scrolls key={i} x={r.x} z={r.z} />
      ))}
      {CAMP.filter((p) => p.role === 'torch').map((p, i) => (
        <Torch key={i} x={p.x} z={p.z} ry={p.ry} />
      ))}
      <Pebbles />
      <GrassTufts />
      <DustMotes />
      {CAST.map((c) => (
        <Npc key={c.who} who={c.who} position={[c.x, groundYAt(c.x, c.z), c.z]} rotationY={c.ry ?? 0} speaking={speakingWho === c.who} playerRef={{ current: c.who === attendWho ? live.rawiPos : live.player }} />
      ))}
      {/* הניצבים — אנשים שפשוט נמצאים שם. בלי שורות, בלי טבעת גישה, בלי
          פנייה אל השחקן; רק נשימה, גוון משלהם, וקוליידר כדי שלא הולכים
          דרכם. שוק בלי אנשים הוא תפאורה נטושה. */}
      {(WORLD.layout.walkers ?? []).map((w, i) => (
        <Suspense key={`w${i}`} fallback={null}>
          <WalkingExtra live={live} {...w} />
        </Suspense>
      ))}
      {(WORLD.layout.extras ?? []).map((e, i) => (
        /* גבול משלו לכל ניצב: ניצב שמודל שלו אינו בין דמויות האזור טוען
           אותו מחדש, ובתוך גבול העולם הטעינה הזאת החביאה את מכה כולה. */
        <Suspense key={`x${i}`} fallback={null}>
          <Extra live={live} who={e.who as ExtraWho} x={e.x} z={e.z} ry={e.ry ?? 0} tint={e.tint} />
        </Suspense>
      ))}
      <Player live={live} />
      <RawiCompanion live={live} talking={talking} gesture={gesture} />
      <MarkerProjector
        live={live}
        onNearChange={onNearChange}
        onNearFind={onNearFind}
        onAtTask={onAtTask}
        met={met}
        found={found}
        solved={solved}
      />
      <ExitWatcher live={live} onReach={onExit} />
    </>
  )
}

/* ---------------- HUD ---------------- */


function ControlsPanel({ pressed }: { pressed: Set<string> }) {
  /* לוח המקשים תפס רבע מהמסך לאורך כל המשחק. הוא נחוץ בדקה
     הראשונה ומיותר אחריה, ונוכחות קבועה שלו היא מה שגורם למסך
     להיקרא כהדגמה טכנית ולא כמשחק. הוא נסגר מעצמו ברגע שברור
     שהשחקן הבין — כלומר אחרי שהוא זז — ונפתח שוב ב-H. */
  const [open, setOpen] = useState(true)
  const movedAt = useRef<number | null>(null)

  useEffect(() => {
    const moving = ['w', 'a', 's', 'd'].some((k) => pressed.has(k))
    if (moving && movedAt.current === null) movedAt.current = Date.now()
  }, [pressed])

  /* השעון נמדד מרגע שהלוח נראה, לא מטעינת המסמך. `performance.now()`
     נספר מתחילת הניווט, ולכן טעינה איטית של האזור ועוד קריינות פתיחה
     יכלו לבלוע כמעט את כל עשרים ושתיים השניות — והלוח נסגר לפני
     שהשחקן קיבל שליטה. */
  const shownAt = useRef(Date.now())
  useEffect(() => {
    if (!open) return
    const t = window.setInterval(() => {
      /* נסגר 6 שניות אחרי הצעד הראשון, או אחרי 25 שניות בכל מקרה —
         מי שעומד ולא זז עדיין צריך לראות מה ללחוץ. */
      const since = movedAt.current ? Date.now() - movedAt.current : 0
      if ((movedAt.current && since > 6000) || Date.now() - shownAt.current > 25000) setOpen(false)
    }, 500)
    return () => window.clearInterval(t)
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') setOpen((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const key = (id: string, label: string) => (
    <i className={'hud-key' + (pressed.has(id) ? ' is-down' : '')}>{label}</i>
  )

  if (!open) {
    return (
      <button className="hud-controls-peek" onClick={() => setOpen(true)}>
        <i className="hud-key">H</i> מקשים
      </button>
    )
  }

  return (
    <section className="hud-panel hud-controls" aria-labelledby="ch1-keys-title">
      <h2 className="hud-title" id="ch1-keys-title">מקשים
        <button className="hud-controls-close" onClick={() => setOpen(false)} aria-label="לסגור">×</button>
      </h2>
      <div className="hud-keys">
        <span>{key('w', 'W')} קדימה</span>
        <span>{key('s', 'S')} אחורה</span>
        <span>{key('a', 'A')} שמאלה</span>
        <span>{key('d', 'D')} ימינה</span>
        <span>{key('shift', 'Shift')} ריצה</span>
        {/* מקש שמלמדים אותו ואין לו יעד באזור הזה נקרא כמשחק שבור,
            לא כאזור ריק: ברמות תימן אין דמויות ואין לראוי מה לומר,
            ומי שילחץ E או R יקבל שום דבר. המקשים מופיעים היכן
            שאפשר להשתמש בהם. */}
        {CAST.length > 0 && <span><i className="hud-key">E</i> שיחה עם דמות</span>}
        {REGION_TASK && <span><i className="hud-key">E</i> {REGION_TASK.prompt}</span>}
        <span><i className="hud-key">F</i> להביט מקרוב</span>
        {REGION.encounters.some((e) => e.speaker === 'rawi') && (
          <span><i className="hud-key">R</i> שיחה עם רָאוִי</span>
        )}
        <span><i className="hud-key">J</i> מחברת</span>
        <span><i className="hud-key">M</i> מפה</span>
        <span>גרירת עכבר — סיבוב מבט</span>
      </div>
    </section>
  )
}




/* How each model reads from above. A minimap that shows only people and the
   player is a compass with no landmarks on it — you cannot tell the market from
   the pass, and you certainly cannot tell where the road leaves. Everything
   here is derived from the layout the region is actually built from, so the map
   can never drift out of step with the world. */
function planKind(model: string): 'built' | 'stone' | 'green' | 'water' | null {
  if (/tent|house|tower|wall|gate|way|shrine|kaaba|altar|stall|pergola|ruin/.test(model)) return 'built'
  if (/rock|boulder|butte|mesa|scree|cliff|stone/.test(model)) return 'stone'
  if (/palm|shrub|bush|tree|grape|vine|fodder/.test(model)) return 'green'
  if (/well|cistern|trough|water/.test(model)) return 'water'
  return null
}
const PLAN_FILL: Record<string, string> = {
  built: 'rgba(96,66,40,.85)',
  stone: 'rgba(120,110,96,.7)',
  green: 'rgba(96,116,64,.8)',
  water: 'rgba(84,124,140,.9)',
}

/* Drawn once per region: the ground plan never changes while you walk it, and
   re-deriving it on every position tick was the whole map's cost. */
const PLAN = (() => {
  const bound = campLayout.bound ?? 24
  const shapes = campLayout.props
    .map((p) => ({ kind: planKind(p.model), x: p.x, z: p.z, r: Math.max(p.r, 0.5) }))
    .filter((p): p is { kind: 'built' | 'stone' | 'green' | 'water'; x: number; z: number; r: number } => !!p.kind)
  const roads = (campLayout.roads ?? []).map((r) =>
    r.pts?.length
      ? r.pts.map((p) => `${p.x},${p.z}`).join(' ')
      : (() => {
          const half = (r.len ?? 0) / 2
          const s = Math.sin(r.ry ?? 0)
          const c = Math.cos(r.ry ?? 0)
          return `${(r.x ?? 0) - s * half},${(r.z ?? 0) - c * half} ${(r.x ?? 0) + s * half},${(r.z ?? 0) + c * half}`
        })(),
  )
  return { bound, shapes, roads, exits: campLayout.exits ?? [] }
})()

function MiniMap({ pos, yaw, met, found, solved }: {
  pos: { x: number; z: number }
  yaw: number
  met: (who: string) => boolean
  /** ids already collected / already worked out, so the map can grey them out */
  found: string[]
  solved: string[]
}) {
  const R = 78 // map radius in viewBox units
  /* The whole region, not a fixed 28 m window. Every layout declares its own
     walkable radius — Yathrib's is 46 — so a fixed window drew the player
     walking off the edge of their own map and losing the road entirely. */
  const S = R / (PLAN.bound + 2)
  const cx = 84
  const cy = 84
  const onward = PLAN.exits.find((e) => e.to === ONWARD)
  return (
    <div className="hud-panel hud-map" aria-hidden="true">
      <svg viewBox="0 0 168 168">
        <defs>
          <clipPath id="mapClip">
            <circle cx={cx} cy={cy} r={R} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={R} fill="rgba(36,25,16,.62)" />
        <g clipPath="url(#mapClip)">
          {/* the ground the region stands on */}
          <circle cx={cx} cy={cy} r={PLAN.bound * S} fill="rgba(214,186,140,.16)" />
          {/* the worn road, which is the thing you are meant to follow */}
          {PLAN.roads.map((pts, i) => (
            <polyline
              key={`road${i}`}
              points={pts
                .split(' ')
                .map((p) => {
                  const [px, pz] = p.split(',').map(Number)
                  return `${cx + px * S},${cy + pz * S}`
                })
                .join(' ')}
              fill="none"
              stroke="rgba(226,200,150,.32)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {PLAN.shapes.map((p, i) => (
            <circle key={i} cx={cx + p.x * S} cy={cy + p.z * S} r={Math.max(1.1, p.r * S)} fill={PLAN_FILL[p.kind]} />
          ))}
          {/* the gates: the road out, and the road back */}
          {PLAN.exits.map((e) => (
            <g key={e.to}>
              <circle
                cx={cx + e.x * S}
                cy={cy + e.z * S}
                r={Math.max(4, e.r * S)}
                fill={e === onward ? 'rgba(199,154,60,.3)' : 'rgba(210,210,210,.12)'}
                stroke={e === onward ? 'rgba(226,182,84,.95)' : 'rgba(226,220,206,.4)'}
                strokeWidth="1.6"
              />
              {e === onward && (
                <circle cx={cx + e.x * S} cy={cy + e.z * S} r="2" fill="rgba(240,206,124,1)" />
              )}
            </g>
          ))}
          {/* Evidence and the region's task. These were the only two things the
              map left out — and they are exactly the two the player has to go
              looking for, up to 16 m off the road. A detour you can see on the
              map is a decision; the same detour unmarked is just an empty
              stretch of sand you never walk into. */}
          {REGION_FINDS.map((fd) => (
            <g key={fd.id} opacity={found.includes(fd.id) ? 0.5 : 1}>
              <circle
                cx={cx + fd.x * S}
                cy={cy + fd.z * S}
                r="3.2"
                fill={found.includes(fd.id) ? 'rgba(124,138,79,.9)' : 'rgba(232,191,118,.95)'}
                stroke="rgba(24,15,9,.85)"
                strokeWidth="1.2"
              />
            </g>
          ))}
          {REGION_TASK && (
            <g opacity={solved.includes(REGION_TASK.id) ? 0.5 : 1}>
              <circle
                cx={cx + REGION_TASK.x * S}
                cy={cy + REGION_TASK.z * S}
                r="4.2"
                fill="none"
                stroke={solved.includes(REGION_TASK.id) ? 'rgba(124,138,79,.95)' : 'rgba(240,206,124,.95)'}
                strokeWidth="1.8"
              />
              <circle
                cx={cx + REGION_TASK.x * S}
                cy={cy + REGION_TASK.z * S}
                r="1.4"
                fill={solved.includes(REGION_TASK.id) ? 'rgba(124,138,79,.95)' : 'rgba(240,206,124,.95)'}
              />
            </g>
          )}
          {/* the people of this region sit on top of everything */}
          {CAST.map((c) => (
            <g key={c.who}>
              <circle
                cx={cx + c.x * S}
                cy={cy + c.z * S}
                r="5"
                fill={met(c.who) ? 'rgba(124,138,79,.95)' : 'rgba(199,154,60,.95)'}
                stroke="rgba(24,15,9,.9)"
                strokeWidth="1.4"
              />
              {!met(c.who) && (
                <circle cx={cx + c.x * S} cy={cy + c.z * S} r="9" fill="none" stroke="rgba(199,154,60,.35)" />
              )}
            </g>
          ))}
          {/* the player, as an arrow pointing where the camera looks */}
          <g transform={`translate(${cx + pos.x * S} ${cy + pos.z * S}) rotate(${(yaw * 180) / Math.PI})`}>
            <path d="M0,-8 L5.5,6 L0,3 L-5.5,6 Z" fill="var(--cream)" stroke="var(--maroon)" strokeWidth="1.4" />
          </g>
        </g>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--glass-edge)" strokeWidth="2" />
        <circle cx={cx} cy={cy} r={R - 7} fill="none" stroke="rgba(245,236,214,.1)" />
        <text x={cx} y="17" textAnchor="middle" fill="var(--gold-soft)" fontSize="11" fontWeight="600">N</text>
      </svg>
    </div>
  )
}

/* The end of the road.
 *
 * The chapter had no close: you walked the last stretch to the overlook, heard
 * Rawi's last line, and were left standing in the sand with nothing to say the
 * journey was over and no way out but the browser's back button. A journey that
 * does not end does not read as a journey.
 *
 * It appears only where the road actually stops, and only once everything that
 * region has to say has been said. */
function ChapterEnd({ done, evidence, onNotebook, onMap, onLeave, onClose }: {
  done: number
  /** how much of the evidence was actually picked up along the way */
  evidence: number
  onNotebook: () => void
  onMap: () => void
  onLeave: () => void
  /** back to the overlook — the card must not be a dead end */
  onClose: () => void
}) {
  /* הרגע היחיד בפרק שאומר „סיימת“. עד עכשיו הוא הופיע בשקט מוחלט. */
  useEffect(() => { cue('find') }, [])
  return (
    <div className="ch1-end" role="dialog" aria-labelledby="ch1-end-title">
      <div className="ch1-end-card">
        <p className="ch1-end-eyebrow">סוף המסע</p>
        <h2 id="ch1-end-title">ערב עליית האסלאם</h2>
        <p className="ch1-end-body">
          הלכתם מרמות תימן עד מכה — תשע תחנות, דרך אחת. פגשתם שליח של אימפריה,
          ראש שבט, סוחר יהודי, נזיר וסוחר מכי, וכל אחד מהם סיפר לכם על העולם
          שלו במילים שלו.
        </p>
        <p className="ch1-end-count">
          נרשמו במחברת {done} מתוך {NOTEBOOK_TOTAL} רשומות
          {' · '}
          נאספו {evidence} מתוך {FINDS_TOTAL} עדויות
        </p>
        <div className="ch1-end-actions">
          <button type="button" className="hud-card-btn is-primary" onClick={onNotebook}>
            פתחו את המחברת
          </button>
          <button type="button" className="hud-card-btn" onClick={onMap}>
            מפת המסע
          </button>
          <button type="button" className="hud-card-btn" onClick={onLeave}>
            לכל הפרקים
          </button>
          <button type="button" className="hud-card-btn" onClick={onClose}>
            להישאר במשקיף
          </button>
        </div>
      </div>
    </div>
  )
}

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    /* שני פריימים אחרי שה-Suspense נפתר: הראשון הוא זה שבו הסצנה
       נצבעת לראשונה, והמתנה לו מונעת הבזק של מסך ריק בין הלוח
       שנעלם לבין התמונה שמופיעה.

       שני המזהים נתפסים. קודם רק החיצוני נשמר, והפנימי היה בלתי
       ניתן לביטול — מה שמסתדר רק כל עוד האפקט רץ פעם אחת, והוא רץ
       שוב בכל רינדור של המשחק (חזרת מקש היא כ-30 פעם בשנייה). */
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(onReady)
    })
    return () => {
      cancelAnimationFrame(outer)
      if (inner) cancelAnimationFrame(inner)
    }
  }, [onReady])
  return null
}

/* ---------------- game shell ---------------- */

export default function Game() {
  const router = useRouter()
  const live = useMemo(makeLive, [])
  const [nearWho, setNearWho] = useState<string | null>(null)
  /* What is under the traveller's hand right now, and what they have already
     written down. Evidence and tasks live in the same store as the encounters,
     so the notebook is still the one progress surface the chapter has. */
  const [nearFind, setNearFind] = useState<string | null>(null)
  const [atTask, setAtTask] = useState(false)
  const [found, setFound] = useState<string[]>([])
  const [solved, setSolved] = useState<string[]>([])
  const [openFind, setOpenFind] = useState<Find | null>(null)
  /* מי מדבר בשורה הנוכחית — לא מי בעל המפגש: הדמות מחווה רק כשהשורה
     שלה על המסך, ומפנה מבט אל ראאווי כשהוא זה שמעיר. */
  const [stepSpeaker, setStepSpeaker] = useState<string | null>(null)
  const [openTask, setOpenTask] = useState(false)
  /* מצב המשימה חי כאן ולא בפאנל: גם הכפתורים וגם גרירת החפצים
     עוברים דרך אותו chooseTask, וסגירת הפאנל לא מאבדת התקדמות —
     בארגז ההעמסה שתי תשובות נכונות, וסגירה בין שתיהן היא לגיטימית. */
  const [taskChosen, setTaskChosen] = useState<string[]>([])
  const [taskLast, setTaskLast] = useState<string | null>(null)
  /* Whether the last answer landed. A choose task reads it off `right`; a sort
     task cannot, because every item is right somewhere — what matters is which
     side it was put on, and the miss carries its own correction. */
  const [taskLastOk, setTaskLastOk] = useState(false)
  const taskSolved = REGION_TASK ? solved.includes(REGION_TASK.id) : false
  /* ההשלמה נבדקת כאן ולא בתוך ה-updater: setState בתוך updater רץ בפאזת
     הרנדור (וב-StrictMode פעמיים), וזה בדיוק ה-"Issue" האדום שקפץ ברגע
     שפתרו משימה. אפקט אחד לשני מסלולי המענה. */
  useEffect(() => {
    if (!REGION_TASK || taskSolved) return
    const sortLike = ['sort', 'connect', 'observe'].includes(REGION_TASK.kind ?? '')
    const needed = (sortLike ? REGION_TASK.options : REGION_TASK.options.filter((o) => o.right)).map((o) => o.id)
    if (needed.length && needed.every((n) => taskChosen.includes(n))) {
      setSolved(recordTask(REGION_TASK.id).solved)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskChosen, taskSolved])
  const chooseTask = useCallback(
    (id: string) => {
      if (!REGION_TASK) return
      const opt = REGION_TASK.options.find((o) => o.id === id)
      if (!opt) return
      setTaskLast(id)
      setTaskLastOk(!!opt.right)
      if (!opt.right) return
      setTaskChosen((prev) => (prev.includes(id) ? prev : [...prev, id]))
    },
    [],
  )
  /* Sorting: an item is placed on one side. Solved when every item sits on its
     own side — so the count that closes the task is all of them, not the one
     answer a choose task waits for. */
  const sortTask = useCallback(
    (itemId: string, binId: string) => {
      if (!REGION_TASK || !['sort', 'connect', 'observe'].includes(REGION_TASK.kind ?? '')) return
      const opt = REGION_TASK.options.find((o) => o.id === itemId)
      if (!opt) return
      setTaskLast(itemId)
      const ok = opt.bin === binId
      setTaskLastOk(ok)
      if (!ok) return
      setTaskChosen((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]))
    },
    [],
  )
  /* גרירה שנחתה על התחנה עונה — ופותחת את הפאנל כדי שההערה תיקרא */
  const chooseByDrop = useCallback(
    (id: string) => {
      chooseTask(id)
      cue('task')
      setOpenTask(true)
    },
    [chooseTask],
  )
  const [soundOff, setSoundOff] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const onSceneReady = useCallback(() => setSceneReady(true), [])
  const [mapPos, setMapPos] = useState({ x: 0, z: 4 })
  const [mapYaw, setMapYaw] = useState(0)
  const [pressed, setPressed] = useState<Set<string>>(() => new Set())

  /* Region dialogue. `encounter` is whoever is speaking right now; `notebook`
     counts the 26 things Rawi has written down so far. */
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [notebook, setNotebook] = useState(() => notebookCount())
  const [seen, setSeen] = useState<string[]>([])
  const encounterRef = useRef<Encounter | null>(null)
  encounterRef.current = encounter
  /* מצלמת השיחה קוראת מ-live, לא מ-props — כמו כל מה שרץ בקצב פריימים.
     קריין אין לו גוף בעולם, ולכן שיחה שלו לא מזיזה את המצלמה. */
  useEffect(() => {
    live.talk = encounter && encounter.speaker !== 'narrator' ? { who: encounter.speaker } : null
  }, [encounter, live])

  /* The notebook (J) and the map (M) are full surfaces, not HUD panels: while
     one is open the world below is frozen, so the key handler reads this ref
     rather than the state it closes over. */
  const [overlay, setOverlay] = useState<'notebook' | 'map' | null>(null)

  /* הפינאלה. הכרטיס לבדו קפץ על מסך רגיל של כתף — סוף שטוח לדרך של תשעה
     אזורים. עכשיו סוף הפרק משתמש באותה מחוות מצלמה של מעברי האזורים:
     המצלמה עולה אל הדגם (riseAt), העולם נהיה דיורמה, ורק אז הכרטיס מופיע
     מעליו. הסגירה מחזירה את המצלמה ואת השיטוט — ולא קופצת שוב: מי שסגר
     סגר. דגל ההשלמה של מסך הפרקים נכתב ברגע שהמסע הושלם. */
  const [finale, setFinale] = useState<'none' | 'rising' | 'card' | 'closed'>('none')
  const finaleEligible =
    !ONWARD && !encounter && REGION.encounters.length > 0 && REGION.encounters.every((e) => seen.includes(e.id))
  useEffect(() => {
    if (!finaleEligible || finale !== 'none') return
    live.riseAt = performance.now()
    cue('gate')
    try {
      localStorage.setItem('islam:chapter:1', 'done')
    } catch {}
    setFinale('rising')
    window.setTimeout(() => setFinale('card'), 2400)
  }, [finaleEligible, finale, live])

  /* Crossing into the next region. The world is built at module scope, so the
     handover is a navigation rather than a rebuild — but the learner should
     read it as walking on, so the road's name appears, the screen holds it for
     a beat, and the next region opens with them already inside its gate. */
  const [travelTo, setTravelTo] = useState<{ to: string; label: string } | null>(null)
  const travelling = useRef(false)
  /* שער הליבה: היציאה קדימה נפתחת רק כשמה שהאזור קיים בשבילו נעשה.
     עדויות אופציונליות לא נספרות כאן, ואחורה תמיד פתוח — אי אפשר
     להיתקע, רק אי אפשר לדלג. */
  const coreMissing = (REGION.core ?? []).filter((id) => !seen.includes(id) && !solved.includes(id))
  const coreMissingRef = useRef<string[]>([])
  coreMissingRef.current = coreMissing
  const coreHeldAt = useRef(0)

  const travel = useCallback(
    (to: string, label: string) => {
      if (travelling.current) return
      travelling.current = true
      live.keys.clear()
      cue('gate')
      /* מחוות היציאה: המצלמה עוזבת את הכתף ומתרוממת עד שהאזור נקרא
         כדגם — העולם של הפרק הוא הדגם שראאווי בונה בזיכרונו, ורגע
         הפרידה מאזור הוא הרגע להגיד את זה. הבאנר מחכה לה (delay
         ב-CSS) ומחשיך רק בסוף, רגע לפני טעינת המסמך הבא. נבחן חי:
         scratchpad/lab3.mjs `rise`. */
      live.riseAt = performance.now()
      setTravelTo({ to, label })
      window.setTimeout(() => {
        /* A full document load, not router.push: the region, its world and its
           colliders are all built once at module scope, so a soft navigation
           would change the URL and leave the traveller standing in the old
           region's geometry. The dimmed banner covers the reload. */
        window.location.assign(`${window.location.pathname}?region=${to}&from=${REGION.id}`)
      }, 2100)
    },
    [live],
  )

  /* כניסה לשער קדימה עם ליבה חסרה לא מעבירה אזור — היא מקבלת את ראווי,
     שאומר מה חסר. קירור קצר כדי שעמידה בתוך השער לא תפתח את אותה שורה
     שוב ושוב. */
  const guardedTravel = useCallback(
    (to: string, label: string) => {
      if (to === ONWARD && coreMissingRef.current.length > 0) {
        if (encounterRef.current) return
        const now = performance.now()
        if (now - coreHeldAt.current < 4000) return
        coreHeldAt.current = now
        cue('ui')
        setEncounter(coreHoldBeat(coreMissingRef.current))
        return
      }
      travel(to, label)
    },
    [travel],
  )

  const overlayRef = useRef<'notebook' | 'map' | null>(null)
  overlayRef.current = overlay
  /* one gate for "something is already on screen", so a keypress cannot open a
     second panel behind the first */
  const openRef = useRef(false)
  openRef.current = !!openFind || openTask || finale === 'card'

  /* Escape סגר דיאלוג, מחברת ומפה — אבל לא כרטיס ראיה, לוח משימה או את
     כרטיס הסיום. מקש אחד לסגירה חייב לעבוד על כל מה שנפתח. הפעולה נקראת
     דרך ref כי מטפל המקלדת נרשם פעם אחת. */
  const escActionRef = useRef<() => boolean>(() => false)
  escActionRef.current = () => {
    if (openFind) {
      setOpenFind(null)
      return true
    }
    if (openTask) {
      setOpenTask(false)
      return true
    }
    if (finale === 'card') {
      live.riseAt = 0
      setFinale('closed')
      return true
    }
    return false
  }

  /* מקש שהוחזק לחוץ ברגע שנפתחה שיחה נשאר לחוץ — ה-keydown הבא הוא
     שמנקה אותו, ועד אז השחקן ממשיך ללכת מתחת לחלון. הדרך היחידה
     לעצור אותו היא לנקות ברגע הפתיחה עצמו. */
  useEffect(() => {
    if (encounter || openFind || openTask) {
      live.keys.clear()
      setPressed(new Set())
    }
  }, [encounter, openFind, openTask, live])

  useEffect(() => {
    const store = readNotebook()
    setSeen(store.seen)
    setFound(store.found)
    setSolved(store.solved)
    setNotebook(notebookCount(store))
    /* The map has to know which pin is „you are here“ even on a cold start. */
    setRegion(REGION.id)
  }, [])

  /** The next thing Rawi himself has to say here, or null when he is done. */
  const pendingEncounter = useMemo(
    () => REGION.encounters.find((e) => e.speaker === 'rawi' && !seen.includes(e.id)) ?? null,
    [seen],
  )

  /** The next thing a placed character has to say, in dialogue.json order. */
  const nextFrom = useCallback(
    (who: string) => REGION.encounters.find((e) => e.speaker === who && !seen.includes(e.id)) ?? null,
    [seen],
  )

  /** Has this character said everything they have to say? Drives the map dot. */
  const met = useCallback((who: string) => !nextFrom(who), [nextFrom])

  const finishEncounter = useCallback((e: Encounter) => {
    /* גם beat בלי רשומה (notebook 0) חייב להיזכר ב-seen — טריגר task:/after:
       בודק את seen, ובלי הרישום הוא ירה שוב 900ms אחרי כל סגירה: לולאת
       הדיאלוג האינסופית של המחנה מדוח השחקנית. הרשומה עצמה עדיין נתפסת
       רק כשיש מספר מחברת. */
    const store = recordEncounter(e.id, e.notebook)
    setSeen(store.seen)
    setNotebook(notebookCount(store))
  }, [])

  /* פתיחת המדריך: בביקור הראשון ברמות תימן ראאווי מתחיל במעלה הדרך
     והולך אל השחקן בזמן קריינות הפתיחה. כשהיא נסגרת — הוא כבר כאן,
     ומציג את עצמו בצילום־שניים. פעם אחת בלבד. */
  const prevEncounterId = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevEncounterId.current
    prevEncounterId.current = encounter?.id ?? null
    if (encounter || prev !== 'opening') return
    if (REGION.id !== 'yemen-heights') return
    try {
      if (window.localStorage.getItem(INTRO_KEY)) return
      window.localStorage.setItem(INTRO_KEY, '1')
    } catch {
      return
    }
    const t = window.setTimeout(() => setEncounter(RAWI_INTRO), 700)
    return () => window.clearTimeout(t)
  }, [encounter])

  /* The narrator has no body to stand next to and no key of his own, so the two
     encounters he carries — the chapter's opening line and the birds over
     Abraha's army — had no way to fire at all. The notebook could never fill,
     and the very first thing the chapter says was unreachable.

     They play as the region opens: a beat you walk into rather than press. */
  useEffect(() => {
    /* הטיימר נספר קודם מרגע ההרכבה, בזמן שלוח ההגעה עדיין מכסה את
       המסך — והלוח יושב ב-z-index 39 מול 10 של החלונית. כלומר
       המשפט הראשון של הפרק נפתח מאחורי מסך אטום והקלדתו הסתיימה
       לפני שמישהו ראה אותו. הוא מחכה עכשיו לרגע שבו האזור באמת
       על המסך. */
    if (!sceneReady) return
    const heard = readNotebook().seen
    const cine = REGION.encounters.find(
      (e) => e.speaker === 'narrator' && !heard.includes(e.id) && (e.trigger ?? 'arrive') === 'arrive',
    )
    if (!cine) return
    const t = window.setTimeout(() => setEncounter(cine), 1100)
    return () => window.clearTimeout(t)
  }, [sceneReady])

  /* Rawi's word on arrival — the region says where you are, he says why you
     would walk anywhere. It waits for the arrival plate to clear and for any
     narrator cinematic the region opens with, so it lands as the first thing
     said rather than on top of the film. Once per region, ever. */
  /* Fires once, on arrival, and never re-arms. Keyed off `sceneReady` alone:
     an earlier version also depended on `encounter`, so the timer restarted
     every time a panel closed — the greeting could then open minutes later,
     on top of the player walking up to a piece of evidence, and F is correctly
     refused while a dialogue is up. `check-notebook` caught it as two finds
     that did nothing. */
  const arrivalFired = useRef(false)
  useEffect(() => {
    if (!sceneReady || arrivalFired.current) return
    const beat = arrivalBeat(REGION.id)
    if (!beat) return
    /* a region that opens on the narrator gets its cinematic first; the
       greeting follows it, not over it */
    const heard = readNotebook().seen
    const cinePending = REGION.encounters.some(
      (e) => e.speaker === 'narrator' && !heard.includes(e.id) && (e.trigger ?? 'arrive') === 'arrive',
    )
    if (cinePending) return
    try {
      if (window.localStorage.getItem(ARRIVAL_KEY(REGION.id))) return
      window.localStorage.setItem(ARRIVAL_KEY(REGION.id), '1')
    } catch {
      return
    }
    arrivalFired.current = true
    const t = window.setTimeout(() => {
      /* if the player already got into something in the meantime, the moment
         for a greeting has passed — say nothing rather than interrupt */
      setEncounter((cur) => cur ?? beat)
    }, 1400)
    return () => window.clearTimeout(t)
  }, [sceneReady])

  /* A beat that waits for its setup. `birds-cinematic` is the payoff to
     `abraha-story`; `task:` beats fire when a station is worked out — the
     loading road's "what was never packed travelled anyway" line lands right
     after the crate closes. No marker to find, no key to press: a payoff is
     not something the player goes and collects. */
  useEffect(() => {
    if (!sceneReady || encounter) return
    const heard = new Set(seen)
    const worked = new Set(solved)
    const due = REGION.encounters.find((e) => {
      if (heard.has(e.id)) return false
      const t = e.trigger ?? 'arrive'
      if (t.startsWith('after:')) return heard.has(t.slice(6))
      if (t.startsWith('task:')) return worked.has(t.slice(5))
      return false
    })
    if (!due) return
    const t = window.setTimeout(() => setEncounter(due), 900)
    return () => window.clearTimeout(t)
  }, [sceneReady, seen, solved, encounter])

  /* A read-only handle on where the traveller is standing. This used to be
     dev-only, which meant the built chapter — the one people actually play —
     was the one build no test could steer through, and the walkthrough that
     caught the sealed border gate could not be run against it. Exposing the
     live position costs nothing and makes the shipped game checkable. */
  /* הקריאה ל-localStorage חייבת לקרות אחרי ההרכבה: הדף עובר
     prerender, ורינדור ראשון שחולק על השרת הוא אי-התאמת hydration. */
  useEffect(() => { setSoundOff(isMuted() || localStorage.getItem('ch1:muted') === '1') }, [])

  /* רשת חובה ללוח ההגעה: אם נכס אחד לא נטען, ה-Suspense לא נפתר
     לעולם — והלוח שאמור להיעלם היה נשאר על המסך ומסתיר משחק שרץ
     מתחתיו. עדיף להיכנס לאזור חסר-נכס מאשר למסך שחור. */
  useEffect(() => {
    const t = window.setTimeout(() => setSceneReady(true), 9000)
    return () => window.clearTimeout(t)
  }, [])

  /* מעבר אזור טוען מסמך חדש, ולכן גרף האודיו נהרס איתו ממילא. זה
     קיים בשביל המקרה השני: React בפיתוח מרכיב פעמיים, והטיימר של
     האש הוא הדבר היחיד כאן שממשיך לרוץ בלי שאיש מחזיק בו. */
  useEffect(() => stopAmbience, [])

  /* הרוח מתחילה עם האזור ולא עם המקש הראשון. הלחיצה על „התחילו
     במסע“ כבר נתנה למסמך את ההרשאה שהדפדפן דורש, אבל היא קרתה
     בקומפוננטה אחרת — ולכן כל זמן הטעינה והקריינות הראשונה היו
     אילמים לגמרי. אחרי מעבר שער אין הרשאה כזאת, ושם עדיין המקש
     הראשון הוא שמעיר את הגרף. */
  useEffect(() => {
    unlock()
    startAmbience(REGION.id)
  }, [])

  useEffect(() => {
    const g = window as unknown as Record<string, unknown>
    g.__ch1Live = live
    g.__ch1Statics = STATIC_COLLIDERS
    g.__ch1Region = REGION.id
  }, [live])

  // keyboard: movement keys into the live channel, E talks to whoever is near.
  // e.code (physical key) — NOT e.key — so WASD works on Hebrew/any keyboard layout.
  useEffect(() => {
    const codeMap: Record<string, string> = {
      KeyW: 'w', KeyS: 's', KeyA: 'a', KeyD: 'd',
      ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd',
      ShiftLeft: 'shift', ShiftRight: 'shift',
    }
    const openOverlay = (which: 'notebook' | 'map') => {
      /* Drop every held key on the way in, or the player keeps walking behind
         the parchment and comes back somewhere else entirely. */
      live.keys.clear()
      setPressed(new Set())
      setOverlay((cur) => (cur === which ? null : which))
    }
    const down = (e: KeyboardEvent) => {
      /* Browsers will not let a page make a sound until someone touches it,
         and every gate crossing loads a fresh document — so the bed starts on
         the first key of each region rather than on mount. `startAmbience`
         guards itself, so calling it on every keystroke costs nothing. */
      unlock()
      startAmbience(REGION.id)
      /* J and M open the two surfaces — but never over a conversation, which
         owns the keyboard while it is running. An open surface swallows
         everything else: no walking, no talking, until it closes. */
      if (e.code === 'KeyJ' && !encounterRef.current) {
        e.preventDefault()
        cue('page')
        openOverlay('notebook')
        return
      }
      /* M פותח את המפה, ורק אותה. מבט הדגם נשאר מחוות המעבר בין
         אזורים (העלייה בשערים) — שם מקומו, לא על מקש. */
      if (e.code === 'KeyM' && !encounterRef.current) {
        e.preventDefault()
        cue('page')
        openOverlay('map')
        return
      }
      if (e.code === 'Escape') {
        if (escActionRef.current()) {
          e.preventDefault()
          cue('ui')
        }
        return
      }
      if (overlayRef.current) return
      /* R talks to Rawi, who walks beside the player the whole way; E talks to
         whoever you are standing next to. Both read the store rather than the
         `seen` state so a keypress can never act on a stale render. */
      if (e.code === 'KeyR' && !encounterRef.current) {
        const heard = readNotebook().seen
        const next = REGION.encounters.find((x) => x.speaker === 'rawi' && !heard.includes(x.id))
        if (next) setEncounter(next)
        else if (coreMissingRef.current.length > 0) {
          /* אין לראווי מונולוג כאן — אבל מקש מת גרוע יותר: הוא מפנה
             אל מה שהאזור עוד מבקש (דוח השחקנית: R מת ברמות תימן) */
          setEncounter(coreHoldBeat(coreMissingRef.current))
        }
        return
      }
      /* F picks a thing up off the ground. It is deliberately not E: E is for
         people, and a learner who has just been told "E talks" should not find
         that the same key sometimes means "kneel down and look at a stone". */
      if (e.code === 'KeyF' && live.nearFind && !encounterRef.current && !openRef.current) {
        const fd = REGION_FINDS.find((x) => x.id === live.nearFind)
        if (fd) {
          const store = recordFind(fd.id)
          setFound(store.found)
          cue('find')
          setOpenFind(fd)
        }
        return
      }
      /* E מטפל בשניים — אדם ותחנת משימה — ובמעבר הגבול הם עומדים
         2.25 מטר זה מזה. האדם קודם כל עוד נשאר לו מה לומר, ורק
         כשנגמרו דבריו המקש נופל דרכו אל התחנה. זה גם הסדר הנכון
         מבחינת התוכן: קודם שומעים למה גובים מכס, אחר כך שוקלים. */
      if (e.code === 'KeyE' && live.nearWho && !encounterRef.current && !openRef.current) {
        const heard = readNotebook().seen
        const next = REGION.encounters.find((x) => x.speaker === live.nearWho && !heard.includes(x.id))
        if (next) {
          setEncounter(next)
          return
        }
        /* אין לו יותר מה לומר — נופלים דרך אל התחנה במקום לבלוע
           את הלחיצה, שזה מה שהפך את משימת המכס לבלתי ניתנת לפתיחה. */
      }
      if (e.code === 'KeyE' && live.atTask && !encounterRef.current && !openRef.current) {
        cue('task')
        setOpenTask(true)
        return
      }
      /* לא הולכים בזמן שיחה או כרטיס. עד עכשיו רק המחברת והמפה חסמו
         תנועה, ולכן אפשר היה לצאת מטווח השיחה תוך כדי שהדמות מדברת —
         או להיכנס לשער המעבר באמצע משפט ולעבור אזור. */
      if (encounterRef.current || openRef.current) {
        if (live.keys.size) {
          live.keys.clear()
          setPressed(new Set())
        }
        return
      }
      const k = codeMap[e.code]
      if (k) {
        live.keys.add(k)
        setPressed(new Set(live.keys))
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = codeMap[e.code]
      if (k) {
        live.keys.delete(k)
        setPressed(new Set(live.keys))
      }
    }
    const blur = () => {
      live.keys.clear()
      setPressed(new Set())
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [live])

  // mouse-drag look (yaw only, milestone 1)
  const dragging = useRef(false)
  const lastX = useRef(0)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    /* חפץ משימה ביד — העכבר שייך לגרירה, לא לסיבוב המבט */
    if (live.taskDrag) return
    unlock()
    startAmbience(REGION.id)
    /* יד על המצלמה היא יד על המצלמה גם כשהיא לא זזה — בלי זה
       המצלמה מתחילה ליישר את עצמה מתחת לסמן אחרי 1.2 שניות. */
    live.lastDrag = performance.now()
    dragging.current = true
    lastX.current = e.clientX
  }, [])
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      live.yaw += (e.clientX - lastX.current) * 0.005
      lastX.current = e.clientX
      /* היד קיבלה את ההגה — המצלמה מפסיקה ליישר את עצמה */
      live.lastDrag = performance.now()
    },
    [live],
  )
  const onPointerUp = useCallback(() => {
    dragging.current = false
    live.lastDrag = performance.now()
  }, [live])

  // low-frequency minimap refresh
  useEffect(() => {
    const t = window.setInterval(() => {
      setMapPos({ x: live.player.x, z: live.player.z })
      setMapYaw(live.yaw)
    }, 250)
    return () => window.clearInterval(t)
  }, [live])

  /** The person you are standing next to who still has something to say. */
  const nearPending = nearWho ? nextFrom(nearWho) : null

  return (
    <div className="ch1-page">
      <header className="chapter-site-header">
        <div className="chapter-site-header-inner">
          <div className="chapter-hdr-start">
            <button type="button" className="chapter-logo" onClick={() => router.push('/chapters')} aria-label="חזרה לעמוד הפרקים">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/logo-cream.png" alt="אסלאם" />
            </button>
          </div>
          <div className="ch1-topbar-actions">
            {/* קול שאי אפשר לכבות הוא בעיה בכיתה, ולכן הבחירה נשמרת —
                המעבר בין אזורים טוען מסמך חדש לגמרי, וכיבוי שלא שורד
                אותו נקרא כתקלה. */}
            <button
              type="button"
              className="ch1-sound-btn"
              aria-pressed={soundOff}
              aria-label={soundOff ? 'הפעילו צליל' : 'השתיקו צליל'}
              title={soundOff ? 'הפעילו צליל' : 'השתיקו צליל'}
              onClick={() => {
                const next = !soundOff
                setSoundOff(next)
                unlock()
                setMuted(next)
                if (!next) {
                  startAmbience(REGION.id)
                  cue('ui')
                }
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9v6h4l5 4V5L8 9H4z" />
                {soundOff ? (
                  <path d="M16 9l5 6M21 9l-5 6" />
                ) : (
                  <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
                )}
              </svg>
            </button>
            <button
              type="button"
              className="ch1-journal-btn"
              aria-expanded={overlay === 'notebook'}
              onClick={() => setOverlay((cur) => (cur === 'notebook' ? null : 'notebook'))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4zM5 4v14M9 8h6M9 12h6" /></svg>
              מחברת המסע
            </button>
          </div>
        </div>
      </header>

      <div
        className="ch1-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        /* הגרייד רץ על הקנבס עצמו דרך משתנה CSS — פילטר דפדפן, לא עוד
           מעבר GPU — והווינייטה היא שכבת רקע מעל. שניהם ערכי mood. */
        style={{ '--ch1-grade': MOOD.grade, '--ch1-vignette': MOOD.vignette } as React.CSSProperties}
      >
        {/* אין toneMappingExposure כאן בכוונה: r3f מחיל מחדש את מאפייני
            gl בכל רינדור, ולכן ערך קבוע כאן דרס את החשיפה שהאזור מגדיר
            ב-mood — וכל כיול חשיפה פר-אזור פשוט לא הגיע למסך. החשיפה
            נקבעת ב-<Sky>, שם היא נגזרת מה-layout. */}
        {/* `shadows` לבדו מבקש PCFSoftShadowMap, ש-three.js 0.185 הוציא
            משימוש — הוא נופל חזרה ל-PCF וכותב אזהרה על כל עדכון מפת צל.
            בפיתוח כל הודעת קונסולה נשלחת מהדפדפן אל הטרמינל, וזה היה
            1,576 הודעות בשתי דקות: הרינדור עצמו תקין, אבל המשחק מגמגם
            מרוב דיווח עליו. מבקשים במפורש את מה שהוא ממילא משתמש בו. */}
        <Canvas shadows="percentage" camera={{ position: [0, 3.4, 10], fov: 55 }} dpr={[1, 2]}>
          <Suspense fallback={null}>
            <World
              live={live}
              onNearChange={setNearWho}
              onNearFind={setNearFind}
              onAtTask={setAtTask}
              found={found}
              solved={solved}
              talking={!!encounter}
              gesture={encounter?.gesture ?? 'talk'}
              speakingWho={encounter && stepSpeaker && stepSpeaker !== 'rawi' && stepSpeaker !== 'narrator' ? stepSpeaker : null}
              attendWho={encounter && stepSpeaker === 'rawi' && encounter.speaker !== 'rawi' && encounter.speaker !== 'narrator' ? encounter.speaker : null}
              onExit={guardedTravel}
              met={met}
            />
            <SceneReady onReady={onSceneReady} />
          </Suspense>
          {/* גבול Suspense משלו, בכוונה: החפצים טוענים דגמים שלפעמים אינם
              באזור (חותם, מצבה), ובתוך הגבול של העולם הטעינה שלהם החביאה
              את העולם כולו — הפרוג'קטור מת לשניות ארוכות, ובאזור גדול
              עדות נשארה בלי שם. בגבול משלהם הם מגיעים כשהם מגיעים. */}
          {REGION_TASK && !taskSolved && (
            <Suspense fallback={null}>
              <TaskProps
                live={live}
                atTask={atTask}
                chosen={taskChosen}
                solvedTask={taskSolved}
                onChoose={chooseByDrop}
              />
            </Suspense>
          )}
          <Painterly strength={MOOD.paint} />
          <Dust groundAt={groundYAt} />
        </Canvas>
        {/* המסגרת שסוגרת את הפריים — מתחת לכל שכבות ה-HUD, מעל הקנבס */}
        <div className="ch1-vignette" aria-hidden="true" />
        {/* Leaving a region took 900 ms behind a banner; arriving took none.
            The new document rendered a bare plate, then a loading line, then a
            canvas drawing nothing while up to 193 props decoded, and then the
            region simply appeared, fully lit, mid-stride. That asymmetry is
            what made a gate read as a crash and a recovery rather than as a
            walk. It is the same journey in both directions now: the plate
            holds until the scene is actually ready, the region names itself,
            and then it fades. */}
        <div className={`ch1-arrive${sceneReady ? ' is-gone' : ''}`} aria-hidden={sceneReady}>
          <span>{REGION.name}</span>
        </div>

        {/* the road handing you on to the next region */}
        {travelTo && (
          <div className="ch1-travel" role="status" aria-live="polite">
            <span>{travelTo.label}</span>
          </div>
        )}

        {/* approach rings, projected onto each placed character every frame */}
        {CAST.map((c) => (
          <div
            key={c.who}
            className="poi-marker is-dialogue-marker"
            ref={(el) => {
              if (el) live.markerEls.set(c.who, el)
              else live.markerEls.delete(c.who)
            }}
          >
            <span className="poi-dialogue-bubble" aria-hidden="true">...</span>
            <span className="poi-act" aria-hidden="true"><b>E</b> · שיחה עם {SPEAKERS[c.who]}</span>
            <span className="ch1-visually-hidden">שיחה עם {SPEAKERS[c.who]}</span>
          </div>
        ))}

        {/* where the road leaves this region.
            מחנה הלילה הוא האזור הפותח והשקט, ושלט צף באמצע הנוף
            שבר את הרגע הזה — שם המצפן והדרך עצמה מספיקים. */}
        {ONWARD && REGION.id !== 'night-camp' && (
          <div
            className={`poi-marker is-gate-marker${coreMissing.length > 0 ? ' is-held-gate' : ''}`}
            ref={(el) => {
              if (el) live.markerEls.set('__gate', el)
              else live.markerEls.delete('__gate')
            }}
          >
            <span className="poi-gate-label">
              {campLayout.exits?.find((e) => e.to === ONWARD)?.label ?? ''}
            </span>
            {coreMissing.length > 0 && <span className="poi-gate-hold">נשלים כאן קודם</span>}
            <span className="poi-gate-dist" />
          </div>
        )}

        {/* a pin over each piece of evidence — lit while it is still there to
            be looked at, dimmed to olive once it is in the notebook */}
        {REGION_FINDS.map((fd) => (
          <div
            key={fd.id}
            className="poi-marker is-find-marker"
            ref={(el) => {
              if (el) live.markerEls.set('find:' + fd.id, el)
              else live.markerEls.delete('find:' + fd.id)
            }}
          >
            <span className="poi-find-pin" aria-hidden="true">✦</span>
            <span className="poi-act" aria-hidden="true">
              הביטו מקרוב · <b>F</b>
            </span>
            <span className="poi-marker-stem" aria-hidden="true" />
            <span className="poi-marker-foot" aria-hidden="true" />
            <span className="ch1-visually-hidden">{fd.title}</span>
          </div>
        ))}
        {REGION_TASK && !solved.includes(REGION_TASK.id) && (
          <div
            className="poi-marker is-task-marker"
            ref={(el) => {
              if (el) live.markerEls.set('task', el)
              else live.markerEls.delete('task')
            }}
          >
            <span className="poi-task-badge" aria-hidden="true">?</span>
            <span className="poi-act" aria-hidden="true">
              {REGION_TASK.prompt} · <b>E</b>
            </span>
            <span className="poi-marker-stem" aria-hidden="true" />
            <span className="poi-marker-foot" aria-hidden="true" />
            <span className="ch1-visually-hidden">{REGION_TASK.title}</span>
          </div>
        )}

        <ControlsPanel pressed={pressed} />
        {/* One slot used to hold all four prompts, so standing where a find and
            a person overlap — which is where the border post puts you, 1.9 m
            from both — drew two panels on top of each other. They stack now
            instead of suppressing one another: F and E are different keys, and
            a player standing between a stone and a stranger really can do both.
            column-reverse keeps the first one lowest, nearest the eye. */}
        <div className="poi-hints">
          {nearFind && !encounter && !openFind && !openTask && (
            <div className="hud-panel poi-hint is-find-hint">
              <i className="hud-key">F</i>
              <span>הביטו מקרוב</span>
            </div>
          )}
          {atTask && !encounter && !openTask && !openFind && REGION_TASK && (
            <div className="hud-panel poi-hint is-task-hint">
              <i className="hud-key">E</i>
              <span>{REGION_TASK.prompt}</span>
            </div>
          )}
          {nearPending && !encounter && (
            <div className="hud-panel poi-hint">
              <i className="hud-key">E</i>
              <span>דברו עם {SPEAKERS[nearPending.speaker]}</span>
            </div>
          )}
          {pendingEncounter && !encounter && !nearPending && (
            <div className="hud-panel poi-hint is-rawi-hint">
              <i className="hud-key">R</i>
              <span>דברו עם רָאוִי</span>
            </div>
          )}
        </div>
        {encounter && (
          <DialogueHud
            encounter={encounter}
            notebookDone={notebook.done}
            notebookTotal={NOTEBOOK_TOTAL}
            onSpeakerChange={setStepSpeaker}
            onFinished={finishEncounter}
            onClose={() => setEncounter(null)}
          />
        )}
        {/* the notebook is the only progress surface: no score, no failure */}
        <div className="hud-panel hud-goal">
          <span style={{ whiteSpace: 'nowrap' }}>{REGION.name}</span>
          <span className="hud-progress">
            <i style={{ width: `${Math.min(100, (notebook.done / NOTEBOOK_TOTAL) * 100)}%` }} />
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>
            מחברת: {notebook.done} מתוך {NOTEBOOK_TOTAL}
          </span>
          {/* עד עכשיו המונה היחיד על המסך ספר רק ערכי מחברת, ולכן כל 17
              העדויות ו-6 המשימות — הדבר התובעני ביותר במשחק — לא הזיזו
              שום מספר. פעולה שלא נרשמת בשום מקום נקראת כפעולה שלא קרתה. */}
          <span className="hud-goal-evidence" style={{ whiteSpace: 'nowrap' }}>
            עדויות: {found.length} מתוך {FINDS_TOTAL}
          </span>
        </div>
        <MiniMap pos={mapPos} yaw={mapYaw} met={met} found={found} solved={solved} />

        {/* the road stops here, and everything this place had to say is said */}
        {finale === 'card' && !overlay && (
          <ChapterEnd
            done={notebook.done}
            evidence={found.length}
            onNotebook={() => setOverlay('notebook')}
            onMap={() => setOverlay('map')}
            onLeave={() => router.push('/chapters')}
            onClose={() => {
              live.riseAt = 0
              setFinale('closed')
            }}
          />
        )}

        {openFind && (
          <FindCard
            find={openFind}
            index={found.length}
            total={FINDS_TOTAL}
            onClose={() => setOpenFind(null)}
            onNotebook={() => {
              setOpenFind(null)
              setOverlay('notebook')
            }}
          />
        )}
        {openTask && REGION_TASK && (
          <TaskPanel
            task={REGION_TASK}
            chosen={taskChosen}
            found={found}
            last={taskLast}
            lastOk={taskLastOk}
            solved={taskSolved}
            onChoose={chooseTask}
            onSort={sortTask}
            onClose={() => setOpenTask(false)}
          />
        )}

        {overlay === 'notebook' && <Notebook seen={seen} found={found} solved={solved} onClose={() => setOverlay(null)} />}
        {overlay === 'map' && (
          <WorldMap seen={seen} currentRegion={REGION.id} onClose={() => setOverlay(null)} />
        )}
      </div>
    </div>
  )
}
