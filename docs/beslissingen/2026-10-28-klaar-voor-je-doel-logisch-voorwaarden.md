# Klaar voor je doel: kracht per niveau, tijdslimiet en cutoff

Datum: 2026-10-28
Status: aangenomen

## Besluit

Twee stappen van het bouwplan uit `2026-10-28-klaar-voor-je-doel-logisch.md` zijn nu gebouwd.

Sterker worden: de meter Krachttrend is per hoofdoefening het gat in weken werk (`engine/strengthReadiness.ts`). Het geschatte maximum is je beste set van de laatste vier weken (RIR gemeten, geen opwarmset, niet ver van falen, zoals KR-2) naast dat van je doel (gewicht en herhalingen, Epley). De groei hangt af van het niveau op die oefening: ervaren 0,1% per week bij meer dan twee jaar eigen krachtgeschiedenis op die oefening, anders gevorderd 0,25%. ASCEND kiest nooit zelf beginner (1%): een korte geschiedenis in de app zegt niet dat je net begint, en de voorzichtige afleiding gaat niet uit van beginnerswinst. Het blad zegt per oefening welk niveau is genomen en waarom, en zegt dat het sneller gaat als je net begint. Krachttrend weegt 60% en harde sets 40%; Volhouden blijft zoals het was.

Tijdslimiet en cutoff: een voorwaarde, de meter Tempo (`engine/limitReadiness.ts`), alleen als het doel een limiet heeft. Nieuwe optionele velden `GoalDetails.timeLimitMinutes` (dagtocht, bijvoorbeeld de laatste lift) en `cutoffMinutes` (ultra). Verwacht is bij een dagtocht de DIN-tijd keer jouw eigen factor (mediaan van je wandelingen van minstens anderhalf uur in de laatste acht weken, minstens drie), bij een ultra jouw beste tempo per inspanningskilometer (kilometers plus stijgen gedeeld door 100) doorgetrokken met een Riegel-exponent van 1,06 tot drie uur en 1,15 daarboven. De grens is de limiet min 10% marge; binnen de grens is de meter vol, anders het gat in weken werk. De meter weegt zo zwaar als de andere. Zonder genoeg eigen dagen staat er een regel in plaats van een meter ("Na drie lange wandelingen kan ASCEND je tempo schatten."). Er komt geen groeiband tot de doeldag.

## Reden

Zie de onderzoeksnotitie `docs/onderzoek/Klaar voor je doel logisch per doel.md`, delen 5 en 7. Prestatie en voorwaarden rekenen zo in dezelfde munt als de snelheid van een wedstrijd: weken werk.

## Wat opgeslagen wordt

Alleen de twee optionele velden op het doel, gelezen door `storage/migrations.ts#readGoalDetails` (een veld dat geen getal boven nul is valt weg). Het schema blijft 2; een back-up zonder de velden importeert als voorheen. De invoer staat in het doelformulier: tijdslimiet bij een dagtocht, cutoff bij een trail met de keuze ultra (een korte trail houdt hem niet). Er is geen nieuwe instelling: de marge en de groei zijn vaste, uitgelegde keuzes.

## Niet gebouwd

Een tijdslimiet per dag bij een meerdaagse tocht (de GR5 verandert niet), een invoer voor de krachtdoelen per oefening (`strengthTargets` staat al in het model maar heeft nog geen formulier), harde sets als gevulde meter, en de instellingen "Groei bij het rekenen" en "Marge bij een tijdslimiet".

## Alternatieven

Beginner als standaard bij een korte geschiedenis (te mild, het getal zou mooier lijken dan het is). Een marge van 0% (de ultra uit het voorbeeld zou dan op 100% staan terwijl er maar 11 minuten speling is).

## Bron

`docs/onderzoek/Klaar voor je doel logisch per doel.md`, opdracht van de coördinator. Geen persoonsgegevens.

## Vervangt

Niets.

## Terugdraaien

Laat `appliesWhen` van de meter Tempo weg of vul de velden niet in; Krachttrend valt terug op "nog niet gemeten" door `computeStrengthReadiness` niet te gebruiken in `useGoalViews`.
