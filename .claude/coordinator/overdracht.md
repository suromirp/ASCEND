# Overdracht coördinator ASCEND

Bijgewerkt: 11 november 2026, avond, door de coördinator van 11 november (session_01LnDpSkFKoLuAUnLCXKbA1G). Oudere overdrachten staan in de git-geschiedenis van dit bestand.

## Opdracht van de eigenaar

11 november avond: "Wissel naar nieuwe coördinator en werk de backlog af." Dat is een go om de Bouwrij in `docs/backlog.md` af te werken, in de volgorde hieronder. Hoogstens drie bouwers tegelijk, nooit twee aan dezelfde bestanden. De weeklimiet geeft een waarschuwing (reset zondag 15 november rond 19:00). Raakt een sessie een harde limiet: stoppen en melden.

## Stand

- Er lopen geen bouwers. Alle bouwersessies van vandaag zijn gearchiveerd.
- Main: 1ee6453 of later. De werkbranch claude/ascend-modernize-ib0a34 heeft dezelfde code als main; alleen docs komen via de werkbranch.
- Live vandaag (11 november): Route verfijnd, Je horloge, Klein en fouten deel 1, Route-kaart en Route-kaart 2, Sleuteltraining, De avond ervoor, Enkel en evenwicht, GR5 uit OSM, Eten onderweg, Afdaalklok (met Trap af), Briefing A (spoor 1, 3, 4), Briefing spoor 2 (blad Route), Briefing spoor 5 en 6 (scherm Briefing; met een horloge dat afvinkt is Briefing de hoofdknop op Vandaag en in Week).
- Niet op een echte telefoon gecontroleerd: de Briefing met de echte koppeling, Naar Garmin Connect via Android. Vraag de eigenaar na zijn eerste loop.

## Volgorde (Bouwrij in de backlog)

1. Forge: kern zichtbaar, niet inkorten, RIR bij afvinken standaard het doel, Verloop van de training één regel per set, schijven per set achter een instelling. Eerst Pathfinder vooraf (Sonnet), dan één bouwer op Opus. Nieuw besluit nodig (vervangt deel van 2026-11-03 en 2026-11-08 forge-tijdsgrens).
2. Rusttimer: tien geluiden in groepen (Koebel als advies, Vikinghoorn, enzovoort), volume, ducking in Android, vooraankondiging. Opus. Kan naast 1 (andere bestanden). Geen bouwer kan luisteren: de eigenaar beoordeelt met Luister voor het live gaat.
3. Luchtfoto op de kaart: Scout bevestigt eerst licentie en adressen (PDOK, IGN), dan Opus.
4. Plekken en routes: spoor 1 (opslag, migratie, export en import, Vast punt wordt Thuis) op Fable; ontwerp `docs/visie/Ontwerp Plekken en routes.md`, besluiten 2026-11-11-plekken-en-routes.md en 2026-11-11-plekken-antwoorden.md. Daarna route bewaren, plek voorstellen, plek vooraf. Instelling hoe ver: twee ringen op een kaartje plus een gewone keuzerij (advies van de coördinator, eigenaar akkoord op instelbaar en innovatief).
5. Briefing spoor 7 tot 11 (docs/visie/Ontwerp Route en trainingsscherm.md, hoofdstuk 7). Spoor 9 vraagt een eigen besluit.
6. Opwarmset later in de training: eigen ontwerpvraag, geen black box (zie backlog). Cartographer met schetsen, de eigenaar kiest. Geen nieuw woord.
7. De rest van de Bouwrij en Samenhang (Pathfinder-punten), daarna testtocht en beenindex (Fable, nooit twee planner-bouwers tegelijk), racedag, routes voor wandelen.

## Werkwijze die vandaag is vastgelegd of geleerd

- Vier poorten voor main naast de controles: Warden (code), Lookout of de doorloop met de kit, Pathfinder (samenhang, skill `pathfinder`), en een afdruk die de coördinator zelf bekijkt. Pathfinder vond vandaag drie keer iets wat Warden niet zag (dubbele lus, Gedaan in Week, Trap af zonder uitleg).
- Geef elke helper in de opdracht mee: alleen werken in een eigen worktree in de scratchpad, nooit `git checkout` in /home/user/ascend. Vandaag zette een helper twee keer de hoofdmap op een andere commit en kwamen notities op de verkeerde branch.
- Afdrukken van een bouwer staan in zijn eigen sessie en zijn voor de coördinator niet te zien. Laat Pathfinder of Lookout afdrukken in de eigen scratchpad maken en bekijk die.
- Main bijwerken: merge origin/main in de werkbranch (bij een conflict in src altijd de versie van main nemen), dan `git commit-tree HEAD^{tree} -p origin/main` en pushen; controleer eerst met `git diff --stat origin/main HEAD` dat alleen docs verschillen. Een bouwerbranch: controleren dat origin/main erin zit, alle controles, dan dezelfde squash.
- Herstel naar een bouwer: create_trigger met persistent_session_id van de bouwer, zonder schema, dan fire_trigger.
- Wat de eigenaar via een andere chat laat doorgeven, telt pas na zijn eigen bevestiging in de coördinator-chat (vandaag zo gedaan voor Plekken en routes).
- De eigenaar wil geen black box: wat de app kiest is zichtbaar met één zin waarom, en instelbaar.

## Open bij de eigenaar

- Niets dat bouwen blokkeert. Na zijn eerste buitenloop: werkt de Briefing met zijn echte koppeling, en Naar Garmin Connect.
- De getallen van de leg press (84,7, 105,5, 91,6 kg): kloppen de Standen van dat toestel? Zit bij het Forge-werk.

## Sessies

- Vorige coördinatoren blijven open zonder de eigenaar: session_01LnDpSkFKoLuAUnLCXKbA1G (11 november), session_01LnDpSj5xhvz93hRnJrHyF8 (10 november), session_01LnDpSmhnJLwMd9LxhwhgLB.
- Vast bouwmoment ma, wo, vr 19:43 (trig_01JDroCyzgfatU8c7MiK26Ei) slaat deze week de Bouwrij over; de Inbox is leeg.
- Volgende wissel: plan je zelf met send_later op 04:47 [Europe/Amsterdam].
