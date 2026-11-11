/* העברת משקולות עור מודעת-איברים (region-aware skin wrap).
   הבעיה בגרסה התמימה: ב-A-pose כף היד תלויה ליד הירך, והקודקוד הקרוב
   ביותר על התורם הוא לפעמים הירך — אצבעות שזזות עם הרגל. הפתרון:
   1) משולשי התורם מסווגים לאיברים (זרוע-שמאל/ימין, רגל-שמאל/ימין, גו);
   2) דגימה ראשונה חופשית קובעת עוגנים בטוחים (מרחק זעיר ופער ברור);
   3) צמיחת אזורים על שכנויות היעד מתייגת כל קודקוד לאיבר;
   4) דגימה סופית מוגבלת למשולשי האיבר של הקודקוד;
   5) החלקה — רק בין שכנים מאותו איבר.
   node scripts/skinwrap.mjs donor.glb target.glb out.glb */
import { NodeIO } from '@gltf-transform/core'
import { prune } from '@gltf-transform/functions'

const [donorPath, targetPath, outPath] = process.argv.slice(2)
const io = new NodeIO()
const donorDoc = await io.read(donorPath)
const targetDoc = await io.read(targetPath)

const dPrim = donorDoc.getRoot().listMeshes()[0].listPrimitives()[0]
const tPrim = targetDoc.getRoot().listMeshes()[0].listPrimitives()[0]
const jointNames = donorDoc.getRoot().listSkins()[0].listJoints().map((j) => j.getName())

const dPos = dPrim.getAttribute('POSITION').getArray()
const dJoints = dPrim.getAttribute('JOINTS_0').getArray()
const dWeights = dPrim.getAttribute('WEIGHTS_0').getArray()
const dIdx = dPrim.getIndices().getArray()
const tIdx = tPrim.getIndices().getArray()
const tPos = tPrim.getAttribute('POSITION').getArray().slice()
const tCount = tPos.length / 3

function bbox(a) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < a.length; i += 3) for (let k = 0; k < 3; k++) {
    if (a[i + k] < mn[k]) mn[k] = a[i + k]
    if (a[i + k] > mx[k]) mx[k] = a[i + k]
  }
  return { mn, mx }
}
const db = bbox(dPos), tb = bbox(tPos)
const s = (db.mx[1] - db.mn[1]) / (tb.mx[1] - tb.mn[1])
const dCx = (db.mn[0] + db.mx[0]) / 2, dCz = (db.mn[2] + db.mx[2]) / 2
const tCx = (tb.mn[0] + tb.mx[0]) / 2, tCz = (tb.mn[2] + tb.mx[2]) / 2
for (let i = 0; i < tPos.length; i += 3) {
  tPos[i] = (tPos[i] - tCx) * s + dCx
  tPos[i + 1] = (tPos[i + 1] - tb.mn[1]) * s + db.mn[1]
  tPos[i + 2] = (tPos[i + 2] - tCz) * s + dCz
}

/* יישור זרועות: תנוחת ה-bind של התורם היא מה שהאנימציות מניחות. אם
   זרוע היעד תלויה אחרת, ההפרש הופך לסיבוב קבוע בכל פריים — "ידיים
   זומבי". לפני הקשירה מסובבים את קודקודי כל זרוע ביעד סביב הכתף כך
   שציר כתף→כף-יד יתלכד עם של התורם; הדגימה נעשית צמודה והאמה
   מפסיקה לקרוס. */
function rotateArmToDonor(tPos, side, donorShoulder, donorHand, H) {
  const sgn = side === 'L' ? 1 : -1
  let hx = 0, hy = 0, hz = 0, hd = -1
  for (let v = 0; v < tPos.length / 3; v++) {
    const x = tPos[v * 3], y = tPos[v * 3 + 1]
    if (sgn * x < 0.12 * H) continue
    if (y < 0.35 * H || y > 0.62 * H) continue
    const d = sgn * x
    if (d > hd) { hd = d; hx = tPos[v * 3]; hy = y; hz = tPos[v * 3 + 2] }
  }
  if (hd < 0) return 0
  const S = donorShoulder
  const a = [hx - S.x, hy - S.y, hz - S.z]
  const b = [donorHand.x - S.x, donorHand.y - S.y, donorHand.z - S.z]
  const la = Math.hypot(a[0], a[1], a[2]), lb = Math.hypot(b[0], b[1], b[2])
  const an = a.map((v) => v / la), bn = b.map((v) => v / lb)
  const cx = an[1] * bn[2] - an[2] * bn[1]
  const cy = an[2] * bn[0] - an[0] * bn[2]
  const cz = an[0] * bn[1] - an[1] * bn[0]
  const sl = Math.hypot(cx, cy, cz)
  const dot = an[0] * bn[0] + an[1] * bn[1] + an[2] * bn[2]
  if (sl < 1e-4) return 0
  const ux = cx / sl, uy = cy / sl, uz = cz / sl
  const ang = Math.atan2(sl, dot)
  const cA = Math.cos(ang), sA = Math.sin(ang), t = 1 - cA
  const R = [
    t * ux * ux + cA, t * ux * uy - sA * uz, t * ux * uz + sA * uy,
    t * ux * uy + sA * uz, t * uy * uy + cA, t * uy * uz - sA * ux,
    t * ux * uz - sA * uy, t * uy * uz + sA * ux, t * uz * uz + cA,
  ]
  const seg = [hx - S.x, hy - S.y, hz - S.z]
  const seg2 = seg[0] ** 2 + seg[1] ** 2 + seg[2] ** 2
  const RAD = 0.075 * H
  let rotated = 0
  for (let v = 0; v < tPos.length / 3; v++) {
    const px = tPos[v * 3] - S.x, py = tPos[v * 3 + 1] - S.y, pz = tPos[v * 3 + 2] - S.z
    let tt = (px * seg[0] + py * seg[1] + pz * seg[2]) / seg2
    if (tt < 0.12) continue
    tt = Math.min(1.25, tt)
    const dx = px - seg[0] * tt, dy = py - seg[1] * tt, dz = pz - seg[2] * tt
    if (dx * dx + dy * dy + dz * dz > RAD * RAD) continue
    const w = Math.min(1, (tt - 0.12) / 0.25)
    const rx = R[0] * px + R[1] * py + R[2] * pz
    const ry = R[3] * px + R[4] * py + R[5] * pz
    const rz = R[6] * px + R[7] * py + R[8] * pz
    tPos[v * 3] = S.x + px + (rx - px) * w
    tPos[v * 3 + 1] = S.y + py + (ry - py) * w
    tPos[v * 3 + 2] = S.z + pz + (rz - pz) * w
    rotated++
  }
  return rotated
}

const CLASSES = ['torso', 'armL', 'armR', 'legL', 'legR']
function jointClass(name) {
  if (/Left(Shoulder|Arm|ForeArm|Hand)/.test(name)) return 1
  if (/Right(Shoulder|Arm|ForeArm|Hand)/.test(name)) return 2
  if (/Left(UpLeg|Leg|Foot|ToeBase)/.test(name)) return 3
  if (/Right(UpLeg|Leg|Foot|ToeBase)/.test(name)) return 4
  return 0
}
const vClass = new Uint8Array(dPos.length / 3)
for (let v = 0; v < vClass.length; v++) vClass[v] = jointClass(jointNames[dJoints[v * 4]] ?? '')
const nTris = dIdx.length / 3
const triClass = new Uint8Array(nTris)
for (let t = 0; t < nTris; t++) {
  const c0 = vClass[dIdx[t * 3]], c1 = vClass[dIdx[t * 3 + 1]], c2 = vClass[dIdx[t * 3 + 2]]
  triClass[t] = c0 === c1 || c0 === c2 ? c0 : c1 === c2 ? c1 : 0
}
console.log('donor tris per class:', CLASSES.map((c, i) => {
  let n = 0
  for (let t = 0; t < nTris; t++) if (triClass[t] === i) n++
  return c + ':' + n
}).join(' '))

/* נורמלים: זרע דורש גם קרבה וגם הסכמת כיוון פנים — אצבע (מצביעה מטה)
   לא תיזרע על ירך (פונה הצידה) גם אם היא צמודה אליה. */
const tNrm = tPrim.getAttribute('NORMAL')?.getArray()
const triNrm = new Float32Array(nTris * 3)
for (let t = 0; t < nTris; t++) {
  const a = dIdx[t * 3], b = dIdx[t * 3 + 1], c = dIdx[t * 3 + 2]
  const ux = dPos[b * 3] - dPos[a * 3], uy = dPos[b * 3 + 1] - dPos[a * 3 + 1], uz = dPos[b * 3 + 2] - dPos[a * 3 + 2]
  const vx = dPos[c * 3] - dPos[a * 3], vy = dPos[c * 3 + 1] - dPos[a * 3 + 1], vz = dPos[c * 3 + 2] - dPos[a * 3 + 2]
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
  const l = Math.hypot(nx, ny, nz) || 1
  triNrm[t * 3] = nx / l; triNrm[t * 3 + 1] = ny / l; triNrm[t * 3 + 2] = nz / l
}

/* צירי הזרועות של התורם (כתף→כף-יד) */
const donorArm = {}
for (const cls of [1, 2]) {
  let hiY = -Infinity, loY = Infinity
  for (let v = 0; v < vClass.length; v++) if (vClass[v] === cls) {
    if (dPos[v * 3 + 1] > hiY) hiY = dPos[v * 3 + 1]
    if (dPos[v * 3 + 1] < loY) loY = dPos[v * 3 + 1]
  }
  const seg = hiY - loY
  let ax = 0, ay = 0, az = 0, an = 0, bx2 = 0, by2 = 0, bz2 = 0, bn2 = 0
  for (let v = 0; v < vClass.length; v++) {
    if (vClass[v] !== cls) continue
    const y = dPos[v * 3 + 1]
    if (y > hiY - 0.2 * seg) { ax += dPos[v * 3]; ay += y; az += dPos[v * 3 + 2]; an++ }
    if (y < loY + 0.2 * seg) { bx2 += dPos[v * 3]; by2 += y; bz2 += dPos[v * 3 + 2]; bn2++ }
  }
  if (an && bn2) donorArm[cls] = {
    shoulder: { x: ax / an, y: ay / an, z: az / an },
    hand: { x: bx2 / bn2, y: by2 / bn2, z: bz2 / bn2 },
  }
}
{
  const Hh = db.mx[1] - db.mn[1]
  if (donorArm[1]) console.log('armL rotated verts:', rotateArmToDonor(tPos, 'L', donorArm[1].shoulder, donorArm[1].hand, Hh))
  if (donorArm[2]) console.log('armR rotated verts:', rotateArmToDonor(tPos, 'R', donorArm[2].shoulder, donorArm[2].hand, Hh))
}

const bary = [0, 0, 0]
function closestOnTri(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz, out) {
  const abx = bx - ax, aby = by - ay, abz = bz - az
  const acx = cx - ax, acy = cy - ay, acz = cz - az
  const apx = px - ax, apy = py - ay, apz = pz - az
  const d1 = abx * apx + aby * apy + abz * apz
  const d2 = acx * apx + acy * apy + acz * apz
  if (d1 <= 0 && d2 <= 0) { out[0] = 1; out[1] = 0; out[2] = 0; return }
  const bpx = px - bx, bpy = py - by, bpz = pz - bz
  const d3 = abx * bpx + aby * bpy + abz * bpz
  const d4 = acx * bpx + acy * bpy + acz * bpz
  if (d3 >= 0 && d4 <= d3) { out[0] = 0; out[1] = 1; out[2] = 0; return }
  const vc = d1 * d4 - d3 * d2
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); out[0] = 1 - v; out[1] = v; out[2] = 0; return }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz
  const d5 = abx * cpx + aby * cpy + abz * cpz
  const d6 = acx * cpx + acy * cpy + acz * cpz
  if (d6 >= 0 && d5 <= d6) { out[0] = 0; out[1] = 0; out[2] = 1; return }
  const vb = d5 * d2 - d1 * d6
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); out[0] = 1 - w; out[1] = 0; out[2] = w; return }
  const va = d3 * d6 - d5 * d4
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); out[0] = 0; out[1] = 1 - w; out[2] = w; return }
  const denom = 1 / (va + vb + vc)
  const v = vb * denom, w = vc * denom
  out[0] = 1 - v - w; out[1] = v; out[2] = w
}

/* דגימה: המשולש הקרוב ביותר פר-איבר, לכל קודקוד יעד */
const bestTri = new Int32Array(tCount * 5).fill(-1)
const bestD = new Float32Array(tCount * 5).fill(Infinity)
const bestBary = new Float32Array(tCount * 15)
for (let vi = 0; vi < tCount; vi++) {
  const px = tPos[vi * 3], py = tPos[vi * 3 + 1], pz = tPos[vi * 3 + 2]
  for (let t = 0; t < nTris; t++) {
    const a = dIdx[t * 3], b = dIdx[t * 3 + 1], c = dIdx[t * 3 + 2]
    closestOnTri(px, py, pz,
      dPos[a * 3], dPos[a * 3 + 1], dPos[a * 3 + 2],
      dPos[b * 3], dPos[b * 3 + 1], dPos[b * 3 + 2],
      dPos[c * 3], dPos[c * 3 + 1], dPos[c * 3 + 2], bary)
    const qx = dPos[a * 3] * bary[0] + dPos[b * 3] * bary[1] + dPos[c * 3] * bary[2]
    const qy = dPos[a * 3 + 1] * bary[0] + dPos[b * 3 + 1] * bary[1] + dPos[c * 3 + 1] * bary[2]
    const qz = dPos[a * 3 + 2] * bary[0] + dPos[b * 3 + 2] * bary[1] + dPos[c * 3 + 2] * bary[2]
    const dd = (px - qx) ** 2 + (py - qy) ** 2 + (pz - qz) ** 2
    const slot = vi * 5 + triClass[t]
    if (dd < bestD[slot]) {
      bestD[slot] = dd
      bestTri[slot] = t
      bestBary[slot * 3] = bary[0]
      bestBary[slot * 3 + 1] = bary[1]
      bestBary[slot * 3 + 2] = bary[2]
    }
  }
  if (vi % 10000 === 0) console.log('sample', vi, '/', tCount)
}

/* עוגנים + צמיחת אזורים על שכנויות היעד */
const adj = Array.from({ length: tCount }, () => [])
for (let t = 0; t < tIdx.length; t += 3) {
  const a = tIdx[t], b = tIdx[t + 1], c = tIdx[t + 2]
  adj[a].push(b, c); adj[b].push(a, c); adj[c].push(a, b)
}
const label = new Int8Array(tCount).fill(-1)
const H = db.mx[1] - db.mn[1]
const EPS = 0.02 * H
let seeds = 0
for (let vi = 0; vi < tCount; vi++) {
  let bc = -1, bd = Infinity, second = Infinity
  for (let c = 0; c < 5; c++) {
    const d = bestD[vi * 5 + c]
    if (d < bd) { second = bd; bd = d; bc = c }
    else if (d < second) second = d
  }
  let normalOk = true
  if (tNrm) {
    const t = bestTri[vi * 5 + bc]
    if (t >= 0) {
      const dot = tNrm[vi * 3] * triNrm[t * 3] + tNrm[vi * 3 + 1] * triNrm[t * 3 + 1] + tNrm[vi * 3 + 2] * triNrm[t * 3 + 2]
      normalOk = Math.abs(dot) > 0.35
    }
  }
  if (normalOk && Math.sqrt(bd) < EPS && Math.sqrt(second) > Math.sqrt(bd) * 2.5) { label[vi] = bc; seeds++ }
}
console.log('seeds:', seeds, '/', tCount)
for (let iter = 0; iter < 80; iter++) {
  let changed = 0
  for (let vi = 0; vi < tCount; vi++) {
    if (label[vi] >= 0) continue
    const counts = [0, 0, 0, 0, 0]
    for (const u of adj[vi]) if (label[u] >= 0) counts[label[u]]++
    let best = -1, bn = 0
    for (let c = 0; c < 5; c++) if (counts[c] > bn) { bn = counts[c]; best = c }
    if (best >= 0) { label[vi] = best; changed++ }
  }
  if (!changed) break
}
for (let vi = 0; vi < tCount; vi++) if (label[vi] < 0) {
  let bc = 0, bd = Infinity
  for (let c = 0; c < 5; c++) if (bestD[vi * 5 + c] < bd) { bd = bestD[vi * 5 + c]; bc = c }
  label[vi] = bc
}

/* ניקוי: קודקוד שרוב מוחץ של שכניו מתויג אחרת — מאמץ אותם */
for (let iter = 0; iter < 4; iter++) {
  let changed = 0
  for (let vi = 0; vi < tCount; vi++) {
    const counts = [0, 0, 0, 0, 0]
    let n = 0
    for (const u of adj[vi]) { counts[label[u]]++; n++ }
    let best = 0, bn = 0
    for (let c = 0; c < 5; c++) if (counts[c] > bn) { bn = counts[c]; best = c }
    if (best !== label[vi] && bn > n * 0.7) { label[vi] = best; changed++ }
  }
  if (!changed) break
}

/* כפייה כירורגית: כל מה שבתוך כדור כף-היד של התורם הוא יד — נקודה.
   מרכז הכדור: מרכז-מסה של קודקודי הזרוע הנמוכים ביותר (כף היד). */
for (const [cls] of [[1], [2]]) {
  let sx = 0, sy = 0, sz = 0, n = 0, loY = Infinity
  for (let v = 0; v < vClass.length; v++) if (vClass[v] === cls && dPos[v * 3 + 1] < loY) loY = dPos[v * 3 + 1]
  for (let v = 0; v < vClass.length; v++) {
    if (vClass[v] !== cls) continue
    if (dPos[v * 3 + 1] > loY + 0.18 * H) continue
    sx += dPos[v * 3]; sy += dPos[v * 3 + 1]; sz += dPos[v * 3 + 2]; n++
  }
  if (!n) continue
  sx /= n; sy /= n; sz /= n
  const R = 0.085 * H
  let forced = 0
  for (let vi = 0; vi < tCount; vi++) {
    const dx = tPos[vi * 3] - sx, dy = tPos[vi * 3 + 1] - sy, dz = tPos[vi * 3 + 2] - sz
    if (dx * dx + dy * dy + dz * dz < R * R && label[vi] !== cls) { label[vi] = cls; forced++ }
  }
  console.log('hand sphere', CLASSES[cls], 'center', sx.toFixed(2), sy.toFixed(2), sz.toFixed(2), 'forced', forced)
}

/* קפסולת זרוע: תווית "זרוע" תקפה רק בתוך גליל סביב ציר כתף→כף-יד.
   הנרתיק שעל החגורה יושב סנטימטרים מהאמה — בלי זה הוא עף עם היד. */
for (const cls of [1, 2]) {
  let hiY = -Infinity, loY = Infinity
  for (let v = 0; v < vClass.length; v++) if (vClass[v] === cls) {
    if (dPos[v * 3 + 1] > hiY) hiY = dPos[v * 3 + 1]
    if (dPos[v * 3 + 1] < loY) loY = dPos[v * 3 + 1]
  }
  const seg = hiY - loY
  let ax = 0, ay = 0, az = 0, an = 0, bx = 0, by = 0, bz = 0, bn = 0
  for (let v = 0; v < vClass.length; v++) {
    if (vClass[v] !== cls) continue
    const y = dPos[v * 3 + 1]
    if (y > hiY - 0.2 * seg) { ax += dPos[v * 3]; ay += y; az += dPos[v * 3 + 2]; an++ }
    if (y < loY + 0.2 * seg) { bx += dPos[v * 3]; by += y; bz += dPos[v * 3 + 2]; bn++ }
  }
  if (!an || !bn) continue
  ax /= an; ay /= an; az /= an; bx /= bn; by /= bn; bz /= bn
  const R = 0.06 * H
  const abx = bx - ax, aby = by - ay, abz = bz - az
  const ab2 = abx * abx + aby * aby + abz * abz
  let demoted = 0
  for (let vi = 0; vi < tCount; vi++) {
    if (label[vi] !== cls) continue
    const px = tPos[vi * 3] - ax, py = tPos[vi * 3 + 1] - ay, pz = tPos[vi * 3 + 2] - az
    let t = (px * abx + py * aby + pz * abz) / ab2
    t = Math.max(0, Math.min(1.15, t))
    const dx = px - abx * t, dy = py - aby * t, dz = pz - abz * t
    if (dx * dx + dy * dy + dz * dz > R * R) { label[vi] = 0; demoted++ }
  }
  console.log('arm capsule', CLASSES[cls], 'demoted to torso:', demoted)
}

/* משקולות: מהמשולש הקרוב של האיבר המתויג */
const outJoints = new Uint8Array(tCount * 4)
const outWeights = new Float32Array(tCount * 4)
const tmp = new Map()
for (let vi = 0; vi < tCount; vi++) {
  let cl = label[vi]
  if (bestTri[vi * 5 + cl] < 0) {
    let bd = Infinity
    for (let c = 0; c < 5; c++) if (bestD[vi * 5 + c] < bd) { bd = bestD[vi * 5 + c]; cl = c }
  }
  const slot = vi * 5 + cl
  const t = bestTri[slot]
  const bw0 = bestBary[slot * 3], bw1 = bestBary[slot * 3 + 1], bw2 = bestBary[slot * 3 + 2]
  const corners = [dIdx[t * 3], dIdx[t * 3 + 1], dIdx[t * 3 + 2]]
  const bws = [bw0, bw1, bw2]
  tmp.clear()
  for (let ci = 0; ci < 3; ci++) {
    const v = corners[ci]
    for (let k = 0; k < 4; k++) {
      const j = dJoints[v * 4 + k]
      const w = dWeights[v * 4 + k] * bws[ci]
      if (w > 0) tmp.set(j, (tmp.get(j) ?? 0) + w)
    }
  }
  const top = [...tmp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  let sum = 0
  for (const [, w] of top) sum += w
  for (let k = 0; k < 4; k++) {
    outJoints[vi * 4 + k] = top[k] ? top[k][0] : 0
    outWeights[vi * 4 + k] = top[k] ? top[k][1] / sum : 0
  }
}

/* החלקה בתוך אותו איבר בלבד */
for (let iter = 0; iter < 3; iter++) {
  const nj = new Uint8Array(outJoints)
  const nw = new Float32Array(outWeights)
  const acc = new Map()
  for (let v = 0; v < tCount; v++) {
    acc.clear()
    const put = (j, w) => { if (w > 0) acc.set(j, (acc.get(j) ?? 0) + w) }
    for (let k = 0; k < 4; k++) put(outJoints[v * 4 + k], outWeights[v * 4 + k])
    let nn = 0
    for (const u of adj[v]) if (label[u] === label[v]) nn++
    for (const u of adj[v]) {
      if (label[u] !== label[v]) continue
      for (let k = 0; k < 4; k++) put(outJoints[u * 4 + k], outWeights[u * 4 + k] * (0.6 / Math.max(1, nn)))
    }
    const top = [...acc.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4)
    let sum = 0
    for (const [, w] of top) sum += w
    for (let k = 0; k < 4; k++) {
      nj[v * 4 + k] = top[k] ? top[k][0] : 0
      nw[v * 4 + k] = top[k] ? top[k][1] / sum : 0
    }
  }
  outJoints.set(nj)
  outWeights.set(nw)
}
console.log('smoothed within regions')

const posAcc = donorDoc.createAccessor().setType('VEC3').setArray(new Float32Array(tPos))
const nrmArr = tPrim.getAttribute('NORMAL')?.getArray()
const uvArr = tPrim.getAttribute('TEXCOORD_0')?.getArray()
dPrim.setAttribute('POSITION', posAcc)
if (nrmArr) dPrim.setAttribute('NORMAL', donorDoc.createAccessor().setType('VEC3').setArray(nrmArr.slice()))
if (uvArr) dPrim.setAttribute('TEXCOORD_0', donorDoc.createAccessor().setType('VEC2').setArray(uvArr.slice()))
dPrim.setAttribute('JOINTS_0', donorDoc.createAccessor().setType('VEC4').setArray(outJoints))
dPrim.setAttribute('WEIGHTS_0', donorDoc.createAccessor().setType('VEC4').setArray(outWeights))
dPrim.setIndices(donorDoc.createAccessor().setType('SCALAR').setArray(tIdx.slice()))

const tMat = tPrim.getMaterial()
const tTex = tMat?.getBaseColorTexture()
if (tTex) {
  const newTex = donorDoc.createTexture('playerTex').setImage(tTex.getImage()).setMimeType(tTex.getMimeType())
  const mat = donorDoc.createMaterial('player')
    .setBaseColorTexture(newTex)
    .setMetallicFactor(0)
    .setRoughnessFactor(1)
    .setDoubleSided(true)
  dPrim.setMaterial(mat)
}

await donorDoc.transform(prune())
await io.write(outPath, donorDoc)
console.log('wrote', outPath)
