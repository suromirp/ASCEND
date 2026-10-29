# Een training in Forge is een sessie

Datum: 2026-10-29
Status: aangenomen

## Besluit

Een gestarte krachttraining in Forge blijft open tot Afronden of Verwijderen, zoals een workout in MacroFactor. Alles staat meteen in het concept (`WorkoutDraft`): rijen, verloop, klok en pauzes. Het overleeft sluiten van de app, herladen en een volgende dag. De klok is geen timer maar een rekensom: actieve tijd is nu min het begin min de som van de pauzes (`engine/forgeSession.ts`, `startedAt`, `pauses: { from, to? }[]`, een open pauze heeft geen `to`).

Zolang er een sessie loopt en het volle scherm niet open is, staat boven de tabbalk een pil met het pictogram kracht, de naam en de klok. Tik opent Forge op de sessie. Er loopt hoogstens één sessie.

## Reden

De klok begon opnieuw bij heropenen: een concept zonder afgevinkte set kreeg een nieuwe `startedAt` (de oude regel in `ForgeWorkout.tsx`: de klok loopt vanaf je eerste afgevinkte set). Wie de training opende, wegliep en terugkwam, begon dus weer bij nul. Ook ruimde een leeftijdsgrens van 36 uur het concept op, dus een training over een nacht heen ging verloren. Beide regels zijn weg: de sessie begint op het moment van starten en houdt dat.

## Hoe het werkt

- Menu van de training: Pauzeren of Verder, Kleiner maken (het scherm sluit, de sessie loopt door), Afronden en Training verwijderen. Verwijderen vraagt eerst in een blad: "De sets van deze training gaan weg. Je logboek verandert niet." met Annuleren en Verwijderen (rood). De terugknop links bovenin is Kleiner maken, geen verwijderen.
- In pauze staat de klok stil en staat onder de kop een rustige regel "Gepauzeerd" met Verder.
- Lange onderbreking: kom je terug en was je laatste handeling (een set afvinken, typen, verder na een pauze) langer geleden dan de drempel terwijl de klok liep, dan vraagt Forge eenmaal: "Je was 22 uur weg. Telt die tijd mee?" met "Nee, als pauze" (het advies: een pauze van de laatste handeling tot nu) en "Ja, telt mee". De drempel is de instelling "Lange onderbreking vragen na" (`AppSettings.forgeLongBreak`: uit, 30, 45 als advies, 60, 90 minuten; afwezig is 45).
- Afronden: de duur van de log is de actieve tijd. Een bestaande log wordt nooit herschreven.
- Een sessie per keer: start je een andere training terwijl er een loopt, dan vraagt een blad "Er loopt nog een training: Bovenlichaam A. Eerst afronden of verwijderen?" met "Naar de training" en "Annuleren".
- De wijzer naar de sessie is `ascend.forge.sessie` in localStorage (`utils/forgeSessionStore.ts`): sleutel van het concept, training en dag. Het concept blijft de enige bron voor de inhoud en de klok. Staat de training al in het logboek (afgerond op een ander scherm), dan ruimt de pil de restanten op.

## De tijd per set

Als je een set afvinkt, krijgt de rij in het concept een tijdstip (`WorkoutRow.doneAt`, epoch ms); afvinken ongedaan maken haalt het weer weg. Bij afronden gaat het mee op de log als optionele `SetLog.at` (ISO-tijd), alleen op nieuwe logs; een oude log zonder `at` leest zoals altijd. Een back-up wordt defensief gelezen (`storage/migrations.ts#migrateLogSetTimes`, in de keten van `backup.ts`): alleen een geldige ISO-tijd blijft, de rest valt weg zonder de set te raken. De lange onderbreking gebruikt het meteen: de laatste handeling is de laatst afgevinkte set of het laatste typen. Het verloop toont de tijd niet (geen dubbel). Echte rusttijd tussen sets kan hier later op volgen.

## Aanscherping na review

- Een sessie begint bij de eerste echte handeling (een set afvinken, typen in kg, herhalingen of RIR, Pauzeren, een set toevoegen of weghalen), niet bij openen. Tot dan is er geen concept, geen wijzer, geen pil en geen poort. De poort "Er loopt nog een training" geldt niet voor "Gedaan" vanuit Vandaag of Week (`startAtForm`) en niet voor alleen kijken.
- Een sessie die nergens meer bij hoort (de training of de geplande sessie bestaat niet meer, of de geplande sessie is al gelogd) telt niet mee en wordt opgeruimd (`engine/forgeSession.ts#sessionIsDead`, `useSessionHousekeeping`). "Alles verwijderen" en het terugzetten van een back-up dat de planning vervangt wissen de wijzer en alle concepten. Bij het opstarten gaan ook concepten weg van gelogde of verdwenen geplande sessies en van losse trainingen van een eerdere dag, behalve die van de lopende sessie (`draftsToPrune`). Afronden schrijft nooit een log met een niet-bestaand `plannedSessionId`; dan is het een losse training.
- Afronden begrenst het voorstel: boven 240 minuten actieve tijd staat de verwachte duur ingevuld en zegt een amber regel wat de klok zei (`finishDuration`).
- De pil leest alleen de wijzer en de klok (geen volledig concept per render) en meldt alleen bij een echte verandering. Een tweede sessie overschrijft de wijzer van de eerste nooit.

## De pil

Een langwerpige pil, gecentreerd, `max-w-md` binnen de marges, minstens 44 px hoog, kaart `--color-raised` met rand `--color-card-border`. Links het pictogram kracht en de naam (Marcellus, een woord), rechts de klok in Inter met vaste cijferbreedte (m:ss, onder het uur). Eén dun mint accent: een stip die zacht ademt zolang de klok loopt. Bij pauze staat de klok stil en gedempt, met een pauzeteken in plaats van de stip. De pagina krijgt onderaan extra ruimte, zodat de pil niets bedekt. Hij schuift in met `mx-pill-in` (260 ms ease-out). In Rustig en Uit en bij beperkte beweging ademt de stip niet; in Uit staat alles meteen op de eindstand. Op het openingsscherm staat hij niet. Toegankelijk als knop met als naam bijvoorbeeld "Training Bovenlichaam A, 23 minuten, loopt" of "gepauzeerd".

De ademende stip is een tweede uitzondering op "geen lus behalve de missiekaart", op verzoek van de eigenaar; hij draait alleen terwijl de pil in beeld is en de klok loopt.

## Alternatieven

Een aparte timer die doortelt in een achtergrondproces: een PWA kan dat niet betrouwbaar, en een rekensom over tijdstempels heeft het niet nodig. De pil als zwevende ronde knop: te klein voor naam en klok, en de klok is wat je wilt zien. De vraag bij een lange onderbreking altijd stellen: bij een uur rust tussen twee blokken is dat storend, daarom is de drempel instelbaar en kan hij uit.

## Bron

Een wens van de eigenaar, naar het voorbeeld van MacroFactor Workouts. Geen persoonsgegevens.

## Vervangt

Niets. De regel "terug laat de training staan; weggooien gaat via het menu" uit `2026-10-22-forge-workoutscherm.md` blijft waar; het menu heet nu Training verwijderen en de terugknop heet Kleiner maken.

## Terugdraaien

Zet "Lange onderbreking vragen na" op Uit om de vraag te laten. De opgeslagen vorm is optioneel en additief (`pauses`, `lastActionAt` in het concept, `forgeLongBreak` in de instellingen, de wijzer in localStorage), een concept van voor deze wijziging werkt gewoon, dus er is geen migratie. De pil weghalen is `SessionPill` uit `App.tsx` halen.
