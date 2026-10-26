import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adviceDifferences, differenceIdsOnPage, type AdviceDifference } from '../../engine/settingsDiff';
import { settingsPageTitle, type SettingsPageId } from '../../data/settingsLayout';
import type { SettingsFacts } from '../../engine/settingsSummary';
import { adviceTarget, settingAvailabilityOnPage } from '../../engine/settingsAvailability';
import { usePageState } from '../usePageState';
import { TextButton } from '../TextButton';
import { Eyebrow } from '../ui';
import { jumpRoute } from './jump';
import { SettingsList, SettingsRow } from './SettingsList';
import { Sheet } from './Sheet';
import { useAdviceReset } from './useAdviceReset';
import { settingsAnchor } from '../../data/settingsIndex';

// "Anders dan het advies": wat je zelf anders koos, met de waarde van nu en die van het
// advies, en per regel "Terug naar advies". Bovenaan het overzicht, ingeklapt tot één rij.
// Wat de planning raakt gaat via een voorstel met Akkoord (useAdviceReset).
export function AdviceCard({ facts }: { facts: SettingsFacts }) {
  const navigate = useNavigate();
  const [open, setOpen] = usePageState('advies-open', false);
  const diffs = useMemo(() => adviceDifferences(facts.settings), [facts.settings]);
  const { reset, impact, note, busy } = useAdviceReset();

  // Een instelling die nu verborgen is zegt waarom; tikken gaat naar de rij die het oplost
  // (zoals het zoekveld in het overzicht).
  function go(d: AdviceDifference) {
    const target = adviceTarget(d.id, facts);
    if (!target) return;
    const r = jumpRoute(target.page, { jumpTo: target.row, openSheet: target.sheet, reason: target.reason });
    navigate(r.to, { state: r.state });
  }

  if (diffs.length === 0) return impact ? <>{impact}</> : null;
  return (
    <>
      <div className="st-eyebrow"><Eyebrow>Anders dan het advies</Eyebrow></div>
      <SettingsList>
        <SettingsRow
          id="advies"
          title={diffs.length === 1 ? '1 instelling staat anders' : `${diffs.length} instellingen staan anders`}
          value={open ? 'Inklappen' : 'Bekijken'}
          onClick={() => setOpen(!open)}
        />
        {open && diffs.map((d) => {
          const availability = settingAvailabilityOnPage(d.id, facts);
          return (
          <div key={d.id} className="st-row two" id={settingsAnchor(`advies-${d.id}`)} data-row={`advies-${d.id}`}>
            <button type="button" className="st-hit" aria-label={`${d.title}, nu ${d.value}, advies ${d.advice}`} onClick={() => go(d)} />
            <span className="t"><span className="st-title-text">{d.title}</span></span>
            <span className="s st-num">{availability.available ? `Nu ${d.value}, advies ${d.advice}` : `Nu ${d.value}, advies ${d.advice}. ${availability.reason}`}</span>
            <span className="v" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 1 }}>
              <TextButton disabled={busy} onClick={() => void reset([d.id], `${d.title}: terug naar het advies`)}>Terug naar advies</TextButton>
            </span>
          </div>
          );
        })}
      </SettingsList>
      {note && <p className="st-hint" role="status">{note}</p>}
      {impact}
    </>
  );
}

// Onderaan een groep: "Alles in deze groep terug naar het advies", met een blad dat eerst laat
// zien wat er verandert. Zonder verschillen is er niets te tonen.
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
      <SettingsList>
        <SettingsRow
          id={`terugzetten-${page}`}
          title="Alles in deze groep terug naar het advies"
          value={diffs.length === 1 ? '1 anders' : `${diffs.length} anders`}
          onClick={() => setOpen(true)}
        />
      </SettingsList>
      {note && <p className="st-hint" role="status">{note}</p>}
      {open && (
        <Sheet eyebrow={settingsPageTitle(page)} title="Terug naar het advies" line="Dit staat nu anders dan het advies." onClose={() => setOpen(false)}>
          {(close) => (
            <>
              <SettingsList>
                {diffs.map((d) => (
                  <div key={d.id} className="st-row two">
                    <span className="t"><span className="st-title-text">{d.title}</span></span>
                    <span className="s st-num">{`Nu ${d.value}, advies ${d.advice}`}</span>
                  </div>
                ))}
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
