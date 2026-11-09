# Toestelstanden in Forge

Ontwerp van Cartographer (Forge-toestel), voorstel, nog niet gebouwd. Aanleiding: de wens van 5 november in `docs/backlog.md` ("Forge: gewicht op een toestel makkelijk invullen"). Werkbriefje: `docs/werkbriefjes/forge.md`. Eerdere besluiten waar dit op bouwt: `docs/beslissingen/2026-10-26-gewichten-per-toestel.md` en `docs/beslissingen/2026-10-28-tussengewichten.md`.

## Kort

Op een toestel met een gewichtsblok tik je in Forge gewoon het getal dat op het blok staat. Forge onthoudt dat getal als een stand van dat toestel, in jouw sportschool. De toetsen Minder en Meer springen daarna van stand naar stand, ook als het blok niet gelijk oploopt (7, 14, 23, 32). Er is geen instelling vooraf nodig. In Instellingen, bij Je sportschool, zie je per toestel welke standen Forge kent en pas je ze aan.

## Hoe het nu werkt

Dit is wat er nu staat, zodat duidelijk is wat verandert.

- Een toestel (kabel of `machine_stack`, `hasStack` in `src/engine/machineWeights.ts`) heeft één stap voor de hele sportschool: `GymProfile.stackStepKg` (1,25, 2,5, 5 of Anders, component `StackStep` in `src/components/GymProfileSettings.tsx`). Een eigen stap per toestel (`exerciseStepKg`) bestaat in de opslag maar heeft geen scherm.
- De toetsen Minder en Meer in het cijferblok (`InputDock.tsx`, `stepDock` in `ForgeWorkout.tsx`) tellen steeds met die ene stap op of af (`weightStepFor` in `src/engine/forgeInput.ts`). Bij een blok van 7, 14, 23, 32 klopt dat nooit, dus je typt elk gewicht uit.
- Wie het goed wil, vult per toestel een eigen lijst of een bereik in (`GymProfile.exerciseWeightsKg` en `exerciseWeightRanges`, formulier `MachineWeightsForm` in `src/components/forge/MachineWeights.tsx`, rij "Gewichten per toestel" in Instellingen, onderblad `MachineListSheet`). Zo'n lijst is gesloten: het model stelt alleen die gewichten voor (`ownWeightsFor` in `candidatesFor`). Het invullen kost veel tikken en je moet het vooraf doen.
- Daarnaast leert het model uit je logs welke gewichten je gebruikte (`usedBefore`, `learnedStack` in `src/engine/strengthWeights.ts`). Dat gaat alleen over wat Forge voorstelt, niet over de toetsen Minder en Meer, en het vult gaten in met de profielstap, wat bij een ongelijk blok nepgewichten geeft. De keuze "Gewichten van toestellen" (Geleerd, Alleen wat je gebruikte, Stappen van je profiel) bepaalt dat.
- `makeSnap` (afronden van doorgegeven gewichten) kijkt ook niet naar wat je gebruikte, alleen naar de stap.

## Het idee: standen

Een stand is een gewicht dat op dat toestel in die sportschool bestaat omdat jij het ooit gebruikte. Standen zijn de enige bron voor wat Minder en Meer doen. De profielstap blijft alleen als vangnet voor een toestel zonder standen.

Wanneer onthoudt Forge een stand: zodra je een set afvinkt met een gewicht boven 0 op zo'n toestel (werk- en opwarmsets tellen allebei, een opwarmset op een blok gebruikt ook echte standen). Een getal dat je intikt maar niet afvinkt is nog geen stand, zodat een typefout die je meteen herstelt nooit blijft hangen. Een gewicht dat al een stand is, of dat een stand plus een tussengewicht van dat toestel is (70 + 2,3, zie `splitAddOn` in `src/engine/machineWeights.ts`), wordt geen nieuwe stand. Een gewicht dat op pond lijkt (`looksLikePounds`) en een gewicht met meer dan één decimaal worden niet onthouden, net als bij `learnedStack`.

## Opslag

Eén nieuw optioneel veld bij het sportschoolprofiel, naast de bestaande:

- `GymProfile.exerciseStandsKg?: Record<string, { kg: number[]; only?: boolean }>`, per oefening-id. `kg` is oplopend, zonder dubbele, hoogstens 40 (dezelfde grens als `MACHINE_LIST_LIMITS.maxCount`), elk tussen 0,25 en 500 kg. `only` betekent "alleen deze standen" (zie hieronder).
- Een sleutel die er is, ook met een lege lijst, betekent: dit toestel is al ingelezen uit je trainingen en wat je weghaalde komt niet terug. Een sleutel die er niet is, betekent: nog niet ingelezen.
- Het veld hoort bij het profiel, dus per sportschool, zoals de lijsten nu. Een nieuwe sportschool begint zonder standen (`withNewProfile` laat het veld weg, zoals de andere toestelvelden).
- Het gaat door `normalizeProfile` in `src/engine/strengthSettings.ts` (rommel eruit, grenzen zoals boven) en mee in de back-up. Het ontbreken van het veld is de oude stand van zaken.

Een gewicht staat nooit in de standen als het een kilo-omrekening van pond is, en de standen zijn altijd in kg. Een toestel in pond blijft zijn eigen voorstel houden (`poundStackProposal`); dat verandert niet in dit ontwerp.

## Het invullen in Forge

Opbouw van boven naar beneden, alleen voor een toestel met een gewichtsblok. Bij halters, stangen, schijvenmachines, eigen gewicht en vest verandert er niets.

1. De oefening zoals nu: titel, voorschrift, de tabel met sets.
2. Het cijferblok (`InputDock.tsx`) als je een gewicht aantikt, met dezelfde toetsen. Het enige verschil zit in Minder en Meer.
3. Minder en Meer springen naar de vorige en de volgende stand. Onder het pictogram staat klein (12 px) het gewicht waar de toets heen gaat, bijvoorbeeld "14" en "32". Zo zie je wat je krijgt voordat je tikt. Het label voor schermlezers is "Minder, naar 14 kilo" en "Meer, naar 32 kilo".
4. Staat de huidige waarde tussen twee standen (je typte 20 tussen 14 en 23), dan gaat Meer naar 23 en Minder naar 14.
5. Staat de waarde boven de hoogste stand, dan telt Meer op met het laatste verschil tussen twee standen (32 na 23 geeft 41). Onder de laagste telt Minder af met het eerste verschil, nooit onder 0,25. Heeft het toestel één stand, dan is dat verschil de profielstap. Zonder standen werkt het zoals nu, met de profielstap. Die waarde is dan een gok en geen stand, tot je de set afvinkt.
6. Het getal intikken werkt zoals nu: nooit afgerond wat je zelf typt.
7. Na het afvinken van een set met een nieuwe stand komt in het blok van de oefening één rustige regel in gedempte inkt: "Stand 20 kg onthouden voor Kabel roeien." met één knop Terugdraaien. De regel blijft staan tot je de volgende set afvinkt of de oefening wisselt, vraagt niets en blokkeert niets. Terugdraaien haalt alleen die stand weg, niet de set. Dat is bewust geen vraag vooraf: de eigenaar vindt tikken te veel, en een stilte met een ongedaanknop kost nul tikken als het klopt.
8. De eerste keer op een toestel zonder standen staat in het blok één regel in gedempte inkt: "Tik het getal dat op het blok staat. Forge onthoudt het." Hij verdwijnt zodra er een stand is.
9. Het menu van de oefening (`ForgeMenus.tsx`): de rij "Gewichten van dit toestel" heet "Standen van dit toestel" en opent het blad van de volgende alinea. Subregel: het aantal standen in deze sportschool, of "Nog geen standen. Tik een gewicht in en Forge onthoudt het."

Wat dit hergebruikt: `InputDock`, `Key`, `ForgeSheet`, `TextButton`, `PrimaryButton`, `SecondaryButton` en de bestaande regelblokken (`noFitText`, `poundText` in `ExerciseBlock.tsx`) als vorm voor de regel van punt 7. Geen nieuwe kleur: alles in `--color-ink`, `--color-ink-dim` en `--color-card-border`. Het blok heeft geen nieuw accent, het mint van het scherm blijft één.

### De doorgegeven gewichten en het voorschrift

- `makeSnap` (doorvoeren naar volgende sets) rondt voor een toestel met standen af op de dichtstbijzijnde stand, niet op een veelvoud van de stap.
- Het model rekent voor zo'n toestel met de standen als gebruikte gewichten (zie "Wat de engine doet").

## Het blad Standen van dit toestel

In Forge (`ForgeSheet`) en in Instellingen (`Sheet`) is dit hetzelfde formulier, zoals nu `MachineWeightsForm`. Van boven naar beneden:

1. Titel: de naam van het toestel, met de sportschool als regel eronder.
2. Uitlegzin: "Dit zijn de gewichten die je op dit toestel in {sportschool} gebruikte. Minder en Meer springen van stand naar stand."
3. De standen als ronde chips van minstens 44 bij 44 px, oplopend, met het hergebruikte `WeightChip`. Een tik haalt een stand weg (doorgestreept), nog een tik zet hem terug. Dat is het corrigeren: een verkeerd getal (77 in plaats van 7) haal je weg en je voegt het goede toe.
4. Een veld "Stand toevoegen" met "Toevoegen" (`KgField` en `SecondaryButton`, zoals nu).
5. Onder een kopje "Veel tegelijk" de bestaande formulieren Lijst en Bereik, voor wie een regelmatig blok in één keer wil invullen (4,5 tot 113 per 7). Wat daaruit komt wordt bij de standen gevoegd. Het blijft bestaan omdat een bereik voor een regelmatig blok sneller is dan elke stand los.
6. Een keuzestrook "Wat Forge voorstelt" met twee opties, hergebruik van `ChoiceStrip`: "Ook tussenin en erboven schatten" (standaard) en "Alleen deze standen". Onder de strook één zin: "Bij alleen deze standen stelt Forge nooit een gewicht voor dat je niet intikte." Dit is de bestaande gesloten lijst, nu als schakelaar.
7. Knoppen: Annuleren links, Opslaan rechts. Onderaan een gevaarknop in `TextButton` "Standen wissen", alleen als er standen zijn.

Een stand corrigeren of verwijderen kan dus op drie plaatsen: Terugdraaien direct na het afvinken (punt 7 hierboven), het blad in het menu van de oefening, en het blad in Instellingen. Een log wordt daarbij nooit aangeraakt: de gewichten in je historie blijven wat ze waren, alleen de lijst van het toestel verandert.

### Lege, laad- en foutstand

- Leeg: "Nog geen standen. Tik tijdens een training het getal dat op het blok staat; Forge onthoudt het." Daaronder "Veel tegelijk" en de knoppen.
- Laden: de instellingen staan al in het geheugen, dus de chips staan er meteen. Alleen het inlezen uit je trainingen (zie "Eerste keer") hangt van de logs af. Zijn die nog niet geladen, dan staat het blad zonder dat stuk, zonder spinner, en leest hij ze bij de volgende keer. De app start nooit op een leeg scherm.
- Fout: lukt Opslaan niet (`updateSettings` weigert), dan blijft het blad open met een regel in `--color-danger-text`: "Opslaan lukte niet. Probeer het nog eens." Opslaan heeft een grens in tijd en een zichtbare uitkomst, zoals de regels voor wachtende knoppen eisen. De standen in het geheugen blijven zoals ze waren.
- Te veel: bij 40 standen staat bij Toevoegen "Dit toestel heeft al 40 standen. Haal er een weg." Automatisch onthouden slaat dan niets op en laat één keer per training een gedempte regel zien met dezelfde zin.

## Het blad in Je sportschool

De rij "Gewichten per toestel" (id `toestelgewichten` in `src/data/settingsIndex.ts` en `ForgeGroup.tsx`) heet voortaan "Standen per toestel". De waarde in de rij blijft het aantal toestellen met standen in de actieve sportschool (`machineListCount` in `engine/settingsSummary.ts`, nu telt hij lijsten).

Het blad (`MachineListSheet` in `ToestelSheets.tsx`), van boven naar beneden:

1. Titel "Standen per toestel", regel "Voor {sportschool}."
2. Een uitleg van één zin: "Forge onthoudt wat je op een toestel intikt. Hier zie je het en pas je het aan."
3. Een rij per toestel dat standen heeft, alfabetisch zoals nu, met `SettingsRow`. Waarde: de standen als "7, 14, 23, 32" (via `machineSummary`, bij meer dan zes "7 tot 109 kg"), met erachter ", alleen deze" als de keuze "Alleen deze standen" aan staat. Een tik opent het blad hierboven in Instellingen-vorm.
4. "Toestel toevoegen" onderaan, zoals nu, voor wie standen vooraf wil invullen (via de Lijst of het Bereik).
5. Leeg: "Nog geen toestel met standen. Voeg er een toe, of tik een gewicht in tijdens een training."

Een nieuwe instelling erbij, omdat Forge hier zelf iets voor je kiest: "Standen onthouden" (aan, advies). Eén zin uitleg: "Forge onthoudt de gewichten die je op een toestel intikt." Staat ze uit, dan blijven bestaande standen zoals ze zijn, komen er geen nieuwe bij en werken Minder en Meer met de bestaande standen en daarna de profielstap. Plek: de groep Forge naast "Standen per toestel". Ze komt in `src/data/settingsIndex.ts`, `src/data/settingsLayout.ts`, `src/engine/settingsSummary.ts`, de groepspagina en `src/data/settingsHelp.ts`, en in `GymProfile` of `StrengthSettings` als `learnStands` (let op: `checkModelKey` in `strengthSettings.ts` telt alleen velden die de planning raken; de nieuwe instelling hoort daar mee omdat ze `usedBefore` verandert).

De bestaande rij met de stap van kabels en toestellen blijft staan, met een extra zin: "Alleen nodig voor een toestel waarvan Forge nog geen standen kent." Geen herontwerp, alleen die zin.

## Wat de engine doet

Domeinlogica blijft in `engine/`, het scherm toont alleen.

- Een nieuwe pure functie in `src/engine/machineWeights.ts` (of een nieuw bestand `toestelStanden.ts` als dat leesbaarder is): `standsFor(profile, exercise)` geeft de standen van een toestel. Heeft het profiel voor dit toestel geen `exerciseStandsKg` maar wel de oude lijst of bereiken, dan geven die de standen en is `only` waar (zie "Migratie").
- `learnStand(profile, exercise, weightKg)` geeft het profiel terug met de stand erbij, of niets als het gewicht geen stand mag worden (al bekend, standen plus tussengewichten, pond, meer dan één decimaal, boven de grens).
- `nextStand(stands, current, direction, fallbackStep)` in `src/engine/forgeInput.ts` voor de toetsen. Zuiver en met tests voor de randgevallen hieronder.
- Seeden uit je trainingen: heeft een toestel nog geen sleutel in `exerciseStandsKg`, dan neemt de eerste keer dat Forge of het blad het toestel opent de gebruikte gewichten van `usedBefore` (dezelfde filters: werk- en opwarmsets, alleen de actieve sportschool of logs zonder sportschool, geen pond) als standen, en schrijft ze één keer weg. Daarmee heeft de eigenaar na de update meteen standen en bestaat de sleutel, zodat wat je daarna weghaalt niet terugkomt.
- `usedBefore` in `src/engine/strengthModel.ts` geeft voor een toestel met een gewichtsblok die sleutel heeft de standen terug in plaats van de ruwe log. Daarmee volgen `candidatesFor`, `learnedStack` en `usedOnlyWeights` zonder verdere wijziging wat je aan het blad deed, en een gewicht dat je wegstreepte (de 77 uit een typefout) blijft ook niet meer in de voorstellen hangen.
- `learnedStack` krijgt een vlag `fillGaps`: voor een toestel met standen is die uit. Binnen het bereik van je standen zijn dan precies die standen de kandidaten, zodat een blok van 7, 14, 23, 32 geen nepgewichten van 9,5 of 12 krijgt. Erboven en eronder blijft het schatten met het laatste en het eerste verschil, zoals nu met de gevonden stap. Is `only` waar, dan zijn de standen de enige kandidaten (het gedrag van de bestaande gesloten lijst, dus `ownWeightsFor` leest straks hier vandaan).
- De keuze "Gewichten van toestellen" blijft werken: Stappen van je profiel negeert wat je gebruikte, behalve voor een toestel met `only`, net als nu voor een eigen lijst.

## Migratie van wat er al is

Er is geen schemanummer (nu 2, `CURRENT_SCHEMA_VERSION` in `src/storage/migrationsSchema.ts`) nodig, omdat het veld nieuw en optioneel is en de oude velden leesbaar blijven. Dit is dezelfde route als bij `exerciseWeightsKg` in het besluit van 26 oktober. Warden moet dat bevestigen, want de werkafspraak zegt dat een veranderde opslagvorm een migratiestap krijgt; de eerlijke lezing is dat hier niets in de oude vorm verandert.

- Een oude back-up of bestaande instellingen met `exerciseWeightsKg` of `exerciseWeightRanges` werken precies zoals nu, tot je het toestel aanraakt.
- `standsFor` leest voor een toestel zonder `exerciseStandsKg` die oude velden (losse gewichten en bereiken, via `ownWeightsFor`) en geeft ze als standen met `only` aan. Het gedrag van het model verandert daardoor niet; dat is het uitgangspunt voor de test die bewijst dat er niets stil verandert.
- Raak je zo'n toestel aan (een stand erbij, Terugdraaien, Opslaan in het blad), dan schrijft de opslagfunctie het toestel in één keer om: de standen komen in `exerciseStandsKg` met `only`, en de oude velden van alleen dat toestel gaan weg. Een eenmalige omzetting per toestel, zonder tussenvorm, alles of niets in één `updateSettings`.
- Heeft het toestel een bereik in pond (`unit: 'lb'`), dan worden de standen de kilo's die `weightsFromRange` er nu al van maakt, afgerond op 0,01.
- De losse tussengewichten (`addOnKg`, `exerciseAddOnKg`) blijven wat ze zijn en gaan er niet in op.
- Een oudere app die een nieuwe back-up leest laat `exerciseStandsKg` weg (onbekend veld, `normalizeProfile` houdt het niet vast). Dat is een eigenschap van alle optionele velden en geen reden tot zorg, maar de uitleg bij Exporteren hoeft er niet op te veranderen.
- `withMachineSetup`, `withMachineWeights` en `useSaveMachineWeights` schrijven straks naar `exerciseStandsKg`. De tests in `src/engine/machineWeights.test.ts` en `src/storage/backup.test.ts` blijven slagen voor de oude velden; er komt een gelijkwaardige set voor het nieuwe veld bij.

## Randgevallen

- Eerste keer op een toestel: geen standen en geen logs. Minder en Meer gebruiken de profielstap, de regel van punt 8 staat er, en de eerste afgevinkte set maakt de eerste stand. Nooit blokkeren op een ontbrekende lijst.
- Eén stand: Minder en Meer gebruiken de profielstap vanaf die stand, en het label onder de toets toont het gewicht dat eruit komt.
- Tussen twee standen: zie punt 4 en 5. Een gewicht tussenin dat je afvinkt wordt een stand, tenzij het stand plus tussengewicht is.
- Dezelfde stand twee keer: dubbele standen bestaan niet (op 0,01 afgerond).
- Kilo's tegenover plaatjes: veel blokken hebben plaatjes met een nummer (7 betekent het zevende plaatje, niet 7 kg). Standen zijn altijd kilo's, want het krachtmodel rekent met kilo's. Staat er op jouw blok een nummer, tik dan het gewicht in dat daarbij hoort. Het nummer van het plaatje zelf bewaren is bewust niet gebouwd; voor een eigen herinnering is er de bestaande vaste notitie per oefening (`exerciseNotes`). Een toestel met halve plaatjes ("5,5") is gewoon een stand van 5,5.
- Pond: een gewicht dat op pond lijkt (90 lb is 40,82 kg) wordt niet onthouden. Dat toestel houdt zijn voorstel "Dit toestel in ponden opslaan" (`poundStackProposal`); standen in pond zijn later.
- Tussengewichten: staat er voor het toestel een magneet van 2,3 kg ingesteld en je tikt 72,3, dan blijft 70 de stand en komt 72,3 niet in de lijst. In het blad staat een stand zonder tussengewicht; in Forge toont de regel "70 + 2,3" zoals nu (`addOnText`).
- Een gewicht van 0: geen stand (een toestel zonder gewicht, of een set die je overslaat).
- Hulp van een toestel (`assisted_bodyweight`, het hulpgewicht van een optrekstation): valt in deze versie buiten de standen. Het blok daar is hulp en geen last, met een eigen teken, en dat vraagt een eigen keuze. Zie de vragen.
- Wisselen van sportschool: de standen horen bij het profiel en wisselen mee. Een nieuwe sportschool begint leeg en vult zich.
- Wisselen van oefening (Ruilen) naar een andere toestelsoort: de standen horen bij het toestel, niet bij de plek in de training.
- Een stand die je weghaalt maar die nog in je logs staat: de log blijft, de stand komt niet terug (door de sleutel). Wil je hem terug, dan voeg je hem toe.
- Instelling "Standen onthouden" uit: zie boven.
- Rustig en Uit bij Beweging: het cijferblok en de regel van punt 7 verschijnen zonder beweging; er komt geen nieuwe beweging bij.

## Wat bewust niet

- Geen vraag bij elke nieuwe stand. De regel met Terugdraaien is genoeg.
- Geen stappen vooraf instellen als voorwaarde; de profielstap blijft een vangnet, niet een stap in de weg.
- Geen plaatjesnummers of eigen labels per stand.
- Geen standen voor stangen, halters, schijvenmachines, vest en eigen gewicht; die hebben hun eigen vorm.
- Geen uitklapblokjes; alles is een blad of een regel. De enige ingeklapte plek is de kop "Veel tegelijk", en die is een gewoon kopje met de bestaande formulieren eronder, niet verborgen.
- Geen delen of samenvoegen van standen tussen sportscholen.
- Geen wijziging in de planning, de scheduler of de logs. Alles wat hier verandert is wat Forge voorstelt en wat Minder en Meer doen op een toestel.
- Geen nieuwe kleur, geen nieuw pictogram, geen nieuwe tekstgrootte (alles minstens 12 px, tikdoelen minstens 44 bij 44 px).

## Bouwplan

Stappen van hoogstens een uur, elk met een eigen controleerbaar einde. Rol en model volgen de tabel in de skill `werkverdeling`: regels in de engine en opslag op opus, het scherm en de tekst eromheen op sonnet. De bouwer leest eerst `docs/werkbriefjes/forge.md` en dit voorstel, en zet elke eigen keuze buiten de opdracht in het besluit.

1. Opslag en regels (Sherpa, opus). Veld `exerciseStandsKg` in `GymProfile` en `normalizeProfile`; `standsFor`, `learnStand`, het omzetten per toestel van oude lijst en bereik, `withMachineSetup` en `withMachineWeights` die ernaartoe schrijven; `withNewProfile` laat het veld weg. Einde: de tests uit de testeisen voor opslag, migratie en back-up slagen.
2. Seeden en het model (Sherpa, opus). Het inlezen uit `usedBefore` per toestel met de sleutel als teken, `usedBefore` dat standen teruggeeft, de vlag `fillGaps` in `learnedStack`, `only` als gesloten lijst in `externalWeights`. Einde: de testeisen voor het model slagen en `planGolden.test.ts` en de bestaande strength-tests bewegen niet.
3. De toetsen in Forge (Sherpa, sonnet). `nextStand` in `forgeInput.ts` met tests, `stepDock` en `makeSnap` ernaar, het label onder Minder en Meer in `InputDock.tsx`. Einde: de tests van `forgeInput` en `InputDock` slagen en het label is te zien op 360 en 390 px.
4. Onthouden bij afvinken en de regels in het blok (Sherpa, opus omdat het de opslag schrijft tijdens een training). `learnStand` aanroepen bij afvinken, de regel "Stand onthouden" met Terugdraaien, de eerste-keerregel, de grens van 40, een fout halverwege (alles of niets). Einde: een training die je sluit en weer opent bewaart de stand; Terugdraaien haalt alleen die stand weg.
5. De blad in Forge en Instellingen (Sherpa, sonnet). `MachineWeightsForm` omgezet naar de standen met chips, Toevoegen, Veel tegelijk, de keuzestrook en Standen wissen; de rij en het blad "Standen per toestel"; de menurij. Einde: de schermen kloppen met dit voorstel op 360 en 390 px, in de lege, laad- en foutstand.
6. De instelling en de teksten (Sherpa, sonnet). "Standen onthouden" in alle vijf de plekken, `settingsHelp.ts`, `checkModelKey`, de extra zin bij de stap, de werkbriefjes bijwerken (`forge.md`, besluit in `docs/beslissingen/`). Einde: de instelling doet wat de zin zegt en `npm run kaart:vergelijk` toont elk verschil verklaard.
7. Reviews en doorloop (Warden op opus voor stap 1, 2 en 4, Warden op sonnet voor stap 3, 5 en 6; Lookout op sonnet na stap 6). Lookout doorloopt in Chromium op 360 en 390 px met vertraagde processor: een toestel zonder standen, een met 7, 14, 23, 32, tussen twee standen, het blad, de fout, Rustig en Uit. De coördinator bekijkt de screenshots zelf.

Stap 1 en 2 mogen niet samen in één opdracht (te groot voor een uur). Stap 3 kan los van 4 worden gebouwd zodra stap 2 af is.

## Testeisen

Opslag en migratie, elk met een test:

- Een oude back-up zonder `exerciseStandsKg` blijft importeerbaar en geeft hetzelfde als vroeger, ook met `exerciseWeightsKg` en `exerciseWeightRanges` (inclusief een bereik in pond).
- Een toestel met een oude lijst wordt bij aanraken in één keer omgezet: standen met `only`, oude velden van dat toestel weg, de andere toestellen onaangeroerd. Een fout halverwege laat de oude stand staan (alles of niets).
- Het veld gaat door `normalizeProfile`: rommel eruit, grenzen 0,25 en 500 kg, hoogstens 40, geen dubbele, oplopend; een lege lijst met sleutel blijft bestaan.
- Een nieuwe back-up gaat heen en terug (`src/storage/backup.test.ts`), en een nieuwe sportschool begint zonder het veld.
- Het veld verandert nooit een bestaand log. Een log bevat geen standen en geen log wordt herschreven.

Het model en de engine:

- `nextStand`: een blok van 7, 14, 23, 32; vanaf 20 (tussen twee standen) naar 23 en naar 14; vanaf 32 omhoog met 9 (41); vanaf 7 omlaag met 7 maar nooit onder 0,25; één stand met de profielstap; geen standen met de profielstap; hulp met negatief teken is buiten bereik.
- `learnStand`: werk- en opwarmsets tellen; 0 niet; een stand plus een tussengewicht niet; een gewicht dat op pond lijkt niet; meer dan één decimaal niet; de 41e stand niet; hetzelfde gewicht op 0,01 gelijk.
- `learnedStack` met `fillGaps` uit geeft voor 7, 14, 23, 32 en een profielstap van 2,5 geen gewicht tussen de standen. Zonder de vlag blijft de uitvoer zoals nu, zodat de bestaande tests slagen.
- Met `only` zijn de standen de enige kandidaten, gelijk aan het gedrag van de oude gesloten lijst.
- `usedBefore` geeft voor een toestel met sleutel de standen, niet de ruwe log, en een weggehaalde stand komt na een nieuwe training zonder dat gewicht niet terug.
- Seeden gebeurt één keer per toestel per sportschool, telt logs zonder sportschool mee voor elke, en slaat pondgewichten over.
- `makeSnap` rondt op een stand voor een toestel met standen en blijft op de stap voor de rest.
- De tussengewichten (`splitAddOn`) maken van 72,3 geen stand.
- `planGolden.test.ts` beweegt niet; de golden scenario's met een doel (A en C) ook niet.

Het scherm:

- Het label onder Minder en Meer klopt met de stand waar de toets heen gaat, ook aan de randen; elk tikdoel minstens 44 bij 44 px, alle tekst minstens 12 px, geen horizontale scroll op 360 px.
- De regel "Stand onthouden" verschijnt na een nieuwe stand, niet na een bestaande, en Terugdraaien haalt alleen die stand weg; de regel blokkeert geen volgende set.
- Het blad: een stand wegstrepen en opslaan, een stand toevoegen, Standen wissen, de keuzestrook, de fout bij een mislukte opslag, Annuleren laat alles zoals het was.
- Elk blad gaat door `useSheetClose`, heeft `ref={sheetRef}` en `<SheetGrip />`; `sheetDrag.scan.test.ts` en `dockKey.scan.test.ts` blijven slagen.
- Tekstkaart: `npm run kaart:vergelijk` met elk verschil verklaard; de rij "Standen per toestel" en de nieuwe instelling zijn de bedoelde verschillen.
- Tests voor de instelling in `settingsIndex`, `settingsLayout` en `settingsSummary` (de bestaande scantests vangen een ontbrekende plek).

## Samenvatting

Forge onthoudt per toestel en per sportschool welke gewichten je afvinkt. Minder en Meer springen dan van stand naar stand, met het doelgewicht klein onder de toets, en een blok van 7, 14, 23, 32 werkt zonder iets vooraf in te stellen. Een nieuwe stand verschijnt met één regel en Terugdraaien. Het blad in Je sportschool toont de standen als chips die je wegstreept of aanvult, met "Alleen deze standen" als de oude gesloten lijst. Wat er al is aan eigen lijsten en bereiken blijft werken en wordt per toestel omgezet zodra je het aanraakt. Zes bouwstappen van hoogstens een uur, de regels in de engine en de opslag op opus.

## Vragen voor de eigenaar

1. Stilte met Terugdraaien of eerst vragen? Dit ontwerp onthoudt een nieuwe stand zonder te vragen, met een regel waarmee je het terugdraait. Wil je liever een vraag bij elke nieuwe stand, ook al kost dat een tik?
2. Plaatjesnummers. Staan op jouw blokken getallen die geen kilo's zijn (plaatje 1 tot 12)? Dan tik je nu het gewicht dat erbij hoort; wil je dat Forge het nummer ook laat zien bij elke stand? Dat is extra werk en een nieuw veld.
3. Hulp van een toestel (de optrekhulp). Moet die ook standen krijgen? In deze versie niet, want het teken en het model werken daar anders.
4. De naam. "Standen per toestel" in plaats van "Gewichten per toestel": past dat woord bij jou, of wil je liever "Gewichten" houden?
5. De profielstap in Instellingen mag blijven als vangnet. Wil je haar helemaal weg uit beeld, nu de standen het werk doen?
6. Mag Forge de standen die het uit je eerdere trainingen kent (de eerste keer dat je een toestel opent) meteen als standen overnemen? Dat is handig, maar een oude typefout in je logs komt dan mee tot je hem wegstreept.
