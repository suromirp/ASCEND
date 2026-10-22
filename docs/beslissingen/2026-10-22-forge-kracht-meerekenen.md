# Forge: ASCEND rekent stil mee met je krachttraining

Datum: 2026-10-22
Status: aangenomen

## Besluit

ASCEND rekent mee met de krachttrainingen die uit MacroFactor binnenkomen, volgens de regels KR-1 tot KR-8 van `docs/onderzoek/Kracht loggen en progressie.md` (`src/engine/strengthModel.ts`). De pagina heet Forge (`/forge`, `/kracht` verwijst door) en is bereikbaar vanaf Stand en de instellingen. Er is nog geen scherm om te loggen. Het rekenmodel verandert nooit een plan of een log; het toont alleen een voorstel met één zin waarom, en een vergelijking met wat er echt gedaan werd.

Alles is instelbaar (groep Training, kopje Forge): de schakelaar Kracht meerekenen (standaard aan), eerst gewicht of eerst herhalingen (standaard gewicht), werksets dalend of gelijk (standaard dalend), opwarmen slim, schema of uit (standaard slim), bereik verbreden bij grove stappen (aan), tot hoeveel herhalingen een set meetelt voor de schatting (12), en het sportschoolprofiel (stangen 20 en 15 kg, schijven 1,25 tot 25 kg, dumbbells 2 kg tot 10 kg en daarna 2,5 kg, kabels en toestellen 5 kg). De vorm is een lijst profielen met een actief profiel; nu is er één. De velden zijn optioneel en additief (`AppSettings.strengthModel`), reizen mee in de back-up en rommel wordt geweigerd (`storage/backup.ts`); daarom geen nieuwe back-upversie.

De lijn op de pagina is niet het geschatte maximum, maar het gewicht dat je volgens de schatting aankunt bij het herhalingenbereik van die oefening. Het geschatte maximum heet "geschatte kracht" en staat alleen in de uitleg.

## Eigen keuzes boven op het rapport

Het rapport geeft startwaarden; dit zijn dingen die het niet bepaalt en die hier zijn gekozen:

- Gewicht per set binnen een training: elke eerdere werkset kost de volgende 3% van de geschatte kracht. Met 3% geeft het model 47,5, 45, 42,5 en 42,5 kg bij vier sets van 11 tot 13 met 2 over, de reeks die de eigenaar in zijn andere app zag. Eén voorbeeld, dus onzeker.
- Het herhalingenbereik is nergens opgeslagen en wordt afgeleid: banden van drie herhalingen breed (3 tot 5, 5 tot 7, 7 tot 9, 9 tot 11, 11 tot 13, 14 tot 16, 17 tot 19), gekozen bij de eerste training en pas verschoven na twee trainingen achter elkaar erbuiten. De doel-RIR is de middelste RIR van de laatste twee trainingen, tussen 1 en 3, anders 2.
- Een training waarop je het bereik haalde met minstens de gevraagde RIR laat het gewicht niet dalen, omdat het gladstrijken een goede dag maar half meeneemt en het voorschrift anders na een betere training lichter kon zijn. Hetzelfde na een training op vermoeide benen. Bij "eerst herhalingen" is de bovenkant van het bereik het teken voor één stap zwaarder.
- Wanneer zijn de benen moe: een bergtocht (500 m stijging of daling, of 3 uur), een lange duurloop (75 minuten) of een harde loop (inspanning 7 of meer, minstens 20 minuten) in de 48 uur ervoor, of een beenindex boven de grens van "vermoeid" (12).
- Twee trainingen achter elkaar minstens 2 herhalingen onder de verwachting, zonder vermoeide benen: 5% lichter.
- Na meer dan drie weken pauze telt de eerste training met k 0,7. Een slechte dag is meer dan 1% onder het gladgestreken getal.
- Het gewicht van een stang wordt gemaakt uit de stang die bij het laatste gewicht past en schijven in paren zonder aantallen. Een toestel met een gewichtstapel ronden we af op één stap; een oefening die de lijst niet kent op de stap van toestellen.
- Smart opwarmen: 40% en 58% van de geschatte kracht voor 8 en 4 herhalingen, met een lichte derde set boven drie keer de zwaarste lege stang; alleen wat onder het werkgewicht blijft. Voor een tweede oefening van hetzelfde patroon weet de pagina niets en toont daarom altijd de volledige opwarming.

## Wat dit kan missen

Met de grens van 12 herhalingen tot falen tellen sets van 11 herhalingen met 2 over (13) niet mee. Wie vaak 11 tot 13 herhalingen traint, ziet voor die oefeningen geen schatting, tenzij de instelling naar 15 of 20 gaat. Dit staat zo in KR-1 (Nuzzo, Halperin) en blijft dus de standaard.

## Alternatieven

Eén vast percentage per oefening in plaats van een schatting uit RIR. Het model eerst in een logscherm bouwen. Beide afgewezen: eerst stil meerekenen en naast MacroFactor leggen, zoals het rapport voorstelt.

## Bron

Onderzoek `docs/onderzoek/Kracht loggen en progressie.md` (KR-1 tot KR-8, hoofdstuk 7). Keuzes van de eigenaar op 22 oktober 2026 (alles instelbaar, de naam Forge, de lijn als gewicht bij het bereik).

## Vervangt

Niets.

## Terugdraaien

De schakelaar Kracht meerekenen uit. De velden en de pagina blijven dan leeg; er is niets in logs of planning aangepast.

## Aanvulling bij het samenvoegen (22 oktober 2026)

De standaard voor "Sets die meetellen voor je kracht" is 20 herhalingen tot falen, niet 12. Het programma van de eigenaar gebruikt bereiken als 11 tot 13 en 14 tot 16 met 2 over, dus 15 tot 18 tot falen; met 12 als grens zouden die oefeningen geen schatting en geen voorstel krijgen. Boven 12 is de omrekening onzekerder (zie het onderzoek, KR-1), maar binnen één oefening is de trend bruikbaar, en dat is waar Forge op stuurt. Wie de strengste schatting wil, kiest 12.

## Aanvulling: de bovenste band en de grens van 20 (22 oktober 2026)

De grens "tot hoeveel herhalingen een set meetelt" heet in de code de strengste grens (12, `STRICTEST_REPS_TO_FAILURE`) en is alleen de terugval; de echte grens komt uit de instellingen en is standaard 20. Met die 20 vallen ook de bovenste banden binnen: bereiken als 17 tot 19 met 2 of 3 over (19 tot 22 tot falen) vallen er voor een deel boven. Een set van 19 herhalingen met 2 over is 21 tot falen en telt dus niet mee, tenzij je de grens verhoogt; de hogere banden krijgen daardoor vaak minder schattingen dan de middelste. Dat is bewust: boven 20 is de omrekening te onzeker, en wie veel in die band traint ziet de lijn van die oefening later of niet.

Bij het gewicht dat het sportschoolprofiel niet kan maken (een EZ-stang van 12,5 kg bij een lichtste stang van 15 kg, een dumbbell die niet in het rek staat) doet Forge geen voorstel en zegt: "Dit gewicht past niet bij je sportschool. Kijk bij je stangen en dumbbells in de instellingen." Een oefening die de lijst niet kent wordt nog steeds afgerond op de stap van toestellen.

Een lichter voorschrift noemt als reden wat er echt gebeurde (onder het bereik, of zwaarder dan bedoeld). "Je geschatte kracht is lager" staat er alleen als de gladgestreken kracht echt daalde.
