import { useId, useState } from 'react';
import { exerciseById } from '../data/exercises';
import { GUIDE_CARE, guideLinks } from '../engine/exerciseGuide';
import { resolveGuideOpen } from '../engine/exerciseArtSettings';
import type { Exercise } from '../models/exercise';
import { useAppData } from '../state/AppDataContext';
import { TextButton } from './TextButton';

// De uitleg van een oefening in twee lagen: "In het kort" (drie regels) en de zorgzin altijd zichtbaar, "Lees verder"
// achter een tik. Het uitklappen gebruikt het patroon van .mx-unfold (Rustig en Uit: meteen de eindstand).
// De teksten staan in data/exerciseGuides.ts; Lichter en Zwaarder verschijnen alleen voor een oefening die bestaat.
// Ontwerp: docs/beslissingen/2026-11-09-uitleg-bij-oefeningen.md.

function Heading({ children }: { children: string }) {
  return <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{children}</h3>;
}

function Body({ children }: { children: string }) {
  return <p className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{children}</p>;
}

// Doet niets voor een oefening zonder uitleg; de aanroeper houdt dan de oude regels.
export function ExerciseGuideBlock({ exercise, onOpen }: { exercise: Exercise; onOpen: (exerciseId: string) => void }) {
  const { settings } = useAppData();
  const [open, setOpen] = useState(() => resolveGuideOpen(settings));
  const regionId = useId();
  const guide = exercise.guide;
  if (!guide) return null;
  const { easier, harder } = guideLinks(guide, exerciseById);

  return (
    <div className="flex flex-col gap-2" role="group" aria-label={`Uitleg van ${exercise.name}`}>
      <Heading>In het kort</Heading>
      <ul className="flex flex-col gap-2">
        {guide.short.map((line) => (
          <li key={line} className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>{line}</li>
        ))}
      </ul>
      <p className="text-sm leading-snug" style={{ color: 'var(--color-ink-dim)' }}>{GUIDE_CARE}</p>
      <div>
        <TextButton onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={regionId} icon="omlaag" flipped={open}>
          Lees verder
        </TextButton>
      </div>
      <div id={regionId} className="mx-unfold" data-shown={open} inert={!open}>
        <div>
          <div className="flex flex-col gap-3 pb-1 pt-1">
            <div className="flex flex-col gap-0.5">
              <Heading>Beginstand</Heading>
              <Body>{guide.setup}</Body>
            </div>
            <div className="flex flex-col gap-0.5">
              <Heading>Beweging</Heading>
              <Body>{guide.movement}</Body>
            </div>
            <div className="flex flex-col gap-0.5">
              <Heading>Tempo en adem</Heading>
              <Body>{guide.tempo}</Body>
            </div>
            <div className="flex flex-col gap-1.5">
              <Heading>Veelgemaakte fouten</Heading>
              {guide.mistakes.map((m) => (
                <p key={m.fault} className="text-base leading-snug" style={{ color: 'var(--color-ink)' }}>
                  {m.fault} {m.fix}
                </p>
              ))}
            </div>
            {(easier || harder) && (
              <div className="flex flex-col items-start">
                {easier && <TextButton icon="verder" onClick={() => onOpen(easier.id)}>{`Lichter: ${easier.name}`}</TextButton>}
                {harder && <TextButton icon="verder" onClick={() => onOpen(harder.id)}>{`Zwaarder: ${harder.name}`}</TextButton>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Dezelfde uitleg zonder tekeningenblad (Forge, als de plaatjes uit staan): een tik op Lichter of Zwaarder toont de
// uitleg van die oefening op dezelfde plek, met een knop terug.
export function ExerciseGuideInline({ exerciseId }: { exerciseId: string }) {
  const [trail, setTrail] = useState<string[]>([exerciseId]);
  const shownId = trail[trail.length - 1];
  const exercise = exerciseById(shownId);
  if (!exercise?.guide) return null;
  return (
    <div className="flex flex-col gap-1">
      {trail.length > 1 && (
        <div>
          <TextButton tone="dim" onClick={() => setTrail(trail.slice(0, -1))}>
            {`Terug naar ${exerciseById(trail[trail.length - 2])?.name ?? 'de vorige'}`}
          </TextButton>
        </div>
      )}
      {trail.length > 1 && <p className="text-base font-medium" style={{ color: 'var(--color-ink)' }}>{exercise.name}</p>}
      <ExerciseGuideBlock key={shownId} exercise={exercise} onOpen={(id) => setTrail([...trail, id])} />
    </div>
  );
}
