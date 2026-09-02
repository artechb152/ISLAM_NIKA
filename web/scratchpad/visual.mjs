import fs from 'node:fs'
const p = 'src/styles/chapter4-article.css'
let s = fs.readFileSync(p, 'utf8')
const swap = (from, to) => {
  if (!s.includes(from)) throw new Error('לא נמצא: ' + from.slice(0, 50))
  s = s.replace(from, to)
}

/* יחס העמודות — התמונה נושאת יותר רוחב מהטקסט, כמו במוקאפ */
swap(
  `.ch4-stage-grid{
  display:grid;
  grid-template-columns:1fr 1fr;`,
  `.ch4-stage-grid{
  display:grid;
  /* the plate carries the larger share and the column of type stays narrow
     enough to read — an even split made the sentence run six lines wide */
  grid-template-columns:minmax(0,1fr) minmax(0,1.18fr);`,
)

/* המשפט הראשי קטן יותר, כדי שייפול על ארבע שורות ולא שש */
swap(
  `.ch4-stage-lead{
  margin:0;
  font-family:var(--font-heading);
  font-size:clamp(20px,2.3vw,31px);`,
  `.ch4-stage-lead{
  margin:0;
  font-family:var(--font-heading);
  font-size:clamp(18px,1.85vw,25px);`,
)

/* המפריד קצר וממורכז ולא קו לכל רוחב העמודה */
swap(
  `.ch4-stage-orn{
  display:flex;align-items:center;gap:14px;
  margin-block:clamp(16px,2.4vh,26px);
  color:var(--gold-text);
}`,
  `.ch4-stage-orn{
  display:flex;align-items:center;justify-content:center;gap:14px;
  /* short and centred. A rule running the full column read as a divider
     between two sections instead of a breath inside one. */
  width:min(320px,80%);
  margin-block:clamp(16px,2.4vh,26px);
  color:var(--gold-text);
}`,
)

/* הצ'יפים אווריריים ובהירים יותר */
swap(
  `.ch4-stage-chips li{
  padding:7px 14px;
  border:1px solid var(--rule);
  border-radius:999px;
  background:var(--mat);
  font-size:clamp(12px,1.2vw,14px);
  color:var(--ink);
}`,
  `.ch4-stage-chips li{
  padding:9px 18px;
  border:1px solid var(--gold-soft);
  border-radius:999px;
  background:var(--mat);
  font-size:clamp(12px,1.15vw,13px);
  letter-spacing:.01em;
  color:var(--ink);
}`,
)

fs.writeFileSync(p, s)
console.log('visual only — four rules changed, no content touched')
