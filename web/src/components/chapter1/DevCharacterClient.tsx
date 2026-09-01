'use client'

/* חדר האבחון לדמויות. לא חלק מהמסע — עמוד עבודה שבו הליכה נשפטת
   בתנועה, מכל צד, גם בהאטה, לפני שנכס מגיע לעולם.

   הרצפה זזה, הדמות לא: הדמות צועדת במקום והרצפה המשובצת נעה מתחתיה
   במהירות הקרקע שהקליפ אמור לכסות (חוק הסנכרון הליניארי של המשחק).
   אם כפות הרגליים מחליקות על המשבצות — הקליפ והחוק לא מסונכרנים.

   ?model=/assets/.../x.glb לבחירת נכס, ?cycle=1.9 למטרים-ללולאה. */

import { Canvas, useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { SkeletonUtils } from 'three-stdlib'

const DEFAULT_MODEL = '/assets/chapter1/models/traveler-anim.glb'

function useQuery(name: string, fallback: string): string {
  const [v, setV] = useState(fallback)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get(name)
    if (q) setV(q)
  }, [name])
  return v
}

function MovingFloor({ speed }: { speed: { current: number } }) {
  const ref = useRef<THREE.Mesh>(null)
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    g.fillStyle = '#8a7a5f'
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = '#5c5140'
    g.lineWidth = 6
    g.strokeRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(30, 30)
    return t
  }, [])
  useFrame((_, dt) => {
    /* משבצת אחת = מטר אחד: הטקסטורה חוזרת 30 פעמים על 30 מטר */
    tex.offset.y -= (speed.current * dt) / 1
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  )
}

function Rig({ url, clip, timeScale }: {
  url: string
  clip: string
  timeScale: number
}) {
  const { scene, animations } = useGLTF(url)
  const cloned = useMemo(() => {
    const c = SkeletonUtils.clone(scene)
    /* נרמול קנה מידה — כלל הצינור מאז ה-POC: כל נכס נמדד ומוצב לגובה
       אדם, לא סומכים על היחידות של הכלי שייצא אותו. */
    return c
  }, [scene])
  const { actions, names } = useAnimations(animations, cloned)
  useEffect(() => {
    const a = actions[clip] ?? actions[names[0]]
    if (!a) return
    a.reset().fadeIn(0.2).play()
    return () => {
      a.fadeOut(0.2)
    }
  }, [actions, names, clip])
  useFrame(() => {
    const a = actions[clip] ?? actions[names[0]]
    if (a) a.setEffectiveTimeScale(timeScale)
  })
  useEffect(() => {
    cloned.traverse((o) => {
      o.castShadow = true
      if (o instanceof THREE.Mesh) o.frustumCulled = false
    })
  }, [cloned])
  /* מד-סקייט: כשכף רגל נטועה (בגובה המזערי שלה) המהירות האופקית שלה
     בעולם היא בדיוק המהירות שהקליפ "מכסה". ב-timeScale=1 זה נותן
     מטרים-לשנייה של הקליפ עצמו → מטרים-ללולאה = speed·clipSeconds.
     נקרא מבחוץ דרך window.__devWalk. */
  const probe = useRef({ feet: [] as { name: string; last: THREE.Vector3; minY: number }[], t: 0 })
  useEffect(() => {
    const feet: { name: string; last: THREE.Vector3; minY: number }[] = []
    cloned.traverse((o) => {
      if (/^(Left|Right)Foot$/.test(o.name)) feet.push({ name: o.name, last: new THREE.Vector3(), minY: Infinity })
    })
    probe.current.feet = feet
    const arm = cloned.getObjectByName('Armature')
    const hips = cloned.getObjectByName('Hips')
    ;(window as unknown as { __devScale?: object }).__devScale = { armScale: arm?.scale.x, armWorld: arm?.getWorldScale(new THREE.Vector3()).x, hipsWorldY: hips?.getWorldPosition(new THREE.Vector3()).y }
    ;(window as unknown as { __devDbg?: object }).__devDbg = { feet: feet.map((f) => f.name), vs: [] as number[] }
    ;(window as unknown as { __devWalk?: object }).__devWalk = { samples: [] as number[] }
  }, [cloned])
  const tmpV = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    if (dt <= 0) return
    /* פוזת הכפיתה של הפריימים הראשונים מרעילה את מינימום הגובה */
    if (probe.current.t < 90) { probe.current.t++; return }
    const w = (window as unknown as { __devWalk?: { samples: number[] } }).__devWalk
    for (const f of probe.current.feet) {
      const node = cloned.getObjectByName(f.name)
      if (!node) continue
      node.getWorldPosition(tmpV)
      if (tmpV.y < f.minY) f.minY = tmpV.y
      const planted = tmpV.y < f.minY + 0.03
      if (planted && f.last.lengthSq() > 0 && w) {
        const v = Math.hypot(tmpV.x - f.last.x, tmpV.z - f.last.z) / dt
        if (v > 0.05 && v < 10) w.samples.push(v)
        const dbg = (window as unknown as { __devDbg?: { vs: number[] } }).__devDbg
        if (dbg && dbg.vs.length < 50) dbg.vs.push(+v.toFixed(3))
        if (w.samples.length > 2000) w.samples.shift()
      }
      f.last.copy(tmpV)
      const dbg2 = (window as unknown as { __devY?: number[] }).__devY ?? ((window as unknown as { __devY?: number[] }).__devY = [])
      if (dbg2.length < 120) dbg2.push(+tmpV.y.toFixed(3))
    }
  })
  return <primitive object={cloned} />
}

const CAMS: Record<string, [number, number, number]> = {
  front: [0, 1.4, 3.4],
  far: [0, 2.2, 9],
  side: [3.4, 1.4, 0],
  back: [0, 1.4, -3.4],
  low: [1.8, 0.5, 2.6],
}

export default function DevCharacterClient() {
  const model = useQuery('model', DEFAULT_MODEL)
  const cycleMetres = parseFloat(useQuery('cycle', '1.9'))
  const clipSeconds = parseFloat(useQuery('clip', '1.042'))
  const [clip, setClip] = useState('walk')
  const [cam, setCam] = useState<keyof typeof CAMS>('front')
  const [slow, setSlow] = useState(1)
  const [ground, setGround] = useState(2.6)
  const speedRef = useRef(2.6)
  const [clips, setClips] = useState<string[]>([])

  /* ?raw=1: הקליפ רץ ב-timeScale=1 והרצפה עומדת — מצב מדידה */
  const raw = useQuery('raw', '') === '1'
  /* חוק הסנכרון של המשחק, אחד לאחד */
  const walking = clip === 'walk' || clip === 'run'
  const ts = raw ? 1 : walking ? ((ground * clipSeconds) / cycleMetres) * slow : slow
  speedRef.current = raw ? 0 : walking ? ground * slow : 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#241d14', color: '#f5ecd6', direction: 'rtl' }}>
      <Canvas key={cam} shadows camera={{ position: CAMS[cam], fov: 40 }} dpr={[1, 2]}>
        <hemisphereLight intensity={0.7} groundColor="#5c5140" />
        <directionalLight
          position={[4, 6, 3]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-4, 3, -2]} intensity={0.5} />
        <Suspense fallback={null}>
          <Rig url={model} clip={clip} timeScale={ts} />
          <ClipNames url={model} onNames={setClips} />
        </Suspense>
        <MovingFloor speed={speedRef} />
      </Canvas>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: '70vw' }}>
        {clips.map((c) => (
          <button key={c} onClick={() => setClip(c)} style={btn(clip === c)}>{c}</button>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', maxWidth: '90vw' }}>
        {(Object.keys(CAMS) as (keyof typeof CAMS)[]).map((c) => (
          <button key={c} onClick={() => setCam(c)} style={btn(cam === c)}>{c}</button>
        ))}
        <label style={{ fontSize: 13 }}>
          האטה ×{slow.toFixed(2)}
          <input type="range" min={0.1} max={1} step={0.05} value={slow} onChange={(e) => setSlow(+e.target.value)} />
        </label>
        <label style={{ fontSize: 13 }}>
          קרקע {ground.toFixed(1)} מ׳/שנ׳
          <input type="range" min={0.6} max={4.4} step={0.1} value={ground} onChange={(e) => setGround(+e.target.value)} />
        </label>
        <span style={{ fontSize: 12, opacity: 0.7 }}>timeScale={ts.toFixed(2)}</span>
      </div>
    </div>
  )
}

function ClipNames({ url, onNames }: { url: string; onNames: (n: string[]) => void }) {
  const { animations } = useGLTF(url)
  useEffect(() => {
    onNames(animations.map((a) => a.name))
  }, [animations, onNames])
  return null
}

function btn(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid rgba(245,236,214,.3)',
    background: active ? '#c79a3c' : 'rgba(0,0,0,.35)',
    color: active ? '#241d14' : '#f5ecd6',
    cursor: 'pointer',
    fontSize: 13,
  }
}
