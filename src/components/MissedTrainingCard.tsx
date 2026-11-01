// ASCEND: een training die niet doorging, op Vandaag (engine/missedTraining.ts,
// docs/beslissingen/2026-11-01-niet-doorgegaan.md). Hoogstens één kaart, de oudste training eerst:
// - een log van je horloge of MacroFactor die erbij kan horen: "Hoort die bij elkaar?" met Akkoord en
//   Liever niet. Pas na Akkoord hangt de log aan de training, met Ongedaan maken in de melding;
// - anders, na de gekozen dagen, "Niet gedaan?" met Niet gedaan (op overgeslagen), Toch gedaan (het
//   gewone invullen) en Niet nu;
// - met Zelf overslaan zet ASCEND hem zelf op overgeslagen en zegt het in de meldingsbalk.
// Geen gevulde mint knop: het ene mint accent van Vandaag blijft de missie.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { askLine, declinedKey, linkLine, planMissed, resolveMissedSettings, type MissedMemory } from '../engine/missedTraining';
import { readMissedMemory, updateMissedMemory } from '../storage/missedTraining';
import type { PlannedSession } from '../models/training';
import { todayISO } from '../utils/dates';
import { withTimeout } from '../utils/withTimeout';
import { Card, Eyebrow, SecondaryButton } from './ui';
import { TextButton } from './TextButton';

// Wacht even tot de planning na het openen staat, zoals het vanzelf afvinken.
const AUTO_DELAY_MS = 1500;
// Een knop die wacht, wacht nooit langer dan dit.
const SAVE_LIMIT_MS = 8000;

export function MissedTrainingCard({ onLogNow }: { onLogNow: (session: PlannedSession) => void }) {
  const { plannedSessions, sessionLogs, templates, settings, advice, skipMissed, linkMissedLog } = useAppData();
  const today = todayISO();
  const [memory, setMemory] = useState<MissedMemory | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const autoRunning = useRef(false);

  useEffect(() => {
    let alive = true;
    void readMissedMemory().then((m) => alive && setMemory(m)).catch(() => alive && setMemory({}));
    return () => {
      alive = false;
    };
  }, []);

  const missedSettings = resolveMissedSettings(settings);
  // Wat al in een advies op Vandaag staat (een gemiste training inhalen of laten vervallen), krijgt geen tweede kaart.
  const busyIds = useMemo(
    () => new Set(advice.flatMap((a) => [a.proposal, ...(a.options?.map((o) => o.proposal) ?? [])]).flatMap((p) => p?.changes ?? []).map((c) => c.plannedSessionId).filter((id): id is string => !!id)),
    [advice],
  );
  const plan = useMemo(
    () => (memory ? planMissed({ plannedSessions, logs: sessionLogs, templates, today, settings: missedSettings, memory, busy: busyIds, illnessEpisodes: settings.illnessEpisodes }) : undefined),
    // missedSettings komt uit settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memory, plannedSessions, sessionLogs, templates, today, settings, busyIds],
  );

  // Zelf overslaan: eerst onthouden dat ASCEND het deed (dan komt het na Ongedaan maken niet terug), dan de melding.
  const autoIds = plan?.autoSkip.map((m) => m.session.id).join(',') ?? '';
  useEffect(() => {
    if (!autoIds || autoRunning.current) return;
    const ids = autoIds.split(',');
    const timer = setTimeout(() => {
      autoRunning.current = true;
      void updateMissedMemory((m) => ({ ...m, auto: [...(m.auto ?? []), ...ids] }))
        .then((next) => {
          setMemory(next);
          return skipMissed(ids, 'auto');
        })
        .catch(() => undefined)
        .finally(() => {
          autoRunning.current = false;
        });
    }, AUTO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [autoIds, skipMissed]);

  const item = plan?.item;
  if (!item) return null;

  const remember = (change: (m: MissedMemory) => MissedMemory) => {
    setMemory((m) => change(m ?? {}));
    void updateMissedMemory(change).then(setMemory).catch(() => undefined);
  };
  const run = (action: () => Promise<boolean | number>) => {
    setBusy(true);
    setNote(null);
    void withTimeout(action(), SAVE_LIMIT_MS, 'Opslaan')
      .then((done) => {
        if (!done) setNote('Dat lukte niet, de training is intussen veranderd. Kijk even in je week.');
      })
      .catch(() => setNote('Opslaan duurde te lang. Er is niets veranderd; probeer het zo nog eens.'))
      .finally(() => setBusy(false));
  };

  if (item.kind === 'link') {
    return (
      <Card data-missed={item.session.id}>
        <Eyebrow>Hoort dit bij elkaar?</Eyebrow>
        <p className="mt-1 text-base" style={{ color: 'var(--color-ink)' }}>{linkLine(item.session, item.template, item.log, today)}</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Met Akkoord telt die training als gedaan. Alleen de koppeling is nieuw, de cijfers blijven zoals ze waren.</p>
        <div className="mt-3 flex gap-2">
          <SecondaryButton disabled={busy} onClick={() => run(() => linkMissedLog(item.log.id, item.session.id))}>{busy ? 'Bezig…' : 'Akkoord'}</SecondaryButton>
          <SecondaryButton disabled={busy} onClick={() => remember((m) => ({ ...m, declined: [...(m.declined ?? []), declinedKey(item.log.id, item.session.id)] }))}>Liever niet</SecondaryButton>
        </div>
        {note && <p className="mt-2 text-sm" role="status" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
      </Card>
    );
  }

  return (
    <Card data-missed={item.session.id}>
      <Eyebrow>Nog open</Eyebrow>
      <p className="mt-1 font-display text-xl" style={{ color: 'var(--color-ink)' }}>Niet gedaan?</p>
      <p className="mt-1 text-base" style={{ color: 'var(--color-ink)' }}>{askLine(item.session, item.template)}</p>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Er staat nog geen training bij. Ging hij niet door, dan zet ASCEND hem op overgeslagen. Er verandert verder niets.</p>
      <div className="mt-3 flex gap-2">
        <SecondaryButton disabled={busy} onClick={() => run(() => skipMissed([item.session.id], 'answer'))}>{busy ? 'Bezig…' : 'Niet gedaan'}</SecondaryButton>
        <SecondaryButton disabled={busy} onClick={() => onLogNow(item.session)}>Toch gedaan</SecondaryButton>
      </div>
      <div className="mt-1 flex justify-end">
        <TextButton tone="dim" disabled={busy} onClick={() => remember((m) => ({ ...m, notNow: [...(m.notNow ?? []), item.session.id], notNowOn: today }))}>Niet nu</TextButton>
      </div>
      {note && <p className="mt-2 text-sm" role="status" style={{ color: 'var(--color-ink-dim)' }}>{note}</p>}
      {missedSettings.choice === 'auto' && <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>Een test, een wedstrijd of iets wat je zelf vastzette slaat ASCEND nooit zelf over.</p>}
    </Card>
  );
}
