import type { SessionLog } from '../../models/training';
import { weekdayLongNL } from '../../utils/dates';
import type { WeekPlan } from '../../engine/dayPlan';
import { Icon } from '../icons';
import { Pictogram, type PictogramName } from '../pictograms';
import { LightCard } from '../ui';
import { sportColor, sportPictogram } from '../sportKind';
import { lookOfLog } from '../logbook/sportLook';

// De week in één strook op de lucht van Vandaag: per dag het pictogram van de
// sport in de kleur van die sport. Gepland is alleen het pictogram, gedaan is
// hetzelfde pictogram met een klein mint vinkje, zodat je in één oogopslag ziet
// wat al af is. Een rustdag is een poppetje dat ontspant (gedempt), een vrije dag
// een streepje, en vandaag staat de letter in een ijsblauwe bol. Twee trainingen
// op één dag staan kleiner onder elkaar, in de volgorde van Vandaag en Week. Wat er per dag
// staat komt uit het dagbeeld (engine/dayPlan.ts#weekPlan), dezelfde afleiding als Vandaag en Week.
// De sportkleuren zijn hier de donkere varianten op licht: de strook staat in een
// LightCard, dus `.on-light` zet ze om.

const MAX_PER_DAY = 2;

function DayGlyph({ icon, done, small }: { icon: PictogramName; done: boolean; small: boolean }) {
  const size = small ? 18 : 24;
  const badge = small ? 10 : 12;
  return (
    <span className="relative flex">
      <Pictogram name={icon} size={size} />
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
  plan,
  today,
  plain = false,
  loose = [],
}: {
  // Het dagbeeld van de week, met een gedane training op de dag van uitvoeren (engine/dayPlan.ts).
  plan: WeekPlan;
  today: string;
  // Donker in een blad (de weekterugblik): zonder lichte kaart eromheen, en een dag die voorbij is zonder
  // gedaan te zijn staat gedempt, zonder rood en zonder kruis.
  plain?: boolean;
  // Trainingen zonder plan op een dag zonder geplande training: ook die staan er als gedaan.
  loose?: SessionLog[];
}) {
  const Wrap = plain ? 'div' : LightCard;
  return (
    <Wrap>
      <ol className="grid grid-cols-7 gap-1" aria-label="Je week">
        {plan.days.map(({ date, strip: training, stripRest: rest }) => {
          const letter = weekdayLongNL(date).charAt(0).toUpperCase();
          const isToday = date === today;
          const shown = training.slice(0, MAX_PER_DAY);
          const state = (done: boolean) => (done ? 'gedaan' : date < today ? 'niet gedaan' : 'gepland');
          // Gedaan op een andere dag dan gepland: de balk zegt de geplande dag, Week de dag van uitvoeren.
          const what = training.length > 0
            ? training.map((t) => `${t.template.name}${t.plannedOn ? ` van ${t.plannedOn}` : ''}, ${state(t.done)}`).join(' en ')
            : rest ? 'rustdag' : 'vrij';
          const label = weekdayLongNL(date);
          return (
            <li key={date} className="flex flex-col items-center gap-1.5" aria-label={`${label.charAt(0).toUpperCase()}${label.slice(1)}${isToday ? ' (vandaag)' : ''}: ${what}`}>
              <div aria-hidden="true" className="flex h-10 flex-col items-center justify-center gap-[3px]">
                {shown.length > 0 ? (
                  shown.map((t) => (
                    <span key={t.session.id} className="flex" style={{ color: sportColor(t.template), opacity: plain && date < today && !t.done ? 0.4 : undefined }}>
                      <DayGlyph icon={sportPictogram(t.template)} done={t.done} small={shown.length > 1} />
                    </span>
                  ))
                ) : plain && loose.some((l) => l.completedDate === date && l.type !== 'recovery') ? (
                  <span className="flex" style={{ color: lookOfLog(loose.find((l) => l.completedDate === date && l.type !== 'recovery')!).color }}>
                    <DayGlyph icon={lookOfLog(loose.find((l) => l.completedDate === date && l.type !== 'recovery')!).icon} done small={false} />
                  </span>
                ) : rest ? (
                  <span className="flex" style={{ color: 'var(--color-ink-dim)' }}><Pictogram name="rust" size={24} /></span>
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
    </Wrap>
  );
}
