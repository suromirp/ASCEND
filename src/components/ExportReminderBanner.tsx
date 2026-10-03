import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';

export function ExportReminderBanner({ logsSinceBackup, neverBackedUp, onExport, onDismiss }: {
  logsSinceBackup: number;
  neverBackedUp: boolean;
  onExport: () => void;
  onDismiss: () => void;
}) {
  const one = logsSinceBackup === 1;
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>BACK-UP</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
        {neverBackedUp
          ? `Je hebt nog geen back-up gemaakt. ${one ? 'Je training staat' : `Je ${logsSinceBackup} trainingen staan`} alleen op dit toestel.`
          : `${logsSinceBackup} ${one ? 'training' : 'trainingen'} sinds je laatste back-up. Alles staat alleen op dit toestel.`}
      </p>
      <div className="mt-1 flex gap-3">
        <SecondaryButton onClick={onDismiss}>NIET NU</SecondaryButton>
        <PrimaryButton onClick={onExport} fullWidth={false}>EXPORTEER</PrimaryButton>
      </div>
    </Card>
  );
}
