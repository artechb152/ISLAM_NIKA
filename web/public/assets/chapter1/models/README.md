# מודלים של פרק 1 — איך מוסיפים מודל מ-Blender / BlenderKit

הדפדפן לא יודע לקרוא `.blend`. כל מודל עובר המרה ל-**GLB** דחוס, וזה עושה
סקריפט אחד.

## התהליך

1. הורידו את המודל ב-Blender (למשל דרך BlenderKit) ושמרו קובץ `.blend`.
2. מהתיקייה `web/`:

   ```bash
   npm run add-model -- "C:\Users\wolft\Downloads\Lantern.blend" lantern
   ```

   הסקריפט מוצא את Blender לבד, מקטין טקסטורות ל-1024px, מוריד פוליגונים
   לתקציב, ושומר `public/assets/chapter1/models/lantern.glb`.

   דגלים אופציונליים:

   | דגל | ברירת מחדל | מה זה עושה |
   |---|---|---|
   | `--objects "Body,Glass"` | כל המשים בקובץ | לייצא רק אובייקטים מסוימים |
   | `--tris 6000` | 9000 | תקציב משולשים לכל אובייקט |
   | `--tex 512` | 1024 | גודל טקסטורה מקסימלי |

3. הסקריפט מדפיס בסוף בדיוק את השורות להדביק ל-`src/components/chapter1/Game.tsx`:
   הצהרת הקבוע, התוספת ל-`useGLTF.preload`, והשורה לטבלת `CAMP` — כולל רדיוס
   ההתנגשות המדוד של המודל.

4. אחרי ההדבקה:

   ```bash
   npm run check-camp
   ```

   הבדיקה מודדת את הטביעה האמיתית של כל מודל מקובץ ה-GLB ונכשלת אם משהו חופף
   למודל אחר, חוסם נקודת עניין, או שמסלול גמל עובר דרכו. `npm run measure-props`
   מציג את הטבלה המלאה של המידות.

## כללים

- **גובה במטרים.** `h` בטבלת `CAMP` הוא הגובה האמיתי במטרים; שאר הממדים
  נגזרים ממנו. אוהל ≈ 2.2, דקל ≈ 5, כד ≈ 1.
- **הכול תחת `/assets/`.** סקריפט ה-postbuild מתקן נתיבים לפריסה ב-GitHub Pages
  רק עבורם. קובץ GLB חייב להיות self-contained (טקסטורות מוטמעות) — מה שהסקריפט
  מייצר.
- **תקציב.** יעד: עד ~2MB לקובץ. אם קובץ יוצא גדול, הריצו שוב עם `--tex 512`
  או `--tris 5000`.
- **אנימציות** לא מיוצאות (`export_animations=False`). מודל עם שלד דורש טיפול
  נפרד — ראו `useWalkingCamel` ב-`Game.tsx` לדוגמה של מודל שפוצל לחלקים
  ומונפש בקוד.

## מה יש כאן היום

| קובץ | מקור |
|---|---|
| `canyon.glb` | Canyon Desert Landscape (Blender של המשתמשת) — הקרקע כולה |
| `tent2.glb`, `firepit.glb` | מתוך `FIRE AND TENT.blend` |
| `torch.glb` | מתוך `TORCH.blend` (Medieval Torch Stand) |
| `camel.glb`, `camel-parts.glb` | נוצר מתמונה; `-parts` מפוצל לגוף+4 רגליים לאנימציית הליכה |
| `traveler-stand.glb`, `traveler-stride.glb` | שתי תנוחות של דמות השחקן |
| `palm.glb`, `well.glb`, `rocks.glb`, `jars.glb`, `firewood.glb`, `shrub.glb` | נוצרו מתמונות רפרנס |
