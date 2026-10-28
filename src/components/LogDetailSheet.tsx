import { formatNumberNL } from '../utils/number';
import { painReports } from '../engine/pain';
import type { SessionLog, WorkoutDetails } from '../models/training';
import { getModality } from '../data/modalities';
import { getCompatibility, COMPATIBILITY_LABEL } from '../data/garminSuggested';
import { formatDateNL } from '../utils/dates';
import { useSheetClose } from '../utils/useSheetClose';
import { Portal } from './Portal';
import { Card, Eyebrow, SecondaryButton, SheetGrip } from './ui';
import { Icon } from './icons';
import { keptNumbersLine, logSource, sourceNoun } from '../engine/logSource';
import { SheetHeader } from './SheetHeader';
import { useEffect, useState } from 'react';
import { TimeoutError, withTimeout } from '../utils/withTimeout';
import { useAppData } from '../state/AppDataContext';
import { TestVerdictCard } from './TestVerdictCard';
import { TEST_TEMPLATE_ID } from '../engine/raceBlock';
import { ensureBestEffort, ensureOutcomeText, ensureRunDetail, type EnsureOutcome } from '../storage/activityDetail';
import { wantsBestEffort } from '../engine/testJudgment';
import { logKindLabel } from '../engine/sports';
import { cleanDetails, detailForm, plannedDetails, workoutLine } from '../engine/workoutDetails';
import { buildWorkoutPlan } from '../engine/workoutPlan';
import { WorkoutDetailsFields } from './WorkoutDetailsFields';
import { TrimSheet } from './TrimSheet';
import { StravaTextButton } from './StravaTextButton';
import { isTrimmable, trimOriginalLine, trimRangeLine } from '../engine/trimLog';
import { canRestoreSourceUpdate, sourceOfferLine, sourceUpdateLine, sourceUpdatePreviousLine } from '../engine/sourceCorrection';
import { TextButton } from './TextButton';
import { SheetRow, SheetRows } from './SheetRows';
import { LogInfluenceCard } from './influence/LogInfluenceCard';
import { InfluenceSheet } from './influence/InfluenceSheet';
import { useDeviation } from './influence/useInfluence';
import { entryForLog, isNoted } from '../engine/influence';
import { SweatSheet } from './SweatSheet';
import { entryResultLine, isSweatLog } from '../engine/sweat';

// Putting the numbers back is local work; longer than this means it is stuck.
const RESTORE_TIMEOUT_MS = 15_000;
const UNDO_TRIM_TIMEOUT_MS = 15_000;
const SOURCE_TIMEOUT_MS = 15_000;

const FEEL_LABEL: Record<string, string> = { better: 'Beter', normal: 'Normaal', worse: 'Slechter' };
const ENVIRONMENT_LABEL: Record<string, string> = { treadmill: 'Loopband', outdoor: 'Buiten' };

export function LogDetailSheet({ log: shown, templateName, onClose }: { log: SessionLog; templateName: string; onClose: () => void }) {
  const { undoLog, setLogWorkout, restoreFromWatch, undoTrimWatchActivity, restoreSourceUpdate, takeOverSourceNumbers, sessionLogs, templates, program, settings, refresh } = useAppData();
  // Read the log fresh, so the sheet follows a change (the own numbers put back).
  const log = sessionLogs.find((l) => l.id === shown.id) ?? shown;
  const activity = log.outdoorData ?? log.cardioData;
  const modality = activity?.modality ? getModality(log.templateId, activity.modality) : undefined;
  const garminType = activity?.garminSuggestedType;
  // A test run linked before the best 5 km existed: read it once from the watch's series.
  // A counting v1 is left alone here on purpose; ensureRecentTestEfforts reads it again at the opening.
  useEffect(() => {
    if (log.externalId && wantsBestEffort(log)) {
      void ensureBestEffort(log.id).then((r) => (r === 'attached' ? refresh() : undefined));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.id, log.externalId, log.bestEffort, log.bestEffortTried, log.trim, refresh]);
  // An older run from the watch: the kilometres and the full series are filled in once when the
  // sheet opens (storage/activityDetail.ts#ensureRunDetail, with a limit in time). When it
  // found nothing or did not finish, one quiet line says so; the other outcomes say nothing.
  const hasRunDetail = !!log.runDetail;
  const [ensureOutcome, setEnsureOutcome] = useState<EnsureOutcome | undefined>();
  useEffect(() => {
    if (log.externalId && !log.trim) {
      void ensureRunDetail(log.id).then((r) => {
        setEnsureOutcome(r);
        if (r === 'added') refresh();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.id, log.externalId, log.trim, hasRunDetail, refresh]);
  const compatibility = garminType ? getCompatibility(log.templateId, garminType) : undefined;

  const rows: { label: string; value: string; icon?: 'horloge' | 'notitie' }[] = [];
  const done = workoutLine(log);
  if (done) rows.push({ label: 'Gedaan', value: done });
  if (modality) rows.push({ label: 'Modaliteit', value: modality.label });
  if (activity?.environment) rows.push({ label: 'Omgeving', value: ENVIRONMENT_LABEL[activity.environment] ?? activity.environment });
  if (activity?.guidanceMode) {
    rows.push({
      label: 'Manier van trainen',
      value: activity.guidanceMode === 'ascend_guided' ? 'Volgens ASCEND' : activity.guidanceMode === 'garmin_suggested' ? 'Voorstel van Garmin' : 'Vrije training',
    });
  }
  if (garminType) rows.push({ label: 'Garmin stelde voor', value: garminType });
  if (activity?.distanceKm !== undefined) rows.push({ label: 'Afstand', value: `${formatNumberNL(activity.distanceKm, 2)} km` });
  if (activity?.elevationGainM !== undefined) {
    rows.push({ label: 'Stijging', value: `${formatNumberNL(activity.elevationGainM, 0)} m D+${activity.estimatedElevation ? ' (geschat)' : ''}` });
  }
  if (log.outdoorData?.elevationLossM !== undefined) rows.push({ label: 'Daling', value: `${formatNumberNL(log.outdoorData.elevationLossM, 0)} m D−` });
  if (log.outdoorData?.steps !== undefined) rows.push({ label: 'Verdiepingen (trap)', value: `${log.outdoorData.steps}` });
  if (log.outdoorData?.machineVerticalM !== undefined) rows.push({ label: 'Hoogtemeters op toestel', value: `${formatNumberNL(log.outdoorData.machineVerticalM, 0)} m` });
  if (activity?.avgHeartRate !== undefined) rows.push({ label: log.workout ? 'Gem. hartslag, hele training' : 'Gem. hartslag', value: `${activity.avgHeartRate} bpm` });
  if (activity?.cadence !== undefined) rows.push({ label: 'Cadans', value: `${activity.cadence}` });
  if (activity?.power !== undefined) rows.push({ label: 'Vermogen', value: `${activity.power} W` });
  if (log.outdoorData?.poles) rows.push({ label: 'Wandelstokken', value: 'Met stokken' });
  if (log.outdoorData?.backpackWeightKg !== undefined) rows.push({ label: 'Rugzakgewicht', value: `${formatNumberNL(log.outdoorData.backpackWeightKg, 1)} kg` });
  if (log.outdoorData?.terrain) rows.push({ label: 'Terrein', value: log.outdoorData.terrain });
  if (log.rpe !== undefined) rows.push({ label: 'Zwaarte', value: `${log.rpe} van 10` });
  if (log.legsAtStart) rows.push({ label: 'Benen bij het inlopen', value: log.legsAtStart });
  if (log.strengthRir !== undefined) rows.push({ label: 'Over in zwaarste sets', value: log.strengthRir >= 4 ? '4 of meer' : log.strengthRir === 2.5 ? '2 tot 3' : String(log.strengthRir) });
  const source = logSource(log);
  rows.push({ label: 'Bron', value: source.label, icon: source.icon });
  const pains = painReports(log);
  if (pains.length > 0) {
    rows.push({ label: 'Pijn', value: pains.map((p) => `${p.area}${p.side ? ` ${p.side}` : ''}${log.painReports ? ` ${p.score}/10` : ''}${p.worseDuring ? ', erger' : ''}${p.onBone ? ', op het bot' : ''}`).join('; ') });
  }

  const { closing, requestClose, sheetRef } = useSheetClose(onClose);
  // "Wat speelde er": with a heart rate that stands out the block sits on top; otherwise a quiet row lower down.
  const deviation = useDeviation(log);
  const showDeviation = !!deviation && settings.influenceSign !== false;
  const [influenceOpen, setInfluenceOpen] = useState(false);
  const [sweatOpen, setSweatOpen] = useState(false);
  const sweatEntry = settings.sweatEntries?.find((e) => e.logId === log.id);
  const influenceNoted = (() => { const e = entryForLog(settings.influences, log.id); return !!e && isNoted(e); })();
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const keptLine = keptNumbersLine(log);
  async function putBack() {
    if (restoring) return;
    setRestoring(true);
    setRestoreNote(null);
    try {
      const n = await withTimeout(restoreFromWatch([log.id]), RESTORE_TIMEOUT_MS);
      setConfirmRestore(false);
      if (n === 0) setRestoreNote('Er was niets terug te zetten; je getallen staan al zo.');
    } catch (err) {
      setRestoreNote(err instanceof TimeoutError
        ? 'Terugzetten duurt langer dan verwacht. Kijk zo of je getallen terug staan; staan ze er niet, probeer het dan nog eens.'
        : 'Terugzetten lukte niet. Er is niets veranderd; probeer het zo nog eens.');
    } finally {
      setRestoring(false);
    }
  }
  // "Inkorten": a watch activity cut at the end or the beginning, and the way back.
  const [trimming, setTrimming] = useState(false);
  const [undoingTrim, setUndoingTrim] = useState(false);
  const [trimNote, setTrimNote] = useState<string | null>(null);
  async function putTrimBack() {
    if (undoingTrim) return;
    setUndoingTrim(true);
    setTrimNote(null);
    try {
      const done = await withTimeout(undoTrimWatchActivity(log.id), UNDO_TRIM_TIMEOUT_MS);
      if (!done) setTrimNote('Er was niets terug te zetten; de training is al zoals hij was.');
    } catch (err) {
      setTrimNote(err instanceof TimeoutError
        ? 'Ongedaan maken duurt langer dan verwacht. Kijk zo of je getallen terug staan; staan ze er niet, probeer het dan nog eens.'
        : 'Ongedaan maken lukte niet. Er is niets veranderd; probeer het zo nog eens.');
    } finally {
      setUndoingTrim(false);
    }
  }
  // Corrections made at intervals.icu: "Vorige getallen terugzetten", and "Cijfers overnemen" for a cut log.
  const [sourceBusy, setSourceBusy] = useState(false);
  const [sourceNote, setSourceNote] = useState<string | null>(null);
  async function changeSourceNumbers(work: (id: string) => Promise<boolean>, nothing: string, failed: string) {
    if (sourceBusy) return;
    setSourceBusy(true);
    setSourceNote(null);
    try {
      const done = await withTimeout(work(log.id), SOURCE_TIMEOUT_MS);
      if (!done) setSourceNote(nothing);
    } catch (err) {
      setSourceNote(err instanceof TimeoutError ? 'Dit duurt langer dan verwacht. Kijk zo of de getallen kloppen; zo niet, probeer het dan nog eens.' : failed);
    } finally {
      setSourceBusy(false);
    }
  }
  const updateLine = sourceUpdateLine(log);
  const previousLine = sourceUpdatePreviousLine(log);
  const offerLine = sourceOfferLine(log);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Fill in the hard part afterwards: from what was saved, or the plan of that day.
  const [editing, setEditing] = useState<WorkoutDetails | null>(null);
  function startEditing() {
    const template = templates.find((t) => t.id === log.templateId);
    setEditing(log.workout ?? plannedDetails(log.templateId, template ? buildWorkoutPlan(template, log.completedDate, program) : undefined));
  }

  return (
    <>
    <Portal>
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 ${closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}
        onClick={requestClose}
      >
        <div ref={sheetRef}
          className={`relative max-h-[85vh] w-full max-w-md overflow-y-auto ${closing ? 'animate-sheet-out' : 'animate-sheet-in'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetGrip />
        <Card className="rounded-b-none border-b-0 pb-8">
          <div className="-mt-2"><SheetHeader eyebrow={formatDateNL(log.completedDate)} title={templateName} onClose={requestClose} /></div>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>
            {logKindLabel(log)} · {log.durationMinutes} min
          </p>

          {showDeviation && <LogInfluenceCard log={log} deviation={deviation} />}

          {log.subjectiveFeel && (
            <p className="mt-2 text-xs font-medium" style={{ color: log.subjectiveFeel === 'worse' ? 'var(--color-warning)' : 'var(--color-action)' }}>
              Gevoel: {FEEL_LABEL[log.subjectiveFeel]}
            </p>
          )}

          {log.templateId === TEST_TEMPLATE_ID && <div className="mt-3"><TestVerdictCard logId={log.id} /></div>}

          {ensureOutcome && (ensureOutcome === 'no-series' || ensureOutcome === 'failed' || ensureOutcome === 'timeout') && !hasRunDetail && (
            <p className="mt-3 text-sm" style={{ color: 'var(--color-ink-dim)' }}>{ensureOutcomeText(ensureOutcome)}</p>
          )}

          {rows.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between border-b py-1.5 text-sm" style={{ borderColor: 'var(--color-card-border)' }}>
                  <span style={{ color: 'var(--color-ink-dim)' }}>{r.label}</span>
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--color-ink)' }}>
                    {r.icon && <Icon name={r.icon} size={16} />}
                    {r.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {isTrimmable(log) && (log.trim ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{trimRangeLine(log.trim)}</p>
              <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{trimOriginalLine(log.trim)}</p>
              <div className="flex"><SecondaryButton onClick={() => void putTrimBack()} disabled={undoingTrim}>{undoingTrim ? 'Bezig…' : 'Inkorten ongedaan maken'}</SecondaryButton></div>
              {trimNote && <p role="status" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{trimNote}</p>}
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>Zat er een stuk bij dat niet van jou is, zoals een autorit? Haal het weg.</p>
              <div className="flex"><SecondaryButton onClick={() => setTrimming(true)}>Inkorten</SecondaryButton></div>
            </div>
          ))}

          {updateLine && (
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{updateLine}</p>
              {previousLine && <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{previousLine}</p>}
              {canRestoreSourceUpdate(log) && (
                <div className="flex">
                  <TextButton
                    onClick={() => void changeSourceNumbers(restoreSourceUpdate, 'Er was niets terug te zetten; de getallen staan al zo.', 'Terugzetten lukte niet. Er is niets veranderd; probeer het zo nog eens.')}
                    disabled={sourceBusy}
                  >
                    {sourceBusy ? 'Bezig…' : 'Vorige getallen terugzetten'}
                  </TextButton>
                </div>
              )}
            </div>
          )}

          {offerLine && (
            <div className="mt-3 flex flex-col gap-1">
              <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{offerLine}</p>
              <div className="flex">
                <TextButton
                  onClick={() => void changeSourceNumbers(takeOverSourceNumbers, 'Er was niets over te nemen.', 'Overnemen lukte niet. Er is niets veranderd; probeer het zo nog eens.')}
                  disabled={sourceBusy}
                >
                  {sourceBusy ? 'Bezig…' : 'Cijfers overnemen'}
                </TextButton>
              </div>
            </div>
          )}
          {sourceNote && <p role="status" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{sourceNote}</p>}

          {keptLine && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{keptLine}</p>
              {confirmRestore ? (
                <>
                  <p className="text-xs" style={{ color: 'var(--color-ink)' }}>Je eigen getallen terugzetten? De getallen van {sourceNoun(source)} worden dan niet meer gebruikt voor deze training.</p>
                  <div className="flex gap-3">
                    <SecondaryButton onClick={() => setConfirmRestore(false)} disabled={restoring}>Annuleren</SecondaryButton>
                    <SecondaryButton onClick={() => void putBack()} disabled={restoring}>{restoring ? 'Bezig…' : 'Terugzetten'}</SecondaryButton>
                  </div>
                </>
              ) : (
                <div className="flex"><SecondaryButton onClick={() => setConfirmRestore(true)}>Mijn getallen terugzetten</SecondaryButton></div>
              )}
              {restoreNote && <p role="status" className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>{restoreNote}</p>}
            </div>
          )}

          {compatibility && (
            <div
              className="mt-4 rounded-xl border p-3 text-xs leading-relaxed"
              style={{
                borderColor: compatibility.compatibility === 'not_equivalent' ? 'var(--color-warning)' : 'var(--color-card-border)',
                color: 'var(--color-ink-dim)',
              }}
            >
              <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{COMPATIBILITY_LABEL[compatibility.compatibility]}. </span>
              {compatibility.note}
            </div>
          )}

          {detailForm(log.templateId) && (editing ? (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--color-card-border)' }}>
              <WorkoutDetailsFields templateId={log.templateId} value={editing} onChange={setEditing} />
              <div className="flex gap-3">
                <button onClick={() => setEditing(null)} className="min-h-11 flex-1 rounded-xl border text-xs" style={{ borderColor: 'var(--color-card-border)', color: 'var(--color-ink)' }}>Annuleren</button>
                <button onClick={() => void setLogWorkout(log.id, cleanDetails(editing)).then(() => setEditing(null))} className="min-h-11 flex-1 rounded-xl text-xs font-semibold" style={{ background: 'var(--color-action)', color: 'var(--color-bg)' }}>Opslaan</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex">
              <SecondaryButton onClick={startEditing}>{log.workout ? 'Herhalingen en hartslag aanpassen' : form(log.templateId)}</SecondaryButton>
            </div>
          ))}

          {log.notes && (
            <div className="mt-4">
              <Eyebrow>Notities</Eyebrow>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-ink)' }}>{log.notes}</p>
            </div>
          )}

          {!showDeviation && (
            <div className="mt-4">
              <SheetRows>
                <SheetRow title="Wat speelde er?" sub={influenceNoted ? 'Ingevuld, alleen voor jou' : undefined} onClick={() => setInfluenceOpen(true)} />
              </SheetRows>
            </div>
          )}

          {isSweatLog(log) && (
            <div className="mt-3">
              <SheetRows>
                <SheetRow
                  title="Zweetverlies"
                  sub={(sweatEntry && entryResultLine({ ...sweatEntry, durationMinutes: log.durationMinutes > 0 ? log.durationMinutes : sweatEntry.durationMinutes })) || 'Weeg jezelf voor en na en leer je eigen tempo'}
                  onClick={() => setSweatOpen(true)}
                />
              </SheetRows>
            </div>
          )}

          <div className="mt-2">
            <StravaTextButton log={log} template={templates.find((t) => t.id === log.templateId)} />
          </div>

          {/* A wrongly chosen or double log must be removable (it used to
              stay forever). Always behind a confirmation. */}
          {confirmDelete ? (
            <div className="mt-6 flex flex-col gap-2">
              <p className="text-xs" style={{ color: 'var(--color-danger-text)' }}>Deze training uit je logboek verwijderen?</p>
              <div className="flex gap-3">
                <SecondaryButton onClick={() => setConfirmDelete(false)}>Annuleren</SecondaryButton>
                <button onClick={() => void undoLog(log.id).then(requestClose)} className="min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-medium" style={{ background: 'var(--color-danger)', color: 'var(--color-ink)' }}>Verwijderen</button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex">
              <SecondaryButton onClick={() => setConfirmDelete(true)}>Verwijderen</SecondaryButton>
            </div>
          )}
        </Card>
        </div>
      </div>
    </Portal>
    {/* Next to the sheet, not inside it: a tap in this one must not close that one. */}
    {trimming && <TrimSheet log={log} templateName={templateName} onClose={() => setTrimming(false)} />}
    {sweatOpen && <SweatSheet log={log} templateName={templateName} onClose={() => setSweatOpen(false)} />}
    {influenceOpen && (
      <InfluenceSheet eyebrow={formatDateNL(log.completedDate)} title="Wat speelde er?" line={templateName} target={{ date: log.completedDate, logId: log.id }} log={log} onClose={() => setInfluenceOpen(false)} />
    )}
    </>
  );
}

function form(templateId: string): string {
  return detailForm(templateId) === 'block' ? 'Vul je stevige stuk in' : 'Vul je herhalingen in';
}
