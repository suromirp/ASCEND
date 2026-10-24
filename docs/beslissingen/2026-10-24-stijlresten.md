# De laatste resten van de oude stijl weg

Datum: 2026-10-24
Status: aangenomen

## Besluit

Een kleine actie is geen onderstreepte tekstlink meer maar een `TextButton`
(mint, zinsletters, minstens 44 bij 44 px, geen onderstreping), of een
`SecondaryButton` waar de knop naast de hoofdknop staat. Alleen een bronlink naar
buiten blijft onderstreept, in de actiekleur. De componenten gebruiken de
nieuwe kleurnamen; de oude namen blijven als alias in `src/index.css`. Een
paar bestanden lazen er nog een toen dit werd gedaan (`App.tsx`, `SeasonOverview.tsx`,
`GarminGuide.tsx`, `Sources.tsx` en `data/phaseColors.ts`); die volgen met hun eigen werk.

## Reden

Na de overgang naar zee en berg stonden er nog ongeveer zestig kale
onderstreepte acties en ruim honderdzeventig plekken met een oude kleurnaam. Een kale
link oogt als een webpagina, niet als een app, en is een klein tikdoel. Goud en
brons waren inmiddels dezelfde kleur, dus een rang die eerst met die twee kleuren
werd getoond (niveau 3 en 4 van een training, "op koers" en "bijna op koers",
de soorten advies) was niet meer te zien.

## Alternatieven

De aliassen laten staan en alleen de uitkomst controleren: dan blijft de code
liegen over wat een kleur betekent. Een nieuw token per rang: te veel namen.
Eén nieuw token is er wel bij gekomen, `--color-sage` (salie, de nieuwe naam voor
`--color-alpine`), omdat salie in de fasebalk, bij "fris" en bij de soorten
training naast mint en ijs een eigen rol heeft en geen bestaand token dezelfde
kleur heeft (`--color-mountain-back` wordt 's nachts donker en is dan geen
tekstkleur).

De rangen zijn zo gekozen. De niveaus van een training (heel rustig tot hard)
lopen op de inspanningsschaal `--color-effort-1` tot `-4`, net als de zonebalk.
"Op koers" is mint, "bijna op koers" ijs, "achter" amber. Het advies "Gemist" is
amber, "Kan meer" en "Herstel" zijn ijs, "Kracht" en "Planning" mint. In de
keuze van een trainingsplek is de beste optie mint en een gelijkwaardige salie.
De Beenindex-balk heeft drie zones (mint, amber, oranje) met dezelfde grenzen als
het woord erboven, in plaats van een verloop dat tussen mint en amber bruin leest.

`--color-stone` is vervangen door `--color-ink-dim`: een tikje lichter dan
voorheen, voor stippen en gedempte tekst.

## Bron

Inventaris van Lookout (24 oktober 2026) en de beslissing
`2026-10-24-thema-zee-en-berg.md`.

## Vervangt

Niets. Vult `2026-10-24-thema-zee-en-berg.md` aan voor de componenten.

## Terugdraaien

De aliassen in `src/index.css` bestaan nog, dus een oude naam werkt direct
weer. `TextButton` staat in een eigen bestand (`src/components/TextButton.tsx`);
een knop terugzetten naar een link is een wijziging van één component.
