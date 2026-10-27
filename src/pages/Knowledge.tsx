// ASCEND — Kennisbank: the list of topics (grouped, with what you read) and
// one topic with its text, videos and sources (data/knowledge.ts).

import { useNavigate, useParams } from 'react-router-dom';
import { BackButton } from '../components/BackButton';
import { Card, Eyebrow, PageHeader } from '../components/ui';
import { useAppData } from '../state/AppDataContext';
import { CATEGORY_LABEL, KNOWLEDGE_TOPICS, knowledgeContent, topicById, type KnowledgeCategory } from '../data/knowledge';
import { useWeeklyLesson } from '../components/useWeeklyLesson';
import { Icon } from '../components/icons';

const ORDER: KnowledgeCategory[] = ['route', 'navigatie', 'weer', 'sneeuw', 'slapen', 'lichaam', 'uitrusting', 'mentaal'];

export function KnowledgePage() {
  const navigate = useNavigate();
  const { settings } = useAppData();
  const { topic: lesson } = useWeeklyLesson();
  const read = settings.knowledge?.read ?? [];
  const ready = KNOWLEDGE_TOPICS.filter((t) => knowledgeContent(t.id));

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-24 pt-6">
      <PageHeader eyebrow="Gidsen" title="Kennisbank" line="Alles voor onderweg" />
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-dim)' }}>
        {ready.length} van {KNOWLEDGE_TOPICS.length} onderwerpen staan klaar, {read.filter((id) => topicById(id)).length} gelezen. Elke week kiest ASCEND er een voor je uit, op Vandaag.
      </p>
      {lesson && (
        <Card className="flex flex-col gap-1" texture>
          <Eyebrow>Deze week</Eyebrow>
          <button onClick={() => navigate(`/kennis/${lesson.id}`)} className="min-h-[44px] text-left font-display text-lg" style={{ color: 'var(--color-action)' }}>{lesson.title}</button>
        </Card>
      )}
      {ORDER.map((cat) => {
        const topics = KNOWLEDGE_TOPICS.filter((t) => t.category === cat);
        if (topics.length === 0) return null;
        return (
          <Card key={cat} className="flex flex-col gap-1">
            <Eyebrow>{CATEGORY_LABEL[cat]}</Eyebrow>
            {topics.map((t) => {
              const has = !!knowledgeContent(t.id);
              return (
                <button
                  key={t.id}
                  disabled={!has}
                  onClick={() => navigate(`/kennis/${t.id}`)}
                  className="flex min-h-[48px] items-center justify-between gap-3 border-b py-2 text-left last:border-b-0 disabled:opacity-50"
                  style={{ borderColor: 'var(--color-card-border)' }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm" style={{ color: 'var(--color-ink)' }}>{t.title}</span>
                    <span className="block text-xs leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{has ? t.summary : 'Volgt nog'}</span>
                  </span>
                  <span className="shrink-0 text-xs" style={{ color: read.includes(t.id) ? 'var(--color-success)' : 'var(--color-ink-dim)' }}>{read.includes(t.id) ? 'gelezen' : has ? <Icon name="verder" size={14} /> : null}</span>
                </button>
              );
            })}
          </Card>
        );
      })}
    </div>
  );
}

export function KnowledgeTopicPage() {
  const { topicId } = useParams();
  const { settings, updateSettings } = useAppData();
  const topic = topicId ? topicById(topicId) : undefined;
  const content = topic ? knowledgeContent(topic.id) : undefined;
  const read = settings.knowledge?.read ?? [];
  const isRead = !!topic && read.includes(topic.id);

  if (!topic || !content) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-24 pt-6">
        <BackButton fallback="/kennis" />
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>Dit onderwerp staat er nog niet.</p>
      </div>
    );
  }

  const toggle = () => updateSettings({ knowledge: { ...settings.knowledge, read: isRead ? read.filter((id) => id !== topic.id) : [...read, topic.id] } });

  return (
    <div className="animate-page-in flex flex-col gap-4 px-4 pb-24 pt-6">
      <PageHeader eyebrow={CATEGORY_LABEL[topic.category]} title={topic.title} fallback="/kennis" />
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{content.intro}</p>

      {content.videos.length > 0 && (
        <Card className="flex flex-col gap-1">
          <Eyebrow>Kijken</Eyebrow>
          {content.videos.map((v) => (
            <a key={v.url} href={v.url} target="_blank" rel="noopener noreferrer" className="flex min-h-[48px] flex-col justify-center border-b py-2 last:border-b-0" style={{ borderColor: 'var(--color-card-border)' }}>
              <span className="text-sm" style={{ color: 'var(--color-action)' }}>{v.title}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" /></span>
              <span className="text-xs" style={{ color: 'var(--color-ink-dim)' }}>
                {v.channel}{v.minutes ? ` · ${v.minutes} min` : ''}{v.language && v.language !== 'nl' ? ` · ${v.language === 'en' ? 'Engels' : v.language === 'de' ? 'Duits' : 'Frans'}` : ''}{v.note ? ` · ${v.note}` : ''}
              </span>
            </a>
          ))}
        </Card>
      )}

      {content.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2><Eyebrow>{s.heading}</Eyebrow></h2>
          {s.body && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>{s.body}</p>}
          {s.items && (
            <ul className="flex flex-col gap-1.5">
              {s.items.map((i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink)' }}>
                  <span aria-hidden="true" style={{ color: 'var(--color-ink-dim)' }}>•</span>
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {content.sources.length > 0 && (
        <Card className="flex flex-col gap-1">
          <Eyebrow>Bronnen</Eyebrow>
          {content.sources.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="min-h-[44px] py-2 text-xs underline underline-offset-2" style={{ color: 'var(--color-ink-dim)' }}>{s.label}<Icon name="buiten" size={14} className="ml-1 inline align-[-2px]" /></a>
          ))}
        </Card>
      )}

      <button
        onClick={() => void toggle()}
        className="min-h-[48px] rounded-xl border text-sm font-semibold"
        style={{ borderColor: 'var(--color-action)', color: isRead ? 'var(--color-progress)' : 'var(--color-action)' }}
      >
        {isRead ? 'Weer als ongelezen' : 'Als gelezen markeren'}
      </button>
    </div>
  );
}
