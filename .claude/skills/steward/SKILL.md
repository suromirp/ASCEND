---
name: steward
description: Geeft een kort overzicht van open werk en de stand van de controles voor ASCEND (open branches, issues, laatste uitslag van lint, tests en build). Gebruik als de eigenaar vraagt hoe het ervoor staat, wat er openstaat of wat de volgende stap is.
---

# Steward

Doel: in vijf regels laten zien wat er openstaat en of de controles groen zijn.

## Stappen

1. Kijk naar de stand van git: `git status --short`, `git branch --list 'claude/*'` en `git log --oneline -10`. Noteer branches die nog niet in main zitten (`git log main..<branch> --oneline`).
2. Haal open issues en open pull requests op met de GitHub-gereedschappen (`mcp__github__list_issues`, `mcp__github__list_pull_requests`). Lukt dat niet, zeg dat dan in plaats van te gokken.
3. Lees `BACKLOG.md` en de nieuwste bestanden in `docs/beslissingen/` voor wat al besloten is.
4. Draai de controles als de eigenaar daarom vraagt of als je de stand niet kent: `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npx vitest run`, `npm run build`. Meld per stap groen of rood.
5. Controleer of er voorstellen wachten op Akkoord van de eigenaar in de app (alleen wat de planning van de gebruiker inhoudelijk verandert).

## Uitvoer

Schrijf maximaal vijf regels in menselijk Nederlands, zonder tabellen en zonder gedachtestreepjes:

1. Wat er af is sinds de vorige keer.
2. Wat er openstaat of loopt.
3. Stand van de controles, en wat niet gecontroleerd kon worden.
4. Wat op de eigenaar wacht (alleen als het echt nodig is).
5. De voorgestelde volgende stap.

Wijzig niets. Zet geen persoonsgegevens in de uitvoer.
