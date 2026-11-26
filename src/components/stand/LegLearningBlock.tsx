import { useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import { addLegDecision, changesPlanningFactor, learningLine, type LegLearning } from '../../engine/legIndexLearning';
import { usePlanSettingChange } from '../settings/usePlanSettingChange';
import { withTimeout } from '../../utils/withTimeout';
import { PrimaryButton } from '../ui';
import { TextButton } from '../TextButton';

// Je eigen beenindex in het blad Index en je benen (docs/beslissingen/2026-11-26-beenindex-leert.md): wat je
// ochtenden zeggen, en bij een voorstel Akkoord of Liever niet. Akkoord dat de factor van de planning
// verandert, gaat eerst langs de planning (usePlanSettingChange); anders bewaart het alleen de rij.
export function LegLearningBlock({ learning }: { learning: LegLearning }) {
  const { settings, updateSettings } = useAppData();
  const plan = usePlanSettingChange();
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const proposal = learning.status === 'klaar' ? learning.proposal : undefined;

  async function decide(source: 'akkoord' | 'liever-niet') {
    if (!proposal || saving) return;
    setFailed(false);
    setSaving(true);
    const legFactorLog = addLegDecision(settings.legFactorLog, source, proposal.factor, new Date().toISOString());
    try {
      if (source === 'akkoord' && changesPlanningFactor(settings, { ...settings, legFactorLog })) {
        await plan.changeSetting('Je eigen beenindex', { legFactorLog }, proposal.line.replace(/\?$/, '.'), { declined: 'Je index en je planning blijven zoals ze waren. Het voorstel komt terug.' });
      } else {
        await withTimeout(updateSettings({ legFactorLog }), 8000);
      }
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        De index leert van je ochtenden: hoe je benen voelden naast wat de index zei.
      </p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
        {learningLine(learning)}
      </p>
      {proposal && (
        <div className="flex flex-col gap-2" data-leg-proposal>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{proposal.line}</p>
          <PrimaryButton onClick={() => void decide('akkoord')} disabled={saving || plan.busy}>Akkoord</PrimaryButton>
          <TextButton tone="dim" onClick={() => void decide('liever-niet')} disabled={saving || plan.busy} className="self-center">Liever niet</TextButton>
        </div>
      )}
      {failed && <p className="text-sm" style={{ color: 'var(--color-warning)' }}>Niet bewaard. Probeer het opnieuw.</p>}
      {plan.note && <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>{plan.note}</p>}
      {plan.impact}
    </div>
  );
}
