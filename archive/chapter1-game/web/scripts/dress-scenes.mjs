/* Give each region an arrangement, not just a scatter.
 *
 * Every region so far is props placed around a road: the same verb applied nine
 * times, which is most of why they read as one place. A market is not stalls
 * near each other — it is two rows facing across a lane, with the goods between
 * them and the shade over the top. A monastery is not a cross in the open — it
 * is a wall with one way in. A frontier is not a gate — it is the queue waiting
 * at it.
 *
 * These arrangements are authored here rather than by hand in the layout files
 * because they are compositions: a row has to stay a row when a house moves, and
 * a courtyard has to keep its gate on the road. Props added here are tagged
 * `scene`, so a re-run replaces its own work instead of stacking a second market
 * on the first.
 *
 * Idempotent. Run: node scripts/dress-scenes.mjs
 * Then: node scripts/unstack-buildings.mjs && npm run verify
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'


const LIB = 'src/lib/chapter1/'
const MODELS = 'public/assets/chapter1/models/'

/** Measured size of a model, so a prop's height gives its real footprint. */
const SIZE = {}
function sizeOf(model) {
  if (SIZE[model] !== undefined) return SIZE[model]
  const path = MODELS + model + '.glb'
  if (!existsSync(path)) return (SIZE[model] = null)
  const buf = readFileSync(path)
  let off = 12, json = null
  while (off < buf.length) {
    const len = buf.readUInt32LE(off)
    if (buf.readUInt32LE(off + 4) === 0x4e4f534a) json = JSON.parse(buf.subarray(off + 8, off + 8 + len).toString('utf8'))
    off += 8 + len
  }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (const m of json.meshes ?? [])
    for (const p of m.primitives ?? []) {
      const a = json.accessors[p.attributes.POSITION]
      if (!a?.min) continue
      for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]) }
    }
  return (SIZE[model] = { x: mx[0] - mn[0], y: mx[1] - mn[1], z: mx[2] - mn[2] })
}

/** How much ground a prop really covers, from its mesh and the height it is
    built at — which is what decides whether two of them look like they are
    inside each other, however small their collision circles are. */
function footprint(p) {
  if (p.model === 'palm') return 1.1        // a trunk; the crown is overhead
  const s = sizeOf(p.model)
  if (!s || !(s.y > 0)) return Math.max(0.4, p.r ?? 0.6)
  /* The MEAN of the two horizontal half-extents, not the larger of them: a
     tent is nine metres one way and four the other, and judging it by nine in
     both directions rejected two thirds of every composition. */
  return ((s.x + s.z) / 4) * (p.h / s.y)
}

/** A prop with a footprint derived from the mesh, not guessed. */
/* Shade is overhead. An awning with a collision circle is an invisible drum in
   the middle of a market that the stall-holder himself stands inside of. */
/* Shade is overhead, and a gateway is a hole. Both must be walked through, so
   neither gets a collision circle of its own — the gate's piers carry theirs as
   separate collider props. Letting prop() size gate-post put a 30 cm drum in
   the middle of its own archway, which is the same bug that sealed the border
   gate and made the chapter impossible to finish. */
const WALK_UNDER = /^(awning|pergola|gate-post)$/

/* A courtyard wall is a run of identical panels laid end to end on one line,
   which is the textbook way to get z-fighting: two faces at exactly the same
   depth, and the renderer flickers between them as thin bright seams along the
   wall. A few centimetres of jitter, different for every piece, costs nothing
   and makes coplanar faces impossible. */
let jitterSeed = 90210
const jitter = (amount) => {
  jitterSeed = (jitterSeed * 1664525 + 1013904223) >>> 0
  return ((jitterSeed / 4294967296) - 0.5) * 2 * amount
}

function prop(model, x, z, h, ry = 0, opts = {}) {
  x += jitter(0.035)
  z += jitter(0.035)
  ry += jitter(0.012)
  h += jitter(0.02)
  const s = sizeOf(model)
  const k = s && s.y > 0 ? h / s.y : 1
  const r = WALK_UNDER.test(model) ? 0 : s ? Math.max(0.3, (Math.min(s.x, s.z) / 2) * k * 0.9) : 0.6
  return { model, x: +x.toFixed(2), z: +z.toFixed(2), ry: +ry.toFixed(3), h: +h.toFixed(2), r: +r.toFixed(2), scene: true, ...opts }
}

/* What a composition is allowed to sweep out of its way.
 *
 * The first run of this skipped more than half of every arrangement, because
 * the ground it wanted was already covered in loose decor — a market lane laid
 * over four stray jars is not a market lane, it is four stray jars. Clutter and
 * livestock move; buildings, walls, wells, fires and gates do not, because they
 * are what the region IS. */
const MOVEABLE = /^(jars|claypot|amphora|basket|bigjar|sackpile|crate|camel|camel-load|fodder|waterskin|rocks|shrub|desert-bush|stone-bench|awning|firewood)$/
/* Colliders are invisible, so an orphaned one left by an earlier version of a
   composition is a wall nobody can see and nothing else would ever report. A
   scene that places a gateway sweeps them. */
const GATE_SCENES = new Set(['monastery-layout.json'])

/** Remove the moveable clutter inside a rectangle, so a row can be a row.
    `walls` also sweeps loose wall segments — the monastery composition puts a
    real courtyard wall where twenty-two scattered stubs used to be, and the
    stubs are what it is replacing. */
function clear(props, [x0, x1, z0, z1], walls = false, also = null) {
  const gone = walls ? /^(drywall|drywall2|drywall3|ruinwall)$/ : null
  return props.filter(
    (p) =>
      !((MOVEABLE.test(p.model) || (gone && gone.test(p.model)) || (also && also.test(p.model))) &&
        p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1),
  )
}

const SCENES = {
  /* ---- Yathrib: a market lane. Two rows of shade facing each other across the
     road, goods set out under them, and the well at the head of it. The trader
     stands in the middle of the thing his whole conversation is about. */
  'yathrib-layout.json': { clear: [-8, 8, -13, 17], walls: true, build: () => {
    const out = []
    /* The lane has to stay wide enough to walk down while two rows of goods
       are set out along it. At 4.6 the stalls' front row stood at x ±3.1, which
       is inside the corridor the road uses — a walking player wedged between a
       jar and a bench and never reached the far gate. */
    const LANE = 5.8            // half-width of the lane the road runs down
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const z = 12 - i * 5.4
        out.push(prop('awning', side * LANE, z, 2.5 + (i % 2) * 0.18, side > 0 ? 0.06 : Math.PI - 0.06))
        /* the goods, set out along the front of each stall, facing the lane */
        const face = side * (LANE - 1.1)
        out.push(prop(['sackpile', 'bigjar', 'crate', 'jars'][i % 4], face, z - 1.1, [0.85, 1.05, 0.72, 0.95][i % 4], i * 1.3))
        out.push(prop(['claypot', 'basket', 'amphora', 'bigjar'][(i + 2) % 4], face, z + 1.0, [0.6, 0.55, 0.6, 1.0][(i + 2) % 4], i * 2.1))
        /* a stall table between the two, so the row has a front */
        out.push(prop('stone-bench', side * (LANE - 0.2), z, 0.62, side > 0 ? 1.57 : -1.57))
      }
    }
    return out
  } },

  /* ---- The monastery: a courtyard. A wall with one gate on the road, the
     altar in the middle of it, and cells along the inside of the far side. A
     cross standing in the open is a prop; a cross inside a wall is a place. */
  'monastery-layout.json': { clear: [-13, 13, -13, 13], walls: true, build: () => {
    const out = []
    const R = 11                // the courtyard's half-width
    /* three sides of wall — the fourth is the range of cells */
    for (let i = 0; i < 9; i++) {
      const t = -R + (i + 0.5) * ((R * 2) / 9)
      if (Math.abs(t) > 2.4) out.push(prop('drywall2', t, R, 1.5, 0))          // the road side, gap for the gate
      /* the south wall has its own postern, on the line the road leaves by —
         a monastery on a road has a way in and a way on */
      if (Math.abs(t + 4) > 2.6) out.push(prop('drywall3', t, -R, 1.7, 0.04))
    }
    for (let i = 0; i < 7; i++) {
      const t = -R + (i + 0.5) * ((R * 2) / 7)
      out.push(prop('drywall', -R, t, 1.6, Math.PI / 2))
    }
    /* the gate the road runs through */
    /* The gateway has to be wide enough to walk through with a body's clearance
       either side: at piers ±1.9 the lane was two metres, the player is 0.9
       across, and the walkability check could only just thread it. */
    /* The gateway has to be wide enough to walk through with a body's clearance
       either side. Widening the MODEL past 1.7 makes it eleven metres across —
       wider than the gap in the wall it stands in, so the wall stops fitting
       round it. The lane is opened by moving the piers' collision instead. */
    out.push(prop('gate-post', 0, R, 4.6, 0, { widen: 1.7 }))
    out.push({ model: 'collider', x: -2.05, z: R, ry: 0, h: 0, r: 0.34, scene: true })
    out.push({ model: 'collider', x: 2.05, z: R, ry: 0, h: 0, r: 0.34, scene: true })
    out.push(prop('waymark', -6.9, -R + 0.4, 2.1, 0.3))
    out.push(prop('waymark', -1.1, -R + 0.4, 2.1, -0.2))
    /* the cells: a low range along the east side, doors onto the yard */
    for (let i = 0; i < 3; i++) out.push(prop('house-c', R - 1.4, -6 + i * 6, 3.0, -Math.PI / 2))
    /* and the yard itself: the altar at the centre, a well, a bench in shade */
    out.push(prop('altar', 0, -1.2, 1.6, -0.2))
    out.push(prop('awning', -5.6, 3.4, 2.4, 0.3))
    out.push(prop('stone-bench', -5.6, 4.6, 0.6, 0.2))
    out.push(prop('claypot', 4.8, 4.2, 0.62, 1.1))
    out.push(prop('bigjar', 5.6, 3.2, 1.05, 0.4))
    return out
  } },

  /* ---- The border post: the queue. A frontier is not a gate, it is what waits
     at one — camels drawn up along the road with their loads beside them, and
     the scale where the toll is taken. */
  'border-layout.json': { clear: [-8, 8, 2, 26], build: () => {
    const out = []
    for (let i = 0; i < 5; i++) {
      const z = 6 + i * 4.2
      const side = i % 2 ? 1 : -1
      out.push(prop('camel', side * 4.2, z, 2.4, side > 0 ? -1.45 : 1.45))
      out.push(prop('crate', side * 5.9, z - 0.9, 0.72 + (i % 3) * 0.1, i * 0.9))
      if (i % 2 === 0) out.push(prop('sackpile', side * 6.0, z + 1.2, 0.8, i * 1.7))
      else out.push(prop('fodder', side * 6.1, z + 1.2, 0.5, i * 1.1))
    }
    out.push(prop('waterskin', -3.1, 3.2, 0.95, 0.6))
    out.push(prop('awning', 6.4, 1.4, 2.5, -0.25))
    return out
  } },

  /* ---- The loading road: the caravan drawn up and being loaded. Not camels
     scattered on sand — a line of them, nose to tail, with the crates going up. */
  'loading-road-layout.json': { clear: [-7, 8, -15, 11], build: () => {
    const out = []
    for (let i = 0; i < 6; i++) {
      const z = 8 - i * 4.6
      out.push(prop('camel', 5.4 + (i % 2) * 0.5, z, 2.4, -1.5 + (i % 2) * 0.12))
      out.push(prop('crate', 3.4, z - 0.6, 0.7 + (i % 3) * 0.14, i * 0.7))
      if (i % 2) out.push(prop('sackpile', 3.2, z + 1.3, 0.82, i * 1.3))
    }
    out.push(prop('awning', -4.8, 2.2, 2.5, 0.2))
    out.push(prop('fodder', 6.6, -12.4, 0.52, 0.9))
    out.push(prop('waterskin', -4.6, 3.6, 0.95, -0.4))
    return out
  } },

  /* ---- Mecca: the square. The chapter's whole last act happens here, and it
     was a scatter of houses with a stone building somewhere in it. A pilgrimage
     town is a shape: an open square, the house at its centre, the standing
     stones ranged around the edge of it, the town's backs turned to the outside
     and its doors turned in, and a track worn round the middle by everyone who
     ever walked it. */
  'mecca-layout.json': { clear: [-20, 22, -24, 12], build: () => {
    const out = []
    const CX = 8.85, CZ = -8.86     // where the Kaaba stands
    const R = 15                     // the square's radius
    /* the ring of standing stones, at the square's edge, facing in */
    for (let i = 0; i < 7; i++) {
      const a = -0.5 + (i / 7) * Math.PI * 2
      out.push(prop('ansab', CX + Math.cos(a) * (R - 1.6), CZ + Math.sin(a) * (R - 1.6),
                    1.35 + (i % 3) * 0.25, a + Math.PI / 2))
    }
    /* stalls under shade round the outside of the square, where a pilgrim town
       makes its living */
    for (let i = 0; i < 5; i++) {
      const a = 1.1 + (i / 5) * Math.PI * 1.25
      const x = CX + Math.cos(a) * (R + 2.6)
      const z = CZ + Math.sin(a) * (R + 2.6)
      out.push(prop('awning', x, z, 2.5, a))
      out.push(prop(['sackpile', 'bigjar', 'crate', 'jars', 'basket'][i], x - Math.cos(a) * 1.5, z - Math.sin(a) * 1.5,
                    [0.82, 1.05, 0.72, 0.95, 0.55][i], a * 1.4))
    }
    /* a lamp at each corner of the house itself */
    for (const [dx, dz] of [[-7, -3.4], [7, -3.4], [-7, 3.4], [7, 3.4]])
      out.push(prop('torch', CX + dx, CZ + dz, 1.9, 0))
    /* water, and the jars that carry it */
    out.push(prop('trough', CX - 10.5, CZ + 5.2, 0.6, 0.5))
    out.push(prop('bigjar', CX - 11.6, CZ + 6.4, 1.1, 0.9))
    out.push(prop('bigjar', CX - 10.2, CZ + 7.1, 0.95, 2.2))
    return out
  } },

  /* ---- The night camp: a camp is a ring. Tents facing a fire, their backs to
     the wind, the herd tethered outside them and the well beyond that. Scattered
     tents are a scatter; a ring is a household. */
  'camp-layout.json': { clear: [-14, 14, -16, 12], also: /^(blacktent|bayt|bayt2)$/, strict: true, build: (fits) => {
    const out = []
    const FX = 3.75, FZ = -6         // the fire the camp is arranged around
    const LANE = 4.6                 // the road runs through; the herd keeps off it
    /* Look for the ground rather than name it. Written as four fixed bearings,
       every one of them landed on a palm or a camel track and the camp ended up
       with no tents in it at all. */
    /* Camps pitch where there is room, and in this one there is not much: a
       palm grove takes the whole south-east, the well the west, and the road
       the middle. A ring written as bearings put every tent on a palm or a
       camel track and the camp came out empty — so these are the spots the camp
       actually has, tried in order, each one facing the fire. */
    const doors = []
    const SPOTS = [
      [-6.8, -10.5], [-8.6, -3.4], [-6.9, 3.6], [9.4, -13.2],
      [10.2, 2.4], [-10.5, -8.2], [7.8, -16.4], [-4.2, 8.6],
    ]
    for (const [x, z] of SPOTS) {
      if (doors.length >= 4) break
      const a = Math.atan2(z - FZ, x - FX)
      const tent = prop('bayt', x, z, 1.8, a + Math.PI / 2)
      if (!fits(tent)) continue
      out.push(tent)
      doors.push({ a, R: Math.hypot(x - FX, z - FZ) })
    }
    /* the things that live outside a tent door, set between it and the fire */
    const GOODS = ['jars', 'sackpile', 'bigjar', 'basket']
    const GH = [0.95, 0.8, 1.0, 0.55]
    doors.forEach(({ a, R }, i) => {
      const g = prop(GOODS[i % 4], FX + Math.cos(a) * (R - 2.8), FZ + Math.sin(a) * (R - 2.8), GH[i % 4], a)
      if (fits(g)) out.push(g)
    })
    /* the herd, tethered beyond the tents and off the road */
    for (let i = 0; i < 6 && out.filter((p) => p.model === 'camel').length < 3; i++) {
      const a = 0.15 + i * 0.45
      const x = FX + Math.cos(a) * 13.5
      if (Math.abs(x) < LANE) continue
      const c = prop('camel', x, FZ + Math.sin(a) * 13.5, 2.4, a + Math.PI / 2)
      if (fits(c)) out.push(c)
    }
    for (const p of [prop('fodder', FX + 11.4, FZ + 4.2, 0.5, 0.7), prop('waterskin', FX - 2.6, FZ + 2.9, 0.95, -0.4)])
      if (fits(p)) out.push(p)
    return out
  } },

  /* ---- The narrow pass: a defile. Everything presses against the rock on
     either side and leaves the middle clear, because the middle is the only way
     through and that is the whole point of the place. */
  'narrow-pass-layout.json': { clear: [-11, 11, -13, 13], also: /^(blacktent|bayt|bayt2)$/, build: () => {
    const out = []
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = 8 - i * 8
        out.push(prop('bayt', side * 8.6, z, 1.85, side > 0 ? -1.35 : 1.35))
        out.push(prop(['jars', 'sackpile', 'firewood'][i], side * 6.6, z - 1.1, [0.95, 0.8, 0.5][i], i * 1.4))
      }
      out.push(prop('camel', side * 9.4, -12.5, 2.4, side > 0 ? -1.5 : 1.5))
    }
    out.push(prop('waymark', -3.2, 11.5, 2.2, 0.2))
    out.push(prop('waymark', 3.4, -12.2, 2.2, -0.3))
    return out
  } },

  /* ---- The Yemen heights: a hamlet on the terraces. The terrace walls were
     re-laid as contour lines; this puts the few buildings that belong to them at
     the head of the field, with the threshing floor and the store beside. */
  'yemen-heights-layout.json': { clear: [-22, -8, -2, 16], build: () => {
    const out = []
    out.push(prop('house-e', -18.4, 9.6, 5.2, 0.5))
    out.push(prop('house-c', -13.2, 12.4, 3.2, -0.9))
    /* the threshing floor: a swept round of stone at the field's head */
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2
      out.push(prop('rocks', -15.6 + Math.cos(a) * 3.4, 4.2 + Math.sin(a) * 3.4, 0.42, a))
    }
    out.push(prop('fodder', -12.4, 3.4, 0.5, 0.4))
    out.push(prop('bigjar', -18.6, 3.2, 1.05, 1.2))
    out.push(prop('bigjar', -19.4, 4.4, 0.9, 2.6))
    out.push(prop('trough', -11.6, 6.8, 0.6, 1.3))
    return out
  } },

  /* ---- The overlook: the end of the road. A cairn, a place to stand, and the
     last camp before the traveller stops walking. */
  'exit-layout.json': { clear: [-13, 13, -14, 12], build: () => {
    const out = []
    /* the cairn a traveller adds a stone to */
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      out.push(prop('rocks', 4.2 + Math.cos(a) * 1.5, -8.4 + Math.sin(a) * 1.5, 0.5 + (i % 3) * 0.12, a))
    }
    out.push(prop('waymark', 4.2, -8.4, 2.6, 0.3))
    out.push(prop('bayt', -8.6, -2.4, 1.85, 1.2))
    out.push(prop('camel', -10.4, 3.6, 2.4, 1.5))
    out.push(prop('camel', -9.1, 6.2, 2.35, 1.35))
    out.push(prop('fodder', -6.8, 5.4, 0.5, 0.6))
    out.push(prop('sackpile', -6.4, -3.6, 0.8, 0.9))
    out.push(prop('bigjar', -7.4, -4.6, 1.0, 2.1))
    return out
  } },
}

for (const [file, scene] of Object.entries(SCENES)) {
  const path = LIB + file
  const j = JSON.parse(readFileSync(path, 'utf8'))
  const before = j.props.length
  /* drop what a previous run of this script put here, then sweep the ground the
     composition needs, then compose again */
  j.props = j.props.filter((p) => !p.scene)
  const swept = j.props.length
  if (GATE_SCENES.has(file)) {
    /* The gateway this composition builds replaces whatever gateway was there —
       otherwise the monastery ends up with two gate-posts a metre and a half
       apart, standing inside each other. That is what the bright orange seams
       across its walls were: not z-fighting between panels, two whole buildings
       occupying the same air. Their invisible pier colliders go too, or an
       earlier version's piers stay behind as a wall nobody can see. */
    const [x0, x1, z0, z1] = scene.clear
    j.props = j.props.filter(
      (p) =>
        !((p.model === 'collider' || p.model === 'gate-post') &&
          p.x >= x0 && p.x <= x1 && p.z >= z0 && p.z <= z1),
    )
  }
  j.props = clear(j.props, scene.clear, scene.walls, scene.also)
  const removed = swept - j.props.length
  const snugFit = scene.strict === true
  /* Ground a piece can actually stand on: clear of everything already here, of
     the paths the camels wander, and of whatever this composition has already
     laid down. Handed to the composition itself so a crowded region can be
     searched rather than guessed at — the night camp's tent ring was written as
     four fixed bearings and every one of them landed on a palm or a camel track,
     so the camp came out with no tents in it. */
  const laid = []
  const fits = (a) => {
    const ar = footprint(a)
    for (const p of j.props) {
      if (p.model === 'collider' || p.model === 'worn-patch') continue
      if (Math.hypot(a.x - p.x, a.z - p.z) < (ar + footprint(p)) * (snugFit ? 1.06 : 0.88)) return false
    }
    if (ar > 1.5)
      for (const p of laid) {
        const pr = footprint(p)
        if (pr <= 1.5) continue
        if (Math.hypot(a.x - p.x, a.z - p.z) < (ar + pr) * (snugFit ? 1.06 : 0.8)) return false
      }
    for (const h of j.herd ?? []) {
      const t = Math.atan2((a.z - h.cz) / (h.rz || 1), (a.x - h.cx) / (h.rx || 1))
      const px = h.cx + Math.cos(t) * h.rx
      const pz = h.cz + Math.sin(t) * h.rz
      if (Math.hypot(a.x - px, a.z - pz) < ar + (ar > 1.5 ? 1.6 : 0.5)) return false
    }
    return true
  }
  const added = scene.build(fits)
  /* Never drop a piece of the composition onto something already standing —
     and judge that by the MESH, not by the collision circle. A tent's circle is
     two metres; the tent is nine across. Filtering on the circle placed camels
     inside tents and tents inside the palm grove, and every one of those came
     back as a failure from check-camp afterwards. */
  const kept = []
  for (const a of added) {
    if (!fits(a)) continue
    laid.push(a)
    kept.push(a)
  }
  j.props.push(...kept)
  writeFileSync(path, JSON.stringify(j, null, 2) + '\n')
  console.log(
    `${file.replace('-layout.json', '').padEnd(14)} swept ${removed} · placed ${kept.length} of ${added.length} · ` +
      `${before} → ${j.props.length} props`,
  )
}

