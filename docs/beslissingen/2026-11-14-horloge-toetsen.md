# Een horlogelog wordt getoetst aan duur en intensiteit

Datum: 2026-11-14
Status: aangenomen

## Besluit

Een activiteit van je horloge wordt getoetst voordat de app hem vanzelf afvinkt, aan een training koppelt of "zoals gepland" noemt (`src/engine/activityFit.ts`). Drie toetsen: duur onder de helft van gepland is kort (de grens van `isShortTraining`), een loop van 10 min per km of trager is een wandeling, en bij een rustige training (gepland hoogstens zone 2) is een gemiddelde hartslag meer dan 5 slagen boven zone 2 hard; zonder hartslag telt het tempo (30 s per km sneller dan de snelle kant van je rustige tempo, niet op de loopband), zonder beide is er geen oordeel.

Wat er gebeurt:

- Vanzelf afvinken (`engine/autoTick.ts`): niet bij een loop in wandeltempo (vaste grens, ook met de instelling uit) en niet bij een harde loop voor een rustige training; te kort sloot `durationIsClose` al uit.
- Kaart Van je horloge (`engine/activityImport.ts`, `components/WatchActivityCard.tsx`): één regel in amber waarom hij niet zonder meer past (kort, hard, wandeltempo). Twee activiteiten die naar dezelfde training wijzen krijgen hem niet allebei: de duur in de buurt van gepland houdt hem, de andere zoekt verder of komt los met "Een andere activiteit van die dag past beter bij ...". Op een dag staat wat bij een training hoort eerst, niet de nieuwste.
- Met de instelling Soort van een loop toetsen (standaard aan, Koppelingen, Geavanceerd): een loop in wandeltempo wordt een wandeling (Andere training biedt de loop nog), een harde losse loop een tempoloop.
- Na afronden (`engine/coach.ts`): een log zonder geplande training zegt "Opgeslagen als extra training.", een harde loop bij een rustige training "Harder dan gepland: gemiddeld 172 bpm, zone 2 gaat tot 151.", een horlogelog (`variant: 'custom'`) toetst aan de hele training. De tekst voor Strava noemt een harde rustige loop "Duurloop", zonder zone 2. Na afronden en in de Strava-tekst oordeelt alleen de hartslag (zonder zones geen oordeel); het tempo als terugval geldt alleen op de kaart.
- Koppelkaart achteraf en het tellen van een open training (`engine/looseLog.ts#sameLinkKind`): geen loop of tocht van minder dan de helft van de training en geen log in wandeltempo voor een loop. Bij het tellen van een open training telt de geplande duur van die training, bij de koppelkaart (die de planner leest en hier niet is aangeraakt) de kortste versie van de template. Vaste grenzen, ook als de instelling uit staat: zonder voorstel verandert er niets. Kracht houdt zijn eigen lengte.

Er wordt geen log herschreven en de opslagvorm verandert niet; de instelling is een nieuw optioneel veld (`watchKindCheck`, ontbreken is aan).

## Reden

Profiel horloge van 14 november (punt O in de backlog): een loop van 12 min kreeg "zoals gepland", een harde loop heette rustig, een wandeling van 4 km werd de lange duurloop en bij twee activiteiten op één dag ging de nieuwste met de training weg.

## Alternatieven

- De grenzen instelbaar maken (wandeltempo 9 tot 12 min per km): meer keuze dan nodig, en de koppelkaart kan de instelling niet lezen zonder de planner aan te raken. Eén schakelaar voor het enige wat de app zelf kiest (de soort).
- Een harde loop de beendag laten verplaatsen: verandert de planning, dat mag alleen via een voorstel met Akkoord en hoort bij de planner, niet hier. De beenindex leest de tempoloop als hard via het template.

## Bron

`docs/profielen/2026-11-14-horloge.md` (branch `claude/profiel-horloge`), bevindingen 1 tot en met 5. Zones: `engine/heartRateZones.ts`.

## Vervangt

Niets.

## Terugdraaien

Instelling Soort van een loop toetsen uit zet de soortkeuze terug. De rest: `src/engine/activityFit.ts` en zijn aanroepen weghalen; er staat niets in de opslag dat terug moet.
