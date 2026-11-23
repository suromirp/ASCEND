# Eén plan, stap 5: het dagbeeld (23 november 2026)

Backlogpunt I-14, stap 5 van `docs/visie/Ontwerp Eén plan.md` (symptoom B, invariant 3 en 6). Tak `claude/een-plan-dagbeeld`, vanaf main d346aa47. Sherpa.

## Wat er veranderde

- Nieuw `src/engine/dayPlan.ts` (puur). `weekPlan({ weekStart, sessions, logs, templateById, today, illness })` geeft per dag van de week: `sessions` (de rijen van Week op hun geplande dag, in de volgorde van `dayOrder`, anders `order`), `order` (het advies van `dayOrder`), `primary` (de missie: de eerste open training die mag, met de ziekteregel uit `dayRules`, stap doen), `rest` (de rustdag als er geen training open is), `strip` (wat de weekbalk toont, op de dag van uitvoeren via `countDayOf`) en `stripRest`. `hiddenFromDay` is nu het enige filter voor wat geen rij is (een overgeslagen rustdag, wat een periode liet vallen); het stond gekopieerd in Today, Week en de weekbalk.
- Vandaag (`src/pages/Today.tsx`) leest `plan.day(today)`: rijen, volgorde, missie en rustdag. De eigen filters, `dayOrder`, `orderDay` en `dayRules` zijn uit de pagina.
- Week (`src/pages/Week.tsx`, `src/components/WeekPlanner.tsx`) leest de rijen en het advies per dag uit hetzelfde dagbeeld. De lijst `sessions` voor de tellingen gebruikt `hiddenFromDay`.
- De weekbalk (`src/components/vandaag/WeekStrip.tsx`) krijgt het dagbeeld (`plan`) in plaats van sessies, logs, sjablonen en programma. Twee trainingen op een dag staan in de volgorde van Vandaag, niet meer de langste bovenaan. Een gedane training van een andere dag zegt in zijn label de geplande dag: "Tempoloop van do 19, gedaan" (`src/engine/weekRow.ts#plannedOnOtherDay`, dezelfde vorm als `doneOnOtherDay`, verder dan zes dagen met de maand). Week zegt op de rij van donderdag "gedaan wo 18". Zo staat het verschil in beide met een woord.
- De weekterugblik (`src/components/WeekReview.tsx`) geeft de balk ook het dagbeeld. Het Logboek (`src/pages/History.tsx`) noemt voor "vandaag nog gepland" de missie van het dagbeeld, zodat het dezelfde training noemt als Vandaag.

Geen nieuwe schrijver, geen opgeslagen vorm, geen migratie, geen voorstel. Alleen afleiding en een aria-label. Historie wordt niet geraakt.

## Keuzes die het ontwerp niet besliste

- Welk woord de balk gebruikt. Het ontwerp zegt "met een woord" en geeft als voorbeeld "gedaan di 27" voor Week. Gekozen: de balk noemt de geplande dag na de naam, "van do 19", en de geplande dag zelf blijft "vrij" (de balk tekent daar ook niets). Zo past het label bij wat je ziet en zegt het waar de training vandaan kwam.
- De test van het naspelen die het oude label vastlegde (`Woensdag (vandaag): Tempoloop, gedaan`) sprak de `it.fails` ernaast tegen; die verwacht nu het label met "van do 19". Donderdag blijft "Donderdag: vrij".
- De dag na zondag. Week keek voor de regel "morgen hard" van `dayOrder` alleen binnen de week, Vandaag in het hele plan. Het dagbeeld kijkt in het hele plan. Op een zondag met twee trainingen kan Week daardoor een andere volgordetip tonen dan voorheen, nu gelijk aan Vandaag.
- Vandaag sorteerde de rijen van de dag niet op `order` voor `orderDay`, Week wel. Het dagbeeld doet het voor beide.
- Het Logboek telt nu de ziekteregel mee: met koorts noemt de zin geen training, zoals Vandaag.
- `dayRulesScan`: `activeIllness` staat nu in `engine/dayPlan.ts` (de missie volgt een lopende melding, zoals eerst op Vandaag). Vandaag houdt zijn ene aanroep voor de kaart Ziek; de reden in de toelating is bijgewerkt.
- `stripSessionsByDay` (`src/engine/weekLogs.ts`) wordt in de app niet meer gebruikt; een test van de Warden leest hem nog. Laten staan.

## Tests

- `src/components/vandaag/eenPlanDag.test.ts`: de twee `it.fails` van symptoom B zijn `it` en slagen.
- `src/engine/dayPlan.test.ts`: volgorde van twee trainingen in rijen, balk en missie; gedaan op een andere dag (Week houdt hem, de balk verplaatst hem met `plannedOn`); het verborgen filter; ziek; rustdag. Invariant 3 over zestig nagemaakte standen (ziek, twee op een dag, gedaan op een andere dag, overgeslagen): de missie is een open rij van Week, Week volgt `dayOrder`, de balk toont dezelfde trainingen in dezelfde volgorde behalve wat de dag van uitvoeren verplaatst, en dat verschil heeft in beide een woord. Een toets dat de standen elk geval raken.
- `src/components/dagbeeld.scan.test.ts`: invariant 6. Geen bestand in `src/pages/`, `src/components/vandaag/` of `WeekPlanner.tsx` filtert zelf op `scheduledDate === today` of `=== date`, en geen kopie van het filter op `leave.role === 'dropped'`.
- Golden A en C (`src/storage/planGolden.test.ts`) bewegen niet; groen in de volledige run.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: 0 fouten (de bestaande waarschuwingen).
- `npx vitest run`: alles groen.
- `npm run build`: groen.
- `npm run kaart:vergelijk`: niet gedraaid, dat doet de coördinator. Verwacht verschil: de volgorde van de pictogrammen in de weekbalk op een dag met twee trainingen, het label met "van" bij een training die op een andere dag gedaan is, en mogelijk de volgordetip op een zondag in Week.

## Niet nagegaan

- Geen screenshot en geen Lookout; de balk is visueel gelijk behalve de volgorde van twee pictogrammen op een dag.
- Geen echte back-up nagespeeld.
