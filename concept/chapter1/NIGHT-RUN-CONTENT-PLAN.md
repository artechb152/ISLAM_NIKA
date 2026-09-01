# תכנון תוכן — ריצת הלילה (פאזות 3-4)

## מטרות ליבה פר-אזור (שדה core חדש ב-worlds.ts/dialogue.json)

| אזור | core (חוסם שער קדימה) | אופציונלי |
|------|------------------------|-----------|
| yemen-heights | opening + task-compare (חדש) | find-terrace-inscription נשאר בסיס למשימה |
| night-camp | rawi-intro + task-plan-route (חדש) | — |
| border-post | envoy-empires, envoy-sasanian + task-present (מחליף toll) | rawi-zoroaster, finds |
| narrow-pass | chief-tribes + task-protection (route) | rawi-ghassan, finds |
| loading-road | rawi-seep + task-loading (מתוקן) | finds |
| yathrib | jewish-arrival + task-market (connect) | 4 המפגשים האחרים, finds |
| monastery | monk-christianity, monk-influence + task-monk (observe) | monk-practices, monk-quran |
| mecca | merchant-idols, abraha-story, birds-cinematic | כל השאר |
| exit | rawi-summary (מפעיל פינאלה) | find |

## שינויי תוכן (פאזה 3)

1. **rawi-echo (חמאס/2014, nb26) עובר להעשרה** — חוטף את השיא ההיסטורי מיד אחרי
   נס הציפורים. עובר לערוץ enrichment חדש במחברת ("עוד על זה — הדהוד מודרני"),
   העוגן §31 נשמר שם. exit/rawi-summary: nb27→26, NOTEBOOK_TOTAL=26.
2. **ערוץ העשרה במחברת**: enrichment.json — קלפים אופציונליים עם source §,
   verify-dialogue.mjs סופר כיסוי גם מהם.
3. **סתירת ה"רעיונות" ב-task-loading**: הפריט "רעיונות ואמונות" מפסיק להיות
   מוקצה-כטעות; המשימה נשארת על מטען פיזי, וה-beat "מה שלא נארז נסע בכל זאת"
   נכנס כ-narrator קצר עם trigger after:task (מנגנון trigger קיים).
4. אין קיצוצים נוספים בשלב זה — הדו-קוליות כבר שברה את ההרצאות; המטריצה
   לא חשפה כפילויות קשות מעבר לענייני ה-teach-then-quiz שמטופלים בפאזה 4.

## פאזה 4 — סדר: present(3) → loading-fix(5) → plan-route(2) → connect(6) →
observe(7) → route(4) → compare(1) → mecca-discovery(8) → finale-core(9)

## סטטוס אמצע-לילה (02:15)
✔ פאזה 0 (קפיאה: הרכבה מדורגת) ✔ פאזה 1 (player2 + ריצה) ✔ פאזה 2 (פינאלה/איפוס/Escape/§/ראווי)
✔ סרט אברהה מחובר (filmOnce) ✔ תכנון מסלול במחנה ✔ present בגבול ✔ connect בית'רב ✔ observe במנזר
✔ תיקון הרעיונות בהעמסה ✔ שערי ליבה בכל האזורים + check-keys ✔ שער נאמנות סופר העשרה
⏳ הרנס מלא רץ · בהמתנה: העברת rawi-echo להעשרה + מחברת, route במעבר, compare בתימן, גילוי במכה, פאזה 6-7
