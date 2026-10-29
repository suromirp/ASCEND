---
name: onderhoud
description: Wekelijkse goedkope controle van de code van ASCEND op onderhoud (ongebruikte code, dubbele hulpfuncties, oude namen, te grote bestanden, oude notities, overbodige pakketten, groei van CLAUDE.md). Gebruik bij de wekelijkse onderhoudsronde of als de eigenaar vraagt hoe de code ervoor staat.
---

# Onderhoud: de wekelijkse ronde

Doel: de code netjes en goedkoop om aan te werken houden, met zo weinig mogelijk kosten. Deze ronde verandert
zelf alleen wat veilig en klein is; al het andere wordt een voorstel.

## Stappen

1. Werk op een branch `claude/onderhoud-<datum>` vanaf main. Nooit rechtstreeks op main.
2. Laat de inventaris doen door een helper van het type `Explore` met model `haiku` (goedkoopst), alleen lezen:
   ongebruikte exports en bestanden (zonder tests), dubbele hulpfuncties, oude kleurnamen (`--color-gold`,
   `--color-bronze`, `--color-bronze-dark`, `--color-on-gold`, `--color-alpine`, `--color-stone`, `--color-sky`,
   `--color-snow`) buiten `src/index.css`, notities met TODO/FIXME/legacy/tijdelijk, pakketten in `package.json`
   die niet geïmporteerd worden, de 10 grootste bronbestanden, en de grootte van CLAUDE.md in bytes.
3. Vergelijk met het vorige rapport in `docs/onderhoud/` en noteer wat beter of slechter werd.
4. Veilig zelf doen (hoogstens een klein uur werk, één helper `ontwikkelaar` op `sonnet`):
   - een export of bestand weghalen dat aantoonbaar nergens gebruikt wordt (ook niet in tests, niet dynamisch);
   - een oude kleurnaam vervangen door zijn nieuwe naam (zie de tabel in CLAUDE.md);
   - een overbodig pakket verwijderen.
   Niets aan wat de gebruiker ziet of hoe de app rekent. Daarna `npx tsc -p tsconfig.app.json --noEmit`,
   `npm run lint`, `npx vitest run` en `npm run build`; `planGolden.test.ts` mag niet veranderen. Is er iets rood,
   draai dan alles terug en zet het alleen in het rapport.
5. Groter werk (een bestand opsplitsen, dubbele code samenvoegen, CLAUDE.md boven 25 KB) wordt nooit zelf gedaan:
   zet het als voorstel in het rapport, met een schatting in rondes.
6. Schrijf het rapport naar `docs/onderhoud/JJJJ-MM-DD.md`: kort, in het Nederlands, zonder tabellen en zonder
   gedachtestreepjes: wat er gevonden is, wat er veilig is opgeruimd (met commit), wat er voorgesteld wordt.
7. Commit (de hook draait de controles) en push de branch. Breng het naar main alleen als alle controles groen
   zijn en er alleen veilige opruiming in zit, met een squash-commit zoals de werkafspraken zeggen. Anders blijft
   het op de branch en staat in het rapport waarom.
8. Schrijf een regel in `.claude/kosten/logboek.md` met de tokens van de helpers.

Geen persoonsgegevens, nooit een back-up van de eigenaar lezen, nooit `.claude/settings.json` wijzigen.
