/* THE SUCCESS OPENER IS ONE WORD: „נכון".

   The questions' `ok` lines open „נכון." / „כן —" / „בדיוק." / „כן," — four ways of saying the
   same thing. The word is now said once, by the mark in front of the line (✓ נכון), on every
   practice including chapter 6's. Only the opener goes; the explanation after it is the
   question's content and is printed whole. An `ok` that does not open with one of the three
   words followed by punctuation is printed unchanged. */
const OPENER = /^(?:נכון|כן|בדיוק)(?:\s*[.,:]\s*|\s*—\s*)/

export const okBody = (ok: string): string => ok.replace(OPENER, '')
