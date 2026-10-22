# Kracht per set bewaren, met een eigen oefeningenlijst

Datum: 2026-10-22
Status: aangenomen

## Besluit

ASCEND bewaart bij een krachttraining elke set apart in `SessionLog.strengthData`: de herhalingen, het gewicht, de herhalingen in reserve (RIR) en of het een opwarmset is of een werkset. Oefeningen komen uit een eigen lijst met spiergroepen en aliassen (`src/data/exercises.ts`). Het volume per spiergroep telt volgens regel KR-10. Alles wat sets telt, gaat via `engine/workSets.ts#isWorkSet`.

## Reden

Eén RIR per training en één duur zeggen weinig over de benen. Met de sets per oefening kan ASCEND het aantal harde sets per spiergroep tellen, en dat is voor de GR5 vooral bij de benen nuttig: een kuit of scheenbeenspier die structureel ontbreekt is een melding waard. Opwarmsets moeten bewaard kunnen blijven (ze horen bij wat je deed) zonder dat ze meetellen als werk, anders klopt elk volume en elk topgewicht niet meer.

Gekozen regels:

- Opwarmsets en RIR staan per set in `SetLog` (`kind`, `rir`). Een set zonder `kind` is een werkset, zodat elke oude log blijft lezen zoals hij altijd las.
- De eigen oefeningenlijst heeft een vaste id per oefening, een Nederlandse naam, aliassen (Engelse namen en de schrijfwijze van MacroFactor), primaire en secundaire spiergroepen, het gereedschap en een bewegingspatroon. Een alias met een ander gereedschap dan de oefening zelf hoort er niet in: een naam die we niet zeker weten krijgt geen oefening, want een verkeerde koppeling vervuilt het volume. Kniestrekken en kniebuigen op de machine hebben een eigen patroon (`isolation_leg`), triceps en biceps tellen bij de samengestelde oefeningen als secundair.
- Tellen volgens KR-10: een werkset telt als er hooguit 4 herhalingen over waren (een onbekende RIR telt mee), de primaire spier krijgt 1 voor de set, een secundaire een halve. De week loopt van maandag tot zondag, op de dag van de training.
- Geen schemaverhoging: alle nieuwe velden zijn optioneel en komen erbij, niets verandert van vorm. Een oude back-up importeert zoals voorheen, en een nieuwe back-up opent in een oudere versie zonder dat er iets stukgaat (de velden worden dan genegeerd).
- Alles wat sets telt gaat via `isWorkSet`: volume, topgewichten, setaantallen en wat daarop voortbouwt. Een nieuwe teller die zelf naar `kind` kijkt, zet opwarmsets op den duur toch weer in de som.

## Alternatieven

Alleen een totaal per training bewaren: te grof voor volume per spiergroep. De lijst van een andere app of database overnemen: de namen en de indeling zijn dan niet van ons, en de benen, scheenbeenspieren en heupabductoren die de bergen vragen zitten er niet in. Een schemaverhoging met een migratiestap: niet nodig omdat niets bestaands verandert, en een stap die niets omzet is alleen extra risico bij het importeren.

## Bron

`docs/onderzoek/Kracht loggen en progressie.md`, regel KR-10 (Pelland) en hoofdstuk 7. Code: `src/data/exercises.ts`, `src/engine/exerciseMatch.ts`, `src/engine/muscleVolume.ts`, `src/engine/workSets.ts`.

## Vervangt

Niets.

## Terugdraaien

Het volume per spiergroep staat nergens in de interface als doel, dus het kan zonder gevolgen uit de berekening blijven. De bewaarde sets blijven staan; zonder de lijst zijn het gewoon gelogde sets. Een foute alias haal je weg uit `src/data/exercises.ts`.
