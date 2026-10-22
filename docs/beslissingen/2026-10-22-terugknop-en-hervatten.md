# Terugknop, onthouden waar je was en hervatten na een herstart

Datum: 2026-10-22
Status: aangenomen

## Besluit

De terugknop van Android doet in ASCEND wat je verwacht: hij sluit eerst wat over de pagina ligt, brengt je daarna precies naar de vorige pagina en laat je terugkomen op dezelfde hoogte en met dezelfde keuzes. Na een herstart van de app komt ASCEND terug op de pagina waar je was, als dat binnen een paar uur is.

## Reden

De eigenaar gebruikt ASCEND als geïnstalleerde app op een Android-telefoon. Zijn klacht: de terugknop liet de app trippen, bracht hem niet terug waar hij was en onthield niet waar hij was, op alle pagina's.

Er waren drie oorzaken.

- Een blad, dialoog of scherm dat over de pagina lag was geen stap in de geschiedenis. Terug verliet dus de pagina in plaats van het blad te sluiten.
- De pagina scrolt in `<main>`, en dat element blijft bestaan als je naar een andere pagina gaat. Een nieuwe pagina nam de scrollhoogte van de vorige mee, en terug kwam nergens meer op dezelfde hoogte uit. De `window.scrollTo` in Week deed niets, omdat het venster niet scrolt.
- Wat je op een pagina had gekozen (week, zoekwoord, uitgeklapt) stond alleen in het geheugen van de pagina en ging verloren zodra je wegging.

## Hoe het werkt

- Elk blad en elke dialoog zet bij het openen één stap in de geschiedenis neer, met dezelfde URL en een markering in de state (`utils/backLayers.ts`, haak `utils/useBackToClose.ts`, ingebouwd in `useSheetClose`). Daardoor merkt HashRouter niets. Terug haalt de stap weg en sluit het blad, de bovenste laag eerst. Sluit je het blad zelf, dan haalt het dezelfde stap met history.back() weg. Een blad dat niet dicht mag (een import die bezig is) blijft open. Een stap van een blad dat al weg is omdat je naar een andere pagina ging, wordt bij terug stil overgeslagen.
- Elke stap in de geschiedenis onthoudt zijn eigen scrollhoogte, en de dingen die ertoe doen (gekozen week, zoekwoord, open onderdelen) via `usePageState` (`utils/pageMemory.ts`, sessionStorage met een kleine vertraging en een maximum). Terug zet de hoogte terug zodra de pagina lang genoeg is, en stopt zodra je zelf scrolt. Vooruit naar een nieuwe pagina begint bovenaan.
- De tabbalk volgt de gewoonte van Android: terug vanaf een andere tab gaat naar Vandaag, terug op Vandaag sluit de app. Van tab naar tab wisselen vervangt dus een stap, in plaats van de geschiedenis vol te zetten.
- Na een herstart opent ASCEND op de pagina waar je was als dat binnen de ingestelde tijd is, met Vandaag eronder, zodat terug naar Vandaag gaat. Een herlaad, een snelkoppeling of een gedeeld bestand tellen niet als herstart. Opent de app op een andere tab via een eigen adres, dan komt Vandaag er ook onder.

## Instellingen

Twee instellingen, beide met het advies als standaard en in de zoekindex:

- Terugknop op een tab: eerst naar Vandaag (advies) of naar de vorige tab. Dit is een echte keuze: wie liever precies de volgorde van zijn tabs terugloopt, kiest de tweede.
- Na een herstart: uit, 1, 2 (advies), 4 of 8 uur.

Ze staan optioneel in de instellingen (`tabBack`, `resumeMinutes`) en reizen mee in een back-up. Een oudere back-up zonder deze velden importeert zoals eerst, een onbekende waarde wordt weggelaten en geteld (`storage/migrations.ts#cleanNavigationSettings`).

## Alternatieven

- Elke tik op de tabbalk als nieuwe stap laten bestaan. Eenvoudiger, maar de geschiedenis loopt dan vol en terug moet langs elke tab die je ooit tikte. Blijft beschikbaar als instelling.
- Een blad sluiten met een eigen state in de router. Dat veroorzaakt een extra render van de pagina eronder en werkt niet voor bladen die niet bij een route horen.
- De scrollhoogte in `history.state` bewaren. De router schrijft die state zelf, en het bijhouden van elke scroll in de state kost meer dan een kleine opslag per stap.

## Bron

Een gesprek met de eigenaar over de terugknop van zijn Android. Geen onderzoeksrapport.

## Vervangt

Niets.

## Terugdraaien

Het hervatten staat uit met de instelling "Na een herstart: Uit". De tabbalk gedraagt zich als voorheen met "Naar de vorige tab". Het sluiten van bladen met terug kan je terugdraaien door in `useSheetClose` de aanroep van `useBackToClose` te verwijderen; de rest blijft werken.
