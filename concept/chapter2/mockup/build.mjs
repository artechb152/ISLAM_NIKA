/* Compose the chapter-2 mockup: body.html with the site's own fonts inlined as
   data URIs, so the published page is self-contained (an artifact may not fetch
   anything). The font file is the one chapter 1's mockup already carries —
   Kedem + Ploni, the site's real faces.
   Run: node concept/chapter2/mockup/build.mjs */
import { readFile, writeFile } from 'node:fs/promises'

const here = new URL('.', import.meta.url)
const fonts = await readFile(new URL('../../chapter1/mockup/fonts.css', here), 'utf8')
const body = await readFile(new URL('body.html', here), 'utf8')

if (!body.includes('/*FONTS*/')) throw new Error('body.html lost its /*FONTS*/ slot')
const out = body.replace('/*FONTS*/', fonts)

await writeFile(new URL('screens.html', here), out, 'utf8')
console.log(`✅ screens.html — ${(out.length / 1024).toFixed(0)}KB (fonts ${(fonts.length / 1024).toFixed(0)}KB)`)
