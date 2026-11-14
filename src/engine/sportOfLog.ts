// ASCEND: de sport van een log die meetelt (zwemmen, padel, voetbal, yoga of een eigen sport), ook voor een log
// van voor 14 november. Tot dan bewaarde Losse training zo'n sport zonder `countedSport` of `customSport`, met
// alleen het templateId van het afgeleide sjabloon (`sport_<id>`, engine/sportTemplate.ts; `sport_custom_<type>`,
// engine/customSport.ts) en type cardio; zonder deze stap telde dat log als hardlopen (backlog M). Alleen lezen:
// het log zelf wordt nooit herschreven en de opslagvorm verandert niet. Puur.

import { COUNTED_SPORTS, type CountedSportId } from '../data/sports';
import type { SessionLog } from '../models/training';

export interface LogCountedSport {
  countedSport?: CountedSportId;
  customSport?: string;
}

type SportFields = Pick<SessionLog, 'type'> & {
  templateId?: string;
  sport?: SessionLog['sport'];
  countedSport?: SessionLog['countedSport'];
  customSport?: string;
};

const PREFIX = 'sport_';
const CUSTOM = /^custom_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const COUNTED_IDS = new Set<string>(COUNTED_SPORTS.map((s) => s.id));

// Het eigen veld van het log gaat voor. Anders alleen een oud log van type cardio zonder eigen sport, waarvan
// het templateId een bekende sport of een eigen sport aanwijst; elk ander templateId geeft niets, zoals nu.
export function sportOfLog(log: SportFields): LogCountedSport {
  if (log.countedSport) return { countedSport: log.countedSport };
  if (log.customSport) return { customSport: log.customSport };
  if (log.type !== 'cardio' || log.sport || !log.templateId?.startsWith(PREFIX)) return {};
  const rest = log.templateId.slice(PREFIX.length);
  if (COUNTED_IDS.has(rest)) return { countedSport: rest as CountedSportId };
  if (CUSTOM.test(rest)) return { customSport: rest };
  return {};
}
