# Overdracht coördinator ASCEND

Bijgewerkt: 9 november 2026, 20:15 UTC, door de coördinator van 8 en 9 november.

## Lopende bouwers (Fable 5.2, melden zich bij de coördinator van 9 november avond, session_01LnDpSmhnJLwMd9LxhwhgLB)

- Teksten Lichaam en Instellingen (R9, plan punt 1), session_01LnDpSmxgVMGeBEVSvd52Lk, branch claude/teksten-lichaam-instellingen: meldde klaar om 23:40 UTC, teruggestuurd voor herstel (lijst Naar een fysio altijd open, Akkoord-zin afzwakken waar hij niet klopt, tweede review Warden en nieuwe meting Lookout). Meldt zich opnieuw.
- Datavelden voor je horloge (plan punt 3), session_01LnDpSmQ4BrFUPHMVa43uxV, branch claude/datavelden-horloge.
- Startpunt van je lus (punt 11, Sonnet), session_01LnDpSnpmm6ebGwgkgF9CeF, branch claude/startpunt-lus.
- Uitleg bij oefeningen batch 3 en 4: klaar, wordt op main gezet na de controles (59 oefeningen nog zonder uitleg; een volgende batch op Sonnet).

Live sinds de wissel: Overzicht Gewicht (b39130d), Calisthenics algemeen en Routeplanner fase 1 en 2 (8f5ba7e). Plan punten 0, 2 en 4 zijn dus af; hierna 6 (Buiten), 7 (Feestdagen), 8, 9, 10. De eigenaar gaf akkoord (9 november avond) op twee nieuwe punten, in de Inbox van de backlog: 11. Startpunt van je lus (routeplanner, instelling Ongeveer of Precies); 12. voorstel dat squat op één been en L-sit in een training zet (planner, niet tegelijk met 7). Starten zodra er een plek vrij is, 11 eerst. De drie bouwers vielen om ongeveer 21:15 tot 22:50 UTC stil op de limiet van vijf uur en zijn om 23:04 UTC gewekt.

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
Niet: Engels (wacht), MF-code verwijderen (pas als het moment er is).
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
- 9 november avond, eigenaar: de coördinator draait op Opus (claude-opus-5-5); zwaar werk op Fable (bouwers die planning, opslag, migraties of een nieuwe engine raken, Warden, Scout), licht werk op Sonnet (bouwers voor teksten en uitleg, Lookout, Cartographer). Geef bij create_session altijd model mee. Staat in de skills werkverdeling en coordinator-wissel.
- 9 november 23:45 UTC, eigenaar gaat slapen: "Je mag zelf beslissingen nemen wat jij denkt dat het beste is; geef me een ochtendrapport." Vannacht zelfstandig doorwerken (max 3 bouwers, model per laag), elke keuze opschrijven voor het rapport. Na wat loopt (Startpunt van je lus met de rij op de trainingspagina, Datavelden, Teksten herstel): eerst Routeplanner fase 3, delen naar Garmin Connect (Fable, eigenaar 23:56 UTC: "mag je voortrekken"; pas starten als Startpunt van je lus op main staat, zelfde bestanden; een native wijziging eerst als proefbouw door de Android-workflow), dan Buiten (UV, licht tot, Sonnet), dan het voorstel squat op één been en L-sit (Fable), dan uitleg batch 5 (Sonnet). Eigenaar 23:58 UTC: Feestdagen naar de backlog (niet vannacht); de zorgzin in het blad van een oefening en de zes catalogusvoorstellen mogen weg; geen coördinator-wissel om 04:47, deze chat maakt zelf het ochtendrapport.
- Ochtendrapport (maandag 10 november, om 07:43 Amsterdamse tijd, of zodra wat loopt is afgehandeld als dat later is): de skill weekbriefing (het is maandag), met daarin wat vannacht live ging, wat de eigenaar op zijn telefoon moet nakijken, elke keuze die de coördinator zelf nam, wat bleef liggen en waarom, en de stand van de limieten. Daarna een pushmelding met de link. De coördinator die dan draait doet dit.
