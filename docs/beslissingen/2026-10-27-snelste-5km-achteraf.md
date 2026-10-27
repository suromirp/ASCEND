# De snelste 5 km ook lezen voor een test van een paar weken terug

Datum: 2026-10-27
Status: aangenomen

## Besluit

Bij het openen van de app leest ASCEND op de achtergrond de snelste 5 km van elke testloop van de laatste 60 dagen die er nog geen heeft, één voor één en met een tijdsgrens. Wacht zo'n snelste 5 km op Akkoord, dan staat op Vandaag een stille regel, en het advies over je doeltijd zegt waarop het rekent.

Dit vult `2026-10-27-testloop-lezen.md` en `2026-10-27-testloop-lezen-aanvulling.md` aan. Die blijven zoals ze zijn.

## Reden

De eigenaar liep een testloop van 6 km in 36:00 (met inlopen) die binnenkwam voordat de snelste 5 km live stond. De snelste 5 km werd alleen gelezen bij een nieuwe activiteit of als je het logblad opende, dus het advies over de doeltijd rekende op de hele run en zei dat niet.

Wat er nu gebeurt:

1. **Achtergrondstap.** Na "watch activities" leest `storage/activityDetail.ts#ensureRecentTestEfforts` de testlogs van de laatste 60 dagen met een externalId die er nog een willen (`wantsBestEffort`). De bestaande vingerafdrukken (`bestEffortTried`) voorkomen dat dezelfde reeks twee keer wordt opgehaald, elke test heeft een grens van 20 seconden, een fout komt nooit naar buiten, en na een toevoeging volgt een refresh. Staat de activiteit niet meer in de laatste ophaling, dan zoekt `ensureBestEffort` ook in de oudere en maakt anders een minimale activiteit, zoals `ensureRunDetail`, zonder weer.
2. **Telt het meteen?** Als meetellen geen tempo verandert, telt de snelste 5 km vanzelf (`mayAcceptAtOnce`). Anders wacht hij op Akkoord, zoals al besloten.
3. **Een stille regel op Vandaag.** "Je testloop heeft een snelste 5 km. Kijk of die mag tellen." (`engine/testJudgment.ts#effortOfferLine`), in `TestPendingLine`, met een tik naar het logblad van die test waar de oude en nieuwe tempo's met Akkoord staan. Nooit twee regels tegelijk: de regel van een twijfeltest gaat voor. Een test die je liet wegvallen krijgt hem niet.
4. **TARGET-TIME zegt waarop het rekent.** "(snelste 5 km in mm:ss)" als de snelste 5 km telt, anders "(hele run: 6 km in 36:00)". Wacht de snelste 5 km van de laatste test op Akkoord, dan geeft de regel voor die test nog geen advies, want het getal verandert daarna.
5. **Instellingen.** Geen nieuwe. De hulp van "Twijfeltest eerst vragen" noemt de regel op Vandaag.

## Alternatieven

- Het alleen bij het openen van het logblad doen. Dan hangt het advies ervan af of je een log opende.
- De snelste 5 km meteen laten tellen. Dat verandert stil je tempo's.
- Een nieuwe instelling. De bestaande keuzes voor details van loopjes en de twijfeltest dekken het.

## Bron

Een testloop van de eigenaar op 2026-10-27.

## Vervangt

Niets.

## Terugdraaien

Haal de stap uit de lijst achtergrondstappen in `state/AppDataContext.tsx`. Zonder de stap werkt alles als voorheen: lezen bij een nieuwe activiteit of bij het openen van het logblad.
