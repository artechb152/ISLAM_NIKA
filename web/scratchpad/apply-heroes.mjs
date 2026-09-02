/* הטמעת נכסי הגיבור + סרט הפתיח. מופעל רק כשהשרת פנוי מסוכני ועדה. */
import fs from 'fs'

const LIB = 'src/lib/chapter1/'

// 1) הפתיח: הסרט המבוים החדש, חד-פעמי ועם קול
{
  const p = LIB + 'dialogue.json'
  const d = JSON.parse(fs.readFileSync(p, 'utf8'))
  const opening = d.regions.find((r) => r.id === 'yemen-heights').encounters.find((e) => e.id === 'opening')
  opening.film = 'opening.mp4'
  opening.filmOnce = true
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n')
  console.log('opening → opening.mp4 (filmOnce)')
}

// 2) נכסי גיבור בפריסות
function addProp(file, prop) {
  const p = LIB + file
  const l = JSON.parse(fs.readFileSync(p, 'utf8'))
  l.props = l.props ?? []
  if (!l.props.some((x) => x.model === prop.model)) {
    l.props.push(prop)
    fs.writeFileSync(p, JSON.stringify(l, null, 2) + '\n')
    console.log(file, '+', prop.model)
  }
}
/* שער המכס: רוכב על הדרך אל המעבר הצר — הפתח במרכז הדגם, ולכן רדיוס
   ההתנגשות קטן כדי שהשביל עובר מתחת לקורה */
addProp('border-layout.json', { model: 'gate-hero', x: -1.8, z: -20, ry: 0, h: 5.4, r: 0.4 })
/* פינת המנזר עם הפעמון — ליד חצר המשימה */
addProp('monastery-layout.json', { model: 'monastery-hero', x: -7.2, z: 7.5, ry: 0.7, h: 3.4, r: 2.6 })
/* טרסות תימן — נוף ליד הכתובת */
addProp('yemen-heights-layout.json', { model: 'terraces-hero', x: -15, z: 16, ry: -0.4, h: 3.6, r: 4.5 })

// 3) מכה: מתחם המקדש מחליף את הכעבה הבודדת באותו מקום
{
  const p = LIB + 'mecca-layout.json'
  const l = JSON.parse(fs.readFileSync(p, 'utf8'))
  const k = l.props.find((x) => x.model === 'kaaba')
  if (k) {
    k.model = 'sanctuary-hero'
    k.h = 5.4
    k.r = 2.4
    fs.writeFileSync(p, JSON.stringify(l, null, 2) + '\n')
    console.log('mecca: kaaba → sanctuary-hero precinct at', k.x, k.z)
  }
}
