---
name: werkverdeling
description: Kiest voor elke taak in ASCEND welke helper, welk model en hoeveel denkwerk, en houdt het kostenlogboek bij. Gebruik voordat de coördinator een helper start, en na elke afgeronde taak voor het logboek.
---

# Werkverdeling: wie doet wat, op welk model

De coördinator kiest met deze tabel, niet op gevoel en niet met een aparte keuze-agent (die kost zelf
weer tokens). Start een helper altijd als zijn rol (`subagent_type`), nooit als `general-purpose`:
die erft het model van de coördinator.

## De tabel

| Soort taak | Rol (`subagent_type`) | Model | Denkwerk |
|---|---|---|---|
| Een tekst, een label, een kleur, één regel | coördinator zelf | (eigen) | laag |
| Bouwen van een afgebakende wijziging | `ontwikkelaar` (Sherpa) | sonnet | medium |
| Bouwen dat planning, opslag of migraties raakt | `ontwikkelaar` (Sherpa) | fable | medium |
| Ontwerpvoorstel voor een scherm | `ontwerper` (Cartographer) | sonnet | medium |
| Idee naar issue met criteria | `productmanager` | sonnet | laag |
| Doorloop in Chromium (skill `lookout`) | `tester` (Lookout) | sonnet | laag |
| Review van UI, tekst of stijl | `reviewer` (Warden) | sonnet | medium |
| Review van engine, planning, opslag, migraties | `reviewer` (Warden) | fable | medium |
| Lastig onderzoek, formules in de engine | `sportwetenschapper` (Scout) | fable | medium |
| Iets zoeken in de code | `Explore` | haiku | laag |
| Samenhang en UX: plek vooraf, doorloop van de dag voor main | `pathfinder` (Pathfinder) | sonnet | medium |
| Samenhang wekelijks, het totaalplaatje | `pathfinder` (Pathfinder) | fable | medium |

Zwaar werk op Fable in plaats van Opus (eigenaar, 9 november): waar deze skill of een oudere les "opus" zegt, lees Fable. Licht werk blijft op Sonnet. Meldt een sessie dat de limiet van Fable dichtbij is, maak dan alleen af wat loopt en meld het de eigenaar.

Tabellen staan hier omdat dit een werkinstructie is; in teksten voor de eigenaar en in de app geen tabellen.

## Regels erbij

- Eisen vooraf: geef een bouwer altijd mee wat getoetst wordt (maten op 360 en 390 px, wat een gebaar
  precies doet, welke instelling, welke tests). Een ronde herstel kost meer dan een alinea extra uitleg.
- Lookout en Warden mogen één helper zijn bij een kleine wijziging; bij planning of opslag apart.
- Lookout gebruikt de skill `lookout` en schrijft geen nieuwe testkit.
- Een helper leest geen back-up van de eigenaar, tenzij de opdracht het pad noemt en zegt dat het
  alleen lezen is en nooit in de repo komt.
- Datums, plekken en andere details uit een back-up van de eigenaar gaan nooit letterlijk in een opdracht:
  verschuif datums met een paar weken en noem het een nagemaakt voorbeeld (ronde 1: vakantiedata in de repo).
- Alles wat zorg of gezondheid raakt: een waarschuwing of spoedtekst ("bel je huisarts of 112") staat nooit
  achter een tik of in een ingeklapt deel (ronde 1).
- Opslag en historie: de opdracht noemt deze randgevallen als eis, met een test per geval: een fout halverwege
  (alles of niets, Ongedaan maken blijft), een koppeling die verlopen of tijdelijk kapot is, de dag zelf
  (vandaag telt nog niet als voorbij), een rij van een vakantie of tocht, en of het een uitzondering is op
  "logs nooit herschrijven" (dan in CLAUDE.md) (ronde 1).
- Teksten: zoek eerst het bestaande woord op (grep) en gebruik dat; een voorbeeld in een opdracht is nooit een
  nieuw vast woord. Voorstellen hebben Liever niet links en Akkoord rechts (ronde 1).
- Een fout in de interface: noem het gemeten symptoom, de vermoedelijke oorzaak als vermoeden ("meet het") en een
  doorloop met de kit als eis. Dat werkte in ronde 1 in één keer op sonnet.
- Herstel na een review gaat terug naar dezelfde bouwer (SendMessage), niet naar een nieuwe: 20k tot 40k tegen
  90k tot 290k (ronde 1).
- De tekstkaart bouwt altijd zelf op een vrije poort; zet geen `KAART_PORT`. Alleen "Geen verschil met
  docs/app-kaart/." telt als gelijk, nooit een gefilterde uitvoer (ronde 1).
- Geen pagina of artefact voor de eigenaar dat de coördinator niet zelf geopend en gecontroleerd heeft (ronde 1).
- Alles wat de planning raakt is opus, ook als het klein lijkt; kies op wat het raakt, niet op de omvang (ronde 2).
- Een opdracht noemt nooit een optie die een regel uit CLAUDE.md breekt, ook niet als voorbeeld (ronde 2).
- Elke uitlegzin in de app wordt in de review aan de code getoetst; een bewering van een review ook (ronde 2).
- Elke native wijziging (Java, XML, manifest, gradle) gaat eerst door de Android-workflow als proefbouw op de
  branch (workflow_dispatch); tsc, lint, tests en build vangen daar niets (ronde 2b).
- Merge-conflicten in planning of opslag lost de bouwer op die de code kent; de coördinator alleen lijstjes en
  imports (ronde 2b).
- Een bouwer zet elke eigen keuze buiten de opdracht in het besluit; de coördinator leest die lijst voor de review.
  Kleine herstelpunten bundelen in één bericht; een heel klein punt doet de coördinator zelf (ronde 2b).
- Na een deploy die een nieuwe APK vraagt: eerst wachten tot de release van de Android-workflow er staat, pas
  dan de eigenaar vertellen dat hij kan installeren. Mislukt alleen de releasestap (een 502 van GitHub), start de
  workflow dan opnieuw (4 november).

- Uit de nachtronde (1 en 2 november, 13 miljoen tokens aan helpers, 10 miljoen daarvan Sherpa op opus):
  - Knip grote opdrachten in stukken van hoogstens een uur met een eigen controleerbaar einde; een opdracht van drie
    uur (600k) liep vast en moest hervat worden.
  - Een helper hervatten kost 300k tot 400k omdat hij alles opnieuw leest. Kleine reviewpunten doet de coördinator
    zelf of een nieuwe Sherpa op sonnet met alleen de lijst en het briefje; hervatten alleen voor een groot herstel.
  - Opus is voor de regel in de engine of de opslag. De tekst, het scherm en de instelling rond die regel kunnen in
    een aparte opdracht op sonnet.
- Een melding met echte data eerst naspelen met de skill `naspelen`, voordat er een helper komt.
- Bundel kleine fixes: één commit en één keer naar main voor een handvol punten, niet een push per punt.
- Begin per onderwerp of per dag een nieuwe sessie; de kosten per beurt groeien met de lengte van het gesprek.

## Opschalen en afschalen

Begin zo licht als de tabel zegt en schaal op zodra er een reden is, niet uit gewoonte:
- Opschalen naar opus: een bouwer of review op sonnet die een tweede herstelronde nodig heeft; een
  wijziging die toch planning, opslag, migraties of historie raakt; een vermoeden van een fout die
  de tests niet vangen (data die tussen schermen verschilt, een datum rond middernacht of een
  weekgrens); een bevinding van een review die de bouwer niet begrijpt.
- Afschalen: een review van een kleine engine-wijziging met een test erbij en zonder planning of
  opslag mag op sonnet. Een tekst, label of één regel doet de coördinator zelf, zonder helper.
- Geen helper als de coördinator het in een paar minuten zelf kan nagaan (een grep, een probe-test
  die meteen weer weg is). Een helper starten kost zelf ook context.
- Echte data alleen als het iets toevoegt (een melding van de eigenaar die met nagemaakte data niet
  te zien is); dan een goedkope controle eerst (een script met `python3 -I`) en pas daarna een helper.

## Tekst of screenshot

De kaart van de app (`npm run kaart`, `docs/app-kaart/`) is wat elke helper eerst leest in plaats
van zelf door de app te klikken. Na een wijziging draait `npm run kaart:vergelijk`: die meldt welke
schermen anders zijn en controleert de invarianten (getallen die overal gelijk moeten zijn).
- Data, tellingen, teksten, datums: de tekstkaart is genoeg.
- Iets visueels (opmaak, kleur, beweging, tikdoelen, overloop op 360 px): een screenshot of een
  doorloop van Lookout.
- Twijfel, of een verschil in de kaart dat visueel kan zijn: altijd een screenshot erbij
  (`--foto <scherm>`), en de coördinator bekijkt hem zelf.
- Elke inconsistentie die een helper of de eigenaar vindt, wordt een invariant, zodat hij de
  volgende keer vanzelf wordt gevangen.
- Meerdere helpers tegelijk mag, als hun bestanden elkaar niet raken; ieder in een eigen worktree.

## Wat in elke opdracht staat

- Welk werkbriefje de helper eerst leest (`docs/werkbriefjes/<onderwerp>.md`), en zo nodig welke valkuilen uit dat
  briefje hier gelden. Dan hoeft hij niet zelf te zoeken.
- Het doel en de controleerbare criteria, de bestanden als richtpunt, wat niet mag bewegen
  (`planGolden.test.ts`, scheduler, historie).
- Wat de helper oplevert: kort, Nederlands, per punt gedaan of waarom niet, de uitslag van de
  controles en wat niet gecontroleerd is.
- Tokens en duur weet een helper zelf niet: de coördinator haalt ze uit de melding na afloop
  (`subagent_tokens`, `duration_ms`) voor het logboek.

## Het opdrachtsjabloon

Elke opdracht aan Sherpa (en zo nodig Cartographer) volgt deze kopjes, kort, in deze volgorde. Wat leeg blijft
zeg je ("geen instelling nodig: geen keuze voor de gebruiker").

1. **Doel**: één of twee zinnen, met het symptoom van de eigenaar als het een fout is (gemeten, niet vermoed).
2. **Briefje**: `docs/werkbriefjes/<onderwerp>.md`, en welke valkuilen daaruit hier gelden.
2b. **Plek** (bij alles wat zichtbaar is, skill `pathfinder`, moment 1): op welk moment van de dag en bij welke training heb je dit nodig en wanneer juist niet; waar staat het en hoeveel tikken van Vandaag; wat staat er al dat hetzelfde zegt en wat gebeurt daarmee; wat verdwijnt of verhuist.
3. **Eisen**: controleerbaar, als punten (wat de gebruiker ziet, welke tekst, welke maat op 360 en 390 px).
4. **Randgevallen, elk met een test**: kies uit de vaste lijst wat geldt: de dag zelf (vandaag telt nog niet als
   voorbij), een week- of maandgrens en middernacht in Europe/Amsterdam, een vakantie of tocht in de week, een rij
   die de gebruiker zelf vastzette, een test of wedstrijd, een fout halverwege (alles of niets, Ongedaan maken blijft),
   een koppeling die kapot of verlopen is, een oude back-up zonder het nieuwe veld (migratie of defensief lezen),
   Rustig en Uit bij Beweging. Noem welke niet gelden en waarom.
5. **Mag niet bewegen**: `planGolden.test.ts`, historie, de scheduler, en wat het briefje onder Nooit noemt.
6. **Instelling**: welke, met het advies als standaard, in settingsIndex, settingsLayout, settingsSummary en de groep.
7. **Opleveren**: begin met een blok **Bewijs**: wat je zelf zag (screenshots op 412 px als er een scherm verandert, de verschillen van de tekstkaart, bij planning de echte voorbeeldweek per dag). Daarna kort, Nederlands, per eis gedaan of waarom niet; elke eigen keuze buiten de opdracht; de uitslag
   van tsc, lint, de gerichte tests en de volle set; wat niet gecontroleerd is; de branch.

## Sneller testen tijdens het werk

- Tijdens het bouwen: alleen de tests die bij je wijziging horen, `npx vitest related --run <gewijzigde bestanden>`
  of het filter uit het briefje (`npx vitest run src/engine/forge`). Dat duurt seconden in plaats van ruim een minuut.
- De volle set draait de commit-hook zelf (`.claude/hooks/commit-controle.sh`); voor de squash naar main draait de
  coördinator hem nog één keer na de laatste merge, want `git commit-tree` gaat niet door de hook.
- De tekstkaart alleen als een scherm verandert, en lees eerst de samenvatting (`npm run kaart:vergelijk`
  meldt per scherm "gelijk" of het aantal gewijzigde regels); de details per scherm pas als je ze nodig hebt.

## Lange sessies

Een sessie die lang loopt wordt bij elke beurt duurder. Begin na een groot onderwerp of na een
paar dagen een nieuwe sessie; zet wat de volgende sessie moet weten in de takenlijst of in
`docs/onderhoud/`, niet alleen in het gesprek.

## Het kostenlogboek

Na elke afgeronde helper schrijft de coördinator één regel in `.claude/kosten/logboek.md`:
datum, onderwerp, rol, model, tokens en duur (uit de melding van de helper), en het aantal
herstelrondes na review. Geen persoonsgegevens.

Elke maandag (samen met de weekbriefing) kijkt de coördinator naar het logboek van de week:
- welke soort taak het duurst was en of een lichter model het ook had gekund;
- waar herstelrondes vandaan kwamen en welke eis vooraf die had voorkomen;
- past de tabel hierboven aan als het logboek dat laat zien, met de reden in de commit.


## Deze week: limieten opnieuw gezet (eigenaar 11 november, geldt tot en met zondag 15 november)

Gaat voor "Modellen per taak" hieronder, tot en met 15 november of tot de eigenaar iets anders zegt; daarna terug naar de gewone verdeling. De eigenaar wil de reset maximaal benutten. Fable is grondiger maar trager, Opus sneller en veelzijdiger.

- Fable (nieuwste die create_session aanneemt, nu claude-fable-5-2): planner en engine, opslag en migraties, reviews van Warden, onderzoek van Scout, ontwerp van Cartographer, lastige fouten.
- Opus (claude-opus-5-5): de coördinator en snel, gevarieerd bouwwerk (schermen, instellingen, kleine fouten).
- Sonnet of Haiku: alleen licht werk (teksten, Lookout, zoeken).
- Bouwen buiten het bouwmoment mag deze week (eigenaar 11 november: "in principe mag je nu gaan bouwen"); hoogstens drie bouwers tegelijk, nooit twee aan dezelfde bestanden, bouwers in een eigen chat (create_session) die zich bij de coördinator meldt. Kort onderzoek of ontwerp (onder een uur, alleen docs) mag als helper binnen de coördinator-chat.
- Wat de eigenaar in de coördinator-chat zelf zegt, gaat voor een doorgestuurd bericht van een andere chat.


## Lessen uit het onderzoek naar autonome agents (11 november, `docs/onderzoek/Werkwijze autonome agents.md`)

- Zelfreview vóór Warden: elke bouwer laat voor hij zich meldt een frisse helper `reviewer` op sonnet zijn eigen diff naast de eisen van de opdracht leggen, en herstelt wat die vindt. Kost ongeveer $1, een herstelronde $3 tot $5. Zet dit in elke opdracht onder Opleveren.
- Een bestaande test, `planGolden.test.ts` of een invariant aanpassen om groen te worden mag een bouwer nooit stil: dan stopt hij en meldt het, met de reden. Een test die bewust meebeweegt staat met naam in de melding. Zet dit in elke opdracht onder Mag niet bewegen.
- Elke bevinding "blokkerend" of "moet" van Warden of Pathfinder wordt na het herstel een test, invariant, lintregel of valkuil in een briefje, zodat geen reviewer hem nog hoeft te vangen. De coördinator controleert dat bij de merge.
- Knip klein: een opdracht raakt liefst één scherm of één regel in de engine. Kleine wijzigingen komen vaker in één keer door de review.
- Drie getallen per week in het kostenlogboek, bij de maandagronde: het aandeel bouwers dat in één keer akkoord krijgt van Warden, de kosten per functie (bouwer plus reviews), en het aantal punten dat de eigenaar daarna nog vindt. Dat laatste is de echte maat voor "groen maar fout".
- Niet doen: live zetten zonder mens, een AI als blokkerende poort voor UX (Pathfinder wijst aan, beslist niet alleen), een proefversie op hetzelfde adres als de echte app (IndexedDB en de service worker zijn per origin), meer bouwers of reviewers tegelijk dan de coördinator kan nakijken.

## Modellen per taak (eigenaar, 10 november middag)

De eigenaar: "efficiënt gebruik van de modellen per taak en agent; we hebben de keuze uit Fable, Sonnet, Haiku en Opus". Dit vervangt "Alles op Fable" van 10 november ochtend. De kolom Model in de tabel bovenaan lees je zo:

- Haiku (claude-haiku-5-5): zoeken in de code (`Explore`), een lijst of telling maken, het kostenlogboek, een idee naar een issue als het doel al helder is.
- Sonnet (claude-sonnet-5-5): de standaard. Bouwen van een scherm, een tekst, een instelling of een afgebakende wijziging; Cartographer; Lookout; review van UI, tekst of stijl; een bouwer-sessie voor zulk werk.
- Opus (claude-opus-5-5): de coördinator en de sessie van het bouwmoment; review van engine en opslag; lastig onderzoek (Scout); een keuze tussen bronnen of aanpakken; bouwen in de engine dat de planning niet raakt.
- Fable (claude-fable-5-2): bouwen en review die de planning, de scheduler, opslag met migraties of historie raken, en een fout die Opus na één ronde niet vond. Met de weeklimiet hoef je geen rekening te houden (eigenaar, 10 november middag): geen grens aan het aantal tegelijk. Raakt een sessie toch een harde limiet, dan meldt ze dat en gaat het werk verder op Opus.
- Kies op wat de taak raakt, niet op de omvang, en begin zo licht als kan. Opschalen gaat één stap (Haiku, Sonnet, Opus, Fable) en alleen met een reden uit "Opschalen en afschalen".
- De rolbestanden in `.claude/agents/` hebben het lichtste model dat voor die rol gewoon is. Geef bij een helper (`model`) en bij `create_session` altijd het model mee als de taak zwaarder is dan dat.
- Knip een onderwerp zo dat het zware deel klein is: de regel in de engine op Opus of Fable, het scherm, de tekst en de instelling eromheen op Sonnet.

## Bouwers melden zich zelf (9 november)

Elke bouwer die de coördinator met `create_session` start, krijgt als laatste regel van de opdracht: meld je als je klaar bent of vastloopt met `create_trigger` (claude-code-remote), `persistent_session_id` de sessie van de coördinator, `run_once_at` één à twee minuten vooruit, `initiation` `own_followup`, met in de prompt titel, sessie-id, wat live staat, de controles en vragen. De coördinator start dan meteen de volgende; een check elke twee uur is alleen nog een vangnet.

## Lessen van de nacht van 9 november

- Uitkomst tonen, niet alleen groene tests: een planner-bouwer sluit af met de echte weekindeling van zijn voorbeeld, per dag. Tests toetsten de regels, maar niet of de week verstandig was (beenkracht viel twee weken weg).
- Een sessie per één of twee rondes: een sessie die lang doorloopt wordt duur doordat de context groeit; een verse sessie per ronde is goedkoper.
- Elke bouwer merget main terug in de werkbranch en pusht die; anders loopt de werkbranch achter en botst alles bij de volgende start.
- Elke bouwer zet zelf naar main en meldt de commit; de coördinator controleert in de melding of dat echt gebeurde.
- Vragen aan de eigenaar in gewone woorden met een voorbeeld en het advies erbij, nooit in vaktaal (de vragen over lichaamsgewicht en de ijkset waren onduidelijk).
- Elke melding naar de eigenaar noemt wat hij zelf op zijn telefoon kan nakijken, want echte apparaten en echte netwerkaanroepen ziet geen helper.
- Voor een ronde die een akkoord van de eigenaar nodig heeft (zoals een stemgids) eerst dat akkoord vragen, dan pas de sessie starten.

## Afgeronde bouwers archiveren (eigenaar 9 november)

Komt de melding "Bouwer klaar" binnen en staat het werk op main, dan archiveert de coördinator die sessie meteen met `archive_session` (claude-code-remote). Een bouwer die vastliep of nog een vraag heeft blijft open tot dat is opgelost. Nooit archiveren: de vaste sessie van het bouwmoment en het onderhoud, en de sessie van de coördinator zelf.

## Bouwers zetten niet zelf naar main (9 november)

Bouwers bleven steeds vaker vlak voor main staan met de vraag om bevestiging, omdat ze de opdracht als doorgegeven zagen. Vanaf nu: een bouwer pusht alleen zijn eigen branch (met tests, review en afdrukken) en meldt zich; de coördinator merget, draait de controles en zet het naar main via de squash. In de opdracht staat dus geen squash naar main meer.
