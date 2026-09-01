import { Card, PrimaryButton, SecondaryButton, Eyebrow } from './ui';

export function ExportReminderBanner({ onExport, onDismiss }: { onExport: () => void; onDismiss: () => void }) {
  return (
    <Card className="flex flex-col gap-2">
      <Eyebrow>BACK-UP</Eyebrow>
      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
        Je hebt al een tijdje geen back-up gemaakt. Alles staat alleen lokaal op dit toestel.
      </p>
      <div className="mt-1 flex gap-3">
        <SecondaryButton onClick={onDismiss}>NIET NU</SecondaryButton>
        <PrimaryButton onClick={onExport} fullWidth={false}>EXPORTEER</PrimaryButton>
      </div>
    </Card>
  );
}
