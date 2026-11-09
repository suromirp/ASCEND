# Overdracht coördinator ASCEND

Bijgewerkt: 9 november 2026, 20:15 UTC, door de coördinator van 8 en 9 november.

## Lopende bouwers (Fable 5.2, melden zich bij de vorige coördinator session_013ZuQA6MkeoKDCxdu4uMmEd)

- Overzicht Gewicht, session_01LnDpSjPX916UEKBXbypjaY, branch claude/gewicht-overzicht.
- Calisthenics als algemeen doel, session_01LnDpSnqskFn7mJs7MeBHXT, branch claude/calisthenics-algemeen.
- Routeplanner fase 1 en 2, session_01LnDpSnYUz5KXGGxNwWNP4y, branch claude/routeplanner.

Afhandelen als ze klaar zijn (get_session: status completed, of de branch staat er met een afdruk): branch fetchen, mergen in claude/ascend-modernize-ib0a34, alle controles (tsc, lint, vitest, build, kaart:vergelijk), afdruk bekijken (map afdrukken/ op de branch), squash naar main, sessie archiveren, de eigenaar een korte melding met wat live staat en wat hij kan nakijken. Staat een bouwer stil op een vraag om bevestiging: zelf afmaken (mergen en live zetten).

## Plan (eigenaar: "als de proef geslaagd is mag je zelf zonder mijn toestemming de rest uitvoeren", proef geslaagd 9 november)

Fable 5.2 voor bouwers, max 3 tegelijk, nooit twee aan dezelfde bestanden. Bouwers pushen alleen hun branch; de coördinator zet naar main.
Volgorde:
0. Overzicht Gewicht (wens eigenaar, kaart op Stand).
1. Teksten Lichaam en daarna Instellingen (R9: settingsHelp en settingsIndex gelijktrekken).
2. Routeplanner fase 1 (Scout) en 2 (lus simpel en avontuurlijk, GPX) — engine nieuw, weinig botsing.
3. Datavelden voor je horloge (Scout + bouw).
4. Na "Hoe goed kent Forge je": Calisthenics als algemeen doel (Forge en doelen).
5. Uitleg bij de overige oefeningen (batches van 20; na 4, Forge-bestanden).
6. Buiten: UV, licht tot, hoogte van je plek.
7. Feestdagen als voorstel (planner, niet tegelijk met andere planner-sessies).
8. Wat het bouwmoment van vanavond liet liggen uit de Inbox (Health Connect-rest, kleine punten).
9. Routeplanner fase 3 (delen naar Garmin Connect) en 4.
Niet: Engels (wacht), herinrichting Forge (groot, apart besluit), MF-code verwijderen (pas als het moment er is).
Na elke melding: archiveren, merge, kort melden, volgende starten. Weeklimiet Fable in de gaten: meldt een sessie een limiet, stoppen en melden.
10. Forge herinrichting, de rest (na 4).

Opdrachtstaart voor elke bouwer (vervang de session-id door die van de nieuwe coördinator):

Werkwijze (vast, uit CLAUDE.md en de skill werkverdeling): zelfstandig, geadviseerde keuzes, geen vragen. Helpers als hun rol volgens de skill werkverdeling. Alle controles (tsc, lint, vitest, build, `npm run kaart:vergelijk` met elk verschil verklaard), Warden, Lookout met de skill `lookout` op 360, 390 en 412 px. Besluit in `docs/beslissingen/`. Een regel in `.claude/kosten/logboek.md` (model Fable). Werk op je eigen branch vanaf origin/main en push alleen die branch (met origin/main erin gemerged); breng niets naar main en niets naar de werkbranch, dat doet de coördinator. Zet een afdruk (412 px) van wat veranderd is in de map `afdrukken/` op je eigen branch. Er lopen andere bouwers tegelijk; raak alleen je eigen onderwerp aan.

Als je helemaal klaar bent (of vastloopt): meld het de coördinator met de tool create_trigger (claude-code-remote): persistent_session_id "session_013ZuQA6MkeoKDCxdu4uMmEd", run_once_at één à twee minuten vanaf nu (RFC3339, UTC), initiation "own_followup", name "Klaar: <jouw titel>", en als prompt in het Nederlands: "Bouwer klaar: <titel>, sessie <jouw session-id uit get_session zonder argument>. Branch: <naam, commit>. Afdruk: <pad>. Controles: <uitslag>. Wat de eigenaar zelf kan nakijken: <kort>. Vragen voor de coördinator: <of geen>." Doe dit als allerlaatste stap, één keer.

## Afspraken van 8 en 9 november die je moet kennen

- Wat de eigenaar zelf moet weten: korte Nederlandse punten, pushmelding als iets live is, afdrukken van veranderde schermen sturen.
- Afgeronde bouwers meteen archiveren; nooit de vaste sessie Bouwmoment ASCEND (session_01LnDpSiQuT8vwstxK8ptqSt) archiveren.
- De naspeel-kit werkt weer (backupNormalize, backupPreview, backupApply, backupMerge). Back-ups van de eigenaar alleen in de eigen scratchpad, nooit in de repo; de nieuwe coördinator heeft ze niet en vraagt de eigenaar om een verse als hij moet naspelen.
- Doel: MacroFactor Workouts overbodig maken (docs/visie/Los van MacroFactor.md); de weekbriefing meldt de stand.
- Weeklimiet "Alle modellen" stond op 30 procent (9 november avond), Fable 6 procent; de eigenaar heeft een gratis Fable-reset tot 9 maart.
- Vaste bouwmoment ma, wo, vr 19:43 staat aan (trig_01JDroCyzgfatU8c7MiK26Ei).
