# Klaar voor je doel: vervolg

Datum: 2026-10-28
Status: aangenomen

## Besluit

Vier losse einden van `2026-10-28-klaar-voor-je-doel-logisch-afwerking.md` zijn dichtgemaakt.

1. Het hoofddoel rekent niet meer altijd als de GR5. `goalReadinessFor` neemt de mijlpalenrekening (`computeMainGoalReadiness`) alleen voor een tocht met hutten of tent (`trek_hut`, `trek_tent`) en voor een doel zonder soort (`usesMilestoneReadiness`). Een hoofddoel van een andere soort krijgt de rekening van zijn eigen soort: wedstrijd, Sterker worden, dagtocht, trail. Het hoofddoel is het doel met de mijlpalen (`mainGoal`). Dat is bij een nieuwe installatie altijd een tocht, maar de code verbiedt een wedstrijd met mijlpalen niet, dus de keuze hangt aan de soort en niet aan de aanname. Je stand leest nu dezelfde functie als de Ascend-kaart (`goalReadinessFor` met `isMain`), dus beide tonen altijd hetzelfde getal. Voor een tocht is het getal bit voor bit hetzelfde als eerst (de GR5-tests en `planGolden` bleven ongewijzigd). De kaart op Je stand heet bij een andere soort "Klaar voor je doel" en laat de GR5-zinnen in het blad weg. De wedstrijdfeiten (de regel met de weken) staan alleen op de Ascend-kaart.

2. Krachtdoelen verdwijnen niet stil. Wie oefening, gewicht en herhalingen invult en niet op "Doel toevoegen" tikt, behoudt dat bij Volgende: een volledige invoer gaat mee (`finishStrengthTargets`). Staat er iets half in, dan blokkeert Volgende met één zin ("Je krachtdoel is nog niet af. Vul het gewicht in. Of maak de velden leeg."). Een volle lijst geeft ook een zin. De oefening blijft als naam opgeslagen, zoals het altijd was, zodat oude doelen werken. De krachtmeter herkent de oefening nu ook aan haar id of een alias (`exerciseMatch`), zodat een log onder "Back Squat" meetelt voor het doel "Barbell Back Squat". Een oude naam die de lijst niet kent blijft op de gewone naamvergelijking werken.

3. Nooit een tegenspraak de dag na een Akkoord. Het voorstel is de kleinste hele minuut die precies past; een dag later kan die minuut net missen. De kaart zegt nu "past" zolang de doeltijd binnen de spreiding van de voorspelling (`PREDICTION_SPREAD`, 2,5%) van de verwachte tijd op de wedstrijddag ligt: `RaceOutlook.holds`. Dezelfde lijn beslist al of TARGET-TIME zich meldt (`checkTargetTime`), dus kaart en voorstel zwijgen samen. `fits` blijft de strikte vraag (past het werk in de weken) en bepaalt de kleinste hele minuut van het voorstel. Zit een doeltijd alleen binnen de spreiding, dan zegt de regel "Je doeltijd ligt binnen de spreiding van die verwachting." en noemt geen weken. De meter zelf (weken werk) blijft zoals hij was.

4. Korte afstanden. Tot en met 10 km staat de verwachte tijd op de wedstrijddag als klok ("ongeveer 20:05"), daarboven als hele minuten ("ongeveer 50 minuten"): `racePaces.ts#outlookSaid`, gelezen door de kaart (`bandLine`) en door TARGET-TIME. Het voorstel zelf blijft een hele minuut (de doeltijd en het id zijn hele minuten).

## Wat opgeslagen wordt

Niets nieuws. Geen migratie, geen nieuwe instelling (er verandert niets wat de planning raakt, het zijn rekenregels en teksten). Geen historie herschreven.

## Reden

De review en de eigenaar vonden dat een hoofddoel dat geen tocht is toch de GR5-rekening kreeg, dat een ingevuld krachtdoel zonder tik verloren ging, dat een Akkoord de volgende dag kon worden tegengesproken, en dat "ongeveer 21 minuten" bij een 5 km te grof is.

## Alternatieven

Voor punt 3: de doeltijd van het voorstel ruim afronden naar boven (de doeltijd zou dan niet meer de kleinste passende minuut zijn), of het randgeval als bekend gedrag vastleggen. Gekozen is de spreiding omdat die al de grens van TARGET-TIME is. Voor punt 2: het veld bij elke wijziging automatisch toevoegen (dan voegt het "10" toe terwijl je "100" typt).

## Niet gebouwd

`testMeaning` (het blad van de testloop) zegt de voorspelling van vandaag nog in hele minuten. Het gaat om de tijd van vandaag, niet die op de wedstrijddag.

## Bron

De opdracht van de coördinator. Geen persoonsgegevens.

## Terugdraaien

Punt 1: `usesMilestoneReadiness` altijd waar laten zijn. Punt 3: `holds` gelijk aan `fits`. Punt 4: `outlookSaid` altijd de minutenvorm laten geven.
