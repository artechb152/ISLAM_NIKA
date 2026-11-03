import fs from 'node:fs'
let t = fs.readFileSync(process.argv[2], 'utf8')
t = t.replace(/\u202A([^\u202A\u202C]*)\u202C/g, (_, r) => r.split(/(\s+)/).reverse().join('')).replace(/[\u202A-\u202E\u200E\u200F\u2066-\u2069]/g, '')
process.stdout.write(t.split(/\r?\n/).map(s => s.trim()).filter(s => s && !/מוגבל|גירסת טיוטה/.test(s) && !/^\d+$/.test(s)).join('\n') + '\n')
