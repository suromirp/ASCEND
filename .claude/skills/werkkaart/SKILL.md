---
name: werkkaart
description: Houdt de Werkkaart van ASCEND bij, het dashboard voor de eigenaar (https://claude.ai/artifact/JAmcpeDaGBX24C22dqRFAp, vastgezet in zijn zijbalk) met bouwers, backlog en wat live staat als graaf. Gebruik bij elke ronde van de Wachter, na elke push naar main en bij de coördinator-wissel.
---

# Werkkaart bijhouden

Waarom (eigenaar, 14 november): een dashboard dat vanzelf bijwerkt, niet vergeten wordt en niet op de achtergrond valt, als graaf zoals Graphify. Het dashboard leest één bestand, `werkkaart.json`. Live uit GitHub lezen kan niet: GitHub is geen connector van zijn account, alleen een tool van de sessie. Dus werkt de coördinator het bestand bij. Staat het bijgewerkt meer dan drie uur stil, dan kleurt de tegel Bijgewerkt amber.

## Stappen (elke ronde van de Wachter, na elke push naar main)

1. Schrijf `stand.json` in de scratchpad uit `get_session` van elke lopende bouwer (status: bezig, review, herstel, klaar, vast), de laatste deploy op main (`mcp__github__actions_list`, groen, rood of bezig), Wachter aan of uit, de tijd van de volgende ronde, en één zin `melding` in de stijl Jarvis: wat er gebeurt en wat de eigenaar moet doen, of "Niets nodig van jou." Vorm: zie de kop van `bouw.py`.
2. Op de nieuwste origin/main: `python3 -I .claude/skills/werkkaart/bouw.py --repo . --stand <stand.json> --uit <scratchpad>/werkkaart.json`.
3. Upload met Artifact publish (`url` hierboven, `file_path` het nieuwe bestand, `asset: true`); onthoud de nieuwe `/_blob/<id>`.
4. Lees `datasets/kaart` en `datasets/briefing` (ArtifactData get) en `update` beide met `if_version`: `source.url` de nieuwe blob, `updated: {at, by: "Claude (coördinator)"}` en `edit: {via: "claude", at}`.
5. Verwijder het oude bestand (Artifact delete met `url` en `path` het oude asset-id), alleen als geen dataset het meer noemt.
6. Lees `data/users/me` (`check`, `runs`): staat er een fout, herstel de pagina (`files/index.html`) eerst.

Geen persoonsgegevens in het bestand: het dashboard is privé, maar wat erin staat komt uit de openbare repo en de stand van de bouwers.
