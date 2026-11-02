# Sporten die meetellen: pictogrammen, importeren, het scherm Sporten, de weekcheck, de vaste dag, hoeveel per soort en een eigen sport

Datum: 2026-11-02
Status: aangenomen

## Besluit

De ronde "Sporten die meetellen" is gebouwd volgens `docs/visie/Sporten die meetellen.md`, stap 1 en 4 tot en met 9 (stap 2 en 3 staan in de besluiten van 31 oktober). Zwemmen, padel, voetbal, yoga en een sport van jezelf kunnen meetellen voor je benen en je week. Je kiest per sport een rol op het scherm Sporten, een vaste afspraak wordt een vaste rij in je week, en per soort training kies je Minder, Normaal of Meer. Alles wat je planning verandert gaat via het voorstel met Akkoord; wat je vastzette en wat al geweest is blijft, en een log wordt nooit herschreven.

## Hoe het werkt

- Pictogrammen (stap 1): zwemmen, padel en voetbal in stijl C, letterlijk uit `docs/visie/Pictogrammen zwemmen padel voetbal.md`, in salie zoals de eigenaar koos (de crawlzwemmer, de racket met gaten). Een test loopt alle pictogrammen langs.
- Importeren (stap 4): een activiteit van een sport die meetelt krijgt van de bron een eigen sport-id (`ExternalActivity.countedSport`), nooit een veld met een merknaam. Zonder rol staat op Vandaag een rustige regel, geen kaart en buiten "Kaarten op Vandaag": "Je deed padel. Hoe telt dit?". Het blad kiest Telt mee als ik het doe voor (advies, vraag 3) en vraagt hoe zwaar het voelde; Opslaan bewaart de rol en slaat die ene activiteit op. De andere van de laatste dagen komen daarna als gewoon voorstel op Vandaag, zodat elke activiteit zijn eigen tik houdt. Een sport die meetelt heeft een afgeleid sjabloon dat nooit wordt opgeslagen (`engine/sportTemplate.ts`); het staat alleen in de lijst zolang de sport meetelt, dus met Negeren telt een log nergens mee. Het log krijgt `countedSport` en is nooit hardlopen.
- De beenindex: een sport die meetelt telt ook spierschade door remmen en draaien, op de helft van het tempo van kracht, omdat het in stoten gaat (afgeleid, niet getoetst). Een padelpartij van 90 minuten telt de dag erna ongeveer als een beendag, een uur zwemmen nauwelijks.
- Het scherm Sporten (stap 5): Planning heeft één rij Sporten in plaats van drie. Per sport een kaart met pictogram, naam, rol als pil, één regel en een weekstrook. Een sport die ASCEND plant kent geen Negeren: zijn logs zijn trainingen uit je eigen logboek en tellen altijd mee, dus uit heet daar Telt mee als ik het doe. Daarom valt een sport die uit staat zonder keuze nu terug op Telt mee in plaats van Negeren (advies bij vraag 5, voor fietsen standaard Telt mee).
- De weekcheck (stap 6): een gelogde sport is voor de check een vaste dag in het verleden met het profiel van die sport. Een zware beendag van ASCEND binnen de rust erna (48 uur na padel of een voetbaltraining, 72 na een zware wedstrijd, advies bij vraag 1) is een bevinding van LEG-SPACING. De check repareert die nooit zelf: Week toont het feit ("Je speelde gisteren padel.") en een voorstel met Akkoord om de beentraining te verplaatsen. Rustig gespeeld telt niet als zware dag. Met Rust na een zware sport op Korter wordt het 48 en 24 uur.
- De vaste dag (stap 7): de tweede stap in het blad vraagt de dagen, hoe zwaar het meestal is en hoe lang. Het advies is Pittig en een uur (de tekst van 2.3); een wedstrijd kies je zelf op Zwaar. Bekijk wat er verandert opent altijd het voorstel. De rijen staan vooraan in de planningsronde (`engine/fixedSports.ts`), acht weken vooruit, met een slot van jou. In een vakantie of op een tocht vervalt een afspraak (het advies "Laten vervallen") en het voorstel zegt welke. HARD-DAYS (2 harde dagen bij vier trainingsdagen of minder, anders 3) doet alleen iets in een week met een vaste afspraak op Zwaar en maakt dan de laatste harde loop van ASCEND rustig, gemeld. Een gelogde activiteit van die sport vinkt de rij af; Volgehouden telt vaste afspraken niet mee (advies bij vraag 2).
- Hoeveel per soort (stap 8): Kracht, Lange duur, Harde training, Rugzakwandeling (alleen met een tocht), Rustige duur en Fietsen, alleen wat in je weekpatroon staat. Een sjabloon hoort bij een soort via zijn rol; `TemplateRole` kreeg `strength` en `ruck`. Eerst de duur: 15 procent, afgerond op 5 minuten, Meer begrensd door de sessiepiek (advies bij vraag 7, als vaste stap, nog niet als getal instelbaar). Dan het aantal: Meer zet een training van die soort bij op een vrije dag, alleen als de weekcheck er niets nieuws door vindt; Minder laat er een weg als er meer dan één staat. Normaal zet terug wat Meer of Minder deed. Minder op wat je doel vraagt zegt in het voorstel wat het kost.
- Een eigen sport (stap 9): een onbekend type van de bron (`otherType`) geeft "Je deed iets nieuws: tennis. Hoe telt dit?" met de vraag waar je het vooral merkt; dat vult de kenmerken. Het hele lijf is het advies. Een eigen sport telt mee voor je benen en je week; de weekcheck leest alleen de sporten die als gegevensrij bestaan. Yoga staat erbij als gegevensrij, met het pictogram van de rekker.
- Instellingen op de vijf plekken: Sporten en Hoeveel per soort in Planning (12 rijen, het plafond), Hoe sporten meetellen onder Geavanceerd als blad met Vragen bij een nieuwe sport, Vragen hoe zwaar het was en Rust na een zware sport. Beide staan ook onderaan het scherm Sporten.
- Opslag: `SessionLog.countedSport` en `customSport`, `PlannedSession.fixed` en `amount`, en de instellingen `sportCounting`, `kindAmount` en `customSports` zijn optioneel en aanvullend. Ze worden bij een import defensief gelezen in `storage/migrations.ts`; een oude back-up importeert zoals hij was. `sportHandling` en `customSports` worden bij terugzetten per sport samengevoegd, de keuze op dit toestel gaat voor.

## Reden

`docs/visie/Sporten die meetellen.md` en `docs/visie/Pictogrammen zwemmen padel voetbal.md`, met de adviezen bij de open vragen 1 tot en met 8 en de keuze van de eigenaar voor salie, de crawlzwemmer en de racket met gaten.

## Alternatieven

- Een gelogde sport stil laten repareren door de weekcheck, zoals een eigen training van het systeem: het ontwerp vraagt een voorstel, dus niet.
- Negeren voor hardlopen, wandelen en fietsen: dan had de beenindex hun logs moeten weglaten, terwijl het echte trainingen in je logboek zijn. Liever eerlijk Telt mee.
- HARD-DAYS ook voor een week met alleen een gelogde zware sport: de reparatie (een harde loop wordt rustig) kan in het voorstel van Week nog niet als keuze worden getoond. Die week krijgt daarom nu geen bevinding.
- "Laten staan" bij een vaste afspraak in een vakantie, en "Padel tot na de wedstrijd laten rusten?" voor een Top-race: nog niet gebouwd. De afspraak vervalt in een vakantie of tocht (het advies) en blijft staan rond een race (de standaard); je verplaatst hem zelf.
- Minder en Meer als instelbaar getal onder Geavanceerd: nog niet, de drie standen zijn het advies.

## Bron

`docs/visie/Sporten die meetellen.md`, `docs/visie/Pictogrammen zwemmen padel voetbal.md`, `docs/onderzoek/ASCEND voor iedereen.md`, `docs/beslissingen/2026-10-31-sporten-gegevens-en-omrekening.md`, `docs/beslissingen/2026-10-31-sporten-rol-en-belasting.md`.

## Vervangt

Niets. Het vult de besluiten van 31 oktober aan; de terugval van een sport die uit staat (Telt mee in plaats van Negeren) is hier besloten.

## Terugdraaien

Zonder keuze voor een sport, zonder vaste dag en zonder Minder of Meer gedraagt de planning zich zoals eerst (de golden test bewaakt dat). Een stap terugdraaien: de commit van die stap terugzetten. De velden zijn optioneel, dus een back-up met deze velden importeert ook in een oudere versie, die ze laat liggen.
