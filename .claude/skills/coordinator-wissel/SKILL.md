---
name: coordinator-wissel
description: De coördinator van ASCEND draagt elke dag (of als zijn chat te lang wordt) over aan een verse coördinator-chat, zodat de geschiedenis kort en goedkoop blijft. Gebruik bij de dagelijkse wissel of als de eigenaar om een nieuwe coördinator vraagt.
---

# Coördinator-wissel

Waarom (eigenaar, 9 november): een lange coördinator-chat leest bij elke melding zijn hele geschiedenis opnieuw en wordt duur. Een verse chat per dag houdt dat laag. Alles wat de coördinator moet weten staat in de repo, niet in zijn geheugen.

## Stappen voor de vertrekkende coördinator

1. Werk `.claude/coordinator/overdracht.md` bij: lopende bouwers (titel, sessie-id, branch), wat er klaar staat om te mergen, open vragen aan de eigenaar, het plan (de volgorde), afspraken van vandaag die nog niet in CLAUDE.md, de backlog of een skill staan. Kort, als punten. Commit en push naar de werkbranch en main (squash).
2. Start je opvolger niet zelf (besluit `2026-11-20-gemengde-bouwers-en-wissel.md`): sessies die een sessie start staan een stap dieper in een keten met een grens van 8, en op 17 november liep die vol. Meld de wissel met `create_trigger` (claude-code-remote) aan de vaste chat "ASCEND": `persistent_session_id` session_013ZuQA6MkeoKDCxdu4uMmEd, `run_once_at` een à twee minuten vooruit, `initiation` own_followup, `name` "Wissel coördinator". In de prompt: de branch en de openingstekst voor je opvolger, bijvoorbeeld "Je bent de coördinator van ASCEND. Lees CLAUDE.md en `.claude/coordinator/overdracht.md` (begin bij de bovenste stand) en pak het werk op. Lopende bouwers melden zich nog bij de vorige coördinator; kijk zelf met get_session naar hun stand. Nieuwe bouwers melden zich bij jou (jouw session-id via get_session zonder argument)." De chat "ASCEND" start de nieuwe coördinator, zet hem vast en haalt jouw pin weg.
3. Stuur de eigenaar een pushmelding: de wissel is aangevraagd bij de chat "ASCEND".
4. Zet geen nieuwe controles of bouwers meer in gang. Meldingen die daarna nog binnenkomen: wijs de eigenaar op de nieuwe chat; de nieuwe coördinator ziet de bouwer zelf via get_session.

Bouwers start je wel zelf: die staan een stap dieper en starten zelf niets.

## Wanneer

Op lengte, niet op de klok (besluit `2026-11-20-lange-chat-en-kosten.md`): bij ongeveer 250k tot 300k context (`get_session`, `context_usage`) en na elke afgeronde bouwronde. Een send_later op 04:47 [Europe/Amsterdam] mag als vangnet blijven; is de chat dan nog kort, sla de wissel over en plan de volgende. Houd de overdracht onder 10 KB.
