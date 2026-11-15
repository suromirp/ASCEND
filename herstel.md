# Herstelopdracht Forge Afronden nawerk

Warden, 15 november. Branch `claude/forge-afronden-nawerk` op 3b27452 (I-44, I-45, onderhoud completedAt).

Oordeel: AKKOORD. Geen blokkerend punt. Twee moet-punten voor de squash, vier mag-punten.

## Wat klopt

- `firstDoneAt` blijft in het concept. `toStrengthData` kiest elk veld zelf, `forgeLogInput` geeft geen rijen door, de export leest geen localStorage. Proeftest: na uit en aan, alles uit en aan en een herladen concept staat het woord nergens in wat naar `logSession` gaat.
- De pil: `nextPillLast` en `pillSlot` houden een open blad bij de sessie waarvoor het openging; `startedAt` verandert nooit binnen een sessie, dus de sleutel is stabiel. De stap komt altijd tot rust (geen lus bij het zetten van state tijdens het tekenen).
- `finishCompletedAt`: 3000 gevallen rond middernacht en rond elke klokwissel van 2026, in vijf tijdzones (Amsterdam, Lissabon, Auckland, Los Angeles, Kolkata): nooit later dan nu, nooit een andere dag dan `completedDate`, vandaag is nu. 12:00 plaatselijke tijd bestaat op elke dag, ook bij de klokwissel.
- Alleen nieuwe logs: `forgeLogInput` is de enige aanroeper en `writeLog` maakt altijd een nieuw id. Geen bestaand log wordt beschreven. Geen vlag voor voltooid, geen nieuwe bewaarde vorm (dus geen migratie nodig), geen losse kleuren, geen gedachtestreepjes, geen persoonsgegevens.
- Besluit staat in `docs/beslissingen/2026-11-15-dag-van-afronden-opnieuw-afvinken.md`; kennisindex zegt geen verschil.

## Moet

1. `src/engine/forgeSession.ts:248` en `src/components/forge/forgeFinishLog.ts:34`: het tijdstip is alleen het moment van de laatste set als de allerlaatste set van de training op de gekozen dag viel. Viel er later nog een set op een andere dag (maandagavond drie sets, één na middernacht) en kies je maandag, dan krijgt het log 12:00 terwijl er op maandag om 23:40 een set staat. De opdracht was: het tijdstip van de laatste set op die dag. Gevolg nu: de volgorde binnen de dag klopt niet (`strengthHistory.ts#legsTiredAt` leest "wat eerder op de dag kwam"). Voorstel: een functie in `engine/forgeWorkout.ts` die het laatste moment van werk op een gegeven dag geeft (zelfde regel als `lastWorkMoment`, gefilterd met `dayOf`), en die aan `finishCompletedAt` geven; 12:00 alleen als er op die dag geen set is. Proeftest "ROOD NU (moet 1)".

2. `src/pages/Today.tsx:217`, `src/components/settings/groups/GegevensSheets.tsx:30`, `src/storage/backupPreview.ts:307`: "trainingen sinds je back-up" telt op `completedAt > back-up`. Een Forge-log van gisteren dat je vandaag na een back-up afrondt had tot nu toe het tijdstip van opslaan en telde mee; nu ligt het tijdstip voor de back-up en telt het niet. Het log staat niet in de back-up, maar de herinnering en de waarschuwing bij terugzetten zeggen één te weinig. Dit bestond al voor horloge-activiteiten; deze wijziging trekt Forge erbij. Voorstel: of de telling vergelijken met de inhoud van de back-up (ids) in plaats van met tijd, of dit als bekende kost in het besluit zetten met een Inboxpunt. Stil laten kan niet. Proeftest "ROOD NU (moet 2)".

## Mag

3. `src/components/forge/forgeAfrondenNawerk.render.test.ts:228`: de titel zegt "over vijf tijdzones", de test draait alleen in Amsterdam (TZ staat één keer bovenaan). Titel aanpassen of de proeftest overnemen en per tijdzone draaien.
4. Reizen: de dag van een set wordt bepaald in de tijdzone van de telefoon op het moment van afronden. Een set om 00:30 in Nederland is in Portugal 23:30 de dag ervoor; Afronden stelt dan die eerdere dag voor. In zichzelf klopt het (dag en tijdstip horen bij elkaar) en de dag is zichtbaar en te kiezen. Alleen vastleggen.
5. Een concept van voor deze versie heeft geen `firstDoneAt` op een set die al uit stond; die telt bij opnieuw afvinken als nieuw werk. Loopt vanzelf weg.
6. Proefmerge: rechtstreeks mergen op main botst op zestien bestanden, omdat de branch op `claude/nacht` staat en main die historie als squash heeft. De drie eigen commits los op origin/main (cherry-pick van 150c30b, 015dfbd, 3b27452) geven één botsing, in het gemaakte `docs/kennisindex/README.md` (de telling); `npm run kennisindex` lost die op (531 documenten). Daarna groen: tsc, lint, build, 10910 van 10911 tests; de ene rode was de tijdtest `leavePlanAround.test.ts` "stays fast", los gedraaid groen en niet van Forge.

## Voorgestelde regels voor de briefjes

- `docs/werkbriefjes/historie-en-logs.md`, Valkuilen: "Een log kan een `completedAt` in het verleden hebben (Forge op een eerdere dag, horloge, MacroFactor). Tel 'nieuw sinds' nooit op `completedAt`; vergelijk met wat er in de back-up staat."
- `docs/werkbriefjes/forge.md`, Valkuilen: "Het tijdstip bij een gekozen dag is de laatste set op die dag, niet de laatste set van de training; 12:00 alleen zonder set op die dag. De dag van een set is de dag in de tijdzone van de telefoon bij het afronden."

## Controles

- Op de branch (3b27452): `npx tsc -p tsconfig.app.json --noEmit` groen, `npm run lint` groen (één bestaande waarschuwing in `LegFatigueCard.tsx`), `npx vitest run` 730 bestanden en 10847 tests groen, `npm run build` groen, `npm run kennisindex:vergelijk` geen verschil.
- Proeftests: `src/components/forge/wardenForgeNawerk.proef.test.ts` op deze branch, tien tests, in vijf tijdzones gedraaid: acht groen, twee met opzet rood (moet 1 en 2).
- Niet gedraaid: `npm run kaart:vergelijk` (Chromium) en de doorloop op 360 en 390 px; die zijn van Lookout. De Chip en het datumveld van 44 px heb ik alleen in de bron en de gerenderde tekst gelezen.
