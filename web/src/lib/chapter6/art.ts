/* Hand-drawn geographic plates for the two map mechanisms, plus the shared horizon
   silhouette. Inline SVG, no external assets, palette tokens only.

   THE RULE THESE PLATES EXIST FOR: geography is not reading direction. Every plate is
   mounted under dir="ltr" and every position on it is a percentage of the plate's own
   viewBox, projected from real coordinates — so there is no second coordinate system for
   RTL to mirror, and no magic angle to hand-tune after the fact.

   The qibla plate is an equirectangular projection chosen to be BEARING-TRUE at Medina:
   the x/y scales satisfy Δx/Δlon · cos(φ̄) = Δy/Δlat, so a straight line drawn from
   Medina to a city on this canvas leaves Medina at that city's true compass bearing.
     bounds: lon 21°E→59.6°E, lat 19°N→34°N, canvas 1200×514
     x(lon) = (lon−21)/38.6·1200      y(lat) = (34−lat)/15·514
   Measured against the drawn pins: Medina→Mecca 176.3° (true ≈176°),
   Medina→Jerusalem 331.5° (true ≈331°). The old component had them at 208° and 18°.

   No text is drawn inside any plate: lettering stays in the DOM, where the content
   rules can see it — and no generator is ever asked to imitate Arabic script. */

/* ---- qibla plate: the Hijaz between Jerusalem and Mecca ---- */

export const QIBLA_CITY = {
  jerusalem: { x: 36.87, y: 14.8 },
  medina: { x: 48.22, y: 63.54 },
  makkah: { x: 48.78, y: 83.87 },
}

/* bearings FROM Medina, degrees clockwise from north, as drawn on this plate */
export const QIBLA_BEARING = { jerusalem: -28.5, makkah: 176.3 }

export const QIBLA_PLATE = `
<svg viewBox="0 0 1200 514" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="qp-land" x1="0" y1="0" x2=".7" y2="1">
      <stop offset="0" stop-color="#f0e4c8"/>
      <stop offset="1" stop-color="#dcc79c"/>
    </linearGradient>
    <linearGradient id="qp-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d3e0dc"/>
      <stop offset="1" stop-color="#c2d4d0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1200" height="514" fill="url(#qp-land)"/>
  <g stroke="rgba(76,23,4,.07)" stroke-width="1">
    <path d="M124,0V514M280,0V514M435,0V514M591,0V514M746,0V514M902,0V514M1057,0V514"/>
    <path d="M0,137H1200M0,308H1200M0,480H1200"/>
  </g>
  <g fill="url(#qp-sea)" stroke="rgba(199,154,60,.8)" stroke-width="2" stroke-linejoin="round">
    <path d="M0,0 L452,0 C451,1 451,2 451,3 C446,16 440,28 435,41 C432,49 430,58 428,66
             C423,73 418,80 414,86 C393,91 372,93 351,94 C346,92 341,90 336,89
             C316,91 296,94 277,96 C249,94 221,92 194,91 C129,77 64,64 0,51 Z"/>
    <path d="M359,138 C368,160 374,172 379,182 C390,198 400,206 407,209 L412,215
             C415,213 418,210 421,207 L432,152 C436,170 439,190 441,206
             C448,215 452,222 457,228 C480,262 505,300 530,339 C542,368 553,400 565,428
             C576,444 588,460 599,475 C603,488 608,501 612,514 L510,514
             C506,507 505,500 504,493 C496,466 489,438 482,411 C471,388 461,366 451,343
             C433,306 415,268 398,231 C385,200 370,165 359,138 Z"/>
    <path d="M862,140 C896,152 930,165 962,180 C1008,201 1053,219 1098,235
             C1122,244 1146,257 1168,272 C1179,279 1190,286 1200,294 L1200,366
             C1190,362 1180,358 1170,354 C1148,327 1125,296 1101,268
             C1081,288 1060,309 1040,328 C1011,314 982,300 953,287
             C951,281 950,276 948,271 C943,277 938,284 933,291
             C923,280 913,269 904,257 C880,224 858,190 840,157
             C847,151 854,145 862,140 Z"/>
    <ellipse cx="451" cy="86" rx="4" ry="9"/>
  </g>
  <g stroke="rgba(76,23,4,.14)" stroke-width="3" stroke-linecap="round">
    <path d="M478,262l14,22M500,296l14,22M522,330l14,22M545,366l13,21M566,402l13,21M585,438l12,20"/>
  </g>
  <g fill="rgba(76,23,4,.25)">
    <path d="M1150,22l7,18-7,18-7-18Z"/>
    <circle cx="1150" cy="66" r="2.5"/>
  </g>
</svg>`

/* ---- hajj plate: the Mecca basin, the loop of the journey ----
   Local geography, west to east exactly as it lies on the ground: Mecca in its valley on
   the west, מינא ~5km out, מוזדליפה beyond it, ערפה the farthest point ~20km east — and
   the road comes BACK through them, because the hajj is a loop, not a line. */

export const HAJJ_POS = [
  { x: 9.5, y: 74.1 },  /* אחראם — at the miqat, before Mecca            */
  { x: 20.5, y: 53.6 }, /* טוואף — the Kaaba                              */
  { x: 24.0, y: 58.9 }, /* סעי — Safa↔Marwa, inside Mecca                 */
  { x: 86.0, y: 71.4 }, /* ערפה — the far turn of the loop                */
  { x: 65.5, y: 74.1 }, /* מוזדליפה — first stop on the way back          */
  { x: 45.5, y: 70.5 }, /* מינא — the stoning, closest back toward Mecca  */
  { x: 18.5, y: 45.5 }, /* חזרה למכה — the loop closes where it began     */
]

export const HAJJ_PLATE = `
<svg viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <linearGradient id="hp-land" x1="0" y1="0" x2=".6" y2="1">
      <stop offset="0" stop-color="#f1e5c9"/>
      <stop offset="1" stop-color="#d9c193"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1000" height="560" fill="url(#hp-land)"/>
  <g fill="none" stroke="rgba(76,23,4,.10)" stroke-linecap="round">
    <path d="M110,175 Q260,115 430,148 Q610,180 770,138" stroke-width="26"/>
    <path d="M290,505 Q500,545 710,502" stroke-width="20"/>
    <path d="M60,300 Q95,255 150,235" stroke-width="16"/>
    <path d="M905,205 Q945,255 950,320" stroke-width="18"/>
  </g>
  <g stroke="rgba(76,23,4,.13)" stroke-width="3" stroke-linecap="round">
    <path d="M120,240l16,18M150,270l14,16M96,268l12,16M700,190l16,14M740,205l16,12M660,180l14,14"/>
  </g>
  <path d="M842,388 Q862,360 882,388 Z" fill="rgba(76,23,4,.16)"/>
  <circle cx="205" cy="300" r="27" fill="none" stroke="rgba(132,27,27,.4)"
          stroke-width="1.6" stroke-dasharray="5 5"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M95,415 Q140,370 205,300 C350,245 640,255 860,400 C795,438 710,428 655,415
             C575,436 512,414 455,395 C355,362 262,325 192,262"
          stroke="rgba(255,247,229,.9)" stroke-width="8"/>
    <path d="M95,415 Q140,370 205,300" stroke="#b98f37" stroke-width="3" stroke-dasharray="8 7"/>
    <path d="M205,300 C350,245 640,255 860,400 C795,438 710,428 655,415
             C575,436 512,414 455,395 C355,362 262,325 192,262"
          stroke="#b98f37" stroke-width="3.4"/>
  </g>
  <g fill="#b98f37">
    <path d="M522,251 L541,259 L523,268 L527,259 Z"/>
    <path d="M576,434 L557,428 L574,419 L571,427 Z"/>
    <path d="M263,330 L244,317 L262,309 L258,319 Z"/>
  </g>
  <g>
    <rect x="197" y="292" width="16" height="16" fill="#3d0d0d"
          stroke="#c79a3c" stroke-width="2"/>
  </g>
</svg>`

/* ---- the horizon of a lesson that keeps talking about the horizon ----
   Four of the five prayers are defined against it; the fast begins and ends on it. One
   silhouette — domes, minarets, palms, low roofs — shared by the day-cycle dome and the
   fast-day sky. fill:currentColor, so each screen sets its own depth of shadow. */

export const SKYLINE = `
<svg viewBox="0 0 1200 140" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
  <path fill="currentColor" d="M0,140 L0,104 L26,104 L26,92 L58,92 L58,106 L92,106 L92,140
    M96,140 L96,112 L104,112 L104,88 Q108,78 112,88 L112,112 L120,112 L120,140
    M107,88 Q96,80 90,84 Q100,72 108,80 Q112,68 118,78 Q126,72 124,82 Q132,80 126,88 Q118,84 107,88
    M150,140 L150,108 L188,108 L188,96 L214,96 L214,140
    M226,140 L226,44 L230,36 L234,28 L238,36 L242,44 L242,140
    M234,28 L234,18 M230,22 L238,22
    M252,140 L252,96 L262,96 L262,88 L350,88 L350,96 L360,96 L360,140
    M262,88 Q306,34 350,88
    M301,42 L301,30 M297,34 L305,34
    M372,140 L372,34 L376,25 L380,16 L384,25 L388,34 L388,140
    M380,16 L380,7 M376,11 L384,11
    M400,140 L400,102 L428,102 L428,112 L452,112 L452,98 L482,98 L482,140
    M496,140 L496,114 L504,114 L504,90 Q508,80 512,90 L512,114 L520,114 L520,140
    M508,90 Q497,82 491,86 Q501,74 509,82 Q513,70 519,80 Q527,74 525,84 Q533,82 527,90 Q519,86 508,90
    M536,140 L536,110 L568,110 L568,120 L600,120 L600,104 L632,104 L632,140
    M648,140 L648,100 L656,100 L656,112 L672,112 Q680,98 688,112 L704,112 L704,100 L712,100 L712,140
    M736,140 L736,108 L770,108 L770,94 L800,94 L800,110 L828,110 L828,140
    M842,140 L842,52 L846,44 L850,37 L854,44 L858,52 L858,140
    M850,37 L850,28 M846,32 L854,32
    M872,140 L872,100 L880,100 L880,92 L940,92 L940,100 L948,100 L948,140
    M880,92 Q910,56 940,92
    M962,140 L962,112 L970,112 L970,90 Q974,81 978,90 L978,112 L986,112 L986,140
    M974,90 Q963,82 957,86 Q967,74 975,82 Q979,70 985,80 Q993,74 991,84 Q999,82 993,90 Q985,86 974,90
    M1002,140 L1002,106 L1036,106 L1036,96 L1066,96 L1066,108 L1096,108 L1096,140
    M1108,140 L1108,102 L1140,102 L1140,112 L1174,112 L1174,100 L1200,100 L1200,140 Z"/>
</svg>`
