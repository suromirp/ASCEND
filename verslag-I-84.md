# Verslag I-84: ochtend dubbel na een oude back-up

Sherpa Ochtend dubbel, 20 november 2026. Branch `claude/ochtend-dubbel`, niet naar main, geen PR.

## Gemeten bij het naspelen

Nagespeeld met een nagemaakte oude back-up (ochtenden zonder id en zonder bron), geen gegevens van de eigenaar.

- Het toestel had voor 10 november een opgehaalde ochtend: rusthartslag 50, HRV 60, slaap 440 minuten, score 82.
- Het bestand had voor die dag een ochtend zonder id: rusthartslag 58, slaap 300 minuten.
- Na de import stonden er twee rijen: `import:2026-11-10` en `intervals.icu:2026-11-10`.
- De app toonde geen van beide maar een mengsel: rusthartslag 58 en slaap 300 uit het bestand, HRV 60 en score 82 van het horloge.
- Oorzaak: de opslag geeft de rijen in volgorde van id, `import:` staat in het alfabet voor `intervals.icu:`, en `dayRecord` en `baselineValues` nemen per getal het eerste. Het oude getal won dus, ook in het gemiddelde van vier weken.
- Ontkoppelen met "Ochtendgetallen in back-up" uit haalde alleen `intervals.icu:` weg; de `import:` rij bleef.

## Gebouwd

- De regel (`src/engine/morningDouble.ts`): een ochtend zonder bron (`import:<datum>`) gaat weg zodra een ochtend met een bron op dezelfde dag elk getal heeft dat hij heeft. Heeft hij een getal dat de andere mist, dan blijft hij als aanvulling.
- Lezen (`orderBySource`): de ochtend zonder bron komt als laatste. Het scherm toont per dag één ochtend met de getallen van de bron.
- Import (`morningsToImport` in `backupApply.ts`): een ochtend zonder bron die niets toevoegt wordt niet geschreven. De import haalt zelf niets weg; alles of niets en Ongedaan maken zijn onveranderd.
- Ophalen: na een geslaagde ronde bij intervals.icu of Health Connect ruimt `tidyDoubleMornings` op. Die leest alleen de opslag.
- Bestaande opslag: een nieuwe opstartstap `tidyDoubleMornings` (herstelstap, grens in tijd), één keer per versie en opnieuw na een teruggezette back-up.
- Ontkoppelen (`clearWellness`): een ochtend zonder bron hoort bij de koppeling (`belongsToLink`). Met "Ochtendgetallen in back-up" aan blijft hij tenzij gedekt, met de instelling uit gaat hij weg. `manual:` en `health-connect:` blijven staan. Dezelfde regel geldt nu voor de grens van 400 dagen, het uitzetten van "Ochtendgetallen in back-up" en een uitgezette soort.
- Geen migratiestap: er verandert geen opgeslagen vorm; een oud bestand importeert zoals voorheen (getest).

## Tests per eis

- Naspelen en per dag één ochtend na import: `ochtendDubbel.test.ts`, eerste blok.
- Fout halverwege import: niets geschreven, de kopie voor Ongedaan maken staat er nog.
- Koppeling verlopen of kapot: 401, 500, geen netwerk en een antwoord dat geen lijst is; de opslag blijft gelijk. Ook een geslaagde ronde zonder ochtenden haalt niets weg.
- De dag zelf: de ochtend van vandaag uit het bestand wijkt voor die van het horloge; zonder slaap van het horloge vult het bestand aan tot het horloge het heeft.
- Een rij ochtenden in een vakantie: zeven dagen, het horloge gaf er vier; zeven ochtenden op zeven dagen.
- Dubbel in een bestaande opslag: de opstartstap ruimt op, een tweede start doet niets, een nieuwe versie kijkt opnieuw.
- Ontkoppelen: met de instelling aan en uit, en via `clearConnection`.
- De regel zelf: `src/engine/morningDouble.test.ts`.

## Bestanden

Nieuw: `src/engine/morningDouble.ts`, `src/engine/morningDouble.test.ts`, `src/storage/ochtendDubbel.test.ts`, `docs/beslissingen/2026-11-20-ochtend-dubbel.md`, `verslag-I-84.md`.

Gewijzigd: `src/engine/sourcePrecedence.ts`, `src/engine/morningBackup.ts`, `src/engine/bootWatch.ts`, `src/storage/wellness.ts`, `src/storage/backupApply.ts`, `src/storage/healthConnect.ts`, `src/storage/bootMigrations.ts`, `src/storage/bootMigrations.test.ts` (de lijst stappen kreeg er een bij), `docs/architectuur/historie-en-logs.md`, `docs/werkbriefjes/koppelingen-en-data.md`, `docs/kennisindex/` (bronnen.json en de gemaakte bestanden).

## Controles

- `npx tsc -p tsconfig.app.json --noEmit`: groen.
- `npm run lint`: groen (één bestaande waarschuwing in `LegFatigueCard.tsx`, niet van deze wijziging).
- `npx vitest run`: groen, 776 bestanden, 11701 tests. Eerst vier rood, alle verklaard: de lijst opstartstappen in `bootMigrations.test.ts` kreeg een stap erbij (drie tests) en het werkbriefje had een regel te veel (grens 45).
- `npm run build`: groen.
- `npm run kennisindex:vergelijk`: "Geen verschil met docs/kennisindex/."
- `npm run kaart:vergelijk`: 107 schermen gelijk, invarianten zonder schendingen, één verschil, verklaard en niet van deze wijziging. Op `instellingen-blad-bundel-invullen` ontbreekt de rij IJkset (vier regels). Commit `9c9e2dc` op main ("IJkset op de Forge-pagina") haalde die rij uit dit blad en werkte dit kaartbestand niet bij; mijn wijziging raakt geen instellingen of componenten. Ik heb de kaart niet bijgewerkt, dat hoort bij dat werk: een punt voor de coördinator.
- Proef op de tests: met de leesvolgorde teruggezet vallen er vier, met een opruimstap die alles zonder bron weghaalt vallen er zes.

## Eigen keuzes

- De betere regel in plaats van "de opgehaalde wint altijd": alleen weg wat gedekt is, zodat er nooit een getal verdwijnt. Het horloge geeft niet elke nacht HRV, en daarvoor zitten de ochtenden juist in de back-up.
- Een ochtend zonder bron telt als "van de koppeling". Reden: ASCEND heeft geen scherm om een ochtend in te vullen, dus hij kwam ooit van een koppeling.
- Geen uitzondering op logs nooit herschrijven: een ochtend is geen `SessionLog` of `MilestoneProgress` en wordt bij elke ronde al door de bron overschreven. Dus niets in CLAUDE.md, één verduidelijkende zin in de architectuurtekst.
- Geen instelling, geen melding en geen Ongedaan maken voor het opruimen: het is een herstel van de opslag, en wat weggaat staat getal voor getal op de rij die blijft.
- De regel is breder toegepast dan de opdracht vroeg (400 dagen, archief uitzetten, soort uitzetten), via één functie, zodat er niet weer een plek is die `import:` vergeet.
- Geen invariant in de tekstkaart: een dubbele ochtend is in geen van de standen te zien. De invariant staat in de tests.

## Niet gecontroleerd, en wat ik zag

- Geen doorloop in Chromium door Lookout en geen review door Warden: dat is aan de coördinator. Er verandert geen scherm of tekst.
- Niet nagespeeld met de back-up van de eigenaar (die heb ik niet). Of zijn opslag `import:` rijen heeft, weet ik dus niet.
- Niet opgelost, hoort bij I-78: in zijn back-up zou elke ochtend twee keer staan met hetzelfde id, één zonder HRV. Dat is een ander geval (zelfde id); `migrateMornings` houdt dan de laatste. Als de rij zonder HRV als laatste staat, verliest de import de HRV.
- Een ochtend zonder bron gaat bij het ontkoppelen van intervals.icu ook weg als Health Connect nog aan staat (met de instelling uit). Health Connect haalt vier weken opnieuw op, wat ouder is niet.
