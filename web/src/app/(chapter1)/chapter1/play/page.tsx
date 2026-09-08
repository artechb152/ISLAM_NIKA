/* המשחק עצמו. הכתובת נפרדת ממסך הכניסה כדי שגיליונות המאמר שהכניסה
   טוענת לא יגיעו אל ה-HUD — chapter1.css נשאר כאן המילה האחרונה. מעברי
   השערים בתוך המשחק בנויים על `location.pathname`, ולכן הם נשארים
   בכתובת הזאת מעצמם. */

import type { Metadata } from 'next'
import Chapter1Client from '@/components/chapter1/Chapter1Client'

export const metadata: Metadata = {
  title: 'פרק ראשון · מסע אל ערב טרום האסלאם',
}

export default function Page() {
  return <Chapter1Client />
}
