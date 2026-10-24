# Rustweek en herhaalde week via een voorstel, en alleen wat nog open is

Datum: 2026-10-24
Status: aangenomen

## Besluit

Doortrainen, Rustweek terugzetten, Deze week nog een keer en Herhaling
terugzetten veranderen de planning niet meer stil. Ze gaan via hetzelfde
voorstel met Akkoord als de andere planningsinstellingen
(`storage/weekLoadPlan.ts` maakt de invoer, `storage/horizonPlan.ts` rekent de
planningsronde uit). Het voorstelblad noemt per training wat er verandert
("Lange duurloop op zo 25 oktober: 45 naar 60 minuten"). Liever niet bewaart
niets. Akkoord geeft de melding met ongedaan maken, en ongedaan maken zet ook
het programma terug (`RecentPlanChange.programBefore`). Op de adviezen
"Rustweek overslaan?" en "Deze week nog een keer?" heet de knop nu Bekijk: die
opent hetzelfde voorstel, en pas na Akkoord daarin telt het advies als
beantwoord.

Zo'n wijziging raakt alleen trainingen die nog open zijn
(`engine/weekLoadChange.ts`):

- Een gedane of voorbije training verandert nooit. De wijziging gaat in op
  vandaag, of op de dag na de laatste training van die week die je deed. De
  dagen ervoor houdt het programma vast zoals ze stonden
  (`Program.heldWeekDays`, gelezen door `utils/dates.ts#resolveProgramWeek`).
- Wat je zelf vastzette (een slot) houdt zijn lengte. Het krijgt die als vaste
  lengte (`PlannedSession.plannedMinutes`), en het voorstel noemt het.
- Midden in de week mag het, zolang er nog iets open is dat verandert. Onder de
  knop staat dan "Maakt de N trainingen die nog komen deze week lichter" (of
  zwaarder). Een herhaling schuift ook de week erna in dezelfde golf; dan staat
  er "deze week en volgende week".
- Is er niets meer open dat zou veranderen, dan verdwijnt de knop en staat er
  één zin: "Deze week is al zo goed als klaar; de volgende rustweek komt over N
  weken."

`Program.heldWeekDays` is een optioneel veld dat erbij komt, net als
`skippedRestWeeks` en `repeatedWeeks`. Een oude back-up zonder het veld
importeert zoals altijd, dus er is geen migratiestap nodig. Het nieuwe
wijzigingstype `week_load_changed` komt er ook alleen bij.

## Reden

De eigenaar zag op zaterdag in een overgeslagen rustweek de knop Rustweek
terugzetten staan en vroeg: "dat moet niet kunnen toch?". De knoppen schreven
het programma direct. Omdat de belasting van een week uit de plek in het
programma volgt, veranderde zo de lengte van de resterende trainingen zonder
voorstel, en lazen ook de gedane dagen van die week anders. Dat botst met
`2026-10-23-planning-nooit-stil.md`.

## Alternatieven

- De knop alleen tonen voor de week begint. Afgewezen: met zware benen
  halverwege een overgeslagen rustweek is de rest lichter maken juist zinnig.
- De lengte van elke gedane of voorbije training vastleggen op de training
  zelf. Afgewezen: dat schrijft in de historie, en hoogtemeters en rugzak
  zouden toch nog meeveranderen. Vasthouden op het programma raakt geen
  historie en houdt alles van die dagen gelijk.
- Vastgezette trainingen gewoon laten meeveranderen, zoals bij Ambitie.
  Afgewezen voor deze knoppen: de opdracht van de eigenaar is dat alleen open
  trainingen veranderen, en een slot betekent dat de automatische planning de
  training niet inkort of verlengt.

## Bron

De vraag van de eigenaar met een schermafdruk van Week, en de werkafspraak dat
alles wat de planning inhoudelijk verandert via een voorstel met Akkoord gaat.

## Vervangt

Niets. Vult `2026-10-23-planning-nooit-stil.md` aan.

## Terugdraaien

`planWeekLoadChange` weer vervangen door een directe `ProgramsRepo.put` met
`withRestWeekSkipped` of `withWeekRepeated`, en `heldWeekDays` laten liggen
(zonder het veld leest elke week zoals voorheen). Dat brengt de stille
wijziging terug, dus alleen samen met een ander voorstelpad.
