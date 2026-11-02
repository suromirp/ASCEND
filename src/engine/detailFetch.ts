// ASCEND: wanneer het blad van een run zelf de details ophaalt en wanneer er een knop
// "Details ophalen" staat (docs/beslissingen/2026-11-02-week-en-vandaag-hulp.md).
//
// Een run van de laatste AUTO_DETAIL_DAYS dagen haalt zijn kilometers en reeks op als het blad
// opent, zoals voor een nieuwe run. Een oudere run zonder kilometers doet dat nooit vanzelf: daar
// staat de knop, één run per tik, nooit alles in één keer. Een oudere run die zijn kilometers al
// heeft, houdt het onderhoud bij het openen (de reeks, een correctie bij de bron), zoals het was.
// `runDetail` blijft afgeleid en append-only; dit bepaalt alleen wanneer erom gevraagd wordt.
//
// Puur: geen React, geen opslag.

import type { SessionLog } from '../models/training';
import { daysBetween } from '../utils/dates';
import { isUsableRunDetail } from './runDetail';
import { isWalkOrTripLog, logSport } from './sports';

export const AUTO_DETAIL_DAYS = 14;

export type DetailFetchMode = 'none' | 'auto' | 'button';

export function detailFetchMode(log: Pick<SessionLog, 'externalId' | 'trim' | 'runDetail' | 'completedDate' | 'type' | 'sport' | 'cardioData' | 'outdoorData'>, today: string): DetailFetchMode {
  if (!log.externalId || log.trim) return 'none';
  if (logSport(log) !== 'running' && !isWalkOrTripLog(log)) return 'none';
  if (daysBetween(log.completedDate, today) <= AUTO_DETAIL_DAYS) return 'auto';
  if (isUsableRunDetail(log.runDetail)) return 'auto';
  return 'button';
}
