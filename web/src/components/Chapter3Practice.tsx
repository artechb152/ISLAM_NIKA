'use client'

/* Chapter 3's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is.

   Until 11.11.2026 this was the engine again under `p3-*` names, dressed differently from every
   other chapter: options as pills that turned solid maroon, gold-ringed medallion numbers, and
   the seven prophets on chapter 6's place surface. It now looks like the other thirteen; the
   prophets are a numbered match (a name into each numbered place), and the board it stores is
   the same `{n: name}` map it always stored.

   Unchanged: `ch3:practice:v1` = {done, missed, work} (lib/chapter3/practice-progress.ts), the
   `p3-` anchors the rail points at, and `islam:chapter:3 = 'done'` written here and nowhere else —
   again when a finished practice is reopened, as this page always did. */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter3/practice.json'
import { CH3 } from '@/lib/chapter3/content'
import { markChapterComplete } from '@/lib/chapter3/progress'
import { readPractice, writePractice } from '@/lib/chapter3/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter3Practice() {
  return (
    <PracticeEngine
      chapter={3}
      title={CH3.title}
      questions={QUESTIONS}
      art="/assets/chapter3/"
      store={STORE}
      onComplete={markChapterComplete}
      markOnRestore
      back={{ href: '/chapter3#chapter-end', label: 'חזרה לפרק 3' }}
      banner={{ prefix: 'ch3', className: 'p3-banner' }}
      idPrefix="p3-"
      placeBankLabel="הנביאים"
    />
  )
}
