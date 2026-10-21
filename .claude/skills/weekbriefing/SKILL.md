---
name: weekbriefing
description: Maakt of ververst de maandagbriefing voor ASCEND als pagina (artifact) met wat af is, wat wacht en drie punten. Gebruik elke maandag, of als de eigenaar om de weekbriefing vraagt.
---

# Weekbriefing

Doel: elke maandag één pagina die de eigenaar op zijn Android-telefoon in een halve minuut leest.

## Stappen

1. Lees de besluiten van de laatste vier weken in `docs/beslissingen/` en de commits van de afgelopen week (`git log --since="7 days ago" --oneline`).
2. Haal open issues en pull requests op met de GitHub-gereedschappen. Noteer ook de laatste uitslag van de controles (lint, tests, build) als die te vinden is, en zeg het eerlijk als dat niet lukt.
3. Bepaal drie punten: wat deze week de aandacht verdient, gekozen op belang voor de missie (training, voortgang, de doelen). Geen opsomming van alles.
4. Maak de pagina met het Artifact-gereedschap. Laad vooraf de skill `artifact-design`. Werk bij een volgende week dezelfde pagina bij met de bestaande `url` in plaats van een nieuwe te maken.

## Inhoud van de pagina

- Titel met de week, bijvoorbeeld "Weekbriefing 26 oktober".
- Wat af is (kort, in gewone woorden).
- Wat wacht en op wie of wat.
- Drie punten voor de week, elk met één zin uitleg.
- Eén regel over de stand van de controles.

## Stijl

- Dezelfde ontwerptaal als de app: donker, houtskool en steen, brons en gedempt goud, rustig. Geen RPG-uitstraling.
- Menselijk Nederlands, geen tabellen, geen uitklapblokjes, geen gedachtestreepjes (geen U+2013 en geen U+2014).
- Getallen krijgen een korte uitleg.
- Nooit persoonsgegevens op de pagina (geen gewicht, hartslag, woonplaats of back-upinhoud).

Geef na afloop de link naar de pagina en de drie punten in drie korte zinnen.
