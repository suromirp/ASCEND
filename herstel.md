# Warden, herkeuring Zonder sportschool (I-64)

Uitslag: AKKOORD

Gekeurd: feb20786 op origin/claude/zonder-sportschool-verplaatst, kop 88297581 (de merge met de oude kop heeft dezelfde boom als feb20786). Maandag 16 november.

## De drie moet-punten

- Moet 1, goed. `src/engine/leaveProposal.ts#putBack` zet een rij van jou die met Akkoord verviel terug als je de periode weghaalt of korter maakt, met jouw slot en "verplaatst van". Alleen als `mark.from` gelijk is aan de dag waar hij staat; een rij die je daarna zelf verplaatste verliest alleen het merk ("removing a period leaves what you moved yourself since alone" is groen). Blijft de dag in de nieuwe periode, dan blijft hij vervallen met het merk van de nieuwe periode. Het terugkomen loopt via het voorstel van de periode, niet stil.
- Moet 2, goed. `nogym` staat in `keptDayReason` na rust, doeldag en ziek (`src/engine/moveSuggestions.ts`). Ziek en doeldag blijven dicht bij slepen en ruilen; op de rustdag in de periode vragen `weekDrag.ts` en `weekSwap.ts` beide.
- Moet 3, goed. `planNoGymFix` telt alleen `tpl_bodyweight` als erbij gekomen (`src/engine/noGymGuard.ts`), dus `weekFixProposal.ts:330` zegt "wordt eigen gewicht" alleen dan; de heuvelloop zit niet meer in dit voorstel.

## Bevindingen

- Klein, `src/engine/proposalEngine.ts` (het terughalen van een overgeslagen rij): elke rij met `lock.by === 'user'` houdt nu slot en `movedFromDate`, ook als een andere aanroeper (`horizonChange.ts`, `restDayProposal.ts`, `weekReplan.ts`) hem op een andere dag terugzet. Vandaag bereikt geen van die wegen zo'n rij, en het gaat altijd via Akkoord, dus niet blokkerend. Voorstel: houd het slot alleen als `draft.scheduledDate === s.scheduledDate`, met een toets. Voorgestelde regel voor het werkbriefje planning: "Het terughalen van een overgeslagen rij houdt jouw slot alleen op de dag waar jij hem zette; komt hij op een andere dag terug, dan zonder slot."
- Klein, geen toets voor weghalen van de periode als de rij op de vervallen dag inmiddels voorbij is of gelogd; de bestaande wachter in `putBack` dekt het, een toets ontbreekt.

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npx vitest run`: 754 bestanden, 11256 tests groen (ook leave, zonderSportschool, week, moveSuggestions en golden; A en C bewegen niet).
- `npm run lint`: geen fouten, één bestaande waarschuwing in `src/components/LegFatigueCard.tsx`.
- `npm run build`: groen. `npm run kennisindex:vergelijk`: geen verschil.
- Geen gedachtestreepjes, geen losse hexkleuren, geen persoonsgegevens in de wijziging. Geen gewijzigde opslagvorm. Besluit aangevuld in `docs/beslissingen/2026-11-15-zonder-sportschool-verplaatst.md`; werkbriefje planning 44 regels met twee valkuilen.
- Niet gedraaid: `npm run kaart:vergelijk` en de doorloop in de browser (Lookout).

Akkoord voor main.
