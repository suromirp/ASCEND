# Pathfinder: doorloop van claude/weekbudget-kracht

Branch `claude/weekbudget-kracht` (punt 3 van de vorige uitslag: 3.1, 3.2, 3.3, 3.5 en 3.6 gebouwd, 3.4 bewust niet), 15 november. Gelezen: de tekstkaart (`docs/app-kaart/`, stand `zonder-kracht`) en de code. Niet gedraaid en niet op een scherm gezien. Gekozen: het advies van de coördinator is op één punt te ruim, zie punt 2.

## Eerst het ongemakkelijke antwoord

Op de weekplek is de belofte nu waar: Je week-kaart, het blad, Stand, Doel en tochten en de rij Zonder doel noemen met kracht uit geen kracht meer. Maar op Ascend staat vlak onder die kaart nog een rij Krachtblok, "Hoe kracht in je week past", en die doet niets met de keuze.

## Punt 1: Je week, Stand, Doel en tochten, het voorstel bij een richting

Uitslag: klopt. De kaart `ascend-je-week-zonder-kracht` zegt "56 van 90 minuten" en "Dat is onder de richtlijn van 150 minuten. Dat mag een keuze zijn." Geen teller die nooit omhoog kan. De rij Weekbudget zegt "Zonder kracht, Rustig aan" en de rij Zonder doel zegt "90 min". Het voorstel bij een richting noemt alleen minuten en lopen. Geen blokkade.

## Punt 2: rij Krachtblok op Ascend

Uitslag: moet voor main, kleine ingreep.

Op `ascend-zonder-kracht` staat onder Tochten de rij "Krachtblok, Hoe kracht in je week past" (`pages/Ascend.tsx` regel 290). Het blad erachter (`StrengthProgramCard`) laat je een blok maken met drie keer per week en een verdeling. `strengthScheduling.ts` en de kaart kijken niet naar `strengthTrainingOn`, terwijl de planning (`strengthAllows` in `sports.ts` en `weeklyPrescriptionStep.ts`) kracht met kracht uit weigert. Wie op Ascend een blok maakt, zet dus iets in dat de planning negeert. Dat is een dode weg op het scherm dat je elke dag opent, en het zegt het tegendeel van wat je net instelde.

Voorstel: met kracht uit en zonder actief blok (en zonder extern krachtschema) toont Ascend de rij niet. Heb je een actief blok, laat de rij dan staan met de regel "Kracht staat uit in je planning" zodat je het blok kunt beëindigen. Past dat niet in deze branch, zet dan in het besluit eerlijk dat de rij blijft, en zet het als eerste in de backlog. Mijn keuze: voor main, omdat het hier om één rij gaat en de belofte van de branch juist hier zichtbaar breekt.

## Punt 3: richting Sterker worden met kracht uit

Uitslag: later, zoals de coördinator adviseert, met een voorwaarde.

De regel "Kracht staat voorop" staat in `data/directions.ts` (line en effect: "3 keer kracht"), in `directionChange.ts` (`WHAT_IT_DOES.stronger`) en in `StartWizard`. Wie met kracht uit Sterker worden kiest, kiest zelf iets tegenstrijdigs, en de planning geeft hem dan lopen. Een zin schrijven lost dat niet op: het is een productkeuze (de richting verbergen, of zeggen "kracht staat uit, dus dit wordt lopen"). Dat hoort niet als bijwerking in deze branch.

Voorwaarde voor later: noteer het als besluitpunt in de backlog onder "Samenhang", niet als tekstfix. Eén ding mag nu wel mee als het weinig kost: het voorstel bij die richting draagt de zin "Kracht staat voorop" niet over als kracht uit staat (alleen de eerste regel, die nu al goed is, blijft).

## Punt 4: rij Kracht op Stand

Uitslag: later, eigenlijk niet nodig. 

De rij "Kracht, 1 oefening ging omhoog in 8 weken" komt uit Forge en telt wat je werkelijk tilde (logs, ook van MacroFactor). Dat is historie, geen belofte over je week. Met kracht uit en geen logs verdwijnt de rij vanzelf (`forge.off`); heb je wel gelogd, dan klopt de regel. Er hoeft niets te veranderen. Een nagemaakte stand met kracht uit laat de rij zien omdat de proefdata krachtlogs heeft: dat zegt niets over een echte gebruiker.

## Wat niet kon worden gezien

De schermen zelf (geen Lookout), de rij Krachtblok met een actief blok en kracht uit, en wat `strengthScheduling.ts` met een blok doet als kracht uit staat: ik las dat het niet naar de instelling kijkt, ik zag het niet draaien. 3.4 (vaste notitie en uitleg bij de rij Weekbudget zeggen nog "2 keer kracht") staat niet in de kaart, dus ik kan niet zeggen of het zichtbaar is zonder het blad Uitleg te openen.

## Samenvatting

Voor main: punt 2 (rij Krachtblok op Ascend).
Later: punt 3 (richting Sterker worden met kracht uit, als besluitpunt), punt 4 (niets doen), en 3.4 zoals eerder.
