'use client'

/* The Badr film — chapter 4's one narrated film.

   THIS IS CHAPTER 6'S PLAYER, NOT A COPY OF IT. StoryFilm now takes its asset,
   its cues and its title card as props and keeps chapter 6's own values as the
   defaults, so both chapters render the same markup through the same component
   and the same stylesheet: the same 16:9 frame, the same subtitle plate, the
   same big play button, the same scrubber row and control bar. There is no
   second implementation left to drift.

   THE NARRATION IS THE SOURCE. It reads section 03 word for word, and the
   subtitles are those same sentences split at their own clause boundaries —
   scratchpad's cue builder refuses to emit film-cues.ts unless the pieces join
   back into the exact sentence, so no word can fall between two subtitles.

   NOTHING AUTOPLAYS. The film has a voice; a voice that starts on its own in a
   reading page is an ambush. It waits for the reader. */

import StoryFilm from '@/components/chapter6/StoryFilm'
import { FILM_CUES } from '@/lib/chapter4/film-cues'

export default function BadrFilm() {
  return (
    <StoryFilm
      src="/assets/chapter4/badr-battle.mp4"
      poster="/assets/chapter4/badr-battle.jpg"
      captions="/assets/chapter4/badr-battle.vtt"
      cues={FILM_CUES}
      title="בדר"
      titleFrom={0.3}
      titleTo={4.5}
      /* chapter 6 lifts "זהו המלאך גבריאל" out of its plate into the full frame;
         this film's own turning line gets the same treatment */
      reveal="ישועה וניצחון"
      label="הסרט על קרב בדר"
    />
  )
}
