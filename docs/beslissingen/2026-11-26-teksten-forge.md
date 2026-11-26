# Teksten van Forge volgens de stemgids

Datum: 2026-11-26
Status: aangenomen

## Besluit

Stap 3 van de stemgids is gedaan voor de Forge-tab (R10). Zinnen op het scherm met een puntkomma zijn twee zinnen geworden, met het droge feit eerst. De Forge-uitleg achter de i in Instellingen is ingekort, en de vier langste zoekregels van Forge zijn korter. Alleen woorden zijn veranderd: geen kleur, letter, indeling of werking.

## Wat er veranderde op het scherm

Negenentwintig zinnen in 12 bestanden. Voorbeelden, oud en nieuw:

- "Opslaan lukte niet. Je sets blijven bewaard; probeer het zo nog eens." is nu "Opslaan lukte niet. Je sets blijven bewaard. Probeer het zo nog eens." (en hetzelfde bij Opslaan duurt langer).
- "Opslaan lukte niet op tijd. Probeer het nog eens; je plan is niet veranderd." is nu "Opslaan lukte niet op tijd. Je plan is niet veranderd. Probeer het nog eens." Het feit dat telt eerst.
- "Je zit op 64 minuten. Wat nog komt is bijwerk; stoppen kan." is nu "... Wat nog komt is bijwerk. Stoppen kan."
- De titel "Training niet meer hier" is "Training is weg". De zin eronder: "Hij is elders afgerond of verwijderd. Wat bewaard is, staat in je logboek."
- "Deze oefening is te onbekend om iets met dezelfde spieren voor te stellen." is "Voor deze oefening kent Forge geen vervanger met dezelfde spieren."
- De redenen onder een oefening (`strengthModel.ts`): "om weer op dreef te komen" is weg (troost, geen feit), "maar de rekensom neemt per week hooguit 10% meer kracht" is "Forge rekent met hooguit 10% meer kracht per week", en de zinnen over een te grove stap, het zwaarste en het lichtste gewicht op een toestel en een gewicht dat je sportschool niet heeft zijn twee zinnen.
- "Nog te weinig data (5 van 6 sets)" is "Nog te weinig sets (5 van 6)", en "nog te weinig data" in het blok Hoe goed kent Forge je is "nog te weinig gegevens": de rest is Nederlands.
- Spieren voor de berg: "4 sets konden niet aan een oefening gekoppeld worden; die tellen hier niet mee." is "4 sets tellen hier niet mee: ze konden niet aan een oefening gekoppeld worden."
- Verder dezelfde puntkomma-regel in het blad Training verwijderen, het programma uit MacroFactor, de melding over sets uit een oudere import, de uitleg bij het spotterteken en het blad van een training die bleef liggen.

## Wat bleef, en waarom

- Knoppen en vaste woorden waren al goed: zinsletters, Liever niet, Niet nu, Annuleren, Begrepen, Akkoord. Er stond geen gedachtestreepje en geen RPG- of bodybuildingtoon in Forge.
- "tot het uiterste" blijft: het is gewoon Nederlands voor tot falen, en het staat als zoekwoord bij Zonder spotter.
- "alles volgens schema" blijft: het staat zo in het blad Verloop en in de keuze Vaker vragen.
- `state/logSave.ts` (Je invulling blijft bewaard; ...) en `LadderAddNotice.tsx` op Ascend zijn niet aangeraakt: die horen bij het logboek en bij Ascend, niet bij de Forge-tab.
- De uitleg per oefening (`data/exerciseGuides.ts`) en de ladders zijn inhoud, geen schermtekst van Forge, en zijn niet nagelopen.

## De uitleg in Instellingen

- Gemiddeld van 98 naar 77 woorden per onderwerp (heads meegeteld), samen van 5171 naar 4104 woorden. Elk onderwerp heeft nu hoogstens vier punten, de meeste drie; puntkomma's zijn weg.
- Ongeveer 40 woorden is geen harde grens (`2026-11-09-teksten-lichaam-en-instellingen.md`, punt 3). Langer bleven onderwerpen die een regel met getallen uitleggen (Forge rekent mee, Afvinken telt als het doel, Hoeveel over na een set, IJkset) en die met zorg: Zonder spotter (de klemzin blijft volledig) en Enkel en evenwicht (de studies en de fysiotherapeut blijven volledig).
- De licentie van de tekeningen (Workout Guide, Everkinetic en Bryl Lim, CC BY-SA 4.0, eigen tekeningen van ASCEND) blijft volledig.
- Wat wegviel is uitleg die het scherm zelf al geeft (een tik op het teken, de strook met kaartjes, het gedempte doel) of een herhaling van een ander punt. Er is geen nieuwe belofte bij gekomen.
- Zoekregels korter: Hoe goed kent Forge je, Stap voorstellen, IJkset en Spieren voor de berg. De uitzonderingen van de ijkset staan in de uitleg, niet meer in de zoekregel.

## Schermen die veranderen

Forge (de training: kop, Verloop, de bladen Training verwijderen, Ruilen, Programma uit MacroFactor, een training die bleef liggen of weg is, de regel onder de klok, de stapkaart, de redenen onder een oefening), het blok Hoe goed kent Forge je, de weekterugblik (Spieren voor de berg, de regel over sets zonder oefening) en de Forge-uitleg en het zoeken in Instellingen.

## Reden

De stemgids (`2026-11-09-stem-van-ascend.md`): het droge feit eerst, één gedachte per zin, uitleg achter de i rond 40 woorden. In R9 bleef Forge buiten de ronde omdat er toen een andere bouwer liep.

## Alternatieven

Hard afkappen op 40 woorden: dat haalt de regels met getallen en de zorgzinnen weg. De redenen onder een oefening herschrijven tot één korte zin: die zinnen leggen een getal uit en staan in tests vast; ze zijn alleen gesplitst en ontdaan van troost.

## Bron

`docs/beslissingen/2026-11-09-stem-van-ascend.md`, `docs/beslissingen/2026-11-09-teksten-lichaam-en-instellingen.md`, backlog R10.

## Vervangt

Niets.

## Terugdraaien

Zet `src/engine/settingsDefs/uitleg/forge.ts`, de vier zoekregels in `src/engine/settingsDefs/forge.ts` en de genoemde Forge-bestanden terug naar de commit voor deze ronde, en draai `npx vitest run -u src/engine/settingsFoto.test.ts`. Er is geen opgeslagen vorm, waarde of standaard veranderd.
