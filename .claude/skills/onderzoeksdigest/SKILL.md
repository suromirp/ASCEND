---
name: onderzoeksdigest
description: Zoekt wekelijks nieuw onderzoek over bergtochten met rugzak, dalen, hardlopen tot 10 km, herstel en bivak, en zet het als voorstel in docs/onderzoek. Gebruik voor de wekelijkse digest of als de eigenaar om nieuw onderzoek vraagt.
---

# Onderzoeksdigest

Doel: wekelijks een korte, onderbouwde lijst met nieuw onderzoek dat de training of de GR5-voorbereiding kan verbeteren.

## Onderwerpen

- Dalen en beenvermoeidheid bij lopen met rugzak
- Hardlopen tot 10 km: opbouw en herstel
- Herstel en slaap bij meerdaagse inspanning
- Bivak, kamperen en belasting op meerdaagse tochten
- Dragen van gewicht en blessurepreventie

## Stappen

1. Lees eerst wat er al is: de bestanden in `docs/onderzoek/` en `docs/beslissingen/`. Herhaal niets dat er al staat.
2. Zoek met WebSearch en WebFetch naar nieuwe bronnen van de laatste maanden, bij voorkeur studies en overzichtsartikelen. Noem bij elke bron titel, jaar en link.
3. Beoordeel per bron kort: wat zegt het, hoe zeker is het, geldt het voor deze gebruiker, en wat zou er in de app kunnen veranderen.
4. Schrijf het resultaat naar `docs/onderzoek/Digest JJJJ-MM-DD.md` met bovenaan "Status: voorstel". Maximaal vijf bronnen, alleen wat de moeite waard is. Is er niets nieuws, schrijf dat dan in één regel en maak geen bestand aan.
5. Werk op een branch `claude/onderzoeksdigest-JJJJ-MM-DD`. Het is alleen documentatie, dus controleer dat lint en tests groen blijven voor je naar main gaat.

## Regels

- Een digest verandert nooit zelf de engine of de planning. Een mogelijke regelwijziging staat als voorstel in de tekst; de uitwerking gaat later via een eigen taak en een besluit in `docs/beslissingen/`.
- Geen medisch advies.
- Geen persoonsgegevens.
- Menselijk Nederlands, geen tabellen, geen gedachtestreepjes (geen U+2013 en geen U+2014).

Sluit af met de bestandsnaam en een zin per bron.
