// Een voorstel na een zware sport (engine/sportRestOffer.ts, I-23 punt 10): regels toevoegen aan
// `AppSettings.sportRestOffers`. Lezen en schrijven in één transactie, vanaf wat er staat: twee tabbladen die
// tegelijk schrijven bouwen op elkaar, en een regel die er al staat komt er niet nog eens bij. Alleen toevoegen;
// wat ouder is dan 30 dagen valt bij het lezen weg en gaat dus ook niet mee terug de opslag in.

import { MetaRepo } from './databaseRepos';
import { DEFAULT_SETTINGS, type AppSettings } from './databaseSettings';
import { appendRows, parseSportRestOffers, type SportRestOffer } from '../engine/sportRestOffer';

export async function appendSportRestOffers(rows: readonly SportRestOffer[], today: string): Promise<AppSettings> {
  return MetaRepo.update<AppSettings>('settings', (stored) => {
    const base = { ...DEFAULT_SETTINGS, ...stored };
    const current = parseSportRestOffers(base.sportRestOffers, today).list ?? [];
    return { ...base, sportRestOffers: appendRows(current, rows) };
  });
}
