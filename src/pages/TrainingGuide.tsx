import { useAppData } from '../state/AppDataContext';
import { TRAINING_GUIDES, guideDayLabel } from '../data/trainingGuide';
import { TrainingGuideSheet } from '../components/TrainingGuideSheet';
import { Card, Eyebrow, PageHeader } from '../components/ui';
import { todayISO } from '../utils/dates';
import { usePageState } from '../components/usePageState';
import { Icon } from '../components/icons';

// Fixed weekday order (Ma → Zo) rather than iterating TRAINING_GUIDES —
// object key order isn't a contract worth relying on, and this reads in
// the order someone actually trains in.


export function TrainingGuidePage() {
  const { templateById } = useAppData();
  // The week as it's actually scheduled: sessions with a usual weekday in
  // that order, then the flexible ones.
  const dayOrder = Object.keys(TRAINING_GUIDES)
    .filter((id) => templateById.has(id))
    .sort((a, b) => (templateById.get(a)!.defaultDayOfWeek ?? 8) - (templateById.get(b)!.defaultDayOfWeek ?? 8));
  const [openTemplateId, setOpenTemplateId] = usePageState<string | null>('openTemplateId', null, (v) => v === null || (typeof v === 'string' && v in TRAINING_GUIDES));

  const openTemplate = openTemplateId ? templateById.get(openTemplateId) : undefined;
  const openGuide = openTemplateId ? TRAINING_GUIDES[openTemplateId] : undefined;

  return (
    <div className="animate-page-in flex flex-col gap-5 px-4 pb-10 pt-6">
      <PageHeader eyebrow="Gidsen" title="Trainingsgids" line="Maand 1, basisfase, dag voor dag" />

      <Card className="flex flex-col gap-2">
        <Eyebrow>DOEL VAN DEZE FASE</Eyebrow>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
          Deze maand bouwt de basis waarop later specifiekere GR5-training komt: 3× kracht, aerobe basis opbouwen,
          en een weekend-beenblok (heuvelintervallen + lange duurloop) dat tegelijk hardloopprogressie en
          bergconditie traint. De GR5 is ±600 km over circa 40 etappes, uiteindelijk tellen dus niet alleen
          conditie en D+, maar ook langdurig bewegen, afdalen, rugzakbelasting en meerdere dagen achter elkaar.
        </p>
      </Card>

      <div className="flex flex-col gap-2">
        {dayOrder.map((templateId, i) => {
          const template = templateById.get(templateId);
          const guide = TRAINING_GUIDES[templateId];
          if (!template || !guide) return null;
          return (
            <button
              key={templateId}
              onClick={() => setOpenTemplateId(templateId)}
              className="animate-rise-in block min-h-[44px] w-full text-left"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <Card className="flex items-center justify-between gap-3">
                <div>
                  <Eyebrow>{guideDayLabel(template)}</Eyebrow>
                  <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--color-ink)' }}>{template.name}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--color-ink-dim)' }}>{guide.subtitle}</p>
                </div>
                <span className="shrink-0 text-sm" style={{ color: 'var(--color-gold)' }}><Icon name="verder" size={16} /></span>
              </Card>
            </button>
          );
        })}
      </div>

      {openTemplate && openGuide && (
        <TrainingGuideSheet title={openTemplate.name} guide={openGuide} template={openTemplate} dateIso={todayISO()} dayLabel={guideDayLabel(openTemplate)} onClose={() => setOpenTemplateId(null)} />
      )}
    </div>
  );
}
