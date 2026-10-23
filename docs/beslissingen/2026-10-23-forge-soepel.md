# Forge soepel: een invoerpaneel in plaats van het toetsenbord, en beweging die klopt

Datum: 2026-10-23
Status: aangenomen

## Besluit

Het krachtscherm van Forge voelt nu als MacroFactor Workouts, niet alleen alsof. Een tik op kg of herhalingen opent een vast cijferblok onderaan (geen toetsenbord van het systeem, geen blad over de tabel). Bij een stang staat bovenin dat blok de stang met de schijven per kant. Afvinken, inklappen, de rusttimer en alle bladen bewegen op één veer van ongeveer 250 ms, en met "verminder beweging" aan wisselt alles direct van toestand.

## Wat er gebouwd is

- Invoerpaneel (`components/forge/InputDock.tsx`, regels in `engine/forgeInput.ts`). Cijfers 1 tot 9 in drie kolommen, onderaan komma, 0 en wissen. Rechterkolom van boven naar beneden: blok verbergen, schijven aan of uit, min en plus naast elkaar, en "Volgende". Min en plus gaan per stap van je sportschoolprofiel (twee keer de kleinste schijf bij een stang, je dumbbellrek, de stap van het toestel, of je eigen stap per oefening) en per 1 bij herhalingen. Het veld dat open staat heeft een lichte rand; het getal staat "geselecteerd", dus het eerste cijfer vervangt het. De tabel blijft zichtbaar en scrolt zo dat het veld net boven het paneel staat. "Volgende" gaat van kg naar herhalingen, naar kg van de volgende open set, ook in de volgende oefening, en sluit aan het eind.
- Schijvencalculator in het paneel (`PlateBar.tsx`). Een getekende stang van opzij, de zwaarste schijf binnen, een rustige kleur per gewicht uit tokens (`--color-plate-*` in `index.css`), een legenda ("1 × 15"), de regel "7,5 kg per kant + stang 20 kg = 35 kg" en wat er bij of af moet ten opzichte van de vorige set. Schijven die erbij komen schuiven aan, schijven die eraf gaan schuiven weg, de rest schuift op. Kan het gewicht niet precies, dan staat er "kan niet precies, dichtstbij 45", gedempt en niet in goud.
- Schijven zonder tikken: onder elke werkset van een stang of plaatmachine staat een kleine regel met een schijficoon, "per kant 15 + 2,5". Een tik erop opent het paneel. Aan of uit via de instelling "Schijven bij de set tonen".
- Afvinken: het vakje vult met een korte veer (0,9 naar 1), het vinkje tekent zichzelf, de rij kleurt vloeiend groen, en de focus schuift zacht naar de volgende open set (een zachte balk links, niet een kader). Is een oefening af, dan klapt hij in tot één regel met een vinkje en de zwaarste set, en het scherm gaat naar de volgende oefening. Een tik op die regel klapt hem weer uit. Het inklappen is een hoogte-animatie zonder meten (`grid-template-rows`).
- Rusttimer: de balk komt omhoog op de veer, de voortgang loopt als één beweging tot de eindtijd (Web Animations, de eindtijd is de bron), min 15 en plus 30 laten het getal schuiven, aan het eind pulseert hij één keer, en naar beneden vegen sluit hem. Staat het paneel open, dan zit de balk er direct boven.
- Overal: knoppen krijgen bij indrukken schaal 0,97 in 100 ms (globale regel in `index.css`), bladen van Forge openen op dezelfde veer, getallen staan in Inter met vaste cijferbreedte.
- Gedrag van MacroFactor dat we overnamen: een gewicht dat je bij een set aanpast gaat mee naar de volgende sets die je niet aanraakte; een tik op het voorschrift neemt kg, herhalingen en RIR over; lang drukken op een set opent het menu van die set (voorschrift overnemen, set kopiëren, set weghalen).

## Doorgeven van gewicht

Het verschil gaat mee, niet het getal: 2,5 kg erbij op set 1 is 2,5 kg erbij op de volgende onaangeraakte werksets. Een doorgegeven gewicht wordt altijd afgerond op wat je sportschool kan maken (stang met schijven, je dumbbellrek, de stap van het toestel), zoals het voorschrift ook doet. Wat je zelf intikt blijft zoals je het intikte. Een set die je afvinkte of zelf aanpaste doet niet mee, een opwarmset geeft niets door. De som wordt steeds vanaf het begin van het veld gerekend, dus 4 en dan 45 typen geeft hetzelfde als 45 in één keer. "Aangeraakt" staat alleen in het concept op het toestel (`WorkoutRow.edited`) en komt nooit in een log.

## Instellingen

Twee nieuwe keuzes, allebei standaard aan, met uitleg, in de zoeklijst, de indeling, de samenvatting (met test) en de Forge-groep: "Gewicht doorgeven aan volgende sets" (`carryWeights`) en "Schijven bij de set tonen" (`showPlates`). Beide zijn optionele velden in `StrengthSettings`, genormaliseerd bij het inlezen; een oude back-up leest als voorheen en er is geen migratie nodig.

## Wat we niet overnamen

- De strook met oefeningen als tegels, één oefening per scherm. ASCEND houdt alle oefeningen onder elkaar, zodat je ziet wat er nog komt.
- Foto's en video's per oefening, de doelspierkaarten en de geschatte duur vooraf. Dat is een ander besluit.
- De kleur van de "Volgende"-knop. MacroFactor gebruikt wit; wij ook, in sneeuwwit (`--color-snow`) en niet in goud: de ene gouden knop van dit scherm blijft Afronden bovenin.
- Een grote animatiebibliotheek. Alles is CSS en Web Animations; de bundel is niet gegroeid door een pakket.
- Het toetsenbord van het systeem als uitwijk. Het paneel is er altijd; het veld is geen tekstveld meer.

## Prestatie

Een klok die elke halve seconde de hele tabel opnieuw tekende was de echte oorzaak van "houterig". De klok zit nu in twee kleine onderdelen (verstreken tijd en rustbalk), de rusttimer gebruikt timers op de eindtijd, het concept wordt 300 ms na een verandering weggeschreven (en direct bij verlaten of naar de achtergrond gaan), en elke oefening tekent alleen opnieuw als hijzelf verandert. Gemeten met 4x vertraagde processor op een productiebouw (vijf runs, 360 en 390 px): afvinken reageert meestal in 60 tot 120 ms en een enkele keer tot 177 ms (de eerste tik, met de rustbalk erbij, is het zwaarst), het paneel staat er na 95 tot 195 ms, en er zijn enkele taken van 50 tot 150 ms tijdens animaties, bijna allemaal door het opmaken van de tabel. De doelstelling van 100 ms op een 4x trage processor is dus nog niet overal gehaald; op een gewone telefoon is het ruwweg een kwart daarvan. Op de ontwikkelserver is alles ongeveer drie keer zo traag, dat zegt niets over de echte app.

## Reden

De eigenaar zei dat het scherm er goed uitziet maar nog niet hetzelfde voelt: houterig, te weinig animatie, en de schijvencalculator was onvindbaar omdat hij alleen verscheen bij een tik in het kg-veld. Een eigen cijferblok met de stang erin, zichtbare schijven bij elke set en bewegingen op één veer lossen dat op.

## Alternatieven

- Het paneel als blad dat de tabel bedekt: de tabel verdwijnt dan, en je ziet de volgende set niet. Afgewezen.
- Een animatiebibliotheek voor de veer: te zwaar voor wat een `cubic-bezier` met een kleine overshoot doet. Afgewezen.
- Het gewicht doorgeven zonder afronden: gaf sets als "43 kg" op een stang die alleen stappen van 2,5 kan. Afgewezen.
- Het absolute getal doorgeven in plaats van het verschil: haalt de afdalende sets van het voorschrift weg. Afgewezen.

## Bron

Gesprek met de eigenaar over MacroFactor Workouts, zijn schermafbeeldingen daarvan (niet in de repo, de namen daarop ook niet), en `docs/beslissingen/2026-10-22-forge-workoutscherm.md`.

## Vervangt

Niets. Het vult `2026-10-22-forge-workoutscherm.md` aan: de tabel en de rusttimer blijven zoals daar vastgelegd, alleen de invoer en de beweging zijn anders.

## Terugdraaien

Zet "Schijven bij de set tonen" en "Gewicht doorgeven" uit voor het oude gedrag van de tabel. Wil je het paneel zelf weg, dan is `InputDock` het enige onderdeel dat de tabel vervangt: `ValueCell` in `parts.tsx` zou weer een invoerveld worden.
