// "Je deed zwemmen. Hoe telt dit?" (docs/visie/Sporten die meetellen.md, 2.5). Een rustige regel op Vandaag,
// geen kaart: een activiteit van een sport zonder gekozen rol telt nog niet mee, en de planning verandert
// niet tot je antwoordt. Een tik opent het blad met de keuzes; Telt mee als ik het doe is het advies. Het
// staat buiten "Kaarten op Vandaag", want het is een vraag en geen overzicht.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SPORTS_ROUTE } from '../../pages/settings/sportsRoute';
import { useAppData } from '../../state/AppDataContext';
import { getWatchState, onWatchChange, type WatchActivityState } from '../../storage/externalActivities';
import { ASK_ADVICE, ASK_ROLES, adviceFelt, pendingSports, sportQuestionLine, type SportQuestion } from '../../engine/sportAsk';
import { parseSportHandling, resolveSportCounting } from '../../engine/sportRole';
import { activityToDraft, durationLabel } from '../../engine/activityImport';
import { sportTemplate } from '../../engine/sportTemplate';
import { FELT_LABEL, FELT_RPE, type FeltWord } from '../../engine/sessionLoad';
import { withTimeout } from '../../utils/withTimeout';
import { settleLogOutcome } from '../../state/logSession';
import { anySportDefinition, type SportRole } from '../../data/sports';
import { formatDateNL, todayISO, weekdayLongNL } from '../../utils/dates';
import { Icon } from '../icons';
import { Pictogram } from '../pictograms';
import { ChoiceList, Sheet, SheetButtons } from '../settings/Sheet';
import { FeltChoice } from './FeltChoice';
import { autoCustomSports, customIdOf, customQuestionLine, customTemplate, FEEL_ADVICE, FEEL_LABEL, parseCustomSports, pendingCustomSports, type CustomFeel, type CustomQuestion, type CustomSport } from '../../engine/customSport';

// Opslaan wacht hoogstens zo lang; daarna een zichtbare uitkomst.
const SAVE_TIMEOUT_MS = 8000;

export function SportAskLine() {
  const { settings, updateSettings } = useAppData();
  const [state, setState] = useState<WatchActivityState | null>(null);
  const [open, setOpen] = useState<SportQuestion | null>(null);
  const [openCustom, setOpenCustom] = useState<CustomQuestion | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => void getWatchState().then((s) => alive && setState(s)).catch(() => undefined);
    load();
    const stop = onWatchChange(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  // Vragen bij een nieuwe sport staat uit: een nieuw type telt meteen mee, met het advies (stap 9).
  const auto = useMemo(() => (state?.use.activities ? autoCustomSports(state.activities, settings) : []), [state, settings]);
  const autoKey = auto.map((c) => c.type).join('|');
  const added = useRef(new Set<string>());
  useEffect(() => {
    if (!autoKey || added.current.has(autoKey)) return;
    added.current.add(autoKey);
    const current = parseCustomSports(settings.customSports).value ?? [];
    void updateSettings({ customSports: [...current, ...auto.filter((c) => !current.some((k) => k.type === c.type))] });
  }, [autoKey, auto, settings.customSports, updateSettings]);

  const question = state?.use.activities ? pendingSports(state.activities, settings, todayISO())[0] : undefined;
  const custom = !question && state?.use.activities ? pendingCustomSports(state.activities, settings, todayISO())[0] : undefined;
  if (!question && !custom && !open && !openCustom) return null;
  const def = question ? anySportDefinition(question.sport) : undefined;
  return (
    <>
      {question && def && (
        <button
          type="button"
          onClick={() => setOpen(question)}
          className="flex min-h-[44px] w-full items-center gap-2 px-1 text-left text-sm active:opacity-70"
          style={{ color: 'var(--color-ink-dim)' }}
          data-sheet-from
        >
          {def.pictogram && <span style={{ color: def.colorToken }}><Pictogram name={def.pictogram} size={24} /></span>}
          <span className="min-w-0 flex-1">{sportQuestionLine(question)}</span>
          <span className="shrink-0"><Icon name="verder" size={16} /></span>
        </button>
      )}
      {custom && (
        <button
          type="button"
          onClick={() => setOpenCustom(custom)}
          className="flex min-h-[44px] w-full items-center gap-2 px-1 text-left text-sm active:opacity-70"
          style={{ color: 'var(--color-ink-dim)' }}
          data-sheet-from
        >
          <span className="min-w-0 flex-1">{customQuestionLine(custom)}</span>
          <span className="shrink-0"><Icon name="verder" size={16} /></span>
        </button>
      )}
      {open && <SportAskSheet question={open} onClose={() => setOpen(null)} />}
      {openCustom && <CustomSportAskSheet question={openCustom} onClose={() => setOpenCustom(null)} />}
    </>
  );
}

// Je deed iets nieuws (stap 9): waar je het vooral merkt vult de kenmerken in, dan of het meetelt.
function CustomSportAskSheet({ question, onClose }: { question: CustomQuestion; onClose: () => void }) {
  const { settings, updateSettings, logSession } = useAppData();
  const counting = resolveSportCounting(settings.sportCounting);
  const [feel, setFeel] = useState<CustomFeel>(FEEL_ADVICE);
  const [role, setRole] = useState<'count' | 'off'>('count');
  const [felt, setFelt] = useState<FeltWord>('pittig');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const askFelt = counting.askFelt && question.activity.rpe === undefined && role === 'count';
  const day = question.activity.start.slice(0, 10);

  async function save(close: () => void) {
    if (busy) return;
    setBusy(true);
    setError(false);
    let cancelled = false;
    try {
      await withTimeout((async () => {
        const sport: CustomSport = { id: customIdOf(question.type), label: question.label, type: question.type, feel, role };
        // Eerst het log, dan de keuze: lukt het log niet, dan blijft alles zoals het was en staat de vraag er nog.
        if (role === 'count') {
          const input = {
            ...activityToDraft(question.activity, customTemplate(sport)),
            ...(askFelt ? { rpe: FELT_RPE[felt], ...(touched ? {} : { rpeAssumed: true as const }) } : {}),
            quiet: true,
          };
          // Gooit als er geen log staat; "staat er al" telt als gelukt.
          await settleLogOutcome(await logSession(input), input);
        }
        if (cancelled) return;
        const current = parseCustomSports(settings.customSports).value ?? [];
        await updateSettings({ customSports: [...current.filter((c) => c.type !== sport.type), sport] });
      })(), SAVE_TIMEOUT_MS);
      close();
    } catch {
      cancelled = true;
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet eyebrow="Sporten" title={question.label} line={`Je deed iets nieuws op ${dayText(day)}, ${durationLabel(question.activity.durationSec)}. Hoe telt dit?`} onClose={onClose}>
      {(close) => (
        <>
          <p className="st-lab">Merk je dit vooral in je benen, in je armen en schouders, of in je hele lijf?</p>
          <ChoiceList<CustomFeel>
            label="Waar merk je het vooral?"
            options={(['legs', 'arms', 'whole'] as CustomFeel[]).map((f) => ({ value: f, label: FEEL_LABEL[f] }))}
            value={feel}
            advice={FEEL_ADVICE}
            onPick={setFeel}
          />
          <div style={{ marginTop: 16 }}>
            <ChoiceList<'count' | 'off'>
              label={`Hoe telt ${question.label.toLowerCase()}?`}
              options={(['count', 'off'] as const).map((r) => ({ value: r, label: ROLE_TEXT[r]!.label, note: ROLE_TEXT[r]!.note }))}
              value={role}
              advice="count"
              onPick={setRole}
            />
          </div>
          {askFelt && (
            <div style={{ marginTop: 16 }}>
              <FeltChoice
                value={felt}
                onPick={(w) => {
                  setFelt(w);
                  setTouched(true);
                }}
                note={touched ? 'Hoe zwaarder het voelde, hoe meer het meetelt voor je benen.' : `ASCEND kiest voor: ${FELT_LABEL[felt].toLowerCase()}. Tik als het anders was.`}
              />
            </div>
          )}
          {error && <p className="st-hint" style={{ marginLeft: 0, color: 'var(--color-ink)' }} role="status">Dit lukte niet. Probeer het zo nog eens.</p>}
          <SheetButtons>
            <button type="button" className="st-btn" onClick={close}>Niet nu</button>
            <button type="button" className="st-btn gold" disabled={busy} onClick={() => void save(close)}>{busy ? 'Bezig…' : 'Opslaan'}</button>
          </SheetButtons>
        </>
      )}
    </Sheet>
  );
}

function dayText(iso: string): string {
  return iso === todayISO() ? 'vandaag' : `${weekdayLongNL(iso)} ${formatDateNL(iso)}`;
}

const ROLE_TEXT: Partial<Record<SportRole, { label: string; note: string }>> = {
  fixed: { label: 'Vaste dag', note: 'Jij kiest de dag. ASCEND plant de rest eromheen.' },
  count: { label: 'Telt mee als ik het doe', note: 'Je plant het zelf. Wat je doet telt mee in je benen en je week.' },
  off: { label: 'Negeren', note: 'ASCEND doet er niets mee. Je kunt het wel loggen.' },
};

function SportAskSheet({ question, onClose }: { question: SportQuestion; onClose: () => void }) {
  const { settings, updateSettings, logSession } = useAppData();
  const navigate = useNavigate();
  const def = anySportDefinition(question.sport);
  const counting = resolveSportCounting(settings.sportCounting);
  const [role, setRole] = useState<SportRole>(ASK_ADVICE);
  const [felt, setFelt] = useState<FeltWord>(adviceFelt(question.sport));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  // De zwaarte vraagt het blad alleen als het horloge er geen gaf en je het wilt.
  const askFelt = counting.askFelt && question.activity.rpe === undefined && role === 'count';
  const day = question.activity.start.slice(0, 10);

  async function save(close: () => void) {
    if (busy) return;
    setBusy(true);
    setError(false);
    let cancelled = false;
    try {
      await withTimeout((async () => {
        // Eerst het log, dan de rol: lukt het log niet, dan blijft alles zoals het was en staat de vraag er nog.
        if (role === 'count') {
          const draft = activityToDraft(question.activity, sportTemplate(question.sport));
          const input = {
            ...draft,
            ...(askFelt ? { rpe: FELT_RPE[felt], ...(touched ? {} : { rpeAssumed: true as const }) } : {}),
            quiet: true,
          };
          // Gooit als er geen log staat; "staat er al" telt als gelukt.
          await settleLogOutcome(await logSession(input), input);
        }
        if (cancelled) return;
        const current = parseSportHandling(settings.sportHandling).value ?? {};
        await updateSettings({ sportHandling: { ...current, [question.sport]: { role } } });
      })(), SAVE_TIMEOUT_MS);
      close();
    } catch {
      cancelled = true;
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet eyebrow="Sporten" title={def.label} line={`Je deed ${def.label.toLowerCase()} op ${dayText(day)}, ${durationLabel(question.activity.durationSec)}. Hoe telt dit?`} onClose={onClose}>
      {(close) => (
        <>
          <ChoiceList<SportRole>
            label={`Hoe telt ${def.label.toLowerCase()}?`}
            options={ASK_ROLES.map((r) => ({ value: r, label: ROLE_TEXT[r]!.label, note: ROLE_TEXT[r]!.note }))}
            value={role}
            advice={ASK_ADVICE}
            onPick={setRole}
          />
          <p className="st-hint" style={{ marginLeft: 0 }}>ASCEND kan dit nog niet voor je plannen. Een vaste dag of meetellen kan wel.</p>
          {askFelt && (
            <div style={{ marginTop: 16 }}>
              <FeltChoice
                value={felt}
                onPick={(w) => {
                  setFelt(w);
                  setTouched(true);
                }}
                note={touched ? 'Hoe zwaarder het voelde, hoe meer het meetelt voor je benen.' : `ASCEND kiest voor: ${FELT_LABEL[felt].toLowerCase()}. Tik als het anders was.`}
              />
            </div>
          )}
          {question.count > 1 && role === 'count' && (
            <p className="st-hint" style={{ marginLeft: 0 }}>{`De andere ${question.count - 1 === 1 ? 'activiteit' : `${question.count - 1} activiteiten`} van ${def.label.toLowerCase()} zie je daarna op Vandaag om op te slaan.`}</p>
          )}
          {error && <p className="st-hint" style={{ marginLeft: 0, color: 'var(--color-ink)' }} role="status">Dit lukte niet. Probeer het zo nog eens.</p>}
          <SheetButtons>
            <button type="button" className="st-btn" onClick={close}>Niet nu</button>
            {role === 'fixed' ? (
              <button type="button" className="st-btn gold" onClick={() => { close(); navigate(SPORTS_ROUTE, { state: { openSport: question.sport, fixed: true } }); }}>Kies je dagen</button>
            ) : (
              <button type="button" className="st-btn gold" disabled={busy} onClick={() => void save(close)}>{busy ? 'Bezig…' : 'Opslaan'}</button>
            )}
          </SheetButtons>
        </>
      )}
    </Sheet>
  );
}
