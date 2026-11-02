import { useState } from 'react';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveAutoBackup, resolveAutoBackupKeep } from '../../../engine/autoBackup';
import type { SettingsFacts } from '../../../engine/settingsSummary';
import { appBackupFolder } from '../../../integrations/backupFolder';
import { clearAutoBackupFailure } from '../../../storage/autoBackup';
import { useAppData } from '../../../state/AppDataContext';
import { withTimeout } from '../../../utils/withTimeout';
import { Eyebrow } from '../../ui';
import { ChoiceList, Sheet } from '../Sheet';

const options = <T extends string | number>(def: { options: { value: T; label: string; note?: string }[] }) =>
  def.options.map((o) => ({ value: o.value, label: o.label, note: o.note }));

// Automatische back-up: hoe vaak, en hoeveel bestanden in de map blijven. In de browser zonder vaste
// map is er niets op te ruimen (de bestanden staan in je downloads), dus dan staat Bewaren er niet.
export function AutoBackupSheet({ facts, onClose }: { facts: SettingsFacts; onClose: () => void }) {
  const { settings, updateSettings } = useAppData();
  const frequency = resolveAutoBackup(settings.autoBackup);
  const keep = resolveAutoBackupKeep(settings.autoBackupKeep);
  const app = facts.autoBackup?.platform === 'app';
  const folder = facts.autoBackup?.folder;
  const how = app
    ? `In de app maakt ASCEND het bestand zelf in ${folder ?? 'Documenten/ASCEND'}, de eerste keer dat je hem opent na het moment.`
    : folder
      ? `Je browser schrijft het stil in ${folder} als hij die map zonder vragen vrijgeeft. Anders staat er op het moment een kaart op Vandaag.`
      : 'Een browser mag niet zelf een bestand opslaan. Op het moment staat er een kaart op Vandaag met Back-up maken.';
  return (
    <Sheet eyebrow={CHOICES.autoBackup.group} title={CHOICES.autoBackup.title} line={CHOICES.autoBackup.line} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <ChoiceList
          label={CHOICES.autoBackup.title}
          options={options(CHOICES.autoBackup)}
          value={frequency}
          advice={CHOICES.autoBackup.advice}
          onPick={(v) => void updateSettings({ autoBackup: v })}
        />
        {frequency !== 'off' && (app || folder) && (
          <div id="instelling-backup-bewaren">
            <Eyebrow>{CHOICES.autoBackupKeep.title}</Eyebrow>
            <ChoiceList
              label={CHOICES.autoBackupKeep.title}
              options={options(CHOICES.autoBackupKeep)}
              value={keep}
              advice={CHOICES.autoBackupKeep.advice}
              onPick={(v) => void updateSettings({ autoBackupKeep: v })}
            />
          </div>
        )}
      </div>
      {frequency !== 'off' && <p className="st-hint" style={{ marginLeft: 0 }}>{how}</p>}
      {frequency !== 'off' && (app || folder) && (
        <p className="st-hint" style={{ marginLeft: 0 }}>ASCEND ruimt alleen back-ups op die hij zelf in die map zette.</p>
      )}
    </Sheet>
  );
}

// Vaste map in de app: altijd Documenten/ASCEND. Op Android 10 en ouder is er toestemming nodig om
// daar te schrijven; die vraagt ASCEND alleen na een tik op deze knop.
export function AppFolderSheet({ facts, onChanged, onClose }: { facts: SettingsFacts; onChanged: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; warn: boolean } | null>(null);
  const label = facts.autoBackup?.folder ?? 'Documenten/ASCEND';
  async function check() {
    const folder = appBackupFolder();
    if (!folder) return;
    setBusy(true);
    try {
      const ok = await withTimeout(folder.requestAccess(), 15_000).catch(() => false);
      if (ok) await clearAutoBackupFailure();
      setNote(ok
        ? { text: 'ASCEND mag in de map schrijven. De volgende back-up komt er vanzelf in.', warn: false }
        : { text: 'Geen toegang. Geef ASCEND toegang tot bestanden in de instellingen van je telefoon, of maak de back-up zelf.', warn: true });
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet eyebrow="Gegevens en back-up" title="Vaste map" line={`De automatische back-up gaat naar ${label} op je telefoon.`} onClose={onClose}>
      <p className="st-hint" style={{ marginLeft: 0, marginTop: 0 }}>
        Die map zie je in je bestandsbeheerder. Wil je hem ook in Google Drive, laat dan een app die mappen kopieert deze map meenemen.
      </p>
      <div className="st-btns">
        <button type="button" className="st-btn" disabled={busy} onClick={() => void check()}>
          {busy ? 'Even kijken…' : 'Toegang geven'}
        </button>
      </div>
      {note && <p className={`st-hint${note.warn ? ' warn' : ''}`} style={{ marginLeft: 0 }} role="status">{note.text}</p>}
    </Sheet>
  );
}

