# Overdracht coördinator ASCEND

Bijgewerkt: 12 november 2026, rond 10:40 UTC, door de coördinator van 12 november (session_01LnDpSkUxMFtEBmNMxMAKcN). Vroege wissel omdat de chat lang werd (ruim 500k context). Oudere overdrachten staan in de git-geschiedenis van dit bestand.

## Opdracht van de eigenaar

- 11 november: "werk de backlog af"; 12 november: "Je mag nu ook gewoon starten".
- 12 november: voor alles wat we verbeteren een mooiere UI en makkelijkere UX, minimaal en vernieuwend; de coördinator kiest het scherm en legt elke keuze vast in een besluit. Hoogstens drie bouwers tegelijk, nooit twee aan dezelfde bestanden.
- 12 november ochtend: "Wat vannacht gebeurd is mag niet nog een keer" (limiet van vijf uur, daarna alles stil). Daarvoor de Wachter en de regel Limiet van vijf uur in de skill werkverdeling.

## Stand

- Live op 12 november (allemaal met Lookout, Pathfinder en waar nodig Warden, en eigen blik op de afdrukken): Andere plek (1af978e), Stand minimaal (26c0816) en Stand opgeschoond (39baf86), Je week tot nu (ab5294d), Trainingsscherm sporen 1 tot 4 (86be2a9), Weekplan natellen (53ca8c0), Hoe ging het? spoor 5 (c92df03). Pushmelding gestuurd tot en met het Trainingsscherm.
- Eerste taak: deploy van c92df03 nakijken en één pushmelding: "ASCEND: Stand opgeschoond en Hoe ging het? na je loop zijn live. App twee keer openen."
- Lopende bouwers (gestart 12 november 10:29 UTC door de coördinator session_01LnDpSm59PuKBYsAhFgUjTr):
  - Week: Wat ASCEND aanpaste staat op main (2eaa81d), sessie gearchiveerd. Frisheid-uitleg (haarlijn) op main (76b1e25).
  - Sherpa Hoogtemeters stap 1 (Fable), session_01LnDpSmaTkuQYwMVjdeQMHr, branch claude/hoogtemeters-stap-1. Na zijn melding: naspelen met de back-up van de eigenaar (zes lopen, Garmin 132 m) als die er is, anders vragen.
  - Sherpa Route-blok (Opus), session_01LnDpSiduYPqLcJUoFTtued, branch claude/route-blok: afdruk van de eigenaar 12 november ("niet mooi"; Thuis-chip weg, thuisplek blijft bewaard en staat bovenaan in Andere plek).
  - Dubbel log staat op main (ec1f56e), sessie gearchiveerd.
  - Sherpa Missiekaart (Opus), session_01LnDpSmWfoTTVaYr1A2wnvY, branch claude/missiekaart: eigen besluit, ook de kaarten boven Je dag.
  - Na Sherpa Route-blok: Briefing volgt de gekozen manier (Inbox, afdruk StairMaster, Opus).
  - Daarna: Week minimaal sporen 2 tot 4 en 6 met de dode code (weekChanges, adjustedSessionReasons, changesSub, review.changes) en weekHeading samenvoegen.
- Wachter: trig_01SkSM9teBGkQ14rUvfN3Esy op session_01LnDpSm59PuKBYsAhFgUjTr. De oude trig_01RfcpL1mKyjAquMVbctRoGN staat uit (wissen werd geweigerd door de rechtencontrole). Bij de wissel: deze uitzetten of wissen en een nieuwe op je eigen sessie.
- Back-up van de eigenaar (12 november 02:11) stond in de scratchpad van de vorige coördinator, niet bereikbaar. Vraag een nieuwe als je moet naspelen.

## Volgende bouwers (in deze volgorde, hoogstens drie tegelijk)

1. Week minimaal (`2026-11-12-week-minimaal.md`): kan nu. Eerst een changeLog.test.ts ("toegevoegd" bij een opnieuw neergelegde training is fout). Neem mee uit de backlog: de kop van Week met de fase voorop ("Basisfase, week 1 van 4", nu nog "Week 1 van 4, basisfase"), de rij Wat ASCEND aanpaste uit Je week tot nu verhuist hierheen, de ring. Opus, of Fable voor de changeLog-regel.
2. Dubbel log (Fable, opslag): logSession kan false geven nadat het log al geschreven is, waardoor een losse training een tweede log kan krijgen (backlog, Samenhang, Hoe ging het? spoor 6). Eigen klein spoor met besluit en tests.
3. Missiekaart op Vandaag (backlog, Samenhang): de kaart herhaalt zone, praattest en tempo die nu in de Briefing staan en heeft meer mint dan de hoofdknop; spoor 10 van de ontwerpregels, eigen besluit. Ook de kaarten boven Je dag (regel 6).
4. Trainingsscherm spoor 6 (WatchAskCard als rij in Je dag, één vorm met Hoe ging het?), pas na de toets bij vraag 2 (wat doet de belasting met een log zonder zwaarte). Pathfinder-advies in de backlog: StepOne met een modus nieuw of horloge.
5. Daarna Ascend en Logboek in dezelfde lijn (nog geen ontwerp; eerst Cartographer), met `docs/onderhoud/2026-11-12-pathfinder-verborgen-schermen.md`.

## Inbox (docs/backlog.md) voor het bouwmoment van vrijdag

- Verborgen schermen (Kennisbank belooft een les per week; tochtschermen zonder trekdoel), Hoogtemeters met precisie, Kleding en wind, Back-up kleiner, Efficiëntie-blad, avontuurlijke plekken. Plus de punten onder Samenhang die vandaag bijkwamen.

## Werkwijze, geleerd

- Leg de datum van een fout naast de datum van eerdere herstellingen voor je een bouwer start (de lus in het weekplan was al op 11 november hersteld; een bouwer op Fable zocht er anderhalf uur naar).
- Een vangnet dat iets tegenhoudt op grond van het logboek houdt ook een terechte training stil tegen; liever niet.
- Spreid helpers: Lookout pas starten als de vorige klaar is; kijk rate_limit_info in get_session.

- Bouwers maken afdrukken in hun eigen sessie; laat Lookout ze in je eigen scratchpad maken en bekijk ze zelf. Vannacht vond die eigen blik telkens nog iets (tooltip uit de kaart, chip uit beeld, regel na Akkoord).
- Naspelen kan in een worktree van de bouwerbranch met de probe van de skill naspelen; roep dan de engine-functie zelf aan (bijvoorbeeld fullWeekAdvice) en verwijder de probe meteen.
- Bij een squash van een bouwerbranch: conflict in het kostenlogboek oplossen door beide kanten te houden; een besluit dat al via de werkbranch op main kwam, de versie van main nemen.

## Sessies en tijden

- Vorige coördinatoren: session_01LnDpSkUxMFtEBmNMxMAKcN (12 november, tot 10:40 UTC), session_01LnDpSnA7KzoLikwifh3nyR (11 op 12 november), session_01LnDpSkFKoLuAUnLCXKbA1G, session_01LnDpSj5xhvz93hRnJrHyF8.
- Bouwmoment ma, wo, vr 19:43 (trig_01JDroCyzgfatU8c7MiK26Ei). Vrijdag 13 november: de Inbox.
- Volgende wissel: plan je zelf met send_later op 04:47 [Europe/Amsterdam] morgen.
