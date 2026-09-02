import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
const HF = process.env.USERPROFILE + '\.higgsfield\bin\hf.exe'
const d = JSON.parse(fs.readFileSync('src/lib/chapter4/passages.json', 'utf8'))
const t = (ref) => { const [s, i] = ref.split('.'); return d.passages[s].find((f) => f.id === i).text }
/* הקריינות היא משפטי המקור עצמם, לא נוסח שכתבתי */
const script = t('§12.rain') + ' ' + t('§12.duel')
fs.writeFileSync('scratchpad/narration.txt', script)
console.log('מילים:', script.split(/\s+/).length)
console.log(script.slice(0, 90) + '…')
