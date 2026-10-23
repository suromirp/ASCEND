# De standaardtrainingen worden bij de start bijgewerkt

Datum: 2026-10-23
Status: aangenomen

## Besluit

De ingebouwde krachttrainingen (Bovenlichaam A en B, Benen A en B) worden bij elke start gelijkgezet met het standaardprogramma (`storage/database.ts#ensureDefaultTemplates`). Krijgen ze andere oefeningen, zoals met `2026-10-23-oefeningnamen-zoals-macrofactor.md`, dan ziet iedereen zonder eigen ingelezen MacroFactor-programma die bij de volgende start, zonder voorstel. Een open training krijgt ze alleen voor oefeningen die je nog niet aanraakte (`engine/forgeInput.ts#mergeDraft`). Daarnaast speelt na de rust standaard het geluid Klokjes, en trilt de telefoon langer.

## Reden

De eigenaar vroeg om zijn echte oefeningen met de namen van MacroFactor, zodat Forge meteen een gewicht voorstelt, en om een passender geluid en voelbaar trillen. Dit is geen verandering van de planning (dagen en duur blijven), wel van wat er in een training staat. Het besluit `2026-10-23-oefeningnamen-zoals-macrofactor.md` zegt in "Terugdraaien" dat bestaande gebruikers hun eigen programma houden; dat klopt niet voor de ingebouwde trainingen, en dit besluit zegt hoe het wel gaat.

## Alternatieven

Een voorstel met Akkoord bij elke wijziging van het standaardprogramma. Niet nu: het programma uit MacroFactor inlezen is de weg om je eigen oefeningen vast te zetten, en die gaat al via een voorstel.

## Bron

Gesprek met de eigenaar over het Forge-workoutscherm; review van Warden.

## Gevolgen

Een oefening die op een plek een andere wordt, begint daar zonder "vorige keer" uit de ASCEND-logger; logs uit MacroFactor dragen hun eigen naam en worden gewoon herkend. De naam "30° Incline Barbell Bench Press" hoort nu bij Low Incline Barbell Press in plaats van bij de 45°-versie; logs met die naam staan in Forge dus op die lijn.

## Vervangt

Niets; het vult "Terugdraaien" van `2026-10-23-oefeningnamen-zoals-macrofactor.md` aan.

## Terugdraaien

De oude oefeningen terugzetten in `src/data/defaultProgram.ts`; ze verschijnen bij de volgende start weer.
