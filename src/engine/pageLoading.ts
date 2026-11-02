import { isSettingsPageId, settingsPageTitle } from '../data/settingsLayout';

// Wat er staat terwijl een lui geladen pagina nog laadt (components/PageLoading.tsx): de lucht van die
// pagina met haar titel en één lege kaart, zodat de app nooit op een leeg scherm staat
// (docs/beslissingen/2026-10-22-kwaliteitspoort.md, docs/onderhoud/2026-11-02-sneller.md).
// `tab` is de hoge lucht van een tab, `settings` de lage lucht van Instellingen zonder tandwiel,
// `page` de lage lucht met terugknop van een losse pagina (PageHeader).
export interface PageLoadingHeading {
  kind: 'tab' | 'settings' | 'page';
  eyebrow?: string;
  title: string;
}

const PAGES: { path: string; prefix?: boolean; eyebrow: string; title: string }[] = [
  { path: '/lichaam', prefix: true, eyebrow: 'Lichaam', title: 'Lichaam' },
  { path: '/koppelen/garmin', eyebrow: 'Koppelingen', title: 'Garmin koppelen' },
  { path: '/koppelen/macrofactor', eyebrow: 'Koppelingen', title: 'MacroFactor inlezen' },
  { path: '/bronnen', eyebrow: 'Kennis', title: 'Bronnen' },
  { path: '/plekken', eyebrow: 'Gidsen', title: 'Trainingsplekken' },
  { path: '/weer', eyebrow: 'Buiten', title: 'Weer en kleding' },
  { path: '/forge', eyebrow: 'Stand', title: 'Forge' },
  { path: '/reis/paklijst', eyebrow: 'Reis', title: 'Paklijst' },
  { path: '/reis', eyebrow: 'Reis', title: 'Reisplanner' },
  { path: '/etappes', eyebrow: 'Reis', title: 'Etappes' },
  { path: '/onderweg', eyebrow: 'Reis', title: 'Alleen onderweg' },
  { path: '/kennis', prefix: true, eyebrow: 'Gidsen', title: 'Kennisbank' },
  { path: '/stretches', prefix: true, eyebrow: 'Lichaam', title: 'Lichaam' },
];

export function pageLoadingHeading(pathname: string): PageLoadingHeading {
  if (pathname === '/stand') return { kind: 'tab', title: 'Je stand' };
  if (pathname === '/more/planning/sporten') return { kind: 'settings', eyebrow: 'Planning', title: 'Sporten' };
  if (pathname === '/more/planning/hoeveel') return { kind: 'settings', eyebrow: 'Planning', title: 'Hoeveel per soort' };
  if (pathname === '/more' || pathname.startsWith('/more/')) {
    const id = pathname.split('/')[2];
    return isSettingsPageId(id) ? { kind: 'settings', eyebrow: 'Instellingen', title: settingsPageTitle(id) } : { kind: 'settings', eyebrow: 'Meer', title: 'Instellingen' };
  }
  const page = PAGES.find((p) => pathname === p.path || (p.prefix && pathname.startsWith(`${p.path}/`)));
  return page ? { kind: 'page', eyebrow: page.eyebrow, title: page.title } : { kind: 'page', title: 'ASCEND' };
}
