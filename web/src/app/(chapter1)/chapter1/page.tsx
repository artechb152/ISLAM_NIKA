/* מסך הכניסה של פרק 1 — בתוך מעטפת האתר.

   המסך הזה היה עמוד כהה משלו: מסטהד משלו, רקע משלו, כפתור משלו. מי
   שהגיע מעמוד הפרקים עבר משפה גרפית אחת לאחרת בלחיצה. עכשיו הוא בנוי
   בדיוק כמו דף התרגול של הפרק: אותם גיליונות, אותה מעטפת (PracticeNav),
   אותו באנר. המשחק עצמו — שחייב את chapter1.css כמילה אחרונה — עבר
   ל-/chapter1/play, ולכן הגיליונות של המאמר נטענים כאן בלי לגעת בו. */

import type { Metadata } from 'next'
import '@/styles/chapter6-article.css'
import '@/styles/chapter2-article.css'
import '@/styles/chapter6-practice.css'
import Chapter1Entry from '@/components/chapter1/Chapter1Entry'

export const metadata: Metadata = {
  title: 'פרק ראשון · מסע אל ערב טרום האסלאם',
}

export default function Page() {
  return <Chapter1Entry />
}
