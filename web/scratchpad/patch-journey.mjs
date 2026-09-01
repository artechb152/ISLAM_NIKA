import fs from 'fs'
const p = 'scripts/check-journey.mjs'
let s = fs.readFileSync(p, 'utf8')
s = s.replace(`/* the HUD promises a notebook total; it must match what actually exists */`,
`/* מטרות ליבה: אם אזור מכריז core, כל מזהה חייב להתקיים אצלו — מפגש
   מאותו אזור או משימת האזור. ליבה שמצביעה על כלום היא שער שלא ייפתח
   לעולם, וזה בדיוק סוג התקיעה שאסור שתגיע ללומד. השדה רשות: אזור בלי
   core פשוט לא שוער. */
for (const region of dialogue.regions) {
  const core = region.core
  if (!core) continue
  if (!Array.isArray(core) || core.length === 0) {
    problems.push(\`\${region.id}: core must be a non-empty array of ids.\`)
    continue
  }
  const encounterIds = new Set(region.encounters.map((e) => e.id))
  for (const id of core) {
    if (encounterIds.has(id)) continue
    if (tasksSrc.includes(\`'\${id}'\`) || tasksSrc.includes(\`"\${id}"\`)) continue
    problems.push(\`\${region.id}: core id "\${id}" is neither an encounter of this region nor a known task.\`)
  }
}

/* the HUD promises a notebook total; it must match what actually exists */`)
fs.writeFileSync(p, s)
console.log(s.includes('core must be a non-empty') ? 'patched' : 'ANCHOR MISS')
