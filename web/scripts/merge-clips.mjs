/* מיזוג קליפי אנימציה מכמה GLB עם אותו שלד לקובץ דמות אחד.
   שימוש: node scripts/merge-clips.mjs out.glb base.glb walk clipA.glb idle ...
   כל זוג הוא (קובץ, שם-קליפ-במשחק). הקובץ הראשון תורם רשת+שלד+קליפ,
   הבאים תורמים קליפ בלבד — הערוצים ממופים לעצמות הבסיס לפי שם.
   תנועת שורש: הקליפים של Meshy נטועים בעולם; המשחק מזיז את הדמות
   בעצמו, ולכן מסלול ה-XZ של ה-Hips מאופס (in-place). */
import { NodeIO } from '@gltf-transform/core'
import { prune } from '@gltf-transform/functions'

const [out, ...pairs] = process.argv.slice(2)
if (!out || pairs.length < 2 || pairs.length % 2) {
  console.error('usage: merge-clips.mjs out.glb base.glb name [more.glb name ...]')
  process.exit(1)
}

const io = new NodeIO()
const baseDoc = await io.read(pairs[0])
const baseRoot = baseDoc.getRoot()

// עצמות הבסיס לפי שם
const baseNodes = new Map()
for (const n of baseRoot.listNodes()) baseNodes.set(n.getName(), n)

// הקליפ של קובץ הבסיס מקבל את שמו
const baseAnims = baseRoot.listAnimations()
if (baseAnims.length !== 1) console.warn(`base has ${baseAnims.length} clips`)
baseAnims[0]?.setName(pairs[1])

for (let i = 2; i < pairs.length; i += 2) {
  const doc = await io.read(pairs[i])
  const name = pairs[i + 1]
  const anims = doc.getRoot().listAnimations()
  if (!anims.length) {
    console.error(`${pairs[i]}: no animation`)
    process.exit(1)
  }
  const anim = anims[0]
  const newAnim = baseDoc.createAnimation(name)
  for (const ch of anim.listChannels()) {
    const targetName = ch.getTargetNode()?.getName()
    const baseNode = baseNodes.get(targetName)
    if (!baseNode) continue // עצם שלא קיימת בבסיס — מדלגים
    const s = ch.getSampler()
    const input = baseDoc.createAccessor()
      .setArray(s.getInput().getArray())
      .setType(s.getInput().getType())
    const output = baseDoc.createAccessor()
      .setArray(s.getOutput().getArray())
      .setType(s.getOutput().getType())
    const sampler = baseDoc.createAnimationSampler()
      .setInput(input).setOutput(output).setInterpolation(s.getInterpolation())
    const channel = baseDoc.createAnimationChannel()
      .setTargetNode(baseNode).setTargetPath(ch.getTargetPath()).setSampler(sampler)
    newAnim.addSampler(sampler).addChannel(channel)
  }
  console.log(`${name}: ${newAnim.listChannels().length} channels from ${pairs[i]}`)
}

// איפוס XZ של ה-Hips בכל קליפ — הליכה במקום
for (const anim of baseRoot.listAnimations()) {
  for (const ch of anim.listChannels()) {
    if (ch.getTargetPath() !== 'translation') continue
    const nodeName = ch.getTargetNode()?.getName() ?? ''
    if (!/hips/i.test(nodeName)) continue
    const outAcc = ch.getSampler().getOutput()
    const arr = outAcc.getArray().slice()
    // ממוצע כדי לשמר את מרכז המסה, ואז מקבעים את הצירים האופקיים אליו
    let mx = 0, mz = 0
    for (let j = 0; j < arr.length; j += 3) { mx += arr[j]; mz += arr[j + 2] }
    mx /= arr.length / 3; mz /= arr.length / 3
    for (let j = 0; j < arr.length; j += 3) { arr[j] = mx; arr[j + 2] = mz }
    outAcc.setArray(arr)
  }
}

await baseDoc.transform(prune())
await io.write(out, baseDoc)
const st = (await import('fs')).statSync(out)
console.log(`wrote ${out} (${(st.size / 1048576).toFixed(1)} MB), clips: ${baseRoot.listAnimations().map(a => a.getName()).join(', ')}`)
