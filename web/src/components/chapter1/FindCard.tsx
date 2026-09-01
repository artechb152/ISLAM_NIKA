'use client'

/* What you see when you pick something up off the ground.
 *
 * Deliberately not a dialogue bubble: a conversation is somebody telling you
 * something, and this is you looking at a thing. It reads as a page out of
 * Rawi's own notebook — the object named, what it is, and the section of the
 * source it rests on — because that is exactly what it becomes. */

import type { Find } from '@/lib/chapter1/finds'
import { FindView } from './FindView'

export function FindCard({ find, index, total, onClose, onNotebook }: {
  find: Find
  /** how many pieces of evidence are in hand, counting this one */
  index: number
  total: number
  onClose: () => void
  /** opens the notebook this find just went into */
  onNotebook: () => void
}) {
  return (
    <div className="ch1-find" role="dialog" aria-labelledby="ch1-find-title">
      <div className="ch1-find-card">
        <p className="ch1-find-eyebrow">נמצא</p>
        <h3 id="ch1-find-title">{find.title}</h3>
        {/* העדות עצמה, ביד: הדגם שכבר שכב על הקרקע מסתובב מול העיניים,
            וגרירה מסובבת אותו — רואים את שני צידי הדרהמה במקום לקרוא עליהם */}
        <FindView model={find.model} />
        <p className="ch1-find-body">{find.body}</p>
        <div className="ch1-find-foot">
          <span className="ch1-find-count">עדויות: {index} מתוך {total}</span>
          {/* הכפתור הראשי היה כתוב „אל המחברת“ ורק סגר את הכרטיס. כפתור
              שמבטיח יעד ולא מגיע אליו מלמד את השחקן לא להאמין לממשק —
              ולכן עכשיו יש שניים, וכל אחד עושה מה שכתוב עליו. */}
          <button type="button" className="hud-card-btn" onClick={onNotebook}>
            אל המחברת
          </button>
          <button type="button" className="hud-card-btn is-primary" onClick={onClose} autoFocus>
            המשיכו
          </button>
        </div>
      </div>
    </div>
  )
}
