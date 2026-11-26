import { useAppData } from '../state/AppDataContext';
import type { Advice } from '../engine/adviceEngine';
import { REENTRY_TITLE, REENTRY_WHY, reentryCatchUpItems, reentryFirstDayItems, reentryNote } from '../engine/reentry';
import { NO_GOAL_WAVES_TITLE, noGoalWavesLines, wavesConsentPatch } from '../engine/noGoalWaves';
import { BEGINNER_LADDER_EXPLANATION, BEGINNER_LADDER_TITLE, beginnerLadderLinesOn, ladderConsentPatch } from '../engine/beginnerLadderOffer';
import { useHorizonChange } from './useHorizonChange';
import { todayISO } from '../utils/dates';

// Akkoord op een advies met een eigen voorstel van de planningsronde: een rustweek doortrainen, deze week nog een
// keer, een rustiger instap, de ladder en golven zonder doel. Gedeeld door de kaart (CoachCard#AdviceItem: Bekijk
// opent het voorstel) en het blad bij het openen (FirstAdviceHost: Bekijk opent het voorstel, Akkoord past het met
// `direct` meteen toe). Pas als het plan bewaard is, wordt het antwoord op het advies vastgelegd.
export function useAdviceAccept(advice: Advice) {
  const { respondToAdvice, planWeekLoadChange, planHorizonChange, settings, program } = useAppData();
  const horizon = useHorizonChange();
  const weekLoad = advice.restWeekSkip ? { kind: 'rest' as const, week: advice.restWeekSkip } : advice.repeatWeek ? { kind: 'repeat' as const, week: advice.repeatWeek } : undefined;
  const ownProposal = !!weekLoad || !!advice.noGoalWaves || !!advice.reentry || !!advice.beginnerLadder;

  // `direct`: Akkoord is al gegeven, dus het plan meteen toepassen. Zonder: eerst het voorstel.
  // Geeft false als dit advies geen eigen voorstel heeft; dan beantwoordt de aanroeper het zelf.
  async function accept(direct = false, onStored?: () => void): Promise<boolean> {
    const stored = () => { onStored?.(); void respondToAdvice(advice, 'accepted'); };
    if (weekLoad) {
      await horizon.propose(() => planWeekLoadChange(weekLoad.kind, weekLoad.week, true), {
        eyebrow: weekLoad.kind === 'rest' ? 'Rustweek' : 'Deze week nog een keer',
        ask: 'always',
        alwaysAsk: true,
        direct,
        declined: 'Je week blijft zoals hij was.',
        onStored: stored,
      });
      return true;
    }
    // Rustiger instap na een pauze (engine/reentry.ts): het voorstel van de planningsronde met de trainingen
    // die korter worden, Akkoord daarin bewaart de week.
    if (advice.reentry) {
      const week = advice.reentry;
      await horizon.propose(
        () => planHorizonChange({
          title: REENTRY_TITLE,
          why: 'Rustiger instap na een pauze.',
          explanation: REENTRY_WHY,
          trigger: 'reentry_planned',
          settings: { reentryWeeks: [...(settings.reentryWeeks ?? []).filter((w) => w.from !== week.from), week] },
          notes: [reentryNote(week, advice.reentryForgeDays, advice.reentryFirstDay, advice.reentryCatchUp)],
          ...(advice.reentryFirstDay || advice.reentryCatchUp
            ? { startItems: [...(advice.reentryFirstDay ? reentryFirstDayItems(advice.reentryFirstDay) : []), ...(advice.reentryCatchUp ? reentryCatchUpItems(advice.reentryCatchUp) : [])] }
            : {}),
        }),
        {
          eyebrow: 'Rustiger instap',
          extraTitle: 'Andere lengte, de eerste week terug',
          ask: 'always',
          alwaysAsk: true,
          direct,
          notesTitle: 'Wat er verandert',
          declined: 'Je week blijft zoals hij was. Voor deze terugkomst geen vraag meer.',
          onStored: stored,
          onDeclined: () => void respondToAdvice(advice, 'declined'),
        },
      );
      return true;
    }
    // De ladder van heel licht in een lopende start (engine/beginnerLadderOffer.ts).
    if (advice.beginnerLadder) {
      await horizon.propose(
        () => planHorizonChange({
          title: BEGINNER_LADDER_TITLE,
          why: 'Je start wordt lichter.',
          explanation: BEGINNER_LADDER_EXPLANATION,
          trigger: 'availability_changed',
          settings: { ...ladderConsentPatch },
          notes: beginnerLadderLinesOn(settings, program, todayISO()),
        }),
        {
          eyebrow: 'Rustig beginnen',
          extraTitle: 'Andere lengte',
          ask: 'always',
          alwaysAsk: true,
          direct,
          notesTitle: 'Wat er verandert',
          declined: 'Je start blijft zoals hij is. Geen vraag meer hierover.',
          onStored: stored,
          onDeclined: () => void respondToAdvice(advice, 'declined'),
        },
      );
      return true;
    }
    if (advice.noGoalWaves) {
      await horizon.propose(
        () => planHorizonChange({
          title: NO_GOAL_WAVES_TITLE,
          why: 'Je plant zonder doel in neutrale golven.',
          explanation: 'Zonder doel worden je weken neutrale golven, zonder bergtocht en zonder rugzak. Eerst een voorstel, pas na Akkoord verandert er iets. Wat je al deed en wat je zelf vastzette blijft staan.',
          trigger: 'direction_changed',
          settings: wavesConsentPatch,
          notes: noGoalWavesLines(),
        }),
        {
          eyebrow: 'Zonder doel',
          ask: 'always',
          alwaysAsk: true,
          direct,
          notesTitle: 'Wat er verandert',
          declined: 'Je plan blijft zoals het is. Geen vraag meer hierover.',
          onStored: stored,
          onDeclined: () => void respondToAdvice(advice, 'declined'),
        },
      );
      return true;
    }
    return false;
  }

  return { horizon, ownProposal, accept };
}
