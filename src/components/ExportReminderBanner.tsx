import { Card, SecondaryButton, Eyebrow } from './ui';

// De back-up op Vandaag. Zonder `due` de herinnering na 7 dagen; met `due` het moment van de
// automatische back-up ("Tijd voor je back-up"), met de reden in amber als die net mislukte.
export function ExportReminderBanner({ logsSinceBackup, neverBackedUp, onExport, onDismiss, due = false, failure }: {
  logsSinceBackup: number;
  neverBackedUp: boolean;
  onExport: () => void;
  onDismiss: () => void;
  due?: boolean;
  failure?: string;
}) {
  const one = logsSinceBackup === 1;
  const sinceLine = neverBackedUp
    ? `Je hebt nog geen back-up. ${one ? 'Je training staat' : logsSinceBackup > 0 ? `Je ${logsSinceBackup} trainingen staan` : 'Alles staat'} alleen op deze telefoon.`
    : logsSinceBackup > 0
      ? `${logsSinceBackup} ${one ? 'training' : 'trainingen'} sinds je laatste back-up. Alles staat alleen op deze telefoon.`
      : 'Alles staat alleen op deze telefoon.';
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>Back-up</Eyebrow>
      {due && <p className="text-base" style={{ color: 'var(--color-ink)' }}>Tijd voor je back-up.</p>}
      <p className="text-sm" style={{ color: due ? 'var(--color-ink-dim)' : 'var(--color-ink)' }}>
        {sinceLine}
      </p>
      {failure && (
        <p className="text-sm" role="status" style={{ color: 'var(--color-warning)' }}>
          {failure}
        </p>
      )}
      <div className="mt-1 flex gap-3">
        <SecondaryButton onClick={onDismiss}>Niet nu</SecondaryButton>
        <SecondaryButton onClick={onExport}>Back-up maken</SecondaryButton>
      </div>
    </Card>
  );
}
