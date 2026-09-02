# מניפסט נכסי Higgsfield — ריצת הלילה 2026-09-01

תקציב: יעד ≤2,500 קרדיטים, תקרה 4,480. יתרה בתחילת הלילה: 8,960.

| # | נכס | מודל | job id | קרדיטים | סטטוס | יעד |
|---|-----|------|--------|---------|-------|-----|
| 1 | גיליון דמות שחקן, 2 וריאנטים (turnaround 4 מבטים, A-pose) | nano_banana_pro 2k | 1e3cca31 + 0a09c3d9 | 4 | ✔ הופק, נבחר וריאנט B (טורבן צמוד — בטוח לריגינג) | קונספט |
| 2 | שחקן: רשת+טקסטורה+ריג | meshy_multi_image_to_3d | ecdcfbe0-bca8-4254-b8a3-7dcfcc28405a | 35 | ⏳ בעבודה | web/public/assets/chapter1/models/player2.glb |

הקרופים: scratchpad/view-{front,three-quarter,side,back}.png ← sheet-b.png.
media ids: dea392ae / c2763134 / c5f322c0 / 6cae1cd6.

## בחירות אנימציה (ספריית Meshy, ליישור עם 6 הקליפים הקיימים)
idle→0 (Idle) · walk→30 (Casual_Walk) · talk→313 (Talk_with_Hands_Open) ·
talk-ack→47 (Listening_Gesture) · talk-happy→308 (Talk_Passionately) ·
talk-nod→314 (Talk_with_Right_Hand_Open, גיבוי: חיפוש נוסף)

| 3 | קליפים: idle,walk(30),talk(313),ack(47),happy(308),nod(314) | 3d_rigging ×6 | afb4ac3e,2ac1067f,e66b60f3,b259c70d,63970f5c,07d08e3a | 48 | ✔ | מוזגו |
| 4 | קליפים: walk מהיר (115), run (16) | 3d_rigging ×2 | e7ca20dd,afd2f34b | 16 | ✔ | player2.glb |

**player2.glb** (7.1MB, 7 קליפים: walk/run/idle/talk/talk-ack/talk-happy/talk-nod) →
web/public/assets/chapter1/models/player2.glb. מדידות (dev-character, מד רגל נטועה):
walk 1.332 מ/ש × 3.033s = 4.04 מ/לולאה · run 8.83 מ/ש × 0.5s = 4.41 מ/לולאה.
check-slide: כיול 100%/100%, סחיפה 0%.

**סה"כ הוצאה עד כה: ~103 קרדיטים** (מתוך תקרת 4,480).

| 5 | בדיקת קומפוזיציה אברהה 12ש' 720p | seedance_2_5 | e714da8b-0c38-40c7-931b-1b1b1d43447a | 78 | ✔ אושר (קובייה נכונה! צבא מוגזם→צומצם) | scratchpad/abraha-test.mp4 |
| 6 | סרט אברהה סופי 24ש' 1080p + אודיו | seedance_2_5 | af497aa4-7942-4492-ba4c-33be6335d9bf | 216 | ⏳ | anim-video/abraha.mp4 → birds-cinematic |

**סה"כ: ~397 קרדיטים.**

## סיכום סופי
סה"כ הוצאה: **~397 קרדיטים** מתוך תקרת 4,480 (יתרה ~8,563).
נכסים שנכנסו למשחק: player2.glb (שחקן+7 קליפים), abraha.mp4 (birds-cinematic).
נכסים שנפסלו/לא נוצרו: פתיח חדש (הקיים טוב), מונטאז'/סינתזה (הרמת המצלמה מספיקה),
נכסי סביבה (בימוי קיים סביר), ריג NPC (לא הורץ).

## ריצת השיקום 2026-09-02 (ועדה)
| # | נכס | מודל | job id | קרדיטים (אומדן) | סטטוס |
|---|-----|------|--------|------------------|-------|
| R1 | מועמד שחקן A (62K tris, חומר NPC) | meshy_v7 ultra | a2923154 | 44 | ✔ ACCEPT אמנותי |
| R2 | מועמד שחקן B | multi_image v6 | e6777233 | ~35 | ✘ נדחה (הצגה) |
| R3 | ריג A | 3d_rigging | 2ae1f0e9 | 8 | ✔ |
| R4 | 7 קליפים על ריג A (idle,qwalk,run,talk,ack,happy,nod) | 3d_rigging ×7 | 9de97250,e4b18b67,6a61359e,b0f194f2,2a660df0,a6626eea,b9ea39ab | ~56 | ⏳ |
| R5 | קונספטים: שער גבול/מנזר/טרסות (כעבה v1 נכשל) | NB Pro ×4 | 588ea471,9584253b,ffe6f922,(3694771d✘) | ~8 | ✔ |
| R6 | כעבה v2 (ניסוח ניטרלי) | NB Pro | aa7e9bea | 2 | ⏳ |
| R7 | פתיח קולנועי 15ש 1080p, רפרנס פני ראווי | seedance_2_5 omni | 1779d7ff | 135 | ⏳ |
| R8 | תלת-ממד: שער/מנזר/טרסות | meshy_v7 ×3 | deb6c1e4,e747756f,505a32dd | ~120 | ⏳ |
| R9 | player4/5: skin-wrap של candA על שלד player2b (סקריפט skinwrap.mjs: אזורים+קפסולות+יישור זרועות) | מקומי | — | 0 | player5 ממתין לפסק-דין; Mixamo של המשתמשת עשוי לעקוף |
| R10 | player-for-mixamo.fbx הוכן להעלאה ידנית + player-mixamo2glb.py מוכן להרכבה | Blender מקומי | — | 0 | ⏳ ממתין להעלאת המשתמשת |
| R11 | פתיח מבוים 15ש 1080p+אודיו (רפרנס פני ראווי, omni) | seedance_2_5 | 1779d7ff | 135 | ✔ הורד → anim-video/opening.mp4 |
| R12 | נכסי גיבור 3D: שער מכס, פינת מנזר+פעמון, טרסות, מתחם מקדש | meshy_v7 ×4 | deb6c1e4,e747756f,505a32dd,2f768f5d | ~160 | ✔ הורדו → models/*-hero.glb, ממתינים להצבה |
| R13 | player5 ACCEPT-FOR-PRODUCTION (ועדה אמנותית) | skin-wrap מקומי | — | 0 | ✔ הוחלף חם בפרודקשן |

**הוצאה מצטברת: ~841 קרדיטים** (יתרה בפועל: 8,119).
