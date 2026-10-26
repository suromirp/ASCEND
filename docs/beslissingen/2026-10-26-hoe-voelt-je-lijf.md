# Hoe voelt je lijf? in plaats van de wekelijkse klachtenvraag

Datum: 2026-10-26
Status: aangenomen

## Besluit

De wekelijkse vraag naar klachten in het blad van de weekterugblik (vier chips, een plekkeuze en een ernststrook) is vervangen door een kleine kaart op Vandaag, "Hoe voelt je lijf?". De kaart komt alleen als er reden is, toont het kleine figuur met de plekken die deze week het hardst werkten, en heeft één knop, "Voel me fris". Een plek aantikken opent een blad waarin je kiest wat je merkt (spierpijn, stijf of pijn), bij pijn hoe erg, en welke kant, en daarna wat kan helpen. Wat je meldt komt in dezelfde lijst klachten als op Lichaam.

## Reden

De oude vraag werd elke week gesteld, noemde alleen benen, voeten en rug, en vroeg of je minder had getraind, wat de meeste weken een tik op "nee" was. Een kaart die er alleen staat als er reden toe is, past bij de eis dat elk scherm binnen twee seconden zegt wat je missie is. Spierpijn, stijfheid en pijn zijn drie verschillende dingen met drie verschillende reacties (docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md): spierpijn blokkeert nooit, pijn kan de opbouw tegenhouden. Het figuur van Lichaam bestond al, en het vroeg al om één plek voor rekken en klachten.

Wanneer de kaart komt (instelling "Hoe voelt je lijf?", standaard "Alleen als er reden is"):

- Een open pijnmelding, of pijn die een training deze week gaf (engine/pain.ts, significantPain).
- Een zware week: de hoogste beenindex van de week is minstens 12 en ligt minstens een kwart boven de eigen mediaan van de vier weken ervoor, of een plekgroep haalt in de belasting het hoogste niveau.
- De tweede ochtend na een tocht of wedstrijd, vijf dagen lang, omdat spierpijn 48 tot 72 uur na afdalen piekt.
- Hoogstens een keer per week. Een antwoord (Voel me fris of een melding) sluit die week, ook als er daarna een tweede reden komt. "Niet nu" laat de kaart de volgende dag terugkomen. De week loopt van maandag tot en met de maandag erna, zoals de weekterugblik.
- "Elke week" toont de kaart ook zonder reden op de dag van de weekterugblik, "Uit" toont hem nooit. Klachten melden kan altijd op Lichaam, en de pijnvraag in de ochtendcheck en de hint INJURY-LEGS blijven werken, ook bij Uit.

Alle drempels (800, 1200 en 1800 m dalen, 1200, 2000 en 3000 m klimmen, 25, 45 en 70 kilo-uur rugzak, een hardloopweek van minstens 15 km en 1,3 keer je eigen gemiddelde, een zware week vanaf beenindex 12 en een kwart boven de mediaan) zijn afgeleid en niet gemeten aan echte data. Ze staan als constanten bovenaan engine/bodyCheck.ts met tests eromheen en kunnen met de eigenaar worden afgesteld. Krachttraining telt niet mee voor de plekken op de kaart.

Wat er wordt opgeslagen:

- Een melding is een `InjuryNote` in dezelfde lijst als Lichaam, met twee optionele velden: `kind` (spierpijn, stijf of pijn; zonder is het pijn) en `side` (links, midden, rechts of beide). De kant staat ook in de naam ("Onderrug rechts"), zodat `spotsForInjury` en de hint INJURY-LEGS hem blijven herkennen. Een melding aan een plek langs de ruggengraat (nek, bovenrug, onderrug) zonder kant leest als midden.
- Spierpijn en stijf tellen niet voor INJURY-LEGS en sluiten na 7 dagen vanzelf. Dat is afgeleid bij het lezen (`engine/injuryKind.ts`), nooit geschreven. Pijn werkt zoals altijd: open tot je hem oplost.
- `weeklyHealthChecks` blijft bestaan, alleen als markering dat een week is afgehandeld: Voel me fris en een melding van spierpijn of stijf geven `trouble: 'geen'`, een pijnmelding geeft `wel_gewoon` met de plek en de ernst, zodat de coachregel van de weekterugblik (engine/weekReview.ts) blijft werken, en "Niet nu" zet `laterOn`. Oude antwoorden blijven leesbaar.
- De instelling is `AppSettings.bodyCheck` (`reden`, `elke-week`, `uit`), optioneel en defensief gelezen.
- "Wat terugkomt" op Lichaam wordt afgeleid uit de meldingen, de pijn van trainingen en de oude weekantwoorden en nooit opgeslagen.
- Migratie: alleen optionele velden erbij, dus het schemanummer van de back-up verandert niet. `storage/migrations.ts` krijgt `migrateInjuryNote` en `migrateWeeklyHealthCheck`, die een beschadigde waarde weglaten. Een oudere versie van de app die een nieuwe back-up leest ziet spierpijn en stijf als gewone pijn.

Melden verandert de planning niet. De kaart zegt dat ("Je planning verandert niet."). Zodra een melding de planning gaat aanpassen, gaat dat via een voorstel met Akkoord.

## Alternatieven

- De vraag houden in het blad van de weekterugblik en alleen korter maken. Niet gekozen: het figuur en een tweede blad passen niet netjes in een blad, en de vraag hoort bij de dag zelf.
- Spierpijn en stijf laten meetellen voor INJURY-LEGS. Niet gekozen: het onderzoek zegt dat spierpijn nooit blokkeert, en een hint "Blessure: bovenbenen" na een gewone bergweek zou fout zijn.
- Een tikvak per plek op het kleine figuur. Niet gekozen: op dit formaat liggen de plekken te dicht op elkaar voor 44 px, dus de rijen ernaast zijn de tikdoelen.
- Krachttraining meetellen voor de plekken. Niet nu: dat vraagt een tabel van spiergroep naar plek en een eigen drempel, en de eerste versie leunt op dalen, klimmen, rugzak en hardlopen.

## Bron

Het ontwerp (versie 2) van Cartographer Lichaam, de eigenaar, en docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md (Munich consensus 2013, Hotfiel e.a. 2018, Cheung e.a. 2003).

## Vervangt

De wekelijkse klachtenvraag (WeeklyHealthQuestion) uit het blad van de weekterugblik. Het besluit docs/beslissingen/2026-10-24-lichaam-als-figuur.md blijft staan; dit bouwt erop voort.

## Terugdraaien

Zet de instelling op Uit: de kaart verdwijnt en alles blijft zoals het was, ook de meldingen op Lichaam. Voor de code: de kaart (components/BodyCheckCard.tsx) en het blad (components/lichaam/BodyCheckSheet.tsx) staan los van de rest, en de optionele velden `kind`, `side` en `laterOn` mogen blijven staan zonder gevolgen.
