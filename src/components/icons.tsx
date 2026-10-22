import type { ReactNode } from 'react';

// De iconenset van ASCEND ("steen en contour"): eigen lijniconen, 1,6 px dik,
// ronde uiteinden, in de kleur van de tekst eromheen (currentColor). Geen
// bibliotheek. Kleur zet de aanroeper: brons of goud voor wat actief is, de
// gedempte inktkleur voor de rest. Alle tekens staan op een raster van 24 bij 24.
//
// Gebruik: <Icon name="stand" /> of <Icon name="gedaan" size={24} />.
// Een icoon naast een woord is versiering (aria-hidden); een icoon dat alleen
// staat, krijgt een `label` en wordt dan voorgelezen.

const PATHS = {
  // Tabbalk
  vandaag: (
    <>
      <path d="M3 18h18" />
      <path d="M6.5 18a5.5 5.5 0 0 1 11 0" />
      <path d="M12 6.5V8.5" />
      <path d="M5.6 10.1l1.3 1.3" />
      <path d="M18.4 10.1l-1.3 1.3" />
      <path d="M7 21h10" />
    </>
  ),
  week: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.5M16 3v3.5" />
      <path d="M6.5 17l3-3.2 2 1.6 3-3.4 3 5" />
    </>
  ),
  stand: (
    <>
      <path d="M3 19h18" />
      <path d="M5.5 15.5c2.2-.6 3.8-4 6.5-4s4.3 3.4 6.5 4" />
      <path d="M8.5 11.5c1.2-.5 2-3 3.5-3s2.3 2.5 3.5 3" />
      <path d="M11 6.2c.3-.4.6-1.2 1-1.2s.7.8 1 1.2" />
    </>
  ),
  ascend: (
    <>
      <path d="M3 19l6-10 3.5 5.5 2.5-3.5L21 19z" />
      <path d="M15 11V5.5l3 1-3 1" />
    </>
  ),
  logboek: (
    <>
      <path d="M12 6.5C9.8 5 7 4.6 4 5.2v13c3-.6 5.8-.2 8 1.3 2.2-1.5 5-1.9 8-1.3v-13c-3-.6-5.8-.2-8 1.3z" />
      <path d="M12 6.5v13" />
    </>
  ),
  // Het tandwiel (Meer): acht tanden rond een gat.
  tandwiel: (
    <>
      <path d="M10.39 4.78L10.95 2.46H13.05L13.61 4.78L15.97 5.75L18 4.51L19.49 6L18.25 8.03L19.22 10.39L21.54 10.95V13.05L19.22 13.61L18.25 15.97L19.49 18L18 19.49L15.97 18.25L13.61 19.22L13.05 21.54H10.95L10.39 19.22L8.03 18.25L6 19.49L4.51 18L5.75 15.97L4.78 13.61L2.46 13.05V10.95L4.78 10.39L5.75 8.03L4.51 6L6 4.51L8.03 5.75Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // Toestand van een training
  gedaan: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.7 2.6L16.2 9.5" />
    </>
  ),
  gepland: <circle cx="12" cy="12" r="8.5" />,
  vandaagStip: (
    <>
      <circle cx="12" cy="12" r="8.5" opacity=".45" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </>
  ),
  rustdag: <path d="M3 9.5c3 0 4.5 5 9 5s6-5 9-5" />,
  verplaatst: (
    <>
      <path d="M5 16a7 7 0 0 1 12.5-6" />
      <path d="M18 5v5h-5" />
    </>
  ),
  // Soorten training en onderweg
  test: (
    <>
      <path d="M6 21V4" />
      <path d="M6 4h11l-2 3.5 2 3.5H6" />
    </>
  ),
  lopen: (
    <>
      <path d="M3 16.5V13l3-1 2-5h3l1 3 4 1.5c2.5.9 5 2 5 4v1H3z" />
      <path d="M3 19.5h18" />
    </>
  ),
  kracht: <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  wandelen: (
    <>
      <path d="M8 3l3 18" />
      <path d="M6.5 6.5h4" />
      <path d="M15 4c1.7 0 3 1.3 3 3s-1.3 3-3 3" />
      <path d="M15 10l2 11" />
    </>
  ),
  rugzak: (
    <>
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" />
      <rect x="5.5" y="7" width="13" height="14" rx="3.5" />
      <path d="M9 14h6v4H9z" />
    </>
  ),
  bivak: (
    <>
      <path d="M3 20L12 5l9 15z" />
      <path d="M12 5v15" />
      <path d="M9 20l3-5 3 5" />
    </>
  ),
  horloge: (
    <>
      <rect x="7" y="6.5" width="10" height="11" rx="3" />
      <path d="M9 6.5L9.6 3h4.8l.6 3.5M9 17.5l.6 3.5h4.8l.6-3.5" />
      <path d="M12 9.5V12l1.6 1" />
    </>
  ),
  // Een zandloper, zodat de timer niet meer op het Logboek lijkt.
  timer: (
    <>
      <path d="M7 3h10M7 21h10" />
      <path d="M8 3v2.5c0 1.4.7 2.6 1.9 3.4L12 10.5l2.1-1.6C15.3 8.1 16 6.9 16 5.5V3" />
      <path d="M8 21v-2.5c0-1.4.7-2.6 1.9-3.4L12 13.5l2.1 1.6c1.2.8 1.9 2 1.9 3.4V21" />
    </>
  ),
  rekken: (
    <>
      <circle cx="12" cy="4.5" r="1.6" />
      <path d="M12 7v7M7 9.5l5 1.5 5-1.5M9 21l3-7 3 7" />
    </>
  ),
  // Een pijltje naar rechts, voor een regel die naar een ander scherm gaat.
  verder: <path d="M9.5 6l6 6-6 6" />,
  // Bij een stapper en een eigen waarde.
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  min: <path d="M5.5 12h13" />,
  sluiten: <path d="M7 7l10 10M17 7L7 17" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 22,
  label,
  className,
}: {
  name: IconName;
  size?: number;
  /** Alleen invullen als het icoon zonder woord staat. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {PATHS[name]}
    </svg>
  );
}
