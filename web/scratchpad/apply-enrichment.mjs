import fs from 'fs'

// 1) rawi-echo יוצא מהמסלול הראשי; exit מתמספר 27→26
{
  const p = 'src/lib/chapter1/dialogue.json'
  const d = JSON.parse(fs.readFileSync(p, 'utf8'))
  const mecca = d.regions.find((r) => r.id === 'mecca')
  const i = mecca.encounters.findIndex((e) => e.id === 'rawi-echo')
  if (i >= 0) mecca.encounters.splice(i, 1)
  const exit = d.regions.find((r) => r.id === 'exit')
  const summary = exit.encounters.find((e) => e.id === 'rawi-summary')
  summary.notebook = 26
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n')
  console.log('rawi-echo moved out; rawi-summary → nb26')
}

// 2) NOTEBOOK_TOTAL 27→26
{
  const p = 'src/lib/chapter1/dialogue.ts'
  let s = fs.readFileSync(p, 'utf8')
  s = s.replace(/NOTEBOOK_TOTAL = 27/, 'NOTEBOOK_TOTAL = 26')
  fs.writeFileSync(p, s)
  console.log('NOTEBOOK_TOTAL = 26')
}

// 3) ההרנס סופר 27 — מעכשיו קורא מהדאטה
{
  const p = 'scripts/check-notebook.mjs'
  let s = fs.readFileSync(p, 'utf8')
  const dj = JSON.parse(fs.readFileSync("src/lib/chapter1/dialogue.json", "utf8"))
  const total = dj.regions.reduce((n, r) => n + r.encounters.filter((e) => e.notebook > 0).length, 0)
  s = s.split("%d / 27").join("%d / " + total)
  s = s.replace("const short = (seen < 27 ? 1 : 0)", "const short = (seen < " + total + " ? 1 : 0)")
  s = s.replace('const short = (seen < 27 ? 1 : 0)',
    'const TOTAL_ENC = dialogue.regions.reduce((n, r) => n + r.encounters.length, 0)\nconst short = (seen < TOTAL_ENC ? 1 : 0)')
  fs.writeFileSync(p, s)
  console.log('check-notebook counts from data')
}
