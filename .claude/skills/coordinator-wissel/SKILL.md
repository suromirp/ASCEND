---
name: coordinator-wissel
description: De coördinator van ASCEND draagt elke dag (of als zijn chat te lang wordt) over aan een verse coördinator-chat, zodat de geschiedenis kort en goedkoop blijft. Gebruik bij de dagelijkse wissel of als de eigenaar om een nieuwe coördinator vraagt.
---

# Coördinator-wissel

Waarom (eigenaar, 9 november): een lange coördinator-chat leest bij elke melding zijn hele geschiedenis opnieuw en wordt duur. Een verse chat per dag houdt dat laag. Alles wat de coördinator moet weten staat in de repo, niet in zijn geheugen.

## Stappen voor de vertrekkende coördinator

1. Werk het blok **Start** van `.claude/coordinator/overdracht.md` bij, hoogstens 3 KB, één regel per punt: stand, lopende bouwers (titel, sessie-id of agent, branch), volgende stap, open vragen in één regel, de nevers. Oude standen haal je weg (git-geschiedenis houdt ze). Vaste afspraken, geleerde werkwijze en lessen staan in `.claude/coordinator/werkwijze.md`; daar alleen bijschrijven wat blijvend is. Commit en push naar de werkbranch en main (squash).
2. Start je opvolger niet zelf (besluit `2026-11-20-gemengde-bouwers-en-wissel.md`): sessies die een sessie start staan een stap dieper in een keten met een grens van 8, en op 17 november liep die vol. Meld de wissel met `create_trigger` (claude-code-remote) aan de vaste chat "ASCEND": `persistent_session_id` session_013ZuQA6MkeoKDCxdu4uMmEd, `run_once_at` een à twee minuten vooruit, `initiation` own_followup, `name` "Wissel coördinator". In de prompt: de branch en de openingstekst voor je opvolger, bijvoorbeeld "Je bent de coördinator van ASCEND. Lees CLAUDE.md en het blok Start van `.claude/coordinator/overdracht.md` en pak het werk op. Lopende bouwers melden zich nog bij de vorige coördinator; kijk zelf met get_session naar hun stand. Nieuwe bouwers melden zich bij jou (jouw session-id via get_session zonder argument)." De chat "ASCEND" start de nieuwe coördinator, zet hem vast en haalt jouw pin weg.
3. Stuur de eigenaar een pushmelding: de wissel is aangevraagd bij de chat "ASCEND".
4. Zet geen nieuwe controles of bouwers meer in gang. Meldingen die daarna nog binnenkomen: wijs de eigenaar op de nieuwe chat; de nieuwe coördinator ziet de bouwer zelf via get_session.

Bouwers start je wel zelf: die staan een stap dieper en starten zelf niets.

## Zuinig starten (eigenaar, 23 november)

- De opvolger leest CLAUDE.md en het blok Start, verder niets. `werkwijze.md` alleen als hij het nodig heeft. `eigenaar.md` en `docs/backlog.md` leest hij niet bij de start: zoeken met grep op een I-nummer.
- Elke helperopdracht eindigt met: "Antwoord hoogstens tien regels; details in een bestand op je tak." De uitslag van helpers vult het geheugen het snelst.

## Wanneer

Op lengte, niet op de klok: bij ongeveer 200k context (`get_session`, `context_usage`) of na drie bundels, wat eerst komt (eigenaar, 23 november; vervangt de 250k tot 300k uit besluit `2026-11-20-lange-chat-en-kosten.md`). Een send_later op 04:47 [Europe/Amsterdam] mag als vangnet blijven; is de chat dan nog kort, sla de wissel over en plan de volgende. Houd het blok Start onder 3 KB.
