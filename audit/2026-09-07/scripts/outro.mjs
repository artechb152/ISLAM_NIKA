/* דף הסיום בדפדפן אמיתי: סרט, מסקנות, מעבר לתרגול וחזרה לפרקים. */
import fs from 'node:fs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const OUT='/Users/nikagreenbaum/ISLAM_NIKA/audit/2026-09-07'
const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport:{width:1180,height:900} })
const errs=[], failed=[], rej=[]
page.on('pageerror', e=>errs.push(e.message.slice(0,160)))
page.on('requestfailed', q=>failed.push(q.url().slice(-70)+' — '+(q.failure()?.errorText??'')))
page.on('console', m=>{ if(/unhandled|rejection/i.test(m.text())) rej.push(m.text().slice(0,120)) })
const lines=[]; const say=(m)=>{console.log(m); lines.push(m)}
await page.goto('http://localhost:3000/chapter1?region=exit&from=mecca', { waitUntil:'domcontentloaded' })
await page.waitForTimeout(4000)
await page.screenshot({ path: `${OUT}/shots/outro-01-open.png`, fullPage: true })
say('כותרת: ' + (await page.evaluate(()=>document.querySelector('.ch1-outro-head h1')?.textContent?.trim() ?? 'אין')))
say('כותרת עליונה: ' + (await page.evaluate(()=>document.querySelector('.ch1-outro-eyebrow')?.textContent?.trim() ?? 'אין')))
const vid = async () => page.evaluate(()=>{ const v=document.querySelector('.ch1-outro-film video')
  if(!v) return null
  return { w:v.videoWidth, h:v.videoHeight, t:+v.currentTime.toFixed(2), dur:+(v.duration||0).toFixed(1),
    paused:v.paused, poster:!!v.getAttribute('poster'), err:v.error?v.error.code:null,
    tracks:v.textTracks?v.textTracks.length:0 } })
say('סרט בטעינה: ' + JSON.stringify(await vid()))
await page.waitForTimeout(3500)
const v2 = await vid(); say('סרט אחרי 3.5 שנ׳: ' + JSON.stringify(v2))
/* פריים אמיתי, לא מלבן שחור */
const lum = await page.evaluate(()=>{ const v=document.querySelector('.ch1-outro-film video')
  try { const c=document.createElement('canvas'); c.width=64;c.height=36
    const g=c.getContext('2d'); g.drawImage(v,0,0,64,36)
    const d=g.getImageData(0,0,64,36).data; let s=0
    for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2]
    return Math.round(s/(d.length/4)/3) } catch(e){ return -1 } })
say('בהירות פריים: ' + lum)
await page.screenshot({ path: `${OUT}/shots/outro-02-film.png`, fullPage: true })
const words = await page.evaluate(()=>[...document.querySelectorAll('.ch1-outro-words p')].map(p=>p.textContent.trim().slice(0,90)))
say(`מסקנות (${words.length}):`); for (const w of words) say('   · ' + w)
say('אבן אחרונה: ' + (await page.evaluate(()=>document.querySelector('.ch1-outro-stone h2')?.textContent?.trim() ?? 'אין')))
/* המחברת נסגרת */
const nb = await page.evaluate(()=>{ try { const s=JSON.parse(localStorage.getItem('ch1:notebook:v1')||'{}')
  return { seen:(s.seen||[]).length, found:(s.found||[]).length, ch:localStorage.getItem('islam:chapter:1') } } catch(e){ return null } })
say('מחברת: ' + JSON.stringify(nb))
/* כפתורי הרגל */
const foot = await page.evaluate(()=>[...document.querySelectorAll('.ch1-outro-foot a')].map(a=>({t:a.textContent.trim(), href:a.getAttribute('href')})))
say('כפתורים: ' + JSON.stringify(foot))
await page.screenshot({ path: `${OUT}/shots/outro-03-bottom.png`, fullPage: true })
/* מעבר לתרגול בלחיצה אחת */
await page.click('.ch1-outro-foot a[href="/chapter1/practice"]', { timeout: 5000 }).catch(()=>{})
await page.waitForTimeout(2500)
say('אחרי „לתרגול": ' + page.url())
await page.screenshot({ path: `${OUT}/shots/outro-04-practice.png`, fullPage: true })
await page.goBack({ waitUntil:'domcontentloaded' }); await page.waitForTimeout(2500)
await page.click('.ch1-outro-foot a[href="/chapters"]', { timeout: 5000 }).catch(()=>{})
await page.waitForTimeout(2500)
say('אחרי „לרשימת הפרקים": ' + page.url())
await page.screenshot({ path: `${OUT}/shots/outro-05-chapters.png`, fullPage: true })
say('שגיאות JS: ' + (errs.length ? [...new Set(errs)].slice(0,3).join(' | ') : '0'))
say('בקשות שנכשלו: ' + (failed.length ? [...new Set(failed)].slice(0,3).join(' | ') : '0'))
say('promises שנדחו: ' + (rej.length ? rej.slice(0,2).join(' | ') : '0'))
fs.writeFileSync(`${OUT}/logs/outro.log`, lines.join('\n')+'\n')
await browser.close()
