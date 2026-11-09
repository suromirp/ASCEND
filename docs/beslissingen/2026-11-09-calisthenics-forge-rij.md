# Calisthenics in Forge: de rij voor een stap, seconden, netjes en band

Datum: 2026-11-09
Status: aangenomen

## Besluit

Een oefening op een ladder krijgt in Forge een regel met de stap en de toets, en een tik naar de stap ervoor of erna, alleen op het scherm (F4b). Een houding krijgt seconden in het cijferblok, na een set komt de vraag "Ging het netjes?", optrekken en dip krijgen een band, en een stap met extra gewicht gebruikt het gewone gewichtsveld (F4c). Drie instellingen, allemaal aan. Dit is een tekstontwerp; de bouwer heeft geen vragen nodig. Alle teksten staan letterlijk hieronder.

## F4b: de rij voor een stap

Alleen bij een oefening met `Exercise.ladder`, en alleen als de instelling Stappen bij calisthenics aan staat. Opbouw van boven naar beneden in `ExerciseBlock.tsx`, direct onder de kop en boven de notitie en de redenen:

1. Regel 1: "Stap 4 van 7". Het tweede getal is `steps.length` van de ladder (push-up 7, optrekken 5, dip 4), nooit een vast getal. Stijl als de subregel van de kop: `text-xs`, `ink-dim`, `tabular-nums`.
2. Regel 2: "Toets: 3 keer 8". Een houding: "Toets: 3 keer 30 seconden". Met extra gewicht: "Toets: 3 keer 8 met 2,5 kg extra" (getal via `formatNumberNL`).
3. Regel 3, de uitleg bij die getallen: "Haal je dat met nette vorm, dan kan de volgende stap." Op de laatste stap: "Dit is de zwaarste stap." Zo zijn regel 2 en 3 samen de korte uitleg.
4. Een rij van twee `TextButton`s (`size` normaal, 44 px hoog, `-mb-1` zoals bij Lichter): "Stap lichter" en "Stap zwaarder". Op stap 1 ontbreekt de eerste, op de laatste stap de tweede (niet uitgeschakeld, weg). Het woord Lichter blijft van het bestaande voorstel om het gewicht te verlagen; daarom "Stap lichter".

Op 360 px past alles in één kolom: de twee knoppen samen zijn ongeveer 230 px breed binnen de 328 px; de regels breken zo nodig, de knoppen nooit.

Gedrag van de tik: dezelfde route als Ruilen (`p.swap(slot, exerciseId)` in `useForgeSheets` / `forgeWorkout.ts`, met `swappedFrom` zodat de kop "voor Push-Up" toont en het menu "Terug naar Push-Up" heeft). Dezelfde regel als Ruilen voor gedane sets: de bouwer kopieert wat Ruilen nu doet. De planning en de template veranderen niet; het blad Oefening gebruikt de bestaande tekst. Gaat de sessie dicht en weer open, dan geldt het concept zoals bij Ruilen.

Wat de nieuwe stap meeneemt. Het aantal rijen blijft, het doel komt van die stap zelf: herhalingen uit je laatste training op die stap, anders "5" (`SKILL_FLOOR_REPS`); seconden uit je laatste training op die stap, anders "10" (`SKILL_FLOOR_SECONDS`). Je herhalingen van de vorige stap gaan niet mee: acht push-ups zeggen niets over acht diamond push-ups. Bij een andere meeteenheid (houding naar herhalingen, bijvoorbeeld Dead hang naar Scapular pull-up, of terug) bouwt de oefening zich gewoon opnieuw op met de kolommen van de nieuwe stap: "sec" wordt "Herh." en omgekeerd. Er gaat niets mee en er is geen aparte melding. Gewicht gaat alleen mee tussen twee stappen met extra gewicht; anders blijft het veld leeg of op het doel.

Het voorstel van `ladderState` (F4d volgt): alleen een stille regel, `text-xs`, `ink-dim`, met `border-l-2` zoals de redenregel, zonder knop. Alleen op de oefening die op de huidige stap staat (harder) of op de stap erboven (lighter). Staat de oefening al op de voorgestelde stap, dan geen regel. Teksten: harder "Toets gehaald. Volgende stap: {naam}." en lighter "Drie trainingen onder de onderkant. Lichtere stap: {naam}." De naam is `ex.name` van de voorgestelde stap.

## F4c: seconden, netjes, band, extra gewicht

**Seconden voor een houding.** Voor `Exercise.measure === 'hold'` (Dead hang, Steunhouding) bouwt Forge een eigen houdingsrij; de bestaande `timed` (een doel als "30 sec" zonder invoer) blijft zoals hij is. Kolommen: Set, Voorschrift, kg (alleen als de stap extra gewicht heeft, anders leeg), sec, geen RIR, vinkje. De kolom "sec" is een `ValueCell` voor een nieuw veld `seconds` in `FieldName` (`forgeInput.ts`), geopend in het bestaande cijferblok (`ForgeDock.tsx`). Minder en Meer in het blok gaan in stappen van 5 seconden; `dockKey.scan.test.ts` blijft groen. Het voorschrift: je laatste seconden op deze stap, hoogstens de toets, anders 10. Afvinken zonder invullen neemt het voorschrift over, zoals bij herhalingen. Naar het log: `SetLog.seconds` en `reps: 1`, met `isWorkSet` zoals altijd. "Set toevoegen" blijft bij een houding (het verdwijnt alleen bij `timed`). `learnFatigue`, `estimateSet` en de 1RM-schatting slaan een set met `seconds` over (een houding heeft geen fractie; tests). Er komt geen stopwatch in deze stap: je kijkt zelf op je horloge en tikt het getal in.

**RIR.** De bolletjes en "Hoeveel over?" blijven voor herhalingen, ook op een ladderstap. Bij een houding vallen ze weg: tot het einde vasthouden heeft geen reserve om te schatten, en een aangenomen RIR zou de ladder niets zeggen.

**Ging het netjes?** Na het afvinken van een werkset op een ladderstap, alleen als de set de onderkant haalt (5 herhalingen of 10 seconden); eronder verandert het antwoord niets aan de uitkomst. Zelfde plek en stijl als `QuickRir`: in de rij onder de set, `animate-fade-in`, vraag "Ging het netjes?" en twee knoppen "Ja" en "Nee" (`h-11 min-w-[44px] px-4 rounded-full border`, 44 px hoog). Ja zet `clean: true`, Nee `clean: false`; niets kiezen laat `clean` leeg (onbekend telt als netjes, zoals de engine al doet). Staat ook "Hoeveel over?" open, dan staat deze vraag eronder, zonder extra hintregel. De vraag verdwijnt bij de volgende handeling in de oefening. Achteraf wijzigen kan in het langdrukmenu van de rij: drie `MenuRow`s "Netjes: ja", "Netjes: nee", "Netjes: weet ik niet". Uitleg bij de vraag staat in de instelling (hieronder).

**Band.** Gekozen: alleen Pull-Up en Dip (de stappen 4 van optrekken en 3 van dip), via `assist: 'band'` op die twee ids in `data/exercises.ts`. Reden: een band helpt in het omhoog gaan, en alleen daar zit de sprong naar de volle stap. Bij negatieven, schouderblad-optrekken, houdingen en stappen met extra gewicht helpt hij niet of past hij niet. Opbouw: onder de stapregels een `Segmented` (`tall`, label "Band") met "Geen", "Licht", "Middel", "Zwaar", elk ongeveer 80 px breed. Standaard de band van je vorige keer op deze stap, anders "Geen". Een keuze geldt voor de open sets; een gedane set houdt wat erop stond. Naar het log: `SetLog.band`, alleen bij Licht, Middel of Zwaar. Een set met band telt in `engine/skillLadder.ts` (`setValue`) niet mee voor de onderkant of de toets van die stap: met hulp haal je de stap nog niet. Je werkt dan door tot je zonder band haalt. Dat is een kleine aanpassing in de engine met een eigen test.

**Extra gewicht.** Het gewone gewichtsveld, kop "extra kg" (zoals "hulp kg" bij hulp), stap 2,5 kg, voorschrift de laatste keer op deze stap, anders 2,5. Geen nieuw veld. Staat er bij Pull-Up of Dip 2,5 kg of meer in een werkset, dan komt onder de rij een stille regel: "Telt voor {naam van de stap met gewicht}." Zie het kleine punt hieronder.

## Instellingen

Alle drie in de groep Forge, in het blad "Bij het invullen" (`bundel-invullen`), na "Hoeveel over na een set". Telkens een schakelaar, standaard aan (het advies), met `strengthFlag` in `settingsDiff.ts`, een regel in `BUNDLE_FILL` en `settingsSummary.ts` (`{ checked }`), een rij in `settingsIndex.ts` en `settingsLayout.ts` (`inSheet('bundel-invullen', ...)` en de zichtbaarheidsregel `rule([B.inApp], ...)`), en een `SummaryRow` in `ForgeGroup.tsx`. Opslag in `StrengthSettings`: `ladderRow`, `askClean`, `askBand`, allemaal `?? true`.

- "Stappen bij calisthenics" (`forge-stappen`): "Forge toont bij een oefening op een ladder de stap, de toets en een tik naar een lichtere of zwaardere stap." Uit: geen regels en geen tik; seconden voor een houding blijven werken.
- "Ging het netjes?" (`forge-netjes`): "Na een set op een ladderstap vraagt Forge of je vorm netjes was. Een Nee telt die set niet voor de toets." Uit: de vraag komt niet, `clean` blijft leeg. Zichtbaar zodra Stappen bij calisthenics aan staat.
- "Band bij optrekken en dip" (`forge-band`): "Je kiest de band die je gebruikt. Een set met band telt niet voor de stap." Uit: geen keuze. Zichtbaar zodra Stappen bij calisthenics aan staat.

Zoektermen in `settingsIndex.ts`: calisthenics, ladder, stap, toets, netjes, vorm, band, houding, seconden.

## De twee kleine punten

**Decline push-up.** De nuance `elevated` blijft "met je voet verhoogd": hij hoort bij de Bulgarian split squat, daar is één voet juist goed. Voeg in `exerciseFamilies.ts` een nieuwe nuance `feet` toe en geef de decline push-up die in plaats van `elevated`. In `NUANCE_TEXT` (`forgeWorkout.ts`): `feet: { on: 'met je voeten verhoogd', off: 'met je voeten op de grond' }`. Test: de reden bij Push-Up naar Decline push-up zegt "met je voeten verhoogd".

**Weighted Pull-Up en Weighted Dip bij een import.** De aliassen blijven bij `pull-up` en `dip`. Ze kunnen niet naar de stap met extra gewicht: de naam in een import zegt niet hoeveel gewicht, en een log herschrijven mag niet. Wel kan de engine het bij het lezen afleiden, zonder iets op te slaan. In `skillLadder.ts#trainingsOn` hoort een set op een stap bij de volgende stap als die stap `addedKg` heeft, de set op een oefening met `resistance: 'bodyweight'` staat, geen band heeft en `weightKg` minstens `addedKg` (2,5) is. Advies: doen. Gevolg: een import van twee jaar terug met 10 kg erbij telt vanaf nu voor Pull-Up With Added Weight. Het blijft een voorstel met Akkoord (F4d), dus de planning verandert nooit stil. Test: een set Pull-Up met 5 kg telt voor stap 5, met 2 kg niet, met band niet.

## Wat we bewust niet doen

Geen wijziging van planning of template (F4d). Geen stopwatch, geen band bij negatieven of houdingen, geen RIR bij een houding. Geen nieuw token, geen nieuwe kleur: de regels zijn `ink-dim`, de knoppen de gewone `TextButton`. Eén mint accent blijft het accent van Forge zelf.

## Te toetsen

Op 360 en 390 px: de drie regels breken zonder de knoppenrij te breken; "Stap lichter" en "Stap zwaarder" zijn minstens 44 bij 44 px; de Segmented met vier segmenten past in 328 px; Ja en Nee zijn 44 px hoog, niets kleiner dan 12 px. Een tik op een stap wisselt de oefening, de kolommen (sec of Herh.) kloppen, de kop toont "voor ..." en Terug naar werkt. Een houding: cijferblok opent op "sec", Minder en Meer gaan met 5, afvinken zonder invullen neemt het voorschrift over, het log heeft `seconds` en `reps: 1`. Ja, Nee en niets kiezen geven `clean` waar, onwaar of leeg. Band beïnvloedt `setValue`. Elke nieuwe verschijning (de vraag, de regel met het voorstel) in Rustig en Uit direct op de eindstand en 150 tot 400 ms ease-out in Vol, zonder lus. Dock-scan, `sheetDrag.scan.test.ts`, `planGolden.test.ts`, tekstkaart (`npm run kaart:vergelijk`). Controleer dat een houdingsset de 1RM en de vermoeidheid niet raakt.

## Bron

`docs/beslissingen/2026-11-09-calisthenics-ontwerp.md` (Wat later komt 1 en 2, Stand), `docs/werkbriefjes/forge.md`, `docs/beslissingen/2026-10-27-stem-van-ascend.md`.

## Vervangt

Niets.

## Terugdraaien

Zet de drie instellingen uit, of haal de regels en de houdingsrij uit `ExerciseBlock.tsx`. De logvelden `seconds`, `band` en `clean` zijn optioneel en blijven leesbaar.

## Stand

Gebouwd: F4b en F4c, met de drie instellingen en de twee kleine punten. De regels staan in `engine/forgeLadder.ts`; `ExerciseBlock.tsx` toont ze. Geen hogere schemaversie: `seconds`, `band` en `clean` bestonden al op `SetLog` en `migrateLogSetSkill` laat een kapotte waarde al vallen, dus daar hoefde niets bij. Eigen keuzes in deze stap:

- De open vraag over gedane sets: Ruilen kan alleen zolang er in de oefening niets is afgevinkt (`canSwap`). Stap lichter en Stap zwaarder volgen dat: met een gedane set staan ze er niet. Een tik terug naar de oefening van het plan is gewoon Terug naar, zonder "voor ..." in de kop.
- Ging het netjes? en de band werken alleen met Stappen bij calisthenics aan, zoals ze ook alleen dan zichtbaar zijn. Na een set met band komt de vraag niet: die set telt toch niet voor de stap.
- `estimateSet` slaat naast een set met `seconds` ook een set met `band` over. Een band helpt een onbekend deel; zo'n set zou anders je kracht en 1RM te hoog schatten.
- Het doel op een nieuwe stap is de hoogste werkset van je laatste training op die stap (met dezelfde band als nu klaarstaat), een houding hoogstens de toets. Die rijen komen niet uit het krachtmodel: geen opwarmsets en geen redenregel.
- Een houding krijgt de houdingsrij altijd, ook als het sjabloon "30s" zegt. De seconden staan vooraf ingevuld zoals herhalingen; afvinken van een lege rij neemt het voorschrift over. Ingeklapt zegt een houding alleen het aantal sets.
- In het setmenu staan Netjes: ja, nee en weet ik niet alleen bij een gedane werkset op een ladderstap; de huidige keuze heeft een vinkje.
- De regel "Telt voor ..." staat er alleen met Stappen bij calisthenics aan. De stap met extra gewicht gaat met Minder en Meer per 2,5 kg, tenzij je een eigen stap voor de oefening hebt.
- Een nieuwe klasse `mx-row-in` in `index.css` voor de vraag: `animate-fade-in` speelt in Rustig nog, deze staat daar meteen op de eindstand. "Hoeveel over?" gebruikt nog `animate-fade-in`; dat is niet aangeraakt.
- Met MacroFactor als bron of bij alleen kijken staan de drie regels en de stille regel er wel, de knoppen en de band niet.
