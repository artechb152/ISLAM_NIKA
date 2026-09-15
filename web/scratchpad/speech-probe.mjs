/* האם פס הקול הוא קריינות או מוזיקה? דיבור נושא אפנון מעטפת חזק
   ב-4–8 הרץ (קצב ההברות) ואנרגיה בתחום 300–3400 הרץ. מדידה, לא ניחוש. */
import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const p = await b.newPage()
await p.goto('http://localhost:3000/chapter1', { waitUntil: 'domcontentloaded', timeout: 60000 })
for (const f of ['opening.mp4', 'abraha.mp4', 'scene2.mp4', 'ch1-summary.mp4']) {
  const r = await p.evaluate(async (file) => {
    const buf = await (await fetch('/assets/anim-video/' + file)).arrayBuffer()
    const ctx = new AudioContext()
    const a = await ctx.decodeAudioData(buf)
    const ch = a.getChannelData(0), sr = a.sampleRate
    if (!ch.length) return { empty: true }
    /* מעטפת ב-100 הרץ */
    const hop = Math.floor(sr / 100)
    const env = []
    for (let i = 0; i + hop < ch.length; i += hop) {
      let s = 0
      for (let j = i; j < i + hop; j += 4) s += ch[j] * ch[j]
      env.push(Math.sqrt(s / (hop / 4)))
    }
    const mean = env.reduce((x, y) => x + y, 0) / env.length
    if (mean < 1e-6) return { silent: true }
    const e = env.map(v => v - mean)
    /* DFT ידני על 1–14 הרץ */
    const band = (lo, hi) => {
      let tot = 0
      for (let f = lo; f <= hi; f += 0.5) {
        let re = 0, im = 0
        for (let n = 0; n < e.length; n++) { const w = 2 * Math.PI * f * n / 100; re += e[n] * Math.cos(w); im += e[n] * Math.sin(w) }
        tot += Math.hypot(re, im)
      }
      return tot / ((hi - lo) / 0.5 + 1)
    }
    const syll = band(3.5, 8)     /* קצב הברות */
    const slow = band(0.5, 2)     /* פראזות מוזיקליות */
    /* אחוז הזמן ה„שקט" — לדיבור יש הפסקות, למוזיקה רצופה אין */
    const quiet = env.filter(v => v < mean * 0.25).length / env.length
    return { syllToSlow: +(syll / (slow || 1e-9)).toFixed(2), quietPct: +(100 * quiet).toFixed(0), meanRms: +mean.toFixed(4), dur: +a.duration.toFixed(1) }
  }, f)
  const verdict = r.silent ? 'שקט לחלוטין — אין שם כלום'
    : r.syllToSlow > 0.35 && r.quietPct > 12 ? 'דמוי דיבור'
    : r.quietPct < 8 ? 'רצוף — נשמע כמוזיקה/אווירה'
    : 'לא חד-משמעי'
  console.log(f.padEnd(20), JSON.stringify(r), '→', verdict)
}
await b.close()
