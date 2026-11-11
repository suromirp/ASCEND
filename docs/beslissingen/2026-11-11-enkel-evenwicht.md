# Enkel en evenwicht binnen Spieren voor de berg

Datum: 2026-11-11
Status: aangenomen

## Besluit

Spieren voor de berg krijgt een vierde rij: enkel en evenwicht. Bij een bergdoel telt ASCEND de werksets op één been (oefeningen met het patroon `balance`) over vier weken. Zijn het er gemiddeld minder dan 2 per week, dan staat er in de weekterugblik, en bovenaan de training waar hij bij zou komen, dezelfde rustige melding als bij de spieren, met een voorstel om Single Leg Stance toe te voegen. Pas na Akkoord verandert er iets, via de bestaande toevoegingen (`StrengthSettings.addedExercises`). Er komt geen nieuwe rij in Forge, geen nieuwe planningregel en geen eigen plek in de week: de oefening komt, net als bij de spieren, in de krachttraining met het meeste beenwerk.

De eigenaar koos dit op 11 november uit de kansen van Scout Kansen.

## De oefeningen

Vier nieuwe oefeningen, elk met uitleg in twee lagen (`src/data/exerciseGuides.ts`), samen één familie `balance` die alleen onderling ruilt (`FAMILY_ONLY`):

- Single Leg Stance: op één been staan met ogen open, een houding in seconden. De start, omdat hij zonder materiaal kan en voor iedereen veilig te beginnen is.
- Single Leg Stance Eyes Closed: hetzelfde met ogen dicht. Zonder je ogen moet de enkel het meeste bijsturen; dat is de gangbare tweede stap in de programma's uit de reviews.
- Single Leg Stance on Cushion: op een kussen of opgevouwen matje, een onstabiele ondergrond. De derde stap, die lijkt op los grind of modder.
- Star Excursion Reach: op één been reiken naar voren, opzij en achter, in rondjes per been. Een bewegende vorm voor wie stilstaan te makkelijk vindt.

Zwaarder en lichter gaan via de uitleg (ogen open, dicht, kussen; reiken terug naar staan), zoals bij elke oefening. Ik heb geen nieuwe ladder in `skillLadders.ts` gemaakt: een ladder hoort bij calisthenics met een eigen toets en tekening, en meer dan drie ladders passen niet in een Segmented.

Hielheffen op één been, ook excentrisch, stond als voorbeeld in de opdracht. Die bestaat al (`single-leg-calf-raise`, met twee tellen omlaag in de uitleg) en hoort bij de rij kuiten. Ik heb hem niet in deze rij gezet: dan zou kuitwerk ook als evenwicht tellen en zou een tekort aan een van beide stil verdwijnen. Kleine sprongetjes met een stille landing (genoemd door Scout) heb ik weggelaten: meer kans op een val zonder iemand erbij, en het past niet in een houding of rustige herhaling.

## Keuzes en waarom

- Progressie volgt de bestaande regels van Forge. Een houding is `measure: 'hold'`: Forge plant seconden, zonder RIR en zonder gewicht, en neemt je beste tijd van de vorige keer over (`forgeLadder.ts#ladderRows`). Reiken is gewoon herhalingen. Er is geen eigen rekenregel.
- Werksets, geen harde sets. Een houding heeft geen RIR en is geen spierprikkel; evenwicht telt daarom niet in `muscleVolume.ts` (anders zou op één been staan een tekort aan kuitwerk verbergen) maar apart, als werkset (`isWorkSet`).
- De ondergrens is 2 werksets per week, gemiddeld over vier weken (eigen keuze, onzeker). De studies trainden twee tot drie keer per week een paar minuten; de toevoeging zelf is 3 sets per been in één training, dus wie hem doet blijft erboven.
- Volgorde: eerst de spieren, dan evenwicht. Er staat hoogstens één voorstel tegelijk, zoals nu; de bestaande teksten en tests voor de spieren veranderen niet.
- Een week met vakantie (`no_training`), een tocht (`trek`) of zonder sportschool (`no_gym`) telt niet mee, net als een rustweek. Dan train je niet in Forge, en anders stond er na elke vakantie meteen een melding. Vrije dagen tellen wel. De spieren laten zo'n week nu nog wel meetellen; dat heb ik niet veranderd (zie vragen).
- Een open pijnklacht aan een enkel of voet in Lichaam (geen spierpijn of stijf, niet opgelost): geen voorstel voor evenwicht. Ik koos "geen" boven een veilige vorm. Evenwichtstraining is wel revalidatie na een verzwikking, maar dan met een fysiotherapeut die de stap kiest; met ogen dicht of op een kussen staan op een pijnlijke enkel, alleen thuis, geeft kans op een nieuwe val. De spieren blijven gewoon hun voorstel krijgen. Een oefening die je al toevoegde blijft staan: Forge haalt nooit zelf iets weg; de zorgzin onder de uitleg zegt al wat je doet bij pijn.
- Liever niet geldt per rij: na Liever niet bij evenwicht blijft het acht weken stil, los van de spieren (`utils/muscleDeclines.ts` accepteert nu ook `balance`).
- Ruilen geeft geen reden "Ook voor je kuiten" bij een evenwichtsoefening, en een spier krijgt nooit een evenwichtsoefening als voorstel.

## Instelling

Enkel en evenwicht is een echte keuze naast de spieren (wie bij een fysiotherapeut al evenwicht traint, wil dit niet dubbel), dus er is een schakelaar `mountainBalance`, standaard aan. Forge Geavanceerd zit op zes rijen; daarom is de rij Spieren voor de berg nu een blad met twee schakelaars: Spieren voor de berg (`forge-bergspieren-aan`, het oude `mountainMuscles`) en Enkel en evenwicht (`forge-enkel`, alleen zichtbaar als de eerste aan staat). De rij zelf toont Aan of Uit met "Met enkel en evenwicht" eronder. Ook in `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts`, `settingsDiff.ts` en `settingsHelp.ts`.

## Oude back-ups

`mountainBalance` is optioneel en wordt defensief gelezen (`strengthSettings.ts`): ontbreekt het of is het geen boolean, dan geldt het advies, aan. Er is geen nieuwe vorm in de logs: een houding staat er al als `seconds` met `reps: 1`. Geen migratie nodig.

## Alternatieven

- Een zevende rij in Forge of een eigen kaart: Forge zit op het maximum.
- Evenwicht als spier tellen (harde sets op `calves`): verbergt een echt tekort aan kuitwerk.
- Een eigen planningregel (twee keer per week een blokje van vijf minuten): dat is een nieuwe regel in de scheduler; niet gedaan.
- Een veilige vorm bij een enkelklacht (alleen ogen open, met steun): klinkt zorgzaam, maar ASCEND kan de ernst niet beoordelen. Geen voorstel is eerlijker.

## Bron

- `docs/onderzoek/Kansen 11 november training.md`, punt 2: evenwichts- en proprioceptietraining verlaagde enkelverzwikkingen met ongeveer een derde (Schiftan e.a. 2015, relatief risico 0,65, zeven gerandomiseerde studies, 3.726 sporters; waarschijnlijk), het duidelijkst bij wie al eens verzwikte; een latere review vond hetzelfde (Clin Rehabil 2023, relatief risico 0,59; waarschijnlijk). Bij bergwandelaars die vielen was de enkel met ongeveer 40 procent de vaakst getroffen plek (Faulhaber e.a. 2020; waarschijnlijk). Dat het bij trektochten met rugzak net zo werkt is niet getoetst (onzeker).
- `docs/onderzoek/notities/Aanvullend onderzoek GR5 voorbereiding/afdalen_kracht.md`: afdalen verstoort het evenwicht, ook zonder meetbaar krachtverlies (klein labonderzoek; onzeker).
- Het bestaande besluit `2026-11-02-spierindex-klein.md` en `2026-11-02-forge-herinrichting.md` (de melding, Akkoord, Liever niet).

## Vervangt

Niets. Het breidt Spieren voor de berg uit.

## Terugdraaien

`mountainBalance` standaard uit zetten (`strengthSettings.ts#resolveStrengthSettings`) of `input.balance` negeren in `mountainMuscleProposal`. Een toegevoegde oefening haal je weg in het blad van de oefening. De vier oefeningen kunnen blijven staan: een log dat ernaar verwijst moet leesbaar blijven.


## Na de review (coördinator, 11 november)

- Het onderzoek (`Kansen 11 november training.md`) zei dat er al evenwichtsoefeningen in de catalogus stonden; dat klopte niet, ze zijn hier nieuw.
- Een klacht telt als enkel- of voetklacht alleen als het hele woord enkel of voet in de plek staat (een voetbalknie niet).
