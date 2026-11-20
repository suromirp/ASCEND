# Een ochtend zonder bron is van de gebruiker, niet van de koppeling

Datum: 2026-11-20
Status: aangenomen

## Besluit

Een ochtend zonder bron (`import:<datum>`) hoort niet bij een koppeling. Hij gaat alleen weg als hij gedekt is: een ochtend met een bron op dezelfde dag heeft elk getal dat hij heeft (`engine/morningDouble.ts#doubleMornings`). Ontkoppelen, de grens van 400 dagen, "Ochtendgetallen in back-up" uitzetten en een uitgezette soort halen hem nooit weg en veranderen hem niet in de opslag.

## De regel

- Ontkoppelen (`storage/wellness.ts#clearWellness`) kijkt alleen naar wat van intervals.icu is opgehaald. Daarna loopt het opruimen van dubbele ochtenden, stil. Met "Ochtendgetallen in back-up" aan blijft de opgehaalde ochtend bewaard en dekt die de ochtend zonder bron van dezelfde dag; met die instelling uit is de opgehaalde ochtend weg en blijft de ochtend zonder bron staan. Dat geldt ook als Health Connect aan staat.
- De grens van 400 dagen (`syncWellness`) geldt alleen voor opgehaalde ochtenden. Een ochtend zonder bron van langer geleden blijft.
- "Ochtendgetallen in back-up" uitzetten (`engine/morningBackup.ts#archiveToClear`) noemt alleen opgehaalde ochtenden. De vraag en Ongedaan maken op de instellingenpagina gaan dus nooit over een ochtend uit een bestand, en de tekst daar blijft zoals hij was.
- Een soort uitzetten onder "Wat ASCEND van je horloge gebruikt" (`pruneWellness`) laat de opslag van een ochtend zonder bron gelijk. Elk scherm leest de ochtenden al door het filter van die keuzes (`engine/watchUse.ts#filterRecovery` in `useWellness`, `useRecoveryMetrics`, `useInfluence` en `useSleepRefetch`), dus de dag toont de soort niet. Zet je de soort weer aan, dan is het getal terug.
- Het opruimen zelf (`tidyDoubleMornings`) leest, beslist en wist in één transactie, en gooit nooit door een ontkoppeling of een ronde heen (`tidyDoubleMorningsQuietly`).

## Bekende grens

Een gedekt getal kan verdwijnen als de bron later minder geeft. Het bestand heeft HRV 66, de eerste ronde geeft HRV 60 en de ochtend zonder bron gaat weg, de tweede ronde geeft dezelfde dag zonder HRV: de dag heeft dan geen HRV meer. Het getal staat nog in het bestand. Dit is aanvaard: wie het wil voorkomen moet een ochtend zonder bron altijd bewaren, en dan sleept de back-up weer dubbele ochtenden mee.

## Reden

De aanname in het eerdere besluit, "ASCEND heeft geen scherm om een ochtend in te vullen, dus hij kwam ooit van een koppeling", klopt niet. ASCEND schreef nooit een ochtend zonder id: de back-up zet het id er sinds de eerste versie in. Een ochtend zonder id komt dus uit een bestand dat iemand zelf maakte of bewerkte, of van een onbekende bron. Zo'n ochtend kan geen koppeling terughalen. Weghalen zonder vraag en zonder weg terug is dan verlies van gegevens van de gebruiker.

De regel was ook breder toegepast dan de opdracht vroeg (ontkoppelen, 400 dagen, uitzetten van een soort) zonder test op elke plek. Elke plek heeft nu een test die laat zien wat er wel en niet verdwijnt.

## Alternatieven

- Een ochtend zonder bron in de lijst van "Ochtendgetallen in back-up" uitzetten laten staan en dat in de tekst van de vraag zeggen. Niet gekozen: die instelling gaat over wat een koppeling ophaalde; een ochtend uit een bestand hoort daar niet bij, en zonder hem verandert er geen zichtbare tekst.
- Een uitgezette soort ook uit de opslag van een ochtend zonder bron halen en bij aanzetten terugzetten. Niet gekozen: dat vraagt een tweede opslag om terug te kunnen, terwijl het filter bij het lezen er al is.

## Bron

Review van Warden op I-84 (20 november 2026), nagespeeld met nagemaakte ochtenden. Tests: `src/storage/ochtendDubbel.test.ts`, `src/storage/ochtendDubbelStil.test.ts`, `src/storage/healthConnect.test.ts`, `src/storage/watchWellness.test.ts`, `src/engine/morningBackup.test.ts`.

## Vervangt

Uit `2026-11-20-ochtend-dubbel.md` de regel Ontkoppelen, de Reden en de laatste eigen keuze (een ochtend zonder bron telt bij het ontkoppelen mee). De rest van dat besluit geldt: lezen als laatste, weg zodra gedekt, de import, het opruimen na een geslaagde ronde en bij de start.

## Terugdraaien

Zet in `storage/wellness.ts` en `engine/morningBackup.ts` de toets op het begin van het id terug naar een toets die ook `import:` meeneemt. Wat intussen bleef staan blijft staan; er is niets om terug te zetten.
