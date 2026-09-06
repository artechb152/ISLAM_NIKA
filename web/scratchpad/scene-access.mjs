import { open } from './lib-probe.mjs'
const { browser, page } = await open('monastery', { w: 900, h: 600 })
console.log(JSON.stringify(await page.evaluate(() => {
  const c = document.querySelector('canvas')
  const keys = Object.keys(c || {}).filter(k => k.startsWith('__'))
  let store = null
  try { store = c.__r3f?.root?.getState ? 'root.getState()' : (c.__r3f ? Object.keys(c.__r3f).join(',') : null) } catch (e) { store = 'ERR ' + e.message }
  let sceneChildren = null
  try { sceneChildren = c.__r3f.root.getState().scene.children.length } catch { /* noop */ }
  return { canvasKeys: keys, store, sceneChildren, liveKeys: Object.keys(window.__ch1Live) }
}), null, 1))
await browser.close()
