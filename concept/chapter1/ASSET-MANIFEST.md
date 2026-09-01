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
