import Link from 'next/link'

export default function Page() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/logo dark.png" alt="אסלאם" />
      <p>ברוכים הבאים — תוכן האתר ייבנה כאן בשלב הבא.</p>
      <Link className="back" href="/">
        חזרה לכניסה
      </Link>
    </>
  )
}
