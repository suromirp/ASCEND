import { Fragment, useState } from 'react';
import { CHOICES } from '../../../data/settingsChoices';
import { listenNotice, REST_SOUND_GROUPS, type RestSound, type RestVolume } from '../../../engine/restSounds';
import { restAlertChannels, restVibrationFor } from '../../../engine/restVibration';
import type { RestAlert } from '../../../engine/strengthSettings';
import { haptics } from '../../../utils/haptics';
import { playRestBell } from '../../../utils/restBell';
import { Eyebrow } from '../../ui';
import { Icon } from '../../icons';
import { TextButton } from '../../TextButton';
import { Sheet } from '../Sheet';

// Het blad Geluid na de rust (besluit docs/beslissingen/2026-11-11-rusttimer-geluiden.md): de tien
// keuzes onder vijf kopjes, met bij elke keuze een knop Luister. Kiezen bewaart en laat het blad open,
// zodat je verder kunt luisteren; Luister speelt de klank met je volume en, als trillen aan staat, het
// ritme. Een nieuwe Luister stopt de vorige; de bel van een lopende rust klinkt gewoon door.
export function RestSoundSheet({
  value,
  volume,
  alert,
  onPick,
  onClose,
}: {
  value: RestSound;
  volume: RestVolume;
  alert: RestAlert;
  onPick: (sound: RestSound) => void;
  onClose: () => void;
}) {
  const def = CHOICES.rustgeluid;
  // Wat Luister zegt als het niet klonk zoals gekozen, onder het kopje van die klank (daar kijk je).
  const [notice, setNotice] = useState<{ sound: RestSound; text: string } | null>(null);
  const option = (v: RestSound) => def.options.find((o) => o.value === v);

  const listen = (sound: RestSound) => {
    setNotice(null);
    if (restAlertChannels(alert).vibrate) haptics.pattern(restVibrationFor(sound, 'set'));
    void playRestBell(sound, { volume, preview: true }).then((outcome) => {
      const text = listenNotice(outcome);
      setNotice(text ? { sound, text } : null);
    });
  };

  return (
    <Sheet eyebrow={def.group} title={def.title} line={def.line} onClose={onClose}>
      {REST_SOUND_GROUPS.map((group) => (
        <Fragment key={group.title}>
          <div className="st-eyebrow"><Eyebrow>{group.title}</Eyebrow></div>
          <div className="st-list" role="radiogroup" aria-label={`${def.title}: ${group.title}`}>
            {group.sounds.map((sound) => {
              const o = option(sound);
              if (!o) return null;
              const on = sound === value;
              return (
                <div key={sound} className="st-listen">
                  <button type="button" role="radio" aria-checked={on} className="st-opt" onClick={() => onPick(sound)}>
                    <span>
                      <span className="l">
                        {o.label}
                        {sound === def.advice && <span className="st-tag">Advies</span>}
                      </span>
                      <span className="n st-num">{o.note}</span>
                    </span>
                    <span className="ck">{on && <Icon name="gedaan" size={24} />}</span>
                  </button>
                  <TextButton tone="dim" className="st-listen-btn" aria-label={`Luister naar ${o.label}`} onClick={() => listen(sound)}>
                    Luister
                  </TextButton>
                </div>
              );
            })}
          </div>
          {notice && group.sounds.includes(notice.sound) && <p className="st-hint warn" role="status">{notice.text}</p>}
        </Fragment>
      ))}
    </Sheet>
  );
}
