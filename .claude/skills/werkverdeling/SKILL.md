---
name: werkverdeling
description: Kiest voor elke taak in ASCEND welke helper, welk model en hoeveel denkwerk, en houdt het kostenlogboek bij. Gebruik voordat de coördinator een helper start, en na elke afgeronde taak voor het logboek.
---

# Werkverdeling: wie doet wat, op welk model

De coördinator kiest met deze tabel, niet op gevoel en niet met een aparte keuze-agent (die kost zelf
weer tokens). Start een helper altijd als zijn rol (`subagent_type`), nooit als `general-purpose`:
die erft het model van de coördinator en draait dan op Opus.

## De tabel

| Soort taak | Rol (`subagent_type`) | Model | Denkwerk |
|---|---|---|---|
| Een tekst, een label, een kleur, één regel | coördinator zelf | (eigen) | laag |
| Bouwen van een afgebakende wijziging | `ontwikkelaar` (Sherpa) | sonnet | medium |
| Bouwen dat planning, opslag of migraties raakt | `ontwikkelaar` (Sherpa) | opus | medium |
| Ontwerpvoorstel voor een scherm | `ontwerper` (Cartographer) | sonnet | medium |
| Idee naar issue met criteria | `productmanager` | sonnet | laag |
| Doorloop in Chromium (skill `lookout`) | `tester` (Lookout) | sonnet | laag |
| Review van UI, tekst of stijl | `reviewer` (Warden) | sonnet | medium |
| Review van engine, planning, opslag, migraties | `reviewer` (Warden) | opus | medium |
| Lastig onderzoek, formules in de engine | `sportwetenschapper` (Scout) | opus | medium |
| Iets zoeken in de code | `Explore` | haiku | laag |

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
3. **Eisen**: controleerbaar, als punten (wat de gebruiker ziet, welke tekst, welke maat op 360 en 390 px).
4. **Randgevallen, elk met een test**: kies uit de vaste lijst wat geldt: de dag zelf (vandaag telt nog niet als
   voorbij), een week- of maandgrens en middernacht in Europe/Amsterdam, een vakantie of tocht in de week, een rij
   die de gebruiker zelf vastzette, een test of wedstrijd, een fout halverwege (alles of niets, Ongedaan maken blijft),
   een koppeling die kapot of verlopen is, een oude back-up zonder het nieuwe veld (migratie of defensief lezen),
   Rustig en Uit bij Beweging. Noem welke niet gelden en waarom.
5. **Mag niet bewegen**: `planGolden.test.ts`, historie, de scheduler, en wat het briefje onder Nooit noemt.
6. **Instelling**: welke, met het advies als standaard, in settingsIndex, settingsLayout, settingsSummary en de groep.
7. **Opleveren**: kort, Nederlands, per eis gedaan of waarom niet; elke eigen keuze buiten de opdracht; de uitslag
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

## Bouwers melden zich zelf (9 november)

Elke bouwer die de coördinator met `create_session` start, krijgt als laatste regel van de opdracht: meld je als je klaar bent of vastloopt met `create_trigger` (claude-code-remote), `persistent_session_id` de sessie van de coördinator, `run_once_at` één à twee minuten vooruit, `initiation` `own_followup`, met in de prompt titel, sessie-id, wat live staat, de controles en vragen. De coördinator start dan meteen de volgende; een check elke twee uur is alleen nog een vangnet.
