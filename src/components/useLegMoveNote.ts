import { useMemo } from 'react';
import { useAppData } from '../state/AppDataContext';
import { currentBodyKg } from '../engine/bodyWeight';
import { moveLegNote } from '../engine/legDayEase';
import { resolveLegEase } from '../engine/legEaseSettings';
import { resolveVariantDuration } from '../engine/substitutions';
import { todayISO } from '../utils/dates';
import type { PlannedSession, SessionTemplate } from '../models/training';

// De stille regel bij het verplaatsen van een zware beendag of harde training (engine/legDayEase.ts#moveLegNote):
// hoe vermoeid je benen op de nieuwe dag ongeveer zijn. Alleen een regel, zonder knop en zonder iets te
// blokkeren. De instelling "Lichter bij vermoeide benen" op Uit zet hem uit.
// `endState` is de planning met alle items van het voorstel toegepast: de regel rekent op wat je na Akkoord hebt,
// niet op de planning van nu (een voorstel dat zelf een beendag laat vervallen of de test zelf regelt).
export function useLegMoveNotes(moves: { sessionId?: string; toDate?: string }[], endState?: PlannedSession[]): { line: string; explain: string }[] {
  const { sessionLogs, plannedSessions: storedSessions, templates, program, settings, injuryNotes } = useAppData();
  const plannedSessions = endState ?? storedSessions;
  const mode = resolveLegEase(settings);
  const bodyKg = currentBodyKg(settings.weightEntries, settings.weightFromMacroFactor);
  const key = moves.map((m) => `${m.sessionId}:${m.toDate}`).join('|');
  return useMemo(() => {
    if (mode === 'uit') return [];
    const out: { line: string; explain: string }[] = [];
    try {
      const deps = {
        logs: sessionLogs, plannedSessions, templates, program, bodyKg, today: todayISO(),
        minutesOf: (s: PlannedSession, t: SessionTemplate) => resolveVariantDuration(t, 'full', s.scheduledDate, program),
        injuries: injuryNotes, checkIns: settings.morningCheckIns ?? [],
      };
      for (const m of moves) {
        if (!m.sessionId || !m.toDate) continue;
        const note = moveLegNote({ sessionId: m.sessionId, toDate: m.toDate, deps, mode });
        if (note && !out.some((o) => o.line === note.line)) out.push(note);
      }
    } catch (err) {
      console.error('Beenindex bij het verplaatsen: berekening mislukt:', err);
    }
    return out;
    // De lijst met verplaatsingen is de inhoud van `key`.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key, mode, sessionLogs, plannedSessions, templates, program, bodyKg, injuryNotes, settings.morningCheckIns]);
}
