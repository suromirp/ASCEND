# Ontwerp Je dag

Ontwerpvoorstel van Cartographer, 12 november 2026. Geen code. Aanleiding: een afdruk van Vandaag op 412 px met zes rijen onder de kop Je dag en een losse samenvattingskaart eronder. De eigenaar vindt het onoverzichtelijk en niet mooi, gebruikt de weekvraag niet, opent de reis nooit, en vindt ook de samenvattingskaart niet mooi. De informatie zelf is goed.

Gelezen: `CLAUDE.md`, `docs/architectuur/ontwerp-en-tokens.md`, `docs/werkbriefjes/bediening-en-beweging.md`, `docs/beslissingen/2026-11-09-stem-van-ascend.md`, `docs/visie/Ontwerp en gebruik.md`, de besluiten over de ochtendkaart en de avond ervoor, en de code: `src/pages/Today.tsx`, `src/components/vandaag/DayRow.tsx`, `WeeklyQuestionCard.tsx`, `JourneyWeekCard.tsx`, `WeightCard.tsx`, `DailyStretchCard.tsx`, `MorningCheckInCard.tsx`, `StandSummaryCard.tsx`, `engine/yourDay.ts`, `engine/journey.ts`, `engine/overviewSettings.ts` en `engine/settingsProfiles.ts`.

## 1. Wat Je dag is

Je dag is het lijstje van wat je vandaag zelf nog doet naast je training: korte dingen die je afvinkt of invult.

Wat erin hoort: iets van vandaag, dat je in een paar minuten doet, en dat daarna af is. Rekken, de vraag naar je gevoel of een pijnplek, je gewicht als het tijd is, een tweede training van vandaag, en een reistaak in de week dat hij echt moet.

Wat er niet in hoort:

- De training die al op de grote kaart staat. Die staat er nu dubbel.
- Morgen. Dat is geen taak en niet van vandaag.
- Een taak op lange termijn. De reis loopt over weken.
- Een vraag om over na te denken. De weekvraag is geen taak van vandaag.
- Informatie zonder iets te doen. Je benen en je week zijn stand, geen taak.

Zo betekent een rij altijd hetzelfde: dit kun je nu doen. Dat lost de klacht op dat je aan een rij niet ziet of het een taak, een plan, een vraag of informatie is.

## 2. Per rij

### Rekken (Ochtend of Avond): houden

Dit is het voorbeeld van wat Je dag is. Het rondje rechts vinkt af zonder iets te openen, de rij zelf opent de oefeningen. Er verandert niets aan `DailyStretchCard`.

### Rustige duurloop, Training: weg uit Je dag

De training van de grote kaart staat niet ook nog als rij. De grote kaart heeft al starten, afvinken, plan bekijken, Verplaatsen en overslaan.

Wat blijft als rij: een training van vandaag die niet op de grote kaart staat. Dat is een tweede training, een training die al gedaan is, of een overgeslagen training. Die rij is de enige weg naar het actieblad van die training op Vandaag, dus die mag niet verdwijnen. De regel voor de bouwer: in `trainingRows` valt alleen de rij weg waarvan de sessie gelijk is aan `primary` en die nog niet gedaan of overgeslagen is.

### Reis: verplaatsen naar Ascend, en alleen op Vandaag als het moet

De reistaak staat nu elke week tussen dagelijkse dingen. Je loopt eraan voorbij omdat hij er altijd staat en nooit dringend is. Voorstel in twee delen.

Het eerste deel is Ascend. De rij Reisplanner onder je doel (`components/ascend/JourneyRows.tsx`) toont nu "3 van 20 taken gedaan". Die krijgt de taak van nu als regel: "Nu: Besluit hoeveel dagen je loopt", met daarachter hoe lang het nog kan, bijvoorbeeld "kan tot 6 december". De telling verhuist naar het scherm Reisplanner zelf, waar hij al staat. Daar kijk je als je met je doel bezig bent, en dat is het moment waarop zo'n taak past.

Het tweede deel is Vandaag. De rij komt alleen in Je dag in de laatste week dat de taak nog past. Elke taak heeft al een venster in weken voor het doel (`window` in `data/journeyTasks.ts`, bijvoorbeeld van 41 tot 34 weken ervoor); de laatste week is de week waarin het aantal weken tot het doel gelijk is aan het eind van het venster. Dan staat er:

- Titel: de taak, zoals nu.
- Tweede regel: "Reis · kan nog tot zondag".
- Het blad blijft het bestaande blad van `JourneyWeekCard`, met Gedaan en de reden.

Een rij die zes weken lang niet staat en dan ineens wel, wordt gelezen. De toon blijft die van de reis: nooit rood, nooit amber, nooit "te laat". Alleen het feit en de dag.

Twee details. De knop "Volgende week" in het blad klopt in de laatste week niet meer; daar heet hij "Niet nu" en de taak blijft daarna open op Ascend. Een taak waarvan het venster voorbij is komt niet op Vandaag, die blijft op de Reisplanner staan zoals nu.

Dit is een keuze die de app maakt, dus hij wordt instelbaar. Nieuwe instelling "Reistaak op Vandaag" in de groep Vandaag: Alleen in de laatste week (advies), Elke week (zoals nu), Nooit. Met de vaste drie plekken: `settingsIndex.ts`, `settingsLayout.ts`, `settingsSummary.ts`.

### Een zin is genoeg, Vraag: uit Je dag

De eerlijke afweging tussen drie wegen.

Helemaal weg. Het scherm wordt rustiger en er verdwijnt code. Het kost wel het meest: de schakelaar, de rij in instellingen, de zoekregel, de hulptekst, de sleutel in de profielen en de tests daarvan bewegen allemaal. De antwoorden in `settings.weeklyIntentions` blijven staan in opslag en back-up, maar je ziet ze alleen nog als de regel in de weekterugblik (`WeekReview.tsx`) blijft. Haal je die ook weg, dan zijn ze er nog wel maar onzichtbaar. En een vraag terughalen is later opnieuw bouwen.

Standaard uit. Eén waarde in `DEFAULT_OVERVIEWS`. Alles blijft bestaan en wie hem wil zet hem aan. Er zit één addertje onder: het profiel Alles in `settingsProfiles.ts` heeft de weekvraag op aan, en de standaard is nu precies dat profiel. Draai je de standaard om, dan heet een verse installatie ineens "Eigen keuze". Dat moet bewust opgelost worden: of de weekvraag gaat uit de acht sleutels van de profielen (hij wordt een losse extra die geen profiel aan of uit zet), of Alles houdt hem en de standaard heet voortaan Eigen keuze. Het tweede is lelijk. En let op: heeft de eigenaar ooit zelf een profiel gekozen, dan staat zijn waarde vast op aan en helpt een andere standaard hem niet.

Alleen zijn eigen schakelaar uit. Niets in de code beweegt. De eigenaar zet "Vraag van de week" uit bij Vandaag in instellingen, twee tikken. Voor andere gebruikers verandert niets.

Mijn advies: standaard uit, met de weekvraag uit de profielen gehaald, en de regel in de weekterugblik blijft zodat oude antwoorden zichtbaar zijn bij hun week. Dat is één bewuste wijziging in `settingsProfiles.ts` en die vraagt akkoord van de eigenaar (vraag 1). Zonder dat akkoord: alleen de derde weg, en de profielen blijven zoals ze zijn. In geen van de drie wegen wordt een antwoord gewist of een migratie nodig.

Wat in elk geval verandert: staat de schakelaar aan, dan komt de vraag niet meer als rij in Je dag. Hij hoort bij de week. Hij verschijnt dan op maandag als regel in de weekterugblik, of als eigen regel onder Je dag als de terugblik uit staat. Dat is alleen nodig als iemand hem aanzet en kan in een latere stap.

### Trendgewicht bijwerken, Gewicht: houden, met een duidelijker tweede regel

Het is een taak van vandaag en hij komt alleen als het tijd is (`weightDue`, instelling "Herinnering voor je gewicht"). De tweede regel zegt nu alleen "Gewicht". Voorstel: titel "Gewicht bijwerken", tweede regel "Gewicht · laatst op 30 oktober". Dan zie je waarom hij er staat. Zonder eerdere weging: alleen "Gewicht".

### Bovenlichaam B, Morgen: verplaatsen naar de regel eronder

Morgen gaat uit de lijst en wordt een rustige regel in het blok onder Je dag (zie 4). De inhoud blijft gelijk, ook "Rustdag, wandelen mag" en "Niets gepland". Het besluit over de avond ervoor (`2026-11-11-avond-ervoor.md`) rekent erop dat Vandaag op een rustdag zegt wat er morgen is; dat blijft zo, alleen op een andere plek.

### Gevoel (stond niet op de afdruk): houden

De rij "Benen, energie en slaap" blijft als taak zolang de ochtendkaart er niet staat. Na het invullen blijft hij als gedane rij staan, want via die rij wis je later op de dag je antwoord (`2026-10-24-ochtend-terugdraaien.md`). De vraag naar een pijnplek is veiligheid en staat altijd bovenaan.

## 3. Het nieuwe Je dag, rij voor rij

Dezelfde dag als op de afdruk, een ochtend met een rustige duurloop op de grote kaart.

Van boven naar beneden onder de grote kaart:

1. De kop JE DAG (`Eyebrow`, ongewijzigd).
2. Rij 1: schijf met het rekpictogram, "Rekken, 6 oefeningen", eronder "Ochtend", rechts het rondje om af te vinken.
3. Rij 2: schijf met het gewichtpictogram, "Gewicht bijwerken", eronder "Gewicht · laatst op 30 oktober", rechts een pijltje.

Dat is alles: twee rijen in plaats van zes. In de laatste week van de reistaak komt daar een derde bij: vlag, "Besluit hoeveel dagen je loopt en vraag verlof aan", eronder "Reis · kan nog tot zondag", rechts een pijltje.

Hoe je aan een rij ziet wat hij doet: een rondje rechts is afvinken met één tik, een pijltje opent een blad om iets in te vullen. Meer soorten zijn er niet. Een gedane rij is gedimd met een mint vinkje in de schijf, zoals nu.

Volgorde: open rijen eerst, gedane rijen eronder. Binnen de open rijen: pijnplek of gevoel, een tweede training, rekken, gewicht, reis.

Hoogstens vier rijen. Zijn er meer, dan staan de eerste drie er en is de vierde rij "Nog 2", met eronder wat het is ("Gewicht, reis"). Die rij opent het blad Je dag met de volledige lijst, dezelfde rijen in dezelfde vorm. Een blad, geen uitklapblok. Gedane rijen vallen als eerste achter "Nog", de vraag naar een pijnplek nooit.

Standen:

- Leeg: is er niets te doen, dan verdwijnen de kop en de kaart samen. Er komt geen zin als "Niets te doen". Het blok eronder blijft.
- Laden: alles komt uit de opslag op het toestel. Je dag verschijnt samen met de rest van Vandaag, zonder eigen laadteken en zonder dat rijen later inspringen. De rij Gewicht wacht op de instellingen en komt niet achteraf erbij.
- Fout: lukt afvinken of bewaren niet, dan springt de rij terug naar open en zegt de bestaande melding dat het niet lukte. Een rij staat nooit als gedaan terwijl er niets bewaard is.

Hergebruik: `YourDay`, `DayRow`, `IconDisc`, `SportDisc`, `TodaySheet`, `Eyebrow`, `PrimaryButton`, `SecondaryButton`, `TextButton`. Het blad Je dag gaat door `useSheetClose` met `ref={sheetRef}` en `<SheetGrip />`; de rij "Nog 2" krijgt `data-sheet-from`.

## 4. De samenvattingskaart: opnieuw bekeken

Nu staat er één zin met drie feiten en vier kleuren door elkaar: "Benen vermoeid · 1 van 7 gedaan · deze week is even zwaar als de 4 weken ervoor". Grijs voor de vaste woorden, wit voor de waarden, amber op één woord midden in de zin. Dat leest onrustig en het is niet duidelijk dat het één knop is.

Per feit, waar het hoort:

- Benen. Dit hoort op Vandaag: het zegt iets over de training van vandaag. Blijft.
- 1 van 7 gedaan. De weekstrook in de lucht bovenaan Vandaag laat de week al zien, en Week telt het uit. Hier weg. De bouwer controleert dat de weekstrook gedaan en gepland echt laat zien; dat heb ik niet in de code nagelopen.
- Deze week is even zwaar. Dat is een feit over de week, geen feit over vandaag. Het gewone geval ("even zwaar", "lichter") gaat naar Week en staat al op Stand. Op Vandaag komt het alleen als het een waarschuwing is: je hebt al meer gedaan dan 30 procent boven je gemiddelde (`doneRatio` boven `LOAD_JUMP`, de grens die de kaart nu al gebruikt voor amber). Een waarschuwing staat nooit weggestopt.

De nieuwe vorm: het blok Stand en morgen. Eén kaart onder Je dag met twee of drie korte regels, zonder kop en zonder schijven, zodat hij er anders uitziet dan de takenlijst erboven. Elke regel heeft links een vast woord in gedempte inkt en daarnaast de waarde in gewone inkt, met rechts een pijltje.

Voor dezelfde dag:

- "Benen" en daarnaast "Vermoeid", met een amber stip voor het woord Benen. Opent Stand.
- "Morgen" en daarnaast "Bovenlichaam B, 60 min". Opent Week.

Op een dag met een zware week komt er een derde regel tussen: "Week" en daarnaast "35% zwaarder dan de 4 weken ervoor", ook met een amber stip. Opent Stand. Het getal legt zichzelf uit; de rest staat op Stand.

De kleurregel die de onrust wegneemt: de linkerkolom is altijd gedempt, de rechterkolom altijd gewone inkt. Geen gekleurd woord in een zin. Let op is alleen de amber stip (`--color-warning`) vooraan, bij vermoeide benen (niveau 2 of hoger, zoals nu) en bij een zware week. Bij frisse benen staat er geen stip en geen kleur. Geen mint in dit blok.

Elke regel is minstens 44 px hoog en een eigen knop; de linkerkolom heeft een vaste breedte zodat de waarden onder elkaar beginnen. Op 360 px breekt een lange waarde naar een tweede regel in plaats van af te kappen.

Standen: zonder gegevens over de week (minder dan drie eerdere weken) is er geen weekregel, zoals nu. Staat er morgen niets en zegt de grote kaart dat al, dan valt de regel Morgen weg, zoals de rij nu ook doet. Blijft er dan alleen Benen over, dan is het een kaart met één regel. De benen zijn er altijd.

Hergebruik: de kaartvorm van `Card`, `ChevronGlyph`, de bestaande berekeningen in `StandSummaryCard` (`legFatigueOn`, `fatigueWord`, `loadVersusBefore`) en `tomorrowEntry` met `tomorrowText`. Geen nieuwe token.

## 5. Regels

- Eén mint accent per scherm: dat blijft de knop op de grote kaart. Je dag en het blok eronder zijn marine met gedempte inkt. Mint komt hier alleen als voortgang: het vinkje van een gedane rij. In een blad is de hoofdknop mint, zoals nu.
- IJsblauw alleen voor status. De rij van de training van nu had ijsblauw; die rij verdwijnt, een tweede training van vandaag is gewoon neutraal.
- Amber alleen als stip in het blok Stand en morgen. De reis krijgt nooit amber.
- Alleen tokens uit `src/index.css`. Dit voorstel vraagt geen nieuwe token en geen nieuwe kleur.
- Niets kleiner dan 12 px. De tweede regel van een rij is 12 px, de titel houdt zijn huidige maat.
- Tikdoelen minstens 44 bij 44 px. Rijen blijven 56 px, het rondje 44 px.
- Zinsletters op knoppen. Hoofdletters alleen in `Eyebrow`.
- Vaste woorden: Niet nu, Gedaan, Opslaan. Geen gedachtestreepjes.
- Geen redesign van kleur, letter of indeling buiten Je dag en de kaart eronder. De grote kaart, de lucht, de kaarten boven de missie en het citaat blijven zoals ze zijn.
- Geen nieuwe beweging. Afvinken houdt de bestaande tekenbeweging van het vinkje.

Wat ik bewust niet doe: geen teller of voortgangsring voor Je dag, geen beloning als alles af is, geen kleur per soort rij, geen uitklapblok, geen tweede kop boven het blok Stand en morgen, en de reis krijgt geen eigen kaart op Vandaag.

## 6. Voor de bouwer

Testen:

- De training van de grote kaart staat niet in Je dag; een tweede, een gedane en een overgeslagen training van vandaag wel, en hun actieblad opent nog.
- Alles wat de weggehaalde rij kon (starten, afvinken, plan bekijken, verplaatsen, overslaan) kan nog vanaf de grote kaart. Dat heb ik aangenomen, niet per knop nagelopen.
- De reistaak: niet op Vandaag buiten de laatste week, wel in de laatste week, niet na het venster, niet zonder doel, en niet als hij gedaan of uitgesteld is. De drie standen van de nieuwe instelling. Op Ascend staat de taak van nu.
- De weekvraag: met de schakelaar uit nergens; een bestaand antwoord staat nog in de weekterugblik van zijn week en in een back-up die je uit en weer in leest.
- Hoogstens vier rijen, de rij "Nog", het blad, en dat de vraag naar een pijnplek nooit achter "Nog" valt, ook met de ochtendcheck uit (`pain_only`).
- Leeg Je dag: geen kop, geen lege kaart.
- Het blok Stand en morgen: fris zonder stip, vermoeid met stip, zware week met derde regel, minder dan drie weken gegevens, morgen niets, rustdag ("Rustdag, wandelen mag").
- Op 360 en 390 px: niets afgekapt, geen regel onder 44 px.
- Vast: `npx vitest run src/engine/settingsProfiles src/engine/settingsSummary src/components/sheetDrag`, daarna `npm run kaart:vergelijk` met elk verschil in `docs/app-kaart/vandaag*.md` verklaard. De tekstkaart verandert zichtbaar; dat is bedoeld.

Wat niet mag bewegen:

- `engine/settingsProfiles.ts`: de drie profielen, hun waarden en de naam Eigen keuze. Enige uitzondering is de weekvraag uit de sleutels halen, en alleen na akkoord op vraag 1.
- De andere schakelaars in `engine/overviewSettings.ts` en hun standaard. Ontbrekende waarden blijven het oude gedrag geven, zodat oude back-ups zonder migratie inlezen.
- `settings.weeklyIntentions`: niets wissen, niets omschrijven, ook niet bij samenvoegen van een back-up.
- De reis zelf: `engine/journey.ts`, de taken en hun vensters, wat gedaan is, de bergschoenen, de paklijst en het scherm Reisplanner. Alleen waar en wanneer de rij op Vandaag staat verandert.
- De veiligheid van de ochtendcheck: een pijnplek wordt gevolgd, ook met de check uit.
- De volgorde en de grens van de kaarten rond de missie (`engine/todayCards.ts`).
- `src/storage/planGolden.test.ts`. Er verandert niets aan de planning; dit is alleen weergave.

## 7. Vragen voor de eigenaar

1. De weekvraag: helemaal weg, standaard uit, of alleen bij jou uit? Mijn advies: standaard uit en los van de profielen, zodat Alles hem niet meer aanzet. Je oude antwoorden blijven bij hun week in de terugblik staan.
2. De reis: alleen op Vandaag in de laatste week dat een taak nog kan, en verder op Ascend bij je doel? Mijn advies: ja, met de instelling erbij voor wie hem elke week wil zien.
3. Het blok onder Je dag: benen en morgen altijd, de week alleen als hij duidelijk zwaarder is dan je gewend bent. "1 van 7 gedaan" verdwijnt hier omdat de weekstrook bovenaan het al toont. Mijn advies: zo doen. Mis je de telling, dan komt hij terug als waarde achter Week.
