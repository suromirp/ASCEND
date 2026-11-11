// ASCEND: instelling Lus zoeken (spoor 5 van de Briefing, docs/beslissingen/2026-11-11-briefing.md).
// Bij het openen van de briefing (het advies; alleen vandaag en morgen) of pas na een tik op Zoek een
// lus. Een oude back-up zonder de instelling, of een kapotte waarde: het advies. Een eigen klein bestand,
// zodat de samenvatting van de instellingen de Briefing niet hoeft te laden.

export type RouteSearchSetting = 'open' | 'tap';

export const resolveRouteSearch = (raw: unknown): RouteSearchSetting => (raw === 'tap' ? 'tap' : 'open');
