# Ochtendkaart compact bij een voorstel

Datum: 2026-11-02
Status: aangenomen

## Besluit

Heeft de ochtendkaart een voorstel van je beenindex, dan is de vraag één compacte kaart: het kopje "Hoe voelen je benen?" met het horlogepictogram, de horlogegetallen met hun woord, en één rij met "Klopt: fris" (of het voorstel) en een tweede knop. Die knop heet "Anders", en "Moe of anders" als de ochtendregel vraagt of je moe bent. Een tik erop klapt de volle vraag open, zoals die was: de vraag "Ben je moe?", de andere keuzes en "Energie, slaap of pijn invullen". Zonder voorstel blijft de volle vraag meteen staan. De logica van `morningRule` en `morningConsequence` en alle instellingen zijn ongewijzigd.

## Reden

Op 360 bij 640 px duwde de drukste ochtend (horloge, twee afwijkende woorden, "Ben je moe?", voorstel en vier keuzes) de missiekaart ruim onder de vouw, met de kaart zelf rond 470 px hoog. Nu is de kaart bij een voorstel ongeveer 160 px hoog en staat de titel van de missiekaart in beeld zonder scrollen. De tikdoelen blijven 44 px, er staat niets onder 12 px.

## Alternatieven

Alleen de vraag "Ben je moe?" verbergen: dat won te weinig. De horlogegetallen achter Anders zetten: dat haalt de reden van de kaart weg. Een kortere kaart door "Voorstel volgens je beenindex" te houden: kostte een regel van 20 px, en de bron staat nu in de volle vraag.

## Bron

`docs/beslissingen/2026-10-31-ochtendkaart-vernieuwd.md`, de backlog.

## Vervangt

Niets. Het stuk over de vorm van de vraag in `2026-10-31-ochtendkaart-vernieuwd.md` krijgt hierbij een compacte beginstand; het gevolg en de ingeklapte rij blijven.

## Terugdraaien

Haal het blok `if (compact)` en de staat `opened` uit `MorningCard.tsx`.
