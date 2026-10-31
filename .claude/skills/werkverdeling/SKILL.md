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

## Wat in elke opdracht staat

- Het doel en de controleerbare criteria, de bestanden als richtpunt, wat niet mag bewegen
  (`planGolden.test.ts`, scheduler, historie).
- Wat de helper oplevert: kort, Nederlands, per punt gedaan of waarom niet, de uitslag van de
  controles en wat niet gecontroleerd is.
- Tokens en duur weet een helper zelf niet: de coördinator haalt ze uit de melding na afloop
  (`subagent_tokens`, `duration_ms`) voor het logboek.

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
