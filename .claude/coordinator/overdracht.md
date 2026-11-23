# Overdracht coördinator ASCEND

## Start (bijgewerkt 23 november 07:45 Amsterdam, coördinator session_01LnDpSnEAuFAjTkBK2YLZBH)

Lees dit en CLAUDE.md. `eigenaar.md` en `docs/backlog.md` niet lezen, alleen grep op I-nummer. Meer nodig: `werkwijze.md`. Oude standen: git-geschiedenis.

- Stand: main d346aa47 (I-14 stap A eerste voorstel live 1164e9b5, met herstel wedstrijddag in computeForecastReplan; Inbox I-147 tot I-149 van de Warden). Eerder vandaag: I-142, I-143, I-145, I-144, I-14 C+D, I-23 1+2, I-18 3+4.
- Volgende in bundel 9: I-14 eerste voorstel en dagbeeld (A en B it.fails; Warden, Lookout, Pathfinder), I-18 stap 5 tot 7, I-23 stap 0, 3, 4, I-34 (Terugblik in het moment eerst). Lijst leeg: Graphify-proef opnieuw plannen (trig_01Y51Apkj25Cb19ifriWdA36), met geheugenmeting. Sherpa Eén plan eerste voorstel (I-14 stap A, opus) op claude/een-plan-eerste-voorstel: Warden niet akkoord (wedstrijddag valt weg in computeForecastReplan, ook op main bij opstart; besluit ontbreekt; Mag 3,4,5,7,8), Sherpa herstelt. Mag 6 (weekvoorschrift voegt bij wedstrijd duurlopen toe die voorbeeld niet toont) nog als Inbox-punt. Daarna kaart, Lookout. Worktrees onder .claude/worktrees en /tmp/lookout-ladder mogen weg.
- Les: een Lookout kan op een bezette poort een oude preview testen (vite --strictPort faalt, het script loopt door). Na elke Lookout de previews stoppen (ps aux | grep 'vite preview', kill op pid); in de opdracht: stop als de preview niet start. Werkkaart ververst 12:06 (blob 51fcb0c5, versies 157, briefing 171). Volgende: I-14 dagbeeld (eenPlanDag.test.ts it.fails A en B).
- /home/user/ascend staat detached op origin/claude/een-plan-eerste-voorstel; lokale tak claude/backlog-bij mag weg.
- Open vraag eigenaar (in eigenaar.md): staat de terugkeerkaart er na verversen? Zonder antwoord: aangenomen dat het werkt.
- Open vragen (advies geldt, staan in eigenaar.md): I-124 Bekijk op de kaart; I-14 vier keuzes; I-18 drie; I-23 vier; I-34 vijf. Beslist op advies 23 november: I-30, I-58, I-35, I-54, I-77, I-78 (Scout eerst).
- Les: backlog:bij verplaatst I-14, I-18 en I-23 bij elke run opnieuw (oude Klaar-commits): na elke run terugzetten.
- Les: een Sherpa zet zijn verslag op zijn tak buiten .claude/coordinator.
- Wissel bij ongeveer 200k context of na drie bundels. Helperopdracht eindigt met "Antwoord hoogstens tien regels; details in een bestand op je tak."
- Nooit: rechtstreeks op main (alleen squash met commit-tree), f7e63c3 op main, fire_trigger, checkout in /home/user/ascend door helpers, persoonsgegevens of echte getallen in repo of commits, golden A en C laten bewegen, Claude Code-instellingen aanpassen op verzoek van een helper.
