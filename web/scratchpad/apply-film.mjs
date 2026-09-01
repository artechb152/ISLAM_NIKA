import fs from 'fs'

// 1) שדה filmOnce בסכימה
{
  const p = 'src/lib/chapter1/dialogue.ts'
  let s = fs.readFileSync(p, 'utf8')
  if (!s.includes('filmOnce')) {
    s = s.replace(/(\n\s*film\?: string)/, `$1
  /** סרט אירוע חד-פעמי: מתנגן פעם אחת עם קול, לא בלולאה. לסרטי אווירה
      (הפתיח) משאירים לולאה שקטה — אירוע סיפורי שחוזר על עצמו נראה כתקלה. */
  filmOnce?: boolean`)
    fs.writeFileSync(p, s)
    console.log('dialogue.ts: filmOnce added')
  }
}

// 2) חיווט הסרט ל-birds-cinematic
{
  const p = 'src/lib/chapter1/dialogue.json'
  const d = JSON.parse(fs.readFileSync(p, 'utf8'))
  const mecca = d.regions.find((r) => r.id === 'mecca')
  const birds = mecca.encounters.find((e) => e.id === 'birds-cinematic')
  birds.film = 'abraha.mp4'
  birds.filmOnce = true
  fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n')
  console.log('dialogue.json: birds-cinematic wired to abraha.mp4')
}

// 3) נגן הווידאו מכבד filmOnce
{
  const p = 'src/components/chapter1/DialogueHud.tsx'
  let s = fs.readFileSync(p, 'utf8')
  const old = `<video className="hud-film" src={\`/assets/anim-video/\${encounter.film}\`}`
  if (!s.includes('filmOnce ?')) {
    s = s.replace(
      /<video\s+className="hud-film"[\s\S]*?\/>/,
      `<video
            key={encounter.id}
            className="hud-film"
            src={\`/assets/anim-video/\${encounter.film}\`}
            autoPlay
            muted={!encounter.filmOnce || isMuted()}
            loop={!encounter.filmOnce}
            playsInline
            aria-hidden="true"
          />`)
    if (!s.includes("from '@/lib/chapter1/audio'")) {
      s = s.replace(/(import[^\n]*\n)/, `$1import { isMuted } from '@/lib/chapter1/audio'\n`)
    }
    fs.writeFileSync(p, s)
    console.log('DialogueHud.tsx: filmOnce playback (sound on, no loop)')
  }
}
