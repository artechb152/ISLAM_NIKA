/* Round-trip the chapter-1 camp between the game and Blender.

     npm run camp:export   layout JSON  →  blender/camp.blend   (edit it)
     npm run camp:import   blender/camp.blend  →  layout JSON    (game updates)

   The game reads src/lib/chapter1/camp-layout.json directly, so an import is
   picked up by the dev server immediately.
*/

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.resolve(HERE, '..')


function findBlender() {
  if (process.env.BLENDER) return process.env.BLENDER
  for (const root of ['C:/Program Files/Blender Foundation', 'C:/Program Files (x86)/Blender Foundation']) {
    if (!existsSync(root)) continue
    for (const dir of readdirSync(root).sort().reverse()) {
      const exe = path.join(root, dir, 'blender.exe')
      if (existsSync(exe)) return exe
    }
  }
  return null
}

const mode = process.argv[2]
if (mode !== 'export' && mode !== 'import') {
  console.error('usage: node scripts/camp.mjs <export|import> [region]')
  process.exit(1)
}

/* איזה אזור עורכים. הסקריפט נכתב כשהמחנה היה „העולם“ ולא „אזור“,
   ולכן הוא היה נעול על camp-layout.json — כלומר שמונה מתשעת האזורים
   לא היו ניתנים לעריכה ב-Blender בכלל. השם נשאר ברירת מחדל כדי
   שכל קריאה ישנה תמשיך לעבוד. */
const REGIONS = {
  'yemen-heights': 'yemen-heights-layout.json',
  'night-camp': 'camp-layout.json',
  camp: 'camp-layout.json',
  'border-post': 'border-layout.json',
  'narrow-pass': 'narrow-pass-layout.json',
  'loading-road': 'loading-road-layout.json',
  yathrib: 'yathrib-layout.json',
  monastery: 'monastery-layout.json',
  mecca: 'mecca-layout.json',
  exit: 'exit-layout.json',
}
const region = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'camp'
if (!REGIONS[region]) {
  console.error(`אזור לא מוכר: ${region}`)
  console.error(`אפשרויות: ${Object.keys(REGIONS).join(', ')}`)
  process.exit(1)
}
const LAYOUT = path.join(WEB, 'src', 'lib', 'chapter1', REGIONS[region])
/* קובץ .blend נפרד לכל אזור — אחרת ייצוא של אזור אחד דורס את עבודת השני. */
const BLEND = path.join(WEB, 'blender', region === 'camp' ? 'camp.blend' : region + '.blend')
const blender = findBlender()
if (!blender) {
  console.error('לא נמצאה התקנת Blender. הגדירו BLENDER לנתיב blender.exe')
  process.exit(1)
}

const refresh = process.argv.includes('--refresh')
const env = { ...process.env, CH1_WEB: WEB, CH1_BLEND: BLEND, CH1_LAYOUT: LAYOUT, CH1_REFRESH: refresh ? '1' : '' }

if (mode === 'export') {
  console.log('בונה את הסצנה ל-Blender…')
  execFileSync(blender, ['-b', '--python', path.join(HERE, 'camp-export.py')], { stdio: 'inherit', env })
  console.log(`\n✓ נוצר ${path.relative(WEB, BLEND)}`)
  console.log('  פתחי אותו ב-Blender, הזיזי/סובבי/שני גודל של מה שתרצי, שמרי (Ctrl+S),')
  console.log('  ואז הריצי:  npm run camp:import')
} else {
  if (!existsSync(BLEND)) {
    console.error(`לא נמצא ${path.relative(WEB, BLEND)} — הריצי קודם npm run camp:export`)
    process.exit(1)
  }
  console.log(refresh ? 'קורא את הסצנה ומרענן את כל המודלים…' : 'קורא את הסצנה מ-Blender…')
  execFileSync(blender, ['-b', BLEND, '--python', path.join(HERE, 'camp-import.py')], { stdio: 'inherit', env })
  console.log('\nמריץ בדיקת פריסה…')
  try {
    execFileSync(process.execPath, [path.join(HERE, 'check-camp.mjs')], { stdio: 'inherit' })
  } catch {
    console.error('\n⚠ הפריסה נשמרה אבל יש התנגשויות — תקני ב-Blender והריצי שוב camp:import.')
    process.exit(1)
  }
}
