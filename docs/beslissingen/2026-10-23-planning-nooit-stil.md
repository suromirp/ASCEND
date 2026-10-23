# Doel en planningsinstellingen veranderen de planning nooit stil

Datum: 2026-10-23
Status: aangenomen

## Besluit

Een andere doeldatum, een gearchiveerd doel, een nieuw doel uit de wizard en de
instellingen die de planningsronde zelf lezen (De lange zondag, de lengte van de
fases, Ambitie, Rust na een bergtocht, een sport aan of uit) worden pas bewaard
na Akkoord. ASCEND rekent eerst de planningsronde in het geheugen uit en laat in
het voorstelblad zien wat verschuift, een andere training wordt, vervalt of
erbij komt, en wat je zelf vastzette en blijft staan. Na Akkoord draait dezelfde
ronde echt, zodat je krijgt wat je zag, met ongedaan maken. Liever niet laat de
instelling of het doel en de planning zoals ze waren.

Daarbij:

- De planningssync haalt na de dag van het hoofddoel alleen weg wat het systeem
  plande (lockLevel 3). Wat je zelf vastzette (level 1) blijft altijd staan; het
  voorstel noemt het. Een test of wedstrijd (level 2) gaat alleen mee als een
  voorstel het laat zien.
- `templateForPhase` zet alleen een training van het systeem om (lange duurloop
  naar bergtocht en terug). Vastgezet is nooit omzetten.
- Wat de sync zelf in een opgeslagen training verandert (omzetten of laten
  vervallen), staat in de melding Planning bijgewerkt, met ongedaan maken. Na
  een aangenomen voorstel vindt de sync normaal niets meer te doen; dit is voor
  oudere gegevens of een teruggezette back-up.
- Het datumveld van het doel bewaart niet per toetsaanslag. Eerst Datum
  opslaan, en een ongeldige datum, een datum in het verleden of meer dan vijf
  jaar vooruit wordt geweigerd (`engine/goalDate.ts`). Archiveren vraagt eerst
  bevestiging.
- Is de planning veranderd tussen het voorstel en Akkoord, dan gebeurt er
  niets en zegt de app dat je het opnieuw moet kiezen.
- Een verplaatsing door het systeem zelf (de weekprescriptie, een krachtblok)
  houdt de status `planned` met `movedFromDate`. Alleen je eigen verplaatsing
  of een aangenomen voorstel (met slot) geeft `moved` en maakt de training van
  jou. Een opstartstap (`releaseSystemMoves`) geeft oude rijen terug aan het
  systeem als het wijzigingslog aanwijst dat het systeem ze verplaatste; bij
  twijfel blijven ze van jou. Historie verandert niet: alleen open trainingen.

De regels van zo'n voorstel zetten geen slot (`restore`, ook op `add` en
`remove`): het blijft de planning van het systeem, net als bij een andere
rustdag. Een `move` kan nu ook een andere training op die dag geven
(`PlanChangeItem.templateId`). Beide velden zijn optioneel en komen er alleen
bij; een oude back-up importeert zoals altijd, dus er is geen migratiestap in
`storage/migrations.ts` nodig. De status van een planningsrij verandert niet
van vorm.

## Reden

Warden Logica vond dat een tussenstand van het jaar tijdens het typen alle 284
open trainingen wegveegde, ook wat de gebruiker had vastgezet, zonder melding.
De lange zondag op Duurloop zette alle bergtochten om, ook de vastgezette. En
Liever niet bij een sport bewaarde de instelling toch, zodat de volgende ronde
de planning alsnog omzette. Alles wat de planning inhoudelijk verandert, gaat
via een voorstel met Akkoord.

## Alternatieven

- De voorstelregels zelf toepassen in plaats van de ronde opnieuw te draaien.
  Afgewezen: de racebloklogica en de weekcontrole zetten markeringen die een
  regel niet meedraagt, waardoor de ronde erna alsnog iets zou veranderen.
- Bij Liever niet de instelling toch bewaren en de bestaande weken bevriezen.
  Afgewezen: bevriezen zou honderden trainingen een slot geven, en dan kan de
  weekcontrole ze nooit meer rechtzetten.
- De datum bij verlaten van het veld bewaren. Afgewezen: ook dan blijft een
  verkeerde datum mogelijk; een knop met een controle en daarna het voorstel is
  duidelijker.

## Bron

`docs/onderzoek/Planning op een lijn.md`, het rapport van Warden Logica (punten
1, 2 en 4) en de werkafspraak dat alles wat de planning inhoudelijk verandert
via een voorstel met Akkoord gaat.

## Vervangt

Niets. Vult `2026-10-22-terugzetten-zonder-slot.md` aan: ook de regels van een
doel- of instellingsvoorstel geven geen slot.

## Terugdraaien

De instellingen weer via `updateSettings` laten lopen en `updateGoal` de datum
laten zetten; `syncProgramHorizon` zonder het lockLevel-filter. Dat brengt de
stille wijzigingen terug, dus alleen samen met een ander voorstelpad.
