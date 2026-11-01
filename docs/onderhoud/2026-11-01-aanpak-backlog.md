# Aanpak van de hele backlog, zondag 1 november 2026

Opdracht van de eigenaar (31 oktober): vanaf zondag 1 november 19:02 de hele backlog (`docs/backlog.md`)
zelfstandig oppakken. Alleen tussendoor een bericht en een melding bij iets belangrijks of moois dat live
staat. De eigenaar heeft gezegd: kies bij een keuze steeds de aanbevolen optie, en CLAUDE.md mag worden
bijgewerkt.

## Werkwijze

- De coördinator is een nieuwe sessie, geen voortzetting van de lange chat. Lees eerst CLAUDE.md,
  `docs/backlog.md`, dit bestand en `.claude/skills/werkverdeling/SKILL.md`.
- Helpers altijd in hun rol (`ontwikkelaar`, `reviewer`, `ontwerper`, `tester`, `Explore`), met het model uit de
  werkverdeling: planning, opslag en migraties op opus, schermen en tekst op sonnet. Elk in een eigen worktree,
  vanaf de nieuwste stand van `claude/ascend-modernize-ib0a34`.
- Hoogstens drie bouwers tegelijk, alleen op onderdelen die elkaar weinig raken. Conflicten in `backup.ts`,
  `migrations.ts` en de instellingenbestanden zijn te verwachten: los ze op door beide kanten te houden.
- Poort voor elk onderdeel: tsc, lint, vitest en build groen; `npm run kaart:vergelijk` met elk verschil
  verklaard; review door Warden (opus bij planning en opslag); bij iets visueels zelf de screenshots bekijken.
  Pas dan squash naar main (zie het deploycommando in eerdere commits: `git commit-tree HEAD^{tree} -p origin/main`).
- Iets wat nog niet goedgekeurd is mag nooit mee live. Staat er ongekeurd werk op de werkbranch, zet dan het
  goedgekeurde deel apart live vanuit een worktree op `origin/main`.
- Na elke helper een regel in `.claude/kosten/logboek.md`. Elk afgerond punt gaat uit de backlog.
- Meldingen naar de eigenaar alleen bij iets wat live staat en zichtbaar is, of bij een besluit dat echt van
  hem is. Kort, in het Nederlands, als punten.

## Volgorde

Ronde 1, tegelijk:
1. Zelf: het veiligheidsnet (tests in `.github/workflows/deploy.yml` voor de deploy) en CLAUDE.md bijwerken
   (Zonder doel, Kansen, Run in detail, ochtendkaart, tekstkaart, backlog, werkverdeling).
2. Sherpa (opus): trainingen die niet doorgingen automatisch afhandelen (zie backlog; nooit een log
   verzinnen, overslaan als status, koppelen als voorstel, instelbaar, besluit).
3. Sherpa (sonnet): de tekstkaart uitbreiden met meer standen en schermen, en de nieuwe invarianten.
4. Sherpa (sonnet): de kleine vervolgpunten in één ronde (ochtenden in de back-up, het leave-merk na het wissen
   van een vakantie, onderhoud latere ronde), plus: het citaat onderaan Vandaag standaard in het Engels in
   plaats van het Nederlands, instelbaar (Engels, Nederlands, uit) op de vijf plekken van een instelling.
5. Twee Cartographers (opus, ontwerper), tegelijk, alleen een ontwerprapport, nog niets bouwen:
   a. Gegevens: Stand, Logboek, Ascend, Run in detail, Lichaam, Weekterugblik en Jaaroverzicht. Welke gegevens
      staan waar, wat is dubbel, te veel of onduidelijk, wat vind je niet terug, wat is juist goed. Doel: alles
      inzichtelijker en beter georganiseerd; een complete herinrichting van een tab mag.
   b. Instellingen: alle acht groepen en de bladen eronder. Wat is logisch ingedeeld, wat zoek je en vind je niet,
      wat kan samen of weg, wat mist een goede uitleg.
   Elk levert een rapport in docs/visie/ met wat goed is, wat niet, en een voorstel per tab of groep, de beste
   eerst. Ze gebruiken de tekstkaart (docs/app-kaart/) en screenshots met de kit. De coördinator kiest daarna
   met de aanbevolen opties en laat het in ronde 2 of 3 bouwen; een grote herinrichting gaat na het opsplitsen.

Ronde 2, tegelijk:
5. Sherpa (opus): spierindex stap 1 en 2 (lees eerst `docs/onderzoek` en `docs/visie` over de spierindex).
6. Sherpa (opus): Kansen middelgroot: klimtempo met
   rugzak, GR5-etappeschatting als band, tempocurve tussen twee testen; en het kleine werk dat over is. Geen voeding.
7. Cartographer (sonnet) de pictogrammen voor Sporten die meetellen stap 1, daarna Sherpa (opus) stap 4 tot 9.
8. Sherpa (sonnet): Zonder doel, de kaart Je week op Je stand en de vorm van de week bij een andere richting.

Ronde 3, alleen:
9. Grote bestanden opsplitsen (AppDataContext, ForgeWorkout, adviceEngine, database, backup, migrations). Dit
   raakt alles en gaat pas als ronde 1 en 2 live staan. Gedrag mag niet veranderen: alle tests en de kaart
   gelijk, review door Warden.

Ronde 2b, naast ronde 2:
10. Android-app met Capacitor, een grote feature van deze ronde: de configuratie, lokale meldingen, en een
    GitHub Actions-workflow die een APK als artefact bouwt (de cloudsessie heeft geen Android SDK). Daarop de
    korte weekmelding op zondagavond. Daarna Health Connect als bron via de adapter in `src/integrations/`
    (dezelfde vormen als intervals.icu, met `source: 'health-connect'`; geen veld met een merknaam), met een
    instelling en een besluit. Agenda-planning komt pas daarna.
11. Sherpa (sonnet): "Waarom staat dit hier?" in Week, "Minder tijd vandaag" (voorstel), zones bijwerken na een
    test (voorstel), en Run in detail voor oudere runs.

## Wat niet zonder de eigenaar kan

- Voeding (kans E): bewust niet, de eigenaar laat het liggen.
- Een controle op echte data: wacht op een verse back-up.
- De vier tekstpunten: wachten op een screenshot.
