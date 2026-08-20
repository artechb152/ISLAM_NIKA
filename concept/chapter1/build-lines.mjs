import { readFile } from 'node:fs/promises'
const d = JSON.parse(await readFile('dialogue.json', 'utf8'))
const VOICE = { rawi:'1ffcdbb3-078b-5491-959d-359e3021e917', envoy:'d9d5c263-f84e-4752-97b5-3750fcc6fd2f', chief:'6705e465-7b52-5915-a1d8-b1222885e01d', merchant:'e2a2d2e6-9ed2-59cd-82af-feaa27f8a678', jewish:'1ad38ba4-9cc4-4f2f-9fde-b0fefdf67ae5', monk:'563f728c-e249-5a85-97ab-8461e8c09da6', narrator:'43173c95-3ec8-446a-a162-6504332c578b' }
const jobs = []
for (const r of d.regions) for (const e of r.encounters) {
  const push = (lines, spk, tag) => (lines ?? []).forEach((l, i) =>
    jobs.push({ id: `${e.id}${tag}-${i + 1}`, speaker: spk, voice: VOICE[spk], source: l.source, text: l.text }))
  push(e.lines, e.speaker, '')
  push(e.rawi_followup, 'rawi', '-rawi')
  ;(e.choices ?? []).forEach((c, ci) => push(c.lines, e.speaker, `-c${ci + 1}`))
}
const chars = jobs.reduce((s, j) => s + j.text.length, 0)
console.log(`שורות: ${jobs.length} · תווים: ${chars} · הערכת עלות: ~${(jobs.length * 0.45).toFixed(1)} קרדיטים`)
const bySpk = {}
for (const j of jobs) bySpk[j.speaker] = (bySpk[j.speaker] ?? 0) + 1
console.log(JSON.stringify(bySpk))
await (await import('node:fs/promises')).writeFile('voice-test/lines.json', JSON.stringify(jobs, null, 1))
