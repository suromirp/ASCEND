# Backlog

Wat nog op de lijst staat, zodat een nieuwe sessie het niet uit het gesprek hoeft te halen. De
coördinator houdt dit bij: iets wat live staat gaat eruit, iets nieuws komt erbij met een regel uitleg.
Bijgewerkt op 9 november 2026 (F4d en F4e).

## Inbox

Wat de eigenaar tussendoor meldt, voor het volgende bouwmoment (maandag, woensdag, vrijdag; skill `bouwmoment`).
Vast punt, elk bouwmoment: na de punten hieronder de eerstvolgende open ronde uit het rooster hieronder. Een opmerking over hetzelfde komt bij het bestaande punt. Meteen, tussendoor: iets dat nu stuk is (de app werkt niet, verkeerde getallen in je training, data die verloren kan gaan) en kleine fixes die de coördinator zelf in een paar minuten doet, zonder helper (een tekst, een regel, een getal). De rest gaat in de Inbox.

- 9 november, uit de review van het bouwmoment (Forge afvinken), nog open: de ijkset eens per vier weken is een eigen spoor (KR-12: verandert het voorschrift, uitzonderingen rond tochten en tests, eigen instelling); regel 4 en 5 lezen nu gelijk (zie besluit `2026-11-09-forge-review-afvinken.md`). Stappen 6 tot 8 van het RIR-verslag (vermoeidheid tussen oefeningen) zijn F2.
- 9 november, uit de doorloop: Heuvels en trappen: de echte Overpass-aanroep en de hoogte-aanroep zijn nog niet live gezien; de hoogteaanroep staat in `overpass.ts` en kan later samen met UV en zon in `openMeteo.ts`; vakantieadres en periode "Zonder sportschool" gebruiken de terreinregel nog niet; de afstandszin zonder testloop is alleen met engine-tests gezien, nog niet met een eigen stand in het scherm (zie Lookout r2).
- 8 november, uit de review van het bouwmoment, nog open: de Forge-melding Spieren voor de berg heeft geen eigen schakelaar (Forge zit op het maximum van 6 rijen).

- 9 november, uit de reviews van ronde 3, nog open: feestdagen als voorstel; Reverse Lunge is in de catalogus een dumbbell-oefening; de OpenStreetMap-regel op een vakantieadres (een periode heeft geen eigen plek, vraagt een nieuwe opgeslagen vorm). Toestelstanden (Forge): Standen wissen zonder Terugdraaien; de formulier-`key` in `MachineWeights.tsx`; standen in pond, plaatjesnummers en optrekhulp; het keuzestrookje 'Ook tussenin en erboven schatten' breekt op 390 px; Minder bij een leeg gewichtsveld zegt 'naar 0 kilo'. Tempo: de band en de lijn zijn nog niet gezien met 8 of meer lopen over 4 weken (de kit heeft geen stand daarvoor).
- 9 november, uit R1: de gewichtstrend voedt alleen wat je ziet; Forge (lichaamsgewicht en hulp), rugzakaandeel en beenindex rekenen nog met de laatste weging (Forge via lijn Forge, de rest vraagt een eigen besluit want het raakt `planGolden`); de knop 'Voorstel bekijken' op één regel en het blad Lichaamsgewicht zijn op 360 px alleen beredeneerd, niet in beeld gezien.
- 9 november, uit R2, nog open: hutten via refuges.info wachten op `coords` per etappe in `gr5Stages.ts` (de GPX van de eigenaar omzetten); de kaart Let op op Vandaag verschijnt na het ophalen en kan de ochtendkaart onder de missie schuiven (Lookout met trage processor en een tocht); mogelijk dubbel onweer met het bergweer; de stippen in de tempografiek zijn niet tikbaar; het blad Tempo gebruikt 8 weken, de kaart 12; Meteoalarm is niet leesbaar vanuit een webapp (geen CORS), daarom drempels op Open-Meteo; live netwerk (Open-Meteo-waarschuwing, EAWS) is niet in een echte browser of toestel gezien. Eigenaar (9 november): nog geen GPX van de GR5; hutten wachten tot die er is.
- 9 november, uit F3 en F4a (lijn Forge), nog open: de gewichtstrend in Forge is niet gebouwd, want dezelfde `bodyKg` voedt ook de beenindex (die de nieuwste weging leest); advies: eerst `bodyKg` splitsen in een lastgewicht (Forge, hulp) en een beengewicht, en de trend alleen voor het eerste, in een eigen besluit. De terugknop van het toestel sluit het uitlegblad ook na Lichter of Zwaarder; alleen Terug naar gaat een stap terug. De rest van de uitlegteksten en de handboeken van de NSCA zelf zijn niet nagelezen (alleen webbronnen). Reverse Lunge staat als dumbbell-oefening in de catalogus; een eigen-gewichtvariant is niet gebouwd. De ijkset eens per vier weken (KR-12) blijft een eigen spoor.
- 9 november, aandacht voor de eigenaar bij het bouwen: standen onthouden werkt stil (met Terugdraaien); de periode Zonder sportschool geeft de 3 dagen na een tocht dezelfde lengteregel als de 72 uur rust; de grafiek en tekst achter de i van Tempo bij zone 2 zijn nog niet gebouwd.

- 9 november, wens van de eigenaar (lijn rest): je gewicht ook buiten Instellingen zien. Advies coördinator: op de tab Stand een kleine kaart Gewicht met de trend groot, de laatste weging en datum klein eronder en een rustige lijn van de laatste weken (gedaan vol, de trend als lijn); een tik opent het blad Lichaamsgewicht. In het logboek een weging als eigen regel tussen de trainingen (datum, kilo, bron). Eén mint accent per scherm; instelbaar (kaart aan of uit), standaard aan als er wegingen zijn.

## Rooster voor de bouwmomenten

Per bouwmoment eerst de Inbox, daarna de volgende ronde hieronder. Een ronde heeft tot drie sporen die elkaars bestanden niet raken; ze lopen tegelijk, elk met een eigen helper in een eigen worktree, en gaan samen in één keer naar main. Nooit twee Forge-sporen tegelijk (zelfde bestanden). Afgerond: naar "Live op" en uit dit rooster.

1. Af (8 en 9 november): Planner, tijdsgrens, Spieren voor de berg, Buiten klein, Scout RIR en RPE (`docs/onderzoek/RIR en RPE in krachtapps.md`).
2. Af (9 november): Forge afvinken is de RIR van het doel (stap 1 tot 5; vermoeidheid tussen oefeningen blijft liggen als stap 6 tot 8) ‖ Heuvels en trappen in de buurt ‖ Scout calisthenics en uitleg bij oefeningen (twee verslagen in `docs/onderzoek/`).
3. Af (9 november): Forge gewicht op een toestel (standen onthouden, blad, instelling) ‖ Periode "Zonder sportschool" (feestdagen als voorstel bleef liggen) ‖ Tempo bij zone 2 (Scout, engine en instelling; grafiek en tekst blijven).
Vanaf ronde 4 twee lijnen tegelijk, elk een eigen sessie en branch (`claude/lijn-forge`, `claude/lijn-rest`). Een lijn raakt in deze backlog alleen haar eigen rondes en eigen Inbox-punten aan, haalt voor elke push `origin/main` en de werkbranch binnen en lost botsingen in gedeelde bestanden (instellingen, logboek, backlog) op door beide kanten te houden.

Lijn Forge (alles in `components/forge/`, `engine/forge*`, `strengthModel.ts`, oefeningen):

F1. Af (9 november): de Forge-punten uit de Inbox (review afvinken, toestelstanden) ‖ Forge: ruilen met een echte vervanger.
F2. Af (9 november): vermoeidheid tussen oefeningen (stap 6 tot 8 van het RIR-verslag) ‖ ForgeWorkout opsplitsen, ronde 3 (689 regels), met de lintwaarschuwingen.
F3. Af (9 november): uitleg bij oefeningen, de proef met vijf teksten (model, blad, instelling; Scout en Warden hebben ze getoetst). De rest van de teksten wacht op het oordeel van de eigenaar over lengte en toon; advies: in batches van twintig, elk met een Scout-toets op de techniek.
F4. Calisthenics. Af (9 november): het ontwerp (`docs/beslissingen/2026-11-09-calisthenics-ontwerp.md`) en F4a: modelvelden, drie ladders (push-up, optrekken, dip) met twaalf nieuwe oefeningen, de engine `skillLadder.ts`. F4b en F4c af (9 november): de rij voor een stap met Stap lichter en Stap zwaarder, seconden voor een houding, Ging het netjes, band en extra gewicht (`docs/beslissingen/2026-11-09-calisthenics-forge-rij.md`). F4d en F4e af (9 november): het voorstel voor een stap met Akkoord (`docs/beslissingen/2026-11-09-calisthenics-stapvoorstel.md`) en het doel Vaardigheid met de ladder als trap op Ascend (`docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md`). Open, in deze volgorde: F4f de overige ladders met eigen tekeningen; F4g de planner (opus, `planGolden` beweegt niet).

F5. Lichaamsgewicht als trend, overal (eigenaar 9 november: "een laatste gewicht is helemaal niet betrouwbaar"): Forge (eigen gewicht, optrekhulp, dips), rugzakaandeel en beenindex rekenen met de gewichtstrend uit Health Connect of je wegingen, niet met de laatste weging; zichtbaar, minimalistisch (eigenaar 9 november): bij een oefening met eigen gewicht alleen het getal, bijvoorbeeld "84,2 kg", zonder zin ervoor; pas na een tik op de i staat wat het is (je gewichtstrend) en waarom. Voorbeeld van de eigenaar (MacroFactor Workouts, 9 november, alleen inspiratie): bij een oefening met eigen gewicht een klein bolletje met het gewicht en het aandeel dat meetelt als weerstand (Hanging Leg Raise 50 procent); een tik opent een blad met het gewicht, het aandeel in kilo en procent, één zin uitleg en Gewicht aanpassen. In ASCEND: het bolletje toont alleen het trendgewicht en het aandeel (bijvoorbeeld "84,2 kg · 50%"), het blad de rest; het aandeel per oefening (`bodyweightFraction`, nu op twee oefeningen) aanvullen voor alle oefeningen met eigen gewicht, met bron. MacroFactor gebruikt hier de laatste weging, ASCEND de trend; instelling "Gewicht bij eigen gewicht": Trend (advies) of Laatste weging, met één zin uitleg (eigenaar twijfelde, 9 november). Eigen besluit; de golden scenario's met een doel bewegen niet (met één weging is de trend die weging). ‖ De ijkset eens per vier weken (KR-12, akkoord eigenaar 9 november): één set zo ver als netjes gaat bij één hoofdoefening, niet in een week met een tocht of test, eigen instelling.

Lijn rest (alles buiten Forge):

R3. Af (9 november): de lawineregel zonder bulletin, hoofdletterhulp overal, docs over `SkyPanel`, lege regels, de gestippelde tempolijn. De oudere punten bleken al gebouwd (RPE bij een testloop: `PLANNED_MAX_EFFORT_RPE`, `easyMinutes`, `testEffortRemark`, de ochtend na een test; Vandaag-volgorde: groepen in `todayCards.ts`). Open uit R3: de herinrichting uit de ontwerprapporten (Stand met Ritme, Logboek, Geavanceerd als eigen pagina, één notatie voor tijden), een eigen ronde van een uur of meer met Cartographer.
R4. Stap 1 en 2 af (9 november): alle teksten plat (`docs/teksten/alle-teksten.md`) en de stemgids, goedgekeurd door de eigenaar en vastgelegd in `docs/beslissingen/2026-11-09-stem-van-ascend.md` (vervangt het besluit van 27 oktober). Stap 3 proef af (9 november): de Vandaag-tab herschreven door Scribe, getoetst door Warden en Lookout. Stap 4 (vertaalbestanden, Engels) volgt als alle tabs klaar zijn.
R5. Stap 3 voor Week: waarschuwingen, slepen, inhalen, blad van een geplande training, weekterugblik, jaaroverzicht. Eén tab per keer, met `docs/teksten/alle-teksten.md` als lijst en de stemgids als maat. Eerst in `docs/werkbriefjes/week.md` kijken.
R6. Stap 3 voor Ascend (doelen, klaar voor je doel, GR5, race; ook de kaart in `raceReadiness.ts` die nog de oude vorm van het doeltijdadvies heeft). R7: Stand (en Stand zonder doel). R8: Lichaam, Logboek en Run in detail. R9: Instellingen met de uitleg achter de i (hoogstens ongeveer 40 woorden per onderwerp; Vandaag-onderwerpen zitten op 45 tot 70). R10: de Forge-tab, pas als lijn Forge klaar is.

## Loopt nu

Live op 9 november (lijn Forge, F4d en F4e): in Forge een kaart met het voorstel voor een stap omhoog (toets gehaald) of omlaag (drie trainingen onder de onderkant), met Liever niet en Akkoord; Akkoord zet de oefening in je krachttraining op de nieuwe stap vanaf de volgende keer dat je die training opent, met Ongedaan maken op de kaart en Terug naar in het blad van de oefening; instelling Stap voorstellen. Op Ascend een kaart Vaardigheid met de ladder als trap (doel toevoegen via de tegel Vaardigheid, een stap op de ladder van push-up, optrekken of dip), gehaalde stappen blijven gehaald, instelling Vaardigheidsdoelen tonen (in het nieuwe blad Op de Ascend-tab met de Seizoensstrook). Een vaardigheid is een eigen model met eigen opslag (`skillGoals` in meta) en geen TrainingGoal: zo stuurt hij de planning nooit en wordt hij nooit het hoofddoel; geen hogere schemaversie, wel `migrateSkillGoals` in de back-upketen. Open: de Vaardigheidskaart met gehaalde stappen is niet met echte logs in beeld gezien; Liever niet bij een stapvoorstel staat alleen in localStorage (niet in de back-up); toevoegingen van Spieren voor de berg gaan nog niet mee in het concept van een lopende sessie; bij het maximum van 20 trainingen toont Akkoord gelukt terwijl de stap niet geldt; een back-up uit een nieuwere versie met een onbekende ladder bewaart die vaardigheid verborgen; de planner (F4g) en de overige ladders (F4f) volgen.

Live op 9 november (lijn Forge, F4b en F4c): in Forge heeft een oefening op een ladder de regels Stap x van y, Toets en een uitleg, met Stap lichter en Stap zwaarder (alleen het scherm, zoals Ruilen; na een afgevinkte set weg); een houding (Dead hang, Steunhouding) heeft seconden in het cijferblok zonder RIR; Ging het netjes? na een set vanaf de onderkant (achteraf te wijzigen in het setmenu); een band (Licht, Middel, Zwaar) bij Pull-Up en Dip, een set met band telt niet voor de stap; extra kg bij de stappen met gewicht; de decline push-up zegt "met je voeten verhoogd"; een set Pull-Up of Dip met minstens 2,5 kg telt bij het lezen voor de stap met extra gewicht. Drie instellingen (Stappen bij calisthenics, Ging het netjes?, Band bij optrekken en dip). Open: een stopwatch bij een houding; een stap omhoog of omlaag als voorstel is F4d.

Live op 9 november (lijn Forge, F3 en F4a): uitleg bij oefeningen (In het kort in drie regels, Lees verder, Lichter en Zwaarder, instelling Uitleg standaard uitgeklapt; vijf teksten getoetst door Scout, de incline press en de push-up kregen een correctie), en de grond voor calisthenics (ladders van push-up, optrekken en dip, `skillLadder.ts`, drie optionele logvelden `seconds`, `band` en `clean`; nog niets zichtbaar in Forge). Ruilen biedt een ladderstap alleen bij dezelfde ladder aan. Gezien: de uitleg op 360 en 390 px met Beweging Volledig, Rustig en Uit op een testoefening; niet gezien: de echte vijf teksten in beeld en de ruilbladen.

Live op 9 november (lijn rest, R3): de lawineregel bij een tocht in de sneeuw zonder bulletin ("Geen lawinebulletin gevonden voor je tocht. Kijk bij de lawinedienst." met de link, in `ink-dim`), `capitalize` in elf bestanden in plaats van eigen kopieën, de docs over `SkyPanel` rechtgezet, lege regels weg en de tempolijn gestippeld en gedimd bij 'geen duidelijke verandering'.
Live op 9 november (lijn Forge, F2): vermoeidheid tussen oefeningen (harde sets voor dezelfde spieren eerder in de training stellen de eerste set bij, instelling Vermoeidheid tussen oefeningen, besluit `2026-11-09-forge-vermoeidheid-tussen-oefeningen.md`; de drempels zijn nog niet op echte trainingen getoetst), ForgeWorkout van 1038 naar 689 regels (zes nieuwe hooks en onderdelen) en de lintwaarschuwingen in Forge weg.
Live op 9 november (lijn rest, R2): weerwaarschuwingen (onweer, windstoten, hitte) en lawinegevaar (EAWS) als kaart Let op op Vandaag, twee instellingen, alleen tekst; Tempo bij zone 2 met een i, een blad en een grafiek per loop.


Live op 9 november (lijn Forge, F1): de reviewpunten van Afvinken telt als het doel (`forgeKg` in het log, strengere `allAtTop`, regel 5 leest de bevestigde RIR, pauze, uitlegzin bij de bolletjes), Standen wissen met Terugdraaien en het strookje Ook schatten, en Ruilen met echte vervangers (twee groepen, Aanbevolen, reden per oefening). Open uit F1: pond, plaatjesnummers en optrekhulp bij de toestelstanden; het keuzestrookje en Terugdraaien zijn op 360 en 390 px gezien, Rustig niet.
Live op 9 november (lijn rest, R1): Heuvels-alleen omzetten bewaart meteen, `isGymStrengthTemplate`, de heuvelregel ook in een periode Zonder sportschool, een vaste sport in zo'n periode blijft staan met een regel in het voorstel, duidelijker reden bij terugzetten van de lengte, hoofdletterhulp samengebracht, `.sky-panel` weg, 'Voorstel bekijken' op één regel, en de gewichtstrend (instelling Gewichtstrend gebruiken, alleen voor wat je ziet).

Live op 9 november (derde bouwmoment, ronde 3): Forge toestelstanden (stil onthouden met Terugdraaien, Minder en Meer springen naar de vorige en volgende stand, blad Standen van dit toestel, instelling Standen onthouden), de periode Zonder sportschool (Eigen gewicht, Licht of Gewoon, Heuvels in de buurt als tekst, instelling Kracht zonder sportschool), Tempo bij zone 2 uit stabiele stukken (engine, oude lopen op de achtergrond bijgewerkt met een budget, instelling).

Live op 9 november (eerste deel): Forge afvinken telt als het doel (instelling in Rekenmodel, bevestigde sets, strengere stap, vragen bij twijfel, twee nieuwe logvelden met migratie), Heuvels en trappen in de buurt (OpenStreetMap, instelling), ForgeWorkout verder opgesplitst (993 regels), gedeelde hulpfuncties, re-exports en dode code weg, regen per plaats, de afstandszin op Vandaag ook zonder testloop, drie onderzoeksverslagen.

Live op 8 november (tweede bouwmoment): regen in het komende uur en maanstand (twee instellingen in Weer en kleding), de telling "weg door je tijdsgrens" klopt bij Lichter, ForgeWorkout een eerste keer opgesplitst, gedeelde mean, stdev, median en joinNL in utils, 27 exports privé, de afstandszin op Vandaag in het enkelvoud bij één loop.

Live op 8 november: één weektelling (week binnen de fase) op Vandaag en Stand, de weekcontrole die niet meer heen en weer schuift (en een testverplaatsing als laatste keuze van het voorstel), de tijdsgrens zegt het bij de oefening met Terugzetten, Spieren voor de berg ook in Forge, Tempo bij zone 2 op vlak tempo en de afstand op Vandaag uit je echte lopen. De 48 uur na de lange duurloop stond al op main sinds 2 november.


Ronde 2 van `docs/onderhoud/2026-11-01-aanpak-backlog.md` (ronde 1 is af, terugblik in `docs/onderhoud/reflectie-2026-11-01.md`).

Live op 2 november: de eerste ondertekende Android-app (release apk-23, sleutel in de environment android-release1), het opsplitsen van AppDataContext en ForgeWorkout, trainingen ruilen in een week, het opsplitsen van opslag en adviezen, Health Connect als bron in de Android-app (alleen lezen, nog niet op een toestel gezien), een plugin blijft niet meer hangen in de Android-app (automatisch bijwerken, meldingen, trillen, terugknop, locatie), Sporten die meetellen (zwemmen, padel, voetbal, vaste dagen, rust na een zware sport, hoeveel per soort, eigen sporten), Waarom staat dit hier, Minder tijd vandaag, zones na een test, details ophalen voor oudere runs, snelkoppelingen en een widget in de Android-app, je locatie (weer op je plek, plek per tocht voor het bergweer) (native niveau 3, nog niet op een toestel gezien), de 48 uur tussen beenzware dagen ook na de lange duurloop, de automatische back-up naar een bestand (Android: Documenten/ASCEND).

Live op 1 november: Stand schuift niet meer zijwaarts, het cijferblok van Forge blijft open, de ochtendkaart na je antwoord, de rustdag die terugkomt, de rustiger fysioregel, de kortere voorschriftregel, het citaat in het Engels, een vakantie bijwerken, trainingen die niet doorgingen, ochtenden in de back-up veilig uitzetten, opmaak samengebracht, de tekstkaart met 21 schermen, drie ontwerprapporten in `docs/visie/`.

Live op 31 oktober: data op lange termijn, run in detail, ochtendkaart vernieuwd met twee van drie, kansen stap 0, zonder doel stap 4 tot 10, onderhoud punt 2 en 3.

## Kan nu, na wat loopt

- Kansen met gegevens, het middelgrote werk (kans A en F, de etappeschatting als band) en het kleine werk dat over was (kans C, D en I): gebouwd op `claude/kansen-middelgroot`, wacht op de poorten (`docs/beslissingen/2026-11-01-kansen-middelgroot.md`). De bestandsroute voor FIT-bestanden als vangnet (stap 0c van het onderzoek) is later.
- Vier tekstpunten uit eerdere Lookout-rondes die zonder screenshot niet terug te vinden waren. Wachten op een screenshot van de eigenaar.

- Zonder doel: de kaart Je week op Je stand (ontwerp 2.8) en de vorm van de week later veranderen bij een andere richting.

## Forge, wens van de eigenaar (3 november)

- Herhalingen schatten bij een ander gewicht: vul je in een werkset zelf een ander gewicht in, dan rekent Forge het aantal herhalingen uit dat je bij dat gewicht waarschijnlijk haalt (uit je geschatte kracht en de gevraagde RIR, dezelfde rekenregel als het voorschrift), zoals MacroFactor dat doet. Alleen een voorstel in het vak, nooit over iets wat je zelf invulde. Nu bestaat alleen `forgeInput.ts#carryChange`, dat een gelijke waarde doorschuift, geen schatting.
- Na afvinken de volgende set bijstellen: vink je een set af met meer of minder herhalingen (of een andere RIR) dan gevraagd, dan stelt Forge de herhalingen (en zo nodig het gewicht) van de volgende, nog open werkset bij naar wat hij nu verwacht. Niet bij een set die je zelf al aanpaste of afvinkte; een bestaand log blijft onaangeroerd. Instelbaar (standaard aan), met besluit en tests; past bij de herinrichting van Forge in ronde 3.

## Forge naast MacroFactor, training van 3 november (Benen A)

Live op 3 november: lichtere terugsets na een zware topset, opwarmen naar de sprong toe, "Hoeveel over?" na een set, een stap zwaarder ruim boven het bereik, de regel onder de lege stang en het voorstel voor een toestel in ponden (besluit `2026-11-03-forge-na-de-eerste-vergelijking.md`). Nog open: de regel "per kant ..." onder elke set en het percentage van je maximum horen bij het ontwerprapport Forge.

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
- Gebruikerstest met vier nagemaakte personen (ronde 4) en de herstelronde erna: niet in de sessie van 2 november (eigenaar); later, in een eigen sessie.
- Back-up naar een map die de eigenaar zelf koos (Interne opslag/Ascend_backup) in de Android-app: eenmalig Map kiezen via de mappenkiezer van Android (Storage Access Framework, blijvende toestemming), daarna schrijven Back-up maken en de automatische back-up daarheen, met terugval op Documents/ASCEND en een melding. Vraagt een nieuwe plugin en APK. Op verzoek van de eigenaar later (2 november).
- Forge: Ruilen op een toegevoegde bergspieroefening die na Uit deze training halen met afgevinkte sets in de sessie blijft, doet stil niets (ForgeWorkout swap). Verbergen of de prescriptie van de sessie gebruiken. Klein.
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
- Startvragen: standaardkeuze is nu "Een tocht of wedstrijd"; nagaan of "Fit blijven" logischer is voor iemand zonder plan.

## Na de Android-app

- Trainingen in je agenda inplannen en afstemmen, met kaders voor ochtend, middag en avond. Nog niet (eigenaar, 1 november): niet in deze ronde bouwen.
- Ook nog niet (eigenaar, 1 november): gesproken signalen, vergrendelen met vingerafdruk, 's nachts horlogegegevens ophalen, delen met één tik. Spraakloggen en een getal op het icoon afgeraden.

## Gewicht uit Health Connect, verder (live 4 november)

- Een trend over de wegingen uit Health Connect in plaats van de nieuwste weging: dagelijks wegen schommelt en Forge rekent ermee.
- Zoeken: "Uit Health Connect" vindbaar maken met de reden waarom de rij soms niet zichtbaar is.
- Na "Gewicht toestaan" de uitkomst van de ronde tonen (gelukt, geen wegingen gevonden).
- Vraag aan de eigenaar: je gewicht met trend op Stand? Meenemen in het ontwerprapport voor Stand.

## Forge: ruilen met een echte vervanger (wens 4 november)

- Bij Ruilen eerst de oefeningen die echt hetzelfde doen: dezelfde beweging, dezelfde hoofdspieren en dezelfde hoek (Barbell Bench Press naar Dumbbell Bench Press, Smith Machine Bench Press, Machine Chest Press). Bovenaan, met een korte reden, en de beste als aanbevolen.
- Daaronder, apart, de rest die dezelfde spier raakt maar anders (dips, incline, close grip, push-up).
- Nu (`engine/forgeWorkout.ts#swapScore`) telt alleen gedeelde spieren en het bewegingspatroon, waardoor dips boven de dumbbell bench press staat. Nodig: per oefening een fijnere beschrijving (hoek vlak, schuin of dalend, grip, bereik, stabiliteit) of een lijst met echte vervangers per oefening.
- Eerst Scout: hoe MacroFactor Workouts vervangers kiest en toont, en wat de literatuur zegt over welke oefeningen elkaar echt vervangen. Daarna Cartographer voor het blad, Sherpa (sonnet, geen planning) voor de engine.

## Forge: uitleg bij oefeningen (wens 4 november)

- Eén overzicht per oefening: wat het is, hoe de beweging gaat, welke spieren, waar je op let. Bovenaan "In het kort" met de twee of drie belangrijkste punten, daaronder "Lees verder" voor wie meer wil.
- Nu heeft elke oefening (120 in `src/data/exercises.ts`) drie korte regels (Doen, Let op, Vaak fout). Te kaal, en soms klopt het niet: bij de 45° Incline Barbell Press staat "een lichte helling".
- Taal: fijn om te lezen, concreet, duidelijk, niet te lang. Geen letterlijke vertaling uit het Engels; Engelse vaktermen alleen waar een sporter ze zo gebruikt.
- Nieuwe rol: een copywriter (vaste naam Scribe) in `.claude/agents/`, op sonnet. Scribe schrijft of herschrijft, Scout controleert de techniek, Warden toetst aan de stem van ASCEND (`docs/beslissingen/2026-10-27-stem-van-ascend.md`).
- Eerst Scout: hoe MacroFactor Workouts de uitleg opbouwt, wat goed werkt en wat niet. Daarna een proef met vijf oefeningen ter keuring door de eigenaar, pas dan de rest.
- Scout zoekt per oefening ook op hoe je hem echt goed doet, liefst geverifieerd: onderzoek, erkende bonden of opleidingen (NSCA, ACSM) en ervaren coaches, met de bron in `docs/onderzoek/`.
- Planning (eigenaar, 4 november): niet deze week. Deze week geen grote aanpassingen meer, het abonnement staat al op 60 tot 70 procent. Ruilen met een echte vervanger ook pas daarna.

## Forge: gewicht op een toestel makkelijk invullen (wens 5 november)

- Nu: een toestel heeft een vaste stap (1,25, 2,5, 5 of Anders), of een eigen lijst die je per toestel via een lange lijst toevoegt. Een blok dat niet in gelijke stappen oploopt (bijvoorbeeld 7, 14, 23, 32) krijg je zo niet goed ingesteld, en het is te veel tikken.
- Gewenst: een andere manier. Richting om uit te zoeken: in Forge gewoon het getal intikken dat op het blok staat, en Forge onthoudt per toestel welke standen er zijn en biedt die daarna aan (vorige en volgende stand). Geen instelling vooraf nodig.
- Eerst Cartographer voor het invullen in Forge en het blad in Je sportschool, dan Sherpa. Raakt Forge en opslag van het sportschoolprofiel (opus).

## Spieren voor de berg: ook buiten de weekterugblik (vraag 5 november)

- Het voorstel (bijvoorbeeld Tibialis Raise erbij in Benen B) staat nu alleen in de weekterugblik, met opzet rustig. De eigenaar vond het daar pas laat te vinden.
- Richting: ook laten zien in Forge bij het openen van de training waar de oefening bij zou komen, of één keer op Vandaag. Nog kiezen.

## Weekcontrole die heen en weer schuift (gevonden 5 november)

- In een week met een test botsen twee regels: "frisse benen voor de test" zet de zware beendag eerder, "genoeg ruimte tussen zware dagen" zet hem terug. Binnen één ronde eindigt alles weer waar het stond. De melding is opgelost (alleen een echte verandering telt), de botsing zelf nog niet.
- Nodig: de planner kiest in zo'n week één oplossing die beide regels haalt, of laat het als zorg in Week staan met een voorstel. Planning, dus Sherpa en Warden op opus; `planGolden.test.ts` beweegt niet.

## Alle teksten van ASCEND herschrijven, en Engels erbij (wens 5 november)

- Doel: natuurlijker en korter, zoals goede apps het doen (MacroFactor en andere als voorbeeld). Makkelijk te lezen, nooit te veel uitleg in één keer. Engelse vaktermen mogen Engels blijven waar sporters ze zo gebruiken (1RM, RIR, tempo, fartlek), de rest gewoon Nederlands.
- De app komt in twee talen: Nederlands en Engels, te kiezen in Instellingen.
- Stap 1: alle teksten van de app plat in één document (schermen, knoppen, meldingen, uitleg achter de i, voorstellen), per scherm gegroepeerd, met waar ze in de code staan. Kan grotendeels uit de tekstkaart (`docs/app-kaart/`) en `src/data/settingsHelp.ts`. **Klaar (9 november, R4):** `docs/teksten/alle-teksten.md`, gemaakt met `node scripts/app-kaart/teksten-plat.mjs`; zonder Forge.
- Stap 2: Scout kijkt hoe MacroFactor en twee of drie andere apps hun teksten schrijven (lengte, toon, wat achter een tik zit). Daarna een nieuwe stemgids die `docs/beslissingen/2026-10-27-stem-van-ascend.md` vervangt, eerst ter keuring door de eigenaar. **Klaar als concept (9 november, R4):** `docs/visie/stemgids-concept.md`, wacht op keuring door de eigenaar; de bron was dun (drie apps echt gelezen), dat staat erin. Er is nog niets in de app veranderd.
- Stap 3: Scribe (de copywriter, zie de uitleg bij oefeningen) herschrijft per scherm, Warden toetst. Eerst één tab als proef. **Proef af (9 november, R4):** Vandaag. Er is nog geen aparte Scribe-rol in `.claude/agents/`; de proef draaide als `ontwikkelaar` op sonnet met de stemgids in de opdracht. Verder per tab, zie R5 tot R10 in het rooster.
- Stap 4: de teksten uit de code halen naar een vertaalbestand per taal, zodat Engels erbij kan. Groot werk in alle componenten; de engine geeft nu ook zinnen terug, die moeten mee. Sherpa op sonnet, per tab.
- Samen met de uitleg bij oefeningen oppakken. Niet deze week.

## Onderzoek: hoe de beste apps RIR en RPE bijhouden (wens 5 november)

- Snel leren van de beste krachtapps (MacroFactor Workouts, RP Hypertrophy, Hevy, Strong, JuggernautAI, Boostcamp): hoe vragen ze RIR of RPE (wanneer, hoe vaak, met hoeveel tikken), wat doen ze ermee (gewicht en herhalingen voor de volgende set of training), en hoe leggen ze het uit.
- Plus wat onderzoek zegt over hoe goed mensen hun RIR schatten en hoe je dat beter maakt.
- Ook (eigenaar, 7 november): vermoeidheid tussen oefeningen. Forge rekent nu alleen binnen een oefening met vermoeidheid (`fatigueFactor`); wat je eerder in de training voor dezelfde spieren deed telt niet, alleen indirect via je historie als de volgorde gelijk blijft. Voorstel: de harde sets voor dezelfde hoofdspieren eerder in de training tellen, afgezet tegen wat je daar normaal voor deed, en de eerste set daarop bijstellen; hoeveel per set leren uit je eigen trainingen. Uitzoeken hoe MacroFactor en anderen dit doen en wat onderzoek zegt over voorvermoeidheid.
- Uitkomst: een kort verslag in `docs/onderzoek/` met wat Forge kan overnemen, als punten naast wat Forge nu al doet (Hoeveel over?, aangenomen RIR, rekent mee).
- Scout op opus. Kan vóór de grote Forge-onderdelen (vervanger, uitleg, toestel) omdat het die richting geeft.

## Forge: afvinken is de RIR van het doel (wens 5 november)

- Nu: vink je een set af zonder RIR te kiezen, dan bewaart Forge het doel als aangenomen RIR (`rirAssumed`). Die telt niet mee voor je geschatte kracht en voor de stap zwaarder, met opzet: anders bevestigt de voorspelling zichzelf.
- Gewenst: afvinken betekent "gedaan zoals gepland". Haal je de herhalingen van het doel, dan telt de RIR van het doel als echt. Alleen bij twijfel komt de vraag met bolletjes (Hoeveel over?): minder herhalingen dan het doel, ruim meer dan het bereik, of een eerste keer op een nieuw gewicht.
- Ook voor eerdere workouts (eigenaar): als regel bij het lezen, niet door logs te herschrijven. Een oude set met `rirAssumed` en de herhalingen van het doel telt dan ook mee; het log zelf blijft zoals het is (append-only).
- Uitzoeken: of dat de schatting en de stap zwaarder te snel laat lopen (een set met precies de voorspelde herhalingen is geen nieuw bewijs). Koppelen aan het onderzoek naar RIR en RPE in de beste apps. Forge-engine, dus Sherpa en Warden op opus.

## Periode "Zonder sportschool" (wens 6 november)

- Een vierde soort periode naast Vakantie zonder training, Tocht met rugzak en Vrije dagen: je bent weg, kunt wel lopen, maar hebt geen sportschool.
- Lopen blijft staan, korter en rustiger dan thuis (vakantie: geen opbouw, geen test). Kracht in de sportschool wordt een korte sessie met je eigen gewicht (squats, lunges, push-ups, kuitheffingen; 15 tot 20 minuten), of vervalt als je dat kiest.
- Twee keuzes bij de periode: "Heuvels in de buurt" (een loop wordt rustig heuvels op en beheerst af, goed voor een bergdoel) en "Hoeveel": Licht (2 keer lopen, het advies) of Gewoon (wat er stond, zonder sportschool).
- Zoals de andere periodes: een voorstel met Akkoord, de periode pas bij Akkoord opgeslagen (`engine/leave.ts`, `engine/leaveBlock.ts`, `engine/leaveProposal.ts`). Een bestaande vakantie kun je omzetten in dit soort.
- Planning, dus Sherpa en Warden op opus; `planGolden.test.ts` beweegt niet. Instelling en uitleg in de gewone plekken.

## Buiten: UV, zon en hoogte uit Open-Meteo (akkoord eigenaar 7 november, bouwen)

- UV-index: bij een lange loop of tocht op een dag met UV 6 of hoger één korte regel ("UV 7 rond het middaguur: zonnebrand en een pet kunnen helpen"). Bij de weerregel, niet als eigen kaart. Instelbaar, standaard aan.
- Zonsopkomst en zonsondergang: bij een training buiten "Licht tot 17.12" als de training na zonsondergang zou eindigen, en in de weerregel van de dag. Eén notatie voor tijden (zie de backlog: "13.05" en "06:11").
- Hoogte van een plek: de hoogte van je locatie of vakantieadres, voor de heuvelplekken hieronder en bij een tocht.
- Alles uit de bestaande koppeling (`src/integrations/openMeteo.ts`, daily `uv_index_max`, `sunrise`, `sunset`; de elevation-API), zonder sleutel, met een tijdgrens en een nette stilte zonder netwerk. Verandert de planning nooit. Sherpa op sonnet.

## Heuvels en trappen in de buurt via OpenStreetMap (akkoord eigenaar 7 november, bouwen)

- Overpass-API (OpenStreetMap, gratis, zonder sleutel): zoek binnen een straal (standaard 3 km) heuvels en hellingen, trappen (`highway=steps`), onverharde paden en sportvelden of een atletiekbaan, en met de hoogtes uit Open-Meteo het hoogteverschil.
- Waar je het ziet: bij een heuveltraining, een trap- of bergconditietraining en in een periode "Zonder sportschool" een regel als "Op 1,2 km een helling van 60 m" met een link naar de kaart (openstreetmap.org, buiten de app). Op je eigen locatie of het adres van een vakantie.
- Privacy: alleen een afgeronde positie naar Overpass (zoals het weer), niets bewaard behalve het resultaat per plek op dit toestel, geen adres in de repo of de back-up tenzij je dat kiest. Instelbaar, standaard aan na een eerste vraag.
- Koppelen aan het onderzoek naar trainingsplekken en aan de periode "Zonder sportschool". Adapter in `src/integrations/`, engine kiest wat geschikt is, component toont. Sherpa op sonnet voor de adapter en het scherm, opus alleen als het de planning raakt (dat doet het niet: alleen een regel).

## Voor de GR5 en de bergen (akkoord eigenaar 7 november)

- Weerwaarschuwingen (Meteoalarm, open feeds per land): onweer, hitte, storm op de dag van een tocht of lange training, als regel met het droge feit eerst. Nooit stil iets aan de planning; hoogstens een voorstel.
- Hutten langs de GR5 via refuges.info (gratis, zonder sleutel): plaatsen, water, open of dicht, bij de etappes op de Ascend-tab. Hangt samen met de coördinaten van de 36 etappes (GPX van de eigenaar, zie Android en web).
- Lawinebulletins (EAWS, open formaat): alleen als een tocht in het sneeuwseizoen valt; anders niet tonen.
- Volgorde: na de twee punten hierboven.

## Regen in het komende uur, feestdagen, oefeningendatabase, maanstand (akkoord eigenaar 7 november)

- Regen in het komende uur: Open-Meteo `minutely_15` (zelfde koppeling als het weer). Vlak voor een training buiten één regel: "Over 20 minuten regen; nu gaan of om 18.30." Alleen op de dag zelf en alleen als de training binnen twee uur begint. Instelbaar, standaard aan. Klein, Sherpa op sonnet, samen met UV en zon.
- Feestdagen: Nager.Date (gratis, zonder sleutel), voor Nederland en voor het land van een vakantie. Een feestdag is een voorstel, nooit stil: "Donderdag is Hemelvaart: zet je de lange training daar neer?" Liever niet laat alles staan. Eén keer per jaar ophalen, op dit toestel bewaren, zonder netwerk niets. Raakt de planning via een voorstel: de engine-regel op opus, tekst en instelling op sonnet.
- Oefeningendatabase: wger (open source, CC-BY-SA) als bron bij de uitleg bij oefeningen, de echte vervangers en de Engelse versie. Nooit letterlijk overnemen: herschrijven door Scribe, techniek getoetst door Scout, licentie en bron vermeld zoals bij de tekeningen (`ATTRIBUTION.md`). Geen koppeling in de app, alleen bij het schrijven.
- Maanstand: zonder API uit te rekenen. Bij een avondtocht of bivak één regel ("Volle maan, je ziet het pad zonder lamp"). Klein, bij de bergpunten.

## Tempo bij zone 2 beter maken (eigenaar 7 november: "wat matig")

- Engine en instelling gebouwd op main (9 november) (stap 1 tot 5, besluit `2026-11-09-tempo-stabiele-stukken.md`). Nog open: stap 6, de grafiek (elke loop als stip, warme gedimd, de lijn met band, as met tempo's), en stap 7, de tekst achter de i met de bronnen. Klein: een oude `aerobicProgressCelebrated` (op het midden van de band) na 14 dagen negeren; het dauwpunt in het weer per loop; de regel voor benen die niet uitgerust zijn (hoofdstuk 5 van het verslag).

- Nu (`src/engine/aerobicTrend.ts`): alleen geplande rustige en lange duurlopen, met de gemiddelde hartslag van de hele loop, per week één punt. Met twee of drie loopjes per week en twee die buiten zone 2 vallen geeft dat drie punten en een uitspraak ("17 seconden sneller") die sterker klinkt dan de data draagt.
- Meer en betere data: uit de reeksen van het horloge (run in detail, `storage/activityDetail.ts`) de stukken van minstens 5 minuten stabiel in zone 2 op vlak terrein, uit elke loop (ook in- en uitlopen van intervallen en de lange duurloop), in plaats van één gemiddelde per loop. Gecorrigeerd voor helling (tempo naar vlak omgerekend) en warmte (`engine/heatPace.ts`), en hartslagdrift (alleen het stuk na de eerste 10 minuten).
- Eerlijker zeggen: "eerste schatting" tot er minstens 8 metingen over 4 weken zijn, daarna de verandering met een marge ("ongeveer 10 tot 20 seconden sneller"). De cijfers in de tekst komen uit dezelfde functie als de grafiek.
- Een leesbare grafiek: elke meting als stip, het weekgemiddelde als lijn, een as met tempo's en "sneller" omhoog erbij, de hoogste en laagste week benoemd. Korte tekst: één zin wat het betekent, het hoe achter de i.
- Scout eerst kort (welke drempels voor stabiel en hoe lang, warmtecorrectie), dan Sherpa: engine op opus (afgeleid, append-only, raakt de planning niet), grafiek en tekst op sonnet.

## Calisthenics, los of naast krachttraining (wens 7 november, grondig)

Doel: calisthenics als volwaardige manier van trainen in ASCEND, los of samen met krachttraining. Het moet echt goed in elkaar zitten; eerst onderzoek, dan ontwerp, dan bouwen.

- Stap 1, onderzoek (Scout op opus, twee delen):
  - Apps: hoe Thenx, Calimove, Madbarz, Caliverse, Freeletics en de Recommended Routine van r/bodyweightfitness het doen. Progressies (ladders als knie-push-up, push-up, archer, one-arm), vaardigheden (pull-up, dip, muscle-up, handstand, L-sit, front lever), hoe ze vooruitgang meten zonder kilo's, hoe ze het combineren met gewichten.
  - Wetenschap: progressie via hefboom, tempo en herhalingen in plaats van gewicht; RIR bij oefeningen met je eigen gewicht; houdingen in seconden; vaardigheid tegenover kracht; combineren met kracht en hardlopen voor de berg (benen, rug, grip).
  - Lees eerst `docs/onderzoek/` en `docs/visie/` (geen dubbel werk).
- Stap 2, ontwerp (Cartographer en coördinator): hoe het in ASCEND past. Voorstel om te toetsen: een eigen doelsoort "Vaardigheid" met mijlpalen als ladder (zoals de GR5 en de rugzakladder), een vaardigheid als tussendoel naast een hoofddoel, en per training de keuze kracht, calisthenics of samen. Forge kent dan ook stappen in een progressie in plaats van alleen kilo's, houdingen in seconden, extra gewicht en hulp met een band.
- Stap 3, bouwen in stukken van hoogstens een uur: data (progressies en vaardigheden), engine (vooruitgang zonder kilo's, planner-rollen), Forge (rij voor een progressiestap en een houding), Ascend-tab (de ladder), instellingen.
- Vaardigheidsdoelen (eigenaar, 7 november): doelen voor houdingen en vaardigheden met je eigen gewicht, zoals een handstand, een push-up in handstand, een L-sit, een front lever, een muscle-up. Elk doel is een ladder van progressies met een duidelijke toets per stap (bijvoorbeeld 3 x 10 seconden vasthouden), en een vaardigheid kan een eigen doel of een tussendoel zijn.
- Een database van vaardigheden en progressies, liefst open en zonder sleutel. Uitzoeken: free-exercise-db (yuhonas, publiek domein, JSON met foto's), wger (open source, CC-BY-SA, ook lichaamsgewicht), de tekeningen die ASCEND al gebruikt (Workout Guide en Everkinetic, CC BY-SA, `public/exercise-art/ATTRIBUTION.md`) en de progressies van r/bodyweightfitness. Betaalde of sleutel-API's (zoals ExerciseDB via RapidAPI) niet: geen sleutels in de app. Een bron wordt eenmalig ingelezen en herschreven (geen koppeling in de app), met licentie en naamsvermelding zoals bij de tekeningen.
- Plaatjes: elke oefening en elke progressiestap heeft een tekening in dezelfde stijl als nu (lijntekening, kleur uit de tokens). Ontbreekt een houding in de open bronnen, dan uitzoeken of we hem in dezelfde stijl kunnen tekenen.
- Moment: na de Forge-punten die hetzelfde oefeningenmodel raken (RIR bij afvinken, toestel, echte vervanger, uitleg bij oefeningen), want calisthenics bouwt daarop. Het onderzoek (stap 1) kan eerder, het staat los.
- Schatting: onderzoek 300k tot 500k tokens, ontwerp 150k tot 250k, bouwen vijf tot acht rondes met review, samen ongeveer 2,5 tot 3,5 miljoen tokens, verdeeld over drie tot vijf bouwmomenten (twee tot drie weken).

## Geparkeerd

- Spierindex stap 3.

## Werkwijze, voor de coördinator

- Een controle op echte data: een script dat een back-up van de eigenaar (alleen in de scratchpad, nooit in de repo) door de engine haalt en dezelfde invarianten toetst. Draaien zodra de eigenaar een back-up stuurt.
- Afspraken die nu alleen in het gesprek staan: de eigenaar stuurt elke zondag een verse back-up, en start na 1 november elke paar dagen een nieuwe chat ("lees docs/backlog.md en ga verder").

## Werkwijze, overig

- Het wekelijkse onderhoud en de appscan op Sonnet laten draaien en na een paar weken kijken wat ze vinden en kosten.
