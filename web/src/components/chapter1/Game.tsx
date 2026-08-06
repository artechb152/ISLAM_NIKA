'use client'

/* Chapter 1 game shell — milestone 1.
   Structure: site header (identical to the article chapters) + R3F canvas +
   DOM HUD. The HUD lives entirely outside WebGL so RTL, fonts and keyboard
   accessibility come from the regular page. World markers are DOM nodes whose
   screen positions are written imperatively each frame (no per-frame React
   state) — the same discipline as the chapter 6 scroll engine. */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { STATIONS, STATION_COUNT_PLANNED, type Poi } from '@/lib/chapter1/stations'
import campLayout from '@/lib/chapter1/camp-layout.json'
import { markPoiDone, markStationDone, poiKey, readStore } from '@/lib/chapter1/progress'

const station = STATIONS[0]

/* ---------------- shared mutable channel between canvas and HUD ---------------- */

/** Circular footprint the player cannot walk into. */
interface Collider {
  x: number
  z: number
  r: number
}

interface Live {
  /** DOM node of the speech bubble, positioned on the active speaker */
  bubbleEl: HTMLElement | null
  bubblePoi: Poi | null
  player: THREE.Vector3
  yaw: number
  keys: Set<string>
  markerEls: Map<string, HTMLElement>
  nearPoiId: string | null
  /** static props (tents, palms, well…) */
  colliders: Collider[]
  /** moving props (wandering camels) — mutated in place each frame */
  dynamic: Collider[]
}

function makeLive(): Live {
  return {
    player: new THREE.Vector3(0, 0, 4),
    yaw: 0,
    keys: new Set(),
    markerEls: new Map(),
    bubbleEl: null,
    bubblePoi: null,
    nearPoiId: null,
    colliders: [],
    dynamic: [],
  }
}

/* ---------------- 3D world ---------------- */

/* Painted 360° dawn panorama as the scene background — this single texture does
   most of the visual heavy lifting (mountains, sun glow, sky gradient). */
function Sky() {
  const tex = useLoader(THREE.TextureLoader, '/assets/chapter1/tex/sky-dawn.png')
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.colorSpace = THREE.SRGBColorSpace
    scene.background = tex
    scene.environment = tex
    return () => {
      scene.background = null
      scene.environment = null
    }
  }, [scene, tex])
  return null
}

/* ONE continuous terrain: the user's "Canyon Desert Landscape" Blender asset,
   scaled to ~600 m, positioned so the camp sits in a wide canyon-floor basin,
   and with its vertices FLATTENED around the camp with a smooth falloff. There
   is no separate sand disc any more — a single mesh means no seam and no colour
   mismatch between clearing and canyon. */
const TERRAIN_SPAN = 600
const CAMP_LOCAL = { x: 180, z: -20 } // basin found by height-map analysis
const FLAT_INNER = 30 // metres of perfectly level ground around the camp
const FLAT_OUTER = 85 // fade-out distance back to the original relief

/* Terrain baked in Blender: already scaled, positioned and flattened there, so
   the game only has to give it a material. A procedural Blender material cannot
   survive glTF, so when the export carries no image we keep the tiling sand and
   tint it with the material's base colour. */
function BakedTerrain({ url, hasImage, tint }: { url: string; hasImage: boolean; tint?: string }) {
  const { scene } = useGLTF(url)
  const sandSrc = useLoader(THREE.TextureLoader, '/assets/chapter1/tex/sand.jpg')
  const obj = useMemo(() => {
    const c = scene.clone(true)
    if (!hasImage) {
      const sand = sandSrc.clone()
      sand.needsUpdate = true
      sand.wrapS = sand.wrapT = THREE.RepeatWrapping
      sand.colorSpace = THREE.SRGBColorSpace
      sand.repeat.set(90, 90)
      sand.anisotropy = 8
      c.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const src = m.material as THREE.MeshStandardMaterial
        const mat = new THREE.MeshStandardMaterial({
          color: tint ?? '#e9c9a4',
          map: sand,
          normalMap: src?.normalMap ?? null,
          roughness: 1,
          metalness: 0,
          side: THREE.FrontSide,
        })
        mat.normalScale = new THREE.Vector2(0.3, 0.3)
        m.material = mat
      })
    }
    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) m.receiveShadow = true
    })
    return c
  }, [scene, sandSrc, hasImage, tint])
  return <primitive object={obj} />
}

function Terrain() {
  const { scene } = useGLTF(MODEL_CANYON)
  const sandSrc = useLoader(THREE.TextureLoader, '/assets/chapter1/tex/sand.jpg')
  const obj = useMemo(() => {
    const sand = sandSrc.clone()
    sand.needsUpdate = true
    sand.wrapS = sand.wrapT = THREE.RepeatWrapping
    sand.colorSpace = THREE.SRGBColorSpace
    sand.repeat.set(90, 90)
    sand.anisotropy = 8

    const c = scene.clone(true)
    const box0 = new THREE.Box3().setFromObject(c)
    const size = new THREE.Vector3()
    box0.getSize(size)
    const s = Math.max(size.x, size.z) > 0 ? TERRAIN_SPAN / Math.max(size.x, size.z) : 1
    const inner = FLAT_INNER / s
    const outer = FLAT_OUTER / s

    c.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.receiveShadow = true

      /* The Blender export wired the normal map into baseColor too, so the
         cliffs render bone-white. Rebuild the material: keep the exported
         normal map for surface relief, drive colour from the sand texture. */
      const src = m.material as THREE.MeshStandardMaterial
      const mat = new THREE.MeshStandardMaterial({
        color: '#e9c9a4',
        map: sand,
        normalMap: src?.normalMap ?? null,
        roughness: 1,
        metalness: 0,
        side: THREE.FrontSide,
      })
      /* The baked normal map is authored for a close-up cliff render; at full
         strength it breaks the dunes into pale streaks. Softening it keeps the
         relief but gives the even sand colour the desert should read as. */
      mat.normalScale = new THREE.Vector2(0.3, 0.3)
      m.material = mat

      // flatten the basin — geometry must be owned, clone() shares it
      const geo = m.geometry.clone()
      const pos = geo.attributes.position as THREE.BufferAttribute
      let sum = 0
      let n = 0
      for (let i = 0; i < pos.count; i++) {
        const d = Math.hypot(pos.getX(i) - CAMP_LOCAL.x, pos.getZ(i) - CAMP_LOCAL.z)
        if (d < inner) {
          sum += pos.getY(i)
          n++
        }
      }
      const targetY = n ? sum / n : 0
      for (let i = 0; i < pos.count; i++) {
        const d = Math.hypot(pos.getX(i) - CAMP_LOCAL.x, pos.getZ(i) - CAMP_LOCAL.z)
        if (d >= outer) continue
        const t = THREE.MathUtils.smoothstep(d, inner, outer)
        pos.setY(i, THREE.MathUtils.lerp(targetY, pos.getY(i), t))
      }
      pos.needsUpdate = true
      geo.computeVertexNormals()
      geo.computeBoundingSphere()
      m.geometry = geo
      m.userData.flatY = targetY
    })

    c.scale.setScalar(s)
    c.position.x = -CAMP_LOCAL.x * s
    c.position.z = -CAMP_LOCAL.z * s
    let flatY = 0
    c.traverse((o) => {
      if (typeof o.userData.flatY === 'number') flatY = o.userData.flatY
    })
    c.position.y = -flatY * s // the flattened basin now sits exactly at y = 0
    return c
  }, [scene, sandSrc])
  return <primitive object={obj} />
}

/* Generic GLB prop, normalized so `height` is its world height and it sits on the
   ground regardless of how the source model was scaled or centered. */
function Prop({ url, x, z, ry = 0, height, liner, tint }: {
  url: string
  x: number
  z: number
  ry?: number
  height: number
  /** dark inner shell — hides gaps in generated meshes (tent canvas) */
  liner?: boolean
  /** Optional fallback tint for exported assets whose procedural colour was lost. */
  tint?: string
}) {
  const { scene } = useGLTF(url)
  const { object, dims } = useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const size = new THREE.Vector3()
    box.getSize(size)
    const s = size.y > 0 ? height / size.y : 1
    c.scale.setScalar(s)
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
      m.castShadow = true
      m.receiveShadow = true
      /* Generated meshes are single-sided, so thin surfaces (tent canvas,
         palm fronds) vanish when seen from behind and read as holes. */
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
    return { object: c, dims }
  }, [scene, height, liner, tint])
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <primitive object={object} />
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
const MODEL_TENT = '/assets/chapter1/models/tent2.glb'
const MODEL_FIREPIT = '/assets/chapter1/models/firepit.glb'
const MODEL_TORCH = '/assets/chapter1/models/torch.glb'
const MODEL_CAMEL = '/assets/chapter1/models/camel.glb'
const MODEL_TRAVELER_STAND = '/assets/chapter1/models/traveler-stand.glb'
const MODEL_TRAVELER_STRIDE = '/assets/chapter1/models/traveler-stride.glb'
const MODEL_TRAVELER_SIT = '/assets/chapter1/models/traveler-sit.glb'
const MODEL_TRAVELER_WATER = '/assets/chapter1/models/traveler-water.glb'
const MODEL_CONCEPT_BOARD = '/assets/chapter1/models/concept-board.glb'
const MODEL_PALM = '/assets/chapter1/models/palm.glb'
const MODEL_WELL = '/assets/chapter1/models/well.glb'
const MODEL_ROCKS = '/assets/chapter1/models/rocks.glb'
const MODEL_JARS = '/assets/chapter1/models/jars.glb'
const MODEL_FIREWOOD = '/assets/chapter1/models/firewood.glb'
const MODEL_SHRUB = '/assets/chapter1/models/shrub.glb'
const MODEL_CANYON = '/assets/chapter1/models/canyon.glb'
/** same camel, split into body + four hip-pivoted legs for the walk cycle */
const MODEL_CAMEL_PARTS = '/assets/chapter1/models/camel-parts.glb'
for (const m of [MODEL_TENT, MODEL_FIREPIT, MODEL_TORCH, MODEL_CAMEL, MODEL_CAMEL_PARTS, MODEL_TRAVELER_STAND, MODEL_TRAVELER_STRIDE, MODEL_TRAVELER_SIT, MODEL_TRAVELER_WATER, MODEL_CONCEPT_BOARD, MODEL_PALM, MODEL_WELL, MODEL_ROCKS, MODEL_JARS, MODEL_FIREWOOD, MODEL_SHRUB]) {
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
  const light = useRef<THREE.PointLight>(null)
  const smoke = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (light.current) light.current.intensity = 11 + Math.sin(t * 7) * 2 + Math.sin(t * 13) * 1.2
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
    <group position={[x, 0, z]}>
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
      {/* cooking tripod — each stick leans from its foot to a shared apex */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5
        const foot = new THREE.Vector3(Math.cos(a) * 0.85, 0.02, Math.sin(a) * 0.85)
        const apex = new THREE.Vector3(0, 1.7, 0)
        const dir = apex.clone().sub(foot)
        const len = dir.length()
        const mid = foot.clone().lerp(apex, 0.5)
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
        return (
          <mesh key={i} position={[mid.x, mid.y, mid.z]} quaternion={q} castShadow>
            <cylinderGeometry args={[0.024, 0.032, len + 0.15]} />
            <meshStandardMaterial color="#5a4530" roughness={1} />
          </mesh>
        )
      })}
      <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.42]} />
        <meshStandardMaterial color="#2c2620" roughness={1} />
      </mesh>
      <mesh position={[0, 1.12, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.22, 14]} />
        <meshStandardMaterial color="#3a3a3c" roughness={0.7} metalness={0.5} />
      </mesh>
      <pointLight ref={light} position={[0, 0.9, 0]} color="#ff9a3d" distance={15} decay={2} />
    </group>
  )
}

/* ------- camp set-dressing ------- */

function Rug({ x, z, ry = 0 }: { x: number; z: number; ry?: number }) {
  const weave = useLoader(THREE.TextureLoader, '/assets/chapter1/tex/tent-weave.jpg')
  useEffect(() => {
    weave.colorSpace = THREE.SRGBColorSpace
  }, [weave])
  return (
    <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, ry]} receiveShadow>
      <planeGeometry args={[1.7, 1.05]} />
      <meshStandardMaterial map={weave} color="#b98a6a" roughness={1} />
    </mesh>
  )
}

function Scrolls({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
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
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
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

function Pebbles() {
  const items = useMemo(() => scatterRing(64, 3.5, 23, 7), [])
  return (
    <group>
      {items.map((p, i) => (
        <mesh key={i} position={[p.x, 0.045, p.z]} rotation={[p.k * 3, p.k * 6, 0]}>
          <dodecahedronGeometry args={[0.055 + p.k * 0.075, 0]} />
          <meshStandardMaterial color={p.k > 0.5 ? '#a08765' : '#8d7a5e'} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function GrassTufts() {
  const items = useMemo(() => scatterRing(26, 5, 22, 3), [])
  return (
    <group>
      {items.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          {[0, 1, 2, 3].map((j) => (
            <mesh key={j} position={[Math.sin(j * 1.7) * 0.06, 0.16, Math.cos(j * 2.3) * 0.06]} rotation={[Math.sin(j) * 0.35, j * 1.6, Math.cos(j) * 0.3]}>
              <coneGeometry args={[0.02, 0.4 + p.k * 0.25, 4]} />
              <meshStandardMaterial color="#8f8a55" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
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
      m.receiveShadow = true
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
  const standRef = useRef<THREE.Group>(null)
  const strideRef = useRef<THREE.Group>(null)
  const heading = useRef(0)
  const walkT = useRef(0)

  useFrame(({ camera }, dt) => {
    const g = group.current
    if (!g) return
    const k = live.keys
    const running = k.has('shift')
    const run = running ? 8 : 4
    let mx = 0
    let mz = 0
    if (k.has('w')) mz -= 1
    if (k.has('s')) mz += 1
    if (k.has('a')) mx -= 1
    if (k.has('d')) mx += 1
    const moving = mx !== 0 || mz !== 0
    if (moving) {
      const yaw = live.yaw
      const dir = new THREE.Vector3(mx, 0, mz).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw)
      live.player.addScaledVector(dir, run * dt)

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

      // keep the player inside the camp clearing
      const dist = Math.hypot(live.player.x, live.player.z)
      const MAX = 24
      if (dist > MAX) live.player.multiplyScalar(MAX / dist)
      heading.current = Math.atan2(dir.x, dir.z)
      walkT.current += dt * (running ? 13 : 9)
    }
    // two-pose walk: the character is a plain static mesh (no skeleton — the
    // rigged model rendered T-pose on some GPUs). While moving we alternate
    // between the standing and mid-stride meshes at gait frequency, mirroring
    // the stride for the opposite step — deterministic on every machine.
    const s = Math.sin(walkT.current)
    const showStride = moving && Math.abs(s) > 0.25
    if (standRef.current) standRef.current.visible = !showStride
    if (strideRef.current) {
      strideRef.current.visible = showStride
      strideRef.current.scale.x = s >= 0 ? 1 : -1
    }

    // body motion: vertical bob + slight sway/lean while moving
    const bob = moving ? Math.abs(Math.cos(walkT.current)) * 0.06 : 0
    const sway = moving ? Math.sin(walkT.current) * 0.035 : 0
    g.position.set(live.player.x, live.player.y + bob, live.player.z)
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, heading.current, Math.min(1, dt * 10))
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, sway, Math.min(1, dt * 8))
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, moving ? 0.06 : 0, Math.min(1, dt * 6))

    // third-person camera: lower and closer for depth, rotated by yaw
    const camOffset = new THREE.Vector3(0, 2.35, 4.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), -live.yaw)
    const target = live.player.clone().add(camOffset)
    camera.position.lerp(target, Math.min(1, dt * 5))
    camera.lookAt(live.player.x, live.player.y + 1.45, live.player.z)
  })

  const stand = useNormalizedGLB(MODEL_TRAVELER_STAND, 1.78)
  const stride = useNormalizedGLB(MODEL_TRAVELER_STRIDE, 1.78)

  // dev diagnostics: world-space bounds of the rendered figure
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const t = window.setInterval(() => {
      if (!group.current) return
      const box = new THREE.Box3().setFromObject(group.current)
      ;(window as unknown as Record<string, unknown>).__ch1Dbg = {
        min: box.min.toArray(),
        max: box.max.toArray(),
        standChildren: stand.children.length,
        strideChildren: stride.children.length,
        standVisible: standRef.current?.visible,
      }
    }, 500)
    return () => window.clearInterval(t)
  }, [stand, stride])

  return (
    <group ref={group}>
      <group ref={standRef}>
        <primitive object={stand} />
      </group>
      <group ref={strideRef} visible={false}>
        <primitive object={stride} />
      </group>
    </group>
  )
}

/* Projects POI world positions to screen space and writes them straight to the
   marker DOM nodes; also detects the nearest interactable POI. */
/* A person standing at a point of interest. They are who the dialogue bubble
   quotes, so a point without a speaker simply has nobody there and shows no
   bubble. Placed a step to the side of the marker so they never cover it. */
export function speakerSpot(poi: Poi) {
  if (poi.speaker?.x != null && poi.speaker.z != null) {
    return { x: poi.speaker.x, z: poi.speaker.z }
  }
  const ry = poi.speaker?.ry ?? 0
  const off = 1.15
  return { x: poi.x + Math.sin(ry + Math.PI / 2) * off, z: poi.z + Math.cos(ry + Math.PI / 2) * off }
}

function Speaker({ poi }: { poi: Poi }) {
  const idle = useRef<THREE.Group>(null)
  const standRef = useRef<THREE.Group>(null)
  const strideRef = useRef<THREE.Group>(null)
  const speaker = poi.speaker
  const pose = speaker?.pose ?? 'stand'
  const model = useNormalizedGLB(speaker?.model ?? MODEL_TRAVELER_STAND, speaker?.height ?? 1.74, speaker?.tint)
  const actionModel = useNormalizedGLB(pose === 'water' ? MODEL_TRAVELER_WATER : MODEL_TRAVELER_STRIDE, speaker?.height ?? 1.74, speaker?.tint)
  const ry = speaker?.ry ?? 0
  const build = speaker?.build ?? 1
  const accent = speaker?.accent ?? '#d8c79f'
  const { x, z } = speakerSpot(poi)
  const phase = useMemo(
    () => [...poi.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) * 0.37,
    [poi.id],
  )
  useFrame(({ clock }) => {
    if (!idle.current) return
    const t = clock.elapsedTime + phase
    const pacing = pose === 'pace'
    const paceSpeed = Math.cos(t * 0.48)
    const drawingWater = pose === 'water'
    const waterCycle = Math.sin(t * 0.82)
    /* Each role has a restrained, local performance. Even the pacing guide
       stays within half a metre of the fixed interaction point. */
    idle.current.position.x = pacing ? Math.sin(t * 0.48) * 0.55 : 0
    idle.current.position.z = drawingWater ? Math.max(0, waterCycle) * 0.1 : 0
    idle.current.position.y = Math.sin(t * 1.25) * 0.014
    idle.current.rotation.x = (pose === 'work' ? 0.1 : drawingWater ? 0.035 + Math.max(0, waterCycle) * 0.035 : 0)
      + Math.sin(t * 0.72) * (pose === 'work' ? 0.018 : 0.006)
    idle.current.rotation.y = pacing ? (paceSpeed >= 0 ? Math.PI / 2 : -Math.PI / 2) : 0
    idle.current.rotation.z = Math.sin(t * 0.58 + 1.4) * 0.009
    const showAction = (pacing && Math.abs(paceSpeed) > 0.12 && Math.sin(t * 7) > -0.15)
      || (drawingWater && waterCycle > -0.45)
    if (standRef.current) standRef.current.visible = !showAction
    if (strideRef.current) strideRef.current.visible = showAction
  })
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <group ref={idle} scale={[build, 1, build]}>
        <group ref={standRef}>
          <primitive object={model} />
        </group>
        <group ref={strideRef} visible={false}>
          <primitive object={actionModel} />
        </group>
        {speaker?.accessory === 'cap' && (
          <mesh position={[0, pose === 'sit' ? 1.19 : 1.61, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.115, 0.075, 20]} />
            <meshStandardMaterial color={accent} roughness={0.95} />
          </mesh>
        )}
        {speaker?.accessory === 'turban' && (
          <group position={[0, 1.69, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.115, 0.045, 8, 24]} />
              <meshStandardMaterial color={accent} roughness={1} />
            </mesh>
            <mesh position={[0, 0.025, 0]} castShadow>
              <sphereGeometry args={[0.115, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={accent} roughness={1} />
            </mesh>
          </group>
        )}
        {speaker?.accessory === 'staff' && (
          <mesh position={[-0.34, 0.78, 0.02]} rotation={[0, 0, -0.08]} castShadow>
            <cylinderGeometry args={[0.025, 0.035, 1.58, 10]} />
            <meshStandardMaterial color={accent} roughness={1} />
          </mesh>
        )}
      </group>
      {pose === 'sit' && (
        <group position={[-0.14, 0, 0]}>
          <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.46, 0.09, 0.4]} />
            <meshStandardMaterial color="#76502e" roughness={1} />
          </mesh>
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <mesh key={`${sx}:${sz}`} position={[sx * 0.17, 0.21, sz * 0.14]} castShadow>
              <boxGeometry args={[0.055, 0.42, 0.055]} />
              <meshStandardMaterial color="#4f321d" roughness={1} />
            </mesh>
          )))}
        </group>
      )}
    </group>
  )
}

/** Authored, textured 3D teaching board. The full lesson opens on interaction. */
function ConceptBoard({ poi }: { poi: Poi }) {
  return <Prop url={MODEL_CONCEPT_BOARD} x={poi.x} z={poi.z} ry={0.55} height={1.95} />
}

function MarkerProjector({ live, done, onNearChange }: {
  live: Live
  done: Set<string>
  onNearChange: (id: string | null) => void
}) {
  const { camera, size } = useThree()
  const v = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    let nearest: string | null = null
    let nearestDist = 3.6
    for (const poi of station.pois) {
      const el = live.markerEls.get(poi.id)
      if (!el) continue
      const interactionSpot = poi.speaker ? speakerSpot(poi) : { x: poi.x, z: poi.z }
      const markerY = poi.speaker?.pose === 'sit' ? 1.58 : poi.speaker ? 2.1 : 0
      v.set(interactionSpot.x, markerY, interactionSpot.z)
      v.project(camera)
      const behind = v.z > 1
      const x = (v.x * 0.5 + 0.5) * size.width
      const y = (-v.y * 0.5 + 0.5) * size.height
      el.style.display = behind ? 'none' : ''
      if (!behind) el.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`
      const d = Math.hypot(live.player.x - interactionSpot.x, live.player.z - interactionSpot.z)
      el.classList.toggle('is-near', d < 3.6)
      if (d < nearestDist) {
        nearestDist = d
        nearest = poi.id
      }
    }
    if (nearest !== live.nearPoiId) {
      live.nearPoiId = nearest
      onNearChange(nearest)
    }

    /* Anchor the speech bubble over the speaker's head. A fixed bar at the
       bottom of the screen never told you WHO was talking; sitting on the
       character does. */
    const bubble = live.bubbleEl
    const target = live.bubblePoi
    if (bubble && target) {
      const spot = speakerSpot(target)
      v.set(spot.x, target.speaker?.pose === 'sit' ? 1.62 : 2.15, spot.z)
      v.project(camera)
      const behind = v.z > 1
      bubble.style.visibility = behind ? 'hidden' : ''
      if (!behind) {
        const edge = bubble.classList.contains('is-open') ? 200 : 36
        const bx = THREE.MathUtils.clamp((v.x * 0.5 + 0.5) * size.width, edge, size.width - edge)
        const by = THREE.MathUtils.clamp((-v.y * 0.5 + 0.5) * size.height, 90, size.height - 120)
        bubble.style.transform = `translate(-50%,-100%) translate(${bx}px,${by}px)`
      }
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
}

/* Placement comes from camp-layout.json, which round-trips through Blender:
   `npm run camp:export` writes blender/camp.blend, you edit it visually, and
   `npm run camp:import` writes the JSON back. Model names in the JSON map to
   the GLB files by filename. */
const MODEL_BY_NAME: Record<string, string> = {
  tent2: MODEL_TENT,
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

const CAMP: CampProp[] = campLayout.props.map((p) => ({
  url: MODEL_BY_NAME[p.model] ?? `/assets/chapter1/models/${p.model}.glb`,
  x: p.x,
  z: p.z,
  ry: p.ry,
  h: p.h,
  r: p.r,
  tint: p.model === 'cactus' || p.model === 'cactus-2' ? '#4f7d3a' : undefined,
  role: (p as { role?: string }).role,
}))

/* Derived at module scope from CAMP itself. This used to be copied into mutable
   state inside an effect, which meant a hot reload (or any change to CAMP that
   did not remount the World) left the OLD footprints in place — invisible walls
   where props used to stand, and no collision on the ones actually rendered. */
const STATIC_COLLIDERS: Collider[] = [
  ...CAMP.map((p) => ({ x: p.x, z: p.z, r: p.r })),
  { ...campLayout.campfire }, // campfire hearth
]

/** Elliptical patrol routes, kept clear of every CAMP entry. */
const HERD = campLayout.herd

/** Drop scattered spots that would clash with a prop or a point of interest. */
function filterFree(spots: { x: number; z: number; k: number }[], pad: number) {
  return spots.filter((p) => {
    for (const c of CAMP) if (Math.hypot(p.x - c.x, p.z - c.z) < c.r + pad) return false
    for (const poi of station.pois) if (Math.hypot(p.x - poi.x, p.z - poi.z) < 1.6 + pad) return false
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

function World({ live, done, onNearChange }: {
  live: Live
  done: Set<string>
  onNearChange: (id: string | null) => void
}) {
  /* Scatter rocks and shrubs only where they don't intersect a placed prop or
     a point of interest — this is what stops models growing through each other. */
  const rockSpots = useMemo(() => filterFree(scatterRing(11, 10, 23, 11), 1.6), [])
  const shrubSpots = useMemo(() => filterFree(scatterRing(18, 6, 23, 5), 1.1), [])

  return (
    <>
      <Sky />
      <fog attach="fog" args={['#eec9a4', 80, 380]} />
      <hemisphereLight args={['#fff6ea', '#b39a7c', 1.35]} />
      {/* sun matches the panorama's glow (low, warm, from -x) */}
      <directionalLight
        position={[-24, 12, 6]}
        intensity={3.1}
        color="#ffeacb"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      />
      {campLayout.terrain?.baked ? (
        <BakedTerrain
          url={`/assets/chapter1/models/${campLayout.terrain.model}.glb`}
          hasImage={!!campLayout.terrain.hasImage}
          tint={(campLayout.terrain as { tint?: string }).tint}
        />
      ) : (
        <Terrain />
      )}
      {/* every placed prop comes from one spacing-checked layout table */}
      {CAMP.filter((p) => !p.role).map((p, i) => (
        <Prop key={i} url={p.url} x={p.x} z={p.z} ry={p.ry} height={p.h} tint={p.tint} />
      ))}
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
      {campLayout.rugs.map((r, i) => (
        <Rug key={i} x={r.x} z={r.z} ry={r.ry} />
      ))}
      {campLayout.scrolls.map((r, i) => (
        <Scrolls key={i} x={r.x} z={r.z} />
      ))}
      {CAMP.filter((p) => p.role === 'torch').map((p, i) => (
        <Torch key={i} x={p.x} z={p.z} ry={p.ry} />
      ))}
      <Pebbles />
      <GrassTufts />
      {station.pois.filter((p) => p.speaker).map((p) => (
        <Speaker key={p.id} poi={p} />
      ))}
      {station.pois.filter((p) => p.sceneObject === 'concept-board').map((p) => (
        <ConceptBoard key={p.id} poi={p} />
      ))}
      <Player live={live} />
      <MarkerProjector live={live} done={done} onNearChange={onNearChange} />
    </>
  )
}

/* ---------------- HUD ---------------- */

function StationPanel({ done, onOpen }: { done: Set<string>; onOpen: (poi: Poi) => void }) {
  return (
    <section className="hud-panel hud-station" aria-label="התחנה הנוכחית">
      <div className="hud-station-head">
        <span className="hud-station-icon" aria-hidden="true">⛺</span>
        <div>
          <p className="hud-station-eyebrow">תחנה {station.number} מתוך {STATION_COUNT_PLANNED}</p>
          <h2 className="hud-title">{station.name}</h2>
        </div>
      </div>
      <p className="hud-station-desc">{station.short}</p>
      <div className="hud-progress-row">
        <span>התקדמות</span>
        <span className="hud-progress"><i style={{ width: `${(done.size / station.pois.length) * 100}%` }} /></span>
        <span>{done.size}/{station.pois.length}</span>
      </div>
      <ul className="hud-checklist">
        {station.pois.map((poi) => (
          <li key={poi.id} className={done.has(poi.id) ? 'is-done' : ''}>
            <span className="hud-check" aria-hidden="true">{done.has(poi.id) ? '✓' : ''}</span>
            {done.has(poi.id) || poi.autoDialogue ? (
              <button type="button" className="hud-reread" onClick={() => onOpen(poi)}>
                {poi.label}
                <span className="hud-reread-hint">{done.has(poi.id) ? 'קראו שוב' : 'פתחו'}</span>
              </button>
            ) : (
              poi.label
            )}
            {poi.kind === 'required' && <span className="hud-req">חובה</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

function ControlsPanel({ pressed }: { pressed: Set<string> }) {
  const key = (id: string, label: string) => (
    <i className={'hud-key' + (pressed.has(id) ? ' is-down' : '')}>{label}</i>
  )
  return (
    <section className="hud-panel hud-controls" aria-label="שליטה בתנועה">
      <h2 className="hud-title">שליטה בתנועה <span className="hud-ver">v8</span></h2>
      <div className="hud-keys">
        <span>{key('w', 'W')} קדימה</span>
        <span>{key('s', 'S')} אחורה</span>
        <span>{key('a', 'A')} שמאלה</span>
        <span>{key('d', 'D')} ימינה</span>
        <span>{key('shift', 'Shift')} הליכה מהירה</span>
        <span><i className="hud-key">E</i> חקירה</span>
        <span>גרירת עכבר — סיבוב מבט</span>
      </div>
    </section>
  )
}

/* Speech bubble for the guide — portrait, speaker name, one line of narration
   and a replay button, matching the reference layout. */
/** Everything a point of interest teaches, said one line at a time. */
export function poiScript(poi: Poi): string[] {
  return [poi.lead, ...poi.bullets]
}

/* The bubble IS the teaching surface — there is no separate card. Standing next
   to a speaker shows their opening line; pressing E walks through the rest one
   line at a time, and the last line offers the journal. */
function DialogueBar({ live, poi, open, step, collected, onAdvance, onCollect, onClose }: {
  live: Live
  poi: Poi | null
  open: boolean
  step: number
  collected: boolean
  onAdvance: () => void
  onCollect: () => void
  onClose: () => void
}) {
  /* Once you have heard someone out, their bubble goes quiet — the camp should
     not shout its lessons at you forever. Walking up still shows the E prompt,
     so every character can be asked again. */
  live.bubblePoi = poi?.speaker && open ? poi : null
  if (!poi || (!poi.speaker && !poi.autoDialogue)) return null
  if (!open) return null
  const script = poiScript(poi)
  const last = step >= script.length - 1
  const text = open ? script[Math.min(step, script.length - 1)] : script[0]

  return (
    <section
      ref={(el) => {
        live.bubbleEl = el
      }}
      className={'hud-panel hud-dialogue is-open' + (poi.autoDialogue ? ' is-station-intro' : '')}
      aria-live="polite"
      aria-label={poi.speaker ? `שיחה עם ${poi.speaker.name}` : poi.title}
    >
      <>
          {poi.speaker?.portrait ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className="hud-portrait" src={poi.speaker.portrait} alt="" />
          ) : poi.speaker ? (
            <span
              className="hud-portrait hud-speaker-avatar"
              style={{ borderColor: poi.speaker.accent ?? undefined }}
              aria-hidden="true"
            >
              {poi.speaker.name.trim().charAt(0)}
            </span>
          ) : null}
          <div className="hud-dialogue-body">
        <h2 className="hud-title">
          {poi.speaker?.name ?? poi.title}
          {open && poi.speaker && <span className="hud-dialogue-topic"> · {poi.title}</span>}
        </h2>
        {poi.tag && <span className="hud-card-tag">{poi.tag}</span>}
        <p className={open ? 'is-full' : ''}>{text}</p>
        <div className="hud-dialogue-actions">
            <span className="hud-dialogue-count">
              {Math.min(step + 1, script.length)}/{script.length}
            </span>
            {!last ? (
              <button type="button" className="hud-card-btn" onClick={onAdvance}>המשך</button>
            ) : !collected ? (
              <button type="button" className="hud-card-btn is-primary" onClick={onCollect}>הוסיפו למחברת</button>
            ) : null}
            <button type="button" className="hud-card-btn" onClick={onClose}>סגירה</button>
        </div>
          </div>
          <button type="button" className="hud-speak" aria-label="השמעת הקריינות">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8 8 0 0 1 0 12" />
        </svg>
          </button>
      </>
    </section>
  )
}

function InfoCard({ poi, onCollect, onClose, collected }: {
  poi: Poi
  collected: boolean
  onCollect: () => void
  onClose: () => void
}) {
  return (
    <section className="hud-panel hud-card" role="dialog" aria-label={poi.title}>
      {poi.tag && <span className="hud-card-tag">{poi.tag}</span>}
      <h2 className="hud-title">{poi.title}</h2>
      <p className="hud-card-lead">{poi.lead}</p>
      <ul>
        {poi.bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <div className="hud-card-actions">
        {!collected && (
          <button type="button" className="hud-card-btn is-primary" onClick={onCollect}>הוסיפו למחברת</button>
        )}
        <button type="button" className="hud-card-btn" onClick={onClose}>סגירה</button>
      </div>
    </section>
  )
}

function MiniMap({ pos, yaw, done }: { pos: { x: number; z: number }; yaw: number; done: Set<string> }) {
  const R = 78 // map radius in viewBox units
  const RANGE = 28 // metres shown from the centre
  const S = R / RANGE
  const cx = 84
  const cy = 84
  return (
    <div className="hud-panel hud-map" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="hud-map-image" src="/assets/chapter1/tex/camp-map.jpg" alt="" />
      <svg viewBox="0 0 168 168">
        <defs>
          <clipPath id="mapClip">
            <circle cx={cx} cy={cy} r={R} />
          </clipPath>
        </defs>
        <g clipPath="url(#mapClip)">
          {/* points of interest sit on top of everything */}
          {station.pois.filter((p) => !p.autoDialogue).map((p) => (
            <g key={p.id}>
              <circle
                cx={cx + p.x * S}
                cy={cy + p.z * S}
                r="6"
                fill={done.has(p.id) ? 'rgba(124,138,79,.95)' : 'rgba(199,154,60,.95)'}
                stroke="rgba(24,15,9,.9)"
                strokeWidth="1.5"
              />
              {!done.has(p.id) && (
                <circle cx={cx + p.x * S} cy={cy + p.z * S} r="10" fill="none" stroke="rgba(199,154,60,.35)" />
              )}
            </g>
          ))}
          {/* the player, as an arrow pointing where the camera looks */}
          <g transform={`translate(${cx + pos.x * S} ${cy + pos.z * S}) rotate(${(-yaw * 180) / Math.PI})`}>
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

/* ---------------- game shell ---------------- */

export default function Game() {
  const router = useRouter()
  const live = useMemo(makeLive, [])
  const [done, setDone] = useState<Set<string>>(() => new Set())
  const [nearId, setNearId] = useState<string | null>(null)
  const [openPoi, setOpenPoi] = useState<Poi | null>(null)
  const [step, setStep] = useState(0)
  const [mapPos, setMapPos] = useState({ x: 0, z: 4 })
  const [mapYaw, setMapYaw] = useState(0)
  const [pressed, setPressed] = useState<Set<string>>(() => new Set())
  const openRef = useRef<Poi | null>(null)
  openRef.current = openPoi

  // dev-only hook so automated tests (and DevTools) can inspect the live state
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      const g = window as unknown as Record<string, unknown>
      g.__ch1Live = live
      g.__ch1Statics = STATIC_COLLIDERS
    }
  }, [live])

  // restore saved progress
  useEffect(() => {
    const store = readStore()
    const restored = new Set<string>()
    for (const poi of station.pois) {
      if (store.pois.includes(poiKey(station.id, poi.id))) restored.add(poi.id)
    }
    if (restored.size) setDone(restored)
    const intro = station.pois.find((poi) => poi.autoDialogue)
    if (intro) {
      setOpenPoi(intro)
      setStep(0)
    }
  }, [])

  // keyboard: movement keys into the live channel, E opens the near POI.
  // e.code (physical key) — NOT e.key — so WASD works on Hebrew/any keyboard layout.
  useEffect(() => {
    const codeMap: Record<string, string> = {
      KeyW: 'w', KeyS: 's', KeyA: 'a', KeyD: 'd',
      ArrowUp: 'w', ArrowDown: 's', ArrowLeft: 'a', ArrowRight: 'd',
      ShiftLeft: 'shift', ShiftRight: 'shift',
    }
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && live.nearPoiId && !openRef.current) {
        const poi = station.pois.find((p) => p.id === live.nearPoiId)
        if (poi) {
          setOpenPoi(poi)
          setStep(0)
        }
        return
      }
      if (e.code === 'Escape') setOpenPoi(null)
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
    dragging.current = true
    lastX.current = e.clientX
  }, [])
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      live.yaw += (e.clientX - lastX.current) * 0.005
      lastX.current = e.clientX
    },
    [live],
  )
  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  // low-frequency minimap refresh
  useEffect(() => {
    const t = window.setInterval(() => {
      setMapPos({ x: live.player.x, z: live.player.z })
      setMapYaw(live.yaw)
    }, 250)
    return () => window.clearInterval(t)
  }, [live])

  const collect = useCallback(() => {
    if (!openPoi) return
    markPoiDone(station.id, openPoi.id)
    setDone((prev) => {
      const next = new Set(prev)
      next.add(openPoi.id)
      const required = station.pois.filter((p) => p.kind === 'required').every((p) => next.has(p.id))
      if (next.size >= station.quota && required) markStationDone(station.id)
      return next
    })
    setOpenPoi(null)
  }, [openPoi])

  const requiredMet = station.pois.filter((p) => p.kind === 'required').every((p) => done.has(p.id))
  const complete = done.size >= station.quota && requiredMet
  const nearPoi = nearId ? station.pois.find((p) => p.id === nearId) : null
  /* what the guide is saying right now: the nearby point of interest if there
     is one, otherwise the station briefing */
  /* The bubble is the voice of the person standing at the point you are next
     to. Away from any speaker there is nothing being explained, so it hides
     rather than repeating the station blurb. */
  const line = useMemo(() => {
    if (nearPoi?.speaker) return { who: nearPoi.speaker.name, text: nearPoi.lead }
    return null
  }, [nearPoi])

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
          <button type="button" className="ch1-journal-btn" onClick={() => { /* journal — milestone 2 */ }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4zM5 4v14M9 8h6M9 12h6" /></svg>
            מחברת המסע
          </button>
        </div>
      </header>

      <div
        className="ch1-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <Canvas shadows camera={{ position: [0, 3.4, 10], fov: 55 }} dpr={[1, 1.75]}>
          <Suspense fallback={null}>
            <World live={live} done={done} onNearChange={setNearId} />
          </Suspense>
        </Canvas>

        {/* world markers (projected each frame) */}
        {station.pois.filter((poi) => !poi.autoDialogue).map((poi) => (
          <div
            key={poi.id}
            className={
              'poi-marker'
              + (poi.speaker ? ' is-dialogue-marker' : '')
              + (poi.sceneObject === 'concept-board' ? ' is-board-marker' : '')
              + (done.has(poi.id) ? ' is-done' : '')
            }
            ref={(el) => {
              if (el) live.markerEls.set(poi.id, el)
              else live.markerEls.delete(poi.id)
            }}
          >
            {poi.speaker ? (
              <>
                <span className="poi-dialogue-bubble" aria-hidden="true">...</span>
                <span className="ch1-visually-hidden">שיחה עם {poi.speaker.name}</span>
              </>
            ) : (
              <>
                <span className="poi-marker-ring">{done.has(poi.id) ? '✓' : poi.icon ?? '✦'}</span>
                <span className="poi-marker-label">{poi.label}</span>
                <span className="poi-marker-stem" />
                <span className="poi-marker-foot" />
              </>
            )}
          </div>
        ))}

        <StationPanel done={done} onOpen={(p) => { setOpenPoi(p); setStep(0) }} />
        <ControlsPanel pressed={pressed} />
        {nearPoi && !openPoi && (
          <div className="hud-panel poi-hint">
            <i className="hud-key">E</i>
            <span>חקרו את {nearPoi.label}</span>
          </div>
        )}
        <DialogueBar
          live={live}
          poi={openPoi ?? nearPoi ?? null}
          open={!!openPoi}
          step={step}
          collected={done.has((openPoi ?? nearPoi)?.id ?? '')}
          onAdvance={() => setStep((n) => n + 1)}
          onCollect={collect}
          onClose={() => setOpenPoi(null)}
        />
        {openPoi && !openPoi.speaker && (
          <InfoCard
            poi={openPoi}
            collected={done.has(openPoi.id)}
            onCollect={collect}
            onClose={() => setOpenPoi(null)}
          />
        )}
        <div className="hud-panel hud-goal">
          <span style={{ whiteSpace: 'nowrap' }}>
            {complete
              ? 'התחנה הושלמה! בהמשך: יציאה אל שתי האימפריות'
              : `מטרה בתחנה: גלו לפחות ${station.quota} מתוך ${station.pois.length} נקודות עניין`}
          </span>
          <span className="hud-progress"><i style={{ width: `${Math.min(100, (done.size / station.quota) * 100)}%` }} /></span>
          <span>{done.size}/{station.quota}</span>
        </div>
        <MiniMap pos={mapPos} yaw={mapYaw} done={done} />
      </div>
    </div>
  )
}
