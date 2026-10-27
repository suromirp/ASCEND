# Spierpijn en een zware beendag, aanvulling na review

Datum: 2026-10-27
Status: aangenomen

## Besluit

Drie dingen uit het besluit `2026-10-27-spierpijn-en-zware-beendag.md` worden aangescherpt.

1. MORNING-CHECK maakt dezelfde keuze als de kaart Benen. De kaart spreekt voor de ene training die `easeTarget` kiest (een zware beendag, anders een harde loop die geen test of wedstrijd is). MORNING-CHECK slaat precies die training over en spreekt zelf over wat er daarna nog zwaar is. Zonder kaart (de instelling staat op Regel of Uit, of er is open pijn op een beenplek) blijft MORNING-CHECK ook voor die training zelf spreken, zodat bij pijn de pijnrem niet wordt overstemd. Het voorbeeld onder de ochtendcheck noemt de kaart Benen als zij komt.
2. Voor "raak" valt een rij alleen weg als de oefening de benen belast (`loadsLegs`), niet het hele log. De koppeling loopt via de geplande training, met een dag ruimte voor de datum, omdat een training na middernacht kan eindigen of een dag later gelogd wordt.
3. Een melding van spierpijn van dezelfde dag maakt een al gelogde training niet meer "moe". Een melding heeft geen tijdstip, dus we weten niet of ze er vóór de training was. De ochtendcheck van die dag en meldingen van eerdere dagen tellen wel. Voor een training die nog moet komen (zonder tijdstip) telt een melding van vandaag wel.

## Reden

Eén spierpijn gaf twee kaarten als de training van vandaag een kwaliteitsloop was of als er een beendag en een loop op één dag stonden. Een lichtere training telde in "raak" ook voor bovenlichaam en romp, die niet lichter werden. Een melding na de training kon de training achteraf moe noemen en zo de geleerde kracht vertekenen.

## Alternatieven

Een tijdstip op elke melding opslaan: een opgeslagen vorm die verandert voor één regel. Niet nodig zolang de ochtendcheck het moment wel vastlegt.

## Bron

Review van Warden op "Spierpijn en een zware beendag". Het onderzoek blijft `docs/onderzoek/Pijn spierpijn en vermoeidheid melden.md`.

## Vervangt

Niets. Het eerste besluit blijft staan; dit is een aanvulling.

## Terugdraaien

Terug naar `covered` in `morningAdvice`, `easedLogIds` op exact dezelfde datum en `sameDayNotes` altijd waar in `soreFromNotes`.
