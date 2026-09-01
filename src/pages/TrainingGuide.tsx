import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../state/AppDataContext';
import { TRAINING_GUIDES } from '../data/trainingGuide';
import { TrainingGuideSheet } from '../components/TrainingGuideSheet';
import { Card, Eyebrow } from '../components/ui';

// Fixed weekday order (Ma → Zo) rather than iterating TRAINING_GUIDES —
// object key order isn't a contract worth relying on, and this reads in
// the order someone actually trains in.
const DAY_ORDER = ['tpl_upper_a', 'tpl_easy_run', 'tpl_lower_a', 'tpl_upper_b', 'tpl_bergconditie', 'tpl_lower_b', 'tpl_herstel'];

export function TrainingGuidePage() {
  const navigate = useNavigate();
  const { templateById } = useAppData();
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(null);

  const openTemplate = openTemplateId ? templateById.get(openTemplateId) : undefined;
  const openGuide = openTemplateId ? TRAINING_GUIDES[openTemplateId] : undefined;

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 pt-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-lg" style={{ color: 'var(--color-ink-dim)' }}>‹</button>
        <div>
          <p className="font-display text-lg" style={{ color: 'var(--color-bronze)' }}>TRAININGSGIDS</p>
          <p className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>Maand 1 — Basisfase, dag voor dag</p>
        </div>
      </div>

      <Card className="flex flex-col gap-2">
        <Eyebrow>DOEL VAN DEZE FASE</Eyebrow>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Deze maand bouwt de basis waarop later specifiekere GR5-training komt: 4× kracht, aerobe basis opbouwen,
          wennen aan bergconditie. De GR5 is ±600 km over circa 40 etappes — uiteindelijk tellen dus niet alleen
          conditie en D+, maar ook langdurig bewegen, afdalen, rugzakbelasting en meerdere dagen achter elkaar.
        </p>
      </Card>

      <div className="flex flex-col gap-2">
        {DAY_ORDER.map((templateId) => {
          const template = templateById.get(templateId);
          const guide = TRAINING_GUIDES[templateId];
          if (!template || !guide) return null;
          return (
            <button key={templateId} onClick={() => setOpenTemplateId(templateId)} className="text-left">
              <Card className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium tracking-wide" style={{ color: 'var(--color-bronze)' }}>{guide.dayLabel}</p>
                  <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{template.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{guide.subtitle}</p>
                </div>
                <span className="shrink-0 text-sm" style={{ color: 'var(--color-gold)' }}>›</span>
              </Card>
            </button>
          );
        })}
      </div>

      {openTemplate && openGuide && (
        <TrainingGuideSheet title={openTemplate.name} guide={openGuide} onClose={() => setOpenTemplateId(null)} />
      )}
    </div>
  );
}
