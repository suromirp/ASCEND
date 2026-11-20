# Gemengde bouwers en wissel via de chat ASCEND

Datum: 2026-11-20
Status: aangenomen

## Besluit

- Een bouwer die naar verwachting langer dan een half uur duurt, of die planner, opslag of migraties raakt, krijgt een eigen chat (`create_session`). Hij meldt zich met `create_trigger` bij de coördinator van dat moment.
- Kleine klussen gaan naar een helper in de chat van de coördinator (Agent, eigen worktree).
- Het model volgt wat het werk raakt, zoals in de skill `werkverdeling`.
- De coördinator start zijn opvolger niet zelf. Is het tijd (rond 250k tot 300k context, of na een bouwronde), dan werkt hij de overdracht bij en meldt hij de wissel met `create_trigger` aan de vaste chat "ASCEND" (session_013ZuQA6MkeoKDCxdu4uMmEd), met `run_once_at` een à twee minuten vooruit, `initiation` own_followup, naam "Wissel coördinator", en in de prompt de openingstekst voor de opvolger en de branch. De chat "ASCEND" start de nieuwe coördinator, zet hem vast en haalt de oude pin weg.
- Een coördinator mag wel bouwers starten: die staan een stap dieper en starten zelf niets.
- Dit vult `2026-11-20-lange-chat-en-kosten.md` aan; daar zegt het besluit nog dat een opvolger start als eenmalige taak met een verse sessie. Dat vervalt.

## Reden

Sessies die door een sessie gestart worden staan een stap dieper in een keten, met een grens van 8. De coördinator van 17 november kon daardoor geen losse chats meer starten. Start de vaste chat "ASCEND" (stap 0) elke coördinator, dan staat die altijd op stap 1 en een bouwer op stap 2. Een losse chat voor lang of zwaar werk houdt de chat van de coördinator kort; een helper is goedkoper voor klein werk.

## Alternatieven

Alleen helpers in de coördinator-chat: de chat groeit met elk rapport en een lange bouwer houdt hem bezet. Alleen losse chats: duur en traag voor kleine klussen. De coördinator start zijn opvolger zelf: de keten loopt elke dag een stap op.

## Bron

Akkoord van de eigenaar op 20 november ("Ja gemengd, doe jouw advies"), doorgegeven door de vaste chat "ASCEND".
