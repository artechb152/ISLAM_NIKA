# MAGNIFIC_IMAGE_PROMPTS

פרומפטים מוכנים לשש ההמחשות של פרק 6.

**עדכון סבב 4 (20.7.2026):** לבקשת המזמינה נוצרו כל שש התמונות ב-Magnific לפי הפרומפטים שלהלן,
נשמרו ב-`web/public/assets/chapter6/` (JPG, ‏loading=lazy, ‏aspect-ratio שמור ב-CSS למניעת CLS),
ושולבו בפרק **לצד** הרכיבים האינטראקטיביים — לא במקומם, בהתאם לכלל שנקבע בסבב 3. הפינים נשארו DOM.

**עדכון סבב 3 (15.7.2026, אחרי ועדת הביקורת):** שתי המפות שהיו מסומנות כאן ✓ קיבלו את ה-✓ כי היה רכיב — לא כי הייתה מפה. בסבב 3 שתיהן קיבלו קרקע אמיתית, אבל **בקוד (SVG), לא ב-Magnific**, משלושה נימוקים שנרשמו בדוח הוועדה: דיוק כיוונים דורש הטלה מתמטית (מפת הקיבלה כעת נאמנת-כיוונים — מדינה→מכה 176.3° על הפיקסלים); מנוע תמונות מסתכן בכתב ערבי מזויף, שהוועדה אסרה; ו-SVG חי בפלטה. גם צללית האופק המשותפת לתפילה ולרמדאן צוירה בקוד (`web/src/lib/chapter6/art.ts`). **נכון להיום אין אף נכס שנדרש ייצור ב-Magnific.** הפרומפטים נשארים למקרה שתרצי גרסה מצוירת-עשירה — ואז הכלל: התמונה נכנסת מתחת לרכיב, לעולם לא במקומו, והפינים חייבים להישאר DOM.

**קראי קודם את זה.** חמש מתוך השש כבר קיימות בפרק — לא כתמונות אלא כרכיבים אינטראקטיביים שנבנו בקוד, ועונות בדיוק על ה-Alt שכתבת. לכן לא ייצרתי תמונות סטטיות במקומן: הן היו מתחרות בהמחשה שכבר עובדת, נכנסות תחת „אל תעמיס תמונות דקורטיביות”, וצורכות קרדיטים. הקובץ הזה קיים כדי שתוכלי להחליט אחרת בהרצה אחת.

| # | asset | המסך | קיים היום | Alt |
|---|---|---|---|---|
| 1 | `shahada-illustration` | `sh-v` | ✓ רכיב קליגרפי (الشهادة → שהאדה → עדות) | קליגרפיה הממחישה את השהאדה כעדות באסלאם |
| 2 | `prayer-times-illustration` | `pr-v1` | ✓ כיפת שמים אינטראקטיבית, חמש תחנות | מחזור יום הממחיש את זמני חמש התפילות |
| 3 | `qibla-direction-map` | `pr-v2` | ✓ מפה עם ציר זמן של 17 חודשים | מפה הממחישה את שינוי כיוון התפילה מירושלים למכה |
| 4 | `zakat-illustration` | `ch-v` | ✓ טבעת 2.5% הזורמת לארבעה מוקדים | המחשה של מתן צדקה וסיוע לקהילה |
| 5 | `ramadan-day-illustration` | `rm-v` | ✓ שמש הנעה מעלות השחר לשקיעה | מחזור יום רמדאן מעלות השחר ועד האפטאר |
| 6 | `hajj-journey-map` | `hj-v` | ✓ **נבנה בתיקון הזה** — שבע תחנות | מפת מסע החג' ותחנות העלייה לרגל |

---

## כללים המחייבים כל פרומפט כאן

**אין להציג את מוחמד** — לא את דמותו ולא את פניו. אף פרומפט כאן אינו כולל דמות אדם מזוהה.

**סגנון אחיד לכל השש** — הפלטה של האתר בלבד: שמנת `#fff7e5`, שמנת עמוקה `#f8eed6`, חום `#4c1704`, בורדו `#841b1b` ו-`#4a101e`, זהב `#c79a3c` ו-`#d9b45b`. איור שטוח ומכובד בקו זהב דק, כמו כתב יד מואר — לא ריאליזם, לא תלת-ממד, לא סגנון ילדותי, לא קריקטורה.

**בלי טקסט בתמונה.** `images_generate` נוטה לשתול כותרות. כל פרומפט כאן נגמר בשלילה מפורשת, ואין להשתמש במילים "chapter" או "title" בגוף הפרומפט.

**אחרי הייצור:** לשמור ב-`design/assets/chapter6/`, להמיר ל-WebP, ולהשאיר fallback ב-PNG. לא להחליף את הרכיב האינטראקטיבי — להוסיף לצידו רק אם הוא באמת מוסיף הבנה.

**Negative prompt לכל השש:**

```
text, letters, words, title, caption, watermark, signature, logo, numbers,
human face, portrait, figure of the prophet, depiction of Muhammad,
photorealistic, 3d render, cartoon, childish, clipart, harsh shadows,
neon colours, blue, green, purple, cluttered background
```

---

## 1. `shahada-illustration` — השהאדה

**המסך:** `sh-v` · **מטרה:** להמחיש עדות, קול וכתב · **יחס:** 16:9

```
Flat illuminated-manuscript illustration of Arabic calligraphy as an act of testimony.
A single flowing calligraphic line rendered in deep maroon (#841b1b) on a warm cream
ground (#fff7e5), framed by a thin gold (#c79a3c) rule with restrained corner ornament
in the style of an illuminated Quran page. Faint concentric rings radiate outward from
the calligraphy, suggesting the words being spoken aloud and carried. No readable script —
the strokes are ornamental and abstract. Cream, deep maroon and gold only. Adult, dignified,
scholarly. Even soft light, no cast shadows.
```

---

## 2. `prayer-times-illustration` — זמני התפילה

**המסך:** `pr-v1` · **מטרה:** חמש נקודות הזמן ביום · **יחס:** 16:9

```
Flat illuminated-manuscript diagram of one day as an arc. A gold (#c79a3c) semicircular
dome spans a warm cream field (#fff7e5); five small gold markers sit along the arc at
dawn, midday, mid-afternoon, sunset and night. A stylised sun travels the arc, deep gold
at the top and dim at both ends. Below the arc, a simple flat silhouette of a lone object
with its shadow stretching to exactly its own length at the mid-afternoon marker. The sky
band shifts from deep indigo-brown at the ends to pale warm cream at the top. No text,
no numerals, no figures. Cream, brown (#4c1704), maroon (#841b1b) and gold only.
```

---

## 3. `qibla-direction-map` — שינוי כיוון התפילה

**המסך:** `pr-v2` · **מטרה:** מירושלים למכה · **יחס:** 16:9

```
Flat illuminated-manuscript map on aged cream parchment (#f8eed6). Three cities marked as
small gold medallions in a triangle: one upper right, one lower left, one at centre. From
the centre medallion, two thin directional lines: one faded, pointing up-right; one solid
deep maroon (#841b1b) with a gold arrowhead, pointing down-left — the second clearly
dominant, the first clearly a memory. A restrained ornamental compass rose in gold sits in
one corner. Sparse geography: a few dry contour strokes only, no coastline detail. No text,
no city names, no numerals. Cream, brown, maroon and gold only.
```

---

## 4. `zakat-illustration` — 2.5%

**המסך:** `ch-v` · **מטרה:** 2.5%, נתינה, השפעה על הקהילה · **יחס:** 1:1

```
Flat illuminated-manuscript diagram of a portion leaving a whole. A large gold-outlined
ring on warm cream (#fff7e5), its rim divided into forty fine gold ticks; one single tick
segment is filled deep maroon (#841b1b) — a small, exact fraction, unmistakably minor.
From that filled segment, four slender gold streams flow outward to four small stylised
cream medallions arranged around the ring, each holding a simple flat glyph: a bowl, a
lamp, a small dwelling, an open hand. The ring stays visually whole and calm. No text,
no percentage signs, no numerals, no faces. Cream, maroon and gold only.
```

---

## 5. `ramadan-day-illustration` — יום הצום

**המסך:** `rm-v` · **מטרה:** מהשחר עד האפטאר · **יחס:** 16:9

```
Flat illuminated-manuscript panel of one fasting day, read right to left. A warm cream sky
(#fff7e5) deepens through amber to a dusky maroon (#4a101e) at the far side. A gold sun
rises at the right edge, arcs high, and meets the horizon at the left. Beneath the sunset
point, a low flat table silhouette holds a single date and a cup — the light meal that
breaks the fast — drawn in the same thin gold line. Behind it, the flat silhouette of a
mosque arch with a crescent, quiet and small. Two faint white threads lie at the dawn
edge, one pale and one dark, almost touching. No text, no numerals, no human figures.
Cream, brown, maroon and gold only.
```

---

## 6. `hajj-journey-map` — מסע החג'

**המסך:** `hj-v` · **מטרה:** מסלול העלייה לרגל ותחנותיו · **יחס:** 16:9
**קיים כרכיב** — שבע תחנות ממוספרות על מסלול, מימין לשמאל.

```
Flat illuminated-manuscript route map on aged cream parchment (#f8eed6). A single winding
gold (#c79a3c) path crosses the panel from right to left, passing seven small gold station
medallions. Each medallion holds one simple flat emblem in deep maroon (#841b1b): a plain
seamless white cloth; a cube draped in dark cloth; two low hills with a spring between
them; a bare mount; a night camp under a crescent; three slender pillars; and the cube
again to close the loop. Sparse desert geography — a few dry contour strokes, no detail.
The path reads as one continuous journey with a clear beginning and end. No text, no
numerals, no human figures, no depiction of the prophet. Cream, brown, maroon and gold only.
```
