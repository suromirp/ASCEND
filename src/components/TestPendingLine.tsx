// Een rustige regel op Vandaag zolang een trage test wacht op je antwoord. Zonder deze regel
// blijven je tempo's stil op de vorige test staan en weet je niet waarom. Geen kaart en geen
// gevulde knop: een tik opent het logblad van die test, met de vraag
// (docs/beslissingen/2026-10-27-testloop-lezen-aanvulling.md).

import { useState } from 'react';
import { useAppData } from '../state/AppDataContext';
import { pendingTestLine } from '../engine/testJudgment';
import { Icon } from './icons';
import { LogDetailSheet } from './LogDetailSheet';

export function TestPendingLine() {
  const { sessionLogs, settings, templateById } = useAppData();
  const [open, setOpen] = useState(false);
  const line = pendingTestLine(sessionLogs, settings);
  const log = line ? sessionLogs.find((l) => l.id === line.logId) : undefined;
  if (!line || !log) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] w-full items-center gap-2 px-1 text-left text-sm active:opacity-70"
        style={{ color: 'var(--color-ink-dim)' }}
      >
        <span className="min-w-0 flex-1">{line.text}</span>
        <span className="shrink-0"><Icon name="verder" size={16} /></span>
      </button>
      {open && <LogDetailSheet log={log} templateName={templateById.get(log.templateId)?.name ?? log.templateId} onClose={() => setOpen(false)} />}
    </>
  );
}
