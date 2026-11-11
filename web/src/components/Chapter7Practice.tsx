'use client'

/* Chapter 7's closing practice — the shared engine (components/practice/PracticeEngine.tsx),
   told which chapter it is. Until 11.11.2026 this file was a full copy of the engine.

   `islam:chapter:7 = 'done'` is written here (through markChapterComplete) and nowhere else.
   Every board survives a reload: `ch7:practice:v1` = {done, missed, work}
   (lib/chapter7/practice-progress.ts). The questions live in practice.json with the §§ each one
   rests on.

   A plate whose file starts `cut-` is a cut-out and sits bare on the page (rule 45). */

import PracticeEngine, { type PracticeQuestion } from '@/components/practice/PracticeEngine'
import raw from '@/lib/chapter7/practice.json'
import { CH7 } from '@/lib/chapter7/content'
import { markChapterComplete } from '@/lib/chapter7/progress'
import { readPractice, writePractice } from '@/lib/chapter7/practice-progress'

const QUESTIONS = (raw as unknown as { questions: PracticeQuestion[] }).questions
const STORE = { read: readPractice, write: writePractice }

export default function Chapter7Practice() {
  return (
    <PracticeEngine
      chapter={7}
      title={CH7.title}
      questions={QUESTIONS}
      art="/assets/chapter7/"
      store={STORE}
      onComplete={markChapterComplete}
      back={{ href: '/chapter7', label: 'חזרה לפרק 7' }}
      banner={{ className: 'ch7-practice-banner', mediaClassName: 'ch7-hero-media' }}
      isCut={(p) => p.startsWith('cut-')}
    />
  )
}
