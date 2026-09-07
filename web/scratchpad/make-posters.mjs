/* פוסטר לכל סרטון, מהסרטון עצמו.
   ffmpeg של Playwright הוא בניית VP8/webm בלבד ואינו יודע לפענח H.264,
   ואין ffmpeg מערכת. הדפדפן כן יודע — הוא מנגן את הקבצים האלה — ולכן
   הפריים נלקח ממנו: seek, ציור לקנבס, ושמירה כ-JPEG. */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
const DIR = 'public/assets/anim-video'
const jobs = [['opening.mp4', 1.2], ['abraha.mp4', 2.0], ['scene2.mp4', 1.0]]
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--autoplay-policy=no-user-gesture-required'] })
const page = await (await browser.newContext()).newPage()
await page.goto('http://localhost:3000/chapter1', { waitUntil:'domcontentloaded' })
for (const [name, at] of jobs) {
  const dataUrl = await page.evaluate(async ({ name, at }) => {
    const v = document.createElement('video')
    v.src = `/assets/anim-video/${name}`
    v.muted = true; v.playsInline = true; v.preload = 'auto'
    document.body.appendChild(v)
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(res, 12000) })
    v.currentTime = at
    await new Promise((res) => { v.onseeked = res; setTimeout(res, 6000) })
    const c = document.createElement('canvas')
    c.width = Math.min(1280, v.videoWidth || 1280)
    c.height = Math.round(c.width * ((v.videoHeight || 720) / (v.videoWidth || 1280)))
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
    const out = c.toDataURL('image/jpeg', 0.82)
    v.remove()
    return out
  }, { name, at })
  const b64 = dataUrl.split(',')[1]
  const out = `${DIR}/${name.replace('.mp4','')}-poster.jpg`
  fs.writeFileSync(out, Buffer.from(b64, 'base64'))
  console.log(out, fs.statSync(out).size, 'bytes')
}
await browser.close()
