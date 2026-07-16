/* The mechanism registry.

   The original assembled this by loading eight <script> tags in a fixed order and letting
   each one write into window.CH6M. The order was not incidental — chapter6.html's last
   script comment said so outright: "last: it owns the check ids, so it must load after the
   files that once answered to them". Several mechanisms are registered under an id that a
   later file re-registers, and the later one is meant to win.

   Calling the registrars in the same sequence reproduces that exactly, and makes the rule
   explicit instead of leaving it to the order of <script> tags in a document. */

import { registerOpening } from './mech-opening'
import { registerShahada } from './mech-shahada'
import { registerPrayer } from './mech-prayer'
import { registerCharity } from './mech-charity'
import { registerRamadan } from './mech-ramadan'
import { registerHajj } from './mech-hajj'
import { registerSummary } from './mech-summary'
import { registerChecks } from './mech-checks'
import type { MechRegistry } from './types'

const registry: MechRegistry = {}

registerOpening(registry)
registerShahada(registry)
registerPrayer(registry)
registerCharity(registry)
registerRamadan(registry)
registerHajj(registry)
registerSummary(registry)
/* last: it owns the check ids, so it must run after the files that once answered to them */
registerChecks(registry)

export const MECH: MechRegistry = registry
