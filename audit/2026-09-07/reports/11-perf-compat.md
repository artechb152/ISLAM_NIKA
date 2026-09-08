# 11 — ביצועים ותאימות דפדפנים (פרק 1)

ביקורת סטטית בלבד. לא הורצו `next build`, שרת או דפדפן; לא שונה אף קובץ.
תאריך: 2026-09-07 · שורש הפרויקט: `/Users/nikagreenbaum/ISLAM_NIKA/web`

---

## 1. שיטה

| מה נבדק | איך |
|---|---|
| קובצי MP4 | סקריפט Node שפירק את מבנה ה-boxes (ftyp/moov/mdat/trak/tkhd/mvhd/stsd) — ffprobe אינו מותקן. `faststart` = moov לפני mdat. |
| קובצי GLB | סקריפט Node שקרא את כותרת ה-GLB (magic/version/length) ואת צ'אנק ה-JSON: meshes/primitives/accessors/materials/textures/images/animations/skins/extensions, ספירת קודקודים ומשולשים מ-accessors, ומידות תמונה מכותרות PNG/JPEG בתוך ה-BIN. MD5 לזיהוי כפילויות. |
| משקל לפי אזור | איחוד של: רשימת ה-preload הקבועה ב-`Game.tsx:768`, כל `model` ב-`*-layout.json` (כולל terrain), ה-cast מ-`placements.ts`, ה-extras בכל layout, הממצאים ב-`finds.ts` והמשימות ב-`tasks.ts`, ועוד sky/ground/map/fire-atlas מ-`tex/`. |
| basePath | קריאת `next.config.ts` ו-`scripts/fix-basepath.mjs`; grep של כל צורות ההפניה ל-`/assets/` ב-`src/` ו-`public/`; סריקה של ה-export הישן שב-`out/` (מ-08:07 היום) לשאריות לא-מקודמות. |
| קוד חם | סקריפט שחילץ את גוף כל `useFrame` (התאמת סוגריים) וספר בתוכו `new THREE.*`, `.clone()`, קריאות `set*`, `getBoundingClientRect`, כתיבות style; grep ל-`<Canvas>`, `dpr`, צללים, `<Html>`, מאזיני `pointermove`. |
| גרסאות | `package.json` + `node_modules/*/package.json` בפועל + סריקת pre-release ב-`package-lock.json`. |

---

## 2. וידאו — `public/assets/anim-video/`

| קובץ | גודל | ftyp | סדר boxes | faststart | וידאו | שמע | רזולוציה | אורך | קצב סיביות | מופנה מ- |
|---|---|---|---|---|---|---|---|---|---|---|
| **abraha.mp4** | 13.72 MB | isom (isom,iso2,mp41) | ftyp,uuid,free,mdat,**moov** | **לא** (moov ב-13,695,788) | **hvc1 (HEVC/H.265)** | mp4a 2ch 32 kHz | 1920×1080 | 24.06 s | ≈4.6 Mbps | `dialogue.json:636` → `DialogueHud.tsx:58` (`filmOnce:true`) |
| **opening.mp4** | 5.57 MB | isom (isom,iso2,mp41) | ftyp,uuid,free,mdat,**moov** | **לא** | **hvc1 (HEVC/H.265)** | mp4a 2ch 32 kHz | 1920×1080 | 15.07 s | ≈3.0 Mbps | `dialogue.json:21` → `DialogueHud.tsx:58` (`filmOnce:true`) |
| ch1-summary.mp4 | 15.47 MB | isom (isom,iso2,avc1,mp41) | ftyp,**moov**,free,mdat | כן (moov ב-32) | avc1 High@L4.0 (H.264) | mp4a 2ch 48 kHz | 1280×720 | 89.0 s | ≈1.4 Mbps | `ChapterOutro.tsx:54`, `Game.tsx:5202` (ChapterFilm) |
| scene2.mp4 | 4.15 MB | isom (avc1) | ftyp,uuid,free,mdat,moov | לא | avc1 High@L4.0 | mp4a 44.1 kHz | 1920×1080 | 5.06 s | ≈6.6 Mbps | **לא מופנה משום מקום ב-`src/`** |

קבצים נלווים:
- `ch1-summary.he.vtt` (3.6 KB, WEBVTT תקין, כותרת NOTE בעברית) — `<track kind="subtitles" srcLang="he" default>` ב-`ChapterOutro.tsx:62` ו-`Game.tsx:5210`.
- פוסטרים: `opening-poster.jpg` 1280×720 105 KB, `abraha-poster.jpg` 1280×720 57 KB (נגזרים ב-`DialogueHud.tsx:37` לפי המוסכמה `<file>-poster.jpg` — שניהם קיימים), `ch1-summary-poster.jpg` 1280×720 93 KB. `scene2-poster.jpg` ו-`poster1.jpg` (1920×1080) — לא מופנים.
- `icon-*.png` (5 קבצים, 150–270 KB) — שייכים לפרק 6, לא לפרק 1.

מחוץ להיקף אך נמצא באותה סריקה: `public/assets/ch6-story.mp4` avc1 Baseline@3.1 faststart תקין; `public/assets/sipur-gavriel-hadash.mp4` avc1 אך **ללא faststart** (moov בסוף) — לטיפול צוות פרק 6.

---

## 3. מודלים — `public/assets/chapter1/models/`

88 קובצי GLB, **163.9 MB** סה"כ (174 MB עם `_lowpoly-backup/` 4.4 MB ו-`_src/` 5.1 MB). כולם glTF 2.0 בינארי תקין (magic/version/JSON chunk). אין Draco/Meshopt/KTX2 באף קובץ; 6 קבצים משתמשים ב-`EXT_texture_webp`; `p3walkonly.glb` דורש `KHR_materials_specular`+`KHR_materials_ior` (לא בשימוש).

### 3א. עשרת הגדולים

| # | קובץ | MB | קודקודים | משולשים | טקסטורה | טקסטורה MB | הערה |
|---|---|---|---|---|---|---|---|
| 1 | terraces-hero.glb | 7.22 | 69,661 | 40,783 | JPG 2048² | 3.56 | hero של רמות תימן |
| 2 | player2.glb | 7.13 | 969 | 366 | PNG 2048² | 6.45 | **לא בשימוש** |
| 3 | player5.glb | 7.03 | 60,038 | 62,177 | JPG 2048² | 2.70 | **לא בשימוש** |
| 4 | player4.glb | 6.79 | 60,038 | 62,177 | JPG 2048² | 2.70 | השחקן (`MODEL_TRAVELER_WALK`), 7 אנימציות, skin |
| 4 | player-mixamo-test.glb | 6.79 | 60,038 | 62,177 | JPG 2048² | 2.70 | **כפיל בייט-לבייט של player4** (MD5 זהה), לא בשימוש |
| 6 | player3.glb | 6.76 | 859 | 303 | PNG 2048² | 6.08 | **לא בשימוש** |
| 7 | p3walkonly.glb | 6.18 | 859 | 303 | PNG 2048² | 6.08 | **לא בשימוש** |
| 8 | monastery-hero.glb | 6.18 | 52,477 | 40,603 | JPG 2048² | 3.31 | hero של המנזר |
| 9 | candA.glb | 6.16 | 60,038 | 62,177 | JPG 2048² | 2.70 | **לא בשימוש** |
| 10 | traveler-anim.glb | 6.05 | 34,757 | 30,954 | JPG 2048² | 3.65 | **לא בשימוש** (רק בהערות) |

### 3ב. כל המודלים מעל 5 MB (סף הדגל)

blacktent-hero 5.12 · candA 6.16 · candB 5.58 · gate-hero 5.04 · monastery-hero 6.18 · npc-jewish 5.06 · p3walkonly 6.18 · player-mixamo-test 6.79 · player2 7.13 · player3 6.76 · player4 6.79 · player5 7.03 · sanctuary-hero 5.80 · terraces-hero 7.22 · traveler-anim 6.05 — **15 קבצים**. קרובים לסף: npc-envoy 4.88, npc-chief 4.64, npc-monk 4.33, prop-silk 4.00, find-sherd 3.91, prop-robe 3.90.

### 3ג. טקסטורות

- אף טקסטורה אינה מעל 2048 px. **34 קבצים** נושאים טקסטורת 2048²; רובן JPEG במשקל 2.5–3.7 MB (דחיסה חלשה מאוד — JPEG 2048² טיפוסי באיכות 80 הוא 0.5–0.9 MB) או PNG 6.1–6.5 MB.
- חפצי-יד קטנים נושאים טקסטורת 2048² מלאה: `prop-censer/codex/robe/silk/spice/writing` 3.2–4.0 MB כל אחד, `find-sherd` (חרס בגובה 16 ס"מ) 3.9 MB.
- כפילות: `player-mixamo-test.glb` ≡ `player4.glb` (7,120,836 בייט, MD5 זהה). `bayt.glb`/`bayt2.glb` זהים בגאומטריה (1296 קודקודים) אך שונים בבייטים.

### 3ד. מודלים שאינם בשימוש בזמן-ריצה של פרק 1

לא ב-preload, לא באף layout, לא ב-cast/extras, לא ב-finds/tasks:
`blacktent` 0.86 · `butte` 0.09 · `camel-load` 0.87 · `candA` 6.16 · `candB` 5.58 · `kaaba` 1.53 · `p3walkonly` 6.18 · `player-mixamo-test` 6.79 · `player2` 7.13 · `player3` 6.76 · `player5` 7.03 · `traveler-anim` 6.05 = **55.0 MB**. (הערה: `blacktent` ב-layout ממופה ב-`MODEL_BY_NAME` ל-`blacktent-hero.glb`, לכן `blacktent.glb` עצמו מת.)

### 3ה. משקל הורדה משוער לפי אזור

בסיס שנטען **בכל אזור** (`Game.tsx:768` + `Characters.tsx:383`): blacktent-hero, firepit, torch, camel, camel-parts, player4, palm, well, rocks, jars, firewood, shrub, rawi = **18.54 MB** — מתוכם `blacktent-hero` (5.12 MB) נחוץ רק במחנה הלילה.

| אזור | מופעי props | מודלים ייחודיים | GLB (MB) | טקסטורות tex/ (MB) | **סה"כ (MB)** | הכבדים ביותר |
|---|---|---|---|---|---|---|
| yemen-heights | 136 | 35 | 44.8 | 3.0 | **47.7** | terraces-hero 7.2, player4 6.8, blacktent-hero 5.1, npc-chief 4.6 |
| night-camp | 104 | 41 | 39.3 | 4.0 | **43.2** | player4, blacktent-hero, npc-chief, find-sherd 3.9 |
| border-post | 157 | 51 | 48.4 | 3.4 | **51.8** | player4, blacktent-hero, gate-hero 5.0, npc-envoy 4.9, npc-chief |
| narrow-pass | 88 | 31 | 32.7 | 3.3 | **35.9** | player4, blacktent-hero, npc-chief |
| loading-road | 103 | 37 | 43.7 | 3.7 | **47.5** | player4, blacktent-hero, npc-chief, prop-silk 4.0, find-sherd |
| yathrib | 155 | 48 | 55.4 | 3.2 | **58.6** | player4, blacktent-hero, npc-jewish 5.1, npc-chief, find-sherd |
| monastery | 86 | 47 | 56.6 | 3.2 | **59.8** | player4, monastery-hero 6.2, blacktent-hero, npc-monk 4.3, 5×prop-* ≈ 15 |
| mecca | 150 | 44 | 45.7 | 3.0 | **48.7** | player4, sanctuary-hero 5.8, blacktent-hero, npc-jewish, npc-chief |
| exit | 68 | 31 | 32.3 | 2.8 | **35.1** | player4, blacktent-hero, terrain 2.4 |

הערות למספרים:
- מעבר אזור הוא **טעינת מסמך מלאה** (`window.location.assign`, `Game.tsx:5861`), כי העולם נבנה ברמת המודול. ההורדה החוזרת של הבסיס תלויה ב-HTTP cache של הדפדפן (GitHub Pages שולח `Cache-Control: max-age=600`), אבל פענוח ה-GLTF, יצירת הטקסטורות ב-GPU וקומפילציית השיידרים חוזרים בכל שער.
- אומדן זיכרון GPU לטקסטורות (RGBA לא דחוס + mipmaps, ללא KTX2): **≈300–400 MB לאזור** (7–10 טקסטורות 2048² + ~25 של 1024²). על מחשבים ניידים עם GPU משולב זה גבולי.
- משולשים ב-props בלבד (ללא cast/שחקן): 205k–356k לאזור; מספר מופעי props 68–157 ללא instancing → סדר גודל של 150–300 draw calls לפריים, כפול שניים בגלל מעבר הצללים.

---

## 4. כיסוי basePath (`/ISLAM_NIKA`)

`next.config.ts`: `basePath`/`assetPrefix`/`output:'export'`/`trailingSlash` רק כש-`GH_PAGES=true`. `scripts/fix-basepath.mjs` רץ ב-`postbuild`, מאתר את תיקיית ה-export (`PAGES_OUT_DIR`/`NEXT_DIST_DIR`/`out`), מחליף `(?<!ISLAM_NIKA)/assets/` → `/ISLAM_NIKA/assets/` בקבצי `.html .css .js .txt .json`, וסורק שוב ומכשיל את הבנייה אם נשארה הפניה לא-מקודמת.

| דפוס הפניה | היכן נמצא (דוגמאות) | מכוסה? | הערה |
|---|---|---|---|
| מחרוזת literal `"/assets/…"` ב-TSX (src/poster/href) | `ChapterOutro.tsx:54-55`, `Game.tsx:5202-5203`, `dialogue.ts:93-109` | כן | הופך ל-literal ב-bundle, ה-regex תופס |
| template literal `` `/assets/chapter1/models/${…}.glb` `` | `Game.tsx:1346, 2216, 3268, 4066, 4763, 4770`, `FindView.tsx:90`, `DialogueHud.tsx:37,58`, `Entrance.tsx:18` (40 מופעים ב-`src/`) | כן | הקידומת `/assets/` נשארת literal גם אחרי minify (`"/assets/…".concat(…)` או template) |
| `<track src="/assets/…vtt">` | `ChapterOutro.tsx:62`, `Game.tsx:5210` | כן | attribute literal ב-HTML/JS |
| `poster="/assets/…"` | `ChapterOutro.tsx:55`, `DialogueHud.tsx:59` | כן | |
| CSS `url(/assets/…)` — פונטים (7 OTF) ורקעים | `src/styles/fonts.css`, `chapter*.css` (17 מופעים) | כן | `.css` בסריקה |
| `useLoader(TextureLoader, '/assets/chapter1/tex/…')` | `Game.tsx:169, 448, 779, 934, 1013, 1085, 1242` | כן | literal ב-JS |
| `new Image().src = framePath(i)` | `Entrance.tsx:76-78` | כן | template literal עם קידומת literal |
| `fetch('/assets/…')` | לא נמצא | — | |
| שרשור `'/assets' + '/x'` או `'assets/'` יחסי | לא נמצא | — | |
| הפניות ל-`/assets/` בקובצי JSON תחת `src/` | לא נמצא (ב-layout יש רק שמות קבצים) | — | |
| הפניות בקבצים עם סיומת שאינה נסרקת (`.svg .vtt .webmanifest .xml .md`) | רק `public/assets/chapter1/models/README.md` (לא נטען בזמן-ריצה) | לא נסרק, אך לא נדרש | |
| קבצים בשורש `public/` שאינם תחת `/assets/` (`background.png`, `logo dark.png`, `logo light.png`, `entrance video.mp4`) | אין הפניה אליהם ב-`src/` | — | קבצים מתים; אילו היו מופנים כ-`/background.png` ה-regex **לא** היה מקדם אותם |
| ניווט פנימי `router.push('/chapters')`, `window.location.assign(pathname + '?region=…')` | `Game.tsx:5861, 6404, 6773` | כן (Next/pathname) | basePath מטופל ע"י Next; `pathname` הנוכחי כבר מכיל את הקידומת |
| `src/app/icon.svg` | | כן | metadata של Next מקבל basePath |

בדיקת ה-export הישן ב-`out/` (08:07 היום): 202 קובצי טקסט, 36 עם `/ISLAM_NIKA/assets/`, **0 שאריות** לא-מקודמות. `out/.nojekyll` קיים, אך לא נמצא סקריפט או workflow ברפו שיוצר אותו (אין `.github/workflows` — הפריסה אינה מתועדת בקוד).

סיכון שנותר בתסריט: `postbuild` רץ רק דרך `npm run build`; הרצה ישירה של `npx next build` תדלג עליו. ה-gate שבסוף הסקריפט מגן רק כשהסקריפט בכלל רץ.

---

## 5. נקודות חמות בקוד

גרסאות מותקנות בפועל: three **0.185.1**, @react-three/fiber **9.7.0**, @react-three/drei **10.7.7**, @react-three/postprocessing 3.0.5, postprocessing 6.39.4, next **16.2.10**, react/react-dom **19.2.7**, typescript 5.9.3. אין תלות ישירה ב-pre-release; ב-lock יש רק שני transitive (`gensync@1.0.0-beta.2`, `resolve@2.0.0-next.7` — כלי בנייה, לא זמן-ריצה). טווחי peer של drei/fiber מול three 0.185 תקינים.

| נושא | ממצא | מיקום |
|---|---|---|
| `useFrame` | **23** ב-`Game.tsx`, 3 ב-`Characters.tsx`, 2 ב-`FindView.tsx`; הגדול ביותר 454 שורות (`Game.tsx:2474-2927`, לולאת השחקן/מצלמה) | |
| הקצאות לפריים | `new THREE.Vector3(...)` ×2 + `.applyAxisAngle(new THREE.Vector3(0,1,0))` ב-`Game.tsx:2739`, `live.player.clone()` ב-`2786` — **3 אובייקטים חדשים בכל פריים** בלולאה הראשית. `Game.tsx:2070` (`new THREE.Vector3` + `getBoundingClientRect`) מוגן ב-`NODE_ENV !== 'production'`. | Game.tsx:2739, 2786 |
| `setState` בתוך `useFrame` | `setNearIdx` (`Game.tsx:~2023`) — מוגן בהשוואה ל-ref, מתעדכן רק בשינוי. `setClip` (`4628-4682`) — מעבר קליפ בלבד. שאר ה-`set*` הם `setScalar/setX/setEffectiveWeight` של three, לא React. | |
| `getBoundingClientRect` | לא בפריים (ב-production); כן בכל `pointermove` בזמן גרירה בלבד (`1746, 1754, 3709, 3725, 3921, 3928`) — מקובל. ב-`3980` (`screenOf`) `new THREE.Vector3` לכל אירוע pointer — זניח. | |
| כתיבות DOM לפריים | `Game.tsx:3046-3161` כותב `style.transform/display/textContent` לסמן השער ולסמני POI דרך refs (ללא re-render) — הדפוס הנכון. | |
| `<Canvas>` | `shadows="percentage"` (PCF, בכוונה — PCFSoft הוצא משימוש ב-0.185), `dpr={[1,2]}`, `fov 55`. אין postprocessing בפרק 1 (החבילה מותקנת, לא מיובאת). | Game.tsx:6471 |
| צללים | `directionalLight` אחד עם `shadow-mapSize 2048²`, frustum אורתוגרפי 100×100 m, far 140, `castShadow` על props עד גובה 18 m ועל השחקן/cast. שטח 100 m על 2048 px = ~5 ס"מ לטקסל → צללים רכים/מרוחים, ומעבר עומק מלא על ~150 מופעים בכל פריים. | Game.tsx:4741-4758 |
| `<Html>` (drei) | 6 מקומות ב-`Game.tsx` (`1278, 2148, 2161, 2203, 4032, 4038`), חלקם בתוך `map` (חפצי משימה/סלים/לוחות) — בזמן משימה סדר גודל של 5–12 מופעים בו-זמנית, כולם `zIndexRange={[4,4]}`. מחוץ למשימה — 1–2. | |
| instancing | אין `InstancedMesh`/מיזוג גאומטריה; 27–41 דקלים, 34 `drywall2` וכו' כ-`scene.clone(true)` נפרד לכל מופע (גאומטריה משותפת, draw call נפרד). | Game.tsx:603-612 |
| `frustumCulled=false` | על השחקן, cast ו-camel-parts (מוצדק ל-skinned) ועל מערכת האבק. | 1185, 2262, 2383, 2950, 3525 |
| Canvas שני | `FindView.tsx:85` פותח WebGL context נוסף (turntable של ממצא) בזמן שה-Canvas הראשי חי. | |
| Preload | `useGLTF.preload` ברמת המודול לבסיס + לכל מודל ב-layout + extras (`Game.tsx:768, 3319, 3327`) — טוב לרציפות, אבל הכול יורד מיד עם החבילה. | |
| וידאו ב-HUD | `DialogueHud.tsx:54-66`: `autoPlay playsInline preload="auto"`, `muted={!once || isMuted()}` — לסרטי `filmOnce` (opening, abraha) מתבצע autoplay **עם קול**; שומר של 2.5 s מחליף לפוסטר אם `videoWidth===0` או `error`. | |
| חלוקת קוד | `Game.tsx` 6,817 שורות בקובץ אחד, נטען כ-chunk אחד דרך `dynamic(ssr:false)` ב-`Chapter1Client.tsx` (עם prefetch ממסך הפתיחה). | |

---

## 6. ממצאים

### PF-01 · P1 · שני סרטי הדיאלוג מקודדים HEVC (hvc1) ללא חלופת H.264
`abraha.mp4` ו-`opening.mp4` הם `hvc1` ב-1080p, מוגשים כ-`<video src>` יחיד (`DialogueHud.tsx:58`) בלי `<source>` חלופי. Firefox אינו מנגן HEVC כלל; Chrome/Edge מנגנים רק כשיש פענוח חומרה למערכת ההפעלה (Windows/macOS מ-107, לא ב-Linux, ולא בכל Android); Safari מנגן. בדפדפן שאינו תומך, השומר ב-`DialogueHud.tsx:39-44` מחליף לפוסטר אחרי 2.5 s — השיחה ממשיכה, אבל שני הסרטים היחידים של הדיאלוג נעלמים בשקט ואין שום שגיאה למשתמש.
**תיקון:** קידוד מחדש ל-H.264 High@4.0 yuv420p 1280×720 CRF 22–23, AAC 48 kHz, `-movflags +faststart` (צפי 2–4 MB ל-abraha, ~1.5 MB ל-opening), או להוסיף `<source type='video/mp4; codecs="hvc1"'>` ואחריו `<source ... codecs="avc1.640028">`.

### PF-02 · P2 · שלושה MP4 ללא faststart (moov בסוף הקובץ)
`abraha.mp4` (moov ב-13.7 MB), `opening.mp4`, `scene2.mp4`. הדפדפן חייב בקשת Range נוספת לסוף הקובץ לפני שהוא יודע מה יש בו; עם `preload="auto"` ב-HUD זה מוסיף RTT ומעכב את הפריים הראשון — בדיוק המצב שהשומר של 2.5 s נועד לתפוס, כך שברשת איטית הסרט עלול להיפסל גם בדפדפן תומך. `ch1-summary.mp4` תקין (moov ב-byte 32).

### PF-03 · P2 · סרטי HUD כבדים פי 3–4 מהנדרש
`abraha.mp4` 13.7 MB ל-24 s (≈4.6 Mbps) ו-`scene2.mp4` ≈6.6 Mbps, ב-1080p, למסגרת HUD קטנה. יעד: 720p ב-≤1.5 Mbps (כמו `ch1-summary` — 1.4 Mbps).

### PF-04 · P2 · 18.5 MB של preload בסיסי בכל אזור, מתוכם 5.1 MB לאוהל שקיים רק במחנה הלילה
`Game.tsx:768` מטעין `blacktent-hero.glb` (5.12 MB, 31k קודקודים, JPG 2048² 3.5 MB) בכל תשעת האזורים, אף ש-`blacktent` מופיע רק ב-`camp-layout.json`. אותו דבר `camel-parts`, `firewood`, `shrub`, `jars`, `well` — כבר מכוסים ע"י ה-preload הדינמי מה-layout (`3319`) ולכן הרשימה הקבועה מיותרת ברובה.
**תיקון:** להשאיר ברשימה הקבועה רק את מה שכל אזור באמת משתמש בו (player4, camel-parts אם ה-herd קיים, rawi); את השאר להשאיר ל-`WORLD.props`.

### PF-05 · P2 · טקסטורות 2048² בדחיסה חלשה, כולל על חפצי-יד זעירים
34 GLB נושאים 2048² ב-2.5–6.5 MB כל אחד. `find-sherd` (חרס 16 ס"מ) 3.9 MB; ששת `prop-*` (3.2–4.0 MB) — במנזר המשימה לבדה מושכת ≈15 MB. ה-NPCs 4.3–5.1 MB כל אחד. אומדן VRAM ≈300–400 MB לאזור בלי דחיסת GPU.
**תיקון:** `@gltf-transform/cli` (כבר ב-devDependencies 4.5.0): `resize --width 1024` לחפצים/ממצאים, `--width 2048` רק ל-hero/שחקן; `webp -q 80` (או `ktx2 --etc1s`) + `meshopt`/`draco`. צפי: מ-164 MB ל-≈35–45 MB בלי אובדן נראה.

### PF-06 · P2 · השחקן: 60k קודקודים / 62k משולשים + skin עם 7 קליפים — הכבד ביותר בכל אזור
`player4.glb` 6.79 MB. גם `npc-*` 30–39k משולשים כל אחד, ובמכה 3 מהם + extras (clones עם `SkeletonUtils`). זה סביר על GPU ייעודי, גבולי על משולב עם מעבר צללים כפול. `_lowpoly-backup/` מכיל גרסאות 0.6–0.7 MB של אותם NPCs — כדאי לבדוק אם ההבדל החזותי מצדיק פי 7.

### PF-07 · P3 · 55 MB של GLB מתים + 22 MB תיקיות עבודה נפרסים ל-Pages
`player2/3/5`, `player-mixamo-test` (כפיל מדויק של player4), `candA/B`, `p3walkonly`, `traveler-anim`, `kaaba`, `camel-load`, `blacktent`, `butte`; `models/_src/` 5.1 MB, `models/_lowpoly-backup/` 4.4 MB, `chapter1/concept/` 1.9 MB, `assets/_backup-ch6-story/` 11 MB, `scene2.mp4`+`scene2-poster.jpg`+`poster1.jpg` 4.3 MB, 4 קבצים בשורש `public/` (עם רווחים בשם) ללא הפניה. לא נמשכים ע"י הדפדפן, אבל מנפחים את הרפו/פריסה ומבלבלים בביקורת.

### PF-08 · P3 · הקצאות בלולאת הפריים הראשית
`Game.tsx:2739` שני `new THREE.Vector3` ו-`2786` `.clone()` — 3 אובייקטים × 60 fps. לא יגרום לבדו לגמגום, אבל זו לולאה של 454 שורות שרצה תמיד; scratch vectors ברמת המודול הם תיקון של 3 שורות.

### PF-09 · P3 · מפת צל אחת של 2048² על 100 m ו-`dpr` עד 2
רזולוציית צל ≈5 ס"מ/טקסל → צללים מרוחים סמוך לשחקן; מעבר עומק על כל 150 המופעים בכל פריים. `dpr={[1,2]}` על Retina מרנדר פי 4 פיקסלים. שקול `dpr={[1,1.5]}`, ו/או CSM/מפת צל צמודה לשחקן (30 m) עם צל סטטי לרקע.

### PF-10 · P3 · ללא instancing עבור props חוזרים
27–41 דקלים, עד 34 `drywall2`, 20 `basalt1`, 20 `ruinwall` — כל אחד draw call נפרד (×2 עם צללים). `InstancedMesh` לעשרת המודלים החוזרים ביותר יוריד את מספר ה-draw calls בכ-60%.

### PF-11 · P3 · פונטים OTF ו-PNG של שמיים
7 קובצי OTF (≈700 KB; ploni ≈145 KB כל אחד) — WOFF2 יחסוך ≈50%. 9 פנורמות שמיים PNG 1536×768 ב-1.0–1.6 MB — כ-JPEG/WebP ≈150–250 KB כל אחת. `fire-atlas.png` 2048×1024 1.8 MB (זקוק לאלפא → WebP). `tent-weave.jpg` 1536² 1.0 MB.

### PF-12 · P3 · שרשרת הפריסה אינה בקוד
אין `.github/workflows`; `.nojekyll` מופיע ב-`out/` אך שום סקריפט ברפו לא יוצר אותו; `fix-basepath` תלוי ב-`npm run build` (postbuild). מומלץ workflow אחד עם `GH_PAGES=true npm run build` + `touch out/.nojekyll` + `upload-pages-artifact`.

### PF-13 · P3 · `EXT_texture_webp` בשישה GLB
`amphora, basalt1, basalt2, basket, cart, claypot` — נתמך ב-Safari 14+, Firefox 65+, Chrome 32+. אין בעיה בדפדפנים נתמכים; רק לתעד שאין נפילה ל-PNG (ואכן אין).

---

## 7. דורש בדיקה חיה

לא ניתן לאמת סטטית — אין לסמן כ"עבר":

1. ניגון `opening.mp4`/`abraha.mp4` בפועל ב-Chrome (Windows/macOS/Linux), Edge, Firefox, Safari — האם `videoWidth>0` בתוך 2.5 s, ואם לא, האם הפוסטר מוצג (PF-01/02).
2. autoplay **עם קול** לסרטי `filmOnce` (`muted=false`): האם המחווה שפתחה את הדיאלוג (מקש E) נחשבת user activation ב-Safari/Firefox, או שהסרט נשאר מושהה על פריים ראשון (מצב שהשומר לא תופס, כי `videoWidth>0`).
3. שגיאות קונסולה, promises דחויים, בקשות 404 תחת `/ISLAM_NIKA/` — במיוחד `.vtt` (MIME `text/vtt`), פוסטרים ו-`fire-atlas.png`.
4. FPS וזמן-פריים ב-9 האזורים על מחשב נייד עם GPU משולב (Intel Iris / Apple M1) ב-dpr 2; זמן עד פריים ראשון אחרי מעבר שער (טעינת מסמך מלאה).
5. צריכת זיכרון GPU/JS heap לאורך מסע מלא (9 טעינות מסמך) — דליפות בין אזורים לא רלוונטיות (מסמך חדש), אבל שיא לאזור כן.
6. WebGL context loss כשנפתח ה-Canvas השני של `FindView` בזמן משחק, ובחזרה למשחק אחרי טאב ברקע.
7. התנהגות `<track default>` — הצגת כתוביות אוטומטית ב-Safari (שמכבד העדפות מערכת) מול Chrome/Firefox.
8. שגיאות `useGLTF` על מודל חסר — הקוד מניח שכל `model` ב-layout קיים כקובץ; הסקריפט לא מצא חסרים, אך יש לאמת בזמן-ריצה גם את מסלול `_backup-*`.
9. גודל ה-chunk של `Game.tsx` אחרי בנייה (6,817 שורות + three + drei) וזמן הפרסינג במובייל.
10. הרצת `npm run verify:live` (Playwright קיים ב-devDependencies) כחלק מהבדיקה החיה.

---

## 8. דפדפנים

**Firefox ו-Safari לא נבדקו בסבב הסטטי הזה**, וגם Chrome/Edge לא הורצו — כל האמור על תאימות (HEVC, autoplay, WebP-in-GLB, `<track>`) נגזר ממפרטי הקודקים והדפדפנים ומהקוד בלבד. עובדה מבנית אחת ודאית ללא דפדפן: `opening.mp4` ו-`abraha.mp4` הם HEVC יחיד ללא חלופה, ולכן Firefox (בכל פלטפורמה) ו-Chrome ללא פענוח HEVC חומרתי לא ינגנו אותם. שאר הנכסים (H.264 High@4.0, glTF 2.0 ללא הרחבות חובה, WebP, WEBVTT) נתמכים בכל הדפדפנים הירוקים המקובלים (Chrome/Edge ≥ 90, Firefox ≥ 90, Safari ≥ 15).
