# Werkwijze met Claude: Jarvis

Jarvis gaat over hoe jij met Claude bouwt: een hoofdsessie met specialisten, een geheugen, geplande taken, meldingen en presentaties. Het gaat niet over een AI in de app zelf. Dit rapport is opgesteld door de werkwijze-agent op basis van de documentatie van Claude Code (oktober 2026); de bestanden hieronder zijn voorstellen en worden pas na jouw keuze toegevoegd. Versienummers in de voorbeeldbestanden worden bij het bouwen gecontroleerd.

## 1. In het kort

- Jarvis is één hoofdsessie (orchestrator) op claude.ai/code die je vanaf je telefoon aanstuurt. Die sessie zet specialisten (subagents) aan het werk, maakt GitHub-issues en start per taak een eigen cloudsessie op een eigen branch. Cloudsessies draaien door als je telefoon uit staat.
- De repo is het geheugen. Cloudsessies beginnen steeds met een verse kopie van de code, dus alleen wat in de repo staat (CLAUDE.md, besluiten in docs/beslissingen, issues en PR's) blijft betrouwbaar bewaard.
- Het grootste knelpunt is de deploy: `.github/workflows/deploy.yml` zet elke push naar main direct live en draait daarbij alleen de build, zonder lint en tests. Dat dicht je eerst met een CI-poort en een bescherming op main.
- Een bouwcyclus met poorten (issue, onderzoek, plan, akkoord, branch, automatische controles, schermafdrukken, review, jouw goedkeuring) zorgt dat jij elke wijziging vanaf je telefoon goedkeurt voordat ze live gaat.
- Maximaal 20 subagents tegelijk per sessie (standaard instelling). In de praktijk bepalen je gebruikslimiet en kosten het tempo: begin met 3 tot 5 specialisten.

## 2. Wat er nu is en waar het knelt

- Deploy zonder poort. `deploy.yml` start bij elke push naar main en draait `npm ci` en `npm run build`. Lint en tests draaien niet in GitHub. Er is geen voorbeeldversie.
- Er is nog geen `.claude`-map: geen eigen agents, skills of hooks.
- CLAUDE.md is sterk op architectuur en ontwerp, maar bevat geen werkafspraken voor agents (branches, PR's, besluiten vastleggen, wat een agent mag wijzigen).
- Geen besluitenlogboek. `docs/onderzoek/` bevat veel onderzoek, maar er is geen plek waar besluiten staan met datum, reden en bron.
- Persoonlijke gezondheidsdata. Je back-up met gewicht, hartslag en trainingen hoort niet in de repo en niet in automatische tests; gebruik nagemaakte testdata.
- Eén lange sessie. De richtlijnen van Claude Code adviseren schone sessies per taak; lange gesprekken worden trager en minder scherp.

## 3. Jarvis: de opbouw

### 3.1 De bouwstenen

- Hoofdsessie (orchestrator). Een cloudsessie in de Claude-app of op claude.ai/code. Opus op hoge inspanning voor planning en besluiten.
- Specialisten. Subagents in `.claude/agents/`, elk met een eigen rol, model, inspanning en toegestaan gereedschap. De hoofdsessie krijgt alleen hun samenvatting terug, zodat haar geheugen schoon blijft.
- Parallel werk. Per taak een eigen cloudsessie op een eigen branch. Voor grote, losse wijzigingen kan `/batch` 5 tot 30 agents tegelijk elk een PR laten openen.
- Skills. Vaste werkinstructies in `.claude/skills/`, die ook in cloudsessies laden.
- Hooks. Vaste controles die altijd draaien, zoals lint en tests voor een commit.
- Geplande taken (routines). Cloudtaken met een schema of een GitHub-gebeurtenis, aan te maken op claude.ai/code/routines.
- Takenlijst. GitHub-issues met labels; elke fase van een idee is een label.

### 3.2 De bestanden die in de repo komen

A. Een korte sectie "Werkafspraken voor agents" in CLAUDE.md:
- Nooit direct op main; werk op een branch `claude/<onderwerp>` en open een PR.
- Voor elke commit zijn lint, tests en build groen.
- Besluiten gaan in `docs/beslissingen/`, één bestand per besluit (`JJJJ-MM-DD-onderwerp.md`), nooit herschreven.
- Wat je planning of een automatische actie verandert, gaat via een voorstel met het label `wacht-op-akkoord`.
- Gebruikersteksten in het Nederlands, zonder gedachtestreepjes; berichten aan jou menselijk, zonder tabellen.
- Eén issue, één branch, één PR. Geen wijzigingen in `src/` zonder issue.
- Persoonlijke gezondheidsdata nooit in de repo of in tests.
- Eerst `docs/onderzoek/` lezen voor nieuw onderzoek.
- Elke taak eindigt met de groene controles, de link naar de PR en wat niet gecontroleerd kon worden.

B. `docs/beslissingen/_sjabloon.md`: titel, datum, besluit, reden en alternatieven, bron, wat het vervangt, status. Eén bestand per besluit voorkomt dat twee PR's tegelijk in hetzelfde logboek schrijven.

C tot en met H. Specialisten in `.claude/agents/`:
- productmanager (Sonnet, gemiddeld): maakt van een idee een helder issue met doel, afbakening en controleerbare criteria, zoekt eerst naar bestaande issues, beslist niets.
- ontwerper (Sonnet, gemiddeld): voorstellen binnen de bestaande ontwerptaal en tokens, nooit nieuwe kleuren zonder akkoord.
- sportwetenschapper (Opus, hoog): onderzoek met primaire bronnen, scheidt feiten van aannames, legt elk getal uit, geen medisch advies, schrijft alleen in `docs/onderzoek/`.
- ontwikkelaar (Sonnet, hoog, eigen werkmap): bouwt precies één goedgekeurd issue, eerst de tests, migratiestap bij een gewijzigde opslagvorm, raakt niets buiten het issue.
- tester (Sonnet, gemiddeld, alleen lezen): lint, tests, build en schermafdrukken van Vandaag, Week en Je stand op telefoonformaat; meldt per stap groen of rood.
- reviewer (Opus, hoog, alleen lezen): controleert de engine-regels, ontwerptaal, de verboden uit CLAUDE.md, historie, migraties en de tekstregels; geeft per bevinding ernst en reden en eindigt met "akkoord voor merge" of niet.

I tot en met K. Skills:
- steward: overzicht van open PR's met de stand van de controles, reviewbevindingen en wat op jouw akkoord wacht, in vijf regels.
- weekbriefing: leest de besluiten van de laatste vier weken, de open issues en de nachtelijke testuitslag, en werkt elke maandag één presentatiepagina bij met drie punten.
- onderzoeksdigest: zoekt wekelijks nieuw onderzoek over bergtochten met rugzak, dalen, hardlopen tot 10 km en herstel, en zet het als PR klaar.

L en M. `.claude/settings.json` met toegestane basiscommando's, een verbod op direct pushen naar main, en een hook die een commit blokkeert als lint of tests falen.

N tot en met R. GitHub-workflows:
- `ci.yml`: lint, tests en build bij elke PR (de verplichte controle `check`).
- `deploy.yml`: lint en tests ook voor de build, als tweede poort.
- `claude.yml`: `@claude` in een issue of PR roept Claude aan.
- `claude-review.yml`: elke PR krijgt automatisch een review met opmerkingen per regel.
- `nachtelijk.yml`: elke nacht lint, tests en build op main; alleen bij rood laat Claude de oorzaak beschrijven, zonder iets te wijzigen.

S en T. Een issue-sjabloon "Idee" (doel, waarom het de missie dient, afbakening, criteria, geraakte bestanden, raakt het de planning) en een PR-sjabloon met een afvinklijst (controles groen, schermafdrukken, geen losse kleuren, migratie, geen gedachtestreepjes, besluit vastgelegd, hoe terugdraaien).

U en V. Labels (idee, onderzoek, plan, bouw, review, wacht-op-akkoord, geblokkeerd, bug, nachtelijk, afhankelijkheden) en een bescherming op main: PR verplicht, controle `check` verplicht, geen force push. Alleen jij kunt er in noodgevallen omheen.

### 3.3 Een volledige cyclus

1. Idee. Je typt op je telefoon een idee. De productmanager maakt er een issue van.
2. Onderzoek, als dat nodig is. De sportwetenschapper schrijft een rapport op een branch met een PR.
3. Plan. Het plan komt als reactie in het issue. Raakt het je planning, dan krijgt het `wacht-op-akkoord`.
4. Akkoord. Jij reageert met "akkoord bouwen".
5. Bouw. De ontwikkelaar bouwt in een eigen sessie op een eigen branch, met tests, en opent een PR.
6. Controles. GitHub draait lint, tests en build; de tester zet schermafdrukken bij de PR.
7. Review. De reviewer plaatst bevindingen; blokkerende punten worden eerst opgelost.
8. Voorbeeld. Jij bekijkt de schermafdrukken op je telefoon. Een echte voorbeeldversie per PR is een latere stap.
9. Merge. Jij keurt goed in de GitHub-app: het enige moment dat iets live gaat.
10. Live en vastgelegd. De deploy draait na de merge; het besluit komt mee in dezelfde PR.

Per wijziging kost jou dat een paar minuten op je telefoon.

### 3.4 Geheugen

- Betrouwbaar: CLAUDE.md, `docs/beslissingen/`, GitHub-issues en PR's.
- Nog te testen in cloudsessies: het eigen geheugen van subagents, automatische notities en je accountgeheugen op claude.ai.
- Niet betrouwbaar als geheugen: de chatgeschiedenis van een sessie.

Vuistregel: wat moet blijven, staat in een bestand in de repo of in een issue.

### 3.5 Meldingen en presentaties

- De GitHub-app op je telefoon: meldingen bij PR's, reviews en mislukte controles. De betrouwbaarste route.
- Resultaten van geplande taken staan op claude.ai/code/routines.
- Meldingen via ntfy of een Telegram-kanaal zijn mogelijk, maar vragen extra instellingen of een computer die altijd aan staat.
- Presentaties worden pagina's (artifacts) die je op je telefoon opent; de weekbriefing is er één die elke maandag wordt bijgewerkt.

## 4. Grenzen, kosten en tijd

- Subagents: standaard tot 20 tegelijk per sessie, tot drie niveaus diep. Elke subagent verbruikt eigen tokens.
- Agent teams: experimenteel; de documentatie adviseert 3 tot 5 teamleden en ze kosten veel meer tokens.
- Cloudsessies: geen hard maximum gevonden; ze delen de limieten van je account.
- Geplande taken: minimaal een uur tussen runs, 100 geplande runs per uur per account. Kies minuten als 07 of 37, want op het hele uur kan de start uitlopen.
- Berichten tussen sessies werken niet vanuit een cloudsessie terug; daarom is GitHub het berichtenkanaal.
- Kosten: cloudsessies en geplande taken vallen onder je abonnement en tellen mee voor je gebruikslimiet. Gebruik Sonnet voor specialisten en routines, Opus voor review en onderzoek. GitHub-controles kosten geen Claude-tokens, alleen GitHub-minuten. Actuele prijzen: https://claude.com/pricing.
- Tijd (schatting): twee tot drie avonden inrichten, daarna 20 tot 30 minuten per week voor PR's en de weekbriefing.

Niet geverifieerd: of je accountgeheugen en het geheugen van subagents in cloudsessies bewaard blijven, of cloudsessies zelf een pushmelding sturen, en het exacte aantal cloudsessies tegelijk.

## 5. Eerste drie stappen

1. De poort dicht: `ci.yml`, lint en tests in `deploy.yml`, en de bescherming op main.
2. Claude aan de repo koppelen: de Claude GitHub-app, de review- en nachtelijke workflow, de werkafspraken in CLAUDE.md, de besluitmap, de sjablonen en de labels.
3. De eerste agents en routine: settings en hook, tester en reviewer, en de weekbriefing op maandag 07:07. Daarna de overige specialisten, skills en de wekelijkse digest.

Eenmalig door jou: de Claude GitHub-app installeren (lees de rechten), GitHub koppelen voor cloudsessies, een cloudomgeving met setup-script, de geplande taken aanmaken, de GitHub-app op je telefoon en model en inspanning vastzetten.

## 6. Wat jij beslist

1. Pro of Max? Begin op je huidige abonnement, meet een maand en schaal op als je de limiet raakt.
2. Is de repo privé? Aanbeveling: ja.
3. Merge jij altijd zelf? Aanbeveling: ja, vanaf je telefoon.
4. Welke meldingen: alleen de GitHub-app (aanbevolen), of ook ntfy of Telegram?
5. Mag je back-up ooit in een cloudsessie? Aanbeveling: nee, nagemaakte testdata.
6. Mogen nachtelijke taken zelf fixes voorstellen, of alleen melden? Aanbeveling: eerst alleen melden.
7. Weekbriefing op maandag en een nachtelijke test: akkoord?
8. Presentaties als pagina (artifact)? Aanbeveling: ja.
9. Hoe geef je akkoord: met "akkoord bouwen" in het issue en daarna de merge?

## Bronnen

https://code.claude.com/docs/en/sub-agents.md, https://code.claude.com/docs/en/skills.md, https://code.claude.com/docs/en/hooks-guide.md, https://code.claude.com/docs/en/hooks.md, https://code.claude.com/docs/en/memory.md, https://code.claude.com/docs/en/best-practices.md, https://code.claude.com/docs/en/scheduled-tasks.md, https://code.claude.com/docs/en/routines.md, https://code.claude.com/docs/en/claude-code-on-the-web.md, https://code.claude.com/docs/en/github-actions.md, https://code.claude.com/docs/en/agent-teams.md, https://code.claude.com/docs/en/cross-session-messaging.md, https://code.claude.com/docs/en/remote-control.md, https://code.claude.com/docs/en/channels.md, https://code.claude.com/docs/en/claude-projects.md, https://code.claude.com/docs/en/model-config.md, https://code.claude.com/docs/en/permission-modes.md, https://code.claude.com/docs/en/costs.md
