/* Tiny static server for the Rawi POC viewer — GLB fetch is CORS-blocked from
   file://, so run:  node serve.mjs  and open the printed URL. */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  let p = decodeURIComponent(url.pathname)
  if (p === '/') p = '/index.html'
  const file = normalize(join(root, p))
  if (!file.startsWith(root)) { res.writeHead(403); return res.end() }
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' })
    res.end(data)
  } catch {
    // fall back to sibling folders (voice-test, chars) for shared assets
    try {
      const alt = normalize(join(root, '..', p))
      const data = await readFile(alt)
      res.writeHead(200, { 'Content-Type': mime[extname(alt)] ?? 'application/octet-stream' })
      res.end(data)
    } catch {
      res.writeHead(404); res.end('not found: ' + p)
    }
  }
})

server.listen(8137, () => console.log('Rawi POC ▶ http://localhost:8137'))
