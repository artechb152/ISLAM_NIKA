/* האם באמת יש קריינות בתוך הסרטים? מפענחים את פס הקול ומודדים עוצמה. */
import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage()
await p.goto('http://localhost:3000/chapter1', { waitUntil: 'domcontentloaded', timeout: 60000 })
for (const f of ['opening.mp4','abraha.mp4','scene2.mp4','ch1-summary.mp4']) {
  const r = await p.evaluate(async (file) => {
    try {
      const res = await fetch('/assets/anim-video/' + file)
      const buf = await res.arrayBuffer()
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const a = await ctx.decodeAudioData(buf)
      const ch = a.getChannelData(0)
      let sum = 0, peak = 0, loud = 0
      const N = ch.length
      for (let i = 0; i < N; i += 16) { const v = Math.abs(ch[i]); sum += v*v; if (v > peak) peak = v; if (v > 0.02) loud++ }
      const n = Math.ceil(N/16)
      return { dur: +a.duration.toFixed(1), ch: a.numberOfChannels, rms: +Math.sqrt(sum/n).toFixed(5), peak: +peak.toFixed(4), loudPct: +(100*loud/n).toFixed(1) }
    } catch (e) { return { error: String(e).slice(0,120) } }
  }, f)
  console.log(f.padEnd(20), JSON.stringify(r))
}
await b.close()
