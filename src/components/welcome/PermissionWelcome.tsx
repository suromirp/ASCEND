import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { shouldShowWelcome, welcomeSteps, type DevicePermissions, type WelcomeStep } from '../../engine/deviceNotices';
import { notificationPort } from '../../integrations/notifications';
import { useBackToClose } from '../../utils/useBackToClose';
import { withTimeout } from '../../utils/withTimeout';
import { ImportWizard } from '../ImportWizard';
import { Icon, type IconName } from '../icons';
import { Pictogram } from '../pictograms';
import { Portal } from '../Portal';
import { SkyBand } from '../SkyBand';
import { Card, Eyebrow, PrimaryButton, SecondaryButton } from '../ui';

// De welkomstreeks direct na de eerste start van de Android-app
// (docs/beslissingen/2026-11-01-android-app.md): per toestemming één scherm met een pictogram, één
// zin waarom, de knop om toe te staan en "Niet nu"; dan Health Connect (binnenkort) en "Je gegevens
// meenemen". Wat je overslaat vind je terug bij Instellingen, Gegevens en back-up, Toestemmingen.
// In de browser verschijnt hij niet, behalve in de testmodus (#/?welkom=test).

const SEEN_KEY = 'ascend-welkom-gezien';

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Zonder opslag komt hij bij de volgende start nog eens; meer gebeurt er niet.
  }
}

interface StepText {
  icon: IconName | 'lichaam';
  title: string;
  line: string;
  allow?: string;
}

const STEPS: Record<WelcomeStep, StepText> = {
  meldingen: { icon: 'bel', title: 'Meldingen', line: 'Zodat ASCEND je de ochtendvraag, het einde van je rust en op zondag je week kan laten weten.', allow: 'Meldingen toestaan' },
  wekker: { icon: 'wekker', title: 'Exacte wekker', line: 'Zodat je telefoon trilt als je rust voorbij is, ook met het scherm uit.', allow: 'Exacte wekker toestaan' },
  health: { icon: 'lichaam', title: 'Health Connect', line: 'Binnenkort leest ASCEND hier je gewicht, stappen en trappen. Je hoeft nu niets te doen.' },
  gegevens: { icon: 'logboek', title: 'Je gegevens meenemen', line: 'De app en de website in Chrome hebben elk hun eigen opslag. Gebruikte je de website al? Maak daar een back-up en zet die hier terug.', allow: 'Back-up terugzetten' },
};

export function PermissionWelcome({ ready }: { ready: boolean }) {
  const { search } = useLocation();
  const forced = new URLSearchParams(search).get('welkom') === 'test';
  const port = notificationPort();
  const [steps, setSteps] = useState<WelcomeStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!ready || done || steps || !shouldShowWelcome({ timed: port.timed, seen: seen(), forced })) return;
    let alive = true;
    const fallback: DevicePermissions = { timed: port.timed, notifications: 'prompt', exactAlarm: 'prompt', healthConnect: 'soon' };
    void withTimeout(port.permissions(), 2000)
      .catch(() => fallback)
      .then((p) => {
        if (alive) setSteps(welcomeSteps(p, forced));
      });
    return () => {
      alive = false;
    };
  }, [ready, done, steps, port, forced]);

  if (!steps || done) return null;
  return (
    <WelcomeScreens
      steps={steps}
      index={index}
      onNext={() => (index + 1 < steps.length ? setIndex(index + 1) : finish())}
      onClose={finish}
    />
  );

  function finish() {
    if (!forced) markSeen();
    setDone(true);
  }
}

function WelcomeScreens({ steps, index, onNext, onClose }: { steps: WelcomeStep[]; index: number; onNext: () => void; onClose: () => void }) {
  const step = steps[index];
  const text = STEPS[step];
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  // De terugknop sluit de hele reeks; wat je oversloeg staat bij Toestemmingen.
  useBackToClose(true, onClose);

  async function allow() {
    if (step === 'gegevens') {
      setImporting(true);
      return;
    }
    setBusy(true);
    const port = notificationPort();
    try {
      if (step === 'meldingen') await port.requestNotifications();
      if (step === 'wekker') await port.requestExactAlarm();
    } catch {
      // Hoe het ook afliep: Toestemmingen laat later zien wat aan staat.
    } finally {
      setBusy(false);
      onNext();
    }
  }

  return (
    <Portal>
      {!importing && (
      <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ background: 'var(--color-bg)' }} role="dialog" aria-modal="true" aria-label={text.title}>
        <div key={step} className="animate-page-in mx-auto flex max-w-md flex-col gap-5 px-4 pb-8">
          <SkyBand gear={false}>
            <header className="flex flex-col gap-1">
              <Eyebrow>Welkom</Eyebrow>
              <h1 className="font-display text-[28px] leading-9" style={{ color: 'var(--color-ink)' }}>{text.title}</h1>
            </header>
            <Card className="flex flex-col items-start gap-4">
              <span aria-hidden="true" className="inline-flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--color-action) 16%, transparent)', color: 'var(--color-action)' }}>
                {text.icon === 'lichaam' ? <Pictogram name="lichaam" size={40} /> : <Icon name={text.icon} size={32} />}
              </span>
              <p className="text-base" style={{ color: 'var(--color-ink)' }}>{text.line}</p>
              <div className="flex w-full flex-col gap-3">
                {text.allow ? (
                  <>
                    <PrimaryButton onClick={() => void allow()} disabled={busy}>{busy ? 'Even wachten' : text.allow}</PrimaryButton>
                    <SecondaryButton onClick={onNext} disabled={busy}>Niet nu</SecondaryButton>
                  </>
                ) : (
                  <PrimaryButton onClick={onNext}>Verder</PrimaryButton>
                )}
              </div>
            </Card>
          </SkyBand>
          <p className="px-1 text-sm" style={{ color: 'var(--color-ink-dim)' }}>
            Je gegevens blijven op deze telefoon. Wat je nu overslaat, zet je later aan bij Instellingen, Gegevens en back-up, Toestemmingen.
          </p>
        </div>
      </div>
      )}
      {importing && (
        <ImportWizard
          onClose={() => {
            setImporting(false);
            onNext();
          }}
        />
      )}
    </Portal>
  );
}
