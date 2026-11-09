import type { SessionTemplate } from '../models/training';
import { templateSport } from './sports';
import { BODYWEIGHT_TEMPLATE_ID } from './noGymDetails';
import { exerciseById } from '../data/exercises';
import { matchExercise } from './exerciseMatch';

// De sport van een training: hardlopen, kracht, wandelen, bergtocht, fietsen of rust.
// Puur; de kleuren en pictogrammen staan in components/sportKind.ts.
export type SportKind = 'run' | 'strength' | 'walk' | 'mountain' | 'bike' | 'rest';

// Een bergtocht is de template "Bergtocht" of een training van het soort tocht
// (avontuur). Alleen weergave: de planning kijkt hier niet naar. Werkt voor een
// template en voor een log (die dezelfde templateId en hetzelfde soort draagt).
export function isMountainTrip(item: { templateId?: string; id?: string; type: SessionTemplate['type'] }): boolean {
  return item.type === 'adventure' || (item.templateId ?? item.id) === 'tpl_mountain_hike';
}

export function sportKind(template: SessionTemplate): SportKind {
  if (template.type === 'recovery') return 'rest';
  if (template.type === 'strength') return 'strength';
  if (isMountainTrip(template)) return 'mountain';
  const sport = templateSport(template);
  if (sport === 'cycling') return 'bike';
  return sport === 'hiking' ? 'walk' : 'run';
}

// Krachttraining zonder gewicht: Eigen gewicht (`tpl_bodyweight`) of een training waarvan elke oefening met je
// eigen lichaam gaat (calisthenics). Alleen het pictogram verandert; de sport blijft kracht, dus kleur,
// Logboekgroep en planning zijn dezelfde. Eén bron voor sjabloon en log.
const isBodyweightExercise = (e: { resistance?: string } | undefined) => e?.resistance === 'bodyweight';

export function isBodyweightTemplate(template: Pick<SessionTemplate, 'id' | 'type' | 'exercises'>): boolean {
  if (template.type !== 'strength') return false;
  if (template.id === BODYWEIGHT_TEMPLATE_ID) return true;
  const list = template.exercises ?? [];
  return list.length > 0 && list.every((x) => isBodyweightExercise(exerciseById(matchExercise(x.exerciseName) ?? '')));
}

export function isBodyweightLog(log: { type: SessionTemplate['type']; templateId?: string; strengthData?: { exerciseId: string }[] }): boolean {
  if (log.type !== 'strength') return false;
  if (log.templateId === BODYWEIGHT_TEMPLATE_ID) return true;
  const list = log.strengthData ?? [];
  return list.length > 0 && list.every((x) => isBodyweightExercise(exerciseById(x.exerciseId)));
}
