import type { Program } from '../../models/program';
import type { PlannedSession, SessionLog, SessionTemplate } from '../../models/training';
import { resolveEffectiveFullDuration } from '../../engine/substitutions';
import { weekDates, weekdayLongNL } from '../../utils/dates';
import { Icon, type IconName } from '../icons';
import { LightCard } from '../ui';
import { SPORT_COLOR, sportIcon, sportKind } from '../sportKind';

// De week in één strook op de lucht van Vandaag: per dag het pictogram van de
// sport in de kleur van die sport. Gepland is alleen het pictogram, gedaan is
// hetzelfde pictogram met een klein mint vinkje, zodat je in één oogopslag ziet
// wat al af is. Een rustdag is een poppetje dat ontspant (gedempt), een vrije dag
// een streepje, en vandaag staat de letter in een ijsblauwe bol. Twee trainingen
// op één dag staan kleiner onder elkaar (het pictogram van de langste bovenaan).
// De sportkleuren zijn hier de donkere varianten op licht: de strook staat in een
// LightCard, dus `.on-light` zet ze om.

const MAX_PER_DAY = 2;

function DayGlyph({ icon, done, small }: { icon: IconName; done: boolean; small: boolean }) {
  const size = small ? 18 : 24;
  const badge = small ? 10 : 12;
  return (
    <span className="relative flex">
      <Icon name={icon} size={size} />
      {done && (
        <span
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: badge,
            height: badge,
            right: small ? -4 : -5,
            bottom: small ? -2 : -3,
            background: 'var(--color-action-fill)',
            color: 'var(--color-on-action)',
            boxShadow: '0 0 0 1px var(--color-action)',
          }}
        >
          <Icon name="vinkje" size={badge - 3} strokeWidth={3.4} />
        </span>
      )}
    </span>
  );
}

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
          const training = day
            .filter((d) => d.template.type !== 'recovery' && d.s.status !== 'skipped')
            .map((d) => ({ ...d, minutes: resolveEffectiveFullDuration(d.template, date, program), done: logged.has(d.s.id) }))
            .sort((a, b) => b.minutes - a.minutes);
          const rest = training.length === 0 && day.some((d) => d.template.type === 'recovery' && d.s.status !== 'skipped');
          const isToday = date === today;
          const shown = training.slice(0, MAX_PER_DAY);
          const state = (done: boolean) => (done ? 'gedaan' : date < today ? 'niet gedaan' : 'gepland');
          const what = training.length > 0
            ? training.map((t) => `${t.template.name}, ${state(t.done)}`).join(' en ')
            : rest ? 'rustdag' : 'vrij';
          const label = weekdayLongNL(date);
          return (
            <li key={date} className="flex flex-col items-center gap-1.5" aria-label={`${label.charAt(0).toUpperCase()}${label.slice(1)}${isToday ? ' (vandaag)' : ''}: ${what}`}>
              <div aria-hidden="true" className="flex h-10 flex-col items-center justify-center gap-[3px]">
                {shown.length > 0 ? (
                  shown.map((t) => (
                    <span key={t.s.id} className="flex" style={{ color: SPORT_COLOR[sportKind(t.template)] }}>
                      <DayGlyph icon={sportIcon(t.template)} done={t.done} small={shown.length > 1} />
                    </span>
                  ))
                ) : rest ? (
                  <span className="flex" style={{ color: 'var(--color-ink-dim)' }}><Icon name="ontspannen" size={24} /></span>
                ) : (
                  <span className="block h-0.5 w-2.5 rounded-full" style={{ background: 'var(--color-control-border)' }} />
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
