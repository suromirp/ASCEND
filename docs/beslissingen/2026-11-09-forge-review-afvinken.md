# Forge: de punten uit de review van "Afvinken telt als het doel"

Datum: 2026-11-09
Status: aangenomen

## Besluit

De Forge-punten uit de review van het bouwmoment van 9 november zijn afgehandeld: zes gebouwd, één bestond al, en vier bewust blijven liggen met de reden hieronder. Geen nieuwe instelling: geen van de punten voegt een keuze voor de gebruiker toe; alles valt onder "Afvinken telt als het doel" (aan als advies) en "Standen onthouden".

Gebouwd:

- Het gewicht dat Forge in de rij zette. Een rij krijgt `WorkoutRow.forgeKg` als Forge het gewicht tijdens de training bijstelt: na een set die anders ging (`reckonAfterTick`, `reckonBackOffs`) en bij Lichter (`applyLighter`). Een gewicht dat je zelf tikt zet het nooit; Terugzetten van de stap haalt het weg. Het log krijgt `SetLog.forgeKg` naast `rirAssumed`, alleen als het van `weightKgAsked` afwijkt. `weightKgAsked` blijft het voorschrift, zodat het betekent wat het in oude logs betekent. Bevestigd telt nu tegen `forgeKg` (anders het voorschrift): een lichter voorstel van Forge dat je afvinkt zoals het staat, is bevestigd.
- Eigen keuze daarbij: zo'n set houdt de kracht niet vast, maar telt als meting met de RIR van regel 4 (`belowPrescription` in `assumedSets.ts`). Forge zette het gewicht lager omdat je vandaag minder sterk leek; dan bewijst afvinken niet dat je even sterk bent als gedacht.
- Migratie: het nieuwe veld valt onder de bestaande stap `migrateLogSetAsked` (`src/storage/migrationsLogs.ts`, via `migrations.ts`): alleen een geldig getal naast `rirAssumed` blijft, een beschadigd veld valt weg, een oud log zonder het veld blijft hetzelfde object. Het back-upnummer beweegt niet, zoals bij `repsAsked`. Bestaande logs worden niet aangeraakt.
- `allAtTop` (regel 5) telt alleen werksets die bevestigd zijn of een eigen RIR van minstens het doel hebben, en elke werkset moet de bovenkant halen; een set onder het bereik of een niet bevestigde set houdt de stap tegen.
- Regel 4 en regel 5 lezen de RIR gelijk. Gekozen is de lezing van regel 4, het advies uit het verslag: een bevestigde set telt met het doel min de helft van de extra herhalingen, naar boven afgerond (`confirmedRir`). De stap (de topset, "twee keer achter elkaar" en "alle werksets") leest nu hetzelfde getal. Gevolg: 1 herhaling meer dan gevraagd telt nog met het doel, 2 of meer met minder over en geeft dan via regel 5 geen stap. Een oud log zonder `repsAsked` leest tegen de onderkant van het bereik en geeft daardoor minder snel een stap dan eerst; het gewicht kan dan nog wel omhoog via de geschatte kracht, want de extra herhalingen tellen half mee. Dat is strenger, en past bij "strenger dan een gemeten RIR" uit het verslag.
- Na een pauze: de eerste training na meer dan drie weken (`BREAK_DAYS`, dezelfde grens als de herstart van het gladstrijken) laat een bevestigde set niet de kracht vasthouden; hij telt als meting. Eigen keuze: de grens van drie weken in plaats van de vier weken van "iets lichter na een pauze", omdat het model de vier-wekenregel per training niet kent (of er intussen andere kracht was) en drie weken al de herstart is.
- `mergeDraft`: een aangeraakt concept van voor `trainings` krijgt het getal van het plan van nu; een eigen getal blijft.
- De uitlegzin onder de bolletjes van "Hoeveel over?": "Een schatting is genoeg. Twijfel je tussen twee, kies het lagere." (`QUICK_RIR_HINT`, de zin uit hoofdstuk 5 van het verslag). Hij staat klein onder de vier bolletjes, zonder eigen beweging.
- Toestelstanden: Standen wissen houdt het blad open met "Standen gewist." en Terugdraaien; dat zet precies terug wat er stond, ook een oude lijst, een oud bereik of "geen sleutel" (`withStandsRestored`, `restoreStandsNow`, alles of niets met een grens in tijd). Bij een andere actieve sportschool raakt Terugdraaien niets. Het formulier heeft geen `key` meer: komt het inlezen later binnen, dan staan de standen er vanzelf bij en blijft wat je invulde staan; de keuze "Wat Forge voorstelt" volgt wat er staat tot je zelf kiest. Het keuzestrookje heet nu "Ook schatten" en "Alleen deze standen", met de uitleg in de zin eronder; zo past het op 390 px op één regel met lucht naast de rand, zonder `ChoiceStrip` zelf te veranderen. Minder bij een leeg gewichtsveld of op de laagste stand toont geen getal meer en zegt dus nooit "naar 0 kilo" (`standHints`).

Bestond al: de test voor de drie takken van `refitAfterFill` (Lichter, nog steeds niets past, te grote stap, en niets te zeggen) staat in `src/engine/forgeAdjust.test.ts`.

Blijft liggen:

- De ijkset eens per vier weken. De twijfelvraag zelf voegt niets toe: de eerste werkset (de topset) wordt al altijd gevraagd. De echte ijkset uit KR-12 vraagt de topset tot er nog één over is; dat verandert het voorschrift, moet niet op een beendag in de 72 uur voor een test of de dag voor een bergtocht, en is een keuze die een eigen instelling nodig heeft. Dat is een eigen spoor, naast stap 6 tot 8 (vermoeidheid tussen oefeningen).
- Standen in pond, plaatjesnummers en standen voor de optrekhulp: open, zoals de coördinator vroeg.
- Een eigen schakelaar voor de Forge-melding Spieren voor de berg: de pagina Forge zit op het maximum van zes rijen. De melding blijft onder de bestaande instelling van Spieren voor de berg.

## Reden

Een lichter voorstel van Forge dat je afvinkt, telde niet als bevestigd omdat het log alleen het voorschrift bewaarde; en de stap kon komen op werksets die niet bevestigd waren of met een andere lezing van de RIR dan de kracht gebruikt. Na een pauze hield een bevestigde set op een lichter voorschrift de oude kracht vast, terwijl die training juist opnieuw moet meten.

## Alternatieven

`weightKgAsked` laten volgen wat Forge in de rij zette: dan betekent hetzelfde veld in oude en nieuwe logs iets anders, en is niet meer te zien of het gewicht onder het voorschrift lag. Regel 4 milder maken zodat hij leest als regel 5: dan stijgt de kracht op extra herhalingen die het verslag maar half wil tellen. Het keuzestrookje zelf breder of met twee regels maken: raakt elk ander blad dat `ChoiceStrip` gebruikt.

## Bron

`docs/onderzoek/RIR en RPE in krachtapps.md` (hoofdstuk 4 regel 4 en 5, hoofdstuk 5), `docs/onderzoek/Kracht loggen en progressie.md` (KR-12), `docs/beslissingen/2026-11-08-forge-afvinken-doel.md`, `docs/beslissingen/2026-11-09-forge-toestelstanden.md`, de review van het bouwmoment in `docs/backlog.md`.

## Vervangt

Niets. Het besluit van 8 november blijft; dit vult het aan op de punten hierboven.

## Terugdraaien

`forgeKg` niet meer lezen in `lighterThanAsked` en `belowPrescription` niet meer in `sessionValue`; het veld mag in de logs blijven staan. Regel 5 terug naar de ruwe RIR: `readTopRir` en de leesregel in `allAtTop` weghalen. De pauzeregel: `afterBreak ? undefined : smoothed` terug naar `smoothed`. Terugdraaien na Standen wissen: het blad weer sluiten na wissen.

## Na de review (Warden)

- De zin onder de bolletjes is "Twijfel je tussen twee, kies het lagere: dan rekent Forge voorzichtig." Het lagere bolletje is de voorzichtige kant voor de geschatte kracht en de stap (minder over betekent minder kracht en geen stap). De bron in het RIR-verslag gaat over de lagere RPE, dat is de andere richting; de zin volgt dus de engine en niet het verslag.
- Tik je op het voorschrift (`takeTarget`), dan gaat ook `forgeKg` weg: het gewicht is weer wat gevraagd was.
- `allAtTop` slaat een werkset met 0 herhalingen over, zoals voorheen (een import of een handmatig log).
