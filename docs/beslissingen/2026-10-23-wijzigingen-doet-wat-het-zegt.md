# Wijzigingen doet wat het zegt

Datum: 2026-10-23
Status: aangenomen

## Besluit

Elke wijziging die ASCEND uit zichzelf wil doen (een instelling, de
weekprescriptie) gaat langs één regel: `engine/changeImpact.ts#askBeforeApplying`.
Bij Altijd eerst vragen wacht alles op Akkoord. Bij Kleine wijzigingen
automatisch past ASCEND weken verder weg zelf aan, met een melding en ongedaan
maken, en vraagt het eerst zodra er iets vervalt of deze of volgende week
verandert. Bij Alles automatisch gebeurt het meteen, met een melding.

Wat bij Altijd eerst vragen nog wel vanzelf mag, is alleen dit:

- De weekcontrole zet wat het systeem zelf plande (lockLevel 3) meteen recht:
  de rustdag vrij, genoeg ruimte tussen zware dagen, niet te veel op een dag,
  frisse benen voor een test. Dat komt altijd in de melding Planning
  bijgewerkt, met ongedaan maken. Wat je zelf zette, een test of wedstrijd en
  historie raakt de weekcontrole nooit aan.
- Wat de planningssync in een opgeslagen training verandert omdat een
  instelling of doel op een andere manier dan met een voorstel is opgeslagen
  (oudere gegevens, een teruggezette back-up), staat in diezelfde melding.
- Nieuwe weken aan het eind van de planning (zonder doel loopt de planning
  door) komen erbij zonder vraag: dat verandert niets aan wat er al staat.

De tekst van Altijd eerst vragen en de uitleg achter de InfoButton zeggen dit
eerlijk.

## Reden

Warden Logica vond dat Kleine wijzigingen automatisch belooft dat schrappen
altijd eerst gevraagd wordt, terwijl de weekprescriptie zonder vragen schrapte,
en dat Altijd eerst vragen niet gold voor de sync en de weekcontrole.

## Alternatieven

- De herstellingen van de weekcontrole bij Altijd eerst vragen ook een voorstel
  maken. Afgewezen: de weekcontrole draait na elke wijziging en houdt regels
  vast die je lichaam beschermen (48 uur tussen zware beendagen, de rustdag).
  Zou elk herstel wachten, dan staat de planning tot je Akkoord geeft in strijd
  met die regels, en stapelen de vragen zich op. Een melding met ongedaan maken
  laat je wel de baas: wat je terugzet, krijgt jouw slot.

## Bron

Het rapport van Warden Logica (punt 3), `docs/onderzoek/Planning op een lijn.md`
over de weekcontrole.

## Vervangt

Niets.

## Terugdraaien

In `storage/weeklyPrescriptionStep.ts` weer alleen naar `always_ask` kijken en
de teksten in `engine/changeImpact.ts`, `src/data/settingsChoices.ts` en
`src/data/settingsHelp.ts` terugzetten.

## Aanvulling na de tweede review (23 oktober 2026)

"Doet wat het zegt" geldt ook voor de uitkomst van Akkoord. De app zegt alleen
"Er is niets aangepast" als dat waar is: gaat het toepassen van een doel- of
instellingsvoorstel mis, dan zet ASCEND eerst alles terug. Lukt dat niet, dan
staat in de melding wat wel veranderde, met ongedaan maken. Loopt het nog na
de grens van een minuut, dan zegt de app dat het nog bezig is en komt de
gewone melding zodra het klaar is.

Een coachpunt van de weekprescriptie dat je bij Altijd eerst vragen zelf
aannam, blijft van jou: ook een latere opstartstap maakt het niet weer van het
systeem (zie de aanvulling bij `2026-10-23-planning-nooit-stil.md`).

Terwijl Akkoord loopt, sluit het voorstelblad niet met de terugknop of een tik
ernaast; het sluit zodra er een uitkomst is.
