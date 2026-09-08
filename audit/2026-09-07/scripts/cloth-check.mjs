/* היריעה מתחת לראיה: קיימת? באיזה גובה מול הקרקע? נראית מהמצלמה? */
import { bind } from './lib-walk.mjs'
const { chromium } = await import('/Users/nikagreenbaum/ISLAM_NIKA/web/node_modules/playwright-core/index.mjs')
const browser = await chromium.launch({ channel:'chrome', headless:true,
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--enable-webgl'] })
const page = await browser.newPage({ viewport:{width:1440,height:820} })
const K = bind(page)
await K.start('yathrib')
const w = await K.W()
console.log('ראיות באזור:', JSON.stringify(w.finds.map(f=>({id:f.id,x:f.x,z:f.z}))))
const info = await page.evaluate((finds)=>{
  const sc=window.__ch1Scene; sc.updateMatrixWorld(true); const V=sc.position.constructor
  const out=[]
  sc.traverse(o=>{ if(!o.isMesh||!o.geometry) return
    const g=o.geometry; if(g.type!=='CircleGeometry') return
    const p=o.getWorldPosition(new V())
    for (const f of finds) if (Math.hypot(p.x-f.x,p.z-f.z)<0.3) {
      const m=o.material
      out.push({ near:f.id, y:+p.y.toFixed(3), r:g.parameters?.radius, color:m.color?'#'+m.color.getHexString():'?',
        type:m.type, opacity:m.opacity, transparent:m.transparent, visible:o.visible, parentVisible:o.parent?.visible, renderOrder:o.renderOrder })
    } })
  return out
}, w.finds)
console.log('עיגולים ליד הראיות:', JSON.stringify(info, null, 1))
/* גובה הקרקע האמיתי שם: קרן מלמעלה על הטרה */
const ground = await page.evaluate((finds)=>{
  const sc=window.__ch1Scene; const V=sc.position.constructor
  const out=[]
  for (const f of finds) {
    let best=null
    sc.traverse(o=>{ if(!o.isMesh) return; const n=(o.name||'')+(o.parent?.name||'')
      if(!/terrain|ground|sand|floor/i.test(n) && o.geometry?.type!=='PlaneGeometry') return
      const b=new (window.__ch1Scene.constructor.prototype.constructor===Object?Object:Object)()
    })
    const p = window.__ch1Scene.getObjectByName('prop:'+f.model+'.glb')
    out.push({ id:f.id, propY: p ? +p.getWorldPosition(new V()).y.toFixed(3) : null })
  }
  return out
}, w.finds)
console.log('גובה הראיות עצמן:', JSON.stringify(ground))
await browser.close()
