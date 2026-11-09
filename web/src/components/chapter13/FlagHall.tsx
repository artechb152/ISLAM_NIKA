'use client'

/* פרק 13 · אולם התרנים — עולם שהולכים בו בחופשיות (הכרעת המשתמשת, 4.11.2026).

   האולם הוא הפיילוט של concept/chapter13/blender/build-hall.py, אותן מידות ואותו סדר,
   בונה מחדש ב-three: Blender (x, y קדימה, z למעלה) → three (x, y למעלה, z = ‎-y).
   16 תחנות בסדר המקור, מדורגות בזיגזג — §1 בימין. „דגל" על תורן, „סמל" על לוח עומד:
   ההבחנה של כותרת הכרטיס, והשער בודק אותה.

   הקומפוננטה לא כותבת משפט לימודי. כל מה שבכרטיס בא מ-passages.json (§N), והטקסטורות הן
   החיתוכים מהחוברת. הטקסט היחיד שנכתב כאן הוא הוראות התנועה. */

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import Link from 'next/link'
import * as THREE from 'three'
import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import passages from '@/lib/chapter13/passages.json'
import layout from '@/lib/chapter13/layout.json'
import { markStationRead, practiceComplete, readStore, STATION_ORDER } from '@/lib/chapter13/progress'

const ART = '/assets/chapter13/'

/* ── מידות — זהות ל-build-hall.py ── */
const HALL_W = 13
const HALL_L = 50
const HALL_H = 7
const Y0 = -7 // האולם ממשיך מאחורי נקודת הכניסה
const STEP = 5
const HALF = STEP / 2
const SIDE_X = 4.3
const FIRST = 6
const TURN = 15
const EYE = 1.65
const LEN = HALL_L - Y0
const MIDZ = -(HALL_L + Y0) / 2
const DEG = Math.PI / 180

type Line = { text: string; b?: string[] }
type Card = {
  title: { text: string; name: string }
  label?: string
  items?: Line[]
  quotes?: (Line & { ref?: string })[]
}
type Station = { sec: string; kind: 'flag' | 'emblem'; tex: string; crop?: number[] }

const STATIONS = layout.stations as Station[]
const CARDS = passages.passages as Record<string, Card>

/* ── גיאומטריית התחנה ── */
interface Pose {
  sec: string
  kind: Station['kind']
  x: number
  z: number
  phi: number
  /** הכיוון שאליו הבד/הלוח פונה (נורמל) */
  n: THREE.Vector2
  /** הכיוון שלאורכו הבד נמתח מהתורן */
  ax: THREE.Vector2
}

function poseOf(i: number): Pose {
  const side = i % 2 === 0 ? 1 : -1 // הראשון בימין, כמו קריאה בעברית
  const phi = -side * (90 - TURN) * DEG
  return {
    sec: STATIONS[i].sec,
    kind: STATIONS[i].kind,
    x: side * SIDE_X,
    z: -(FIRST + i * HALF),
    phi,
    n: new THREE.Vector2(Math.sin(phi), Math.cos(phi)),
    ax: new THREE.Vector2(Math.cos(phi), -Math.sin(phi)),
  }
}
const POSES = STATIONS.map((_, i) => poseOf(i))

const FLAG_W = 1.75
const FLAG_TOP = 3.3
const PANEL = 1.15
const PANEL_Z = 1.75

/* ── חומרים ── */
function useTiled(base: string, rx: number, ry: number) {
  const [d, n, r] = useTexture([`${ART}tex/${base}_diff.jpg`, `${ART}tex/${base}_nor_gl.jpg`, `${ART}tex/${base}_rough.jpg`])
  return useMemo(() => {
    const set = (t: THREE.Texture, color: boolean) => {
      const c = t.clone()
      c.wrapS = c.wrapT = THREE.RepeatWrapping
      c.repeat.set(rx, ry)
      c.anisotropy = 8
      if (color) c.colorSpace = THREE.SRGBColorSpace
      c.needsUpdate = true
      return c
    }
    return { map: set(d, true), normalMap: set(n, false), roughnessMap: set(r, false) }
  }, [d, n, r, rx, ry])
}

/* תמונה מהחוברת → CanvasTexture. 'key': הלבן של הרקע נעשה שקוף (הסמלים יושבים על נייר).
   'revive': §5 הוא צילום חשוף-יתר — ניגודיות ורוויה, בלי לשנות גוון. כמו השיידר בפיילוט. */
function useBookletTexture(file: string, mode: 'plain' | 'key' | 'revive') {
  const img = useLoader(THREE.ImageLoader, `${ART}flags/${file}`)
  return useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = img.width
    cv.height = img.height
    const g = cv.getContext('2d')!
    g.drawImage(img, 0, 0)
    if (mode !== 'plain') {
      const px = g.getImageData(0, 0, cv.width, cv.height)
      const a = px.data
      for (let i = 0; i < a.length; i += 4) {
        if (mode === 'key') {
          const m = Math.min(a[i], a[i + 1], a[i + 2]) / 255
          a[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (0.93 - m) / 0.13)))
        } else {
          const l = (a[i] + a[i + 1] + a[i + 2]) / 3
          for (let k = 0; k < 3; k++) {
            const s = l + (a[i + k] - l) * 1.35
            a[i + k] = Math.max(0, Math.min(255, (s / 255 - 0.5) * 1.35 * 255 + 128 - 20))
          }
        }
      }
      g.putImageData(px, 0, 0)
    }
    const t = new THREE.CanvasTexture(cv)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return { tex: t, aspect: img.width / img.height }
  }, [img, mode])
}

/* ── האולם ── */
function Box({ p, s, color, rough = 0.7, metal = 0 }: { p: [number, number, number]; s: [number, number, number]; color: string; rough?: number; metal?: number }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  )
}

const C = {
  stone: '#cdbb95',
  ceil: '#a8946e',
  beam: '#5a3d24',
  brass: '#c79a3c',
  pole: '#3c2c1d',
  paper: '#d6c9ab', // --paper היה נקרא לבן תחת הספוט — נייר כהה יותר, נשאר קלף
  iron: '#1e1b18',
  edge: '#3e0f16',
}

/* memo: התקרבות לתחנה מעדכנת state במעטפת, ובלי זה כל האולם עבר reconcile — גמגום ברגע הכפתור */
const Hall = memo(function Hall() {
  const floor = useTiled('herringbone_parquet', HALL_W / 2, LEN / 2)
  const wall = useTiled('plastered_wall_02', LEN / 3.3, HALL_H / 3.3)
  const endWall = useTiled('plastered_wall_02', HALL_W / 3.3, HALL_H / 3.3)
  const wains = useTiled('herringbone_parquet', LEN / 0.83, 1.3 / 0.83)
  const runner = useTiled('velour_velvet', 2.2 / 0.67, (LEN - 2) / 0.67)

  const sides = [-1, 1] as const
  const ks = Array.from({ length: 13 }, (_, k) => k - 2)
  const beams = Array.from({ length: Math.floor(LEN / 3) + 1 }, (_, k) => k)

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, MIDZ]}>
        <planeGeometry args={[HALL_W, LEN]} />
        <meshStandardMaterial {...floor} color="#b89c80" roughness={1} />
      </mesh>
      <Box p={[0, HALL_H + 0.05, MIDZ]} s={[HALL_W, 0.1, LEN]} color={C.ceil} rough={0.85} />
      {sides.map((sx) => {
        const wx = (sx * HALL_W) / 2
        return (
          <group key={sx}>
            <mesh position={[wx, HALL_H / 2, MIDZ]} rotation-y={-sx * Math.PI / 2}>
              <planeGeometry args={[LEN, HALL_H]} />
              <meshStandardMaterial {...wall} color="#e6dcc6" roughness={1} />
            </mesh>
            {/* חיפוי עץ כהה בחלק התחתון, פס פליז, פנל בסיס, כרכוב כפול */}
            <mesh position={[wx - sx * 0.03, 0.65, MIDZ]} rotation-y={-sx * Math.PI / 2}>
              <boxGeometry args={[LEN, 1.3, 0.06]} />
              <meshStandardMaterial {...wains} color="#5a3e2a" roughness={0.8} />
            </mesh>
            <Box p={[wx - sx * 0.06, 1.31, MIDZ]} s={[0.06, 0.05, LEN]} color={C.brass} rough={0.32} metal={1} />
            <Box p={[wx - sx * 0.05, 0.09, MIDZ]} s={[0.1, 0.18, LEN]} color={C.beam} rough={0.6} />
            <Box p={[wx - sx * 0.1, HALL_H - 0.9, MIDZ]} s={[0.22, 0.24, LEN]} color={C.stone} />
            <Box p={[wx - sx * 0.05, HALL_H - 1.06, MIDZ]} s={[0.12, 0.08, LEN]} color={C.stone} />
            {ks.map((k) => {
              /* עמוד-קיר באמצע בין שתי תחנות של אותו צד, לא מאחורי דגל */
              const y = FIRST + (sx > 0 ? 0 : HALF) + HALF + k * STEP
              const px = wx - sx * 0.14
              return (
                <group key={k}>
                  <Box p={[px, HALL_H / 2, -y]} s={[0.28, HALL_H, 0.6]} color="#ddd2bb" rough={0.9} />
                  <Box p={[px - sx * 0.03, 0.7, -y]} s={[0.32, 1.4, 0.7]} color="#4a3322" rough={0.7} />
                  <Box p={[px - sx * 0.03, HALL_H - 1.25, -y]} s={[0.34, 0.18, 0.72]} color={C.stone} />
                </group>
              )
            })}
            {ks.map((k) => {
              /* חלונות עליונים — מסגרת וחלוקה, אחרת זה מלבן זוהר מודבק לקיר */
              const y = FIRST + (sx > 0 ? 0 : HALF) + k * STEP
              const fz = HALL_H - 0.45
              const fx = wx - sx * 0.05
              return (
                <group key={`w${k}`}>
                  <mesh position={[wx - sx * 0.01, fz, -y]} rotation-y={-sx * Math.PI / 2}>
                    <planeGeometry args={[1.6, 0.55]} />
                    <meshBasicMaterial color="#ffe9c4" toneMapped={false} />
                  </mesh>
                  {[-0.3, 0.3].map((dz) => <Box key={dz} p={[fx, fz + dz, -y]} s={[0.08, 0.07, 1.76]} color={C.beam} />)}
                  {[-0.84, -0.28, 0.28, 0.84].map((dy) => <Box key={dy} p={[fx, fz, -(y + dy)]} s={[0.08, 0.6, 0.06]} color={C.beam} />)}
                </group>
              )
            })}
          </group>
        )
      })}
      <mesh position={[0, HALL_H / 2, -HALL_L]}>
        <planeGeometry args={[HALL_W, HALL_H]} />
        <meshStandardMaterial {...endWall} color="#e6dcc6" roughness={1} />
      </mesh>
      <mesh position={[0, HALL_H / 2, -Y0]} rotation-y={Math.PI}>
        <planeGeometry args={[HALL_W, HALL_H]} />
        <meshStandardMaterial {...endWall} color="#e6dcc6" roughness={1} />
      </mesh>
      <Box p={[0, 0.65, -HALL_L + 0.03]} s={[HALL_W, 1.3, 0.06]} color="#4a3322" />
      {/* תקרת קורות — קורות רוחב + שתי קורות אורך */}
      {beams.map((k) => (
        <Box key={k} p={[0, HALL_H - 0.2, -(Y0 + 1 + k * 3)]} s={[HALL_W, 0.4, 0.3]} color={C.beam} rough={0.6} />
      ))}
      {[-2.2, 2.2].map((bx) => (
        <Box key={bx} p={[bx, HALL_H - 0.14, MIDZ]} s={[0.24, 0.28, LEN]} color={C.beam} rough={0.6} />
      ))}
      {/* השטיח — האדום של כלל 37 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, MIDZ]}>
        <planeGeometry args={[2.2, LEN - 2]} />
        <meshStandardMaterial {...runner} color="#6e1c26" roughness={1} />
      </mesh>
      {[-1.13, 1.13].map((ex) => (
        <Box key={ex} p={[ex, 0.013, MIDZ]} s={[0.08, 0.022, LEN - 2]} color={C.edge} />
      ))}
    </group>
  )
})

/* ── הבד מתנוסס (המשתמשת, 9.11.2026: „שהדגלים יתנוססו") ──
   גל שנע מהתורן אל הקצה החופשי, בשיידר: התורן (u=0) נעול, המשרעת גדלה לאורך הבד וקטנה ליד
   הזרוע העליונה. הנורמל מחושב מהנגזרת של אותו גל, כך שהקפלים נקראים באור של הספוט.
   משרעת של 10 ס"מ בקצה — הכתב על הדגל נשאר קריא מקרוב. שעון אחד לכל הדגלים (uniform משותף),
   ותוכנית אחת לכולם (customProgramCacheKey). prefers-reduced-motion: השעון עומד — קפלים בלי תנועה. */
const CLOTH_TIME = { value: 0 }

const CLOTH_VERT = /* glsl */ `
  float cu = uv.x;
  float cd = 1.0 - uv.y;
  float cA = 0.1 * cu * (0.3 + 0.7 * cd);
  float cAu = 0.1 * (0.3 + 0.7 * cd);
  float cAd = 0.1 * cu * 0.7;
  float cp1 = 6.0 * cu - 1.7 * uTime + uPhase + 0.9 * cd;
  float cp2 = 13.0 * cu - 2.9 * uTime + 2.1 * cd + 1.3 * uPhase;
  float cs = sin(cp1) + 0.3 * sin(cp2);
  float csu = 6.0 * cos(cp1) + 3.9 * cos(cp2);
  float csd = 0.9 * cos(cp1) + 0.63 * cos(cp2);
  float cz = cA * cs;
  float cdx = (cAu * cs + cA * csu) / uW;
  float cdy = -(cAd * cs + cA * csd) / uH;
`

function ClothClock() {
  const still = useRef(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => { still.current = mq.matches }
    set()
    mq.addEventListener('change', set)
    return () => mq.removeEventListener('change', set)
  }, [])
  useFrame((_, dt) => {
    if (!still.current) CLOTH_TIME.value += Math.min(dt, 0.05)
  })
  return null
}

function clothMaterial(map: THREE.Texture, W: number, H: number, phase: number) {
  const m = new THREE.MeshPhysicalMaterial({ map, side: THREE.DoubleSide, roughness: 0.8, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff') })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = CLOTH_TIME
    sh.uniforms.uW = { value: W }
    sh.uniforms.uH = { value: H }
    sh.uniforms.uPhase = { value: phase }
    sh.vertexShader = 'uniform float uTime;\nuniform float uW;\nuniform float uH;\nuniform float uPhase;\n' + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `${CLOTH_VERT}\n  vec3 objectNormal = normalize(vec3(-cdx, -cdy, 1.0));`)
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position.xy, cz);')
  }
  m.customProgramCacheKey = () => 'ch13-cloth'
  return m
}

/* ── תחנה ── */
function FlagCloth({ st }: { st: Station }) {
  const { tex, aspect: imgAspect } = useBookletTexture(st.tex, st.sec === '§5' ? 'revive' : 'plain')
  const crop = st.crop ?? [0.012, 0.012, 0.988, 0.988]
  const aspect = imgAspect * ((crop[2] - crop[0]) / (crop[3] - crop[1]))
  const W = FLAG_W
  const H = W / aspect
  const geo = useMemo(() => new THREE.PlaneGeometry(W, H, 56, 32), [W, H])
  const map = useMemo(() => {
    const t = tex.clone()
    t.repeat.set(crop[2] - crop[0], crop[3] - crop[1])
    t.offset.set(crop[0], crop[1])
    t.needsUpdate = true
    return t
  }, [tex, crop])
  /* כל דגל בשלב אחר של הגל — שישה-עשר בדים שזזים יחד נראים כמו מכונה */
  const mat = useMemo(() => clothMaterial(map, W, H, parseInt(st.sec.slice(1), 10) * 2.39), [map, W, H, st.sec])
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <group>
      <mesh position={[0, FLAG_TOP / 2 + 0.03, 0]}>
        <cylinderGeometry args={[0.035, 0.035, FLAG_TOP + 0.2, 16]} />
        <meshStandardMaterial color={C.pole} roughness={0.45} />
      </mesh>
      <mesh position={[0, FLAG_TOP + 0.35, 0]}>
        <sphereGeometry args={[0.065, 20, 14]} />
        <meshStandardMaterial color={C.brass} roughness={0.3} metalness={1} />
      </mesh>
      <mesh position={[W / 2, FLAG_TOP + 0.03, -0.06]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.018, W + 0.12, 12]} />
        <meshStandardMaterial color={C.brass} roughness={0.32} metalness={1} />
      </mesh>
      <mesh geometry={geo} material={mat} position={[W / 2 + 0.03, FLAG_TOP - H / 2, -0.06]} />
    </group>
  )
}

function EmblemPanel({ st }: { st: Station }) {
  const { tex, aspect } = useBookletTexture(st.tex, 'key')
  const s = PANEL * 0.86
  const [ew, eh] = aspect >= 1 ? [s, s / aspect] : [s * aspect, s]
  const legH = PANEL_Z - PANEL / 2 - 0.1
  return (
    <group>
      {/* „סמל" — לוח תצוגה עומד: מסגרת עץ, משטח נייר, שתי רגליים */}
      <Box p={[0, PANEL_Z, -0.03]} s={[PANEL + 0.1, PANEL + 0.1, 0.05]} color={C.beam} rough={0.6} />
      <Box p={[0, PANEL_Z, 0]} s={[PANEL, PANEL, 0.02]} color={C.paper} rough={0.85} />
      {[-0.38, 0.38].map((lx) => <Box key={lx} p={[lx, legH / 2 + 0.09, -0.03]} s={[0.05, legH, 0.05]} color={C.beam} />)}
      <mesh position={[0, PANEL_Z, 0.0125]}>
        <planeGeometry args={[ew, eh]} />
        <meshStandardMaterial map={tex} transparent alphaTest={0.02} roughness={0.6} />
      </mesh>
    </group>
  )
}

const StationView = memo(function StationView({ i }: { i: number }) {
  const pose = POSES[i]
  const st = STATIONS[i]
  const focus = focusOf(pose)
  const target = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(focus.x, focus.y, focus.z)
    return o
  }, [focus.x, focus.y, focus.z])
  const lamp = new THREE.Vector3(pose.x * 0.25, HALL_H - 0.75, pose.z + 1.8)
  const dir = target.position.clone().sub(lamp).normalize()
  const lampRot = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir)
  return (
    <group>
      <group position={[pose.x, 0, pose.z]} rotation-y={pose.phi}>
        {/* בסיס אבן נמוך — מעגן את התחנה ברצפה */}
        <Box p={[0, 0.06, 0]} s={[0.9, 0.12, 0.9]} color={C.stone} />
        <Box p={[0, 0.15, 0]} s={[0.6, 0.06, 0.6]} color={C.stone} />
        {st.kind === 'flag' ? <FlagCloth st={st} /> : <EmblemPanel st={st} />}
      </group>
      <primitive object={target} />
      {/* ספוט מוזיאלי מהתקרה — הוא האור העיקרי: כל תחנה בריכת אור */}
      <spotLight position={lamp} target={target} intensity={140} angle={15 * DEG} penumbra={0.45} decay={2} color="#ffe6c2" />
      <mesh position={lamp.clone().sub(dir.clone().multiplyScalar(0.13))} quaternion={lampRot}>
        <cylinderGeometry args={[0.055, 0.055, 0.2, 20]} />
        <meshStandardMaterial color={C.iron} roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh position={[lamp.x, HALL_H - 0.4, lamp.z]}>
        <cylinderGeometry args={[0.008, 0.008, 0.7, 6]} />
        <meshStandardMaterial color={C.iron} />
      </mesh>
    </group>
  )
})

/** מרכז הבד/הלוח בעולם */
function focusOf(p: Pose) {
  if (p.kind === 'emblem') return new THREE.Vector3(p.x, PANEL_Z, p.z)
  const a = FLAG_W / 2 + 0.03
  return new THREE.Vector3(p.x + a * p.ax.x, FLAG_TOP - 0.7, p.z + a * p.ax.y)
}

/* ── התנועה ── */
type Keys = Set<string>

function Player({ keys, frozen, look, onNear }: { keys: React.RefObject<Keys>; frozen: boolean; look: React.RefObject<{ yaw: number; pitch: number }>; onNear: (i: number | null) => void }) {
  const { camera, gl } = useThree()
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      ;(window as unknown as Record<string, unknown>).__ch13Info = () => ({ calls: gl.info.render.calls, tris: gl.info.render.triangles, programs: gl.info.programs?.length })
    }
  }, [gl])
  const near = useRef<number | null>(null)
  useEffect(() => {
    camera.rotation.order = 'YXZ'
    camera.position.set(0, EYE, 4.8)
    /* פיתוח בלבד: סקריפט הצילום (scripts/ch13-shot.mjs) מציב את המצלמה ישירות */
    if (process.env.NODE_ENV !== 'production') {
      ;(window as unknown as Record<string, unknown>).__ch13Go = (x: number, z: number, yaw: number, pitch = 0) => {
        camera.position.set(x, EYE, z)
        look.current.yaw = view.current.yaw = yaw
        look.current.pitch = view.current.pitch = pitch
        vel.current.set(0, 0)
      }
    }
  }, [camera, look])
  /* התנועה מואצת ומרוסנת, והמבט רודף אחרי היעד — „התזוזה קטועה" (4.11) לא הייתה קצב פריימים
     (60 יציב) אלא הליכה שמתחילה ונעצרת בבת אחת ומבט שקפץ עם כל אירוע עכבר */
  const vel = useRef(new THREE.Vector2())
  const bob = useRef(0)
  const turn = useRef(0)
  const view = useRef({ yaw: look.current.yaw, pitch: look.current.pitch })
  useFrame((_, dt) => {
    const k = keys.current
    const L = look.current
    dt = Math.min(dt, 0.05)
    const f = frozen ? 0 : (k.has('w') ? 1 : 0) - (k.has('s') ? 1 : 0)
    const s = frozen ? 0 : (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0)
    const tw = frozen ? 0 : (k.has('left') ? 1 : 0) - (k.has('right') ? 1 : 0)
    turn.current += (tw * 1.5 - turn.current) * (1 - Math.exp(-dt * 7))
    L.yaw += turn.current * dt
    const V = view.current
    const ease = 1 - Math.exp(-dt * 16)
    V.yaw += (L.yaw - V.yaw) * ease
    V.pitch += (L.pitch - V.pitch) * ease
    const max = k.has('shift') ? 4.2 : 2.4
    const fx = -Math.sin(V.yaw), fz = -Math.cos(V.yaw)
    let tx = fx * f - fz * s
    let tz = fz * f + fx * s
    const tl = Math.hypot(tx, tz)
    if (tl > 1) { tx /= tl; tz /= tl }
    /* האצה מהירה מעצירה, ועצירה רכה — כמו צעד */
    const rate = tl > 0 ? 8 : 6
    const a = 1 - Math.exp(-dt * rate)
    vel.current.x += (tx * max - vel.current.x) * a
    vel.current.y += (tz * max - vel.current.y) * a
    const p = camera.position
    p.x += vel.current.x * dt
    p.z += vel.current.y * dt
    collide(p)
    /* נדנוד ראש עדין לפי המהירות — בלעדיו ההליכה נראית כמו מסילה */
    const sp = vel.current.length()
    bob.current += sp * dt * 2.1
    p.y = EYE + Math.sin(bob.current * Math.PI) * 0.018 * Math.min(1, sp / 2.4)
    camera.rotation.set(V.pitch, V.yaw, 0)

    /* התחנה הקרובה: בטווח, מלפני הבד, ובכיוון המבט */
    let best: number | null = null
    let bestD = 4.6 // דגל נקרא היטב מ-3–4 מ' — ב-3.8 עמדת צפייה טבעית נפלה מחוץ לטווח
    const fwd = new THREE.Vector2(-Math.sin(V.yaw), -Math.cos(V.yaw))
    POSES.forEach((pose, i) => {
      const c = focusOf(pose)
      const v = new THREE.Vector2(c.x - camera.position.x, c.z - camera.position.z)
      const d = v.length()
      if (d > bestD) return
      if (pose.n.dot(new THREE.Vector2(-v.x, -v.y)) < 0) return
      if (fwd.dot(v.clone().normalize()) < 0.55) return
      best = i
      bestD = d
    })
    if (best !== near.current) {
      near.current = best
      onNear(best)
    }
  })
  return null
}

function pushOut(p: THREE.Vector3, ax: number, az: number, bx: number, bz: number, r: number) {
  const abx = bx - ax, abz = bz - az
  const len2 = abx * abx + abz * abz || 1
  const t = Math.max(0, Math.min(1, ((p.x - ax) * abx + (p.z - az) * abz) / len2))
  const cx = ax + abx * t, cz = az + abz * t
  let dx = p.x - cx, dz = p.z - cz
  let d = Math.hypot(dx, dz)
  if (d >= r) return
  if (d < 1e-4) { dx = 1; dz = 0; d = 1 }
  p.x = cx + (dx / d) * r
  p.z = cz + (dz / d) * r
}

function collide(p: THREE.Vector3) {
  const R = 0.3
  for (const pose of POSES) {
    pushOut(p, pose.x, pose.z, pose.x, pose.z, 0.45 + R)
    if (pose.kind === 'emblem') {
      const h = PANEL / 2 + 0.05
      pushOut(p, pose.x - pose.ax.x * h, pose.z - pose.ax.y * h, pose.x + pose.ax.x * h, pose.z + pose.ax.y * h, 0.12 + R)
    } else {
      pushOut(p, pose.x, pose.z, pose.x + pose.ax.x * (FLAG_W + 0.03), pose.z + pose.ax.y * (FLAG_W + 0.03), 0.1 + R)
    }
  }
  p.x = Math.max(-HALL_W / 2 + 0.45, Math.min(HALL_W / 2 - 0.45, p.x))
  p.z = Math.max(-HALL_L + 0.5, Math.min(-Y0 - 0.5, p.z))
}

/* ── הכרטיס ── */
function Bolded({ line }: { line: Line }) {
  const out: React.ReactNode[] = []
  let at = 0
  for (const b of line.b ?? []) {
    const i = line.text.indexOf(b, at)
    if (i < 0) continue
    if (i > at) out.push(line.text.slice(at, i))
    out.push(<b key={i}>{b}</b>)
    at = i + b.length
  }
  if (at < line.text.length) out.push(line.text.slice(at))
  return <>{out}</>
}

function CardView({ i, onClose }: { i: number; onClose: () => void }) {
  const st = STATIONS[i]
  const c = CARDS[st.sec]
  const rest = c.title.text.slice(c.title.name.length).trim()
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => closeRef.current?.focus(), [])
  return (
    <div className="ch13-veil" onClick={onClose}>
      <article className="ch13-card" role="dialog" aria-modal="true" aria-labelledby="ch13-card-title" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type="button" className="ch13-close" onClick={onClose} aria-label="סגירה">
          ×
        </button>
        <p className="ch13-kicker">
          תחנה {i + 1} מתוך {STATIONS.length}
        </p>
        <h2 id="ch13-card-title">{c.title.name}</h2>
        {rest && <p className="ch13-sub">{rest}</p>}
        <figure className={`ch13-art is-${st.kind}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ART}flags/${st.tex}`} alt="" />
        </figure>
        {c.label && <p className="ch13-label">{c.label}</p>}
        {c.items && (
          <ul className="ch13-items">
            {c.items.map((it, k) => (
              <li key={k}>
                <Bolded line={it} />
              </li>
            ))}
          </ul>
        )}
        {c.quotes?.map((q, k) => (
          <blockquote key={k} className="ch13-quote">
            <p>
              <Bolded line={q} />
            </p>
            {q.ref && <cite>{q.ref}</cite>}
          </blockquote>
        ))}
      </article>
    </div>
  )
}

/* ── המעטפת ── */
const CODES: Record<string, string> = {
  /* WASD = החצים (המשתמשת, 4.11): A/D מסובבים, לא צועדים לצד */
  KeyW: 'w', KeyS: 's', KeyA: 'left', KeyD: 'right',
  ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'left', ArrowRight: 'right',
  ShiftLeft: 'shift', ShiftRight: 'shift',
}

export default function FlagHall() {
  const keys = useRef<Keys>(new Set())
  const look = useRef({ yaw: 0, pitch: -0.02 })
  const [started, setStarted] = useState(false)
  const [near, setNear] = useState<number | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [read, setRead] = useState<string[]>([])
  /* the practice opens once all sixteen cards were read (the user, 8.11.2026). Reading the
     last one THIS visit raises the closing card when it is shut; a reader who comes back
     with all sixteen read finds the way in the HUD instead, without the ceremony again. */
  const [finale, setFinale] = useState(false)
  const [practiced, setPracticed] = useState(false)

  useEffect(() => {
    setRead(readStore().stations)
    setPracticed(practiceComplete())
  }, [])
  const openCard = useCallback((i: number) => {
    keys.current.clear()
    setOpen(i)
    const before = readStore().stations.length
    const now = markStationRead(STATIONS[i].sec).stations
    setRead(now)
    if (before < STATION_ORDER.length && now.length === STATION_ORDER.length) setFinale(true)
  }, [])
  const showFinale = finale && open === null

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!started) return
      if (showFinale) {
        if (e.code === 'Escape') setFinale(false)
        return
      }
      if (open !== null) {
        if (e.code === 'Escape' || e.code === 'KeyE') {
          e.preventDefault()
          setOpen(null)
        }
        return
      }
      if ((e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') && near !== null) {
        e.preventDefault()
        openCard(near)
        return
      }
      const k = CODES[e.code]
      if (k) {
        e.preventDefault()
        keys.current.add(k)
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = CODES[e.code]
      if (k) keys.current.delete(k)
    }
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [started, open, near, openCard, showFinale])

  /* מבט בגרירה (המשתמשת, 9.11.2026 — הופך את „העכבר לא ישנה כלום" של 4.11): לוחצים על האולם
     וגוררים — ימינה/שמאלה פונה, למעלה/למטה מטה את המבט עד ‎±35°. גרירה ולא נעילת סמן, כדי שהסמן
     לא נלכד ושה-HUD נשאר לחיץ. במגע: אצבע אחת על האולם עושה אותו דבר, ולוח החצים נשאר.
     לא פועל כשכרטיס או כרטיס הסיום פתוחים. המבט רודף אחרי היעד (Player), כך שהגרירה חלקה. */
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const lookLive = started && open === null && !showFinale
  const PITCH = 35 * DEG
  const stageDrag = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!lookLive || drag.current || (e.pointerType === 'mouse' && e.button !== 0)) return
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
      e.currentTarget.classList.add('is-dragging')
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      if (!lookLive) return
      const k = e.pointerType === 'touch' ? 0.0045 : 0.0032
      /* כמו במשחק גוף ראשון: גרירה ימינה פונה ימינה, גרירה למעלה מרימה את המבט */
      look.current.yaw -= (e.clientX - d.x) * k
      look.current.pitch = Math.max(-PITCH, Math.min(PITCH, look.current.pitch - (e.clientY - d.y) * k))
      d.x = e.clientX
      d.y = e.clientY
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      if (drag.current?.id !== e.pointerId) return
      drag.current = null
      e.currentTarget.classList.remove('is-dragging')
    },
  }
  useEffect(() => {
    if (!lookLive) drag.current = null
  }, [lookLive])

  /* מקלדת: W/S הליכה, A/D וחצים פנייה. במגע: ארבעה כפתורים, לוחצים ומחזיקים */
  const hold = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); keys.current.add(k) },
    onPointerUp: () => keys.current.delete(k),
    onPointerLeave: () => keys.current.delete(k),
    onPointerCancel: () => keys.current.delete(k),
  })

  const done = read.length
  const all = STATION_ORDER.length

  return (
    <div className="ch13-root">
      <div className={`ch13-stage${lookLive ? ' is-look' : ''}`} {...stageDrag} onPointerCancel={stageDrag.onPointerUp} onLostPointerCapture={stageDrag.onPointerUp}>
        <Canvas
          dpr={[1, 1.75]}
          gl={{ antialias: true, toneMapping: THREE.AgXToneMapping, toneMappingExposure: 1.1 }}
          camera={{ fov: 62, near: 0.05, far: 90, position: [0, EYE, 4.8] }}
        >
          <color attach="background" args={['#2a2018']} />
          <hemisphereLight args={['#f3e6cc', '#4a3322', 0.55]} />
          {Array.from({ length: 8 }, (_, k) => (
            <pointLight key={k} position={[0, HALL_H - 0.8, -(Y0 + 3 + k * 7.5)]} intensity={9} distance={16} decay={2} color="#f2e2c8" />
          ))}
          <ClothClock />
          <Suspense fallback={null}>
            <Hall />
            {STATIONS.map((_, i) => (
              <StationView key={i} i={i} />
            ))}
          </Suspense>
          <Player keys={keys} frozen={!started || open !== null || showFinale} look={look} onNear={setNear} />
        </Canvas>
      </div>

      <header className="ch13-hud">
        <Link href="/chapters" className="ch13-back" aria-label="חזרה לעמוד הפרקים">
          → הפרקים
        </Link>
        <p className="ch13-chapter">פרק 13 · {passages.title}</p>
        <p className="ch13-count" aria-live="polite">
          נקראו {done} מתוך {all}
        </p>
        {done === all && (
          <Link href="/chapter13/practice" className="ch13-practice">
            לתרגול המסכם
            {practiced && <span className="ch13-done">הושלם</span>}
          </Link>
        )}
      </header>

      {started && open === null && !showFinale && near !== null && (
        <button type="button" className="ch13-prompt" onClick={() => openCard(near)}>
          <kbd>E</kbd> {CARDS[STATIONS[near].sec].title.name}
        </button>
      )}

      {started && open === null && !showFinale && (
        <div className="ch13-touch" aria-hidden="true">
          <button type="button" className="is-up" {...hold('w')}>▲</button>
          <button type="button" className="is-left" {...hold('left')}>◀</button>
          <button type="button" className="is-right" {...hold('right')}>▶</button>
          <button type="button" className="is-down" {...hold('s')}>▼</button>
        </div>
      )}

      {open !== null && <CardView i={open} onClose={() => setOpen(null)} />}

      {showFinale && (
        <div className="ch13-veil" onClick={() => setFinale(false)}>
          <section className="ch13-card ch13-intro" role="dialog" aria-modal="true" aria-labelledby="ch13-finale-title" onClick={(e) => e.stopPropagation()}>
            <p className="ch13-kicker">נקראו {done} מתוך {all}</p>
            <h2 id="ch13-finale-title">קראתם את כל הדגלים והסמלים</h2>
            <p className="ch13-sub">עכשיו — התרגול המסכם של הפרק.</p>
            <div className="ch13-finale-go">
              <Link href="/chapter13/practice" className="ch13-go" autoFocus>
                לתרגול המסכם
              </Link>
              <button type="button" className="ch13-stay" onClick={() => setFinale(false)}>
                להמשיך באולם
              </button>
            </div>
          </section>
        </div>
      )}

      {!started && (
        <div className="ch13-veil">
          <section className="ch13-card ch13-intro">
            <p className="ch13-kicker">פרק 13</p>
            <h1>{passages.sourceTitle}</h1>
            <ul className="ch13-keys">
              <li><kbd>W</kbd> <kbd>S</kbd> או <kbd>↑</kbd> <kbd>↓</kbd> — הליכה</li>
              <li><kbd>A</kbd> <kbd>D</kbd> או <kbd>←</kbd> <kbd>→</kbd> — פנייה</li>
              <li>גרירה בעכבר על האולם — הסתכלות לצדדים ולמעלה ולמטה</li>
              <li><kbd>E</kbd> ליד דגל — הכרטיס שלו</li>
            </ul>
            <button type="button" className="ch13-go" onClick={() => setStarted(true)} autoFocus>
              כניסה לאולם
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
