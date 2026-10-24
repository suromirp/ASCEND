import type { Program } from '../../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../../models/training';
import { resolveEffectiveFullDuration } from '../../engine/substitutions';
import { weekDates, weekdayLongNL } from '../../utils/dates';
import { LightCard } from '../ui';
import { SPORT_COLOR, sportKind } from '../sportKind';
import { MoonGlyph } from './glyphs';

// De week in één strook op de lucht van Vandaag: per dag een staafje in de kleur
// van de sport (gevuld als het gedaan is, omlijnd als het nog komt), een maantje
// voor een rustdag, een streepje voor een vrije dag en vandaag een ijsblauwe bol
// met de letter. De hoogte is de duur van de training.
export function WeekStrip({
  weekStart,
  sessions,
  logs,
  templateById,
  program,
  today,
}: {
  weekStart: string;
  sessions: PlannedSession[];
  logs: SessionLog[];
  templateById: Map<string, SessionTemplate>;
  program?: Program | null;
  today: string;
}) {
  const logged = new Set(logs.map((l) => l.plannedSessionId).filter(Boolean));
  return (
    <LightCard>
      <ol className="grid grid-cols-7 gap-1" aria-label="Je week">
        {weekDates(weekStart).map((date) => {
          const letter = weekdayLongNL(date).charAt(0).toUpperCase();
          const day = sessions
            .filter((s) => s.scheduledDate === date && !(s.status === 'skipped' && (templateById.get(s.templateId)?.type === 'recovery' || s.leave?.role === 'dropped')))
            .flatMap((s) => {
              const template = templateById.get(s.templateId);
              return template ? [{ s, template }] : [];
            });
          const training = day.filter((d) => d.template.type !== 'recovery' && d.s.status !== 'skipped');
          const rest = training.length === 0 && day.some((d) => d.template.type === 'recovery' && d.s.status !== 'skipped');
          const minutes = training.reduce((n, d) => n + resolveEffectiveFullDuration(d.template, date, program), 0);
          const main = [...training].sort((a, b) => resolveEffectiveFullDuration(b.template, date, program) - resolveEffectiveFullDuration(a.template, date, program))[0];
          const done = training.length > 0 && training.every((d) => logged.has(d.s.id));
          const isToday = date === today;
          const height = 10 + Math.round(20 * Math.min(1, minutes / 90));
          const color = main ? SPORT_COLOR[sportKind(main.template)] : undefined;
          const what = main ? `${main.template.name}, ${done ? 'gedaan' : 'gepland'}` : rest ? 'rustdag' : 'vrij';
          return (
            <li key={date} className="flex flex-col items-center gap-2" aria-label={`${weekdayLongNL(date)}${isToday ? ' (vandaag)' : ''}: ${what}`}>
              <div aria-hidden="true" className="flex h-8 items-end justify-center">
                {main && color ? (
                  <span
                    className="block w-2.5 rounded-full"
                    style={{ height, background: done ? color : 'transparent', boxShadow: done ? undefined : `inset 0 0 0 1.5px ${color}` }}
                  />
                ) : rest ? (
                  <span className="flex items-center" style={{ color: 'var(--color-status)' }}><MoonGlyph size={18} /></span>
                ) : (
                  <span className="mb-2 block h-0.5 w-2.5 rounded-full" style={{ background: 'var(--color-card-border)' }} />
                )}
              </div>
              <span
                aria-hidden="true"
                className={`flex items-center justify-center text-xs tabular-nums ${isToday ? 'mx-pulse-once h-7 w-7 rounded-full font-bold' : 'h-7 w-7 font-medium'}`}
                style={isToday ? { background: 'var(--color-status)', color: 'var(--color-on-status)' } : { color: 'var(--color-ink-dim)' }}
              >
                {letter}
              </span>
            </li>
          );
        })}
      </ol>
    </LightCard>
  );
}
