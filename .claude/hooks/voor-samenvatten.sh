#!/usr/bin/env bash
# PreCompact: wat hier op stdout staat, gebruikt Claude Code als opdracht voor de samenvatting.
# Een haak kan het model niet eerst laten werken; daarom vraagt hij de samenvatting om alles
# te bewaren wat nog niet in de overdracht staat, en doet de haak na het samenvatten de rest.
cat <<'TXT'
Neem in de samenvatting letterlijk op, kort en als punten:
- elke lopende bouwer of helper: rol, onderwerp, sessie-id of agentId, branch, en wat hij nog moet doen;
- elke open vraag aan de eigenaar en wat er gebeurt zonder antwoord;
- elk besluit, elke wens en elke afspraak van vandaag met de reden;
- wat nog niet in .claude/coordinator/overdracht.md staat.
Zet bovenaan de samenvatting: "Werk eerst .claude/coordinator/overdracht.md bij met wat hieronder nog niet in de overdracht staat."
TXT
