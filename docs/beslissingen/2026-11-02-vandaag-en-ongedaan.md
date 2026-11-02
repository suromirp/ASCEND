# Ongedaan maken alleen als het nog klopt, en de nieuwe regels op Vandaag in de rij

Datum: 2026-11-02
Status: aangenomen

## Besluit

Ongedaan maken in de melding (`ChangeNotice`) zet een wijziging alleen terug als elke training die ze raakte nog
precies is wat de wijziging schreef, wat ze weghaalde nog weg is, en niets ervan intussen gelogd werd. Dat geldt voor
alles wat via `undoPlanChangeNow` loopt: verplaatsen, overslaan, inhalen, Toch doen, Niet gedaan?, een voorstel met
Akkoord, de automatische weekplanning en de weekcontrole. Klopt het niet meer, dan verandert er niets, ook niet aan de
instelling, het doel of het programma erachter, en de melding zegt "Niet teruggezet" met "Ongedaan maken kan niet
meer. Kijk in je week wat er nu staat." Zoals bij Ruilen en Week opnieuw plannen.

Op Vandaag krijgen de etappe-regel en de vraag "Je deed padel. Hoe telt dit?" een vaste plek in dezelfde rij als de
andere kaarten rond de missie (`engine/todayCards.ts`): de etappe-regel na het advies (vandaag), de vraag over een sport
na Niet gedaan? (gisteren). Allebei komen ze nooit boven de missie. De tekstkaart controleert het maximum op elk
Vandaag-scherm.

Hoe het werkt:
- Direct na het schrijven leest de app de geraakte rijen terug (`storage/undoPlanChange.ts#snapshotWritten`) en bewaart
  die in de melding (`RecentPlanChange.written`, alleen in het geheugen). Zet de weekcontrole er binnen vijftien
  seconden iets bij recht, dan neemt de melding ook wat de controle schreef over (`engine/undoGuard.ts#mergeWritten`).
- `undoPlanChangeNow` kijkt en schrijft in één transactie over de trainingen, de logs, de instellingen, de doelen, het
  programma, het krachtblok en het wijzigingslog (`engine/undoGuard.ts#undoBlocked`). Een rij geldt als gelijk als alle
  velden gelijk zijn; een veld zonder waarde telt niet.
- Een log die de wijziging zelf koppelde (het koppelvoorstel) telt niet als gelogd: die koppeling gaat er met
  Ongedaan maken juist af. Koppeling en horlogecijfers gaan pas terug nadat de rijen terug zijn.
- Een melding van voor deze regel, zonder vastgelegde rijen, houdt alleen een log tegen.
- De rustige regels (`quiet` in `TODAY_CARD_RANK`) weten zelf of ze er zijn; Vandaag geeft ze altijd mee
  (`QUIET_TODAY_LINES`) en ze staan onder de missie op hun plek. Minder tijd vandaag zit in het menu van de missiekaart
  en neemt geen plek op de pagina in; de back-up, de ochtendkaart, Niet gedaan?, het koppelvoorstel en de rustdag terug
  stonden al in de rij.
- Elke kaart rond de missie staat in een omhulsel zonder eigen vak (`contents`, `data-today-card`, bij veiligheid
  `data-today-safety`), de missie in `data-today-mission` met het maximum. `kaart.mjs` telt de zichtbare kaarten voor de
  missie met dezelfde regel als `aboveMissionOverflow` en schrijft alleen bij te veel een regel; de invariant
  "Hoogstens het afgesproken aantal kaarten boven de missie" leest die. Een kaart die buiten de rij om boven de missie
  komt, telt ook.
- Niets op Vandaag wordt ingeklapt: wat onder de missie staat blijft open, dus ziek, pijn en waarschuwingen staan nooit
  achter een tik.

## Reden

Ongedaan maken zette blind terug wat er voor de wijziging stond. Verplaatste je een training, deed je hem en tikte je
daarna nog op Ongedaan maken, dan stond hij weer op de oude dag terwijl er een log naar verwees; verplaatste je hem
nog een keer, dan haalde de oude melding die tweede keuze stil weg. Ruilen en Week opnieuw plannen hadden die controle
al; nu heeft elke wijziging uit de melding hem.

De nieuwe regels van ronde 2 stonden ergens onder de missie, buiten de vaste volgorde, zodat niemand had nagelopen of
ze het maximum respecteren. In de rij hebben ze een plek en een test die elke combinatie van kaarten nagaat.

## Alternatieven

- Alleen de velden vergelijken die een verplaatsing raakt (dag, status, waar hij vandaan kwam, slot), zoals
  `undoSwap`: te smal voor een voorstel dat ook de lengte of het voorschrift verandert. Alle velden vergelijken is
  "precies wat de wijziging schreef".
- Zonder vastgelegde rijen alleen naar logs kijken: een training die je opnieuw verplaatste zou dan toch teruggaan.
- Wat onder de missie staat achter één regel "nog 3" zetten: zou ook een waarschuwing of een zorgtekst kunnen
  inklappen. Met hoogstens één kaart erboven staat de missie al in beeld; wat eronder staat mag gewoon open blijven.
- De etappe-regel boven de missie laten mogen op een tochtdag: de missiekaart zegt al welke etappe je loopt, de regel
  is een aanvulling.

## Bron

`docs/onderhoud/reflectie-2026-11-01.md` (ronde 2, "Klopt het geheel?"), `docs/backlog.md`,
`docs/beslissingen/2026-11-01-vandaag-volgorde.md`, `docs/beslissingen/2026-11-02-trainingen-wisselen.md`,
`docs/beslissingen/2026-11-02-week-opnieuw-plannen.md`.

## Vervangt

Niets. Vult `2026-11-01-vandaag-volgorde.md` aan.

## Terugdraaien

De controle: in `undoPlanChangeNow` de aanroep van `undoBlocked` weghalen (de melding valt dan terug op blind
terugzetten). De rij: `stagePosition` en `sportAsk` uit `TODAY_CARD_RANK` halen en de twee regels in `Today.tsx` weer
los onder de missie zetten.
