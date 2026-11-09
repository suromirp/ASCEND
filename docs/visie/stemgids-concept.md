# Stemgids van ASCEND (concept, ter keuring)

Status: goedgekeurd door de eigenaar (9 november); vastgelegd als `docs/beslissingen/2026-11-09-stem-van-ascend.md`, dat vervangt `docs/beslissingen/2026-10-27-stem-van-ascend.md` als nieuw besluit (`docs/beslissingen/JJJJ-MM-DD-stem-van-ascend.md`, het oude blijft staan).

Dit is stap 2 van "Alle teksten van ASCEND herschrijven, en Engels erbij" (`docs/backlog.md`). De teksten die hier staan komen uit de echte app, via `docs/teksten/alle-teksten.md` (stap 1). Het "na" is een voorstel, geen wijziging.

## Wat er nu is, gemeten

Op de tekstkaart (nagemaakte data, dubbelen meegeteld, zonder Forge):

- Knoppen zijn al kort: de mediaan is 2 woorden, het langste 8.
- Uitleg is het probleem. 554 zinnen zijn langer dan 70 tekens en 285 daarvan langer dan 120, terwijl de oude regel een uitlegregel van ongeveer 60 tekens vraagt.
- De uitleg achter de i (`src/data/settingsHelp.ts`) heeft 745 regels, gemiddeld 18 woorden, de langste 90.
- Eén ding heeft vaak twee of drie woorden (zie regel 5).

## Waar dit op leunt

Een korte blik op wat goede apps in hun eigen publieke teksten doen: het getal of de uitkomst eerst en de reden een laag dieper, knoppen van één tot drie woorden, een gemiste of slechte dag als informatie en nooit als falen, een voorstel dat zegt wat er verandert en wat niet terug kan, en humor spaarzaam en alleen bij licht nieuws. Dat past bij wat ASCEND al wil. Wat niet mee mag: stellige beloftes ("zonder gokwerk"), urgentie en uitroeptekens, medailles, en kleur als oordeel.

Beperking: dit is een dunne bron. Van schermteksten binnen de apps, foutmeldingen en lege schermen is niets hard gelezen, en een deel van de apps is niet onderzocht. Behandel de regels als een voorstel dat de eigenaar keurt, niet als bewezen. Notities over andere apps staan niet in de repo.

## De regels

De vaste woorden blijven zoals ze zijn: Akkoord, Liever niet, Niet nu, Annuleren, Begrepen, Beter / Normaal / Slechter, Top, Voortop, Verkenning. Je/jij, geen gedachtestreepjes, geen uitroepen, knoppen in zinsletters.

### 1. Het droge feit eerst, één gedachte per zin

Wie het scherm opent wil het getal of de uitkomst, niet de weg ernaartoe. De bron of de reden komt erachter.

- Nu: "Je testloop van za 10 oktober (snelste 5 km in 26:42) past bij een 10 km in ongeveer 56 minuten."
  Voorstel: "10 km past nu bij ongeveer 56 minuten. Je testloop van za 10 oktober: 5 km in 26:42."
- Nu: "Bij gemiddelde groei rond 20 maart: ongeveer 49:51. 45:00 vraagt ongeveer 39 weken; tot 20 maart zijn het er 20."
  Voorstel: "Rond 20 maart haal je ongeveer 49:51. Voor 45:00 heb je 39 weken nodig, er zijn er 20."
- Nu: "Maandag was je zwaarste dag. Eén zware beendag (Lange duurloop): je benen hebben alle ruimte."
  Voorstel: "Eén zware beendag: Lange duurloop. Je benen hebben ruimte."

### 2. Eén laag per keer: de uitkomst op het scherm, de reden achter de i

Op het scherm staat wat het is, achter de i hoe het werkt. De zin op het scherm is hoogstens ongeveer 60 tekens. De uitleg achter de i opent met één zin en heeft hoogstens drie korte punten.

- Nu: "De kaart Intensiteit op Je stand laat zien hoeveel van je loop- en wandelminuten rustig waren. Hier kies je waar ze op gebaseerd is."
  Voorstel: "Hoeveel van je minuten rustig waren. Kies waarop dat rust."
- Nu: "De lichte lucht met bergen bovenaan een tab kan in de avond fel zijn. Hier kies je wanneer ze donker wordt."
  Voorstel: "Wanneer de lucht bovenaan donker wordt."
- Nu: "Elke training telt als minuten maal zwaarte (de 1 tot 10 die je invult). 45 minuten op zwaarte 6 is 270 punten. Een balk is de som van een week: vol is gedaan, licht is nog gepland. Tik op een week om de telling te zien. Bij een test met inlopen telt de rest als rustig."
  Voorstel op het scherm: "Minuten maal zwaarte. 45 minuten op zwaarte 6 is 270 punten." De rest (balken, tikken, test met inlopen) achter de i.

### 3. Een voorstel zegt wat er verandert, met één vaste zin

Alles dat je planning raakt is eerst een voorstel. Die belofte staat overal in dezelfde woorden: "Eerst een voorstel, pas na Akkoord verandert er iets." Wat niet terug kan, staat er vooraf bij.

- Nu: "ASCEND houdt hier rekening mee. Tik op een periode om hem bij te werken. Wat je planning raakt zie je eerst als voorstel; pas na jouw Akkoord verandert er iets."
  Voorstel: "Tik op een periode om hem te wijzigen. Eerst een voorstel, pas na Akkoord verandert er iets."
- Nu: "Heb je vrije dagen, een vakantie of een tocht op komst? Zet ze hier. Je ziet eerst hoe je weken eruit komen te zien; pas na jouw Akkoord verandert er iets."
  Voorstel: "Vrije dagen, vakantie of tocht op komst? Zet ze hier. Eerst een voorstel, pas na Akkoord verandert er iets."
- Nu: "Melden legt de klacht vast, meer niet: je planning verandert er niet door. Bij een klacht aan been of voet toont Vandaag een hint bij zware beentrainingen; jij kiest per training. Je week pas je zelf aan op Week."
  Voorstel: "Melden legt de klacht vast. Je planning verandert er niet door. Bij been of voet toont Vandaag een hint bij zware beentrainingen. Jij kiest per training."

### 4. Geen verwijt, wel de volgende stap

Een gemiste, afgevallen of zware dag is een feit. Geen troost, geen "helaas", geen schuld. Daarna staat wat je kunt doen.

- Nu: "Benen A (zwaar) en Testloop 5 km bleven liggen. Laat los wat blijft liggen: inhalen door te stapelen is geen goed idee."
  Voorstel: "Benen A (zwaar) en Testloop 5 km bleven liggen. Laat ze los. Stapelen helpt niet."
- Nu: "Nog geen loopjes om te vergelijken. Na twee weken met loopjes zie je hier je lijn."
  Voorstel: "Nog geen loopjes. Na twee weken zie je hier je lijn."
- Nu: "Geen open klachten. Heb je last van iets, tik dan de plek aan en meld het."
  Voorstel: "Geen open klachten. Last van iets? Tik de plek aan en meld het."

### 5. Eén woord voor één ding

Hetzelfde begrip heeft overal hetzelfde woord. Vakwoorden die sporters zo gebruiken blijven Engels (1RM, RIR, tempo, fartlek, zone 2), de rest is Nederlands. Nu staat "gepland" op drie manieren in de legenda's: "nog gepland", "licht is nog gepland", "gestippeld is nog gepland". Voorstel: gedaan is vol, gepland is gestippeld, schatting is "schatting".

- Nu: "Punten per training: minuten maal zwaarte. Lichter: nog gepland. ±: geen zwaarte ingevuld, geteld met de geplande."
  Voorstel: "Punten: minuten maal zwaarte. Gestippeld: gepland. ±: geen zwaarte ingevuld, telt als gepland."
- Nu: "Wat elke dag in je benen stopt. Feller is zwaarder, gestippeld is nog gepland. Twee felle vakjes vlak na elkaar zijn zwaar voor je benen."
  Voorstel: "Wat je benen per dag krijgen. Fel is zwaar, gestippeld is gepland. Twee felle vakjes na elkaar zijn zwaar."
- Nu: "Je beenvermoeidheid per dag. Lager is frisser. Vooruit is het een schatting uit je planning, met de marge eromheen."
  Voorstel: "Beenvermoeidheid per dag. Lager is frisser. Wat nog komt is een schatting, met marge."

### 6. Zorg en gezondheid: op het scherm, droog, nooit weggestopt

Een waarschuwing staat nooit achter een tik of in een ingeklapt deel. Gezondheid is "kan helpen", nooit "voorkomt". Korter mag, de waarschuwing zelf blijft volledig.

- Nu: "Voel je je goed, dan mag een rustige training, zoals wandelen of een rustige duurloop. Zware trainingen zijn van je planning gehaald. Krijg je koorts of klachten op je borst, meld dat dan."
  Voorstel: "Zware trainingen zijn uit je planning gehaald. Rustig wandelen of lopen mag als je je goed voelt. Koorts of klachten op je borst? Meld het."
- Nu: "Houd de pijn tijdens het bewegen op 2 van 10 of lager en kijk de ochtend erna. Is het dan erger dan gisteren, dan was het te veel."
  Voorstel: "Houd de pijn tijdens bewegen op 2 van 10 of lager. Is het de ochtend erna erger dan gisteren, dan was het te veel."
- Nu: "Pijn rond de knieschijf na veel dalen is meestal overbelasting. Doe een paar dagen minder trap en afdalen. Fietsen en vlak wandelen gaan vaak wel."
  Voorstel: "Pijn rond de knieschijf na veel dalen komt meestal door overbelasting. Een paar dagen minder trap en afdalen. Fietsen en vlak wandelen gaat vaak wel."
  Deze is al bijna goed: het voorbeeld laat zien dat een regel soms niets hoeft te veranderen.

### 7. Warm waar niets op het spel staat, droog waar het telt

Dit is de oude keuze (C met A waar het moet) in één zin. Humor hooguit één keer per scherm, alleen bij een lege lijst of een geslaagde actie, nooit bij klachten, rust, een botsing of een fout. Geen uitroepen, geen koosnaampjes, geen hype.

- Nu: "Goed verdeeld: het meeste rustig, een paar keer echt hard. Zo groeit je basis en blijf je fris voor de harde dagen."
  Voorstel: "Goed verdeeld: het meeste rustig, een paar keer hard. Zo groeit je basis en blijf je fris."
- Nu: "Je hebt nog geen back-up. Je 13 trainingen staan alleen op deze telefoon."
  Voorstel: ongewijzigd. Droog, een feit, geen drukmiddel. Dit is de maat.
- Nu: "Doeltijd 10 km: 45:00 past nog niet bij je test"
  Voorstel: "Doeltijd 10 km: 45:00 ligt boven je test." Het "nog" belooft iets wat de app niet weet.

## Wat dit niet doet

- Geen redesign en geen nieuwe vaste woorden.
- Geen teksten in de app veranderd. Stap 3 (Scribe herschrijft per scherm, Warden toetst, eerst één tab als proef) wacht op jouw keuring.
- Forge valt er niet onder zolang lijn Forge loopt.
- Engels (stap 4) volgt later. De regels hierboven zijn bedoeld om in beide talen te gelden; de vakwoorden blijven Engels.

## Wat ik van je wil weten

1. Mag de uitleg achter de i omlaag naar hoogstens ongeveer 40 woorden per onderwerp (nu gemiddeld 18 per regel, langste 90)?
2. Is "gedaan is vol, gepland is gestippeld" het vaste paar voor alle legenda's?
3. Loopjes of lopen: nu staan loopjes, loop, buitenloop en testloop door elkaar. Eén woord voor een training die je loopt, en loopjes alleen als telling?
4. Welke Engelse vakwoorden blijven? Voorstel: 1RM, RIR, tempo, fartlek, zone 2, step-down.

## Antwoord van de eigenaar (9 november)

Goedgekeurd, met het advies op elke vraag: de uitleg achter de i hoogstens ongeveer 40 woorden per onderwerp; "gedaan is vol, gepland is gestippeld" voor alle legenda's; "loop" voor een training die je loopt, "loopjes" alleen als telling; Engels blijven 1RM, RIR, tempo, fartlek, zone 2 en step-down. Stap 3 mag beginnen.

## Vervangt

Na keuring `docs/beslissingen/2026-10-27-stem-van-ascend.md`. Tot die tijd geldt het oude besluit.
