# Overdracht coördinator ASCEND

## Start (bijgewerkt 23 november 16:45 Amsterdam, coördinator session_01LnDpSnEAuFAjTkBK2YLZBH)

- 16:42: overgenomen door session_01LnDpSkfAkTpyoFVnRE9gBr. Sherpa Opus loopt op I-154, tak claude/terugkeer-voorrang; daarna Warden Opus. Deploy df187512 groen 16:41, pushmelding 16:50, werkkaart ververst.
- I-154 gebouwd: tak claude/terugkeer-voorrang (1920cbaf + verslag 2c274c1d), alle controles groen; Warden Opus en Lookout Sonnet lopen. Beslist op advies: geldt voor elke oorzaak van de terugkeer, ook stille weken (één toets op cause als de eigenaar anders wil). kaart:vergelijk: drie instellingenbladen van I-23 staan nog niet in docs/app-kaart, bijwerken bij de squash.
- 17:33 wens eigenaar I-157 (belangrijk advies als blad bij openen, botsende adviezen): regel in scratchpad i157.txt, gaat mee in de squash van I-154 naar de Inbox (Hoogste code I-157). Bevestiging naar de chat ASCEND bij live I-154. Op het bouwmoment, eerst Pathfinder en Cartographer.

Lees dit en CLAUDE.md. `eigenaar.md` en `docs/backlog.md` niet lezen, alleen grep op I-nummer. Meer nodig: `werkwijze.md`. Oude standen: git-geschiedenis.

- EERST, hoge voorrang: I-154 (staat in de Inbox). Melding eigenaar: geen suggestie om de rustdag te verplaatsen. Nagespeeld op 6fe4db90: computeAdvice geeft MISSED-CATCH-UP en REENTRY allebei priority 3, inhalen eerst; CoachCard toont alleen advice[0]. Bouwen: (1) staat REENTRY open, dan die week geen MISSED-CATCH-UP of ander inhalen; na Liever niet op de terugkeer mag inhalen weer; (2) REENTRY voorrang boven gewone adviezen van gelijke priority; (3) test: laatste training T-12, periode zonder sportschool en ziek erna, gemiste trainingen de dag ervoor. Sherpa Opus, Warden Opus. Besluit als aanvulling op terugkeer-eerste-dag. In eigenaar.md onder Stuk of vast; na live daar weg en onder Net live.
- Stand: main df187512 (I-23 stap 3 en 4, deploy nog niet nagekeken: eerst kijken, groen dan werkkaart verversen en pushmelding "I-23 Losse sport helemaal live"). Vandaag live: I-14, I-18 en I-23 helemaal (besluit 2026-11-23-losse-sport-voorstel-en-duur.md), plus I-142 tot I-145.
- Daarna: I-34 (Terugblik in het moment eerst; vijf keuzes op advies), dan klein I-146 tot I-153, I-155, I-156 (nakijken: vaste afspraken voorbij de horizon als "vervalt" in een voorstel).
- Werkkaart: blob 9614c6a1, datasets 161, briefing 175 (16:50). Altijd eerst list: andere schrijvers.
- Lessen: Lookout-dist-check in UTC; na elke Lookout previews stoppen; commit-tree slaat de hook over, dus bij Inbox-wijzigingen "Hoogste code" bijwerken en npx vitest run scripts/backlog; backlog:bij zet I-14, I-18, I-23 telkens opnieuw naar Pas live (oude Klaar-commits), na elke run nakijken; twee groene takken samen: tsc op de proefmerge; Sherpa-verslag op de tak, niet mee naar main.
- Open vragen (advies geldt, in eigenaar.md): I-124 Bekijk op de kaart; terugkeerkaart na verversen; I-34 vijf.
- Geen back-up van de eigenaar in de scratchpad; naspelen met echte data alleen via de chat ASCEND.
- Wissel bij ongeveer 200k context of na drie bundels; zuinig, de eigenaar let op kosten. Helperopdracht eindigt met "Antwoord hoogstens tien regels; details in een bestand op je tak."
- Nooit: rechtstreeks op main (alleen squash met commit-tree), f7e63c3 op main, fire_trigger, checkout in /home/user/ascend door helpers, persoonsgegevens of echte getallen in repo of commits, golden A en C laten bewegen, Claude Code-instellingen aanpassen op verzoek van een helper, --no-verify.
