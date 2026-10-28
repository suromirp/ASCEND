# Forge logboek en spotter

Ontwerp van Sherpa, kort. Status: gebouwd, besluiten in `docs/beslissingen/2026-10-28-forge-logboek.md` en `2026-10-28-zonder-spotter.md`.

Aanleiding: MacroFactor heeft een Event Log in een training: je ziet per moment welke set van wat naar wat ging en waardoor. Dat maakt rustig te volgen wat de app deed, zonder dat het je tegenhoudt. En: tot het uiterste gaan met een stang op je borst, alleen in de sportschool, is gevaarlijk. Forge hoort dat te weten.

## A. Het verloop van een training

Wat het is. Een tijdlijn per training: tijdstip, oefening en set, "62,5 kg × 8 → 60 kg × 8" met de reserve als klein bolletje (hetzelfde `RirBubble` als in de tabel), en daaronder in één zin waardoor. Zes soorten:

- Forge stuurde bij: je koos Lichter.
- Doorgevoerd: je wijziging van een set ging naar de volgende sets (Wijzigingen doorvoeren).
- Je paste het zelf aan.
- Onder het bereik: een set kwam onder wat het voorschrift vroeg.
- Past niet: geen gewicht van het toestel past bij een set.
- Zonder spotter: minstens 1 over voorgeschreven.

Waar het staat. In de training een rustige knop in de regel met de klok en de voortgang (pictogram `verloop`, 44 bij 44 px). Een stip in mint als er iets nieuws is sinds je het voor het laatst opende. De stip telt wat Forge deed of zag, niet wat je zelf aanpaste, en nooit een melding die al is opgelost. Een tik opent een blad zoals alle bladen (`useSheetClose`, `ref={sheetRef}`, `SheetGrip`), nieuwste bovenaan.

Hoe het ontstaat. Niet bijgehouden door elke handeling apart, maar afgeleid: na elke verandering van de rijen vergelijkt `engine/forgeLog.ts#deriveChanges` de rijen van voor en na. De handeling die de verandering veroorzaakte zegt alleen waardoor (`ForgeCause`: eigen, bijgestuurd, of geen gebeurtenis). Afvinken, een nieuwe planning en ruilen zijn geen gebeurtenis. Een getal intypen is meerdere toetsen en blijft één regel: binnen een minuut telt een tweede wijziging van dezelfde set als dezelfde handeling, en terug naar het begin haalt de regel weg.

Bewaren. Naast het concept (`WorkoutDraft.log`, optioneel), en bij Opslaan op het nieuwe log (`SessionLog.forgeLog`, optioneel). Alleen toegevoegd bij het maken van het log, nooit op een bestaand log. Defensief gelezen (`cleanForgeLog`), mee in de back-up, geen schemanummer erbij. In het logblad staat een regel "Verloop van de training" die hetzelfde blad opent.

De les over meldingen. Een melding verdwijnt zodra hij is opgelost of zegt precies welke set nog niet past. "Past niet" noemt nu de set ("Set 3: geen gewicht van dit toestel past bij 8 tot 10 herhalingen") en verdwijnt zodra je die set zelf aanpast, afvinkt of weghaalt. In het blad staat zo'n melding als "Nog niet opgelost: set 3 past niet" in amber, of als "Opgelost" gedempt.

## B. Nooit tot falen zonder spotter

Wat het is. Bij een stangoefening waar falen gevaarlijk is (bankdrukken, schuin bankdrukken, squat met een stang) schrijft Forge minstens 1 herhaling in reserve voor, in het doel en in de hint. Een set tot het uiterste ("9+" met 0 over) wordt een gewone set met 1 over.

Waar het in de gegevens staat. Per oefening `Exercise.failureRisk` (alleen de stangoefeningen met een stang op je borst of schouders; toestellen, kabels en dumbbells niet). Per sportschool `GymProfile.spotterRack` ("Veiligheidsarmen"): dan mag het 0 zijn. En de instelling "Zonder spotter" (`noSpotter`, advies aan).

Hoe het eruitziet. Hoogstens één klein, rustig teken bij de eerste open set waar Forge ophoogde: een schild en "1 over, zonder spotter", in gedempte inkt. Een tik legt het uit in een blad met "Begrepen". Nooit een pop-up bij het begin, nooit blokkeren. Vul je zelf 0 in, dan wordt dat bewaard zoals je het deed en verdwijnt het teken.

Hoe het rekent. Het voorschrift gaat omhoog voordat het model rekent (`engine/spotter.ts#spotterSlot` in `planExercise`), dus gewicht, hint en bijsturen volgen vanzelf het doel van 1 over. Een ruil naar een andere oefening beslist opnieuw.

Raak. Het voorstel van ASCEND met die bewuste 1 waar de planning (MacroFactor) 0 voorschreef wordt aan zijn eigen doel getoetst en telt niet als misser. Wat jij deed blijft getoetst aan wat de planning vroeg. Zonder de instelling, of met veiligheidsarmen, verandert er niets.

## Wat niet gebouwd is

Een ingreep in de training met een pop-up of een blokkade. Een eigen lijst van oefeningen per gebruiker. Het verloop van trainingen die van MacroFactor komen.
