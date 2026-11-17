# Drempel uit je tests: eerlijk en rustig

Datum: 2026-11-17
Status: aangenomen

## Besluit

De drempelhartslag uit een testloop is 98 procent (Voorzichtig, advies; Zoals Friel 100 procent als keuze) van je gemiddelde hartslag over de laatste 20 minuten van het teststuk uit de reeks van het horloge; zonder reeks kilometer 2 tot en met 5 zoals het was, en dat staat erbij. Een test telt alleen voor je drempel bij een inspanning van 24:00 tot en met 40:00 minuten, zonder gat in de hartslag (langer dan 30 seconden, of minder dan 90 procent gedekt), en met je borstband tijdens het teststuk (de balans van grondcontact dekt 90 procent). Je drempel volgt het midden van je laatste drie geldige tests binnen 12 maanden (bij twee het gemiddelde, bij één die ene), ook uit bestaande testlopen, en alleen via het bestaande voorstel met Akkoord bij 3 slagen verschil of meer.

Erbij: de RR-reeks (`hrv` van intervals.icu) wordt bewaard bij de reeksen van een loop, append-only, zonder berekening. "Klaar voor je test" leest uit je laatste loop met een reeks of je band er was, of je horloge elke seconde opsloeg en of de RR-reeks binnenkwam: drie regels onder Koppelingen, en op een testdag één regel in de Briefing als je band of de opslag mist.

## Reden

Eén test schommelt 3 tot 4 slagen; met de oude grens gaf vier tot vijf op de tien tests een loos voorstel, dat alle workouts opnieuw naar het horloge stuurt. Drie tests samen brengen dat terug naar ongeveer 7 procent. Aan de pols zit een horloge er bij hard lopen 5 tot 15 slagen naast, de hele marge van een test. De eigenaar besloot 17 november: factor 98 procent ("beter te langzaam dan te snel"), het midden van de laatste drie, met terugwerkende kracht via Akkoord, en zonder borstband telt een test niet voor de drempel, met één vraag "Had je hem om?".

Hoe het werkt:
- Engine: `engine/thresholdEstimate.ts` (`lthrFromEffort`, `combinedLthr`, `strapExpected`, de zinnen; grenzen in `THRESHOLD_RULES`). `engine/zoneUpdate.ts#zoneOffer` leest dit; `zoneNotice` geeft de ene zin bij een test die niet telt.
- Een antwoord op het voorstel geldt voor de test en het getal: hetzelfde getal vraagt niets meer, een ander getal voor dezelfde test (een andere stand van "Drempel uit je test", of oudere tests die nu meetellen) geeft hoogstens een nieuw voorstel. Zo komt het midden van bestaande tests met terugwerkende kracht, nooit stil.
- "Ik had hem wel om" staat per test in `settings.strapWorn` (een lijst naast de logs, hoogstens 60). De tekstknop staat er alleen als je band bij de meeste van je laatste lopen gezien is (6 van de laatste 10; bij minder lopen de meerderheid met minstens 3).
- Instellingen in het blad Testloop: "Drempel uit je test", "Test zonder borstband" (Telt niet voor je drempel, advies; Telt met ruime marge: 10 slagen marge en pas een uitkomst als twee tests binnen 5 slagen liggen) en "Melden op een testdag" (de regel in de Briefing).
- Niets nieuws bewaard voor de drempel: elke keer opnieuw uit de logs en de bewaarde reeksen (`storage/testStreams.ts`, alleen lezen, met tijdgrens).
- De RR-reeks: 2 bytes per slag (`ActivityStreams.rrMs`), in de back-up als base64. Een test van een halfuur op 170 slagen per minuut: 10,2 KB in de opslag, ongeveer 13,6 KB in de back-up, naast ongeveer 120 KB per uur voor de andere reeksen. Een oude back-up zonder `rrMs` leest gewoon; een beschadigde valt alleen zelf weg. Het schemanummer blijft (optioneel en additief).
- Horloge: een andere drempel verandert de vingerafdruk van workouts. Gemeten op het demoprogramma (elk sjabloon dat naar het horloge gaat, op vijf dagen in vijf weken, met en zonder StairMaster: 180 workouts) bij 173 naar 176: 120 van 180 krijgen een nieuwe vingerafdruk met de standaardmodus en met "Rustige loop" uit, 50 van 180 met de modus van intervals.icu. Bij dezelfde drempel verandert er niets: `buildWorkoutPlan` is niet aangeraakt. Dat gebeurt alleen na Akkoord, zoals voorheen.

## Alternatieven

- De bestaande instelling "Hartslag van de borstband" laten gelden als ja voor een band van een ander merk (het onderzoek). Niet gedaan: die staat standaard aan, dus een test aan de pols zou dan altijd tellen. Wie een band van een ander merk draagt, zegt het per test met "Ik had hem wel om" of kiest Telt met ruime marge.
- Bij één test pas een voorstel bij 5 slagen (het onderzoek). Niet gedaan: de opdracht noemt 3 slagen; een open punt voor de eigenaar.
- De andere poorten uit hoofdstuk 4 (warmte, zwaarte 7 of lager, ziek, korte nacht, hoogte, stilstaan, cadans) en de regel op Vandaag "Borstband om" op een testdag: niet in deze stap. De Briefing zegt het alleen als er iets mist (Pathfinder: geen kopie op Vandaag).

## Bron

`docs/onderzoek/Drempel en submaximale test.md` (hoofdstuk 4, 5, 7 en 8, stap 1 en 2); de eigenaar 17 november 01:50 en 02:15 (backlog I-79); Pathfinder vooraf over de plek van "Klaar voor je test" (Koppelingen onder Garmin, één regel in de Briefing onder de testloopzin).

## Vervangt

Niets. Vult `2026-11-02-week-en-vandaag-hulp.md` aan (Zones bijwerken na een test): de schatting en wanneer een voorstel komt.

## Terugdraaien

"Drempel uit je test" op Zoals Friel of "Test zonder borstband" op Telt met ruime marge geeft de ruimere uitkomst zonder code. In code: `zoneOffer` weer `lthrFromEffort` van alleen de laatste test laten lezen (THRESHOLD_RULES.take op 1). De RR-reeks kan blijven staan; hij raakt niets.
