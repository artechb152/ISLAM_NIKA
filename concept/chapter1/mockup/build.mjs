/* screens.html = body.html with the embedded fonts + image data-URIs injected
   right after the opening <style>, so the published page is self-contained. */
import fs from 'node:fs'

const body = fs.readFileSync('body.html', 'utf8')
const embed = fs.readFileSync('fonts.css', 'utf8') + fs.readFileSync('images.css', 'utf8')

if (!body.includes('<style>')) throw new Error('body.html has no <style> to inject into')
const out = body.replace('<style>', '<style>\n' + embed + '\n')

fs.writeFileSync('screens.html', out, 'utf8')
console.log('screens.html written:', (out.length / 1024 / 1024).toFixed(2), 'MB')
