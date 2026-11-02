// Hoeveel per soort (docs/visie/Sporten die meetellen.md, 2.4): per soort training Minder, Normaal of Meer, met
// onder de naam wat het in minuten betekent. Een keuze opent altijd eerst het voorstel met wat er in je
// planning verandert; de wens blijft bewaard. De inhoud komt uit engine/kindAmount.ts.

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../state/AppDataContext';
import { SkyBand } from '../../components/SkyBand';
import { Icon } from '../../components/icons';
import { Card, Chip } from '../../components/ui';
import { useSettingsFacts } from '../../components/settings/useSettingsFacts';
import { usePlanSettingChange } from '../../components/settings/usePlanSettingChange';
import { kindAmountLine, kindCostLine, parseKindAmounts, trainingKindOf, visibleKinds } from '../../engine/kindAmount';
import { resolveEffectiveFullDuration, withDurationScope } from '../../engine/substitutions';
import { weeklyPatternTemplates } from '../../engine/sports';
import { KIND_AMOUNT_LABEL, type KindAmount, type TrainingKindId } from '../../data/trainingKinds';
import { settingsPageRoute } from '../../data/settingsLayout';
import { todayISO } from '../../utils/dates';
import '../../components/settings/settings.css';

const CHOICES: (KindAmount | 'normal')[] = ['less', 'normal', 'more'];

export function KindAmountPage() {
  const navigate = useNavigate();
  const { settings, templates, program } = useAppData();
  const { facts } = useSettingsFacts();
  const plan = usePlanSettingChange();
  const amounts = parseKindAmounts(settings.kindAmount).value ?? {};
  const pattern = useMemo(() => weeklyPatternTemplates(templates, settings), [templates, settings]);
  const kinds = visibleKinds(pattern, { trek: facts.treks > 0 });
  const keyKind: TrainingKindId | undefined = pattern.some((t) => trainingKindOf(t) === 'long') ? 'long' : undefined;

  function info(kind: TrainingKindId): { minutes: number; perWeek: number } {
    const ofKind = pattern.filter((t) => trainingKindOf(t) === kind);
    const first = ofKind[0] ?? templates.find((t) => trainingKindOf(t) === kind);
    // Normaal: zonder de keuze van nu.
    const minutes = first ? withDurationScope({ kindAmounts: {} }, () => resolveEffectiveFullDuration(first, todayISO(), program)) : 0;
    return { minutes, perWeek: ofKind.length };
  }

  function pick(kind: TrainingKindId, label: string, choice: KindAmount | 'normal') {
    const current = amounts[kind] ?? 'normal';
    if (choice === current) return;
    const next = { ...amounts };
    if (choice === 'normal') delete next[kind];
    else next[kind] = choice;
    const cost = kindCostLine(kind, choice === 'normal' ? undefined : choice, { trek: facts.treks > 0, key: keyKind });
    const why = `${label} ${KIND_AMOUNT_LABEL[choice].toLowerCase()}: ${choice === 'normal' ? 'zoals het plan het zet' : choice === 'more' ? 'eerst langer, daarna waar het past een keer extra' : 'eerst korter, daarna een keer minder als er meer dan één staat'}.${cost ? ` ${cost}` : ''}`;
    void plan.changeSetting(`${label}: ${KIND_AMOUNT_LABEL[choice].toLowerCase()}`, { kindAmount: Object.keys(next).length > 0 ? next : undefined }, why, { alwaysAsk: true });
  }

  return (
    <div className="st-page animate-page-in">
      <SkyBand variant="low" gear={false}>
        <button type="button" className="st-back" onClick={() => navigate(settingsPageRoute('planning'))}>
          <Icon name="terug" size={20} />
          Planning
        </button>
        <h1 className="st-title">Hoeveel per soort</h1>
      </SkyBand>
      <p className="st-hint" style={{ marginLeft: 0, marginRight: 0 }}>Minder of Meer maakt een training eerst korter of langer, daarna komt er waar het past een bij of gaat er een af. Je ziet eerst wat er verandert.</p>
      {plan.note && <p className="st-hint" style={{ marginLeft: 0, marginRight: 0, color: 'var(--color-ink)' }} role="status">{plan.note}</p>}
      <div className="mt-4 flex flex-col gap-3">
        {kinds.map((k) => {
          const { minutes, perWeek } = info(k.id);
          const value = amounts[k.id] ?? 'normal';
          return (
            <Card key={k.id} className="flex flex-col gap-3">
              <div>
                <p className="font-display text-xl" style={{ color: 'var(--color-ink)' }}>{k.label}</p>
                {minutes > 0 && <p className="mt-1 text-sm tabular-nums" style={{ color: 'var(--color-ink-dim)' }}>{kindAmountLine(minutes, perWeek, value === 'normal' ? undefined : value)}</p>}
              </div>
              <div className="st-chips" role="group" aria-label={`Hoeveel ${k.label.toLowerCase()}`}>
                {CHOICES.map((c) => (
                  <Chip key={c} selected={value === c} onClick={() => pick(k.id, k.label, c)}>{KIND_AMOUNT_LABEL[c]}</Chip>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      {plan.impact}
    </div>
  );
}
