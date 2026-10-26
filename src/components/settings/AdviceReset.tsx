import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adviceDifferences, differenceIdsOnPage, type AdviceDifference } from '../../engine/settingsDiff';
import { settingsPageTitle, type SettingsPageId } from '../../data/settingsLayout';
import type { SettingsFacts } from '../../engine/settingsSummary';
import { adviceTarget, settingAvailabilityOnPage } from '../../engine/settingsAvailability';
import { TextButton } from '../TextButton';
import { jumpRoute } from './jump';
import { SettingsList } from './SettingsList';
import { Sheet } from './Sheet';
import { useAdviceReset } from './useAdviceReset';

// Terug naar het advies, rustig en op de plek zelf (docs/beslissingen/2026-10-26-advies-anders.md):
// een rij die jij anders instelde heeft het label "aangepast", het keuzeblad zegt bij het advies
// "Advies", en wie alles wil zien heeft het blad "Aangepaste instellingen" onder Gegevens en
// back-up. Wat de planning raakt gaat via een voorstel met Akkoord (useAdviceReset).

function DifferenceLine({ d, facts, onTap }: { d: AdviceDifference; facts: SettingsFacts; onTap?: () => void }) {
  const availability = settingAvailabilityOnPage(d.id, facts);
  const sub = availability.available ? `Nu ${d.value}, advies ${d.advice}` : `Nu ${d.value}, advies ${d.advice}. ${availability.reason}`;
  return (
    <div className={`st-row two${onTap ? ' go' : ''}`}>
      {onTap && <button type="button" className="st-hit" aria-label={`${d.title}, nu ${d.value}, advies ${d.advice}`} onClick={onTap} />}
      <span className="t"><span className="st-title-text">{d.title}</span></span>
      <span className="s st-num">{sub}</span>
    </div>
  );
}

// Het blad met alles wat anders staat: tikken opent de instelling, onderaan één knop die alles
// terugzet, na een bevestiging.
export function AdjustedSheet({ facts, onClose }: { facts: SettingsFacts; onClose: () => void }) {
  const navigate = useNavigate();
  const diffs = useMemo(() => adviceDifferences(facts.settings), [facts.settings]);
  const { reset, impact, note, busy: planBusy } = useAdviceReset();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ to: string; state: unknown } | null>(null);

  // De sprong gebeurt pas als het blad dicht is, zodat de terugknop niets raars doet.
  function go(d: AdviceDifference, close: () => void) {
    const target = adviceTarget(d.id, facts);
    if (!target) return;
    const r = jumpRoute(target.page, { jumpTo: target.row, openSheet: target.sheet, reason: target.reason });
    pending.current = { to: r.to, state: r.state };
    close();
  }

  return (
    <>
      <Sheet
        eyebrow="Gegevens en back-up"
        title="Aangepaste instellingen"
        line={diffs.length === 0 ? 'Alles staat op het advies.' : 'Dit koos je zelf anders dan het advies. Tik op een regel om de instelling te openen.'}
        onClose={() => {
          onClose();
          const next = pending.current;
          pending.current = null;
          if (next) navigate(next.to, { state: next.state });
        }}
      >
        {(close) => (
          <>
            <SettingsList>
              {diffs.map((d) => <DifferenceLine key={d.id} d={d} facts={facts} onTap={() => go(d, close)} />)}
            </SettingsList>
            {note && <p className="st-hint" role="status">{note}</p>}
            {diffs.length > 0 && !confirm && (
              <div className="st-btns">
                <button type="button" className="st-btn" onClick={() => setConfirm(true)}>Alles terug naar het advies</button>
              </div>
            )}
            {diffs.length > 0 && confirm && (
              <>
                <p className="st-hint" style={{ marginLeft: 0 }}>
                  {diffs.length === 1 ? 'Deze instelling gaat terug naar het advies.' : `Deze ${diffs.length} instellingen gaan terug naar het advies.`}
                  {diffs.some((d) => d.plan) ? ' Wat je planning raakt, zie je eerst als voorstel. Pas na Akkoord verandert het.' : ''}
                </p>
                <div className="st-btns">
                  <button type="button" className="st-btn" onClick={() => setConfirm(false)}>Annuleren</button>
                  <button
                    type="button"
                    className="st-btn gold"
                    disabled={busy || planBusy}
                    onClick={() => {
                      setBusy(true);
                      void reset(diffs.map((d) => d.id), 'Alle instellingen: terug naar het advies').finally(() => {
                        setBusy(false);
                        close();
                      });
                    }}
                  >
                    Terugzetten
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </Sheet>
      {impact}
    </>
  );
}

// Onderaan een groep: "Alles in deze groep terug naar het advies", alleen als er in die groep iets
// anders staat, met een blad dat eerst laat zien wat er verandert.
export function GroupReset({ page, facts }: { page: SettingsPageId; facts: SettingsFacts }) {
  const [open, setOpen] = useState(false);
  const diffs = useMemo(() => adviceDifferences(facts.settings).filter((d) => d.page === page), [facts.settings, page]);
  const { reset, impact, note, busy: planBusy } = useAdviceReset();
  const [busy, setBusy] = useState(false);

  if (diffs.length === 0) return impact ? <>{impact}</> : null;
  const ids = differenceIdsOnPage(facts.settings, page);
  return (
    <>
      <div className="st-eyebrow-gap" />
      <div className="st-foot" style={{ textAlign: 'center' }}>
        <TextButton onClick={() => setOpen(true)}>Alles in deze groep terug naar het advies</TextButton>
      </div>
      {note && <p className="st-hint" role="status">{note}</p>}
      {open && (
        <Sheet eyebrow={settingsPageTitle(page)} title="Terug naar het advies" line="Dit staat nu anders dan het advies." onClose={() => setOpen(false)}>
          {(close) => (
            <>
              <SettingsList>
                {diffs.map((d) => <DifferenceLine key={d.id} d={d} facts={facts} />)}
              </SettingsList>
              {diffs.some((d) => d.plan) && (
                <p className="st-hint" style={{ marginLeft: 0 }}>Wat je planning raakt, zie je eerst als voorstel. Pas na Akkoord verandert het.</p>
              )}
              <div className="st-btns">
                <button type="button" className="st-btn" onClick={close}>Annuleren</button>
                <button
                  type="button"
                  className="st-btn gold"
                  disabled={busy || planBusy}
                  onClick={() => {
                    setBusy(true);
                    void reset(ids, `${settingsPageTitle(page)}: terug naar het advies`).finally(() => {
                      setBusy(false);
                      close();
                    });
                  }}
                >
                  Terugzetten
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}
      {impact}
    </>
  );
}
