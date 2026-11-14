# Duur van het log, geen log onder een minuut, een korte training

Datum: 2026-11-14
Status: aangenomen (coördinator, punten A, B, C, F, I en het startdeel van J uit de profielendoorloop)

## Besluit

Een gedane training toont overal de duur van het log in hele minuten (`engine/sessionStatus.ts#loggedMinutes`, `rowMinutes`); een log zonder bruikbare duur toont geen getal, ook niet het plan. Opslaan staat uit bij een duur onder 1 minuut, met de zin "Vul een duur in van minstens 1 minuut." (`engine/inputLimits.ts#durationTooShort`), in Hoe ging het?, het oude trainingsscherm, Forge afronden en het blad voor kracht in MacroFactor. Tot nu toe mocht leeg of 0: dat werd een log van 0 minuten dat als gedaan telde. Een afstand van 0 of minder wordt niet bewaard (0 km is "weet ik niet"), een negatieve hoogte ook niet; 0 m hoogte blijft een waarde. Onder de helft van de geplande werksets of duur heet een training kort ("Een korte training. Dat telt ook.", `engine/shortTraining.ts`); hij telt nog als gedaan, de status komt uit het log. Een test of wedstrijd is nooit kort. De tempoloop zegt op de missiekaart "korte zinnen", zoals de Briefing. MacroFactor wordt alleen genoemd als er een export is ingelezen. De start toont het totaal pas als het vaststaat, en een tik binnen 400 ms na een nieuwe vraag telt niet.

## Reden

Profielendoorloop 14 november: Je dag noemde het plan naast het log, een log van 0 of -5 minuten werd stil bewaard en blijft staan (append-only), 2 van 23 sets heette "Gedaan zoals gepland", een tempoloop heette rustig, een beginner zonder MacroFactor zag MacroFactor, en een dubbele tik sloeg een startvraag over.

## Alternatieven

Een vraag "Klopt dit?" bij een duur onder 1 minuut: afgewezen, er is geen geldige training van 0 minuten om te bevestigen. De grens van een korte training instelbaar maken: niet, het is alleen tekst.

## Bron

`docs/profielen/2026-11-14-*.md` op de branches `claude/profiel-*`.

## Vervangt

De zin "Leeg of 0 betekent: geen duur" onder het veld Duur.

## Terugdraaien

`durationTooShort` laten teruggeven wat `entryMinutes(...) < 0` geeft; `SHORT_TRAINING_SHARE` op 0 zetten.

## Aanvulling (Pathfinder, 14 november)

Eén drempel en één zin: de oude tweede drempel na afronden (onder 70 procent van de duur, "Korter dan gepland. Prima: iets doen telt.") is vervallen. Onder de helft heet het een korte training, daarboven geen oordeel over de duur. "Zwaarder dan gepland" en "Slechter dan normaal" gaan voor de korte training, pijn ging al voor. Het feit "Zwaarte volgens MacroFactor" staat alleen als de aanroeper zegt dat MacroFactor gekoppeld is; zonder die opgave geen feit (ook in de Briefing en het trainingsblad).
