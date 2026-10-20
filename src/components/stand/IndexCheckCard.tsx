import type { IndexCheck } from '../../engine/learning';
import { formatNumberNL } from '../../utils/number';
import { Card, Eyebrow } from '../ui';
import { dayShort } from './chartParts';

// Je stand → the leg index against your own legs: what you said at the
// warm-up of a hard run or test next to what the index said that morning.

const LEGS_WORD = { fris: 'fris', normaal: 'normaal', zwaar: 'zwaar' } as const;

export function IndexCheckCard({ checks }: { checks: IndexCheck[] }) {
  const agree = checks.filter((c) => c.agrees).length;
  const tooLow = checks.filter((c) => c.indexTooLow).length;
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <Eyebrow>INDEX EN JE BENEN</Eyebrow>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Na een harde loop of test vraagt ASCEND hoe je benen voelden bij het inlopen, en legt dat naast wat de index die ochtend zei.
        </p>
      </div>
      {checks.length === 0 ? (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
          Nog geen metingen. Vul na je volgende harde loop of test in hoe je benen voelden; dan zie je hier hoe goed het getal bij jou klopt.
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            {agree} van {checks.length} keer {checks.length === 1 ? 'klopte' : 'klopten'} index en gevoel.
            {tooLow > 0 && ` ${tooLow === 1 ? 'Eén keer voelden' : `${tooLow} keer voelden`} je benen zwaar terwijl de index fris zei: vertrouw dan op je gevoel bij het inlopen.`}
            {checks.length < 5 && ' Na een paar metingen meer zegt dit pas echt iets.'}
          </p>
          <div className="flex flex-col gap-1">
            {checks.slice(0, 5).map((c) => (
              <div key={c.date + c.name} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate" style={{ color: 'var(--color-ink)' }}>{c.name} <span style={{ color: 'var(--color-ink-dim)' }}>· {dayShort(c.date)}</span></span>
                <span className="shrink-0 tabular-nums" style={{ color: c.agrees ? 'var(--color-ink-dim)' : 'var(--color-gold)' }}>
                  index {formatNumberNL(c.index, 1)}, benen {LEGS_WORD[c.legs]}{c.agrees ? '' : ' ≠'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
