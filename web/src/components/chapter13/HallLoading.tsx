/* פרק 13 · מסך הטעינה של האולם (המשתמשת, 9.11.2026: „מסך טעינה עם התקדמות").
   רכיב תצוגה בלבד, בלי three — כדי ש-Chapter13Client יציג אותו כבר בצבע הראשון, לפני שקוד
   האולם בכלל ירד. FlagHall מציג אותו שוב עם האחוז האמיתי של הטקסטורות, ומעלים אותו בדעיכה
   אחרי שהפריים הראשון צויר. */

export default function HallLoading({ pct, leaving = false }: { pct: number; leaving?: boolean }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className={`ch13-loading${leaving ? ' is-leaving' : ''}`} aria-hidden={leaving || undefined}>
      <div className="ch13-loading-box" role="status" aria-live="polite">
        <p className="ch13-loading-kicker">פרק 13</p>
        <p className="ch13-loading-title">האולם נטען</p>
        <div className="ch13-loading-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} aria-label="טעינת האולם">
          <span style={{ transform: `scaleX(${p / 100})` }} />
        </div>
        <p className="ch13-loading-pct">{p}%</p>
      </div>
    </div>
  )
}
