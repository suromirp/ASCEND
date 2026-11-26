# Sherpa Historie, bouwmoment 26 november (tweede vervolg)

Branch `claude/historie-mag-26nov`, vanaf origin/main 3b9dda6. Klaar: I-140, I-139.

## Wat er gebouwd is

- I-140, opslag: `SessionLogsRepo.add` (`src/storage/databaseRepos.ts`) heeft geen readonly-voorcontrole meer. Kijken en schrijven alleen in de readwrite-transactie: één `getAll` per nieuw log met sleutel, geen bij een losse training. Geen index, geen migratie, opgeslagen vorm gelijk. Gedrag op dubbels gelijk: zelfde `plannedSessionId` of `externalId` geeft nee en schrijft niets (er werd nooit samengevoegd, alleen geweigerd).
- Tests in `src/storage/sessionLogsAdd.test.ts` (fake-indexeddb): dubbel op geplande training en op externalId geweigerd, één readwrite-transactie en één keer lezen, twee gelijktijdige `add` geven één log, een losse training leest niets, en een fout in `put` (een functie in het log, DataCloneError) laat niets half staan en een volgende poging lukt.
- I-140, Hoe ging het?: na de grens in tijd (slow) stond Opslaan uit met "Opslaan…" tot de eerste poging antwoordde, zonder bovengrens; Forge zette hem na de grens weer aan. Nu de pure regel `saveButton` in `src/components/logForm/howDidItGo.ts`: bij een geplande training gaat Opslaan na de grens weer aan; een tik gaat dan naar de wachtstand `still` (`waitForEarlier` in `src/components/HowDidItGoSheet.tsx`, via `waitForEarlierSave`, hoogstens 30 s) en schrijft geen tweede log. Een losse training houdt Opslaan uit tot het klaar is (zoals de zin `slowLoose` zegt). Tests in `src/components/howDidItGo.render.test.ts`.
- I-139, Forge: `FinishSheet.tsx` liet `busy.current` aan staan als het blad weg was na het wachten. Nieuwe helper `waitThenShow` in `src/components/forge/forgeFinishLog.ts` zet busy altijd terug (ook bij een fout), toont de zin alleen in beeld. Test `src/components/forge/forgeFinishWait.test.ts`.
- I-139, valkuil: in `docs/werkbriefjes/koppelingen-en-data.md` (het briefje dat `nearbyTerrain.ts` noemt), achter de bestaande valkuilregel over locatie en weer, omdat het briefje op de grens van 45 regels zat.
- I-139, besluit: `docs/beslissingen/2026-11-26-wachtgrens-eerdere-opslag.md`, met de regel in `docs/kennisindex/bronnen.json`; `npm run kennisindex` en `kennisindex:vergelijk` zeggen "Geen verschil met docs/kennisindex/."
- Werkbriefje `historie-en-logs.md`: de zin over de readonly-voorcontrole (I-134) vervangen door één keer kijken in de readwrite-transactie.

## Afweging

- Het weghalen van de readonly-voorcontrole draait een deel van I-134 terug: een al bestaand log neemt nu wel kort een schrijfslot. Dat is de kleinste veilige stap uit de opdracht; de garantie zat altijd al in de readwrite-transactie.
- "Opslaan blijft uit na loopt nog" las ik als de stand na de grens (de zin "Opslaan duurt langer dan verwacht"): daar bleef de knop in Hoe ging het? zonder bovengrens uit. De stand `still` zelf ging al wel weer aan na `waitForEarlierSave`.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (alleen bestaande waarschuwingen).
- `npx vitest run`: groen, 834 bestanden, 12575 tests. Eén keer viel de tijdtest in `src/engine/leavePlanAround.test.ts` om terwijl kaart:vergelijk ernaast draaide; los en in de herhaling zonder die last groen.
- `npm run build`: groen.
- `npm run kaart:vergelijk`: Gelijk: 110 schermen, geen verschil, geen schendingen van invarianten.
- `npm run kennisindex:vergelijk`: Geen verschil met docs/kennisindex/.

## Niet gecontroleerd

- Geen echte tik in een browser (geen DOM in de tests): de knop na de grens in Hoe ging het? en Forge op een toestel, dat is voor Lookout.
- Twee tabbladen tegelijk alleen nagespeeld met twee gelijktijdige `add` in fake-indexeddb.
