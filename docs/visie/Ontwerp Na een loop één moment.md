# Ontwerp Na een loop één moment

Ontwerp van Cartographer Na een loop, 23 november 2026. Geen code. Status: voorstel, wacht op de eigenaar. Backlog [I-34] (Pathfinder 12 en 14 november, `docs/onderhoud/2026-11-12-pathfinder-verborgen-schermen.md`). Bouwt voort op `docs/visie/Run in detail.md`, `Vloeiende overgangen.md`, `Ontwerp Info-blad.md`, `Ontwerp instellingen op een plek.md` en het besluit `2026-10-22-loopinzicht.md`.

## 1. De route nu, na een loop

Gelezen in de code van vandaag. Er zijn twee soorten afloop: je vinkt zelf af (of slaat een voorstel van je horloge op), of het horloge vinkt vanzelf af.

1. Van je horloge (`WatchActivityCard.tsx`, kaart op Vandaag). Een voorstel met Opslaan, Andere training (blad `ChooseSheet`) en Niet opslaan. Na Opslaan volgt stap 2.
2. Het moment (`CompletionMoment.tsx`, vol scherm, gestart door `announceSaved` in `state/logActions.ts`). Vinkje, titel, feiten, coachzin, de drie regels doel, week en benen, de kaart Beter en Let op (`RunInsightCard.tsx`), kleding, zweet, citaat, knop Verder.
3. Waarom (`RunInsightSheet.tsx`), een blad over het moment heen, via de i bij Beter of Let op.
4. Terugblik (`DebriefSheet.tsx`), een tweede blad dat pas na Verder opent: wat je test betekent, Telt mee (`TestVerdictCard`, `ZoneUpdateCard`), Telt mee voor, adviezen, knop Begrepen. Alleen na zelf afvinken.
5. Vanzelf afgevinkt: geen moment en geen terugblik. Een rij Hoe ging het? in Je dag (`Today.tsx`) opent `WatchAskSheet.tsx`. Na Opslaan sluit het blad; Beter en Let op zie je dan nergens direct.
6. Later terugkijken, drie ingangen naar dezelfde loop. Week: tik op de training, blad `SessionActionSheet`, rij Training bekijken, `LogDetailSheet.tsx`. Logboek: tik op een dag, `logbook/DaySheet.tsx`, tik op de training, `LogDetailSheet`. Vandaag: de gedane training opent `SessionActionSheet` zonder rij Training bekijken (alleen Week geeft `onOpenLog` mee), dus vanaf Vandaag kom je niet bij je loop.
7. Run in detail (`runDetail/RunDetailScreen.tsx`, vol scherm), alleen via de rij op het logblad. Daarbinnen nog `ExplainSheet` en `PieceSheet` (`RunDetailSheets.tsx`). De TextButton op het moment uit het ontwerp Run in detail is nooit gebouwd.
8. Stand: `RunTrendsCard` opent ook `RunInsightSheet`, maar over trends, niet over één loop.

Tel je mee: zelf afgevinkt is het moment, Waarom, Terugblik, en later blad, logblad, Run in detail, uitleg. Zes tot acht lagen voor "het is klaar, wat zie ik".

## 2. Het ene moment

Uitgangspunt: één plek per loop met één opbouw, die je twee keer ziet. Direct na afloop als vol scherm (het moment), later als het logblad. Wat erin staat komt uit één pure functie, zodat beide hetzelfde zeggen.

### Direct na afloop, van boven naar beneden

- De eerste twee seconden: het bestaande vinkje met hoogtelijnen, het kopje Gedaan, de titel, en één regel feiten (afstand, tijd, tempo; bij een tocht stijging uit `runClimb`). Daaronder de coachzin als die er is. Meer niet boven de vouw; dit is het antwoord op "het is klaar".
- Is het een test die op Telt mee wacht, dan staat `TestVerdictCard` direct onder de feiten, want dat is de enige vraag die ertoe doet. `ZoneUpdateCard` volgt alleen als er een voorstel is. Beide verhuizen uit de Terugblik; hun tekst en Akkoord blijven zoals ze zijn.
- Eén kaart Wat het betekent (`Card`, rijen van 52 px zoals nu): de drie regels doel, week en benen, en daaronder Beter en Let op uit `insightRows`, elk met de i naar Waarom. Hoogstens vijf rijen. Bij een test vervangen de rijen van `testMeaning` (tempo's en wedstrijd, elk met de korte uitleg die er al bij staat) de regel doel. Telt mee voor wordt één rij met een korte uitleg, geen losse lijst. Een advies dat bij dit log hoort (`AdviceItem compact`) wordt de laatste rij.
- Een stille `TextButton` Run in detail onder de kaart, alleen bij een loop of tocht met gegevens van het horloge. Opent `RunDetailScreen` over het moment; terug is het moment.
- De vragen die er al zijn, elk als één rij in een kaart: kleding (`ClothingFeedback`) en zweet (`SweatAfterRow`). Bij Alles opslaan blijft de ingeklapte lijst met alle trainingen staan zoals nu.
- Het citaat, als de instelling aan staat.
- Onderaan vast: Verder (`PrimaryButton`), de enige mint knop. Geen Begrepen meer, want er komt geen tweede blad.

### Achter een tik

Waarom (blad, bestaat), Run in detail (vol scherm, bestaat) en daarin de uitleg per getal (bestaat). Nooit dieper dan twee lagen vanaf het moment.

### Vanzelf afgevinkt

De rij Hoe ging het? blijft de ingang, want een vol scherm dat zomaar opent terwijl je Vandaag leest, is niet rustig. Na Opslaan in `WatchAskSheet` opent het moment in een rustige vorm: zonder het tekenen van de hoogtelijnen, zonder geluid en zonder citaat, met dezelfde kaart Wat het betekent en Run in detail. Zo ziet ook de eigenaar met een gekoppelde Garmin, de gewone situatie, zijn Beter en Let op.

### Later: het logblad als hetzelfde moment

`LogDetailSheet` krijgt bovenaan dezelfde opbouw: kop met datum en titel (`SheetHeader`), de feitenregel, de kaart Wat het betekent (zonder de regel week, want die gaat over vandaag) en de rij Run in detail (`SheetRows`, `SheetRow`, bestaat). Daaronder wat er nu staat: gevoel, sport, test, oefeningen, notities, inkorten, terugzetten. Ingangen: Vandaag krijgt de rij Training bekijken in het blad van een gedane training, net als Week. Het Logboek opent bij een dag met precies één training meteen het logblad; `DaySheet` blijft voor een dag met meer trainingen of geen, en voor Wat speelde er?

### Wat vervalt of verhuist

- `DebriefSheet.tsx` vervalt; inhoud naar het moment en het logblad. `debriefLogId` en `dismissDebrief` in de context gaan mee weg.
- `RunInsightCard` wordt een deel van de kaart Wat het betekent, geen tweede kaart.
- `RunInsightSheet` blijft, ook voor Stand.
- `WatchActivityCard` en `ChooseSheet` blijven: dat is een voorstel voor opslaan, geen terugblik.

### Rekenen, standen en wat ik bewust niet doe

Een pure functie in `engine/` (naam aan de bouwer, bijvoorbeeld `afterRunMoment`) krijgt het log, de logs, de instellingen en de lezing van het loopinzicht, en geeft de feitenregel, de rijen in volgorde en of Run in detail er is. Ze leest `completionSummary`, `insightRows`, `testMeaning`, `extractEvidenceFromLogs` en `runClimb` en rekent zelf niets nieuws. De componenten tekenen alleen.

- Leeg: geen rijen, dan alleen vinkje, titel, feiten en Verder. Geen lege kaart.
- Laden: het loopinzicht leest reeksen. De kaart houdt de plek van twee rijen vrij met de zin Je loop wordt gelezen. `useRunInsight` heeft nu geen eigen tijdsgrens; die komt erbij (bouwer kiest, advies 8 seconden). Verder staat vast onderaan en blijft te tikken, dus er springt niets onder je duim.
- Fout of grens gehaald: één regel in `--color-ink-dim`, bijvoorbeeld Vergelijken lukte nu niet. Je ziet het later in je logboek. Opslaan van zweet die mislukt houdt Verder vast met de bestaande zin, zoals nu.
- Historie blijft append-only. Het moment schrijft alleen wat het nu al schrijft (gevoel en zwaarte via `applyFeedback`, zweet, kleding, Telt mee); `runDetail`, `bestEffort` en `detail` worden nooit omgeschreven.
- Bewust niet: geen nieuwe kleur, letter of token; geen nieuwe animatie (het rustige moment gebruikt de eindstand die Rustig en Uit al hebben); geen kaart over de loop van gisteren op Vandaag of Week; geen extra vraag; geen wijziging aan `planGolden.test.ts`.

## 3. De andere vier delen, kort

### Gidsen naar hun moment

`GidsenGroup.tsx` heeft vijf rijen zonder keuze. Weer en kleding: de weerregel en de tegel in de Briefing (bestaat). Trainingsplekken: het blad Hoe je het doet (bestaat). Datavelden: het blad Je horloge en Koppelingen (bestaat). Bronnen: een `TextButton` Bronnen onderaan `RunInsightSheet` en het blad Uitleg van een training; de zin in `RunInsightSheet` die naar Instellingen, Gidsen en kennis wijst, wordt die link. Kennisbank: een rij op Ascend bij een doel dat een tocht is (`JourneyRows`, naast Reisplanner en Paklijst). Daarna gaat de groep uit het tandwiel; het zoekveld vindt de vijf nog en opent de pagina. Onderdelen: `SheetRow`, `TextButton`. Geen blad nodig.

### Forge-instellingen tijdens het trainen

Het menu van de training (`WorkoutMenuSheet` in `forge/ForgeMenus.tsx`, via `ForgeSheet`, dus met `useSheetClose` en `SheetGrip`) heeft al een schakelaar Een oefening per scherm. Daar komt één rij Instellen bij, die een tweede `ForgeSheet` opent met de zes tot acht keuzes die je met een stang in je handen wilt: rusttijd, signaal als de rust om is, volume, schijven tonen, 1RM tonen, bijsturen in de training, uitleg uitgeklapt, plaatjes bij oefeningen. Onderdelen: `Toggle`, `Segmented`, `Stepper`, `MenuRow`. Elke rij leest dezelfde verklaring uit `engine/settingsDefs/forge.ts` als de pagina achter het tandwiel; een veld in de verklaring zegt dat hij ook in dit blad staat, er komt geen tweede kopie. De volledige pagina blijft achter het tandwiel. Het blad sluit nooit de training.

### Instellingen per onderwerp

Na de verhuizing naar `settingsDefs/` (stap 3 is af) kan dit per onderwerp, elk een eigen branch. Back-up: negen rijen naar één rij met een blad. Ochtend: tien rijen uit drie groepen naar één blad Ochtend. Weer: twaalf rijen naar één blad, ook bereikbaar vanaf de pagina Weer. Loop: zeventien schakelaars (Run in detail, Loopvorm, Loopinzicht, weer en borstband) naar drie rijen onder één kop Na je loop, elk met een `ChoiceSheet`; dit hangt samen met deel 2, want het moment leest juist deze keuzes. De sleutels in `AppSettings` blijven, dus geen migratie; de foto `instellingen-foto.json` verandert bewust per stap. Een Geavanceerd-pagina met minder dan zeven rijen vouwt in zijn groep.

### Alleen onderweg en Als het misgaat

Eén thuis: de pagina Alleen onderweg (`AlleenOnderweg.tsx`, achter `TrekOnly`) houdt het alarmnummer, de stappen en de vertrekbrief, en krijgt de uitleg van Kennis `noodgevallen` als één ingeklapte regel per onderwerp die opent in een blad (`InfoSheet` of eigen blad met `useSheetClose` en `SheetGrip`). Het Kennisbankonderwerp wordt een rij die naar de pagina wijst; de taak in `journeyTasks.ts` wijst naar `/onderweg`. Zonder tocht blijft de pagina dicht zoals nu.

## 4. Stappen, elk een eigen branch

1. `claude/na-loop-terugblik-weg`: de Terugblik in het moment (Telt mee, Wat je test betekent, Telt mee voor, advies), de pure functie met tests per soort (loop, test, kracht met en zonder advies, Alles opslaan), `DebriefSheet` weg. Kleinste waardevolle stuk: elke zelf afgevinkte training één laag minder. Engine plus UI: Warden en Lookout.
2. `claude/na-loop-ingangen`: Run in detail op het moment, Training bekijken op Vandaag, één training in het Logboek meteen naar het logblad. Lookout; Pathfinder, want de route verandert.
3. `claude/na-loop-logblad`: de kaart Wat het betekent bovenaan het logblad. Lookout.
4. `claude/na-loop-horloge`: het rustige moment na Hoe ging het? Raakt `announceSaved`: Warden en Lookout.
5. `claude/gidsen-naar-moment`, 6. `claude/forge-instellen-blad`, 7. per onderwerp `claude/instellingen-<onderwerp>`, 8. `claude/onderweg-samen`. Elk Lookout; 5 en 8 ook Pathfinder.

Elke stap: `tsc`, lint, vitest, build, `kaart:vergelijk`, altijd mee `sheetDrag.scan.test.ts` en `todayOneMint.scan.test.ts`, Lookout op 360 en 390 px in Normaal, Rustig en Uit. Een nieuw besluit per stap in `docs/beslissingen/`.

## 5. Kleine Mag-punten uit [I-34], bestaan ze nog

- Trekdoel dat geen hoofddoel is: bestaat nog. `useJourney.ts` (nu regel 34) neemt `programAnchorDate`, de datum van het hoofddoel, zodra er ergens een trekdoel is. De Reisplanner is niet nagegaan.
- Etappes: bestaat nog, `Etappes.tsx:103` zegt Nog geen tocht om mee te vergelijken.
- `hasTrekGoal`: een gepauzeerd trekdoel telt mee (`listedGoals` laat alleen afgerond, gearchiveerd en voorbij weg); afgerond telt niet.
- Kennisbank zonder doel: bestaat nog; `Knowledge.tsx` en `useWeeklyLesson` kijken niet of er een tocht is. Welke les dan als eerste komt, niet nagegaan.

## 6. Open keuzes voor de eigenaar

1. Na Hoe ging het? het rustige moment openen? Advies: ja, zonder hoogtelijnen, geluid en citaat. Zonder antwoord bouwen we stap 4 zo.
2. Een test die op Telt mee wacht bovenaan het moment, voor de regels? Advies: ja. Anders blijft de vraag onder de vouw.
3. Logboek met één training op een dag meteen naar het logblad? Advies: ja; Wat speelde er? staat ook op het logblad.
4. Kennisbank op Ascend alleen bij een tocht? Advies: ja, zoals Reisplanner en Paklijst.
5. Welke acht Forge-instellingen in het blad? Advies: de lijst in deel 3; u kunt er een ruilen.

## Samenvatting

1. Na een loop zijn er nu zes tot acht lagen; vanzelf afgevinkte lopen tonen Beter en Let op nergens direct, en vanaf Vandaag kom je niet bij je loop.
2. Eén moment: feiten en vinkje eerst, dan één kaart Wat het betekent met test, doel, week, benen, Beter, Let op en advies; de Terugblik vervalt.
3. Later is het logblad hetzelfde moment, met één ingang vanaf Vandaag, Week en Logboek, en Run in detail achter één tik.
4. Gidsen naar hun moment, Forge-keuzes in een blad bij de training, instellingen per onderwerp, Alleen onderweg en Als het misgaat op één pagina.
5. Acht losse branches, de Terugblik eerst; alle vier Mag-punten bestaan nog en gaan als losse fixes.
