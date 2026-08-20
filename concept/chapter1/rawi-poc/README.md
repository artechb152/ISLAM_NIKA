# POC — רָאוִי מונפש עם קול עברי · ✅ סגור (2026-08-06)

התוצר הסופי: **`rawi-mixamo.glb`** — 2.8MB, גוף מלא (31k משולשים) עם הטקסטורה,
שלד Mixamo אחד (33 מפרקים, כולל אצבעות), ושש אנימציות שאושרו על ידי המשתמשת:
`idle` · `walk` · `talk` (ידיים קדימה) · `talk-ack` (הכרה) · `talk-happy` (יד שמחה) · `talk-nod` (הנהון מהורהר).
קרוספיידים אמיתיים בין כולן. קול: ElevenLabs (הוכרע).

## להרצה
```
cd concept/chapter1/rawi-poc
node serve.mjs      →  http://localhost:8137
```
(‏`pick.html` — דף בחירת תנועות Meshy, היסטורי. `test-clip.html?f=X.glb` — בדיקת קובץ בודד.)

## הצינור הסופי (לכל דמות חדשה)

| שלב | כלי | עלות |
|---|---|---|
| 1. תמונת דמות: **ידיים לצד הגוף**, רגליים נפרדות | Higgsfield `gpt_image_2` | ~2 קר' |
| 2. מש מטוקסטר | Higgsfield `image_to_3d` (`should_texture`, בלי אנימציה) | 35 קר' |
| 3. FBX נקי (רשת מאוחדת, בלי חומרים) | Blender headless — `glb2fbx-clean.py` | 0 |
| 4. ריג אוטומטי | Mixamo (חשבון Adobe; 8 סמנים, פעם אחת לדמות) | 0 |
| 5. קליפים — **תמיד With Skin** | Mixamo API — `mixamo-api.mjs` | 0 |
| 6. GLB אחד: מש+טקסטורה מקורית+קליפים כ־NLA | Blender — `mixamo2glb.py` | 0 |
| 7. קריינות | Higgsfield `text2speech_v2` variant `elevenlabs` | ~0.45/שורה |

הסקריפטים ב־scratchpad של הסשן; העתקים חיים גם ב־`rawi-3d/mixamo/` לצד קובצי ה־FBX.

## כללי ברזל שנלמדו בדם
1. **קליפי Mixamo מורידים With Skin** — Without Skin נותן שלד סטנדרטי שונה מהריג של הדמות ⇒ עיוות (איקס מאחורי הגב).
2. **טעינה במנוע: לנרמל סקייל** — FBX בס"מ; ראו הבלוק ב־`index.html` (bbox → 1.6מ' → הצמדת רגליים לקרקע).
3. אוטומציית ה־UI של Mixamo שברירית — **ה־API הפנימי יציב** (טוקן מ־localStorage; ראו `mixamo-api.mjs`).
4. המסלולים שנפסלו (אל תחזרו לשם): קליפים של Meshy (`3d_rigging`) — רשת 251 משולשים ושלד סוטה; אפייה מלאה ב־Higgsfield — 43 קר'/קליפ ועדיין בלי קרוספיידים.
5. במשחק: מחוות הדיבור מתחלפות לפי סוג השורה (מסורת→`talk-nod`, ברירת מחדל→`talk`, וכו').

## קבצים היסטוריים בתיקייה (אפשר למחוק אחרי שהמנוע מחובר)
`rawi3-*.glb` (המסלול האפוי, ~27MB — **`rawi3-chat.glb` נשאר! הוא מקור הטקסטורה של `mixamo2glb.py`**),
`rawi2-*.glb`, `rawi-idle/walk/talk.glb` (מסלול Meshy המת).

## קול
`voice-test/rawi-elevenlabs.mp3` (המנצח) מול `rawi-seedaudio.wav`. שורת המבחן: §1 („עירבון מוגבל").
הבא בתור: בחירת 6 קולות ElevenLabs נבדלים — להשמיע לה דוגמית עברית מכל אחד לפני שיבוץ.
