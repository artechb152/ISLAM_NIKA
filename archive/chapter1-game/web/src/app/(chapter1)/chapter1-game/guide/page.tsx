/* דף המלווה של פרק 1 — עמוד אחד לקריאה, למי שלמד במשחק ורוצה את התשובה
   מסודרת לפניו, ולמי שמלמד אותו.

   מחקר הכיתה על משחקים היסטוריים אומר את אותו דבר בכל פעם: המשחק לבד
   מעלה הישגים, אבל משחק עם הנחיה מעלה אותם הרבה יותר. זה הדף שהופך את
   המסע לדבר שאפשר לדבר עליו — השאלה, חמש החוליות, והמסקנה.

   באותה מעטפת ובאותם גיליונות כמו דף התרגול — הכללים של הפרויקט אומרים
   שעמוד חדש נכנס לתוך PracticeNav ולא בונה מסטהד משלו. */

import type { Metadata } from 'next'
import '@/styles/chapter6-article.css'
import '@/styles/chapter2-article.css'
import '@/styles/chapter6-practice.css'
import Chapter1Guide from '@/components/chapter1/Chapter1Guide'

export const metadata: Metadata = {
  title: 'דף מלווה · מסע אל ערב טרום האסלאם',
}

export default function Page() {
  return <Chapter1Guide />
}
