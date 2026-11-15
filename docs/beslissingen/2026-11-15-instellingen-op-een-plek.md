# Instellingen op één plek, in acht groepsbestanden

Datum: 2026-11-15
Status: aangenomen

## Besluit

Elke instelling krijgt één verklaring in `src/engine/settingsDefs/<groep>.ts`, één bestand per groep van Instellingen (Planning, Doel en tochten, Forge, Lichaam, Vandaag en meldingen, Koppelingen, Gegevens en back-up, Gidsen en kennis), volgens `docs/visie/Ontwerp instellingen op een plek.md`. De index, de rijen, de plekken, de voorwaarden, de uitleg en de keuzes worden daaruit afgeleid; de oude exports houden hun naam en vorm. De uitleg achter de i staat apart in `src/engine/settingsDefs/uitleg/<groep>.ts` en laadt pas in Instellingen of bij een tik op de i.

## Reden

Een instelling stond op zeven plekken, en juist die bestanden gaven de meeste conflicten bij het samenvoegen. Eén bestand met alle instellingen zou zelf het nieuwe conflictbestand worden; met acht bestanden botsen twee bouwers alleen als ze in dezelfde groep op dezelfde plek werken. De uitleg staat apart omdat het register in de startlading zit: met de uitleg erin werd de start 18,7 kB groter dan vóór het verhuizen, zonder de uitleg 90 kB kleiner.

## Alternatieven

Eén bestand voor alle instellingen: afgeraden, zie boven. De verklaringen overtypen in plaats van genereren: een tikfout is bij bijna driehonderd instellingen bijna zeker. De uitleg in de verklaring laten: één plek per instelling, maar zo'n 110 kB tekst bij elke start die je zelden leest. De keuzes buiten de start houden: de samenvattingen en tientallen componenten lezen ze direct, dus dat kost meer dan het oplevert.

## Bron

Het ontwerp van Cartographer (`docs/visie/Ontwerp instellingen op een plek.md`), het Bouwrij-punt in `docs/backlog.md` (eigenaar 14 november: "Allebei") en de opdracht van de eigenaar van 14 november om ook de instellingen uit te voeren. Bewijs per stap: de foto `src/engine/__snapshots__/instellingen-foto.json` (inhoudelijk gelijk sinds stap 0) en de tekstkaart.

## Vervangt

Niets. De regel in `docs/beslissingen/2026-10-22-alles-instelbaar.md` dat een instelling in de index, de layout, de samenvatting en een groepspagina komt, geldt nu met de verklaring in plaats van index en layout.

## Terugdraaien

Elke stap is een eigen branch (`claude/instellingen-stap-<n>`). Een stap terugdraaien is die commit terugdraaien; de oude exports bestonden de hele tijd met dezelfde naam, dus geen aanroeper hoeft mee te veranderen.
