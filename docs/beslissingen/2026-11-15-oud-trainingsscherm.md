# Het oude trainingsscherm: een uitweg bij wachten, en afvinken met een grens

Datum: 2026-11-15
Status: aangenomen

## Besluit

Het oude trainingsscherm (`ExerciseLogger.tsx`, voor de rustdag, fietsen en de trap) slaat op via `saveOnLogger` in `src/state/logSave.ts`, zoals de kaart Van je horloge via `saveOnCard`. Wat het scherm bij welke uitkomst doet staat daar en is zonder scherm getest; de bronscans zijn weg op een paar regels na die het scherm aan die stap binden.

Na de grens in tijd blijft Opslaan uit, en links onderaan staat dan Sluiten. Bij een losse training zegt de zin wat je kunt doen: "Opslaan duurt langer dan verwacht. Niet in je logboek? Sluit en probeer opnieuw; je invulling blijft bewaard." Dezelfde zin staat op het blad Hoe ging het?. Hij past in twee regels op 360 px. Sluiten wist het concept niet zolang er opgeslagen wordt; een tweede poging wacht op de eerste (`2026-11-14-opslaan-rest.md`).

Onderaan verdelen Waarom deze training en Gedaan, invullen de ruimte: de hoofdknop houdt zijn regel, de andere neemt de rest en mag op 360 px in twee regels. Gemeten in Chromium met Inter: eerst brak Gedaan, invullen op 360 en 390 px in twee regels (72 px hoog), nu zijn beide knoppen 52 px op 360, 390 en 412.

Vandaag en Week vinken een rustdag, een krachttraining in MacroFactor en Gedaan zoals gepland af via `tickOff`: een grens in tijd, en daarna zegt de melding bovenin "Afvinken duurt langer dan verwacht. Kijk zo in je logboek of hij er staat; zo niet, vink hem dan nog eens af." Een schrijffout meldt `logSession` zelf bovenin, zoals voorheen.

Het blad Hoe ging het? leest "stond er al" nu meteen goed (`logOrAlready`): de zin van al gedaan en alleen Sluiten, niet de zin voor mislukt. De sportvraag telt vanaf het begin van het sluiten niet meer als in beeld (`onLeave` op het blad van de instellingen).

## Reden

Backlog I-9, I-30 en I-32 (Pathfinder, Warden, Lookout en Sherpa Opslaan, 14 november). De wachtzin op het oude scherm zei bij een losse training alleen "Je invulling blijft staan", met de knop uit en de enige uitweg het pijltje bovenin. Een knop die wacht heeft een grens en een zichtbare uitkomst (`2026-10-22-kwaliteitspoort.md`); afvinken met één tik had geen van beide als het schrijven bleef hangen.

## Alternatieven

Waarom deze training onderaan weghalen, omdat de i bovenin hetzelfde blad opent. Niet gekozen: knop, i en blad dragen sinds het Info-blad één naam en de knop is de grote ingang; weghalen is een ontwerpkeuze die niet bij deze klus hoort. De twee knoppen onder elkaar zetten. Niet gekozen: de vaste balk onderaan wordt dan ruim 50 px hoger.

Na de grens bij afvinken niets tonen. Niet gekozen: dan wacht de tik zonder uitkomst.

## Bron

Backlog I-9, I-30 en I-32; `docs/beslissingen/2026-11-14-opslaan-rest.md` en `2026-11-14-nee-van-logsession.md` (Nog open).

## Vervangt

Niets. Vult "Nog open" van `2026-11-14-opslaan-rest.md` in, op de opwarmset na (Forge).

## Terugdraaien

Zet `ExerciseLogger.tsx#handleSave` terug op `saveLogWithin` met `formAfterSave`, Today en Week terug op een kale `logSession`, en het blad Hoe ging het? op `logWithOwnNotice` (in de geschiedenis van `src/state/logSave.ts`). Er is geen opgeslagen vorm veranderd.
