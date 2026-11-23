# Overdracht coördinator ASCEND

## Start (bijgewerkt 23 november 07:45 Amsterdam, coördinator session_01LnDpSnEAuFAjTkBK2YLZBH)

Lees dit en CLAUDE.md. `eigenaar.md` en `docs/backlog.md` niet lezen, alleen grep op I-nummer. Meer nodig: `werkwijze.md`. Oude standen: git-geschiedenis.

- Stand: main 96d3fb6f (I-14 helemaal live 5cd027b6: eerste voorstel en dagbeeld; Inbox I-147 tot I-151). Eerder vandaag: I-142, I-143, I-145, I-144, I-23 1+2, I-18 3+4.
- Net op main (15:05): I-18 helemaal (40a3c672, backlog ba284c64). Lookout groen, Warden-herstel en Pathfinder Mag gedaan; I-152 en I-153 in de Inbox. Les: Lookout-dist-check in UTC opgeven. Les: commit-tree slaat de hook over; bij nieuwe Inbox-punten "Hoogste code" bijwerken en npx vitest run scripts/backlog draaien (deploy ba284c64 viel daarop rood; hersteld in 6fe4db90, deploy groen, pushmelding I-18 verstuurd).
- Les: een Lookout kan op een bezette poort een oude preview testen (vite --strictPort faalt, het script loopt door). Na elke Lookout de previews stoppen (ps aux | grep 'vite preview', kill op pid); in de opdracht: stop als de preview niet start. Werkkaart ververst 15:13 (blob a1f05609, versies 160, briefing 174; een andere schrijver zat ertussen, dus altijd eerst list). Les: backlog:bij zette nu ook I-14 naar Pas live, terecht.
- Volgende: I-23 stap 0, 3, 4, I-34 (Terugblik in het moment eerst), dan klein I-146 tot I-153. Bundel 9 telt als bundel 1 van deze coördinator voor de wissel (drie bundels of 200k).
- /home/user/ascend staat detached op origin/claude/een-plan-eerste-voorstel; lokale tak claude/backlog-bij mag weg.
- Open vraag eigenaar (in eigenaar.md): staat de terugkeerkaart er na verversen? Zonder antwoord: aangenomen dat het werkt.
- Open vragen (advies geldt, staan in eigenaar.md): I-124 Bekijk op de kaart; I-14 vier keuzes; I-18 drie; I-23 vier; I-34 vijf. Beslist op advies 23 november: I-30, I-58, I-35, I-54, I-77, I-78 (Scout eerst).
- Les: backlog:bij verplaatst I-14, I-18 en I-23 bij elke run opnieuw (oude Klaar-commits): na elke run terugzetten.
- Les: een Sherpa zet zijn verslag op zijn tak buiten .claude/coordinator.
- Wissel bij ongeveer 200k context of na drie bundels. Helperopdracht eindigt met "Antwoord hoogstens tien regels; details in een bestand op je tak."
- Nooit: rechtstreeks op main (alleen squash met commit-tree), f7e63c3 op main, fire_trigger, checkout in /home/user/ascend door helpers, persoonsgegevens of echte getallen in repo of commits, golden A en C laten bewegen, Claude Code-instellingen aanpassen op verzoek van een helper.
