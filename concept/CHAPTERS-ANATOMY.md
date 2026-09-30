# How the chapters are built: chapters 6, 2, 5, 4

*Written for: me (Claude), before building or changing any chapter. It is based on a full survey of the code, the concept docs and the rendered pages at 1440 / 820 / 390, with reduced motion and with JS off. Surveyed 29.9.2026.*

**Read with `BUILD-RULES.md`.** That file holds the numbered rules. This one describes what the chapters actually do, and where they disagree with the rules and with each other.

---

## 0. Which chapter is the authority for what

| Question | Follow | Why |
|---|---|---|
| Visual language, shell, shared devices, rhythm of a page | **Chapter 6** | `chapter6-article.css` is the design system. Every chapter loads it first. |
| Article rules: text pipeline, gates, one sentence = one source, section shape | **Chapter 2** (and 5) | They built the passages → layout → gate pipeline. Chapter 6 predates it. |
| A lean, recent, rule-abiding article | **Chapter 5** | Newest; written against BUILD-RULES; removed devices rather than add them. |
| Anything | **Not chapter 4** | CLAUDE.md: "לא גמור, לא לסמוך ולא להעתיק". BUILD-RULES §0 says the same. Describe it; don't copy it. |

When two chapters disagree, chapter 6 wins on look and chapter 2/5 win on content handling. Chapter 4 is never the tiebreaker.

---

## 1. The shared skeleton (every article chapter)

### Route and CSS order
- Each chapter is its own route group `(chapterN)`. Its `layout.tsx` owns `<html lang="he" dir="rtl">`, so tokens can't leak between chapters.
- CSS load order is always:
  1. `fonts.css`
  2. `chapter6-article.css`
  3. `chapterN-article.css`
  4. `site-notebook.css`
- The practice page adds `chapter6-practice.css`, then `chapterN-practice.css`.
- ⚠ The chapter sheet leaks into the practice page, because both share one layout. Chapter 5's `--measure:640px` narrows practice options to 640.
- ⚠ `chapter2-article.css` is also imported by chapter 1's pages, so its global `html{…}` rules apply there too.

### Shell
Chapter 6's markup. It is copied by hand into each chapter, and a shared module is still owed.

```
.chapter-page
  MarkToNotebook ch={N}                    floating "הוספה למחברת" on text selection
  header.chapter-site-header               sticky, 56px (--header-height; 52 at ≤920), flat --maroon-deep
    .chapter-burger                        ≥1024: collapse rail (localStorage chN:side-collapsed); <1024: open drawer
    .chapter-logo                          logo-cream.png → /chapters
    ChapterSearch                          components/chapter6/ChapterSearch.tsx
  .chapter-shell
    aside#chapter-menu.chapter-drawer      ≥1024 sticky rail on the RIGHT, 300px (76px collapsed, numbers only)
      .menu-head  (p.menu-title "תוכן הפרק" — a <p>, so no h2 precedes the h1) + .menu-sub
      nav.chapter-menu-nav ol > a (.menu-num 01.. · .menu-label · svg.menu-done tick · .is-current)
      .menu-extra > .menu-x-item "לכל פרקי הלמידה"
    .chapter-scrim (mobile)
    .chapter-content > .chapter-layout > main.chapter-article
```

- `.chapter-layout` has padding `42px var(--content-gutter) 90px`, where `--content-gutter` is `clamp(28px,4vw,64px)`.
- At 1440 the article column is **1025px wide at x=58**. Measure against that.
- Below 1024 the drawer is off-canvas, with scroll lock, Esc, focus trap, and `inert` + `aria-hidden` when closed.
- **The rail lists main sections only** (rule 29). All chapters have followed this since 29.9.

### Banner (hero)
It sits inside section 01, not above it. It is the only `<h1>`.
- 370px tall (300 at ≤680). It bleeds into the gutter with `margin-inline: calc(-1*var(--content-gutter))` and `margin-block-start:-42px`.
- The media box has the poster as a CSS background, with `video` (autoplay/muted/loop/playsInline, `tabIndex -1`) on top.
- Veil: a flat scrim, `::after rgba(30,18,8,.55)`.
- Title: cream, Kedem 900, `clamp(42px,4.5vw,70px)`. No eyebrow line such as "פרק חמישי"; chapter 6 has none.
- Reduced motion hides the video. The poster must still show. ⚠ Chapter 4's banner turns solid maroon because it has no fallback.
- ⚠ The `-42px` is tuned to desktop padding. At ≤680 the banner slides about 24px under the header (seen in chapter 6).
- The banner asset must be bright, because it sits under a 55% veil. Chapter 5 adds `sepia(.16) saturate(1.12)`.

### Sections
- `section.article-section#id` with `aria-labelledby`.
- Between sections: `margin-top` = `padding-top` = `clamp(46px,6vw,84px)`, plus `border-top:1px solid var(--rule)`.
- **Section head:**
  ```
  header.section-heading[data-reveal] > div > h2
    + optional span.section-term
    + .title-ornament.section-ornament
  ```
  - `h2`: Kedem 900, `clamp(34,4vw,56)`, 56px at 1440, `--maroon`.
  - `span.section-term`: the Arabic term in `"Segoe UI",Tahoma`. Chapter 5 puts years here instead, with `dir=ltr`, because RTL flipped "632–634".
  - The ornament is two hairlines around a diamond, `min(360px,60%)`.
  - **Every heading has exactly one diamond, and there are no diamonds anywhere else.**
- **Sub-head:** `h3.scrolly-env` (chapter 6's name; chapters 2, 3 and 4 restate it as `.ch2-sub`, `.ch4-sub`).
  - Kedem, `--sub` (27px), maroon, with a 2px underline `rgba(138,39,51,.3)`, `width:fit-content`.
  - No ornament.
- Sections are few and fat: one per person or topic, with sub-headings inside. Chapter 2 has 7, chapter 5 has 6, chapter 6 has 7, chapter 4 has 8.
- Keep the source document's order.

### Reveal
- JS adds `.js-reveal` to `main`. An IntersectionObserver (rootMargin `-6%`) toggles `.is-inview` on `[data-reveal]`.
- The effect is opacity 0 plus `translate:0 22px`, returning to `0 0`. It reverses when scrolling back.
- It is armed only after JS mounts, and never under reduced motion. So no-JS and reduced motion always show everything.
- ⚠ Never put a state className on an element that also carries `[data-reveal]`. React rewrites the class, `.is-inview` disappears, and the element fades to 0 when clicked (bitten in chapters 3 and 4). Put the state class on an inner element.
- ⚠ A `translate` on a `[data-reveal]` element is erased by `.is-inview{translate:0 0}`. Put it on a child.
- ⚠ Measure positions only after the reveal settles, because the 22px offset is fake.

### Reading progress
Each chapter has its own `lib/chapterN/progress.ts`. The key is `chN:v1` = `{sections, section, completed}`.
- A centre-band observer (rootMargin `-42% 0 -42% 0`) sets the current section and saves the resume point.
- A completion observer (bottom `-35%`) credits the **previous** section when the next one enters.
- `jumpUntil` stops crediting for 1.5–2s after a menu jump or a resume.
- ⚠ A search jump or a scrollbar drag still credits sections the reader skipped (verified in chapter 6). This is a known, open gap.
- `#chapter-end` (or `endRef`) coming into view calls `markContentComplete()`. Its observer needs a **pixel** margin (`-24px`); `-20%` can never fire.
- Resume goes to the **start** of a section, never into the middle of an animation. It is skipped on a first visit and when the URL has a hash (the hash wins).
- `islam:chapter:N='done'` is written **only by the practice page** (`markChapterComplete()`).
- `ChaptersScreen.tsx` must have a branch for the chapter (rule 74; missed in chapters 5 and 4). The percentage is capped at 99 until the practice is done.

### Closing block
Rule 33. The block is identical in every chapter:
```
div.chapter-end#chapter-end[data-reveal]
  Link.chapter-end-back "לתרגול המסכם" → /chapterN/practice      maroon-deep pill, cream Kedem
  span.chapter-end-done "הושלם"                                  gold chip; read in useEffect (hydration)
```
- There is deliberately **no second button** ("לכל הפרקים"). A way out beside the way on invites leaving early. The logo and the rail already lead out.
- Every chapter follows this since 29.9. The practice's back link lands on `/chapterN#chapter-end`.

---

## 2. Visual language

### Tokens
One `:root`, in `chapter6-article.css`. A chapter sheet declares no colour, font or radius.

| Token | Value | Use |
|---|---|---|
| `--panel` | `#f3ead6` | the page background (measured `rgb(243,234,214)`) |
| `--paper` | `#EDE4D0` | **cards** (rule 36). Chapter 6's own cards use `--panel`, which predates the rule. |
| `--mat` / `--surface` / `--cream` | `#f5ecd6` / `#faf4e6` / `#f5ecd6` | insets and lifted surfaces. Never a card. |
| `--edge` | `#d8c7a3` | 1px frame on cards and photos |
| `--rule` | `rgba(87,24,32,.14)` | section dividers |
| `--maroon` / `--maroon-deep` / `--stamp` | `#8a2733` / `#571820` / `#a5322f` | headings / emphasis, buttons / errors, current search hit |
| `--gold` / `--gold-soft` / `--gold-text` | `#c79a3c` / `#d9b45b` / `#856016` | frames, rings / light-on-dark accents / transliteration |
| `--ink` / `--muted` | `#3c2c1d` / `#6f5c43` | body text / secondary |
| `--shadow` | `0 8px 22px rgba(60,35,18,.10)` | the one shadow (chapter 6 itself has dozens of ad hoc ones) |

- **Fonts:** `--font-heading` Kedem (never lighter than 700; names, titles and quotations only), `--font-body` Ploni (sentences). Arabic uses `"Segoe UI",Tahoma`.
- **Type scale:**
  - `--read` `clamp(18px,1.55vw,20px)`: 20px, line-height about 1.85 (37px).
  - `--sub` `clamp(21,2vw,27)`.
  - `--emph` `clamp(23,2.4vw,31)`.
- **No white, ever** (rule 34). Test by neutrality (blue ≥ red), not brightness. Chapter 6 still uses `#fff` in film captions and search hits; don't copy that.

### Layout tokens are NOT in the shared sheet
Each chapter declares its own on `.chapter-article` or `:root`, and the numbers differ.

| Token | ch2 | ch3 | ch4 | ch5 | BUILD-RULES |
|---|---|---|---|---|---|
| `--flow` | `clamp(24,2.6vw,34)` | same as ch2 | same as ch2 | 14px | 14 |
| `--flow-lead` | `clamp(32,3.8vw,48)` | ch2 | ch2 | 56px | 56 |
| `--flow-part` | `clamp(44,5.2vw,66)` | ch2 | ch2 | 86px | 86 |
| `--flow-tight` | `clamp(14,1.8vw,20)` | ch2 | — | 14px | 14 |
| `--measure` | 880px | 100% | 880px | 640px | — |
| `--lh` | 1.82 | 1.82 | 1.7 | (p 1.85) | 1.85 |

- Chapter 6 uses literal widths instead: `min(760px,100%)` is its reading measure; `.prayer-block` is 1120px, `.content-block-wide` 850px, the film 760px.
- ⚠ `.bleed-aside.is-flipped` uses `var(--lh)`, which exists only in chapter sheets. It is undefined on chapter 6's own page.
- **One rule owns all spacing between blocks** (`.article-section > * + *{margin-top:var(--flow)}`, or the chapter's equivalent). **Devices never carry their own outer margin.** Chapter 4's first build was 2,000px taller than chapter 6 because every device added margin.
- Paragraph to paragraph is about 12–16px.
- **Prose runs the full column.** Non-prose blocks are narrower and centred (chapter 5: quote 660, claims 880, axis 760, verdict 700). "The alternation is the rhythm; one measure everywhere is the absence of one." (rule 48)

### Alignment
- Prose and headings start at the reading edge (right).
- Ceremonial and symmetric items are centred: the pillars statement, the testimony, the blessing, the verdict, map hints, the end block.
- Never centre running text (the chapter 2 audit fails on it).

### Emphasis
- `.key` = 700 + `--maroon-deep`. It marks the idea the sentence turns on. **Almost every paragraph has one.**
- Transliteration uses `--gold-text` (chapter 5 `.ch5-tr`, chapter 4 `.ch4-tr`). Rule 38: gold for transliteration, maroon for emphasis. Chapter 2 breaks it by giving terms maroon.
- The phrases come from data (`em[]`, `tr[]`), must be substrings of the text, and are checked by the gate: emphasis is a claim.
- Phrases of three words or fewer are bound with NBSP so a name never breaks across a line.
- ⚠ `emphasise()` fails silently when a phrase doesn't match (chapter 4 §57 has straight vs curly quotes). `pick` and `mapLabel` throw instead, which is the better pattern.
- Scroll-lit `mark.wmark` (gold background, maroon underline) is used only inside Scrolly cards.

### Images: the registers and how each is set

| Register | Treatment | Where |
|---|---|---|
| **Watercolour cutout** (transparent) | On the paper: no frame, no caption, `aria-hidden`, bleeds into the gutter, soft mask | ch6 minaret and hands; `.bleed-aside` (ch4 ×2, ch3 khadija and birth); ch2 `arbiter.webp`; ch3 elephant |
| **Photograph of a real thing** | **Framed**: radius 14, `1px --edge`, `--shadow`, `sepia(.18) saturate(1.1) contrast(.97)` (none under `prefers-contrast:more`); real alt text plus a figcaption (15px, `--muted`) | ch2 `.ch2-photo` (Maqam Ibrahim, Kaaba); ch3 `.ch3-doc` (Hamas poster); ch4 `.ch4-photo` |
| **Painted map / atlas** | Radius 14–16, border painted into the art; pins, labels and legend in the DOM; **no text in the painting** | ch6 qibla and hajj; ch2 peninsula; ch5 conquest; ch4 stage |
| **Full-bleed ground** | Banner video; full-screen Scrolly stages | every banner; ch6 prayer day; ch5 map; ch4 Khaybar; ch2 desert |
| **Painting in a card** | Flush 4:3 at the top of a `--paper` card, clipped by it | ch2 trait cards, ch5 claims, ch4 Uhud cards |

- The article prints **no captions on paintings**, only on photographs.
- Faces are hidden or veiled, and the prophet is never drawn. Massacre passages get no device and no picture (chapter 4 `.ch4-quiet-body`).
- Every generated asset gets a second pass to remove lettering, because the generator ignores "no text" the first time.
- Cut out the background using the mode colour sampled around the frame. Fade, don't cut, where the subject runs off the edge.

### Quotations
Quotations have separate voices, told apart by axis and frame. Not every quote gets the same card.
- **The illuminated gold frame** (chapter 6 `.shahada-quote`, copied as chapter 4 `.ch4-verse`):
  - 1.5px `--gold`, 16px radius, inset gold ring, cusped corners, Kedem 700 `--maroon-deep`.
  - The rule is "a costume worn twice; the audit fails at three". Chapter 4 wears it four times, at the user's request.
- **Centred verse between gold rules** (chapter 2 `.ch2-verse`, chapter 5 `.ch5-quote`, chapter 3 `.ch3-verse`): `border-block:1px --gold(-soft)`, Kedem 700, centred, 660px.
- **A saying at the reading edge, type only** (chapter 2 `.ch2-saying`).
- **A display statement** (chapter 2 `.ch2-statement`, max 35px): the chapter's turn, used once.
- **Arabic** (`.arabic-quote`): large maroon type, with `lang`/`dir` on the element.
- A Quran verse printed *inside* a sentence in the source stays inline in the prose.

### Buttons and selection
- Pills are `999px`. The primary one is `--maroon-deep` with cream text; the secondary is `--mat`/`--panel` with a `--edge` border and maroon text.
- The selected state is always a maroon fill on cream.
- Hover rules need `:not(:disabled)`, or they override `.is-right`.

---

## 3. Content pipeline (chapters 2, 3, 4, 5; chapter 6 predates it)

```
source.pdf → SOURCE-TEXT.md (§N verbatim) → DECISIONS.md → passages.json + layout.json → component → practice.json
```

**`passages.json`:** `{number,title,menuTitle,passages:{"§N":[Fragment]}}`

A Fragment is:
- `{id, text}`
- optionally `list`, `name`, `term`, `em[]`, `tr[]`
- `page`: an approved rewording that is printed instead. The source `text` stays beside it, and the gate lists every `page`.
- `omitted:true` + `$note`: never deleted, and never consumed.

**`content.ts`:**
- `text(ref)` returns `page ?? text`.
- Also `frag`, `list`, `nameOf`, `termOf`, `allRefs`, `CHN`.
- They all **throw** on an unknown ref.

**`layout.json`:**
- Sections with `id`, `title`, `subs`, `device`, `$note`, and `slots` (the refs each section consumes).
- It also holds editorial strings: sub-heading titles, card titles, captions, pin labels, link labels.
- Facts about the data live here as data (chapter 5 `reign:true`), never found by regex.

**The component never writes a sentence** (rule 23). It references `§N.id` in JSX and joins adjacent fragments into one paragraph (about 16–19 words). Syntax:
- `(§x.y)` folds a fragment into the sentence before it as a parenthetical.
- `|§x.y` puts a fragment on its own line.
- Lists become `span.chN-item` rows with a 6px maroon dot, inside one `<p>`.
- Split points and labels are cut out of the source string at word boundaries and **throw on drift** (chapter 2 `DANGER_PARTS`, `mapLabel`; chapter 4 `pick`).
- UI strings (aria labels, "להרחבה", button text) may be written in the component. Captions and labels belong in `layout.json`.

**`verify-chapterN.mjs` checks:**
1. **Fidelity:** every `text`, `name` and `list` is in SOURCE-TEXT, with punctuation stripped.
2. **Coverage:** every § has a fragment.
3. **Once:** every non-omitted fragment is consumed exactly once across `layout.json` slots.

⚠ The gate walks **layout.json, not the TSX**. A fragment the TSX drops or prints twice is not caught. Chapter 2's `audit.mjs` is the only live-page presence check, and it is currently red (centred `.ch2-fork-head`) and hard-coded to a Windows Chrome path.

**Text behind a click must stay in the DOM** (`<dialog>`, `<details>`, or CSS-hidden siblings), so the gate and search can see it. Offenders: chapter 4 `Groups` (only the selected sentence exists) and chapter 2 stage beats (`aria-hidden` sizer, so unsearchable).

**Chapter 6's content** is `lib/chapter6/data.ts` (`CH6.screens`, 44 screens), read through `screen(id)` and `para(id,i)`. It is traced to the author's document through `concept/chapter6/CONTENT-DIFF.md`, not verified by a gate. There are two retyped places: the shahada intro, and the five prayer steps, which still show the **old** Asr text. Its practice labels are checked by `web/scripts/check-summary-sources.mjs`.

---

## 4. Device catalogue: what exists, how it's driven, the verdict

**Principle: scroll for sequences, click for structure.**
- A multi-state device labels every state (rule 58).
- A device that only illustrates its own caption is furniture and gets deleted (chapter 5 removed its Quran plate, snake and bay'a poster).
- "Workbook" diagrams are refused (chapter 5's authority chain and status classes; chapter 4's three "today" diagrams). What was missing was usually a painting.
- There are no checks inside the chapter. Questions live on the practice page.

### Scroll-driven
- **`Scrolly` engine** (`components/chapter6/scrolly.tsx`), used by chapters 6, 5 and 4.
  - `<Scrolly art full>` gives a sticky `.scrolly-stage` (`100dvh − header`, full-bleed), with `.scrolly-step`s riding over it in `.stage-card` (`min(440px,86%)`), each step `min-height:74vh`.
  - State is `{step,t}` from the step top crossing 52% of the viewport height. It is a pure function of scroll, so it rewinds and never locks scrolling.
  - The listener attaches only within 260px of the viewport.
  - Opacity eases by distance; there is no per-frame translate (it broke snapping).
  - `P` lights `mark.wmark` phrases at thresholds.
  - Reduced motion computes the same states instantly, with steps at opacity 1.
- **Chapter 6 prayer day:** 5 photos from dawn to night cross-fading on `step+t`, a dark radial veil, white centred text, feathered paper gradients at entry and exit, and a "גללו לאורך היום ↓" cue.
- **Chapter 5 ConquestMap:**
  - The map is the stage. Medina is a hollow origin pin; four conquest pins light up at `(i+1)/5`, the same thresholds as the words in the card.
  - A dashed arm grows from Medina to each conquest: "four labels lighting up is a decorated map, not an empire expanding".
  - `windowFor(aspect)` recomputes the `object-fit:cover` window so pins stay put.
  - The plate is `dir="ltr"` with `left`/`top`. ⚠ On a 390px phone the crop hides Egypt.
- **Chapter 4 TribesStage** (a description, not a model):
  - The camera is a function of scroll: it holds while the text is read and moves only in the last 45% of each step.
  - Painting swaps are zooms, not dissolves (`K=1.7`), all paintings share one dusk grade, and pins are DOM text counter-scaled.
- **Chapter 6 opening film fade:** `.film-wrap` goes to opacity .5 and scale .96 as it leaves the view.

### Click-driven
- **Chapter 2 DesertStage** (the model click stage):
  - 10 beats over 7 frames of one composition, all in the DOM, cross-faded.
  - Chosen as click because the section lists named *states* of one place, not a passage of time.
  - Controls never move: an invisible `.ch2-stage-sizer` holds every beat in the same grid cell.
  - A full-scene advance button, prev/next, dots (44px on coarse pointers), and ←/→ only while focused.
  - `aria-disabled`, not `disabled`, at the ends (keeps focus). Functional state updates (forty fast clicks once advanced one beat).
  - The hint reserves its box after it hides. The short-screen CSS block sits last so it wins.
- **Chapter 2 trait cards + `<dialog>`:**
  - `--paper` cards with a 4:3 painting, a real `h3` with a button whose `::after` covers the card, and a chevron.
  - `showModal()`; the page is locked behind it (`html:has(dialog[open]){overflow:hidden}` + `scrollbar-gutter:stable`), otherwise the progress observers mark the whole chapter read.
  - On mobile they become a sideways scroller with snap.
- **Chapter 4 `More`:** a "+ להרחבה" pill that opens a real `<dialog>`, with content in the DOM.
- **Chapter 2 PeninsulaChart:** two `aria-pressed` layer buttons over a painted map. Labels are SVG text on `textPath`, pulled from the source by `mapLabel`.
- **Chapter 6 RamadanTimeline:** a tablist of medallions with a moving stem pointing to one card. Year labels were removed on purpose, because the source puts 610 after 622. ⚠ The icons never render.
- **Chapter 6 HajjRouteMap:** 6 numbered pins; a click opens a `role=dialog` bubble that flips its quadrant. Focus moves to close; Esc returns focus to the pin.
- **Chapter 4 Groups:** four medallions on one measured circle with a real ARIA tablist (RTL arrows). ⚠ It hides three of the four sentences from the DOM.
- **Chapter 4 Pact:** a before/after crossfade on one `<button aria-pressed>`, plus a decorative switch, because "nobody found" the tap target.
- **Fold-outs** (`.story-toggle` → `.story-reveal`, chapter 6 and chapter 4; `Note` in chapter 3): closed content stays in the DOM, `inert`/`aria-hidden` while closed.
- **Chapter 3 comic** (section 05): see CLAUDE.md. It is the chapter 3 book's page (`PageView`), four scripted pages, and a **Hebrew page turn** (the left leaf swings right). The chapter 3 book itself turns like an English book.

### Static and structural
- **`.bleed-aside`** (shared sheet): a cutout beside prose.
  - ≥900 it is a grid `minmax(0,1fr) clamp(320px,44%,540px)`, with both children pinned to `grid-row:1`.
  - The art is `position:relative`, with an absolute `object-fit:contain` image and a height floor `clamp(520px,72vh,880px)`.
  - The body is centred; `.is-flipped` swaps the sides. Alternate sides between uses.
  - Below 900 the art is removed, so nothing that must survive on mobile can go in it (chapter 4 deed).
  - ⚠ The **reduced-motion bug** is still in the shared sheet: `.bleed-aside-art{position:static}` makes the image cover the section. Chapter 3 patches it locally; chapter 4 is broken (verified 1024×4566).
- **Chapter 6 shahada / charity heroes:** cutout plus body, `min-height:clamp(560px,72vh,700px)`, centred, with `scroll-snap-align:center`. Snap is `proximity` only, never `mandatory`.
- **Chapter 6 pillars path:** a 5-column grid on a hairline, with icon, name and a hover-peek verb (its space reserved). ⚠ On a 390px phone it is a sideways scroller showing two of five, with no cue that more exist.
- **Chapter 5 Claims:** two **equal** `--paper` cards. There is no "pick a side": unequal space would itself be an argument.
- **Chapter 5 ReignAxis:** HTML bars where the bar *is* the duration (no track, the number at the end, a sub-heading saying what is measured). ⚠ It is not truly proportional, because the name column width varies per row.
- **Chapter 5 Lineage:** a painted genealogy with DOM names placed from a 5%/2% grid. A horizontal marriage line (a vertical line would have said "Fatima's son").
- **Chapter 2 fork:** a tree of two meanings from one term.
- **Chapter 4 Deed:** a contract written on painted parchment, sized in `cqw` (padding on an *inner* box).
- **Films** (`StoryFilm`, chapter 6, and chapter 4's `BadrFilm`):
  - A custom player with styled HTML captions from a cue array, a VTT track for assistive tech only, and a title card in the site font.
  - A "reveal" cue lifts one line to full frame.
  - Controls sit in a `dir="ltr"` bar. Nothing autoplays when there is a voice.
  - The written fallback is the story drawer.
- **ChapterSearch:** find-in-page with the CSS Custom Highlight API.
  - It skips `[hidden],[inert],[aria-hidden=true]`.
  - It opens a closed `<details>`/`<dialog>` only on Enter or the arrows, never while typing.
  - ⚠ It moves no focus and fires no event. Hidden content that must reveal itself uses `lib/chapter3/useFindHit.ts`, which reads `CSS.highlights` on the scroll the search performs.

---

## 5. The practice page

Chapters 2, 4 and 5 share one model; chapter 6's is richer.

- **Shell:** `PracticeNav` (`components/chapter6/summary/PracticeNav`). It re-renders the masthead and rail. The end slot is a "חזרה לפרק N" pill, and the rail holds one row per question with a tick.
  - **The rail ticks are the only progress display.** No score, no bar, no percentage ("לא להציג ציון מספרי").
- **Banner:** the chapter's banner **still, without the video**, with h1 "התרגול המסכם" (chapter 6: "תרגול מסכם").
- **Lead:** "{title} — N שאלות…". The count is derived from `QUESTIONS.length` (rule 32; chapter 2 still hard-codes "שמונה").
- **Each question** is `section.article-section.p2-q` with the article's full section heading (`.p2-q-n` number + the prompt as `h2` + the diamond), then `.p2-work`. `.has-plate` adds a 320px picture column that reuses a chapter asset.
- **Question types** (chapters 2, 4, 5):
  - `single`/`multi`: `.p2-option[aria-pressed]` buttons, then "בדיקה".
  - `match`/`situations`: tap a chip to hold it, tap a slot to place it, tap a filled slot to return the chip. **No `<select>`.** The held chip is kept in a ref as well as state (a same-tick race).
  - `order`: ↑/↓ buttons.
  - Deterministic shuffle.
- **Feedback:** the question's own `ok`/`retry` text. No failure state: a question stays open until it is solved.
- **Chapter 6** has one pick-and-place engine (`SlotSurface`) with layouts `row`, `line`, `map` and `sentence`:
  - Drag or tap; the keyboard uses Enter/Enter/Esc.
  - A wrong placement returns the chip and shakes the slot. The second miss opens a hint directly under the feedback.
  - A "beat" follows each exercise.
  - The practice uses **no `data-reveal`** (automated checks once ran against opacity-0 elements) and **no cards**, per "יותר מדי כרטיסיות". The gold ring appears exactly once.
- **Persistence:**
  - Chapter 6 (`ch6:practice:v1`) and chapter 4 (`ch4:practice:v1`, including partial boards, remounted via a `ready` key) persist answers.
  - Chapters 2, 3 and 5 do the same since 29.9. ⚠ Pass `key` directly on the element, never inside a spread; React refuses it. Seed `state` from `solved` so a solved board reopens solved.
- **Completion:** `markChapterComplete()` → `.p2-done` / an end block. Chapter 4's end block links back to every section and to the missed questions.
- **Question content rules:**
  - Labels and decoys are substrings of the chapter. Decoys are plausible phrases met elsewhere in the chapter.
  - No question whose answer sits beside it or is in its own name.
  - No arithmetic, and no year or count the source doesn't give.
  - A digit on a slot means order; order-free exercises carry no digits.
  - ⚠ Practice questions go stale when the chapter text changes (chapter 2 "ancestors" and chapter 4 "versions" both do). Re-check the practice after every content change.

---

## 6. Traps: RTL and technical (each one cost real time)

**RTL and geography**
- `inline-start` is the RIGHT, the reading edge; `inline-end` is the LEFT, the outer edge where art bleeds. In an RTL grid the first child lands on the right.
- **Geography is physical.** Maps and plates use `dir="ltr"` with `left`/`top`; `inset-inline-*` mirrors the map (chapter 5 put Qadisiyya on the Nile). Labels inside stay RTL.
- **UI direction:** ← goes forward and → goes back. Sliders in a film bar are `dir=ltr`. Chevrons and arrows are traps; use physical borders.
- **A book turns the Hebrew way:** the reader finishes the right page, then the left, and turns the LEFT leaf to the right; the left half of the book advances.

**Grid and layout**
- **Grid auto-placement never walks backwards.** If the element written first sits in column 2, state `grid-row:1` on both (`.bleed-aside`, chapter 4 deed).
- `height:100%` on an image in a stretched grid item is circular. Take the image out of flow (`position:absolute`).
- `cqw` resolves against an ancestor. Put padding on an inner box.
- An overlay must box the image, not the `figure`, or the caption shifts every pin.
- Use `overflow-x:clip`, never `hidden`, on `html`/`body` (hidden kills `position:sticky`). The sticky rail uses `overscroll-behavior:auto`.
- Breakpoints over a column narrowed by the rail should be set by the measured column width, not the viewport (chapter 2: 1660, 1700, 1300, 1200, 780). Chapter 4 Groups deliberately uses the window.

**CSS specificity and ordering**
- **A media query adds no specificity.** A reduced-motion override needs the same descendant specificity as the rule it overrides (the chapter 2 hero video kept playing).
- `.chapter-article .article-section > * + *` (0,2,0) silently overrides bare device classes.
- `[hidden]` must beat `display:grid`.
- **Class names share one flat namespace.** `.ch4-scale` and `.ch4-stage-dot` collided with dead rules. Grep a class before naming one.
- CSS source order matters. After a bulk delete, check `git diff --stat` (one script deleted 303 lines including a whole stage).

**React and hydration**
- Hydration: round inline floats with `toFixed(4)`. Read `localStorage` in `useEffect`.
- Use functional updaters for relative state. No side effects inside a state updater (the React compiler fails).

**Text and assets**
- Put a space after every `<br>`/block, or `textContent` fuses words and skews search and the audit.
- `lang`/`dir` on every Arabic line.
- Multiply blending warms paintings; use transparent webp.
- A regenerated plate means every coordinate on it is re-measured.

---

## 7. Checklist before shipping a section or device

1. Is it in chapter 6's language? Tokens only, no hex, cards on `--paper`, no white.
2. Does it follow the flow rule, with no outer margin on the device? Measure it against chapter 6 at 1440 (column 1025 at x=58).
3. Is every string from data (`§N` through `text()`), with labels throwing on drift?
4. Do `verify-chapterN.mjs` and `tsc` pass?
5. Is hidden text still in the DOM, and does search reach it and reveal it?
6. Does it work with no JS, under reduced motion (the `.bleed-aside` trap), and at 820 and 390? Is anything clipped?
7. RTL: reading edge, forward direction, geography physical.
8. Take a screenshot after every change; a green gate is not proof. Measure after the reveal settles.
9. Does the practice page still match the text?

---

## 8. Status after the 29.9 fix round

The survey's issues were fixed across all chapters on 29.9. Every gate is green (verify 2/3/4/5, ch4 structure and source, ch5 source, ch6 summary sources, the ch2 audit), and so are tsc and eslint (0 errors). A smoke run over 14 pages at 1440 and 390 showed no errors and no horizontal overflow.

**Now true everywhere; update any older note that says otherwise:**
- **Rail:** main sections only in every chapter. `.menu-subs` is styled in the shared sheet anyway.
- **Closing block:** the shared `.chapter-end#chapter-end` plus the "הושלם" chip in chapters 2, 3, 4, 5 and 6.
- **Practice:** answers are saved in chapters 2, 3, 4 and 5 (`chN:practice:v1`). A solved question reopens solved.
- **Banners:** every banner sits flush under the header at every width (pull-up −42 / −26 / −18).
- **Search:** `ChapterSearch` fires `chapter:jump`. Every chapter's progress code listens, so it stops crediting skipped sections, and `useFindHit` also looks on the jump.
- **Shared sheet:** the reduced-motion `.bleed-aside` bug is fixed at the source, and about 540 lines of dead CSS are gone.
- **Emphasis:** a phrase that matches nothing logs `console.error` in development (chapters 3 and 4).
- **Chapter 3:** a gold transliteration register, `.ch3-tr`, from each fragment's `term`.

**Still open. These are the user's decisions, not bugs:**
- **Chapter 6:** the film captions and the story panel word the Gabriel scene differently (singular/plural, "מלובן"). The captions follow the recorded narration.
- **Chapter 6:** "הקפת הפרידה" on the hajj map, and the Latin text baked into the qibla painting.
- **Chapter 6:** `#fff` in the film captions and the search hits (rule 34).
- **Chapter 5:** `hero.mp4` is 4.4MB (target 2–3MB). There's no ffmpeg on this machine.
- **Chapter 5:** at 390 the top of the map stage is plain parchment. This is the trade-off for keeping all five pins in view.
- **Chapter 4:** six practice pictures are no longer printed in the chapter (listed in `practice.json $photos-note`).
- **Chapter 2:** the trait dialogs can't be opened without JS (their text is still in the HTML).
- **Unused assets, listed and not deleted:**
  - ch2: `desert-noon.jpg`, `desert-night.jpg`, `mecca-precinct.jpg`, `shrine.jpg`
  - ch5: `snake.png`, `baya.png`
  - ch4: `polka-video.jpg`
  - ch3: `mecca-town.jpg`, `cave-mouth.jpg`
