# Rusttimer: tien geluiden, volume met piekgrens, vooraankondiging

Datum: 2026-11-11
Status: aangenomen

## Besluit

De rustbel van Forge krijgt tien klanken in vijf groepen (Bergen: Koebel, het advies, en Pickel op
rots; Rome: Cornu; Noorden: Vikinghoorn en Trommel; Oosten: Bronzen klokken, Hyōshigi en Tempelbel;
Overig: Heldere bel en Lier), met een knop Luister bij elke keuze. Elke klank gaat door één vaste
piekgrens. Erbij komen drie instellingen: Volume van de rustbel (Zacht, Normaal als advies,
Duidelijk), Vooraankondiging (een zachte tik 10 seconden voor het einde, standaard uit) en Andere
klank bij volgende oefening (standaard aan). In de Android-app gaat andere audio even zachter.

## Reden

De eigenaar wil een bel die door muziek en een koptelefoon heen komt zonder te hard te zijn, en
keuzes met karakter in plaats van grappige geluiden (backlog, 11 november).

- Door muziek heen: Koebel heeft zijn energie rond 2,6 kHz, waar muziek en een koptelefoon het minst
  maskeren, met een korte, heldere aanslag. Daarom het advies.
- Niet te hard: elke klank gaat via een eigen gain (het volume) naar één DynamicsCompressor per
  AudioContext als limiter (drempel -14 dB, verhouding 20, aanslag 3 ms, loslaten 200 ms). Duidelijk
  klinkt daardoor voller, maar piekt nooit boven de grens; ook niet als Luister en de bel van een
  lopende rust tegelijk klinken, want ze delen de limiter.
- Geen klik: elke stem begint op nul en loopt in minstens 2 ms op.
- Nooit stilte zonder melding: een opname die niet laadt (offline, eerste keer, of langer dan 1,5 s)
  klinkt als de heldere bel. Laat de telefoon geen geluid toe (de AudioContext start niet binnen
  400 ms), dan trilt hij met het ritme van je geluid, ook als je Alleen geluid koos. Luister zegt
  het onder het kopje als het niet klonk zoals gekozen.
- Andere klank bij volgende oefening: de klank twee keer, de tweede een kwart lager; het trillen
  doet het patroon ook twee keer. Forge geeft bij het starten van de rust door of er een nieuwe
  oefening komt (`restBeforeNewExercise`); verder verandert het Forge-scherm niet.
- Vooraankondiging: een korte zachte tik (ruis rond 1,8 kHz en een sinus van 1,6 kHz, zonder galm).
  Bij een rust van 15 seconden of korter niet, dan valt hij vlak na het afvinken. Met alleen trillen
  is het één korte stoot van 70 ms.
- Android: een klein eigen native deel (`AudioFocusPlugin.java`) vraagt audio focus met ducking
  (`AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`, gebruik sonification) en geeft hem na de klank terug. Het
  staat niet in `native-plugins.json`: de webkant vraagt `Capacitor.isPluginAvailable` en doet in een
  oudere app niets, dus het native niveau hoeft niet omhoog. In de browser kan het niet; dat staat in
  de uitlegzin van Volume.

Hoe elke klank gemaakt is (allemaal synthese met Web Audio, geen opname):

- Koebel: twee blokgolven (587 en 845 Hz) door een bandfilter op 2,6 kHz, twee slagen 160 ms uit
  elkaar, snel uitsterven.
- Pickel op rots: een stoot hoge ruis van 50 ms en drie onharmonische tonen (3,1, 4,7 en 6,9 kHz).
- Cornu: twee zaagtanden en een blok een octaaf lager door een laagdoorlaat die opengaat, een kleine
  toonopslag en vibrato; Bes3 kort, dan F4 aangehouden.
- Vikinghoorn: dezelfde hoorn op A2 (110 Hz), ruwer (meer ontstemming), zachte aanzet van 140 ms,
  ongeveer 1,6 s, zakt aan het eind een fractie en klinkt uit.
- Trommel: drie slagen 0,5 s uit elkaar, een driehoeksgolf die van 105 naar 34 Hz valt met een
  stoot laag gefilterde ruis.
- Bronzen klokken: D5, E5 en A5 met klokboventonen, waaronder een kleine terts (het tweede
  slaggebied van een bianzhong).
- Hyōshigi: twee klappen 0,3 s uit elkaar, smal gefilterde ruis rond 2,1 kHz met twee korte tonen.
- Tempelbel: G3 met een brom een octaaf lager, twee boventonen die een halve hertz zweven, 3,6 s
  uitklank en een zachte stoot van de balk.
- Heldere bel: twee slagen op E6 met twee zachte boventonen.
- Lier: één snaar op G4 met Karplus-Strong.

## Alternatieven

- Opnames voor Cornu en Vikinghoorn (de wens van de eigenaar bij de hoorn). Downloaden van Wikimedia
  Commons werd in de bouwomgeving geweigerd (HTTP 429, ook de omgezette mp3's); OpenGameArt had geen
  passende CC0-hoorn. Daarom synthese. De weg voor een opname staat klaar (`REST_SOUND_FILES`,
  vooraf laden, grens van 1,5 s, terugval, mp3 in de precache) en twee CC0-kandidaten staan in
  `public/sounds/BRONNEN.md`.
- Een migratiestap voor de oude waarden. Niet nodig: het veld blijft optioneel en wordt bij het
  lezen defensief vertaald (`readRestSound`); een test importeert een oude back-up.
- Een vaste luidheid zonder limiter (het oude vaste volume 0,55). Gaf geen grens als twee klanken
  samenvallen en geen manier om door harde muziek te komen.

## Bron

Backlog (Bouwrij, "Rusttimer: nieuwe geluiden"), de woorden van de eigenaar van 11 november.

## Vervangt

De zes geluiden van `docs/beslissingen/2026-10-24-trillen-bij-het-rustgeluid.md` (Klokjes, Bel,
Piep, Boksbel, Fluitje, Gong). Het principe daarvan blijft: trillen volgt het ritme van het geluid.

## Terugdraaien

Een klank weghalen: uit `REST_SOUNDS`, `REST_SOUND_GROUPS`, `VOICES` en de keuze `rustgeluid`, en een
regel in de oude-waardenlijst van `readRestSound` naar een klank die blijft. De limiter weghalen:
`busOf` rechtstreeks op `ctx.destination`. Ducking uit: `duckAudio` uit `deviceShell`.
