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

## Skills die meedoen

- `code-review` op elk groot onderdeel naast Warden (een tweede blik op fouten), op het niveau medium;
  `security-review` op de Android-app en Health Connect.
- `simplify` in ronde 3 bij het opsplitsen en opruimen.
- `dataviz` voor elke grafiek die gebouwd of herzien wordt (Run in detail, Stand, het ontwerprapport gegevens).
- `skill-creator` bij de reflectie na elke ronde, om de eigen skills (`werkverdeling`, `lookout`, `onderhoud`)
  te verbeteren en hun beschrijving scherp te houden.
- `deep-research` als een onderdeel nieuw onderzoek vraagt (bijvoorbeeld bij Kansen of de spierindex), in plaats
  van een losse Scout.
- De eigen skills `werkverdeling`, `lookout` en `onderhoud` zoals altijd.
- Plug-ins van het account. De coördinatorsessie van 1 november ziet ze wel (een eerdere sessie zag ze niet).
  De ontwerptaal van ASCEND gaat altijd voor op wat een plug-in voorstelt.
  - `Design` (kritiek, toegankelijkheid, UX-teksten) bij de ontwerprapporten en elk nieuw scherm.
  - `frontend-design` alleen als tweede blik op een ontwerprapport, nooit als opdracht aan een bouwer.
  - `Engineering` als extra blik bij architectuur en het opsplitsen.
  - `Product Management` bij het samenvoegen van de gebruikerstest tot een lijst.
  - `modern-web-guidance` bij de Android-app en bij de optimalisatie in ronde 3.
  - `Data` doet niet mee: `dataviz` is genoeg voor grafieken, en twee methodes naast elkaar spreken elkaar tegen.
  - Plug-ins die niets met ASCEND te maken hebben (Gmail, Agenda, Drive, Shopify, QuickBooks, Canva en dergelijke)
    komen nooit in een opdracht aan een helper, ook niet als ze geladen zijn.

## Zelfstandig, ook als de eigenaar slaapt

- Niets wacht op de eigenaar. Een keuze: de aanbevolen optie. Een besluit dat echt van hem is (zoals voeding): laten
  liggen, noteren in de backlog en door met de rest.
- Helpers draaien op de achtergrond; hun melding maakt de coördinator wakker. Als vangnet staat er steeds een
  check-in over ongeveer een uur (send_later), zodat het werk doorgaat als er iets blijft hangen.
- Gaat iets twee keer mis (een bouwer die niet groen wordt, een review die steeds blokkeert): opschalen naar opus,
  en lukt het dan nog niet, het onderdeel parkeren met de reden in de backlog en verder met het volgende.
- Een melding naar de eigenaar alleen bij iets wat live staat en de moeite waard is; 's nachts geen meldingen
  voor kleine dingen.

## Na elke ronde: terugkijken

Na elke ronde schrijft de coördinator kort in `docs/onderhoud/reflectie-2026-11-01.md` (één bestand, een kopje per
ronde): wat goed ging, wat misging, wat het kostte (uit het kostenlogboek), hoeveel herstelrondes en waarom, en wat
de volgende ronde anders gaat. Wat blijvend beter werkt gaat in `.claude/skills/werkverdeling/SKILL.md` (eisen
vooraf, model per soort taak, wat Warden of Lookout eerder had kunnen vangen) en, als het een fout is die terug kan
komen, als invariant in de tekstkaart of als test. De volgende ronde begint pas na die reflectie.

Bij elke fout, herstelronde of dure helper zoekt de reflectie de echte oorzaak, en kijkt naar al deze lagen:
- de opdracht: ontbrak een eis vooraf, een maat, een bestand of een regel uit CLAUDE.md;
- de rol: was het de goede helper (bouwer, ontwerper, reviewer, tester, Explore), of had een andere het beter
  of goedkoper gedaan;
- het model en het denkwerk: te licht (een fout die een zwaarder model had gezien) of te zwaar (dure helper voor
  werk dat sonnet of haiku ook kon);
- de informatie: had de helper de goede bronnen (docs, tekstkaart, echte back-up), of ontbrak er kennis die in de
  repo hoort;
- de poort: welke controle (test, invariant, Warden, screenshot) had het eerder kunnen vangen;
- de coördinator zelf: verkeerde volgorde, te veel tegelijk, te weinig gelezen, te veel zelf gedaan.
Even serieus kijkt de reflectie naar wat juist heel goed ging (een bouwer die in één keer groen en mooi was, een
review die een echte fout ving, een goedkope helper die genoeg was, een opdracht die zonder vragen werkte): wat
maakte het goed, en hoe wordt dat de standaard. Een opdracht die goed werkte wordt een sjabloon in de werkverdeling
(`.claude/skills/werkverdeling/`), een helper die goedkoop genoeg was zet de tabel lager, en een werkwijze die
loonde (bijvoorbeeld toetsen op de echte back-up) gaat in de poort.

Per oorzaak één concrete aanpassing, en die gaat meteen in de werkverdeling, een skill, een agentbeschrijving,
de tekstkaart of een test, zodat de volgende ronde hem al heeft. Aanpassingen aan `.claude/agents/` en
`.claude/skills/` zijn met toestemming van de eigenaar (1 november).

## Na elke functie en elke ronde: klopt het geheel?

Wens van de eigenaar (1 november): het eind moet een volledig pakket zijn, waarin alles af is en logisch samenhangt.
Daarom kijkt de coördinator naast het terugkijken op het werk ook naar het product zelf.

Na elke functie, voordat hij live gaat, een korte toets door de coördinator zelf:
- Is de functie af van begin tot eind: een ingang die je vindt, een lege stand, een foutstand, de instelling op de
  vijf plekken, de uitleg, de export en import, en een weg terug (Annuleren, een voorstel afwijzen, ongedaan maken)?
- Past hij bij de rest: dezelfde woorden, dezelfde plek voor hetzelfde soort ding, geen tweede manier om iets te
  doen wat al kan, en hij helpt de vraag "wat is mijn missie vandaag" binnen twee seconden?
- Wat raakt hij dat nu niet meer klopt: een andere kaart, een melding, de weekterugblik, een tekst in de uitleg?

Na elke ronde een bredere blik, met de tekstkaart (`docs/app-kaart/`) en screenshots van de veranderde schermen:
- Loop de app langs als de vier personen uit ronde 4 en kijk of de nieuwe functies samen een logisch verhaal zijn.
- Wat mist er nu, wat is dubbel geworden, en wat is er door het nieuwe werk opgekomen om het af te maken?
- De uitkomst gaat als kopje "Klopt het geheel?" in `docs/onderhoud/reflectie-2026-11-01.md`.

Wat er uit zo'n toets komt, en waar het heen gaat:
- Een gat in een functie die net gebouwd is (een ontbrekende lege stand, instelling of weg terug): dezelfde bouwer
  maakt hem af voordat hij live gaat. Een functie met zo'n gat is niet af.
- Iets wat nodig is om het geheel logisch te maken, binnen wat de backlog al wil: een nieuw punt in
  `docs/backlog.md` met de reden, en het gaat mee in de eerstvolgende ronde.
- Een echt nieuw idee of iets wat de richting verandert: in de backlog onder "Voor de eigenaar", niet bouwen.
- Zo blijft de backlog eindig: elke ronde mag hoogstens vijf nieuwe punten toevoegen. Wat erbuiten valt wordt
  gebundeld voor de eigenaar.

## Alles wat zichtbaar is krijgt de ASCEND-stijl

Elke opdracht voor iets zichtbaars noemt de stijl als eis, niet als wens: de ontwerptaal uit CLAUDE.md (zee en berg,
één mint accent, tokens, Eyebrow, Card, Marcellus alleen voor woorden, cijfers in Inter tabular, 12 px, 44 px,
pictogrammen in stijl C) en de beweging uit `docs/architectuur/bediening-en-beweging.md` (150 tot 400 ms, ease-out,
alleen bij verschijnen, `mx-*` en de hooks in `components/motion.ts`, bladen die de vinger volgen, Rustig en Uit
op de eindstand). Een nieuw scherm of een nieuwe kaart krijgt een passende verschijning en overgang, net zo
verzorgd als de bestaande. De poort kijkt hierop: Warden toetst de stijl en de beweging, de coördinator bekijkt de
screenshots en, bij een animatie, ook de stand met Beweging Uit. Wat er kaal of anders uitziet gaat terug.

## Volgorde

Ronde 1, tegelijk:
1. Zelf: het veiligheidsnet (tests in `.github/workflows/deploy.yml` voor de deploy) en CLAUDE.md bijwerken
   (Zonder doel, Kansen, Run in detail, ochtendkaart, tekstkaart, backlog, werkverdeling).
2d. Sherpa (sonnet): de ochtendkaart na je antwoord (screenshot van de eigenaar, 1 november). (a) De kaart houdt de
   hoogte van de vraag vast, waardoor er na "Fris genoteerd." een groot leeg vlak staat met alleen onderaan
   "Ongedaan maken"; laat de gevolgstand zijn eigen, korte hoogte hebben met een zachte overgang (geen
   verspringing van de missiekaart eronder, wel geen lege ruimte), en Ongedaan maken direct onder de zin.
   (b) Het gevolg noemt alleen "Bovenlichaam B blijft staan." terwijl vandaag eerst de Testloop 5 km staat
   (gepaard: eerst de testloop, dan Bovenlichaam B). `morningConsequence` moet de belangrijkste training van
   vandaag noemen (een test of race eerst, anders de eerste in de volgorde van de dag), of beide ("Testloop 5 km
   en Bovenlichaam B blijven staan."). Met test op deze vorm en een screenshot op 360 en 390 px.
2e. Sherpa (sonnet), bij de kleine punten: op de plekpagina van Lichaam (`src/pages/BodySpot.tsx`, tekst in
   `src/data/bodyCare.ts`) staat onder "Wat je doet bij last" altijd een open blok "Naar een fysio of je huisarts
   bij" met zes punten. De eigenaar vindt die steeds terugkerende fysio-tekst irritant. Maak het rustig: een
   ingeklapte regel ("Wanneer laat je het nakijken?") die openklapt, zonder waarschuwingsicoon zolang er niets aan
   de hand is; open en in amber alleen als de gebruiker zelf een van die signalen meldde (bijvoorbeeld pijn die
   erger werd, of een plek die hij niet kan belasten). De inhoud blijft gelijk (zorgteksten blijven "kan helpen"),
   alleen de plek en de toon veranderen. Met screenshot op 360 en 390 px.
2c. Sherpa (opus): de rustdag komt niet terug. Gevonden in de back-up van 1 november: een voorstel (TEST-RETRY,
   28 oktober) haalde de rij Herstel op maandag 2 november weg om plaats te maken; de test en de lange duurloop
   gingen daarna elders heen, maar de rustdag bleef weg (status skipped, lock van het voorstel). Week toont nu
   "Vrij · niets gepland" op de vaste rustdag. Twee delen: (a) een lege dag op de vaste rustdag heet in Week
   Rustdag ("je vaste rustdag"), puur weergave; (b) haalde een voorstel de rustdag weg en is de dag weer leeg,
   dan komt de rij Herstel terug via een klein voorstel met Akkoord (of de bestaande terugzetregel, zie
   engine/restDayProposal.ts en de week-regel REST-DAY). Met test op deze vorm en besluit.
2b. Sherpa (opus): een vakantie of vrije periode bijwerken in Week (data, soort, notitie), in plaats van alleen
   Verwijderen. Een wijziging die de planning raakt is één voorstel met Akkoord dat het verschil laat zien
   (engine/leaveProposal.ts), met een eigen tik op de rij en een blad in de ASCEND-stijl. Met test en besluit.
   Neem mee wat de eerste echte vakantie liet zien (back-up van 1 november, 14 tot 18 november): Bovenlichaam A
   van dinsdag 17 schoof naar zondag 22, naast de lange duurloop en twee dagen voor de volgende Bovenlichaam A
   op dinsdag 24; zo staan er drie bovenlichaamtrainingen in vijf dagen. Een training die voor een vakantie
   opzij schuift mag niet vlak voor zijn eigen volgende keer belanden; dan liever laten vervallen.
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
   gelijk, review door Warden. In dezelfde ronde: de ongebruikte exports uit de nulmeting van 29 oktober
   (`docs/onderhoud/2026-10-29-exports.txt`, 854 stuks) opruimen waar ze echt nergens gebruikt worden.
   Daarna code optimaliseren, gemeten voor en na: de bundel (grootte per chunk, routes en zware schermen lui laden),
   de start van de app (tijd tot Vandaag in beeld op 4x vertraagde processor), onnodige renders in de grote
   schermen, IndexedDB-lezingen die vaker of breder gaan dan nodig, en de duur van de testsuite (nu ongeveer 4 min;
   bijvoorbeeld pool en isolatie van vitest). Alleen wat meetbaar beter wordt en gedrag niet verandert.

Ronde 2b, naast ronde 2:
10. Android-app met Capacitor, een grote feature van deze ronde: de configuratie, lokale meldingen, en een
    GitHub Actions-workflow die een APK als artefact bouwt (de cloudsessie heeft geen Android SDK). Daarop de
    korte weekmelding op zondagavond. Daarna Health Connect als bron via de adapter in `src/integrations/`
    (dezelfde vormen als intervals.icu, met `source: 'health-connect'`; geen veld met een merknaam), met een
    instelling en een besluit. Agenda-planning komt pas daarna.
11. Sherpa (sonnet): "Waarom staat dit hier?" in Week, "Minder tijd vandaag" (voorstel), zones bijwerken na een
    test (voorstel), en Run in detail voor oudere runs.

Ronde 4, aan het eind: de app gebruiken zoals een mens
12. Drie tot vier testers (tester, sonnet; opschalen naar opus bij twijfel), elk met een eigen persoon en een
    nagemaakte stand, die met de kit van Lookout en een verschuivende klok een paar weken in de app leven: elke
    ochtend de ochtendkaart, trainen en loggen (ook via MacroFactor en het horloge), iets overslaan, slepen, een
    voorstel aannemen of afwijzen, ziek worden, op vakantie gaan, een test lopen, instellingen zoeken.
    Personen: een loper met een wedstrijd en een bergtocht als doel (zoals de eigenaar), een beginner zonder
    doel, iemand die vooral krachttraint, en iemand die ziek wordt en een vakantie heeft.
    Elk noteert wat goed werkt, wat misgaat, wat onlogisch of onduidelijk is en waar hij iets niet vond, met
    screenshots. De coördinator voegt de lijsten samen, kiest met de aanbevolen opties en laat het herstellen
    in een laatste ronde, met dezelfde poort.
    Alleen aan het eind, geen tussentijdse proef (keuze van de eigenaar, 1 november).

## Wat niet zonder de eigenaar kan

- Voeding (kans E): bewust niet, de eigenaar laat het liggen.
- Een controle op echte data: wacht op een verse back-up.
- De vier tekstpunten: wachten op een screenshot.
