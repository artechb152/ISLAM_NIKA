'use client'

/* The find itself, in hand. The card used to describe the object in text while
   the object — a full GLB, already loaded in the world — lay as a few pixels on
   the ground behind the dialog. Now the thing you bent down for is the thing
   you look at: slowly turning, and yours to spin.
 *
 * A second, small Canvas, deliberately separate from the world's: it lives and
 * dies with the card, carries two lights and one object, and the painterly
 * pass does not reach it — an object under study reads crisp, like a plate in
 * a catalogue, not like a painting of one. */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function Turntable({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const spin = useRef<THREE.Group>(null)
  const drag = useRef({ on: false, lastX: 0, vel: 0.5 })

  /* fit whatever the model is into the same frame: centred, ~1 unit tall */
  const fitted = useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const size = box.getSize(new THREE.Vector3())
    const s = 1 / Math.max(size.x, size.y, size.z, 1e-4)
    c.scale.setScalar(s)
    const centre = box.getCenter(new THREE.Vector3()).multiplyScalar(s)
    c.position.sub(centre)
    return c
  }, [scene])

  useFrame((_, dt) => {
    const g = spin.current
    if (!g) return
    if (!drag.current.on) {
      /* מסתובב לאט מעצמו; אחרי גרירה — דועך חזרה אל קצב התצוגה */
      drag.current.vel += (0.5 - drag.current.vel) * Math.min(1, dt * 1.2)
      g.rotation.y += drag.current.vel * dt
    }
  })

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current.on || !spin.current) return
      spin.current.rotation.y += (e.clientX - drag.current.lastX) * 0.012
      drag.current.vel = (e.clientX - drag.current.lastX) * 0.7
      drag.current.lastX = e.clientX
    }
    const up = () => { drag.current.on = false }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  return (
    <group
      ref={spin}
      onPointerDown={(e) => {
        drag.current.on = true
        drag.current.lastX = e.clientX
      }}
    >
      <primitive object={fitted} />
    </group>
  )
}

export function FindView({ model }: { model: string }) {
  /* הקנבס נולד טיק אחרי הכרטיס: יצירת הקשר WebGL שני בפתיחה חוסמת את
     ה-thread, והכרטיס היה נתקע לרגע לפני שהופיע. קודם הכרטיס — אז הבמה. */
  const [staged, setStaged] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setStaged(true), 60)
    return () => window.clearTimeout(t)
  }, [])
  if (!staged) return <div className='ch1-find-view' aria-hidden='true' />
  return (
    <div className="ch1-find-view" aria-hidden="true">
      <Canvas camera={{ position: [0, 0.35, 1.45], fov: 30 }} dpr={[1, 2]} gl={{ alpha: true }}>
        <ambientLight intensity={0.85} color="#fff3e0" />
        <directionalLight position={[2.5, 3, 2]} intensity={2.2} color="#ffe2b8" />
        <directionalLight position={[-2, 1, -2.5]} intensity={0.7} color="#b9c8e8" />
        <Suspense fallback={null}>
          <Turntable url={`/assets/chapter1/models/${model}.glb`} />
        </Suspense>
      </Canvas>
    </div>
  )
}
