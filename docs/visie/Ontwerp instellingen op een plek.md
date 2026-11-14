# Ontwerp instellingen op één plek

Technisch ontwerp van Cartographer Instellingen, 14 november 2026. Geen code veranderd. Aanleiding: het Bouwrij-punt "Instellingen op één plek" in `docs/backlog.md` (eigenaar 14 november: "Allebei"). Elke instelling staat nu op meerdere plekken, en juist die bestanden geven de meeste conflicten bij het samenvoegen.

Gelezen: `CLAUDE.md`, `docs/beslissingen/2026-10-22-alles-instelbaar.md`, `docs/beslissingen/2026-10-22-instellingen-in-groepen.md`, het backlogpunt, en de code: `src/data/settingsIndex.ts`, `settingsLayout.ts`, `settingsHelp.ts`, `settingsChoices.ts`, `src/engine/settingsSummary.ts`, `settingsDiff.ts`, `settingsAvailability.ts`, de tests `settingsLayout.test.ts` en `settingsHelp.test.ts`, `src/components/settings/groups/ForgeGroup.tsx`, `SummaryRow.tsx`, `BundleSheet.tsx`, `ChoiceFromDef.tsx`, `rowShown.ts`, en `scripts/app-kaart/kaart.mjs` en `teksten-plat.mjs`.

Hoe geteld: met een tijdelijke test die de exports zelf inlaadt (meteen weer weggehaald) en een scan van de groepspagina's met een reguliere expressie. Die scan ziet alleen een `<SummaryRow id="...">` met een letterlijke id; een rij met een id als expressie kan ontbreken. De andere zeven groepspagina's heb ik alleen gescand, niet gelezen. Geen scherm bekeken, geen tekstkaart gedraaid, geen back-up gebruikt.

## 0. De kern

- Eén verklaring per instelling, maar niet in één bestand. Acht bestanden, één per groep: `src/engine/settingsDefs/<groep>.ts`. Eén bestand met 282 instellingen wordt zelf het nieuwe conflictbestand; dan verhuist het probleem in plaats van dat het verdwijnt.
- Alles wat nu in index, layout, samenvatting, uitleg, advies en keuzes staat wordt uit die verklaringen afgeleid. De oude exports (`SETTINGS_INDEX`, `PAGE_ROWS`, `placementOf`, `SHOW_WHEN`, `SETTINGS_HELP`, `CHOICES`, `ADVICE_SPECS`, `rowSummary`) blijven bestaan met dezelfde naam en vorm. Geen aanroeper hoeft in de eerste stappen te veranderen.
- Het bewijs is een foto van alle uitvoer van die exports, gemaakt vóór de eerste stap, die na elke stap byte voor byte gelijk blijft. Daarnaast een tekstdoorloop van alle acht groepspagina's en hun bladen in Chromium.

## 1. Wat er nu is

Het zijn niet vijf of zes plekken maar zeven. Een instelling staat in:

1. de index (`settingsIndex.ts`): id, titel, uitleg in één zin, groep, trefwoorden, soms een route;
2. de layout (`settingsLayout.ts`): de rij in `PAGE_ROWS`, of een plek in een blad in `MOVED`, of een verwijzing in `LINKS`, en de voorwaarden in `SHOW_WHEN`;
3. de samenvatting (`settingsSummary.ts`): een `case` in `baseSummary`;
4. de uitleg (`settingsHelp.ts`), onder een eigen sleutel;
5. het advies (`settingsDiff.ts`): een regel in `ADVICE_SPECS`, met een eigen titel;
6. de keuze (`settingsChoices.ts`), onder weer een eigen sleutel;
7. de groepspagina: de titel van de rij, de sleutel van de uitleg (`info=`), de sectie, welk blad er opent, en hoe de waarde gelezen en geschreven wordt.

De telling op `origin/claude/nacht` (ae92f3c):

- 282 instellingen in de index. Per groep: Planning 34, Doel en tochten 26, Forge 69, Lichaam 31, Vandaag en meldingen 69, Koppelingen 28, Gegevens en back-up 20, Gidsen en kennis 5. Geen dubbele id.
- 113 rijen op de pagina's, waarvan 24 bundelrijen (`bundel-...`). 23 bundelrijen staan niet in de index; alleen `bundel-sporten-tellen` wel. 187 instellingen zitten in het blad van een rij, 2 zijn een verwijzing (`reisplanner`, `paklijst`), 3 hangen aan een andere rij zonder blad (`sport-per-week`, `garmin-gids`, `rugzak`).
- 138 rijen met een voorwaarde in `SHOW_WHEN`.
- 302 takken `case` in `settingsSummary.ts`, waarvan één id twee keer (`forge`, zie randgevallen). 12 instellingen uit de index hebben geen eigen tak.
- 202 instellingen met een advies in `ADVICE_SPECS`; elke id staat in de index.
- 209 uitlegteksten. 132 sleutels zijn in camelCase (`forgeBijsturen`), maar 69 zijn gelijk aan een id.
- 85 keuzes, waarvan 17 met een sleutel gelijk aan een id; 62 keuzes wijzen naar een uitleg.
- 36 instellingen met een eigen route.
- In de groepspagina's: 285 keer `<SummaryRow>` (283 verschillende id's), 216 met `info=`, waarvan 68 gelijk aan de id; 134 schakelaars, 66 keuzebladen via `ChoiceFromDef`, 49 verschillende eigen bladen.

De titel staat op tot vijf plekken, en ze zijn niet gelijk: 33 rijen heten op de pagina anders dan in de index (`kracht`: "Sets en gewichten" tegenover "Krachttraining bijhouden"), 23 adviesregels hebben een kortere titel ("Eerst ophogen" tegenover "Eerst gewicht of herhalingen"), 6 uitlegteksten en 1 keuze ook. Omdat er geen tekst mag veranderen, krijgt de verklaring een veld per variant dat afwijkt. Gelijktrekken is een apart besluit, later, met Pathfinder.

## 2. De vorm van één verklaring

```ts
// src/engine/settingsDefs/types.ts
export interface SettingDef {
  id: string;                     // ook het anker instelling-<id>; verandert nooit
  page: SettingsPageId;           // de groep: was index.group, pageOfRow en AdviceSpec.page
  place: Place;                   // waar hij staat
  title: string;                  // de titel in de index en het zoekveld
  rowTitle?: string;              // alleen als de rij op de pagina anders heet (33 keer)
  adviceTitle?: string;           // alleen als Aangepaste instellingen hem anders noemt (23 keer)
  note: string;                   // de ene zin uit de index
  keywords: string[];
  route?: string;
  search?: false;                 // een bundelrij die nu niet in de index staat
  sheet?: { eyebrow: string; title: string; line?: string }; // de kop van het blad van een bundelrij
  help?: SettingsHelp | { from: string }; // de uitleg, of: dezelfde als bij die andere id
  helpKey?: string;               // de oude sleutel (camelCase) zolang code die nog gebruikt
  neutralHelp?: SettingsHelp;     // de variant zonder namen (NEUTRAL_HELP)
  choice?: { key: string; def: ChoiceDef<string | number> }; // key: de oude sleutel in CHOICES
  showWhen?: Blocker[];           // de voorwaarden, in deze volgorde
  summary?: (f: SettingsFacts, c: SummaryContext) => RowSummary;
  advice?: AdviceRule;            // AdviceSpec zonder id, titel en pagina
  edit?: Edit;                    // pas vanaf stap 5, zie hoofdstuk 5
}

export type Place =
  | { row: true; advanced?: true; footer?: true } // een eigen rij; de volgorde is die in het bestand
  | { in: string }                                // in het blad van die rij (MOVED met sheet: true)
  | { on: string }                                // hangt aan die rij, zonder blad (MOVED zonder sheet)
  | { link: true };                               // verwijzing naar een andere pagina (LINKS)
```

`SummaryContext` is wat nu bovenaan `baseSummary` staat (`o`, `forge`, `place`, `follows`, `age`, `watchOn`), één keer per aanroep uitgerekend, plus `countDifferences` als functie. Die laatste komt via de context binnen en niet via een import, anders importeert een verklaring `settingsDiff.ts` en dat importeert de verklaringen weer.

Een voorbeeld, een schakelaar in een blad:

```ts
{
  id: 'forge-vooraf',
  page: 'forge',
  place: { in: 'bundel-rusttimer' },
  title: 'Vooraankondiging',
  note: 'Een zachte tik 10 seconden voor het einde van de rust.',
  keywords: ['forge', 'rust', 'tik', 'vooraf', 'aftellen', 'waarschuwing', '10 seconden', 'rusttimer'],
  showWhen: [B.inApp, B.restAuto, B.restAlert],
  summary: (_f, c) => ({ checked: c.forge.restPreTick, sub: c.forge.restAlert === 'vibrate' ? 'Een korte stoot, 10 seconden vooraf' : 'Een tik, 10 seconden vooraf' }), // de tak van nu, settingsSummary.ts:621
  advice: strengthFlag('restPreTick'),
}
```

### Hoe de oude vormen eruit volgen

- `SETTINGS_INDEX`: elke verklaring zonder `search: false`, met `group = page`. De volgorde: zie hieronder.
- `PAGE_ROWS[page]`: de verklaringen van die groep met `place.row`, in de volgorde van het bestand, gesplitst in `rows`, `advanced` en `footer`. `MOVED` uit `in` en `on`, `LINKS` uit `link`. `placementOf`, `pageOfRow` en `isAdvancedRow` blijven ongewijzigd en lezen de afgeleide lijsten.
- `SHOW_WHEN`: uit `showWhen`. De gedeelde voorwaarden `B` verhuizen naar `settingsDefs/parts.ts`, met dezelfde teksten.
- `baseSummary(rowId, f)`: `DEFS[rowId]?.summary?.(f, context(f)) ?? {}`. De takken verhuizen letterlijk; gedeelde hulpjes (`plural`, `lower`, `WEEKDAYS`, `listNL`, `durationsValue` en de rest) naar `settingsDefs/summaryParts.ts`. `rowSummary`, `groupSummary` en `searchValue` blijven waar ze zijn; `groupSummary` hoort bij een pagina, niet bij een instelling.
- `SETTINGS_HELP`: per verklaring met `help`, onder `helpKey ?? id`. Bij `{ from }` dezelfde tekst onder de eigen sleutel. Een test eist dat geen twee verklaringen dezelfde sleutel maken. `NEUTRAL_HELP` uit `neutralHelp`.
- `CHOICES`: per verklaring met `choice`, onder `choice.key`. Een keuze die bij geen enkele instelling hoort blijft voorlopig in `settingsChoices.ts`; een test noemt ze.
- `ADVICE_SPECS`: per verklaring met `advice`: `{ id, title: adviceTitle ?? title, page, ...advice }`. De hulpjes (`plain`, `flag`, `choice`, `strengthFlag`, `overviewFlag` en de rest) krijgen geen id, titel en pagina meer mee; die komen uit de verklaring.

### Volgorde

Drie volgordes zijn zichtbaar en moeten blijven: de rijen op een pagina, de lijst in Aangepaste instellingen (de volgorde van `ADVICE_SPECS`), en bij gelijke score in het zoekveld de volgorde van de index (test "zet gelijke scores in de volgorde van de index", `settingsSearch.test.ts:82`). De rijen volgen het bestand. De index en het advies lopen nu door elkaar over de groepen heen (`vroeg-ziek` van Lichaam staat tussen Gegevens; `vakantie-opzij` van Planning tussen Doel).

Stap 1 meet of dat uitmaakt: zoek met elke titel, elk trefwoord en elk begin van drie letters, één keer met de index van nu en één keer op volgorde van groep en bestand. Is er geen enkel verschil, dan volgt de index de groepsvolgorde en is er geen lijst nodig. Anders komt er een gegenereerd bestand `settingsDefs/order.ts` met alleen id's voor de index en voor het advies; een nieuwe instelling die er niet in staat komt achteraan zijn groep. Dat bestand wordt nooit met de hand bewerkt en gaat weg in stap 6, als eigen kleine zichtbare wijziging met Pathfinder.

### Waar het staat en wat het mag importeren

- `src/engine/settingsDefs/types.ts`, `parts.ts` (voorwaarden en adviesbouwers), `summaryParts.ts`, acht groepsbestanden, en `index.ts` met `ALL_DEFS` en `DEFS` (op id).
- In `engine/` en niet in `data/`, omdat een verklaring functies heeft (samenvatting, advies, voorwaarden): dat is domeinlogica.
- Een groepsbestand importeert alleen bladmodules: resolve-functies, constanten, typen, `parts` en `summaryParts`. Nooit `settingsSummary.ts`, `settingsDiff.ts`, `settingsLayout.ts` of `settingsIndex.ts`. Een test zoekt die imports en faalt erop.
- `settingsAnchor` verhuist naar een eigen klein bestand, zodat `SettingsList.tsx` niet het hele register binnenhaalt voor één regel.

## 3. Stappenplan

Elke stap is een eigen branch `claude/instellingen-stap-<n>`, gaat na alle controles apart naar main, en loopt op een moment zonder andere bouwers aan instellingen. Wie tussendoor toch een instelling toevoegt, doet dat op de plek die op dat moment geldt; de pariteitstest vangt een vergeten plek.

Stap 0, de foto. Een test `src/engine/settingsFoto.test.ts` schrijft met `toMatchFileSnapshot` alle uitvoer naar `src/engine/__snapshots__/instellingen-foto.json` (inhoud in hoofdstuk 4). De tekstkaart krijgt de acht groepspagina's, de Geavanceerd-pagina's en elk bundelblad open (nu alleen `#/more` en `#/more/gegevens`, `scripts/app-kaart/kaart.mjs:141` en `:164`). Geen gedrag verandert. Klein.

Stap 1, het skelet en een afgeleide naast de oude. Typen, `parts`, `summaryParts` (de oude bestanden importeren hun hulpjes daar terug, zodat er niets verandert), en de acht groepsbestanden met alleen de tekstvelden: id, page, place, title, rowTitle, adviceTitle, note, keywords, route, search, sheet, help, helpKey, neutralHelp, choice. Die worden één keer gegenereerd uit de exports van nu, zodat elke tekst gelijk is doordat hij gekopieerd is en niet overgetypt. Het script gaat daarna weg. De vier teksten met een ingevoegde constante (1 in de index, 3 in de uitleg) en de keuze van het horlogemodel, waarvan de opties uit `WATCH_MODELS` komen (`settingsChoices.ts:886`), zet de bouwer met de hand terug op die constante. Een test `settingsDefs.parity.test.ts` vergelijkt de afgeleide index, layout, uitleg en keuzes met de oude, diep en voor elke id. In deze stap blijven de oude bestanden de bron. Hier valt ook de meting van de volgorde.

Stap 2, index en layout overschakelen. `SETTINGS_INDEX`, `PAGE_ROWS`, `MOVED`, `LINKS` en `SHOW_WHEN` worden afgeleid; de oude letterlijke lijsten gaan in dezelfde stap weg. De pariteitstest vergelijkt vanaf nu met de foto. Ook de dubbele lijst `ADVANCED` in `ForgeGroup.tsx:21` leest dan uit `PAGE_ROWS`.

Stap 3, uitleg en keuzes overschakelen. `SETTINGS_HELP`, `NEUTRAL_HELP` en `CHOICES` worden afgeleid. `helpKey` en `choice.key` blijven als alias, zodat elke `info="forgeBijsturen"` en elke `CHOICES.volgorde` blijft werken. `scripts/app-kaart/teksten-plat.mjs` leest nu de bron van `settingsHelp.ts` met regelnummers (`:80` tot `:91`); dat script gaat de groepsbestanden lezen, of de foto.

Stap 4, samenvatting en advies, per groep. Acht kleine stappen, de kleinste eerst: Gidsen, Gegevens, Koppelingen, Doel, Lichaam, Planning, Vandaag, Forge. Per groep verhuizen de takken `case` letterlijk naar `summary` en de adviesregels naar `advice`. `baseSummary` kijkt eerst in `DEFS` en valt terug op de `switch`; is een groep klaar, dan gaan zijn takken uit de `switch`. Warden bekijkt elke stap met `git diff --color-moved=zebra`, zodat een tak als verplaatst en niet als veranderd verschijnt.

Stap 5, de groepspagina's, per groep. De rijen, secties, titels, `info=` en het lezen en schrijven komen uit `edit` (hoofdstuk 5). Een gewone groepspagina wordt een paar regels: de secties en de verwijzing naar de eigen bladen. Een rij die niet in het patroon past houdt haar JSX en leest alleen haar titel en uitleg uit de verklaring. Ook hier de kleinste groep eerst, Vandaag en Forge laatst. Dit is de grootste stap en de enige met een kans op zichtbare verschillen; hij is ook de stap die de conflicten in de groepspagina's wegneemt. Mijn advies is hem te doen, maar pas te beslissen na stap 4, als blijkt hoeveel conflicten er dan nog over zijn.

Stap 6, opruimen. `info=` en de uitleg gaan op de id in plaats van de camelCase-sleutel; de aliassen gaan weg. Het bestand `order.ts` gaat weg als dat nog bestaat (zichtbaar: alleen de volgorde bij gelijke score in het zoekveld en in Aangepaste instellingen; eigen besluit, Pathfinder kijkt). Het werkbriefje en de regel in `CLAUDE.md` ("de instelling komt ook in settingsIndex, settingsLayout, settingsSummary en een groepspagina") worden één zin over de verklaring.

## 4. Het bewijs dat niets veranderde

De foto (stap 0) is één JSON-bestand met, voor elke instelling en elke rij:

- de index in volgorde, met alle velden;
- `placementOf` per id, `PAGE_ROWS`, `isAdvancedRow`;
- per id in `SHOW_WHEN` de reden en de ouder van elke voorwaarde, en `isRowShown` op elke testopstelling;
- `rowSummary` en `searchValue` voor elke rij-id en elke index-id, op elke testopstelling; `groupSummary` per pagina;
- `searchSettings` voor alle titels, alle trefwoorden en alle beginnen van drie letters, met de volgorde van de uitkomst;
- `SETTINGS_HELP` en `settingsHelp(sleutel, false)` voor elke sleutel; `CHOICES` helemaal, en `choiceShort` voor elke optie;
- per adviesregel id, titel, pagina en `plan`, en op elke opstelling `differs`, de waarde, de tekst van het advies en het terugzetstuk; `resetPatch` voor alle id's samen; `countDifferences` per bundel;
- `rowAvailability` en `adviceTarget` per id op elke opstelling.

De testopstellingen zijn nagemaakt, nooit de back-up van de eigenaar: een verse telefoon; alles gekoppeld (Garmin, Health Connect, een MacroFactor-export, een hoofddoel, een tocht, een programma, sets in ASCEND, de Android-app); zonder doel; met bronnen die nog laden; met onbekende bronnen; en "alles anders dan het advies" (die bestaat al in `settingsDiff.test.ts:201`). De hulpfunctie `facts()` uit `settingsSummary.test.ts:11` is het begin.

Een functie is niet te vergelijken, alleen haar uitkomst. De zwakke plek is een tak die geen enkele opstelling raakt. Er is geen pakket voor dekking geïnstalleerd (`@vitest/coverage-v8` ontbreekt) en er komt er geen bij. Daarom noemt de bouwer per groep in stap 4 elke tak met een voorwaarde (een `if` of `?`) en de opstelling die hem raakt; ontbreekt die, dan komt er een opstelling bij in de foto, in een aparte commit vóór de verhuizing.

Daarnaast, bij elke stap:

- `npm run kaart:vergelijk` zonder één verschil, met de uitgebreide kaart uit stap 0;
- de bestaande tests ongewijzigd groen (`settingsLayout.test.ts`, `settingsHelp.test.ts`, `settingsSearch.test.ts`, `settingsDiff.test.ts`, `settingsSummary.test.ts` met 131 gevallen, `settingsAvailability.test.ts`);
- `tsc`, lint, alle tests en de build; de grootte van de chunks voor en na stap 2 naast elkaar, omdat het register de resolve-functies meeneemt naar alles wat de index importeert;
- de foto ongewijzigd. Verandert hij toch, dan stopt de stap: of de verhuizing is fout, of het gedrag verandert, en dat hoort niet in dit werk.

## 5. Een eigen blad, een eigen waarde-functie, een eigen pagina

- Een eigen waarde-functie is precies de `summary` van de verklaring; hij verhuist letterlijk. Een samenvatting die de titel van de rij overschrijft mag dat blijven (`bundel-horloge-gebruik`, `settingsSummary.ts:492`; `macrofactor`, `:1101` en `:1102`), want `RowSummary.title` blijft bestaan. Een rij zonder waarde (Gidsen, `startniveau`, `herbouwen`, `wissen`) heeft geen `summary`; de afgeleide geeft dan `{}` zoals nu.
- Vanaf stap 5 zegt `edit` hoe de rij werkt:

```ts
export type Edit =
  | { kind: 'toggle'; read: (s: AppSettings) => boolean; write: (on: boolean, s: AppSettings) => Partial<AppSettings> }
  | { kind: 'choice'; read: (s: AppSettings) => string | number; write: (v: never, s: AppSettings) => Partial<AppSettings> }
  | { kind: 'sheet'; sheet: string }   // een eigen blad uit het register in components/settings
  | { kind: 'bundle' }                 // opent het blad met de verklaringen die place.in naar deze rij hebben
  | { kind: 'page'; route: string }    // een eigen pagina
  | { kind: 'custom' };                // de groepspagina tekent deze rij zelf
```

- `write` geeft een stuk `AppSettings` terug en is puur; een keuze die twee sleutels zet past daar gewoon in (`forge-rir-snel` zet `quickRirMode` en `quickRir`).
- De 49 eigen bladen (`DurationSheet`, `RestSoundSheet`, `WavesSheet` en de rest) blijven React-componenten in `components/settings/groups/`. Een klein register `SHEETS` in `components/settings/` koppelt de naam uit `edit.sheet` aan het component. Tot stap 5 opent de groepspagina ze zoals nu.
- Eigen pagina's (Sporten, Hoeveel per soort, Plekken, Garmin, MacroFactor, Doelen, Reis): `edit.kind = 'page'` met de route die nu al in de index staat (36 keer).
- Schrijven buiten `AppSettings` blijft `custom`: `kracht` gaat via `setStrengthExternal` (`ForgeGroup.tsx:183`), de schakelaars van het horloge staan in de opslag van de koppeling (`settingsDiff.ts:11` tot `:13`), `spotterrek` schrijft via `withProfile` (`ForgeGroup.tsx:169`). Ze krijgen wel hun titel en uitleg uit de verklaring.
- Een bundelrij is ook een verklaring: `search: false` (behalve `bundel-sporten-tellen`), `sheet` voor de kop van het blad, een `summary`, en `edit.kind = 'bundle'`. Wie erin staat volgt uit `place.in`; de lijsten `inSheet(...)` in `settingsLayout.ts` vervallen.
- Een rij die op twee plekken getekend wordt (`hoeveel-per-soort` en `bundel-sporten-tellen` op Planning én in `SportsPage.tsx:132` en `:133`) is één verklaring; beide plekken lezen hem.

## 6. Een nieuwe instelling straks

Na stap 6 voegt een nieuwe functie één object toe in `src/engine/settingsDefs/<groep>.ts`, op de plek van de rij of in het blad waar hij hoort:

```ts
{
  id: 'hoogtemeters-twijfel',
  page: 'planning',
  place: { row: true },
  title: 'Hoogtemeters bij twijfel',
  note: 'Kiest een lus met iets meer stijgen als de meting onzeker is.',
  keywords: ['hoogtemeters', 'stijgen', 'marge', 'route', 'lus'],
  help: { title: 'Hoogtemeters bij twijfel', lead: '...', points: [/* ... */] },
  choice: { key: 'hoogtemetersTwijfel', def: def({ /* opties, advies */ }) },
  summary: (f) => ({ value: choiceShort('hoogtemetersTwijfel', resolveAscentDoubt(f.settings)) }),
  advice: choice('ascentDoubt', 'meer', 'hoogtemetersTwijfel'),
  edit: { kind: 'choice', read: resolveAscentDoubt, write: (v) => ({ ascentDoubt: v }) },
}
```

(Een verzonnen voorbeeld; de tekst is niet goedgekeurd.) Wat buiten de verklaring blijft: het veld in `AppSettings` met zijn resolve-functie in `engine/`, een migratiestap als de opgeslagen vorm verandert, en het besluit in `docs/beslissingen/`. De tests vangen wat vergeten is: geen uitleg, geen zin in de index, een regel onder de rij langer dan 40 tekens, een advies dat nooit afwijkt, een voorwaarde met een ouder die niet bestaat, een id die al bestaat, een plek in een blad dat niet bestaat.

Tot stap 5 klaar is, komt er naast de verklaring nog één `<SummaryRow id="...">` in de groepspagina, zonder eigen titel of `info=`.

## 7. Randgevallen

- `forge` is zowel een instelling als een pagina. `settingsSummary.ts:585` (de rij) en `:1241` (de groep in `groupSummaryNow`), en `isRowPending(page, ...)` gebruikt id's van pagina's en rijen door elkaar. Bij afleiden: rijen en pagina's niet in één naamruimte stoppen.
- `case 'forge-open'` (`settingsSummary.ts:587`) hoort bij geen rij en geen instelling; nergens anders gebruikt. Dode code; weghalen in stap 4, niet eerder, zodat de foto in stap 0 hem nog meeneemt.
- Ankers die niet gelijk zijn aan de id in de index: `gewicht-herinnering` (`LichaamSheets.tsx:170`) tegenover `herinnering-gewicht` (`settingsIndex.ts:151`, `settingsLayout.ts:128`); `golven-terugblik` (`WavesSheet.tsx:36`) tegenover `golf-terugblik` (`settingsIndex.ts:109`). Ook `golven-licht`, `weekbudget-dubbel`, `gewicht-macrofactor` en `toestemming-laden` zijn rijen binnen een eigen blad zonder plek in de index. Zoeken springt naar het blad, niet naar de rij. Dit werk laat ze staan; gelijktrekken is een kleine aparte fix (een anker verandert, geen tekst).
- De lijst `ADVANCED` in `ForgeGroup.tsx:21` herhaalt `PAGE_ROWS.forge.advanced` (`settingsLayout.ts:73`), en de titels in `advancedTitles` daar herhalen de rijtitels. Na stap 2 en stap 5 afgeleid.
- Uitleg die door meer rijen gedeeld wordt: `forgeBergspieren` (rij `forge-bergspieren` en `forge-bergspieren-aan`, `ForgeGroup.tsx:84` en `:156`), `gymProfiel` (`bundel-sportschool` en `gym-profiel`, `ForgeGroup.tsx:73` en `:168`, en `ToestelSheets.tsx:193`), `forgeNaast` (`bundel-toets` en `forge-naast`, `ForgeGroup.tsx:83` en `:162`). Opgelost met `help: { from }`.
- Uitleg die buiten een rij geopend wordt: `gewicht` en `vetpercentage` (`LichaamSheets.tsx:237` en `:238`), `plaats` (`VandaagSheets.tsx:48`). Die hangen aan de verklaring van `lichaamsgewicht`, `vetpercentage` en `weerplaats` met `helpKey`.
- De uitleg zonder namen (`NEUTRAL_HELP`, `settingsHelp.ts:1853`) hangt af van de instelling "Voorbeelden bij naam noemen"; alleen `wat-oorzaak` en `wat-test`.
- `settingsHelp.test.ts:17` zoekt `info="..."` met een reguliere expressie in de bronbestanden, en `:23` eist vijf vaste sleutels in die bronnen. Na stap 5 staat `info` niet meer in JSX; die twee tests gaan dan over de verklaringen.
- `scripts/app-kaart/teksten-plat.mjs:80` tot `:91` leest `settingsHelp.ts` als tekst met regelnummers. Moet mee in stap 3.
- Teksten met een ingevoegde constante: de index (`route-voorstel`, `settingsIndex.ts:221`, met `PHOTO_SOURCES_LINE`) en de uitleg (`settingsHelp.ts:875`, `:883` en `:885`, met de constanten van luchtfoto en kaart). De opties van het horlogemodel worden gemaakt uit `WATCH_MODELS` (`settingsChoices.ts:886`). Een gegenereerd bestand zou de letterlijke tekst of de lijst van nu opschrijven en de band met de bron verliezen.
- `settingsLayout.ts` importeert al resolve-functies uit `engine/` (`:14` tot `:19`), en `settingsIndex.ts` importeert een type uit de layout. De richting data naar engine bestaat dus al; het register maakt die alleen expliciet.
- De tekstkaart dekt nu twee van de negen instellingenschermen (`kaart.mjs:141` en `:164`). "De tekstkaart blijft gelijk" bewijst vandaag dus weinig over instellingen; daarom stap 0.
- `bundel-sporten-tellen` is de enige bundelrij in de index (`settingsIndex.ts:123`).

## 8. Wat ik afraad

- Eén bestand voor alle instellingen. 282 verklaringen van ongeveer vijftien regels zijn vier- tot vijfduizend regels waar elke bouwer in zit. Acht bestanden per groep, met de volgorde van de pagina, geven een conflict alleen als twee bouwers in dezelfde groep op dezelfde plek werken.
- De titels gelijktrekken tijdens het verhuizen. Dat is een verandering van tekst en dus een ander werk; de foto maakt de 33, 23, 6 en 1 verschillen wel zichtbaar, zodat het later in één keer kan.
- De verklaringen overtypen in plaats van genereren. Bij 282 instellingen met trefwoorden en uitleg is een tikfout bijna zeker, en de pariteitstest vangt die pas achteraf.
- Stap 5 doen voordat stap 4 af is. Dan verhuizen titels en gedrag tegelijk en wijst een verschil in de foto niet meer één oorzaak aan.
