# Een import schrijft alleen wat nieuw of gewijzigd is

Datum: 2026-11-15
Status: aangenomen

## Besluit

Een import schrijft bij samenvoegen alleen rijen die nieuw zijn, of die de back-up verandert in een lijst die mag veranderen (blessures, doelen, schema's). Geschiedenis (logs, mijlpaalregels, voorstellen, krachtadviezen, reeksen, ochtenden) schrijft alleen een rij die de opslag op het moment van schrijven nog niet heeft, gekeken in dezelfde transactie. Wat met het toestel samenvloeit (de geschiedenislijsten in instellingen, het doel Vaardigheid, routes bij plekken) wordt in die transactie opnieuw samengevoegd met wat er dan staat. Een mijlpaal heeft één regel met een vast id per doel en mijlpaal. Alles wissen is één transactie over elke opslag.

## Reden

De import las het toestel voor het voorbeeld en schreef daarna die hele kopie terug. Wat je tussen voorbeeld en Akkoord deed (een log inkorten of ontkoppelen, een voorstel afsluiten, een weging) werd zo stil teruggedraaid, en dat botst met de regel dat historie nooit herschreven wordt. Twee schrijvers tegelijk konden een mijlpaal twee regels geven, en twee instellingen tegelijk konden elkaar wegschrijven. Wissen in losse stappen kon de helft laten staan, en `wipeAllData` vergat de kopieën van voor een import. Audit van 13 november, backlog I-38.

## Alternatieven

Een slot over de hele import (niets anders mag schrijven tijdens het voorbeeld): te grof, het voorbeeld kan lang openstaan en de horlogeronde moet doorgaan. Bij een verschil de back-up laten winnen: herschrijft historie. Bestaande dubbele mijlpaalregels opruimen: niet gedaan, regels zijn append-only; nieuwe dubbele komen er niet meer bij.

## Bron

`docs/onderzoek/Ponytail en Graphify.md` (de audit), `docs/backlog.md` I-38, `docs/werkbriefjes/historie-en-logs.md`.

## Vervangt

Niets. Een geschiedenis die in een oud plan op Vervangen stond, betekende al samenvoegen; dat blijft zo en overschrijft nooit een log.

## Terugdraaien

`writes` en `onlyNew` weglaten in `src/storage/backupApply.ts` geeft het oude gedrag terug (de hele lijst schrijven). De opgeslagen vorm is niet veranderd, dus er is geen migratie terug te draaien; regels met het vaste id zijn gewone regels.
