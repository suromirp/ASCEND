# Gewichten per toestel, per sportschool

Datum: 2026-10-26
Status: aangenomen

## Besluit

Je kunt de echte gewichten van een kabel of toestel met een gewichtstapel zelf invullen, per sportschool, en wat ASCEND leert over gebruikte gewichten is voortaan per sportschool. Een nieuwe krachtlog onthoudt in welke sportschool hij was.

## Reden

Een kabel heeft niet overal dezelfde gewichten (bijvoorbeeld 4,5, 9, 13,5 en 18 kg in Sportschool A, andere stappen in Sportschool B). Het leren uit wat je gebruikte (`learnedStack`) en de stap van het profiel konden een gewicht voorstellen dat er niet hangt, en wie in twee sportscholen traint, kreeg de gewichten van twee verschillende toestellen op één hoop. Een lijst die je zelf invult is de enige bron die niet kan misrekenen.

Wat is besloten, in volgorde:

1. De lijst staat in `GymProfile.exerciseWeightsKg` (per oefening, oplopend, 1 tot 40 gewichten van 0,25 tot 500 kg). Hij hoort dus bij het sportschoolprofiel. `candidatesFor` leest hem vooraan in `externalWeights`: voor een kabel of toestel zijn de mogelijke gewichten precies die lijst.
2. Dat geldt bij elke keuze van "Gewichten van toestellen", dus ook bij "Stappen van je profiel". Die keuze zegt hoe ASCEND rekent voor een toestel waarvan het de gewichten niet kent. Wie ze zelf opgaf, wil dat ze gelden; een tweede, strengere regel zou de lijst weer negeren. Zonder lijst blijft alles zoals het was. Een gewicht dat je ooit gebruikte maar niet in je lijst staat, telt dus niet meer mee voor de voorstellen van dat toestel; de lijst wissen geeft het oude gedrag terug.
3. `SessionLog.gymProfileId` is optioneel. Forge zet het bij het opslaan van een krachttraining op het actieve profiel; bij een MacroFactor-workout dat profiel waarvan de naam gelijk is aan wat achter " @ " aan het eind van de workoutnaam staat (hoofdletters tellen niet mee). Een bestaande log wordt nooit herschreven, ook niet de logs die al in MacroFactor zijn aangevuld.
4. `usedBefore` telt alleen de trainingen van het actieve profiel. Een training zonder het veld (van voor deze wijziging, of waar de sportschool niet bekend is) telt voor elk profiel: niet weten waar hij was is geen reden om alles te vergeten wat ASCEND van die toestellen leerde, en met één profiel verandert er niets. Alleen het leren van gewichten is per sportschool; de schatting van je kracht en de geschiedenis blijven over alle trainingen.
5. Wisselen van sportschool kon nog nergens. Daarom staat in de groep Forge, onder "Je sportschool", een rij "Sportschool" met een keuzeblad (de actieve kiezen, de naam veranderen, een sportschool toevoegen, hoogstens vijf). Een nieuwe sportschool begint met de stangen, schijven, dumbbells en stap van de actieve, zonder lijsten van toestellen. Namen zijn uniek, want de naam is ook hoe MacroFactor aan het profiel gekoppeld wordt.
6. In de training: past er na een te zware set geen enkel gewicht (zelfs het lichtste dat ASCEND kent haalt de onderkant van het bereik niet) en geeft "Lichter" dus geen voorstel, dan staat er bij een kabel of toestel één regel: "Geen gewicht van dit toestel past bij 9 tot 11 herhalingen. Gewichten van dit toestel invullen?", met "Invullen" en "Liever niet". "Invullen" opent een onderblad; na opslaan kijkt Forge meteen opnieuw of er nu een lichter gewicht past en toont dan het gewone voorstel "Lichter". Het invullen staat ook in het menu van een oefening ("Gewichten van dit toestel").
7. In de instellingen: de rij "Gewichten per toestel" (waarde: hoeveel toestellen een lijst hebben, voor de actieve sportschool) met een blad met de toestellen die een lijst hebben, om aan te passen of te wissen, en "Toestel toevoegen".

Er verandert niets stil aan de planning. De lijst wordt alleen gebruikt voor het gewicht dat Forge voorstelt, en een voorstel is al een voorstel.

## Opgeslagen vormen

`GymProfile.exerciseWeightsKg` en `SessionLog.gymProfileId` zijn allebei optioneel en additief. De back-up neemt ze mee zoals hij elk veld van een log en de instellingen meeneemt. Het schemanummer van de back-up verandert niet en er is geen aparte migratiestap nodig: een oude back-up heeft de velden niet en werkt zoals altijd. De lijst gaat bij het inlezen door `normalizeProfile` (zoals `exerciseStepKg`), die rommel weglaat. Een test zet beide velden in een back-up en terug.

## Alternatieven

De lijst per oefening zonder sportschool opslaan. Valt af: dezelfde kabel heeft in een andere sportschool andere gewichten, en de eigenaar traint in twee.

De lijst alleen laten gelden bij "Alleen wat je gebruikte" en "Geleerd". Valt af: "Stappen van je profiel" zou dan een lijst negeren die je zelf typte.

Logs zonder sportschool alleen laten tellen voor het eerste profiel. Valt af: de volgorde van de profielen is niet stabiel (het bewerkte profiel komt vooraan), en het zou de eerste keer dat je een tweede sportschool toevoegt in één klap alles wat geleerd is van de eerste afnemen.

De sportschool van een bestaande log nasturen uit de workoutnaam. Valt af: historie wordt niet herschreven.

Een eigen scherm voor sportscholen. Valt af: een rij met een keuzeblad past bij de rest van de instellingen.

## Bron

Een gesprek met de eigenaar op 26 oktober 2026 over de gewichten van kabels in twee sportscholen. Vult `2026-10-25-kracht-eigen-regels.md` ("Gewichten van toestellen") en `2026-10-25-bijsturen-in-forge.md` aan.

## Vervangt

Niets. "Gewichten van toestellen" blijft zoals besloten; de eigen lijst gaat erboven.

## Terugdraaien

Wis de lijst van een toestel (in het blad of in het menu van de oefening) en dat toestel rekent weer zoals je bij "Gewichten van toestellen" koos. De regel in de training staat los: `suggestOwnWeights` in `engine/forgeAdjust.ts` weghalen haalt hem weg. Het leren per sportschool zit in één regel van `usedBefore` in `engine/strengthModel.ts`.
