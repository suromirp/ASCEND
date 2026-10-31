# Ochtendkaart vernieuwd

Ontwerpvoorstel van Cartographer. Alleen tekst; `src/` is niet aangeraakt. Bouwt voort op `docs/beslissingen/2026-10-23-ochtendkaart-en-melding.md`, `src/components/MorningCard.tsx`, `engine/morningCard.ts` en `useMorningPrefill.ts`. Bij akkoord volgt een eigen besluit in `docs/beslissingen/`.

## Wat er nu misgaat

De kaart is vlak en tekstueel. "Goedemorgen" staat als gewone vette tekst. "Flinke spierpijn" breekt op twee regels in een rij van vier. Het voorstel uit de beenindex staat als kleine grijze regel onder de keuzes, dus bevestigen kost een zoektocht. Na de tik verdwijnt de vraag en staat er alleen "Fris. Opgeslagen.", zonder wat het voor vandaag doet. De horlogeregel hangt los in het midden.

## De drie keuzes

Eerste: na het antwoord toont de kaart op dezelfde plek één regel met het gevolg voor vandaag, uit de bestaande engine, en klapt daarna rustig in. Tweede: het voorstel wordt een brede knop "Klopt: fris", de andere keuzes zijn kleinere pillen eronder, nooit meer een rij van vier gelijke vakjes die breken. Derde: een rustige ochtendtoets met alleen tokens: het zonsopgangpictogram van de tab, een eyebrow in de tabkleur en een zachte mint gloed bovenin de kaart. Geen nieuwe kleur, geen tweede gevulde mintknop.

## Opbouw van boven naar beneden, voor het antwoord

De kaart is een `Card` (niet `texture`: contourlijnen blijven van de missiekaart). Binnenruimte 16, tussen de blokken 16. Bovenin de kaart ligt een zachte gloed: een verloop van `--color-action` op 8% naar doorzichtig over de bovenste 64 px, via `color-mix` in een `style`, dus zonder nieuwe token. Het is geen lijn en geen rand; de kaart blijft dezelfde `Card`.

Rij 1, kop. Links het lijnpictogram `Icon name="vandaag"` (20 px, kleur `--color-page`) met `Eyebrow` "Goedemorgen" ernaast. Rechts, alleen als het horloge iets gaf, `Icon name="horloge"` (14 px) met "van je horloge" of "horloge en zelf" in `text-xs` en `--color-ink-dim`, zoals nu in `heading`.

Rij 2, de vraag. "Hoe voelen je benen?" in Marcellus (`font-display`), 20 px, `--color-ink`. Marcellus mag hier: het is een woordenkop. Geen cijfers erin.

Rij 3, de horlogegetallen, alleen als `stats.length > 0`. De bestaande `Stat` in maat `s` (20 px), maar drie naast elkaar met `divide-x` zoals nu, label erboven in 12 px, eenheid 14 px gedempt. Dit blijft één rij onder de vraag in plaats van tussen kop en vraag, zodat de volgorde is: wie ben ik, wat vraagt het, wat zegt het horloge, wat kies ik. Een regel met `tone: 'attention'` krijgt links van het label een kleine `StatusDot` in de waarschuwingskleur (Lookout en Warden controleren of `StatusDot` die toon al heeft; zo niet, dan weglaten en niet uitbreiden). Een woordoordeel naast het getal ("Goed", "Laag") laat ik weg: `WellnessLine` heeft alleen `note` en `short`, korte zinnen en geen enkel woord. Zie "Later".

Is er geen horloge, dan staat er in rij 3 niets, ook geen lege plek en geen uitleg. Alleen als het horloge gekoppeld is maar niets gaf, blijft de bestaande regel `line` (`text-xs`, gedempt) staan. De korte-nachtvraag (`ShortNightAsk`) en de regel "Geen slaap van je horloge vannacht" met "Opnieuw ophalen" staan direct onder rij 3, ongewijzigd in gedrag. "Opnieuw ophalen" wordt wel een `TextButton` (44 px, mint, zonder rand) in plaats van de losse knop met eigen rand.

Rij 4, het voorstel als één tik. Staat er een voorstel (`prefill.legs`), dan een volle breedte `SecondaryButton` van 48 px hoog met in het midden "Klopt: fris" (het woord uit `LEGS`, zinsletters, na de dubbele punt kleine letter), met `Icon name="check"` links. Eronder, 12 px, gedempt: "Voorstel volgens je beenindex" (uit `SOURCE_TEXT`). Dit is de enige mint omlijnde knop van de kaart die opvalt; de missiekaart houdt de gevulde.

Rij 5, de andere keuzes. Kleiner label "Of kies zelf" in `Eyebrow`-loze 12 px gedempte tekst. Eronder pillen van 44 px hoog (`rounded-full`, `min-h-[44px]`, `px-3.5`, rand `--color-control-border`, tekst `--color-ink`, 14 px, `whitespace-nowrap`) in een `flex flex-wrap gap-2`. Het voorstel zelf staat er niet meer tussen. Een label breekt nooit binnen een pil; past het niet op één regel, dan loopt de rij door op de volgende. De volgorde is vast: Fris, Wat stijf, Spierpijn, Flinke spierpijn, met het voorstel eruit gehaald.

Zonder voorstel (de beenindex weet niets) vervalt rij 4 en staat "Hoe voelen je benen?" boven alle vier de pillen in de vaste volgorde, zonder markering en zonder "Of kies zelf".

Rij 6, "Energie, slaap of pijn invullen" als `TextButton` in gedempte stijl, 44 px, links uitgelijnd, opent het blad zoals nu.

Verandering in gedrag: geen. Elke tik op een keuze of op "Klopt" roept `answer(legs)` aan zoals nu. Pijnplek: bestaat er een plek van de laatste 14 dagen (`recentPainSpot`), dan opent elke tik het blad met `initialLegs`, en onder rij 4 staat 12 px gedempt: "Eerst nog één vraag over je {plek}." (kleine letters, `spot.area.toLowerCase()`). Dat vervangt de verrassing van een blad dat opeens opengaat.

## Direct na het antwoord

De kaart springt niet en krimpt niet in één klap: de inhoud van rij 2 tot en met 6 wordt vervangen door het gevolg, op dezelfde plek, met kop (rij 1) ongewijzigd, zodat de pagina eronder niet verschuift. Hoogte: de kaart mag na de vervanging hoogstens 8 px afwijken van de hoogte ervoor; de uiteindelijke krimp komt pas bij het inklappen.

Opbouw: links `Icon name="check"` in `--color-progress` (met `mx-check-draw`, de bestaande tekenanimatie), ernaast in 16 px `--color-ink` het antwoord en wat het doet.

Regel 1, het antwoord: "Fris genoteerd." of "Wat stijf genoteerd." (woord uit `legsAnswerText`; bij "Gaat goed" uit het blad "Gaat goed genoteerd."; bij bovenlichaam "Spierpijn in je bovenlichaam genoteerd.").

Regel 2, het gevolg voor vandaag, 14 px, `--color-ink-dim`. Vier gevallen, uit één nieuwe functie (zie Engine):

Planning blijft, met een training vandaag en fris of normaal: "{Naam} blijft staan." Voorbeeld: "Testloop blijft staan."

Planning blijft, met een training vandaag en wat stijf of spierpijn zonder voorstel: "{Naam} blijft staan, warm rustig in." Voorbeeld: "Testloop blijft staan, warm rustig in." "Warm rustig in" geldt alleen waar de engine een lichte of stijve ochtend ziet; het is een tekstzin en verandert niets aan de planning.

Geen training vandaag: "Vandaag staat er niets gepland. Alles blijft zoals het is."

Er is een voorstel (een `Advice` uit `previewMorningAdvice`) of de kaart Benen (`previewLegCard`): "Voorstel: {titel van het advies}." Voorbeeld: "Voorstel: Benen A later." Daaronder, 12 px gedempt, de eerste zin van `effect`, bijvoorbeeld "Benen A van za 31 okt naar zo 1 nov.", gevolgd door de vaste zin "Niets verandert zonder jouw akkoord." Daaronder een `SecondaryButton` "Bekijk voorstel" (volle breedte, 44 px). De tik scrolt naar het adviesblok met `data-advice-id` gelijk aan `advice.id` en geeft het één `mx-pulse-once`. Is dat blok er niet meer (inmiddels beantwoord), dan gebeurt er niets en verdwijnt de knop bij de volgende render. Voor de kaart Benen zonder advies: "De kaart Benen staat klaar voor {naam}." met dezelfde knop.

Rechts onderin staat in elk van de gevallen een `TextButton` "Ongedaan maken" (44 px) zolang de kaart open staat. Hij zet de ochtend terug (zoals `undo` nu) en brengt de vraag terug in de stand "voor het antwoord".

Een tweede mint accent komt er niet bij: "Bekijk voorstel" is een gewone omlijnde knop, de enige gevulde mint knop van het scherm blijft de missiekaart.

## Inklappen

Bij een gevolg zonder voorstel klapt de kaart na 6 seconden in. Bij een voorstel na 12 seconden, en niet zolang je met een vinger op de kaart zit. Elke tik op de kaart (behalve de knoppen zelf) klapt direct in. Het inklappen is `max-height` en `opacity` over 250 ms ease-out naar de bestaande kleine stand.

De kleine stand is nu twee knoppen en een zin; dat wordt één `Card` met één rij: links `Icon name="check"` (mint, 20 px) en de zin "Benen fris. Testloop blijft staan." (14 px, `--color-ink`, afgebroken op `truncate` met de volle zin in `aria-label`), rechts twee `TextButton`s "Wijzigen" en "Ongedaan maken" (elk 44 px hoog; gestapeld naast elkaar op 390 px, op 360 px onder de zin op een eigen regel). Bij een openstaand voorstel staat in de kleine stand ook "Bekijk voorstel" als `TextButton`, tot het voorstel is beantwoord.

De kaart blijft zoals nu staan tot de middag of de eerste training, volgens `showMorningCard` en `useMorningCardVisible`. Daarna kent alleen "Gevoel" in "Je dag" nog het antwoord; dat is bestaand gedrag en blijft.

## Toestanden

Voor het antwoord, mét voorstel: rij 1 tot en met 6 zoals boven.

Voor het antwoord, zonder voorstel: geen rij 4 en geen "Of kies zelf"; vier pillen in een `flex-wrap`.

Voor het antwoord, mét pijnplek: de regel "Eerst nog één vraag over je {plek}."; tik opent het blad; na opslaan in het blad toont de kaart de stand "direct na" met het gevolg van het opgeslagen antwoord (het blad geeft het opgeslagen antwoord door, zie Engine en Bouw).

Voor het antwoord, zonder horloge: rij 3 ontbreekt, de kaart is korter, en er staat geen foutregel. Is het horloge gekoppeld maar zonder cijfers, dan de bestaande gedempte regel.

Laden: de vier pillen staan er meteen; de horlogegetallen komen als `reading` binnenkomt, met een vaste minimale hoogte voor rij 3 (48 px) als het horloge gekoppeld is (`linked`), zodat de knoppen niet verspringen. Het voorstel komt mee met `prefill` en wordt niet apart getoond tot het er is; tot dan staat er geen "Klopt". Dit voorkomt dat een knop onder je vinger van plek wisselt: de rij met pillen houdt zijn plaats.

Opslaan mislukt: `updateSettings` mag niet meer worden weggegooid met `void`. De tik wacht, en bij een fout (of na 8 seconden) staat de kaart weer in de vraagstand met onder rij 5: "Opslaan lukte niet. Probeer het nog eens." (12 px, `--color-warning`-tekst via `--color-danger-text` is niet nodig; amber is "let op"). Er is geen tweede knop; de vraag zelf is de herkansing.

Gevolg berekenen mislukt (de engine geeft een fout of niets): alleen regel 1, "Fris genoteerd.", geen regel 2, geen voorstelknop. Opslaan wordt nooit tegengehouden door het gevolg.

Direct na: zie boven. Ingeklapt: zie boven.

Beweging Normaal: de gloed staat er direct; het vervangen van de inhoud is een korte fade van 150 ms; het vinkje tekent met `mx-check-draw`; het inklappen duurt 250 ms; "Bekijk voorstel" geeft één `mx-pulse-once`. Beweging Rustig: fade 150 ms zonder verschuiving, vinkje direct getekend, inklappen 150 ms. Beweging Uit en `prefers-reduced-motion`: alles meteen op de eindstand, geen fade, geen puls, het scrollen naar het voorstel is een sprong. De timers (6 en 12 seconden) lopen in alle standen door, want ze zijn geen animatie. Een nieuwe `mx-*` regel is nodig voor het vervangen en inklappen; hij staat onderaan `src/index.css` en moet in `data-motion='calm'` en `'off'` hun eigen regel hebben, zoals de andere.

## Primitives en tokens

Bestaand hergebruikt: `Card`, `SecondaryButton`, `Eyebrow`, `Stat`, `StatusDot`, `Icon` (vandaag, horloge, check), `TextButton`, `ShortNightAsk`, `MorningCheckInSheet`. Tokens: `--color-page`, `--color-ink`, `--color-ink-dim`, `--color-action`, `--color-progress`, `--color-control-border`, `--color-card-border`, `--color-warning`. Geen nieuwe token, geen losse hex, geen nieuwe kleur. Typografie: Marcellus alleen voor de vraag; alle getallen in `Stat` (Inter, vaste cijferbreedte); niets onder 12 px.

Nieuw onderdeel, klein en lokaal: `MorningChoice` (de pil van 44 px, in `MorningCard.tsx`) omdat `ui.tsx` geen keuzepil heeft. Als er elders al een gelijke pil bestaat (bijvoorbeeld in `ChoiceRow` van het blad), pakt Sherpa die in plaats van een tweede te maken. Liever één gedeeld onderdeel dan twee die uit elkaar lopen.

## Maten op 360 en 390 px

De kaart heeft een binnenbreedte van 296 px op 360 en 326 px op 390 (paginarand 16, kaartpadding 16).

Rij 4, de hoofdknop: volle breedte, 48 px hoog, op beide breedtes. "Klopt: wat stijf" en "Klopt: flinke spierpijn" passen in 296 px op 14 px (naar schatting 150 px); is "Flinke spierpijn" nooit het voorstel, dan is de langste "Klopt: wat stijf".

Rij 5, de pillen: elk 44 px hoog, minstens 80 px breed, `gap-2` (8 px). De drie pillen samen (Wat stijf, Spierpijn, Flinke spierpijn) zijn naar schatting 310 px: op 360 px twee rijen (2 plus 1), op 390 px mogelijk één rij en anders ook twee. Beide zijn goed; beslissend is dat geen label binnen een pil breekt. Zonder voorstel (vier pillen): twee rijen op beide breedtes.

Rij 3, de getallen: drie kolommen van 98 px op 360 px, 108 px op 390 px; "Rusthart", "HRV", "Slaap" als labels van 12 px passen. Slaap "7:12 u" op 20 px is naar schatting 78 px breed en past.

Kleine stand: 44 px hoog plus kaartpadding op 390 px met de zin en twee knoppen op één rij. Op 360 px twee rijen (zin, dan de knoppen). Geen horizontale scroll op beide breedtes; de knoppen overlappen de zin niet.

Hoogte vraagstand met voorstel en horloge: ongeveer 310 px op 360 px. Dat is minder dan de huidige kaart plus de losse horlogeregel samen en laat de missiekaart nog deels in beeld op een scherm van 640 px hoog.

## Wat in `engine/` moet

Eén nieuwe pure functie in `engine/morningCard.ts` (geen React, geen IndexedDB), die de bestaande engine gebruikt en niets plant:

`morningConsequence(entry: MorningCheckIn, ctx: { inputs: AdviceInputs; answeredAdviceIds: ReadonlySet<string> }): MorningConsequence`

waar `MorningConsequence` is: `{ answer: string; line: string | undefined; detail: string | undefined; adviceId: string | undefined; kind: 'blijft' | 'rustdag' | 'voorstel' | 'kaart-benen' }`.

Binnenin, in deze volgorde:
1. `previewMorningAdvice({ ...inputs, checkIns: [...zonder vandaag, entry] })`, gefilterd op `!answeredAdviceIds.has(a.id)`, zoals `MorningCheckInSheet` al doet.
2. `previewLegCard(inputs)` voor de kaart Benen.
3. De training van vandaag uit `plannedSessions` en `templates`, zonder eigen regels: wat er al is volstaat.
4. `legsAnswerText(entry)` voor `answer`.

Teksten ("blijft staan", "warm rustig in", "Voorstel: ...") staan als constanten in dezelfde file, met een test per geval, zodat Lookout de letterlijke tekst kan toetsen.

De functie mag `describeMorningPreview` niet vervangen: het blad blijft zijn lange zin houden ("Op Vandaag verschijnt dan..."). De kaart gebruikt een kortere weergave van dezelfde data. Een kleine hulpfunctie `adviceLead(advice: Advice): string` haalt de eerste zin uit `effect`.

`morningCardView` en `statOf` blijven zoals ze zijn; er komt voor deze kaart geen oordeelswoord bij de getallen, want `engine/wellnessCheck.ts` levert dat niet als woord (`note` en `short` zijn korte zinnen).

Bouw (component, geen engine): `MorningCheckInSheet` krijgt `onSaved?: (entry: MorningCheckIn) => void`, zodat de kaart na het blad het gevolg kan tonen. De tik op een pil of "Klopt" bouwt `entry` en roept `morningConsequence` aan; de timers en de stand (`vraag`, `gevolg`, `klein`) staan in een `useReducer` in `MorningCard.tsx`, niet in de engine. Het scrollen naar het voorstel staat in een kleine hook naast `components/motion.ts`.

## Criteria voor Lookout

Op 360 en 390 px, met vertraagde processor:

1. Binnen twee seconden na openen staat de vraag en, als er een voorstel is, de knop "Klopt: {woord}" volledig in beeld boven de missiekaart; de missiekaart begint nog in beeld.
2. Eén tik op "Klopt: fris" slaat de ochtend op (te zien in "Gevoel" in "Je dag") zonder blad, tenzij er een pijnplek is.
3. Direct na de tik staat er één regel gevolg die klopt met de planning: bij een testloop vandaag en fris "Testloop blijft staan."; bij een voorstel in de adviezen "Voorstel: {titel}." met de knop "Bekijk voorstel". Die knop brengt de pagina naar dat voorstel zonder dat er iets wordt beantwoord.
4. De kaart verspringt bij het vervangen hoogstens 8 px; de pagina eronder blijft staan.
5. De kaart klapt na 6 seconden in (12 bij een voorstel) en toont dan één rij met het antwoord, "Wijzigen" en "Ongedaan maken". "Ongedaan maken" brengt de vraag terug en wist de ochtend.
6. Geen label breekt binnen een pil. "Flinke spierpijn" staat op één regel op beide breedtes.
7. Alle tikdoelen zijn minstens 44 bij 44 px; niets kleiner dan 12 px; geen horizontale scroll.
8. Zonder horloge: geen lege plek, geen foutregel, kaart korter. Met horloge maar zonder slaap: de regel "Geen slaap van je horloge vannacht" en "Opnieuw ophalen" met zichtbare uitkomst binnen 15 seconden.
9. Met een pijnplek: de regel "Eerst nog één vraag over je {plek}." staat er, elke tik opent het blad, en na opslaan toont de kaart het gevolg.
10. De korte-nachtvraag komt voor als de engine hem vraagt, en werkt als vroeger.
11. Beweging Rustig en Uit: de eindstand staat er, geen verschuiving, geen puls; met `prefers-reduced-motion: reduce` gelijk aan Uit.
12. Er staat op het scherm niet meer dan één gevulde mint knop (de missiekaart). De ochtendkaart heeft er geen.
13. Een mislukte opslag toont "Opslaan lukte niet. Probeer het nog eens." en laat de vraag staan.
14. Terugknop: een open blad sluit eerst, zoals nu (`useSheetClose`); de kaart zelf is geen laag.

## Wat ik bewust niet doe

Geen nieuwe planning en geen nieuwe adviesregel: het gevolg is wat `previewMorningAdvice` en `previewLegCard` al zeggen. Geen automatisch toepassen van een voorstel; "Bekijk voorstel" leidt alleen naar het bestaande voorstel met Akkoord. Geen tweede gevulde mintknop. Geen contourlijnen op de kaart (die zijn van de missiekaart). Geen uitklapblokje; "Energie, slaap of pijn invullen" blijft het blad. Geen uitroepen en geen gedachtestreepjes in de teksten. Geen punten, niveaus of "streaks" voor het invullen: dat is de RPG-hoek. Geen woordoordeel bij de horlogegetallen zolang de engine dat niet levert.

## Later

Een woordoordeel per horlogegetal ("Goed", "Laag") kan als `wellnessCheck.ts` per regel een `verdict` geeft, afgeleid van dezelfde vergelijking met het gemiddelde van vier weken als `tone`. Dat is een aparte kleine taak in de engine en een besluit over de woorden.

## Samenvatting

De kaart krijgt een ochtendtoets uit tokens (zonsopgangpictogram, eyebrow in de tabkleur, zachte mint gloed bovenin, de vraag in Marcellus). Het voorstel wordt een brede "Klopt: fris" met de andere keuzes als pillen eronder die nooit breken. Na het antwoord staat er één regel met het gevolg uit de bestaande engine, met "Bekijk voorstel" als er een voorstel is, en daarna klapt de kaart in tot één rij met "Wijzigen" en "Ongedaan maken". Pijnplek, "Energie, slaap of pijn invullen", de korte-nachtvraag en ongedaan maken blijven zoals ze zijn.

## Vraag voor de eigenaar

Mag het inklappen na 6 seconden (12 bij een voorstel), of wil je dat de kaart open blijft staan tot je er zelf op tikt? Mijn advies is de timer, omdat de kaart dan niet blijft hangen, met "Wijzigen" altijd binnen één tik.
