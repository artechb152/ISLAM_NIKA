import fs from 'fs'
const p = 'scripts/check-journey.mjs'
let s = fs.readFileSync(p, 'utf8')
s = s.replace(`    } else if (trig !== 'arrive') {
      problems.push(\`\${region.id}: "\${e.id}" has an unknown trigger '\${trig}'.\`)
    }`,
`    } else if (trig.startsWith('task:')) {
      /* beat שנפתח עם פתרון תחנה: המשימה חייבת להתקיים ולשבת באותו אזור,
         אחרת ה-beat לא יתנגן לעולם. */
      const needs = trig.slice(5)
      const taskRe = new RegExp(\`id: '\${needs}',[\\s\\S]{0,120}?region: '\${region.id}'\`)
      if (!taskRe.test(tasksSrc)) {
        problems.push(
          \`\${region.id}: "\${e.id}" waits for task "\${needs}", which is not a task of this region — it can never fire.\`,
        )
      }
    } else if (trig !== 'arrive') {
      problems.push(\`\${region.id}: "\${e.id}" has an unknown trigger '\${trig}'.\`)
    }`)
fs.writeFileSync(p, s)
console.log(s.includes("task:'") || s.includes("startsWith('task:')") ? 'patched' : 'MISS')
