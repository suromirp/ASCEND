// ASCEND: Meer, MacroFactor inlezen.
//
// The strength workouts come from a MacroFactor export (Workout Log, CSV).
// The file arrives in one of two ways: shared straight to ASCEND on Android
// ("Delen, ASCEND", see public/share-target-sw.js), or picked here with
// "Kies bestand". It is read on this phone and goes nowhere else.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { MacroFactorCard } from '../components/MacroFactorCard';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../components/ui';
import { useAppData } from '../state/AppDataContext';
import { useMacroFactor } from '../state/useMacroFactor';
import { MacroFactorFormatError, nameKey } from '../engine/macrofactorImport';
import { forgetMapping, importMacroFactorText, takeSharedFile } from '../storage/macrofactor';
import { formatDateNL } from '../utils/dates';

type Notice = { tone: 'ok' | 'error'; text: string };

function countText(n: number): string {
  return n === 1 ? '1 krachttraining' : `${n} krachttrainingen`;
}

export function MacroFactorImportPage() {
  const { templates } = useAppData();
  const { loaded, state, mapping, plan } = useMacroFactor();
  const [params, setParams] = useSearchParams();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function readText(text: string, name?: string) {
    setBusy(true);
    try {
      const result = await importMacroFactorText(text, name);
      setNotice({ tone: 'ok', text: `${countText(result.count)} gevonden in het bestand.` });
    } catch (err) {
      setNotice({
        tone: 'error',
        text: err instanceof MacroFactorFormatError ? err.message : 'ASCEND kan dit bestand niet lezen. Kies de Workout Log van MacroFactor als CSV-bestand.',
      });
    } finally {
      setBusy(false);
    }
  }

  // A file that arrived through "Delen, ASCEND" is waiting in the cache.
  const shared = params.get('gedeeld');
  useEffect(() => {
    if (!shared) return;
    let alive = true;
    void (async () => {
      const file = await takeSharedFile();
      if (!alive) return;
      if (file) await readText(file.text, file.name);
      else setNotice({ tone: 'error', text: 'Er kwam geen bestand binnen. Probeer het opnieuw te delen, of kies het bestand hieronder.' });
      setParams({}, { replace: true });
    })();
    return () => {
      alive = false;
    };
    // readText and setParams only set state; they must not retrigger the take.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [shared]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    try {
      await readText(await file.text(), file.name);
    } catch {
      setNotice({ tone: 'error', text: 'ASCEND kan dit bestand niet openen.' });
    }
    if (input.current) input.current.value = '';
  }

  const linked = Object.entries(mapping);
  const nameOf = (key: string) => state.workouts.find((w) => nameKey(w.name) === key)?.name ?? key;
  const templateName = (id: string | null) => (id ? (templates.find((t) => t.id === id)?.name ?? 'een training die er niet meer is') : 'niet inlezen');
  const nothingToOffer = loaded && state.workouts.length > 0 && plan.proposals.length === 0;

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>MACROFACTOR INLEZEN</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>krachttrainingen zonder overtypen</p>
        </div>
      </div>

      <Card className="flex flex-col gap-3">
        <Eyebrow>DRIE STAPPEN</Eyebrow>
        <Step n={1}>Open MacroFactor en ga naar Meer, dan Data Export. De namen kunnen in jouw versie iets anders heten.</Step>
        <Step n={2}>Kies Granular Export en Workout Log, kies de periode (bijvoorbeeld de afgelopen week) en tik op Export Workout Log.</Step>
        <Step n={3}>Tik op Delen en kies ASCEND. Lukt dat niet, bewaar dan het bestand en tik hieronder op Kies bestand.</Step>
        <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
          ASCEND leest het bestand alleen op deze telefoon; het gaat nergens heen. Je krijgt een voorstel, er wordt nooit iets stil opgeslagen.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <Eyebrow>BESTAND</Eyebrow>
        <input
          ref={input}
          type="file"
          accept=".csv,.txt,text/csv,text/comma-separated-values,text/plain,application/csv,application/vnd.ms-excel,application/octet-stream"
          className="sr-only"
          aria-label="Kies de MacroFactor-export"
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
        <PrimaryButton onClick={() => input.current?.click()} disabled={busy}>{busy ? 'BEZIG…' : 'KIES BESTAND'}</PrimaryButton>
        {notice && (
          <p className="text-sm leading-snug" role={notice.tone === 'error' ? 'alert' : 'status'} style={{ color: notice.tone === 'error' ? 'var(--color-danger-text)' : 'var(--color-success-text)' }}>
            {notice.text}
          </p>
        )}
        {state.readAt && !notice && (
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            Laatst gelezen op {formatDateNL(state.readAt.slice(0, 10))}{state.fileName ? `: ${state.fileName}` : ''}.
          </p>
        )}
      </Card>

      <MacroFactorCard />

      {nothingToOffer && (
        <Card className="flex flex-col gap-1">
          <Eyebrow>ALLES STAAT AL IN JE LOGBOEK</Eyebrow>
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
            Van de {countText(state.workouts.length)} in dit bestand is er niets meer dat ASCEND kan toevoegen.
          </p>
        </Card>
      )}

      {linked.length > 0 && (
        <Card className="flex flex-col gap-3">
          <Eyebrow>GEKOPPELDE NAMEN</Eyebrow>
          <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>
            Welke training in MacroFactor welke training in ASCEND is. Je koos dat één keer. Dit staat alleen op deze telefoon en gaat niet mee in een back-up; na een nieuwe telefoon kies je het opnieuw.
          </p>
          {linked.map(([key, templateId]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm" style={{ color: 'var(--color-ink)' }}>{nameOf(key)}</p>
                <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{templateName(templateId)}</p>
              </div>
              <SecondaryButton className="!flex-none px-3" onClick={() => void forgetMapping(key)}>Vergeet</SecondaryButton>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs"
        style={{ borderColor: 'var(--color-bronze)', color: 'var(--color-gold)' }}
      >
        {n}
      </span>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink)' }}>{children}</p>
    </div>
  );
}
