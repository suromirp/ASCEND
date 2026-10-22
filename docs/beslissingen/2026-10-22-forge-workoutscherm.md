# Forge: het workoutscherm volgt MacroFactor Workouts

Datum: 2026-10-22
Status: aangenomen

## Besluit

Een krachttraining opent een eigen workoutscherm (`src/components/forge/ForgeWorkout.tsx`, regels in `src/engine/forgeWorkout.ts`) met de opbouw en werking van MacroFactor Workouts, in de stijl van ASCEND. Per oefening staat een tabel altijd open, zonder knop om in te vullen: rijen voor opwarmsets (W, gedimd) en werksets, met de kolommen Set, Voorschrift (of Vorige, met een tik op de kop), kg, Reps, RIR en een afvinkvakje. Gewicht, herhalingen en RIR staan al ingevuld met het voorschrift; een set afvinken is één tik. Getallen zijn direct te bewerken, met een numeriek toetsenbord en de komma als decimaalteken.

Bovenaan staan de naam van de training (Marcellus), de verstreken tijd, de voortgang (werksets gedaan van het totaal) en één gouden knop, Afronden. Per oefening een menu met Ruilen (dezelfde hoofdspieren, met wat je sportschool heeft, alleen voor deze training), Notitie (blijft bij de oefening staan, bijvoorbeeld de stand van de stoel), set of opwarmset toevoegen, de laatste set weghalen en de rusttijd.

Het eigen sausje van ASCEND blijft klein: het voorschrift van Forge met de korte reden eronder ("Zelfde gewicht als vorige keer, probeer er één herhaling meer te halen"), op een beendag één regel met de beenindex of waarvan je benen moe zijn, en de stijl steen en contour.

## Hoe het werkt

- De rijen komen uit Forge (`prescribe`) als er geschiedenis is: de opwarmsets en de werksets met gewicht, bereik en RIR per set. Zonder geschiedenis, of met Kracht meerekenen uit, uit het sjabloon ("4 x 6-8", 2 over). Het aantal werksets is dat van het sjabloon.
- De rusttimer start vanzelf na een werkset en na de laatste opwarmset van een oefening, niet na de andere opwarmsets en niet na de allerlaatste set van de training. De duur is een schatting per oefening: een samengestelde oefening met een stang 3 minuten, een andere samengestelde oefening 2 minuten (2,5 bij 6 herhalingen of minder), isolatie 1,5 minuut, kuit, scheen, heup en romp 1 minuut. De balk onderaan is compact, met 15 seconden korter, 30 langer en Overslaan. Aan het eind een toon en trillen. De timer rekent met een eindtijd, dus hij klopt ook als de telefoon even uit stond.
- Tik je op het gewicht van een stang of een toestel met schijven, dan staat eronder welke schijven er per kant op gaan en wat er verandert ten opzichte van de set ervoor. Daarbij gaan schijven van buiten af en komen ze er buiten bij, en blijft een kant zwaar binnen: van 47,5 naar 45 kg gaat er per kant één 1,25 af, niet de hele kant opnieuw.
- Opslaan gebeurt bij Afronden, met `logSession`: alleen afgevinkte rijen, elk als `SetLog` met `kind` (warmup of work), kg, herhalingen en bij een werkset de RIR. Opwarmsets tellen dus nergens mee (`isWorkSet`). Bij een beentraining gaat de laagste RIR van de beensets mee als `strengthRir`, voor de beenindex. Daar komen de duur (de verstreken tijd), een RPE, het gevoel, pijn bij een beendag en een notitie bij.
- Wat je halverwege invult blijft bewaard: een concept in localStorage (niet sessionStorage, want een uur in de sportschool is lang genoeg om de app op de achtergrond te laten sluiten). Terug laat de training staan; weggooien gaat via het menu. Een concept ouder dan anderhalve dag vervalt.
- Met MacroFactor als bron (`strengthExternal`) is het dezelfde tabel zonder invulvelden: Set, Vorige, kg, Reps en RIR van het voorschrift, om in de sportschool mee te kijken, en de knop Afvinken. Op Vandaag opent de link Voorschrift dit scherm.
- De kleuren van het RIR-bolletje zijn die van de eigenaar: 0 en 1 rood, 2 oranje, 3 geel, 4 en meer steen (tokens `--color-rir-*`).

## Instellingen

Groep Training, onder Forge, kopje In de sportschool: Rusttimer vanzelf (aan), Signaal als de rust om is (geluid en trillen, alleen trillen, alleen geluid, niets) en Scherm aan tijdens je training (aan). De rusttijd per oefening en de notitie per oefening stel je in vanuit het workoutscherm. Alles staat in `AppSettings.strengthModel` (optioneel, additief, genormaliseerd in `normalizeStrengthSettings`), dus geen nieuwe back-upversie.

## Reden

De eigenaar over het vorige scherm (kaarten per oefening, "Sets invullen" en "Rusttimer" als links, "Klaar, invullen" onderaan): "Dit lijkt totaal niet op Workouts en is heel onhandig. Dan moet ik elke keer dat knopje klikken om in te vullen." Hij traint al maanden met MacroFactor Workouts en wil die opbouw, met een klein eigen sausje.

## Alternatieven

Eén oefening per scherm met een strook bovenaan, zoals MacroFactor: afgewezen voor nu, omdat de hele training onder elkaar het overzicht geeft dat de eigenaar vroeg en geen veegbeweging vraagt. De RIR alleen in de kolom Voorschrift: afgewezen, het bolletje is wat hij in MacroFactor kent en kijkt vooral naar het cijfer. Een volledige herberekening van de plaatbelading per set: afgewezen, want in de sportschool wil je zo weinig mogelijk schijven wisselen.

## Bron

Zijn 35 screenshots van MacroFactor Workouts (alleen bekeken, niet in de repo), zijn woorden op 22 oktober 2026, `docs/onderzoek/Kracht loggen en progressie.md` (hoofdstuk 7) en de besluiten `2026-10-22-forge-kracht-meerekenen.md`, `2026-10-22-forge-opwarmen.md` en `2026-10-22-kracht-per-set.md`.

## Vervangt

Niets. Het oude blad blijft voor alle andere trainingen; een krachttraining gaat nu naar dit scherm.

## Terugdraaien

In `src/components/ExerciseLogger.tsx` de regel weghalen die een krachttraining naar `ForgeWorkout` stuurt; het oude blad is er nog. De instellingen kunnen blijven staan.
