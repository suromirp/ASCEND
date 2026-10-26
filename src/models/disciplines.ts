// ASCEND — the disciplines the Capability Engine can actually match against
// real evidence (engine/capability.ts's own discipline derivation from a
// SessionLog produces 'running', 'hiking' or, since Fase 4, 'cycling'). A goal requirement
// or baseline answer carrying any other discipline string can never be met
// by real training data — not a UI restriction, a reflection of what the
// engine already does.
//
// GoalRequirement.discipline/CapabilityKey.discipline stay plain `string`
// (deliberately, per models/goals.ts) so a future discipline never needs a
// model change — this list is only the UI's default menu, not a closed
// domain type. A goal can still carry a discipline outside this list (an
// existing one, or typed via the editor's "andere sport" fallback); it just
// won't yet contribute to automatic capability tracking.

import type { SportId } from '../data/sports';

export type Discipline = SportId;
