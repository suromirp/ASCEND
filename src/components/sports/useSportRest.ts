// Een voorstel na een zware sport blijft tot je kiest (I-23 punt 10, engine/sportRestOffer.ts). Wat Vandaag ervan
// laat zien: de rustige regel als het voorstel verviel, en het voorstel zelf op de beendag. Rekenen in de engine,
// schrijven via appendSportRest (alleen toevoegen); hier alleen wie wat wanneer leest.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { MetaRepo } from '../../storage/database';
import { decisionFor } from '../../engine/legDayEase';
import {
  answerRow, lapsedSportRests, liveSportRests, parseSportRestOffers, resolveSportRestKeep, shownRows, todaySportRest, weekAnswerRows,
  type AnswerMap, type LapsedSportRest, type TodaySportRest,
} from '../../engine/sportRestOffer';
import { mondayOfWeek, todayISO } from '../../utils/dates';
import { withTimeout } from '../../utils/withTimeout';

// Opslaan wacht hoogstens zo lang; daarna een zichtbare uitkomst.
export const SPORT_REST_SAVE_MS = 8000;
export const SPORT_REST_FAILED = 'Dit lukte niet. Je planning is niet veranderd.';

// Een spoorregel die op de achtergrond wordt geschreven: Week of Vandaag liet het voorstel zien, of je koos al in
// Week, of je Akkoord is al toegepast. Hier wacht geen knop en je planning hangt er niet van af; lukt het niet, dan
// probeert de volgende opening het opnieuw (de regel wordt opnieuw afgeleid). Daarom alleen de console, bewust.
function traceInBackground(write: Promise<void>, what: string): Promise<void> {
  return write.then(
    () => undefined,
    (err: unknown) => {
      console.error(what, err);
    },
  );
}

// Je antwoorden op voorstellen (ook die in Week), om te zien of je daar al koos.
function useAnswers(): AnswerMap {
  const { answeredAdviceIds } = useAppData();
  const [answers, setAnswers] = useState<AnswerMap>({});
  useEffect(() => {
    let alive = true;
    void MetaRepo.get<AnswerMap>('adviceResponses').then((r) => alive && setAnswers(r ?? {})).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [answeredAdviceIds]);
  return answers;
}

function useOffers() {
  const { settings } = useAppData();
  const today = todayISO();
  const list = useMemo(() => parseSportRestOffers(settings.sportRestOffers, today).list ?? [], [settings.sportRestOffers, today]);
  const keep = resolveSportRestKeep(settings.sportRestKeep);
  const legEaseDays = settings.legEaseDays;
  const choseOn = useCallback((date: string, sessionId: string) => !!decisionFor(legEaseDays, date, sessionId), [legEaseDays]);
  return { list, keep, today, choseOn };
}

// De regel na een voorstel dat verviel, met Begrepen. Schrijft ook wat je in Week al koos, zodat het spoor
// compleet is.
export function useSportRestLapsed(): { lapsed: LapsedSportRest | undefined; understood: () => Promise<void> } {
  const { plannedSessions, templates, appendSportRest } = useAppData();
  const { list, keep, today, choseOn } = useOffers();
  const answers = useAnswers();
  const lapsed = useMemo(
    () => (keep === 'blijft' ? lapsedSportRests({ list, sessions: plannedSessions, templates, today, answers, choseOn })[0] : undefined),
    [keep, list, plannedSessions, templates, today, answers, choseOn],
  );
  const fromWeek = useMemo(() => (keep === 'blijft' ? weekAnswerRows(list, answers, today) : []), [keep, list, answers, today]);
  useEffect(() => {
    if (fromWeek.length > 0) void traceInBackground(appendSportRest(fromWeek), 'Je keuze in Week kon niet bij het voorstel worden bewaard:');
  }, [fromWeek, appendSportRest]);
  const understood = useCallback(async () => {
    if (!lapsed) return;
    await withTimeout(appendSportRest([answerRow(lapsed.id, 'lapsed', todayISO(), new Date().toISOString())]), SPORT_REST_SAVE_MS);
  }, [lapsed, appendSportRest]);
  return { lapsed, understood };
}

// Het voorstel op de beendag. Vandaag zag het: de eerste regel, als Week hem nog niet schreef.
export function useSportRestToday(): { offer: TodaySportRest | undefined; answer: (choice: 'accepted' | 'declined') => Promise<void> } {
  const { plannedSessions, sessionLogs, templates, weekNoticeFor, weekFixesFor, appendSportRest, commitPlanChange } = useAppData();
  const { list, keep, today, choseOn } = useOffers();
  const answers = useAnswers();
  const monday = mondayOfWeek(today);
  const live = useMemo(() => {
    if (keep !== 'blijft') return [];
    try {
      return liveSportRests(weekNoticeFor(monday).concerns, plannedSessions, sessionLogs);
    } catch (err) {
      console.error('Het voorstel na een sport kon niet worden berekend:', err);
      return [];
    }
  }, [keep, weekNoticeFor, monday, plannedSessions, sessionLogs]);
  const offer = useMemo(() => {
    if (!live.some((l) => l.sessionDate === today)) return undefined;
    try {
      return todaySportRest({ live, list, sessions: plannedSessions, logs: sessionLogs, templates, today, answers, choseOn, fixFor: (l) => weekFixesFor(monday).fixes[l.concern.key] ?? null });
    } catch (err) {
      console.error('Het voorstel na een sport kon niet worden berekend:', err);
      return undefined;
    }
  }, [live, list, plannedSessions, sessionLogs, templates, today, answers, choseOn, weekFixesFor, monday]);
  const firstRows = useMemo(() => (offer ? shownRows(list, live.filter((l) => l.id === offer.id), today, new Date().toISOString()) : []), [offer, list, live, today]);
  useEffect(() => {
    if (firstRows.length > 0) void traceInBackground(appendSportRest(firstRows), 'Het voorstel na een sport kon niet worden bewaard:');
  }, [firstRows, appendSportRest]);
  const answer = useCallback(async (choice: 'accepted' | 'declined') => {
    if (!offer) return;
    if (choice === 'accepted') {
      // Eerst de planning; lukt die niet, dan blijft het voorstel staan en zegt de kaart het.
      const ok = await withTimeout(commitPlanChange(offer.proposal, offer.advice.title), SPORT_REST_SAVE_MS);
      if (!ok) throw new Error('Het voorstel kon niet worden toegepast.');
      // De training staat nu op een andere dag, dus het voorstel komt niet terug, ook als deze regel niet lukt.
      await traceInBackground(withTimeout(appendSportRest([answerRow(offer.id, 'accepted', todayISO(), new Date().toISOString())]), SPORT_REST_SAVE_MS), 'Akkoord kon niet bij het voorstel worden bewaard:');
      return;
    }
    await withTimeout(appendSportRest([answerRow(offer.id, 'declined', todayISO(), new Date().toISOString())]), SPORT_REST_SAVE_MS);
  }, [offer, commitPlanChange, appendSportRest]);
  return { offer, answer };
}

// Week zag het voorstel: de eerste regel voor elke melding over een sport die Week met een voorstel laat zien.
export function useSportRestSeenInWeek(concerns: Parameters<typeof liveSportRests>[0], covered: readonly string[]) {
  const { plannedSessions, sessionLogs, settings, appendSportRest } = useAppData();
  const { list, keep, today } = useOffers();
  const proposalsOn = settings.weekFixProposal !== false;
  const rows = useMemo(() => {
    if (keep !== 'blijft' || !proposalsOn) return [];
    const shown = concerns.filter((c) => !covered.includes(c.key));
    return shownRows(list, liveSportRests(shown, plannedSessions, sessionLogs), today, new Date().toISOString());
  }, [keep, proposalsOn, concerns, covered, list, plannedSessions, sessionLogs, today]);
  useEffect(() => {
    if (rows.length > 0) void traceInBackground(appendSportRest(rows), 'Het voorstel na een sport kon niet worden bewaard:');
  }, [rows, appendSportRest]);
}
