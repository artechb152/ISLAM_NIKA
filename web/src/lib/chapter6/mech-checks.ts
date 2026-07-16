/* The chapter's checks — one per commandment, plus the closing exercise, plus the route map
   the החג' section was missing.

   Every question, option, order and feedback line here is read from data.ts; this file holds
   no content of its own, only the five interactions the spec names. They share one rule:
   a wrong answer never resets the exercise. It returns the one thing that is out of place,
   says why in a sentence, and after the second miss reveals the hint (engine's api.miss).

   Loaded last, so it owns the ids the retired mechanisms used to answer to. */

import { HAJJ_PLATE, HAJJ_POS } from './art'
import type { Check, MechApi, MechRegistry } from './types'

/* The check union is discriminated on `type`. Each interaction below reads only its own
   member, and TYPES is keyed by the same discriminant that selects it. */
type CheckOf<K extends Check['type']> = Extract<Check, { type: K }>
type CheckFn<K extends Check['type']> = (api: MechApi, C: CheckOf<K>) => void

export function registerChecks(M: MechRegistry): void {
  /* A fixed reordering, not Math.random: the bank must be shuffled — otherwise the answer is
     just "keep the order you were given" — but it must also be the same every visit, so a
     learner comparing notes sees the same screen twice. */
  function reorder<T>(list: T[], perm: number[]): T[] {
    return perm.map(function (i) { return list[i]; });
  }

  function goButton(api: MechApi, onClick: () => void): HTMLButtonElement {
    const b = api.el('button', 'mech-btn mech-btn-primary chk-go');
    b.type = 'button';
    b.textContent = 'בדיקה';
    b.disabled = true;
    b.addEventListener('click', onClick);
    return b;
  }

  function pass(api: MechApi, C: Check, go?: HTMLButtonElement, hint?: HTMLElement): void {
    api.complete();
    api.say(C.ok || '', 'ok');
    if (go) go.disabled = true;
    /* a solved exercise must not keep instructing — "לחיצה על שלב שכבר מוקם מחזירה אותו"
       over a board of locked slots is a false sentence on screen */
    if (hint) hint.classList.add('is-gone');
  }

  /* ================= multi — "סמנו את כל המצבים המתאימים" ================= */
  function multi(api: MechApi, C: CheckOf<'multi'>): void {
    const el = api.el;
    const wrap = el('div', 'mech chk chk-multi');
    if (C.question) wrap.appendChild(el('p', 'chk-q', C.question));

    const picked: Record<string, boolean> = {};
    let locked = false;
    const box = el('div', 'chk-opts');
    const btns = C.options.map(function (o, i) {
      const b = el('button', 'chk-opt');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'chk-box'));
      b.appendChild(el('span', 'chk-text', o.text));
      b.addEventListener('click', function () {
        if (locked) return;
        picked[i] = !picked[i];
        b.setAttribute('aria-pressed', String(!!picked[i]));
        b.classList.toggle('is-picked', !!picked[i]);
        api.say('', null);
        go.disabled = !Object.keys(picked).some(function (k) { return picked[k]; });
      });
      box.appendChild(b);
      return b;
    });

    const go = goButton(api, function () {
      const wrongPicked = C.options.some(function (o, i) { return !!picked[i] && !o.right; });
      const missing = C.options.some(function (o, i) { return o.right && !picked[i]; });
      /* Every right pick locks where it is — the same rule the ordering check lives by:
         an answer the learner already has is never taken back and never called wrong. */
      C.options.forEach(function (o, i) {
        if (picked[i] && o.right && !btns[i].disabled) {
          btns[i].disabled = true;
          btns[i].classList.add('is-right');
        }
      });
      if (wrongPicked) {
        /* only the wrong picks come off, and only now is "אינן מתאימות" a true sentence */
        C.options.forEach(function (o, i) {
          if (picked[i] && !o.right) {
            picked[i] = false;
            btns[i].classList.remove('is-picked');
            btns[i].setAttribute('aria-pressed', 'false');
          }
        });
        api.miss();
        return;
      }
      if (missing) {
        /* Nothing here is wrong — it is incomplete. The old code returned the "some picks
           are unsuitable" line for this state, and a learner un-picked a RIGHT answer
           because of it (measured, round 2). The check's own hint names what to look for,
           so it is the honest line — and an incomplete answer is not a miss. */
        api.say(C.hint || C.try || '', 'try');
        return;
      }
      locked = true;
      pass(api, C, go);
    });

    wrap.appendChild(box);
    wrap.appendChild(go);
    api.stage.appendChild(wrap);

    if (api.done()) {
      /* restored (or revisited) solved: the right answers stand locked, nothing asks again */
      locked = true;
      C.options.forEach(function (o, i) {
        picked[i] = !!o.right;
        btns[i].disabled = true;
        if (o.right) {
          btns[i].classList.add('is-right', 'is-picked');
          btns[i].setAttribute('aria-pressed', 'true');
        }
      });
      pass(api, C, go);
    }
  }

  /* ================= single — one right answer out of four ================= */
  function single(api: MechApi, C: CheckOf<'single'>): void {
    const el = api.el;
    const wrap = el('div', 'mech chk chk-single');
    if (C.question) wrap.appendChild(el('p', 'chk-q', C.question));

    let pick = -1;
    let locked = false;
    const box = el('div', 'chk-opts');
    const btns: HTMLButtonElement[] = C.options.map(function (o, i) {
      const b = el('button', 'chk-opt');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'chk-box chk-radio'));
      b.appendChild(el('span', 'chk-text', o.text));
      b.addEventListener('click', function () {
        if (locked) return;
        pick = i;
        btns.forEach(function (x, k) {
          x.setAttribute('aria-pressed', String(k === i));
          x.classList.toggle('is-picked', k === i);
        });
        api.say('', null);
        go.disabled = false;
      });
      box.appendChild(b);
      return b;
    });

    const go = goButton(api, function () {
      if (pick < 0 || !C.options[pick].right) { api.miss(); return; }
      locked = true;
      btns.forEach(function (b, i) {
        b.disabled = true;
        if (C.options[i].right) b.classList.add('is-right');
      });
      pass(api, C, go);
    });

    wrap.appendChild(box);
    wrap.appendChild(go);
    api.stage.appendChild(wrap);

    if (api.done()) {
      locked = true;
      btns.forEach(function (b, i) {
        b.disabled = true;
        if (C.options[i].right) {
          b.classList.add('is-right', 'is-picked');
          b.setAttribute('aria-pressed', 'true');
        }
      });
      pass(api, C, go);
    }
  }

  /* ================= match — each prayer to its time ================= */
  function match(api: MechApi, C: CheckOf<'match'>): void {
    const el = api.el;
    const wrap = el('div', 'mech chk chk-match');

    const pairs = C.pairs;
    const order = reorder(pairs.map(function (_, i) { return i; }), [3, 0, 4, 1, 2].slice(0, pairs.length));
    let sel = -1;         // index of the currently picked left item
    const matched: Record<number, number> = {};     // left index -> pair number
    let count = 0;

    const grid = el('div', 'chk-grid');
    const colL = el('div', 'chk-col');
    colL.setAttribute('aria-label', 'תפילות');
    const colR = el('div', 'chk-col');
    colR.setAttribute('aria-label', 'זמנים');

    const lefts: HTMLButtonElement[] = pairs.map(function (p, i) {
      const b = el('button', 'chk-item');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      b.appendChild(el('span', 'chk-num'));
      b.appendChild(el('span', 'chk-text', p.left));
      b.addEventListener('click', function () {
        if (matched[i] != null) return;
        sel = i;
        lefts.forEach(function (x, k) {
          if (matched[k] != null) return;
          x.setAttribute('aria-pressed', String(k === i));
          x.classList.toggle('is-sel', k === i);
        });
        api.say('בחרו את הזמן שבו נאמרת ' + p.left + '.', 'ok');
      });
      colL.appendChild(b);
      return b;
    });

    const rights = order.map(function (srcIdx) {
      const b = el('button', 'chk-item');
      b.type = 'button';
      b.appendChild(el('span', 'chk-num'));
      b.appendChild(el('span', 'chk-text', pairs[srcIdx].right));
      b.addEventListener('click', function () {
        if (b.disabled) return;
        if (sel < 0) { api.say('בחרו קודם תפילה, ואז את הזמן המתאים לה.', 'try'); return; }
        if (srcIdx !== sel) {
          /* only this attempt falls away — every pair already made stays where it is */
          const back = sel;
          lefts[back].classList.remove('is-sel');
          lefts[back].setAttribute('aria-pressed', 'false');
          sel = -1;
          api.miss();
          return;
        }
        count++;
        matched[sel] = count;
        lefts[sel].classList.remove('is-sel');
        lefts[sel].classList.add('is-matched');
        lefts[sel].disabled = true;
        /* the .chk-num span is appended to every item as it is built, so it is always there */
        lefts[sel].querySelector('.chk-num')!.textContent = String(count);
        b.classList.add('is-matched');
        b.disabled = true;
        b.querySelector('.chk-num')!.textContent = String(count);
        sel = -1;
        api.say('', null);
        if (count === pairs.length) pass(api, C, undefined, hint);
      });
      colR.appendChild(b);
      return b;
    });

    grid.appendChild(colL);
    grid.appendChild(colR);
    wrap.appendChild(grid);
    api.stage.appendChild(wrap);
    const hint = api.hint('בחרו תפילה, ואז את הזמן שלה. התאמה שכבר נעשתה נשארת במקומה.');

    if (api.done()) {
      pairs.forEach(function (p, i) {
        count++;
        matched[i] = count;
        lefts[i].classList.add('is-matched');
        lefts[i].disabled = true;
        lefts[i].querySelector('.chk-num')!.textContent = String(count);
        const r = rights[order.indexOf(i)];
        r.classList.add('is-matched');
        r.disabled = true;
        r.querySelector('.chk-num')!.textContent = String(count);
      });
      pass(api, C, undefined, hint);
    }
  }

  /* ================= order — put the steps in sequence =================
     The spec's rule is the whole design here: a wrong order must never wipe the exercise.
     So slots are addressed individually rather than as a stack — on a check, each step that
     is already in the right place locks where it is, and only the ones out of place come
     back to the bank. Getting step 1 wrong costs you step 1, not the other six. */
  function ordering(api: MechApi, C: CheckOf<'order'>): void {
    const el = api.el;
    const wrap = el('div', 'chk chk-order mech');

    const STEPS = C.steps;
    const placed: (string | null)[] = STEPS.map(function () { return null; });  // slot index -> step name
    const locked: boolean[] = STEPS.map(function () { return false; });

    const line = el('div', 'chk-slots');
    const slots = STEPS.map(function (_, i) {
      const s = el('div', 'chk-slot');
      s.setAttribute('data-i', String(i));
      line.appendChild(s);
      return s;
    });

    const bank = el('div', 'chk-bank');
    const chips: Record<string, HTMLButtonElement> = {};
    /* A stable scramble. Stepping by 3 hits every index exactly once for 5 and for 7 (both
       are coprime with 3), so the bank holds each step once, in an order that is never the
       answer and never changes between visits. */
    const perm = STEPS.map(function (_, i) { return (i * 3 + 2) % STEPS.length; });
    perm.forEach(function (i) {
      const name = STEPS[i];
      const b = el('button', 'chk-chip');
      b.type = 'button';
      b.textContent = name;
      b.addEventListener('click', function () { place(name); });
      bank.appendChild(b);
      chips[name] = b;
    });

    function full(): boolean {
      return placed.every(function (x) { return x != null; });
    }

    function paintSlot(i: number): void {
      const s = slots[i];
      s.innerHTML = '';
      const name = placed[i];
      if (name == null) {
        s.appendChild(el('span', 'chk-slot-num', String(i + 1)));
        s.classList.remove('is-full', 'is-locked');
        return;
      }
      s.classList.add('is-full');
      const tag = el('button', 'chk-placed');
      tag.type = 'button';
      tag.appendChild(el('span', 'chk-slot-num', String(i + 1)));
      tag.appendChild(el('span', 'chk-text', name));
      if (locked[i]) {
        s.classList.add('is-locked');
        tag.disabled = true;
        tag.appendChild(api.svg('<path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'));
      } else {
        tag.setAttribute('aria-label', 'הסרה: ' + name);
        tag.addEventListener('click', function () { pull(i); });
      }
      s.appendChild(tag);
    }

    function place(name: string): void {
      if (placed.indexOf(name) >= 0) return;
      const at = placed.indexOf(null);      // the first slot still open
      if (at < 0) return;
      placed[at] = name;
      chips[name].disabled = true;
      paintSlot(at);
      api.say('', null);
      go.disabled = !full();
    }

    function pull(i: number): void {
      if (locked[i] || placed[i] == null) return;
      /* the guard above is what makes this non-null; TS cannot narrow through placed[i] */
      chips[placed[i]!].disabled = false;
      placed[i] = null;                    // only this slot opens; the rest stay put
      paintSlot(i);
      go.disabled = true;
      api.say('', null);
    }

    const go = goButton(api, function () {
      const wrong: number[] = [];
      STEPS.forEach(function (want, i) {
        if (placed[i] === want) locked[i] = true; else wrong.push(i);
      });
      /* Local correction, never a reset: a step already in its right place is locked there
         even if the steps around it are wrong. Only the misplaced ones return to the bank,
         so a learner who has four of five right refills one slot, not five. */
      wrong.forEach(function (i) {
        if (placed[i] != null) chips[placed[i]!].disabled = false;
        placed[i] = null;
      });
      slots.forEach(function (_, i) { paintSlot(i); });
      if (!wrong.length) { pass(api, C, go, hint); return; }
      go.disabled = true;
      api.miss();
    });

    wrap.appendChild(line);
    wrap.appendChild(bank);
    wrap.appendChild(go);
    api.stage.appendChild(wrap);
    /* the how-to line sits under the bank it explains, above the button — not at the
       card's tail, where a fixed navbar covers it for anyone who has not scrolled */
    const hint = api.hint('לחצו על שלב כדי למקם אותו בתור הבא; לחיצה על שלב שכבר מוקם מחזירה אותו.');
    wrap.insertBefore(hint, go);
    slots.forEach(function (_, i) { paintSlot(i); });

    if (api.done()) {
      STEPS.forEach(function (name, i) {
        placed[i] = name;
        locked[i] = true;
        chips[name].disabled = true;
        paintSlot(i);
      });
      pass(api, C, go, hint);
    }
  }

  /* ================= situations — the closing exercise ================= */
  function situations(api: MechApi, C: CheckOf<'situations'>): void {
    const el = api.el;
    const wrap = el('div', 'mech chk chk-sits');

    const VERB_ICON: Record<string, string> = {
      shahada: 'icon-shahada.png', prayer: 'icon-prayer.png', charity: 'icon-charity.png',
      fast: 'icon-ramadan.png', hajj: 'icon-hajj.png'
    };
    let sel: string | null = null;
    const matched: Record<string, boolean> = {};

    const targets: Record<string, HTMLButtonElement> = {};
    const row = el('div', 'chk-targets');
    C.pairs.forEach(function (p) {
      const t = el('button', 'chk-target');
      t.type = 'button';
      t.setAttribute('data-k', p.key);
      t.setAttribute('aria-label', 'שיוך אל ' + p.to);
      const im = el('img');
      im.src = '/assets/anim-video/' + VERB_ICON[p.key];
      im.alt = '';
      t.appendChild(im);
      t.appendChild(el('b', null, p.to));
      t.addEventListener('click', function () { drop(p.key); });
      row.appendChild(t);
      targets[p.key] = t;
    });

    const pool = el('div', 'chk-bank chk-sit-bank');
    const chips: Record<string, HTMLButtonElement> = {};
    reorder(C.pairs, [2, 4, 0, 3, 1]).forEach(function (p) {
      const b = el('button', 'chk-chip chk-sit');
      b.type = 'button';
      b.textContent = p.text;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        if (matched[p.key]) return;
        sel = p.key;
        Object.keys(chips).forEach(function (k) {
          chips[k].setAttribute('aria-pressed', String(k === p.key));
          chips[k].classList.toggle('is-sel', k === p.key);
        });
        api.say('בחרו את מצוות היסוד שאליה הסיטואציה שייכת.', 'ok');
      });
      pool.appendChild(b);
      chips[p.key] = b;
    });

    function fill(key: string): void {
      matched[key] = true;
      chips[key].classList.remove('is-sel');
      chips[key].classList.add('is-matched');
      chips[key].setAttribute('aria-pressed', 'false');
      chips[key].disabled = true;
      /* state must live on the element, not only on its paint: a class alone left the
         target announcing as an open button after it was filled */
      targets[key].classList.add('is-filled');
      targets[key].disabled = true;
    }

    function drop(key: string): void {
      if (!sel) { api.say('בחרו קודם סיטואציה, ואז את המצווה המתאימה לה.', 'try'); return; }
      if (key !== sel) {
        chips[sel].classList.remove('is-sel');
        chips[sel].setAttribute('aria-pressed', 'false');
        sel = null;
        api.miss();
        return;
      }
      fill(key);
      sel = null;
      api.say('', null);
      if (Object.keys(matched).length === C.pairs.length) pass(api, C, undefined, hint);
    }

    wrap.appendChild(row);
    wrap.appendChild(pool);
    api.stage.appendChild(wrap);
    const hint = api.hint('בחרו סיטואציה, ואז את מצוות היסוד שאליה היא שייכת.');

    if (api.done()) {
      C.pairs.forEach(function (p) { fill(p.key); });
      pass(api, C, undefined, hint);
    }
  }

  const TYPES: { [K in Check['type']]: CheckFn<K> } = { multi: multi, single: single, match: match, order: ordering, situations: situations };

  /* every check screen in data.ts routes through here by its declared type */
  ['sh-c', 'pr-c', 'ch-c', 'rm-c', 'hj-c', 'sum-c'].forEach(function (id) {
    M[id] = function (api: MechApi) {
      const C = api.screen.check;
      if (!C || !TYPES[C.type]) { console.error('check ' + id + ': unknown type', C && C.type); return; }
      /* TYPES is keyed by the very discriminant it is indexed with, so the handler always
         matches C; TypeScript only sees the union of the five signatures, hence the cast. */
      (TYPES[C.type] as CheckFn<Check['type']>)(api, C);
    };
  });

  /* ================= hj-v — the route map the החג' section was missing =================
     Seven stations in the order the source gives them. It is an illustration, not a puzzle:
     it never gates the chapter, and stepping through it is the whole interaction.

     Round 3 gave the controller its ground: a terrain plate drawn to the real geography of
     the Mecca basin now sits under the same seven stations. The strip of buttons below it is
     untouched — it worked, on mobile too, and it stays the controller — but the pins on the
     plate show what the strip could not: the hajj is a LOOP. It leaves Mecca, reaches its
     farthest point at ערפה, and returns through מוזדליפה ומינא to where it began. */
  M['hj-v'] = function (api: MechApi) {
    const el = api.el;
    const wrap = el('div', 'mech hjmap');

    const STOPS = [
      { name: 'אחראם', note: 'כניסה למצב טהרה, לפני קו המיקאת.' },
      { name: 'טוואף', note: 'שבע הקפות סביב הכעבה, נגד כיוון השעון.' },
      { name: 'סעי', note: 'ריצה בין צפא ומרוה, כריצתה של הגר.' },
      { name: 'ערפה', note: 'העלייה להר והעמידה — הווקוף — במישור.' },
      { name: 'מוזדליפה', note: 'עצירה בדרך חזרה, ואיסוף האבנים.' },
      { name: 'מינא', note: 'רגימת השטן באבנים שנאספו.' },
      { name: 'חזרה למכה', note: 'חג הקורבן וההקפות האחרונות.' }
    ];

    /* The plate and everything pinned to it live in dir="ltr": geography is not reading
       direction. Positions are percentages of the SAME viewBox the plate is drawn in, so
       a pin can never drift off its station — there is no second coordinate system. */
    const plate = el('div', 'hjmap-plate');
    plate.setAttribute('dir', 'ltr');
    plate.setAttribute('aria-hidden', 'true');
    plate.innerHTML = HAJJ_PLATE;
    const pins = HAJJ_POS.map(function (P, i) {
      const p = el('span', 'hjmap-pin');
      p.style.left = P.x + '%';
      p.style.top = P.y + '%';
      p.textContent = String(i + 1);
      plate.appendChild(p);
      return p;
    });

    const route = el('div', 'hjmap-route');
    const line = el('div', 'hjmap-line');
    line.setAttribute('aria-hidden', 'true');
    route.appendChild(line);

    const read = el('div', 'hjmap-read');
    read.setAttribute('role', 'status');
    read.setAttribute('aria-live', 'polite');

    let at = -1;
    const seen: Record<number, boolean> = {};

    const nodes = STOPS.map(function (S, i) {
      const b = el('button', 'hjmap-stop');
      b.type = 'button';
      b.setAttribute('aria-label', S.name);
      b.appendChild(el('span', 'hjmap-dot', String(i + 1)));
      b.appendChild(el('span', 'hjmap-name', S.name));
      b.addEventListener('click', function () { show(i); });
      route.appendChild(b);
      return b;
    });

    function show(i: number): void {
      at = i;
      seen[i] = true;
      nodes.forEach(function (n, k) {
        n.classList.toggle('is-on', k === i);
        n.classList.toggle('is-past', k < i);
      });
      pins.forEach(function (p, k) {
        p.classList.toggle('is-on', k === i);
        p.classList.toggle('is-past', k < i);
      });
      line.style.setProperty('--p', (i / (STOPS.length - 1) * 100) + '%');
      read.innerHTML = '';
      read.appendChild(el('b', null, (i + 1) + '. ' + STOPS[i].name));
      read.appendChild(el('span', null, STOPS[i].note));
      if (Object.keys(seen).length === STOPS.length) {
        api.complete();
        api.say('זהו סדר התחנות: אחראם, טוואף, סעי, ערפה, מוזדליפה, מינא וחזרה למכה.', 'ok');
        hint.classList.add('is-gone');
      }
    }

    const step = el('button', 'mech-btn mech-btn-primary hjmap-step');
    step.type = 'button';
    step.textContent = 'התחנה הבאה';
    step.addEventListener('click', function () {
      show(at >= STOPS.length - 1 ? 0 : at + 1);
    });

    wrap.appendChild(plate);
    wrap.appendChild(route);
    wrap.appendChild(read);
    wrap.appendChild(step);
    api.stage.appendChild(wrap);
    const hint = api.hint('לחצו על תחנה, או התקדמו לאורך המסלול תחנה אחר תחנה.');
    if (api.done()) {
      STOPS.forEach(function (_, i) { seen[i] = true; });
      show(STOPS.length - 1);
    } else show(0);
  };
}
