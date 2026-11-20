# Warden IJkset: herstel voor I-83 (claude/ijkset-plek, da7837bc)

Oordeel: akkoord na twee Moet-punten. De rij, de definitie, de samenvatting, de tekst en de tokens kloppen; de terugweg heeft een gat.

## Moet

1. De terugweg kan blijven hangen en later onverwacht een training openen.
   Plek: `src/utils/forgeSessionStore.ts` (rememberTrainingReturn, rond regel 362 tot 379), `src/components/forge/useForgeSession.ts` (useTrainingReturn, rond regel 117 tot 137), `src/components/forge/ForgeSessionHost.tsx` regel 12.
   Reden: `returnTo` wordt alleen gewist bij een PUSH weg van Instellingen of in `takeTrainingReturn`. Bereik je Instellingen niet (je navigeert binnen de 280 ms elders, de sprong mislukt) of wint `readSession()` in de Host van de terugweg, dan blijft hij staan. Het eerstvolgende bezoek aan de Forge-pagina (ook via zoeken) zet `seen`, en de terugknop daarna opent een training waar je niet om vroeg.
   Voorstel: bewaar met de terugweg een tijdstip en een geldigheid van 2 minuten, en laat `trainingReturn()` een verlopen waarde als leeg teruggeven. Wis hem ook in de Host als `readSession()` wint. Wis hem ook als de timer van 280 ms de sprong niet haalt (bijvoorbeeld als `window.location.hash` al niet meer de training is).

2. De beslislogica van de terugweg heeft geen test op gedrag.
   Plek: `src/components/forge/ijksetKaart.test.ts` regel 28 tot 39 (zoekt tekst in de bron) en `useTrainingReturn`.
   Reden: wat het werkbriefje de valkuil noemt (alleen POP, andere weg wist, niet bereikt laat met rust, één keer) staat nergens als test. De tests zouden slagen als de logica kapot is.
   Voorstel: haal de beslissing uit de hook naar een pure functie in `src/engine/` of `src/utils/` (`(pending, seen, pathname, type) => { seen, actie: 'openen' | 'wissen' | 'niets' }`) en test: POP na bezoek opent en wist; PUSH wist; zonder bezoek niets; tweede POP opent niet opnieuw; verlopen waarde opent niet.

## Mag

3. `ForgeWorkout.tsx` regel 713 tot 722: de `setTimeout` van 280 ms wordt niet opgeruimd. Dat is bewust (de component is dan weg en `navigate` blijft werken, zoals in `YourWeek.tsx` regel 124), maar leg het in de commentaarregel vast. Een tweede tik op de knop binnen die tijd kan niet: onClose haalt het scherm weg.

4. `ForgeSessionHost.tsx` regel 12: `takeTrainingReturn()` heeft een neveneffect in een `useState`-initialisator. In StrictMode (dev) wordt die twee keer aangeroepen; de eerste waarde wordt gebruikt, dus het werkt, maar zuiverder is lezen in de initialisator en wissen in een effect.

5. `CalibrationNotice.tsx` regel 19 tot 22: drie knoppen in één `flex` zonder `flex-wrap`. Op 360 px kan "IJkset aanpassen" buiten de kaart lopen. Voorstel: `flex-wrap` op de rij; Lookout bevestigt op 360 en 390 px.

6. Het plafond 13 in `settingsLayout.test.ts` (ROWS_FOR) is verantwoord en netjes vastgelegd in het besluit (alternatieven genoemd, terugdraaien beschreven). Voorstel alleen: zet in het besluit dat een veertiende rij in Forge wel naar een blad moet.

## Wat klopt

- Instelling `forge-ijkset` staat als rij in `settingsDefs/forge.ts` (`place: { row: true }`), in `ForgeGroup.tsx` (rij onder Voorstellen en het blad `forge-ijkset` als blad, niet meer als onderblad) en in `settingsSummary.ts` (uit BUNDLE_FILL, zodat "n aangepast" niet dubbel telt). De foto van de instellingen is bijgewerkt.
- "IJkset aanpassen" volgt "Weekbudget aanpassen" en "Gewicht aanpassen"; TextButton `dim`, zinsletters, 44 px via de primitive. Geen hexkleuren.
- Geen gedachtestreepjes (U+2013, U+2014) in de wijziging. Geen persoonsgegevens. Geen opslagvorm gewijzigd, dus geen migratie. HashRouter blijft. Geen planning verandert: de knop opent alleen de instelling.
- Besluit `2026-11-20-ijkset-op-de-pagina.md` bestaat, werkbriefje `forge.md` en kennisindex zijn bijgewerkt.
- De terugweg staat alleen in het geheugen: na herladen is hij weg en komt er geen pil, lege of dubbele training (de Host opent niets als de training niet bestaat en wist het verzoek).

## Controles op de proefmerge met origin/main

(Conflict alleen in `docs/kennisindex/README.md`, opgelost met `npm run kennisindex`.)
- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (1 bestaande waarschuwing in LegFatigueCard, niet van deze wijziging).
- `npx vitest run`: 11667 geslaagd.
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: "Geen verschil met docs/kennisindex/."
- Niet gedraaid: doorloop in Chromium (Lookout), echte terugknop op een toestel.
