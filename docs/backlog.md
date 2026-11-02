# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Bijgewerkt op 1 november 2026.

## Loopt nu


Ronde 2 van `docs/onderhoud/2026-11-01-aanpak-backlog.md` (ronde 1 is af, terugblik in `docs/onderhoud/reflectie-2026-11-01.md`).

Live op 2 november: de eerste ondertekende Android-app (release apk-23, sleutel in de environment android-release1), het opsplitsen van AppDataContext en ForgeWorkout, trainingen ruilen in een week, het opsplitsen van opslag en adviezen, Health Connect als bron in de Android-app (alleen lezen, nog niet op een toestel gezien), een plugin blijft niet meer hangen in de Android-app (automatisch bijwerken, meldingen, trillen, terugknop, locatie), Sporten die meetellen (zwemmen, padel, voetbal, vaste dagen, rust na een zware sport, hoeveel per soort, eigen sporten), Waarom staat dit hier, Minder tijd vandaag, zones na een test, details ophalen voor oudere runs, snelkoppelingen en een widget in de Android-app, je locatie (weer op je plek, plek per tocht voor het bergweer) (native niveau 3, nog niet op een toestel gezien), de 48 uur tussen beenzware dagen ook na de lange duurloop, de automatische back-up naar een bestand (Android: Documenten/ASCEND).

Live op 1 november: Stand schuift niet meer zijwaarts, het cijferblok van Forge blijft open, de ochtendkaart na je antwoord, de rustdag die terugkomt, de rustiger fysioregel, de kortere voorschriftregel, het citaat in het Engels, een vakantie bijwerken, trainingen die niet doorgingen, ochtenden in de back-up veilig uitzetten, opmaak samengebracht, de tekstkaart met 21 schermen, drie ontwerprapporten in `docs/visie/`.

Live op 31 oktober: data op lange termijn, run in detail, ochtendkaart vernieuwd met twee van drie, kansen stap 0, zonder doel stap 4 tot 10, onderhoud punt 2 en 3.

## Kan nu, na wat loopt

- Kansen met gegevens, het middelgrote werk (kans A en F, de etappeschatting als band) en het kleine werk dat over was (kans C, D en I): gebouwd op `claude/kansen-middelgroot`, wacht op de poorten (`docs/beslissingen/2026-11-01-kansen-middelgroot.md`). De bestandsroute voor FIT-bestanden als vangnet (stap 0c van het onderzoek) is later.
- Vier tekstpunten uit eerdere Lookout-rondes die zonder screenshot niet terug te vinden waren. Wachten op een screenshot van de eigenaar.

- Zonder doel: de kaart Je week op Je stand (ontwerp 2.8) en de vorm van de week later veranderen bij een andere richting.

## Met voorrang: de planner en de 48 uur (gevonden 2 november)

- De planner zelf zet een lange duurloop en een zware beendag (Benen A) op twee dagen achter elkaar: `scheduler.ts#legSpacingDays` telt een loop met `intensity: 'low'` als rustig volume, terwijl `tpl_long_run` `lowerBodyLoad: 'heavy'` heeft. Dat botst met CLAUDE.md ("twee beenzware sessies niet binnen 48 uur"). Onderzoek klaar (`docs/onderzoek/Lange duurloop en een zware beendag.md`): 48 uur tussen zware beenkracht en de lange duurloop in beide volgordes; het weekendblok (heuvels zaterdag, lange duurloop zondag) blijft vrijgesteld; een instelling, standaard uit, die beenkracht de dag na de lange duurloop toestaat. Bouwen bij de eerstvolgende vrije plek (Sherpa en Warden op opus), met een nieuw besluit dat het 24-uursdeel van `2026-10-27-groei-tot-de-wedstrijdpiek.md` vervangt en de golden die beweegt met de reden in de commit.

## Uit de review van rustdag na rust (voor de terugblik van ronde 2)

- Een training die je zelf oversloeg of waarvan je het inhaalvoorstel afwees, houdt de rustdag tot zeven dagen tegen, ook als er nooit een inhaalvoorstel komt. Dan blijft de dag leeg. `catchUpFits` laat afgewezen inhaalvoorstellen negeren. En `trainedOn` telt een log op `completedDate`, `dayLoads` op de geplande dag (`logDay`); gelijktrekken.

## RPE bij een testloop (onderzoek 2 november, `docs/onderzoek/RPE bij een testloop.md`), ronde 2

Op vraag van de eigenaar. Bouwen bij de eerstvolgende vrije plek (Sherpa, opus; Warden op opus):
- `rpeFactor` in `engine/legFatigue.ts`: de geplande RPE van een test of wedstrijd is 10 (via de rol), zodat een 10 niet als 25 procent zwaarder dan gepland telt.
- `effortFactor` geldt alleen voor kracht; vastleggen met een test.
- Nagaan of een gekoppelde test met inlopen en uitlopen als één blok op RPE 10 binnenkomt; zo ja de belasting splitsen (de 5 km maal de RPE, de rest maal 3).
- Bij een test met RPE 7 of lager in `testJudgment` melden dat hij waarschijnlijk niet maximaal was.
- De ochtend na een test of wedstrijd de vraag "Hoe voelen je benen?" actief aanbieden.
- "gem. zwaarte" in de weekterugblik wordt minuten rustig en hard: gaat mee met de herinrichting van de gegevens in ronde 3.

## Uit de terugblik op ronde 1 (vijf nieuwe punten)

- Vandaag: een vaste volgorde en een maximum voor kaarten boven de missie (ochtendkaart, Niet gedaan?, koppelvoorstel, rustdag terug, back-up). Op een slechte ochtend staan er nu vier boven de missie. Ronde 2.
- Vragen als Niet gedaan? wachten tijdens een ziekmelding, en komen pas terug als je beter bent. Ronde 2.
- Eerst koppelen, dan inhalen: MISSED-CATCH-UP kijkt eerst of er een losse log te koppelen is. Ronde 2.
- Ontwerprapport instellingen, de kleine delen: betere waarden en uitleg in de rijen, de bundel De ochtend, Weer en kleding. Ronde 2.
- Ontwerprapporten gegevens en Forge, de grote herinrichting (Stand met Ritme, weekterugblik, Logboek, Forge zonder snelknoppen en met Alles in het blad Oefening). Ronde 3, na het opsplitsen.
- Geavanceerd in Instellingen wordt een eigen pagina (eigenaar akkoord, 2 november): Planning en Geavanceerd zitten op hun plafond van rijen. Ronde 3, bij de herinrichting.

## Android en web, wens van de eigenaar (1 november)

Eis bij alles: de webapp zonder Android blijft volledig werken. Elke functie werkt los en samen; in de browser een webweg of een nette stilte. De Android-app werkt zichzelf bij (live update) en gebruikt een vaste sleutel, zodat je gegevens bij een update blijven.
- In de Android-opdracht zelf: de terugknop, scherm aan tijdens Forge (in de browser met Wake Lock), trillen, statusbalk en startscherm.
- Ongedaan maken van Verplaatsen zet blind terug, ook als de training intussen gelogd of opnieuw verplaatst is (bij Ruilen opgelost met undoSwap). Ronde 3.
- Gebruikerstest met vier nagemaakte personen (ronde 4) en de herstelronde erna: niet in de sessie van 2 november (eigenaar); later, in een eigen sessie.
- Back-up naar een map die de eigenaar zelf koos (Interne opslag/Ascend_backup) in de Android-app: eenmalig Map kiezen via de mappenkiezer van Android (Storage Access Framework, blijvende toestemming), daarna schrijven Back-up maken en de automatische back-up daarheen, met terugval op Documents/ASCEND en een melding. Vraagt een nieuwe plugin en APK. Op verzoek van de eigenaar later (2 november).
- Eén notatie voor tijden in de hele app (nu "13.05" bij het weer en "06:11" in Instellingen). Ronde 3.
- Nagekomen uit de terugblik op ronde 2: de nieuwe regels op Vandaag (Hoe telt dit?, Minder tijd vandaag, de etappe-regel) in de vaste volgorde en het maximum van kaarten; een doorloop op de telefoon van de eigenaar zodra de Android-sleutel er is (snelkoppelingen, widget, locatie, back-upmap); een opzet voor de spierindex door Scout voordat er iets gebouwd wordt (opdracht loopt; de eigenaar laat de keuze daarna aan de coördinator).
- Nagekomen uit ronde 2b: de factor 0,98 voor de drempelhartslag na een 5 km toetsen (Scout); Sporten lezen echte intervals.icu-types (Swim, Padel, Soccer, Yoga) alleen met nagemaakte data getest; een eigen sport telt niet in de weekcheck; "Laten staan" bij een vakantie en "laten rusten?" rond een Top-race voor vaste sporten; de waarde "Alles normaal" valt af in de rij Hoeveel per soort op 360 px; een test die alle Android-XML vooraf leest (een dubbel streepje in commentaar brak de APK-bouw).
- Coördinaten voor de 36 GR5-etappes uit een GPX die de eigenaar aanlevert (ja, 2 november), zodat de regel op je etappe iets toont. Een fijne plek op Android: nu niet, grof met een eerlijke tekst (keuze aan de coördinator gelaten, 2 november).
- De back-up van Android (naar Google) staat aan, keuze van de eigenaar (2 november), naast de eigen back-up; alleen de opslag van de webview, zonder caches.
- Niet: hartslagband via Bluetooth (eigenaar). Niet gebouwd tenzij de eigenaar het vraagt: camera en een gps-route of spoor van tochten (afgeraden om batterij en privacy; de eigenaar wil alleen weten waar hij is).

## Voor de eigenaar

- Beantwoord (1 november): de snelknoppen in Forge gaan weg; de kolom Alles gebruikt de eigenaar nooit en verhuist naar het blad Oefening. Bouwen met het Forge-ontwerprapport.
- Helemaal aan het eind, als alles klaar is (toestemming van de eigenaar, 1 november): de vakantiedata van de eigenaar uit de geschiedenis van git halen (oude commits van `docs/onderhoud/2026-11-01-aanpak-backlog.md` en de commit c305cb1 die nooit op main kwam). Dat herschrijft geschiedenis op main en de werkbranch; eerst alle helpers stoppen, daarna de deploy controleren.
- De overige vragen uit de drie ontwerprapporten (`docs/visie/Ontwerprapport gegevens.md`, `instellingen.md`, `Forge.md`) kiest de coördinator met het advies; elke keuze staat in de terugblik van de ronde waarin hij gebouwd wordt. Het citaat onderaan Vandaag wordt Engels, zoals de eigenaar al vroeg.

## Uit de ontwerprapporten

- Jaaroverzicht: "Testloop 5 km: 14 jan en 15 jan", twee dagen voor één test. Nakijken of dat een fout in de gegevens of de telling is.
- De vaste doorloop van Lookout gaf Stand helemaal leeg (zonder lucht of titel); een eigen afdruk was wel vol. Nagaan of de kit te vroeg afdrukt.


## Bewust niet

- Voeding naast gewicht en kracht (kans E): de eigenaar laat dit liggen (1 november).

## Ochtendkaart, later

- De kaart leert van jou: hoe ging de training na "moe" of "slecht geslapen", en het advies past zich daarop aan. Hoort bij Kansen (slaap tegenover prestatie).
- Een melding op de telefoon met de vier keuzes, zodat je de app niet hoeft te openen. Na de Android-app.

## Na het herstel van het abonnement (zondag 1 november)

- Spierindex in de kleinste vorm (besluit `2026-11-02-spierindex-klein.md`): melding als een bergspier ontbreekt bij een bergdoel, met voorstel, en de volgorde in `swapOptions`. Ronde 3, met de herinrichting van Forge.
- Grote bestanden opsplitsen: AppDataContext, ForgeWorkout, adviceEngine, database, backup, migrations.
- Android-app (Capacitor), als een van de grote nieuwe features van deze ronde. Lokale meldingen komen daarmee (een PWA zonder server kan geen melding sturen als de app dicht is).
- Android-meldingen met het scherm uit en trillen: het einde van de rust in Forge, de ochtendvraag en de weekmelding (ronde 2b, bij de Android-app). Toestemmingen direct na de installatie, in een korte welkomstreeks met per toestemming één scherm en "Niet nu".
- Korte weekmelding op zondagavond: wat er gebeurde, wat er komt, één tip. Als melding via de Android-app; in de PWA als kaart op Vandaag bij het openen.
- De ochtendkaart met horloge en de vraag "Ben je moe?" duwt de missiekaart onder de vouw op een klein scherm: compacter of de vraag in plaats van de keuzes.
- Startvragen: standaardkeuze is nu "Een tocht of wedstrijd"; nagaan of "Fit blijven" logischer is voor iemand zonder plan.

## Na de Android-app

- Trainingen in je agenda inplannen en afstemmen, met kaders voor ochtend, middag en avond. Nog niet (eigenaar, 1 november): niet in deze ronde bouwen.
- Ook nog niet (eigenaar, 1 november): gesproken signalen, vergrendelen met vingerafdruk, 's nachts horlogegegevens ophalen, delen met één tik. Spraakloggen en een getal op het icoon afgeraden.

## Geparkeerd

- Spierindex stap 3.

## Werkwijze, voor de coördinator

- Een controle op echte data: een script dat een back-up van de eigenaar (alleen in de scratchpad, nooit in de repo) door de engine haalt en dezelfde invarianten toetst. Draaien zodra de eigenaar een back-up stuurt.
- Afspraken die nu alleen in het gesprek staan: de eigenaar stuurt elke zondag een verse back-up, en start na 1 november elke paar dagen een nieuwe chat ("lees docs/backlog.md en ga verder").

## Werkwijze, overig

- Het wekelijkse onderhoud en de appscan op Sonnet laten draaien en na een paar weken kijken wat ze vinden en kosten.
