---
name: werkkaart
description: Houdt de Werkkaart van ASCEND bij, het dashboard voor de eigenaar (https://claude.ai/artifact/JAmcpeDaGBX24C22dqRFAp, vastgezet in zijn zijbalk) met vier blokken (Vraag aan u, Stuk of vast, Loopt goed, Net live), de stroom en een kaart van de app. Gebruik bij elke ronde van de uurtaak, na elke push naar main en bij de coördinator-wissel.
---

# Werkkaart bijhouden

Waarom (eigenaar, 14 en 15 november): een dashboard dat vanzelf bijwerkt en in twee seconden zegt wat de vragen aan hem zijn, wat stuk is en wat goed loopt; daaronder de stroom van het werk en een echte kaart van de app zoals Graphify, levend maar rustig. Live uit GitHub lezen kan niet (GitHub is geen connector van zijn account), dus schrijft een sessie het bestand `werkkaart.json` en leest de pagina dat.

## Wie het doet

De sessie "Werkkaart ASCEND" op Sonnet, drie keer per dag (8:20, 13:20 en 20:20 Amsterdam; zuinige stand, 21 november). De coördinator werkt hem daarnaast bij na elke push naar main. De Wachter kijkt alleen of hij vers is (niet ouder dan zes uur). De coördinator houdt `.claude/coordinator/eigenaar.md` bij; daar komen de vier blokken vandaan.

## Wat waar vandaan komt

- Vraag aan u: elke `###` onder `## Vraag aan u` in `eigenaar.md`, met de regels Keuzes, Zonder antwoord, Sinds.
- Stuk of vast: de punten onder `## Stuk of vast` in `eigenaar.md` (schrijf "Niets." als er niets is), plus vanzelf: een rode deploy op main, een bouwer met bucket failed, of een bouwer die werkt maar al meer dan twee uur geen update gaf; amber voor een bouwer die blocked is of een needs_action heeft.
- Loopt goed: de bouwers uit `stand.json`, met hun stap (bouwen, controle, naar main) en de laatste stand in gewone taal; `bouw.py` haalt commit-hashes en branchnamen eruit.
- Net live: `## Net live` in `eigenaar.md`, nieuwste datum bovenaan.
- Stroom: Inbox uit `## Inbox` van `docs/backlog.md` (alleen de titel, zonder de code `[I-n]`), Bouwen en Controle uit de bouwers, Live de laatste vijf commits op main.
- Kaart van de app: knooppunten zijn de werkbriefjes, hun bestanden de paden onder `## Bestanden`, lijnen de imports tussen die bestanden in `src/`. Een onderwerp waar een bouwer bestanden wijzigt (branch tegen origin/main) pulseert met de naam van de bouwer.

## Stappen (drie keer per dag, en na elke push naar main)

1. `git fetch origin` en werk op de nieuwste `origin/claude/nacht` (daar staan `bouw.py` en `eigenaar.md`; main krijgt ze bij de volgende squash).
2. `list_sessions` met `mine: true`, limit 50 (het filter op tags werkt niet: filter zelf). Neem elke sessie met tag `ascend:builder` waarvan `session_status` niet `SESSION_STATUS_ARCHIVED` is. Schrijf `stand.json` in de scratchpad:
   ```
   {"bouwers": [{"titel": "<title>",
                 "bucket": "<status_bucket zonder SESSION_STATUS_BUCKET_, in kleine letters: working, completed, blocked, review_ready, failed>",
                 "bijgewerkt": "<updated_at>",
                 "samenvatting": "<post_turn_summary.recent_action, anders task_summary, anders leeg>",
                 "vraag": "<post_turn_summary.needs_action of leeg>",
                 "branch": "<claude/... als je hem weet, anders weglaten>"}],
    "deploy": {"status": "groen|rood|bezig", "commit": "<7 tekens>"}}
   ```
   De deploy: `mcp__github__actions_list` met `list_workflow_runs`, branch main, perPage 2; de run "Deploy ASCEND to GitHub Pages": success is groen, failure rood, anders bezig. Zonder branch zoekt `bouw.py` hem in de samenvatting.
3. `python3 -I .claude/skills/werkkaart/bouw.py --repo . --stand <stand.json> --uit <scratchpad>/werkkaart.json` (duurt een seconde).
4. Upload: Artifact publish met `url` hierboven, `file_path` het nieuwe bestand, `asset: true`. Onthoud de nieuwe `/_blob/<id>`.
5. Lees de datasets: ArtifactData `list` op `datasets` (geeft de versies). Het zijn er negen: `briefing`, `vragen`, `stuk`, `bouwers`, `netlive`, `stroom`, `onderwerpen`, `lijnen`, `bestanden`, allemaal hetzelfde bestand. Eén `batch` met per dataset `{"op": "update", "collection": "datasets", "doc_id": <id>, "if_version": <versie>, "data": {"source": {"url": "<nieuwe blob>"}, "updated": {"at": <nu UTC>, "by": "Claude (werkkaart)"}, "edit": {"via": "claude", "at": <nu UTC>}}}`. Faalt de batch op een versie: opnieuw lezen en opnieuw, nooit zonder `if_version`.
6. Verwijder het oude bestand (Artifact delete met `url` en `path` het oude asset-id), alleen als geen dataset het meer noemt.
7. Lees `data/users/me` (`check`, `runs`): staat er een fout, meld het de coördinator. De pagina zelf (`files/index.html`) raak je niet aan; de bron staat in `.claude/skills/werkkaart/index.html` en alleen een bouwer verandert hem (lees eerst `artifact-type/reference/one-writer.md` van het type).

## De pagina

Bron: `.claude/skills/werkkaart/index.html`, geschreven naar `files/index.html` met `if_version`. Tijden in Portugese tijd tot en met 17 november, daarna Amsterdamse tijd (`wk.zone()`), nooit UTC. Beweging: tellers lopen op, kaartjes schuiven van links in hun kolom en een kaartje dat een kolom opschuift licht op, de kaart vouwt zich open uit een cirkel, een onderwerp waar gebouwd wordt pulseert en de lijnen ernaartoe stromen. Alles staat stil bij `prefers-reduced-motion`. Een rode melding valt op door kleur en rand, nooit door knipperen.

Geen persoonsgegevens in het bestand: het dashboard is privé, maar wat erin staat komt uit de openbare repo en de stand van de bouwers.
