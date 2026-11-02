import { useState } from 'react';
import { useAppData } from '../../../state/AppDataContext';
import { noticesNeed, permissionRows, type DevicePermissions, type PermissionId, type PermissionRow } from '../../../engine/deviceNotices';
import { notificationPort } from '../../../integrations/notifications';
import type { SettingsFacts } from '../../../engine/settingsSummary';
import { SecondaryButton } from '../../ui';
import { SettingsList, SettingsRow } from '../SettingsList';
import { Sheet } from '../Sheet';
import { SummaryRow } from './SummaryRow';
import { useLocationSwitch } from './LocationSwitch';

// Toestemmingen (docs/beslissingen/2026-11-01-android-app.md, ontwerprapport instellingen, Gegevens
// en back-up): per toestemming één rij, Aan of Uit en waarvoor hij nodig is. Een rij die uit staat
// opent een klein blad met één zin en "Toestemming geven". Wie in de welkomstreeks "Niet nu" koos,
// vindt hem hier terug. Wat de telefoon toestaat vraagt alleen integrations/notifications.ts.

// Waar je hem zelf vindt als Android het venster niet (meer) toont.
const WHERE: Record<Exclude<PermissionId, 'health'>, string> = {
  meldingen: 'Android toont de vraag niet meer. Zet meldingen aan in de instellingen van je telefoon: Apps, ASCEND, Meldingen.',
  wekker: 'Lukte het niet? Je vindt het in de instellingen van je telefoon: Apps, ASCEND, Alarmen en herinneringen.',
};

const WHY: Record<PermissionId, string> = {
  meldingen: 'Zodat ASCEND je de ochtendvraag, het einde van je rust en de weekmelding kan sturen.',
  wekker: 'Zodat je telefoon trilt als je rust voorbij is, op de seconde en ook met het scherm uit.',
  health: 'Zet Health Connect aan bij Koppelingen. Dan vraagt Android welke gegevens ASCEND mag lezen.',
};

async function ask(id: PermissionId): Promise<boolean> {
  const port = notificationPort();
  if (id === 'meldingen') return (await port.requestNotifications()) === 'granted';
  if (id === 'wekker') return (await port.requestExactAlarm()) === 'granted';
  return false;
}

// Een rij die uit staat: één zin, en de knop die het scherm van Android of de browser opent.
function PermissionAskSheet({ row, onDone, onClose }: { row: PermissionRow; onDone: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Sheet eyebrow="Toestemmingen" title={row.title} line={WHY[row.id]} onClose={onClose}>
      {(close) => (
        <>
          {failed && row.id !== 'health' && <p className="st-hint" role="status" style={{ marginLeft: 0 }}>{WHERE[row.id]}</p>}
          {row.canAsk && (
            <div className="st-btns">
              <SecondaryButton
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void ask(row.id)
                    .then((ok) => {
                      onDone();
                      if (ok) close();
                      else setFailed(true);
                    })
                    .catch(() => setFailed(true))
                    .finally(() => setBusy(false));
                }}
              >
                {busy ? 'Bezig…' : 'Toestemming geven'}
              </SecondaryButton>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}

export function PermissionsSheet({ facts, onChanged, onStorage, onClose }: { facts: SettingsFacts; onChanged: () => void; onStorage: () => void; onClose: () => void }) {
  const { settings } = useAppData();
  // Je locatie staat hier, bij de toestemmingen: aanzetten vraagt er een en toont de uitkomst.
  const location = useLocationSwitch();
  const [open, setOpen] = useState<PermissionRow | null>(null);
  const device = facts.device && facts.device !== 'unknown' ? facts.device : undefined;
  const rows = device ? permissionRows(device, noticesNeed(settings, device)) : [];
  return (
    <Sheet eyebrow="Gegevens en back-up" title="Toestemmingen" line="Wat je telefoon ASCEND toestaat. Zonder een toestemming werkt alleen dat ene ding niet." onClose={onClose}>
      <SettingsList>
        {!device && <SettingsRow id="toestemming-laden" title="Meldingen" kind="static" value={facts.device === 'unknown' ? 'Onbekend' : 'Even kijken'} dim />}
        {rows.map((r) => (
          <SettingsRow
            key={r.id}
            id={`toestemming-${r.id}`}
            title={r.title}
            sub={r.line}
            value={r.value}
            dim={!r.on}
            dot={r.warn ? 'warn' : undefined}
            kind={r.on ? 'static' : 'nav'}
            onClick={r.on ? undefined : () => setOpen(r)}
          />
        ))}
        <SummaryRow id="locatie" title="Je locatie" facts={facts} info="locatie" onChange={(on) => void location.onChange(on)} />
        {/* Opslag beschermd is een vraag aan de browser; in de app ruimt de telefoon niets zomaar op. */}
        {!device?.timed && facts.storage !== undefined && facts.storage !== 'unsupported' && <SummaryRow id="opslag" title="Opslag beschermd" facts={facts} sub="Je telefoon ruimt je gegevens niet zomaar op" onClick={onStorage} />}
      </SettingsList>
      {location.status}
      {open && <PermissionAskSheet row={open} onDone={onChanged} onClose={() => setOpen(null)} />}
    </Sheet>
  );
}

// Onder het blad Meldingen, alleen als er iets ontbreekt wat een gekozen melding nodig heeft.
export function PermissionAskButton({ device, need, onDone }: { device: DevicePermissions; need: { notifications: boolean; exactAlarm: boolean }; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<PermissionId | null>(null);
  const missing: PermissionId | null = need.notifications && device.notifications !== 'granted' ? 'meldingen' : need.exactAlarm && device.exactAlarm !== 'granted' ? 'wekker' : null;
  if (!missing) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <p className="st-hint" style={{ marginLeft: 0 }}>{failed ? WHERE[failed as Exclude<PermissionId, 'health'>] : missing === 'meldingen' ? 'Toestemming voor meldingen staat uit.' : 'De exacte wekker staat uit, dus het einde van je rust kan wat later komen.'}</p>
      <div className="st-btns">
        <SecondaryButton
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void ask(missing)
              .then((ok) => setFailed(ok ? null : missing))
              .catch(() => setFailed(missing))
              .finally(() => {
                setBusy(false);
                onDone();
              });
          }}
        >
          {busy ? 'Bezig…' : 'Toestemming geven'}
        </SecondaryButton>
      </div>
    </div>
  );
}
