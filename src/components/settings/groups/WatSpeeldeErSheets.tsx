import { useMemo, useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { CHOICES } from '../../../data/settingsChoices';
import { isNoted, reasonsText } from '../../../engine/influence';
import { formatShortDayNL } from '../../../utils/dates';
import { TimeoutError, withTimeout } from '../../../utils/withTimeout';
import { InfluenceSheet } from '../../influence/InfluenceSheet';
import { SettingsEmpty, SettingsList, SettingsRow } from '../SettingsList';
import { Sheet } from '../Sheet';
import { ChoiceFromDef } from './ChoiceFromDef';

// Mogelijke oorzaak: Uit, Wat ASCEND weet, Ook je patroon. Het blad sluit na een keuze.
export function OorzaakSheet({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  return (
    <ChoiceFromDef
      def={CHOICES.oorzaak}
      value={settings.influenceCause ?? 'patroon'}
      onPick={(v) => void updateSettings({ influenceCause: v })}
      onClose={onClose}
    />
  );
}

const WIPE_LIMIT_MS = 10_000;

// Vastgelegd: elke notitie met de datum, de training of "dag" en de redenen. Een tik opent dezelfde
// notitie om te wijzigen of weg te halen. "Alles wissen" vraagt eerst om bevestiging.
export function VastgelegdSheet({ onClose }: { onClose: () => void }) {
  const { settings, sessionLogs, templateById, clearInfluences } = useAppData();
  // De geopende notitie blijft open ook als je alles uitzet; de plek is genoeg om hem terug te vinden.
  const [open, setOpen] = useState<{ date: string; logId?: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const noted = useMemo(
    () => (settings.influences ?? []).filter(isNoted).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)),
    [settings.influences],
  );

  const placeOf = (e: { logId?: string }): string => {
    if (!e.logId) return 'Dag';
    const log = sessionLogs.find((l) => l.id === e.logId);
    return log ? templateById.get(log.templateId)?.name ?? 'Training' : 'Training';
  };

  async function wipe() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await withTimeout(clearInfluences(), WIPE_LIMIT_MS, 'Wissen');
      setConfirming(false);
    } catch (err) {
      setNote(err instanceof TimeoutError ? 'Wissen is nog niet bevestigd. Kijk zo of de lijst leeg is.' : 'Wissen lukte niet. Er is niets veranderd; probeer het zo nog eens.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Sheet eyebrow="Wat speelde er" title="Vastgelegd" line="Wat je zelf vastlegde. Het blijft op deze telefoon en gaat mee in je back-up." onClose={onClose}>
        {(close) => (
          <>
            {noted.length === 0 ? (
              <SettingsEmpty text="Je hebt nog niets vastgelegd. Dat doe je in het blad van een training of op een dag in het logboek." />
            ) : (
              <SettingsList>
                {noted.map((e) => (
                  <SettingsRow
                    key={e.id}
                    id={`vastgelegd-${e.id}`}
                    title={formatShortDayNL(e.date)}
                    value={placeOf(e)}
                    sub={[reasonsText(e), e.excludeHeartRate ? 'telt niet mee' : ''].filter(Boolean).join(', ')}
                    onClick={() => setOpen({ date: e.date, logId: e.logId })}
                  />
                ))}
              </SettingsList>
            )}
            {noted.length > 0 && (
              <>
                {confirming && <p className="st-hint" style={{ marginLeft: 0, color: 'var(--color-warning)' }} role="alert">Alle {noted.length} notities worden gewist. Je trainingen en de cijfers van je horloge blijven zoals ze zijn.</p>}
                {note && <p className="st-hint" style={{ marginLeft: 0 }} role="status">{note}</p>}
                <div className="st-btns">
                  <button type="button" className="st-btn" disabled={busy} onClick={confirming ? () => setConfirming(false) : close}>{confirming ? 'Annuleren' : 'Sluiten'}</button>
                  {confirming ? (
                    <button type="button" className="st-btn red" disabled={busy} onClick={() => void wipe()}>{busy ? 'Bezig…' : 'Ja, wissen'}</button>
                  ) : (
                    <button type="button" className="st-btn" onClick={() => setConfirming(true)}>Alles wissen</button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </Sheet>
      {open && (
        <InfluenceSheet
          eyebrow={formatShortDayNL(open.date)}
          title={open.logId ? 'Wat speelde er?' : `Wat speelde er op ${formatShortDayNL(open.date)}?`}
          line={open.logId ? placeOf(open) : undefined}
          target={{ date: open.date, logId: open.logId }}
          log={open.logId ? sessionLogs.find((l) => l.id === open.logId) : undefined}
          removable
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
