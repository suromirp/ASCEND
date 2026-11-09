---
name: coordinator-wissel
description: De coördinator van ASCEND draagt elke dag (of als zijn chat te lang wordt) over aan een verse coördinator-chat, zodat de geschiedenis kort en goedkoop blijft. Gebruik bij de dagelijkse wissel of als de eigenaar om een nieuwe coördinator vraagt.
---

# Coördinator-wissel

Waarom (eigenaar, 9 november): een lange coördinator-chat leest bij elke melding zijn hele geschiedenis opnieuw en wordt duur. Een verse chat per dag houdt dat laag. Alles wat de coördinator moet weten staat in de repo, niet in zijn geheugen.

## Stappen voor de vertrekkende coördinator

1. Werk `.claude/coordinator/overdracht.md` bij: lopende bouwers (titel, sessie-id, branch), wat er klaar staat om te mergen, open vragen aan de eigenaar, het plan (de volgorde), afspraken van vandaag die nog niet in CLAUDE.md, de backlog of een skill staan. Kort, als punten. Commit en push naar de werkbranch en main (squash).
2. Start de nieuwe coördinator met `create_session` (claude-code-remote): source_url https://github.com/suromirp/ascend, revision claude/ascend-modernize-ib0a34, model claude-fable-5-2 (of het model dat de eigenaar noemt), titel "Coördinator ASCEND <datum>", en als prompt: "Je bent de coördinator van ASCEND. Lees CLAUDE.md, `.claude/coordinator/overdracht.md`, de skills werkverdeling, bouwmoment en coordinator-wissel, en ga verder. Lopende bouwers melden zich nog bij de vorige coördinator; kijk zelf met get_session naar hun stand (elke 30 minuten met send_later) tot ze klaar zijn, en handel ze af zoals de overdracht zegt. Nieuwe bouwers melden zich bij jou: gebruik in hun opdracht jouw eigen session-id (get_session zonder argument). Plan de volgende wissel met send_later op de vaste tijd."
3. Stuur de eigenaar een pushmelding en één regel: de titel van de nieuwe chat, en dat hij daar verder praat.
4. Zet geen nieuwe controles of bouwers meer in gang. Meldingen die daarna nog binnenkomen: kort doorsturen naar de nieuwe coördinator kan niet, dus alleen de eigenaar wijzen op de nieuwe chat; de nieuwe coördinator ziet de bouwer zelf via get_session.

## Vaste tijd

Elke dag om 04:47 Amsterdamse tijd (stil moment), of eerder als de chat erg lang wordt. De nieuwe coördinator plant zelf de volgende wissel met send_later (`at` 04:47 met [Europe/Amsterdam]).
