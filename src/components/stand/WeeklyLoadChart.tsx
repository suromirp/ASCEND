import { LOAD_JUMP, loadItemText, loadVersusBefore, SPLIT_NOTE, type WeekLoad } from '../../engine/standing';
import { formatNumberNL } from '../../utils/number';
import { Card } from '../ui';
import { formatDayMonthNL, formatWeekdayDayMonthNL } from '../../utils/dates';
import { StandLineChart } from './StandLineChart';
import { effortHintShown, loadPoints } from './standChartData';
import { UnderLine } from './StandParts';

// Belasting, het hart van het scherm: minuten maal zwaarte per week, in de stijl van de zone 2-kaart
// (StandLineChart). Een stip per week op één lijn; deze week vol voor wat gedaan is en een open stip erboven voor
// wat nog gepland staat; de week erna gestippeld. Meer staat boven; de haarlijn gewoonlijk is je gemiddelde van
// de vier weken ervoor. De verdeling per sport staat in de telling van de gekozen week, waar elke training zijn
// eigen regel heeft; de uitleg van de punten staat achter de i in de lucht. De waarschuwing bij een sprong staat
// volledig onder de grafiek.

export function WeeklyLoadChart({ weeks }: { weeks: WeekLoad[] }) {
  const currentIdx = Math.max(0, weeks.findIndex((w) => w.isCurrent));
  const jump = loadVersusBefore(weeks);
  if (weeks.length === 0) return null;
  const points = loadPoints(weeks);
  const max = Math.max(1, ...points.map((p) => p.ahead ?? p.value), jump?.before ?? 0) * 1.1;
  const name = (w: WeekLoad) => (w.isCurrent ? 'Deze week' : `Week van ${formatDayMonthNL(w.weekStart)}`);
  const amount = (w: WeekLoad) => (w.isCurrent && w.plannedTotal > 0 ? `${formatNumberNL(w.doneTotal, 0)} + ${formatNumberNL(w.plannedTotal, 0)}` : formatNumberNL(w.doneTotal + w.plannedTotal, 0));

  return (
    <Card className="flex flex-col gap-3">
      <StandLineChart
        points={points}
        min={0}
        max={max}
        top="high"
        rest={currentIdx}
        lines={jump ? [{ value: jump.before, label: 'gewoonlijk' }] : []}
        axis={[
          { at: 0, label: formatDayMonthNL(weeks[0].weekStart) },
          { at: currentIdx / Math.max(1, weeks.length - 1), label: 'deze week', strong: true },
        ]}
        label={(i) => amount(weeks[i])}
        ariaLabel={`Belasting per week, ${weeks.length} weken. Meer staat boven.`}
        valueText={(i) => `${name(weeks[i])}: ${formatNumberNL(weeks[i].doneTotal, 0)} gedaan${weeks[i].plannedTotal > 0 ? `, ${formatNumberNL(weeks[i].plannedTotal, 0)} gepland` : ''}`}
      >
        {(i) => (
          <>
            <WeekTally week={weeks[i]} average={weeks[i].isCurrent ? jump?.before : undefined} />
            {/* Eén keer dat de zwaarte ontbreekt: staat de ±-regel er al, dan geen tweede zin (coördinator, 12 november). */}
            {effortHintShown(weeks, i) && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
                Vul na een training de zwaarte in, dan klopt de lijn beter.
              </p>
            )}
          </>
        )}
      </StandLineChart>

      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{verdict(weeks[currentIdx], jump)}</p>
    </Card>
  );
}

// De gekozen week als gewone regels onder een haarlijn: de telling, dan elke training met zijn punten.
function WeekTally({ week, average }: { week: WeekLoad; average?: number }) {
  return (
    <UnderLine>
      <p>
        <span className="font-medium">{week.isCurrent ? 'Deze week' : `Week van ${formatDayMonthNL(week.weekStart)}`}{week.isRestWeek ? ', rustweek' : ''}: </span>
        <span className="tabular-nums">{formatNumberNL(week.doneTotal, 0)}</span> gedaan
        {week.plannedTotal > 0 && <>, <span className="tabular-nums">{formatNumberNL(week.plannedTotal, 0)}</span> gepland</>}
        {average !== undefined && <span style={{ color: 'var(--color-ink-dim)' }}>. Gewoonlijk <span className="tabular-nums">{formatNumberNL(average, 0)}</span>.</span>}
      </p>
      {week.items.length === 0 ? (
        <p style={{ color: 'var(--color-ink-dim)' }}>Geen trainingen in deze week.</p>
      ) : (
        <ul className="mt-1 flex flex-col gap-2">
          {week.items.map((it, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-words">{it.name}</p>
                <p style={{ color: 'var(--color-ink-dim)' }}>{formatWeekdayDayMonthNL(it.date)} · {loadItemText(it)}{it.planned ? ' · gepland' : ''}</p>
              </div>
              <span className="shrink-0 tabular-nums" style={{ color: it.planned ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>{formatNumberNL(it.load, 0)}</span>
            </li>
          ))}
        </ul>
      )}
      {(week.items.some((it) => it.estimated) || week.items.some((it) => it.split)) && (
        <p style={{ color: 'var(--color-ink-dim)' }}>
          {week.items.some((it) => it.estimated) ? '±: geen zwaarte ingevuld, telt met de geplande zwaarte.' : ''}
          {week.items.some((it) => it.estimated) && week.items.some((it) => it.split) ? ' ' : ''}
          {week.items.some((it) => it.split) ? SPLIT_NOTE : ''}
        </p>
      )}
    </UnderLine>
  );
}

function verdict(week: WeekLoad | undefined, jump: ReturnType<typeof loadVersusBefore>): string {
  if (!week) return '';
  if (week.isRestWeek) return 'Rustweek: de week is bewust lichter. Zo komt de training van de weken ervoor binnen.';
  if (!jump) return 'Na een paar weken zie je hier of je week in lijn is.';
  const pct = Math.round((jump.ratio - 1) * 100);
  if (jump.doneRatio > LOAD_JUMP) return `Deze week ligt al ${Math.round((jump.doneRatio - 1) * 100)}% boven je gemiddelde van de vier weken ervoor. Een flinke sprong gaat vaker samen met blessures. Let extra op je benen en je ochtendgevoel.`;
  if (jump.ratio > LOAD_JUMP) return `Met wat er nog gepland staat komt deze week ${pct}% boven je gemiddelde van de vier weken ervoor. Haal een gemiste training niet in bovenop de rest. Doe je alles, let dan extra op je benen en je ochtendgevoel.`;
  if (jump.ratio < 0.7) return 'Deze week is lichter dan je gemiddelde. Is dat de bedoeling, dan klopt het.';
  return 'Deze week is in lijn met de vier weken ervoor. Je bouwt rustig op.';
}
