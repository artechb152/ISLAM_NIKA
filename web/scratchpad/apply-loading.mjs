import fs from 'fs'

// 1) המשימה: "רעיונות" יוצא מהארגז
{
  const p = 'src/lib/chapter1/tasks.ts'
  let s = fs.readFileSync(p, 'utf8')
  const ideasBlock = /\s*\{\s*\n\s*id: 'ideas',[\s\S]*?\n\s*\},/
  if (!ideasBlock.test(s)) { console.error('ideas block not found'); process.exit(1) }
  s = s.replace(ideasBlock, '')
  s = s.replace(
    `      'הארגז הזה עולה על הגמל בעוד רגע. שלושה דברים כבר בפנים. תגיד לי מה עוד ' +
      'עבר בדרך הזו — ותשים לב מה לא ייכנס.',`,
    `      'הארגז הזה עולה על הגמל בעוד רגע. שלושה דברים כבר בפנים. תגיד לי מה עוד עבר בדרך הזו.',`)
  fs.writeFileSync(p, s)
  console.log('tasks.ts: ideas option removed from the crate')
}

// 2) beat של ראווי אחרי סגירת הארגז
{
  const p = 'src/lib/chapter1/dialogue.json'
  const d = JSON.parse(fs.readFileSync(p, 'utf8'))
  const road = d.regions.find((r) => r.id === 'loading-road')
  if (!road.encounters.some((e) => e.id === 'ideas-afterload')) {
    road.encounters.push({
      id: 'ideas-afterload',
      speaker: 'rawi',
      notebook: 0,
      trigger: 'task:task-loading',
      gesture: 'talk-nod',
      lines: [
        {
          source: '§9',
          text: 'הארגז נסגר — ושים לב מה לא נכנס אליו ובכל זאת עבר בדרך הזו: רעיונות. מושגים מונותאיסטיים חלחלו לחג׳אז מהיהדות ומהנצרות, בתהליך איטי ומדורג.',
        },
        {
          source: '§9',
          text: 'הם לא נסעו עם המטען. הם נסעו עם האנשים — בשיחות ליד המדורה, בסיפורים שנוסעים מביאים איתם.',
        },
      ],
    })
    fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n')
    console.log('dialogue.json: ideas-afterload beat added')
  }
}
