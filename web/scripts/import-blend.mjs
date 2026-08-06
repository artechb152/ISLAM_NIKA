/* Convert a .blend (e.g. a BlenderKit asset) into a web-ready GLB for chapter 1.

   Usage:
     npm run add-model -- "C:\\Users\\me\\Downloads\\Some Asset.blend" lantern
     npm run add-model -- "…\\Asset.blend" lantern --objects "Body,Glass" --tris 6000

   Writes public/assets/chapter1/models/<name>.glb, then prints the exact lines
   to paste into the CAMP table in src/components/chapter1/Game.tsx.
*/

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '..')
const MODELS = path.join(WEB, 'public', 'assets', 'chapter1', 'models')

function findBlender() {
  if (process.env.BLENDER) return process.env.BLENDER
  const roots = ['C:/Program Files/Blender Foundation', 'C:/Program Files (x86)/Blender Foundation']
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const dir of readdirSync(root).sort().reverse()) {
      const exe = path.join(root, dir, 'blender.exe')
      if (existsSync(exe)) return exe
    }
  }
  return null
}

const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
const flag = (name, fallback) => {
  const i = args.indexOf('--' + name)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const [blend, name] = positional
if (!blend || !name) {
  console.error('usage: npm run add-model -- <file.blend> <name> [--objects "A,B"] [--tris 9000] [--tex 1024]')
  process.exit(1)
}
if (!existsSync(blend)) {
  console.error(`לא נמצא הקובץ: ${blend}`)
  process.exit(1)
}
const blender = findBlender()
if (!blender) {
  console.error('לא נמצאה התקנת Blender. הגדירו משתנה סביבה BLENDER לנתיב blender.exe')
  process.exit(1)
}

const out = path.join(MODELS, `${name}.glb`)
console.log(`Blender: ${blender}`)
console.log(`ממיר: ${path.basename(blend)}  →  ${path.relative(WEB, out)}`)

execFileSync(blender, ['-b', blend, '--python', path.join(HERE, 'blend-to-glb.py')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CH1_OUT: out,
    CH1_OBJECTS: flag('objects', ''),
    CH1_TRIS: flag('tris', '9000'),
    CH1_TEX: flag('tex', '1024'),
  },
})

if (!existsSync(out)) {
  console.error('הייצוא נכשל — לא נוצר קובץ GLB.')
  process.exit(1)
}
const mb = (statSync(out).size / 1024 / 1024).toFixed(1)
const CONST = 'MODEL_' + name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')

const { radiusAt } = await import('./measure-props.mjs')
const m = radiusAt(`${name}.glb`, 2)

console.log(`\n✓ נוצר ${path.relative(WEB, out)} (${mb} MB)`)
console.log('\nלהוספה ל-src/components/chapter1/Game.tsx:\n')
console.log(`  const ${CONST} = '/assets/chapter1/models/${name}.glb'`)
console.log(`  // …ולהוסיף ${CONST} לרשימת ה-useGLTF.preload`)
console.log(`\n  // בטבלת CAMP — h = הגובה במטרים, r = רדיוס ההתנגשות:`)
if (m) {
  console.log(`  { url: ${CONST}, x: 0, z: -10, ry: 0, h: 2, r: ${m.radius.toFixed(1)} },`)
  console.log(`\n  // בגובה 2 מ' המודל תופס ${m.w.toFixed(1)}×${m.d.toFixed(1)} מ' על הקרקע.`)
  console.log(`  // אחרי שינוי h — הריצו: npm run check-camp   (הוא מודד מחדש ומוודא שאין חפיפות)`)
} else {
  console.log(`  { url: ${CONST}, x: 0, z: -10, ry: 0, h: 2, r: 1.5 },`)
}
