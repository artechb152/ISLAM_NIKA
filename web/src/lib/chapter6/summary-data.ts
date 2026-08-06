/* Content for the chapter-6 closing screen — „חמש מצוות היסוד“.

   ONE VERB, FIVE SPACES. Everything the learner does here is the same act: take a label and
   put it into a numbered empty slot on an illustrated surface. What changes between the five
   commandments is not the interaction but the SHAPE the slots make — a circle around the
   testimony, an arc over a day, a flow from a balance into vessels, a line of stages, pins on
   a map. The space is what carries the meaning; a second mechanic would only be a second thing
   to learn how to operate.

   WHAT THE NUMBER MEANS IS NOT THE SAME EVERYWHERE, so every exercise says which it is:
   in רמדאן and חג' the number IS the order and that order is the thing being tested, and the
   instruction says „סדרו“; everywhere else the number is only a position id, and the
   instruction says where to put the label instead.

   EVERY LABEL COMES FROM data.ts. Not „based on“ — a substring of the field it is quoted
   from, asserted by scripts/check-summary-sources.mjs, which is exactly the check that was
   missing when an earlier draft mutated „לעלות לרגל“ into „ולעלות לרגל“. `sources` on each
   exercise lists the screens its labels are checked against. Decoys are real phrases from
   elsewhere in the chapter, never invented ones: a wrong answer should still be something
   the reader has met.

   Leads, asks and hints are framing, and are written here. Facts, names and labels are not. */

export type PillarKey = 'shahada' | 'prayer' | 'charity' | 'ramadan' | 'hajj'

/* the surface a set of slots is arranged on. Five for the five commandments, plus the
   sentence used by the beats. */
export type Layout = 'row' | 'line' | 'map' | 'sentence'

export interface PillarDef {
  key: PillarKey
  /* actionDetails[i].commandment — the commandment as the source names it */
  name: string
  icon: string
  /* where in the chapter this commandment lives, for the end screen */
  anchor: string
}

export const PILLARS: PillarDef[] = [
  { key: 'shahada', name: 'השהאדה', icon: 'icon-shahada.png', anchor: '/chapter6#shahada' },
  { key: 'prayer', name: 'התפילה', icon: 'icon-prayer.png', anchor: '/chapter6#prayer' },
  { key: 'charity', name: 'הצדקה', icon: 'icon-charity.png', anchor: '/chapter6#charity' },
  { key: 'ramadan', name: 'צום רמדאן', icon: 'icon-ramadan.png', anchor: '/chapter6#ramadan' },
  { key: 'hajj', name: "החג'", icon: 'icon-hajj.png', anchor: '/chapter6#hajj' },
]

export const PILLAR_NAME: Record<PillarKey, string> = {
  shahada: 'השהאדה',
  prayer: 'התפילה',
  charity: 'הצדקה',
  ramadan: 'צום רמדאן',
  hajj: "החג'",
}

/* ONE LINE IN THE BANNER, and it says what this screen is rather than what the chapter is
   about. „חמש מצוות היסוד“ is the chapter's own h1, on the chapter's own banner, one click
   away — printing it again over the same photograph made the practice screen look like the
   chapter opening a second time. The eyebrow that used to sit above it („תרגול מסכם“) said
   this, in 14px, over the title that was not saying it. */
export const HERO = {
  title: 'תרגול מסכם',
}

/* ------------------------------------------------------------- the five exercises ---- */

export interface SlotDef {
  n: number
  /* the label that belongs in this slot */
  answer: string
  photo?: string
  /* text printed ON the slot, always visible: the thing the label is matched against */
  cue?: string
  /* map layout only — per cent of the surface, left and top */
  x?: number
  y?: number
  /* a slot that arrives filled and refuses every drop, with the reason printed on it */
  locked?: string
}

/* A multiple-choice question. Used both for the two closing questions and for the charity
   beat, which was always a single-choice question in the source (`ch-c`) and had been dressed
   up as a fill-the-gap sentence for no reason. */
export interface McqDef {
  id: string
  question: string
  /* true when the question itself is quoted from the source rather than written here, so the
     source check asserts the stem too. The OPTIONS are always checked either way — a wrong
     option that is not a real phrase from the chapter is an invented fact in disguise. */
  stemFromSource?: boolean
  options: string[]
  answer: string
  /* the source's own „ok“ — one line that teaches rather than congratulates */
  ok: string
  sources: string[]
}

export interface BeatDef {
  title: string
  ask: string
  /* when present the beat IS this question, and the sentence/bank are not rendered */
  mcq?: McqDef
  /* [1] and [2] mark the gaps */
  sentence: string
  slots: SlotDef[]
  bank: string[]
  hint: string
  /* shown only after the beat is answered */
  after?: { src: string; caption: string }[]
  arabic?: string
  sources: string[]
}

export interface ExerciseDef {
  key: PillarKey
  title: string
  ask: string
  /* true where the number is the ORDER and the order is the content under test */
  numbersAreOrder: boolean
  /* true where ANY label may go in ANY slot. `ch-1` lists „לעניים, נזקקים, יתומים, בתי תמחוי
     ועוד“ — that order is the sentence's, not the world's, and demanding it back tests nothing
     except which order a list happened to be written in. */
  anyOrder?: boolean
  layout: Layout
  /* map layout: the painting the pins sit on */
  surface?: string
  slots: SlotDef[]
  decoys: string[]
  hint: string
  done: string
  beat: BeatDef
  sources: string[]
}

/* 1 · השהאדה — ROW. Three situations, straight across. They were laid out AROUND the testimony
   itself, on the reasoning that they surround one sentence rather than following one another —
   which was true and unreadable: the three photographs landed at three different heights with
   a gold-framed quotation between them, and the whole thing read as a puzzle rather than as
   three things to name. A straight line says the same and asks nothing of the reader.
   Labels and decoys are sh-c's five options verbatim. */
const EX_SHAHADA: ExerciseDef = {
  key: 'shahada',
  title: 'מתי נאמרת השהאדה',
  ask: 'הניחו כל מצב מתחת לתמונה שלו.',
  numbersAreOrder: false,
  layout: 'row',
  slots: [
    { n: 1, answer: 'בקריאה לתפילה', photo: 'adhan-real.jpg', cue: 'המואזין על הצריח' },
    { n: 2, answer: 'במהלך התפילה', photo: 'mosque-hall-real.jpg', cue: 'אולם המסגד' },
    { n: 3, answer: 'בעת קבלת דת האסלאם', photo: 'shahada-conversion.jpg', cue: 'הצהרה בפני עדים' },
  ],
  decoys: ['בזמן שבירת צום רמדאן', 'במהלך העלייה לרגל'],
  hint: 'שניים מן המצבים קורים סביב התפילה עצמה, והשלישי הוא הרגע שבו אדם מצטרף לאסלאם.',
  done: 'נכון. השהאדה נאמרת בקריאה לתפילה, במהלך התפילה ובעת קבלת דת האסלאם.',
  sources: ['sh-c', 'sh-3', '01'],
  beat: {
    title: 'ההצטרפות לאסלאם',
    ask: 'השלימו את שתי המשבצות במשפט.',
    sentence: 'כאשר אדם מבקש לקבל על עצמו את דת האסלאם, יאמר את השהאדה [1] בפני [2].',
    slots: [
      { n: 1, answer: 'שלוש פעמים' },
      { n: 2, answer: 'שני עדים כשרים' },
    ],
    bank: ['שלוש פעמים', 'שני עדים כשרים', 'שבע פעמים', 'המואזין'],
    hint: 'אחת המשבצות היא כמות, והשנייה היא מי שנוכח.',
    sources: ['sh-3', 'hj-3'],
  },
}

/* 2 · התפילה — ROW. The time signs are printed on the slots and the prayer names are placed
   onto them; pr-2 gives both halves, transliteration included.
   The five scenes used to hang at five different heights, tracing the sun over a day. It was
   a nice idea and it read as a misalignment: five photographs at five heights, and beneath
   them five empty rules at five more, because the time signs run to different line counts. */
const EX_PRAYER: ExerciseDef = {
  key: 'prayer',
  title: 'מחזור היום ותפילותיו',
  ask: 'הניחו כל תפילה על סימן הזמן שלה.',
  numbersAreOrder: false,
  layout: 'row',
  slots: [
    { n: 1, answer: "תפילת השחר (צלאה אלפג'ר)", cue: 'בעלות השחר', photo: 'prayer-day-1.jpg' },
    { n: 2, answer: "תפילת הצהריים (צלאה אלט'הר)", cue: 'בחצות היום', photo: 'prayer-day-2.jpg' },
    {
      n: 3,
      answer: 'תפילת אחר הצהריים (צלאה אלעצר)',
      cue: 'כשצלו של חפץ והחפץ עצמו באותו הגודל',
      photo: 'prayer-day-3.jpg',
    },
    { n: 4, answer: "תפילת הערב (צלאה אלמע'רב)", cue: 'בשקיעת השמש', photo: 'prayer-day-4.jpg' },
    { n: 5, answer: "תפילת הלילה (צלאה אלעשאא')", cue: 'בצאת הכוכבים ועד הבוקר', photo: 'prayer-day-5.jpg' },
  ],
  decoys: [],
  hint: 'סימני הזמן עצמם מסודרים לפי היום: מן האור הראשון, דרך חצות והצל, אל השקיעה והכוכבים.',
  done: 'נכון. חמש התפילות פרושות על היום כולו: מעלות השחר, דרך חצות היום והצל המתארך, אל השקיעה וצאת הכוכבים.',
  sources: ['pr-2', 'pr-c'],
  /* This beat used to be the qibla map — drag „ירושלים“ and „מכה“ onto two pins, with מדינה
     already labelled between them. It taught nothing: the map answers it. Jerusalem is the
     northern one and Mecca the southern one whether or not you have read the chapter.
     In its place, `pr-3`, which no exercise touches: what has to happen before a prayer, and
     what has to be true during it — including the part that makes it count for nothing. */
  beat: {
    title: 'היטהרות וכוונה',
    ask: 'השלימו את שתי המשבצות במשפט.',
    /* THE HEBREW IS THE ANSWER, the Arabic stays in its brackets. The gaps used to take the
       transliterations — „וד'וא“, „נייה“ — while the words they name, „להיטהר“ and „בכוונה“,
       sat in the sentence right beside them. That tests transliteration, not the chapter. */
    sentence:
      "לפני התפילה נדרש המוסלמי [1] (וד'וא), ובתפילה עצמה עליו להתפלל [2] (נייה) — ובלעדיה היא תיחשב לו כמעשה רע שעשה.",
    slots: [
      { n: 1, answer: 'להיטהר' },
      { n: 2, answer: 'בכוונה' },
    ],
    bank: ['להיטהר', 'בכוונה', 'להסתפר', 'בציבור'],
    hint: 'משבצת אחת היא פעולה שקודמת לתפילה, והשנייה היא מה שחייב להיות בלב בזמנה.',
    after: [
      {
        src: 'prayer-wudu-real.jpg',
        caption: 'שטיפת הידיים, הפנים, שיער הראש והזקן.',
      },
    ],
    sources: ['pr-3', 'pr-4', 'hj-2'],
  },
}

/* 3 · הצדקה — FLOW. Downward, because the meaning is a movement of something from one hand
   to another. The fifth vessel is LOCKED and says so: ch-1 ends „…בתי תמחוי ועוד“, and four
   slots would close a list the source leaves open. */
const EX_CHARITY: ExerciseDef = {
  key: 'charity',
  /* „2.5% מן המאזן“ was the  screen's title, and with the eyebrow gone it was the one
     heading on the page that never named its commandment. */
  title: 'הצדקה',
  ask: 'למי מיועדת הצדקה? הניחו ארבעה מקבלים, בכל סדר שתרצו.',
  numbersAreOrder: false,
  anyOrder: true,
  layout: 'row',
  slots: [
    { n: 1, answer: 'עניים' },
    { n: 2, answer: 'נזקקים' },
    { n: 3, answer: 'יתומים' },
    { n: 4, answer: 'בתי תמחוי' },
    { n: 5, answer: '', locked: 'ועוד — ולא רק אלה' },
  ],
  /* MISTAKEABLE, not absurd. The decoys used to be „הקפת הכעבה“, „תפילות התראויח“ and
     „דרשה (ח'טבה)“ — rituals, not recipients. Nobody gives charity to a prayer, so they ruled
     themselves out without the reader knowing anything. These two are people from the chapter
     who could plausibly receive it and are not on ch-1's list. */
  decoys: ['המואזין', 'האמאם של המסגד'],
  hint: 'שני המסיחים הם בעלי תפקיד במסגד, ולא מי שהצדקה מיועדת לו.',
  done: 'הצדקה מיועדת בין היתר לעניים, לנזקקים, ליתומים ולבתי תמחוי.',
  sources: ['ch-1', 'ch-c', 'sh-3', 'pr-4'],
  /* NOT ARITHMETIC. This beat used to be `ch-c` — „המאזן השנתי של אדם הוא 10,000 שקלים, כמה
     עליו לתת?“ — which is the one question in the chapter that tests a skill the chapter does
     not teach. Everything else on this page asks the reader to remember something they read.
     In its place, the material of `ch-2`, which nothing else touches: what the Qur'an promises
     the giver, and the fact that this charity is obligatory while the one at עיד אלפטר is not. */
  beat: {
    title: 'השכר והחובה',
    ask: 'השלימו את שתי המשבצות במשפט.',
    sentence:
      'הקוראן מבטיח שנותן הצדקה יקבל שכר [1], ומצוות צדקה זו היא [2] — בשונה מן הצדקה שנותנים בעיד אלפטר ובמועדים נוספים.',
    slots: [
      { n: 1, answer: 'בכפליים' },
      { n: 2, answer: 'חובה' },
    ],
    bank: ['בכפליים', 'חובה', 'עין יפה', 'צדקה נוספת'],
    hint: 'משבצת אחת היא גודל השכר, והשנייה היא מעמדה של המצווה.',
    sources: ['ch-2', 'ch-1', 'rm-6'],
  },
}

/* 4 · צום רמדאן — LINE. A required sequence, so a line with a connector and arrows, and here
   the number IS the order. Labels are rm-c.steps verbatim. */
const EX_RAMADAN: ExerciseDef = {
  key: 'ramadan',
  title: 'מעלות השחר עד התראויח',
  ask: 'סדרו את שלבי יום הצום לפי הסדר.',
  numbersAreOrder: true,
  layout: 'line',
  slots: [
    { n: 1, answer: 'עלות השחר', photo: 'ramadan-fast-dawn.jpg' },
    { n: 2, answer: 'הימנעות מאכילה, משתייה ומעישון', photo: 'ramadan-fast-noon.jpg' },
    { n: 3, answer: 'שקיעת החמה', photo: 'ramadan-fast-sunset.jpg' },
    { n: 4, answer: 'אפטאר', photo: 'iftar-real.jpg' },
    { n: 5, answer: 'תפילות תראויח', photo: 'ramadan-fast-night.jpg' },
  ],
  decoys: [],
  hint: 'היום מתחיל באור הראשון ונשבר עם השקיעה. כל מה שבא אחרי השקיעה שייך כבר ללילה.',
  done: 'נכון. הצום מתחיל בעלות השחר, נמשך לאורך היום, נשבר בשקיעה באפטאר, ולאחריו תפילות התראויח.',
  sources: ['rm-c', 'rm-4'],
  beat: {
    title: 'ראיית הירח',
    ask: 'השלימו את שתי המשבצות במשפט.',
    sentence:
      'האסכולה הסעודית קובעת את תחילת החודש וסופו על פי [1], והאסכולה המצרית קובעת אותם לפי [2].',
    slots: [
      { n: 1, answer: 'ראיית המולד בטלסקופ' },
      { n: 2, answer: 'חישובים אסטרונומיים' },
    ],
    bank: ['ראיית המולד בטלסקופ', 'חישובים אסטרונומיים'],
    hint: 'אסכולה אחת מסתכלת בירח עצמו, והשנייה מחשבת מתי הוא אמור להיראות.',
    /* the two scenes arrive as the reward, not before it — put on screen beforehand they
       would answer the question instead of illustrating it */
    after: [
      { src: 'moon-telescope-scene.jpg', caption: 'האסכולה הסעודית · ראיית המולד בטלסקופ' },
      { src: 'moon-calculation-scene.jpg', caption: 'האסכולה המצרית · חישובים אסטרונומיים' },
    ],
    sources: ['rm-7'],
  },
}

/* 5 · החג' — MAP. Seven empty numbered pins on the painting, because the journey is a place
   and not only an order. The seven coordinates were measured off the painting itself (the
   Kaaba's black block sits at 76.6% / 72.1%, the mountain at 28.5% / 21.5%, the tent city at
   45.2% / 63%) — every pin lands on something that is drawn there. */
const EX_HAJJ: ExerciseDef = {
  key: 'hajj',
  title: "מפת מסע החג'",
  ask: 'סדרו את התחנות לפי סדר המסע.',
  numbersAreOrder: true,
  layout: 'map',
  surface: 'hajj-route-map.jpg',
  /* THE CHAPTER'S OWN MAP, pin for pin. The coordinates are copied from HajjRouteMap's `stops`
     in Chapter6.tsx — same painting, same physical `left`/`top` per cent, same -50%/-50%
     translate — so every station lands on the spot the reader already met it on.

     SIX, not seven. `hj-c.steps` lists מוזדליפה and מינא separately and they were two pins for
     a while, stacked eight per cent apart on the same tent field and reading as one blot. The
     article merges them, and so does `hj-6`, whose title is exactly „מוזדליפה ומינא“ — so the
     merged label is still a quotation and the map is now identical to the chapter's. */
  slots: [
    { n: 1, answer: 'אחראם', x: 80, y: 19, photo: 'ihram-real.jpg', cue: 'המיקאת' },
    { n: 2, answer: 'טוואף', x: 80, y: 74, photo: 'tawaf-real.jpg', cue: 'מכה' },
    { n: 3, answer: 'סעי', x: 84, y: 80, photo: 'hajj-sai.jpg', cue: 'צפא ומרוה' },
    { n: 4, answer: 'ערפה', x: 22, y: 24, photo: 'arafat-real.jpg', cue: 'הר ערפה' },
    { n: 5, answer: 'מוזדליפה ומינא', x: 44, y: 60, photo: 'hajj-muzdalifah.jpg', cue: 'רגימת השטן' },
    { n: 6, answer: 'חזרה למכה', x: 70, y: 86, photo: 'kaaba-real.jpg', cue: 'חג הקורבן' },
  ],
  decoys: [],
  hint: 'היעזרו במפת המסע: ההיטהרות קודמת לכניסה למכה, והרגימה במינא באה אחרי העצירה במוזדליפה.',
  done: 'נכון. זהו סדר התחנות: אחראם, טוואף, סעי, ערפה, מוזדליפה, מינא וחזרה למכה.',
  sources: ['hj-c', 'hj-2', 'hj-4', 'hj-5', 'hj-6', 'hj-7'],
  beat: {
    title: 'מי עולה לרגל, ומתי',
    ask: 'השלימו את שתי המשבצות במשפט.',
    sentence:
      'העלייה לרגל אינה חובה כמו שאר מצוות היסוד, אלא תלויה [1], והמוסלמי נדרש להתאמץ לשם כך עד גבול מסוים, [2].',
    slots: [
      { n: 1, answer: 'ביכולתו של האדם, הן בהיבט הכלכלי והן בהיבט הבריאותי' },
      { n: 2, answer: 'פעם אחת במהלך חייו' },
    ],
    bank: [
      'ביכולתו של האדם, הן בהיבט הכלכלי והן בהיבט הבריאותי',
      'פעם אחת במהלך חייו',
      "ביום ה־8 לחודש ד'ו אלחג'ה",
      'שבע פעמים',
    ],
    arabic: 'حج مبرور وسعي مشكور وذنب مغفور',
    hint: 'משבצת אחת אומרת במה זה תלוי, והשנייה כמה פעמים.',
    after: [{ src: 'kaaba-real.jpg', caption: '"חג\' מקובל, טקס הריצה מבורך והחטא נמחל."' }],
    sources: ['hj-1', 'hj-7', 'hj-3'],
  },
}

export const EXERCISES: ExerciseDef[] = [EX_SHAHADA, EX_PRAYER, EX_CHARITY, EX_RAMADAN, EX_HAJJ]

/* ------------------------------------------------------------ the two questions ----

   The chapter's transition screens used to be rendered between the sections („סיימנו את
   השהאדה… כעת נעבור למצוות התפילה“). They were the chapter's own words and they were correct,
   but with every section on screen at once they described a journey through a page that no
   longer moves — six paragraphs of narration between the reader and the work.

   These two questions take that space. Both are single facts the exercises never touch, and
   every option — the right one and the wrong ones — is a phrase quoted from data.ts, so a
   wrong answer is still something the reader has met somewhere in the chapter. */
export const QUIZ: McqDef[] = [
  {
    id: 'q-1',
    question: 'עם סיום חודש רמדאן ותחילת חודש שוואל מתחיל —',
    options: ['חג שבירת הצום (עיד אלפטר)', 'חג הקורבן (עיד אלאדחא)', 'ליל אלקדר'],
    answer: 'חג שבירת הצום (עיד אלפטר)',
    ok: 'נכון. חג הקורבן (עיד אלאדחא) הוא של החג\', וליל אלקדר הוא הלילה ה־27 של רמדאן עצמו.',
    sources: ['rm-6', 'rm-3', 'hj-7'],
  },
  {
    id: 'q-2',
    question: 'מתי, לפי המסורת, ירד הקוראן?',
    options: ['בלילה ה־27 לחודש', "ביום ה־8 לחודש ד'ו אלחג'ה", "ביום השישי (יום אלג'מעה)"],
    answer: 'בלילה ה־27 לחודש',
    ok: 'נכון. זהו „ליל אלקדר“. שתי האפשרויות האחרות שייכות לעלייה לרגל ולתפילת יום השישי.',
    sources: ['rm-3', 'hj-1', 'pr-4'],
  },
]

export const QUIZ_BLOCK = {
  title: 'שתי שאלות',
  /* the section's lead, in the place the article puts one: under the title and the ornament */
  ask: 'בחרו תשובה אחת בכל שאלה.',
}

/* ---------------------------------------------------------------- the closing ---- */

export const CLOSING = {
  /* SPLIT, not rewritten: „דבר אחרון“ is the heading and the question is the lead beneath it —
     the article's own eyebrow/title/lead anatomy. As one string it was a 56px sentence where
     every other section has a two-word title. Not a word changed. */
  title: 'דבר אחרון',
  ask: 'אחת מחמש המצוות איננה חובה גמורה. איזו?',
  answer: 'hajj' as PillarKey,
  /* the reward is the source's own clause, not a verdict — actionDetails[4].quote */
  ok: 'לעלות לרגל פעם בחיים, אם ביכולתך.',
  okNote:
    'בראשית תקופת האסלאם היה קושי גדול להתנייד לחצי האי ערב, והדבר היה כרוך בהליכה ימים רבים במדבריות תוך סכנה גדולה משודדים, חיות רעות, חום המדבר ועוד.',
  miss: 'זו כן חובה גמורה. חפשו את זו שתלויה בנסיבותיו של האדם.',
}

/* ------------------------------------------------------------------ the end ---- */

export const END = {
  title: 'סוף פרק שישי',
  lead: 'חמש המצוות מלאות. לחיצה על מצווה מחזירה אל הנושא שלה בפרק.',
  /* one short memory line per commandment — summarising the topic, never replacing it.
     From sh-2/sh-3 · pr-2/pr-3/pr-5 · ch-1 · rm-4/rm-7 · hj-1 */
  memory: {
    shahada: 'אין אל מבלעדי אללה ושמוחמד הוא שליחו — בפני שני עדים כשרים.',
    prayer: 'חמש תפילות ביום, בטהרה ובכוונה, לעבר מכה.',
    charity: '2.5% מן המאזן השנתי — לעניים, לנזקקים, ליתומים ולבתי תמחוי.',
    ramadan: 'מעלות השחר ועד השקיעה, חודש שנפתח ונסגר בראיית הירח.',
    hajj: 'פעם אחת בחיים, אם ביכולתו של האדם.',
  } as Record<PillarKey, string>,
  /* the one place the five VERBS come back — as the chapter's own sentence, drawerContent[2],
     read rather than operated */
  quoteLead: 'וזו הייתה תשובתו של מוחמד לשאלה „מהו האסלאם?“',
  quote:
    'האסלאם הוא שעליך להאמין שאין אל מבלעדי אללה, שמוחמד הוא שליחו, עליך להתפלל חמש תפילות ביום, לתת צדקה, לצום את צום הרמדאן ולעלות לרגל פעם בחיים אם ביכולתך.',
  finish: 'סיום הפרק',
  back: 'לחזרה לכל הפרקים',
  again: 'לחזרה על התרגול',
  againNote: 'הפרק מסומן כהושלם. חזרה על התרגול מאפסת את התרגול בלבד.',
  revisit: 'לחזרה ממוקדת:',
}

/* ---------------------------------------------------------------- the tray ---- */

/* A stable order for the label tray. It must not be the slot order — the answers would line
   up with the slots and the exercise would answer itself — and it must not be random, because
   a random order on the server and another on the client is a hydration mismatch. So: sorted
   by a hash of the text. Same order every time, unrelated to the order the answers belong in. */
function hash(s: string): number {
  let n = 2166136261
  for (let i = 0; i < s.length; i++) {
    n ^= s.charCodeAt(i)
    n = Math.imul(n, 16777619)
  }
  return n >>> 0
}

export function trayOrder(items: string[]): string[] {
  return [...items].sort((a, b) => hash(a) - hash(b))
}

export const exerciseBank = (ex: ExerciseDef): string[] =>
  trayOrder([...ex.slots.filter((s) => !s.locked).map((s) => s.answer), ...ex.decoys])

export const beatBank = (beat: BeatDef): string[] => trayOrder(beat.bank)

/* --------------------------------------------------------------------- copy ---- */

export const FEEDBACK = {
  /* „wrong“ and „not finished yet“ must never be confusable: different symbol, different
     colour, different sentence shape. */
  remainingWord: ['', 'משבצת אחת', 'שתי משבצות', 'שלוש משבצות', 'ארבע משבצות', 'חמש משבצות', 'שש משבצות', 'שבע משבצות'],
  remaining: (n: number): string => {
    const w = FEEDBACK.remainingWord[n] ?? `${n} משבצות`
    return n === 1 ? `נותרה ${w}.` : `נותרו ${w}.`
  },
  placed: (label: string, left: number): string =>
    `«${label}» במקומה.` + (left === 0 ? '' : ' ' + FEEDBACK.remaining(left)),
  wrong: 'לא כאן. נסו שוב.',
  wrongAgain: 'לא כאן. הנה רמז.',
  mcqWrong: 'לא זו. נסו שוב.',
  lockedSlot: 'המשבצת הזו כבר מלאה, ולא בכוונה: המקור משאיר את הרשימה פתוחה.',
  hintLabel: 'רמז',
  held: 'ביד — בחרו משבצת',
  trayLabel: 'תוויות',
  empty: 'ריק',
  degree: ['טרם התחלתם', 'התרגיל הושלם', 'המצווה מלאה'],
}
