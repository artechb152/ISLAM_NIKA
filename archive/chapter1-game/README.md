# המשחק התלת-ממדי של פרק 1 — בארכיון

הועבר לכאן מתוך `web/` ב-11.11.2026. פרק 1 באתר הוא המאמר ב-`/chapter1`; המשחק
(`/chapter1-game`) לא היה מקושר, ושקל כ-140MB בנכסים שעלו לאתר המפורסם.
**שום דבר לא נמחק.** כל קובץ יושב כאן באותו נתיב יחסי שהיה לו בפרויקט.

## מה כאן

| נתיב | מה |
|---|---|
| `web/src/app/(chapter1)/` | הנתיבים `/chapter1-game`, `/play`, `/guide`, `/practice`, `/end`, `/dev-character` |
| `web/src/components/chapter1/` | 17 רכיבי המשחק (Game, WorldMap, DialogueHud…) |
| `web/src/lib/chapter1/` | דיאלוג, עולמות, פריסות האזורים, משימות, ממצאים, גיבויים |
| `web/src/styles/chapter1.css` | הגיליון של המשחק |
| `web/public/assets/chapter1/` | `models` (‏.glb), `tex`, `faces`, `concept` |
| `web/public/assets/anim-video/` | `narration/` ו-`ch1-summary.*` (סרטון הסיכום של המשחק) |
| `web/scripts/` | סקריפטי הבדיקה והבנייה של המשחק (check-walkable, check-playable, camp…) |
| `web/blender/` | קובצי Blender של המחנה |
| `concept/chapter1/verify-dialogue.mjs` | שער הנאמנות של הדיאלוג |

## להחזיר

להעתיק את התוכן של `archive/chapter1-game/web/` חזרה אל `web/` ואת
`concept/chapter1/verify-dialogue.mjs` אל `concept/chapter1/`, ולהחזיר ל-`verify`
ב-`web/package.json` את הבדיקות שהוסרו ממנו:
`verify-dialogue`, `check-camp`, `check-layouts`, `check-content`, `check-journey`,
`check-script`, `check-interactions`, `check-walkable`, `check-playable`.

`three` ו-`@react-three/*` נשארו ב-`package.json` — פרקים 11 ו-13 משתמשים בהם.
