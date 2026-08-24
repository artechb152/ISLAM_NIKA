'use client'

/* The people of chapter 1, in two flavours.

   Rawi is skeletally animated (Mixamo clips baked onto one skeleton), because
   he is the only character who walks — he escorts the player the whole way.

   The five others are NOT rigged, on purpose. Their meshes come from
   image-to-3D reconstruction of robed figures, where the sleeves fuse into the
   cloth; Mixamo's auto-rigger refuses them outright and hand-binding a
   borrowed skeleton shreds the robe (both routes were built and measured — see
   HANDOFF-CHAPTER1 §5). They never walk, so they get skeleton-free life in the
   vertex shader instead: a height-weighted sway, a breath centred on the
   chest, and a talk layer that eases in while they speak. The mesh is never
   re-weighted, so it stays exactly as authored. */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { MODEL, type SpeakerId } from '@/lib/chapter1/dialogue'
import { wrapPi } from '@/lib/chapter1/angles'

const CHAR_HEIGHT = 1.7

/** Uniform scale + ground offset so any export stands 1.7 m tall on y=0.
    The explicit matrix updates are load-bearing: a freshly cloned hierarchy
    still carries identity world matrices, and Box3 would then measure the raw
    Z-up geometry — the character comes out lying on its side and several times
    too large. */
function fitToGround(obj: THREE.Object3D) {
  obj.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(obj)
  const h = box.max.y - box.min.y
  if (h > 0) obj.scale.setScalar(CHAR_HEIGHT / h)
  obj.updateMatrixWorld(true)
  const after = new THREE.Box3().setFromObject(obj)
  obj.position.y -= after.min.y
  obj.updateMatrixWorld(true)
}

/* ---------------- Rawi — skeletal ---------------- */

export type RawiClip = 'idle' | 'walk' | 'talk' | 'talk-nod' | 'talk-ack' | 'talk-happy'

export function Rawi({
  clip,
  position,
  lookAt,
  groundAt,
}: {
  clip: RawiClip
  position: THREE.Vector3
  /** גובה פני הקרקע בנקודה — הטרסה אינה יושבת על אפס */
  groundAt?: (x: number, z: number) => number
  /** World point the body turns toward — the player, or the character speaking. */
  lookAt?: THREE.Vector3
}) {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF(MODEL.rawi)
  const model = useMemo(() => {
    // Object3D.clone() shares the skeleton and leaves the clone unbound, so a
    // skinned character silently collapses. SkeletonUtils rebuilds the bone
    // hierarchy and rebinds it.
    const c = cloneSkinned(scene)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = false
        m.frustumCulled = false // skinned bounds go stale during clips
      }
    })
    fitToGround(c)
    return c
  }, [scene])
  const { actions } = useAnimations(animations, model)

  useEffect(() => {
    const next = actions[clip]
    if (!next) return
    next.reset().fadeIn(0.35).play()
    return () => {
      next.fadeOut(0.35)
    }
  }, [actions, clip])

  useFrame(() => {
    const g = group.current
    if (!g) return
    g.position.copy(position)
    /* הראוי הולך, ולכן גובה הקרקע נדגם מחדש בכל פריים */
    if (groundAt) g.position.y = groundAt(position.x, position.z)
    if (lookAt) {
      const want = Math.atan2(lookAt.x - position.x, lookAt.z - position.z)
      /* shortest-arc easing so he never spins the long way round — via atan2
         rather than a modulo, because JS `%` keeps the dividend's sign and so
         left the whole range [−3π, −π) unwrapped, which is precisely when the
         long way round happened */
      g.rotation.y += wrapPi(want - g.rotation.y) * 0.12
    }
  })

  return (
    <group ref={group}>
      <primitive object={model} />
      <ContactShadow radius={0.46} />
    </group>
  )
}

/* ── צל מגע ────────────────────────────────────────────────
   הצל מהשמש נופל הצידה, ולכן מתחת לרגליים עצמן לא נשאר דבר —
   ודמות בלי כתם כהה בבסיסה נקראת כשקועה בחול או מרחפת מעליו,
   גם כשהיא עומדת בדיוק על הקרקע. זה כתם רך שנצבע ישירות, בלי
   מפת צללים: הוא זול, יציב, ולא תלוי בזווית השמש. */
const CONTACT_TEX = (() => {
  let tex: THREE.Texture | null = null
  return () => {
    if (tex) return tex
    const s = 128
    const cv = document.createElement('canvas')
    cv.width = cv.height = s
    const c = cv.getContext('2d')!
    const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(0,0,0,0.55)')
    g.addColorStop(0.45, 'rgba(0,0,0,0.28)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    c.fillStyle = g
    c.fillRect(0, 0, s, s)
    tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }
})()

export function ContactShadow({ radius = 0.42 }: { radius?: number }) {
  const tex = useMemo(() => CONTACT_TEX(), [])
  return (
    /* מעט מעל הקרקע כדי שלא ייאבק על אותו מישור עם הטרסה */
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} renderOrder={1}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        map={tex}
        transparent
        depthWrite={false}
        opacity={0.85}
        toneMapped={false}
      />
    </mesh>
  )
}

/* ---------------- The robed characters — shader-animated ---------------- */

interface ProcUniforms {
  uTime: { value: number }
  uTalk: { value: number }
  uH: { value: number }
}

const PROC_COMMON = /* glsl */ `
  uniform float uTime; uniform float uTalk; uniform float uH;
`

/* האמפליטודות כאן היו בסדר גודל של סנטימטר אחד על דמות בגובה 1.70 —
   כלומר תנועה שקיימת במתמטיקה ולא נראית בעין. חמש מהדמויות הן רשת
   סטטית בלי שלד ובלי אנימציות, ולכן השכבה הזאת היא כל מה שמפריד
   בינן לבין פסל. הערכים הוגדלו עד לסף שבו התנועה נקראת מטווח שיחה
   אבל הרגליים עדיין נטועות — התלות הריבועית בגובה היא מה ששומר
   על השוליים במקום. */
const PROC_VERTEX = /* glsl */ `
  float h = clamp(transformed.y / uH, 0.0, 1.0);
  float t = uTime;
  // נדנוד מנוחה — ריבועי בגובה, כך שהמכפלת כמעט לא זזה
  transformed.x += sin(t * 0.9 + h * 1.8) * 0.042 * h * h;
  transformed.z += cos(t * 0.7 + h * 1.4) * 0.030 * h * h;
  // העברת משקל איטית מרגל לרגל — הדבר שהכי מסגיר גוף חי בעמידה
  float shift = sin(t * 0.31);
  transformed.x += shift * 0.030 * h;
  transformed.y -= abs(shift) * 0.012 * h;
  // נשימה — התנפחות שמרוכזת בחזה
  float chest = exp(-pow((h - 0.72) * 5.0, 2.0));
  transformed.z += sin(t * 1.6) * 0.024 * chest;
  transformed.y += sin(t * 1.6) * 0.015 * chest;
  // שכבת הדיבור — נדנוד ראש ותנועת פלג גוף עליון
  float head = smoothstep(0.80, 0.97, h);
  transformed.y -= abs(sin(t * 3.4)) * 0.042 * head * uTalk;
  transformed.x += sin(t * 2.6 + 1.0) * 0.048 * h * h * uTalk;
  transformed.z += sin(t * 3.0) * 0.034 * head * uTalk;
  // מחווה — הכתפיים נפתחות מעט כשמדברים
  float shoulder = exp(-pow((h - 0.82) * 6.0, 2.0));
  transformed.x += sin(t * 1.9) * 0.030 * shoulder * uTalk;
`

export function Npc({
  who,
  position,
  rotationY = 0,
  speaking,
  playerRef,
  tint,
}: {
  who: Exclude<SpeakerId, 'narrator' | 'rawi'>
  position: [number, number, number]
  rotationY?: number
  speaking: boolean
  /** מיקום השחקן, כדי שהדמות תפנה אליו כשהוא מתקרב */
  playerRef?: { current: { x: number; z: number } }
  /** מכפיל צבע על הבגד — ניצב שנבנה מדגם של דמות מדברת חייב להיראות
      כאדם אחר, לא כתאום שלה */
  tint?: string
}) {
  const { scene } = useGLTF(MODEL[who])
  const group = useRef<THREE.Group>(null)
  const uniforms = useRef<ProcUniforms>({
    uTime: { value: 0 },
    uTalk: { value: 0 },
    uH: { value: CHAR_HEIGHT },
  })

  const model = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = false
      const mat = (m.material as THREE.MeshStandardMaterial).clone()
      if (tint) mat.color.set(tint)
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = uniforms.current.uTime
        shader.uniforms.uTalk = uniforms.current.uTalk
        shader.uniforms.uH = uniforms.current.uH
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', `#include <common>\n${PROC_COMMON}`)
          .replace('#include <begin_vertex>', `#include <begin_vertex>\n${PROC_VERTEX}`)
      }
      mat.needsUpdate = true
      m.material = mat
    })
    fitToGround(c)
    // the shader works in the model's own units, so tell it the pre-scale height
    uniforms.current.uH.value = CHAR_HEIGHT / (c.scale.y || 1)
    return c
  }, [scene])

  useFrame((_, dt) => {
    const u = uniforms.current
    u.uTime.value += dt
    const want = speaking ? 1 : 0
    u.uTalk.value += (want - u.uTalk.value) * Math.min(dt * 3.5, 1)

    /* פנייה אל השחקן. דמות שממשיכה להביט לכיוון קבוע בזמן שעומדים
       מולה ומדברים איתה נקראת כפסל — וזה הסימן היחיד החזק באמת,
       הרבה מעבר לנשימה. הפנייה מוגבלת בטווח, כדי שהאזור לא ייראה
       כמו חדר שכולו מסתובב אחרי מי שנכנס אליו, ומוחלקת בזמן, כדי
       שראש לא ינתר. */
    const g = group.current
    const p = playerRef?.current
    if (!g || !p) return
    const dx = p.x - position[0]
    const dz = p.z - position[2]
    const dist = Math.hypot(dx, dz)
    const NOTICE = 9
    let target = rotationY
    if (dist < NOTICE && dist > 0.4) {
      const facing = Math.atan2(dx, dz)
      /* קרוב = פנייה מלאה, בקצה הטווח = הצצה בלבד */
      const pull = 1 - Math.min(1, dist / NOTICE)
      let d = facing - rotationY
      while (d > Math.PI) d -= Math.PI * 2
      while (d < -Math.PI) d += Math.PI * 2
      target = rotationY + d * pull
    }
    let diff = target - g.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    g.rotation.y += diff * Math.min(dt * 2.4, 1)
  })

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <primitive object={model} />
      <ContactShadow radius={0.5} />
    </group>
  )
}

useGLTF.preload(MODEL.rawi)
