import type { Program, ResolvedProgramPosition } from '../models/program';
import { resolveProgramWeek } from '../utils/dates';
import { waveHeader } from './programLayout';
import { isRestWeekAt } from './weekLoadChange';

// Eén tekst voor "waar sta je in het programma": de week binnen de fase, met de fase voorop, zodat je leest dat
// de 18 de lengte van de fase is ("Opbouw, week 3 van 18"). Vandaag, Stand, de weekterugblik en de dagvoorbeelden
// gebruiken dezelfde. Besluit: docs/beslissingen/2026-11-12-je-week-tot-nu.md.
export function weekPositionLabel(position: Pick<ResolvedProgramPosition, 'weekInPhase' | 'phase'>): string {
  const name = position.phase.name.toLowerCase();
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}, week ${position.weekInPhase} van ${position.phase.weekCount}`;
}

// De naam van een hele week in de weekterugblik: "Rustweek" als het programma op die maandag een rustweek heeft
// (isRestWeekAt, nooit een woord uit een notitie) en je hem niet doortraint, in een golf de tekst van de golf, en
// anders de week in de fase. Buiten het programma niets. Alleen tekst.
export function weekNameAt(program: Program | null | undefined, monday: string): string | undefined {
  const position = program ? resolveProgramWeek(program, monday) : null;
  if (!program || !position) return undefined;
  const wave = waveHeader(position);
  if (wave) return wave;
  if (isRestWeekAt(program, monday) && !program.skippedRestWeeks?.includes(monday)) return 'Rustweek';
  return weekPositionLabel(position);
}

// De kop van de pagina Week: een grote kop ("Week" met het getal) en een kleine regel eronder. Het weeknummer
// staat al groot, dus de kleine regel noemt de fase en haar lengte ("Basisfase van 4 weken") en niet nog eens
// "week 1" zoals Vandaag en Stand (weekPositionLabel). In een golf de tekst van de golf ("van 4 van je golf"),
// een vaste week heet "Je vaste week". Zonder positie blijft het "Week" en is de regel leeg. Alleen tekst.
// Besluit: docs/beslissingen/2026-11-12-week-minimaal.md (aanvulling).
export function weekHeading(position: ResolvedProgramPosition | null | undefined): { title: string; number?: number; line: string } {
  if (!position) return { title: 'Week', line: '' };
  const wave = waveHeader(position);
  if (wave) {
    const m = /^Week (\d+) (.+)$/.exec(wave);
    return m ? { title: 'Week', number: Number(m[1]), line: m[2] } : { title: wave, line: '' };
  }
  const name = position.phase.name.toLowerCase();
  const weeks = position.phase.weekCount;
  return { title: 'Week', number: position.weekInPhase, line: `${name.charAt(0).toUpperCase()}${name.slice(1)} van ${weeks} ${weeks === 1 ? 'week' : 'weken'}` };
}
