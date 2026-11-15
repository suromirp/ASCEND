# Uitslag Afbreker randgevallen (Warden, 15 november)

Beoordeeld: `origin/claude/afbreker-rand` (ba0e481, I-4) tegen `origin/main` (b243965), met een proefmerge op `origin/claude/nacht` (148ee25), zonder conflicten. De merge raakte alleen de overdracht, het kostenlogboek en de backlog.

Akkoord. Geen blokkerende punten. Er is niets naar nacht of main gepusht en de code van de bouwer is niet gewijzigd.

## Punt 3, de dag van de laatste set: raakt het historie?

Nee. De gekozen dag (`doneOn`) gaat alleen naar `completedDate` van het log dat Afronden op dat moment nieuw maakt (`src/components/forge/forgeFinishLog.ts` regel 28, daarna `logSession`). Er is geen schrijfroute naar een bestaand `SessionLog`, geen nieuw bewaard veld, dus geen migratie en geen zesde uitzondering. De koppeling aan de geplande sessie blijft (`plannedSessionId`), "gedaan" blijft afgeleid van het log. `logDay` laat een log uit Forge op zijn eigen `completedDate` staan (alleen MacroFactor met de geplande dag precies een dag later verschuift in de weergave), en belasting, beenindex en de 48 uur lezen `completedDate`, wat hier juist de bedoeling is. Het besluit staat in `docs/beslissingen/2026-11-15-dag-van-afronden.md` en heeft een regel in de kennisindex.

De standaard is nooit stil: bij een geplande training staan de knoppen er zodra de voorgestelde dag niet vandaag is. Nagerekend over vijf tijdzones, geplande dagen van 70 dagen terug tot 5 dagen vooruit en sets van 70 dagen terug tot 30 uur vooruit: de voorgestelde dag ligt nooit na vandaag en staat altijd tussen de knoppen, of er is geen keuze en het is vandaag.

## Moet (klein, mag in dezelfde ronde of bij het volgende bouwmoment)

1. `docs/werkbriefjes/forge.md` en `docs/werkbriefjes/historie-en-logs.md` noemen de nieuwe regel niet (geen treffer op Gedaan op, laatste set of `finishDayDefault`). Een volgende bouwer begint bij het briefje. Voorstel voor Valkuilen in forge.md: "Afronden stelt de dag van je laatst afgevinkte set voor, ook bij een geplande training (`engine/forgeSession.ts#finishDayDefault`, `finishDayChoices`); een log uit Forge kan dus een andere `completedDate` hebben dan de geplande dag. Alleen het nieuwe log, nooit een bestaand." En bij Bestanden in historie-en-logs.md een regel voor `finishDayDefault` naast `logDay`.

## Mag

2. `src/components/forge/FinishSheet.tsx` regel 68 tot 71 met `src/engine/forgeSession.ts` regel 231: een set opnieuw afvinken verzet de voorgestelde dag. Gepland maandag 16 en maandag gedaan, woensdag 18 voor het afronden een set uit en weer aan gezet: de standaard wordt woensdag, waar hij voor deze wijziging maandag was. Bij een beendag telt de rust dan twee dagen te laat. Het is zichtbaar (knoppen ma 16 en vandaag, vandaag gekozen), dus geen stille fout. Overweeg de dag van de laatste set alleen te volgen als die niet later is dan het laatste moment waarop de sessie echt liep, of laat het zo en noem het in het besluit.
3. `src/components/forge/FinishSheet.tsx` regel 69 leest `doneAt` van elke rij, ook een rij die niet is afgevinkt. Nu kan dat niet misgaan (`unticked` in `engine/forgeWorkout.ts` regel 711 haalt het moment weg), maar een filter op `r.done` maakt het bestand tegen een beschadigd concept.
4. `src/components/forge/SessionPill.tsx` regel 114: het keuzeblad van de pil heeft geen `key`. Wordt in een ander tabblad training A verwijderd en meteen B gestart terwijl het blad van A openstaat, dan krijgt hetzelfde blad de sessie van B en doet Afronden dat op B, zonder de zin dat A weg is. `ForgeWorkout.tsx` regel 140 heeft die sleutel wel. Voorstel: in `pillSlot` een andere sleutel dan die waarmee het blad openging ook als weg behandelen.
5. `src/engine/forgeSession.ts` regel 233: zonder afgevinkte set krijgt een geplande training van langer dan 60 dagen terug nog steeds die oude dag, terwijl de dag van een set wel op 60 dagen begrensd is. Bestond al, niet van deze wijziging.

## Wat ik probeerde te breken

Negen mutaties in `src/engine/forgeSession.ts`, elk apart, tegen `forgeLeft.test.ts`, `afbrekerRand.render.test.ts` en `sessionChoice.render.test.ts`. Alle negen worden gevangen: vandaag buiten het veld van de set, de geplande dag weer voor de set, de dag van de set uit de knoppen, een geplande dag na vandaag in de knoppen, 60 dagen opgerekt, Begrepen zonder vervolg, weg melden na een eigen keuze, het blad vasthouden zonder dat het openstaat, en een enkele knop als keuze.

Een tijdelijke proeftest (weer verwijderd, niet in de repo): middernacht in Amsterdam (22:59:59 UTC is nog de dag ervoor, 23:00:00 UTC de dag zelf), de nacht van de zomertijd op 29 maart, een concept dat dagen tot weken later wordt afgerond, een set die dagen later opnieuw is afgevinkt (punt 2), en de eigenschap hierboven over vijf tijdzones. Alles groen. Een sessie over twee dagen neemt de laatste set (`Math.max` in `FinishSheet.tsx` regel 70); dat dekt de toets van de bouwer "concept over de nacht" al. `dayOf` en `today` komen allebei uit de lokale klok (`utils/dates.ts#toISODate`), dus ze kunnen niet uit elkaar lopen.

Punten 1 en 2 van de opdracht (Begrepen start de gekozen training, het blad van de pil blijft): `afterChoiceClose`, `choiceSheetSeesGone` en `pillSlot` zijn pure stappen in de engine en getest; `ForgeWorkout` kijkt na Begrepen opnieuw of er een andere training loopt, dus er lopen er nooit twee. De zin zegt wat Begrepen doet. Planning en logboek veranderen daar niet.

Regels: geen gedachtestreepjes, geen losse kleuren, de rode Verwijderen is nu `TextButton` met `tone="danger"`, vaste woorden Begrepen en Annuleren, geen persoonsgegevens.

## Controles op de proefmerge (ba0e481 op 148ee25)

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen, één bestaande waarschuwing in `src/components/LegFatigueCard.tsx` regel 25 (niet van deze wijziging).
- `npx vitest run`: groen, 728 bestanden, 10796 toetsen.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: "Geen verschil met docs/kennisindex/."

## Niet gecontroleerd

- `npm run kaart:vergelijk` liep na ruim vijf minuten nog en is niet afgewacht. Het blad Training afronden verandert zichtbaar (knoppen bij Gedaan op), dus de coördinator draait de vergelijking voor main.
- Niets in een echte browser: het effect in `SessionChoiceSheet` (abonnement op de sessie) en de plek van de pil zijn alleen als pure stap en als bronscan getest, niet gemount. Dat is werk voor Lookout op 360 en 390 px, met twee tabbladen.

Akkoord voor main, na Lookout, Pathfinder en de tekstkaart.
