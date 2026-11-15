# Pathfinder: doorloop van proef/drie

Branch `proef/drie` (nacht plus Week telling, Afbreker randgevallen, Weekbudget bij kracht uit), 15 november. Gelezen: de besluiten, de tekstkaart (`docs/app-kaart/`, het diff tegen origin/main) en de code. Niet gedraaid en niet op een scherm gezien: wat hier staat komt uit code en kaart, op een nagemaakte stand. Er is geen kaartstand met kracht uit, dus daar heb ik alleen de code.

## Eerst het ongemakkelijke antwoord

Instellingen met kracht uit zegt nog op minstens vier plekken iets over krachttrainingen. De wijziging "Weekbudget bij kracht uit" haalt het uit het blad zelf, maar niet uit de rij ervoor, niet uit de zin onderaan het blad, en niet uit Ascend en Stand. Wie kracht uitzet en Doel en tochten opent, ziet nog "150 min, 2× kracht".

## Punt 1: Week, Vandaag, Je stand en de weekterugblik over gemist en vervallen

Uitslag: klopt, geen blokkade. Alles loopt nu door `isMissedSession` en `isAwayFor`: de kaart "Je hebt n training gemist", de rijen, de terugblik, Niet gedaan? op Vandaag en het inhaaladvies. De stand `week-zonder-sportschool` laat het zien: twee rijen gemist, de kaart zegt 2, de terugblik noemt dezelfde twee, de overgeslagen rij zegt overgeslagen en de vervallen rij vervallen. De invariant bewaakt dat nu.

Wat ik nagelopen heb en goed vind:
- Een overgeslagen training telt als gepland ("0 van 3") maar niet als gemist, overal.
- Je stand Ritme heeft geen eigen telling en leest de coach (`onCourse.ts`), die dezelfde `isAwayFor` kreeg.
- De rustiger instap en "Deze week nog een keer?" lezen een week zonder sportschool nog als weg. Dat is bewust beschreven en heeft een toets.

Later (backlog), mag:
- Op de stand `week-zonder-sportschool` staat onder de kaart "Je hebt 2 trainingen gemist. Zet de rest terug naar het plan", en de terugblik zegt bij dezelfde twee "Laat het los; dubbel doen helpt niet." Twee kaarten, twee richtingen: opnieuw plannen of loslaten. Was er al voor dit werk, maar het valt nu pas op omdat het getal klopt. Voorstel: de kaart noemt wat Vandaag al vraagt (Niet gedaan?), of de terugblikzin past zich aan als de kaart een aanbod doet.
- Een afgeronde training die je op een andere dag deed dan gepland telt in Week op de geplande dag (`logDay`), maar de beenindex en de 48-uursregel lezen de dag dat je hem deed. Dat is besloten en consistent, maar de rij in Week zegt nergens "gedaan vr 13". Wie zich afvraagt waarom zijn beendag op vrijdag telt, vindt geen regel. Voorstel: één regel in de rij of het blad, alleen als de dagen verschillen.

## Punt 2: de keuze van de dag bij Afronden

Uitslag: moment en inhoud kloppen, geen blokkade.

- De keuze verschijnt alleen als er meer dan één dag is (`finishDayChoices` geeft anders leeg). Alles op dezelfde dag: geen rij, geen vraag. Dat is het juiste moment.
- Het standaardantwoord is de dag van je laatste set, en de knoppen staan oud naar nieuw: "do 12 nov", "vr 13 nov", "vandaag". De geplande dag staat er altijd bij als hij niet in de toekomst ligt. De keuze is zichtbaar via rand en `aria-pressed`.
- Begrepen start de gekozen training en het blad zegt dat vooraf (`GoneNote` met `GONE_NEXT_TEXT`). Het pil-blad blijft staan als de training elders verdwijnt. Geen stille sluiting meer.

Later (backlog), mag:
- `FinishSheet.tsx` maakt de dagknoppen met eigen opmaak (`min-h-[44px] rounded-full border px-3`). Het handmatige logformulier gebruikt voor dezelfde rij de primitive `Chip` (`logForm/LogFormParts.tsx#DoneOnRow`). Twee uitvoeringen van "Gedaan op" breekt de regel "hergebruik de primitives". Voorstel: FinishSheet gebruikt `Chip`.
- Het handmatige formulier (`DoneOnRow`) biedt bij een geplande training van een voorbije dag nog alleen de geplande dag en vandaag. Dat is logisch zonder afgevinkte sets, maar dezelfde vraag heeft nu twee antwoorden op twee plekken. Alleen noteren, niet bouwen.
- De tekstkaart heeft geen scherm voor Afronden (zoek op "Gedaan op" levert niets). De dagkeuze is dus alleen met toetsen bewaakt, niet met de kaart. Voorstel: een stand `forge-afronden-gisteren`.

## Punt 3: Instellingen met kracht uit

Uitslag: niet af. De wijziging dekt het blad Weekbudget (stepper weg, adviesregel en uitleg zonder kracht, `engine/weekBudgetText.ts`). Wat nog kracht zegt met kracht uit:

Moet voor main (zelfde belofte, kleine ingreep, op de plek waar je het meteen ziet):
1. De rij "Weekbudget" in het blad Zonder doel (`engine/settingsSummary.ts` regel 801, case `bundel-zonder-doel`): "150 min, 2× kracht". De rij `weekbudget` een paar regels verder doet het wel goed ("Zonder kracht"). Dezelfde functie, twee uitkomsten voor dezelfde stand: een tegenspraak op één pagina. Voorstel: zelfde `strengthTrainingOn`-tak als bij `weekbudget`.
2. Onder in het blad Weekbudget (`WeekBudgetSheet.tsx` regel 94): "Dit is onder de richtlijn van 150 minuten en 2 keer kracht." `belowGuideline` rekent de krachtkeren nog mee. Met kracht uit en bijvoorbeeld Rustig aan (1 keer) staat die zin er altijd, over iets dat uit staat. Voorstel: bij kracht uit alleen de minuten toetsen en noemen, via `weekBudgetAdviceLine`-achtige tekst in `weekBudgetText.ts`.
3. De Je week-kaart op Ascend en Stand (`engine/yourWeek.ts` regels 167 en 171, getoond in `components/ascend/YourWeek.tsx`): "Kracht: 0 van 2 keer" en dezelfde richtlijnzin. De tekst in het Weekbudget-blad zegt zelf "De teller op de kaart volgt wel je keuze", maar met kracht uit blijft er een teller staan die nooit omhoog kan. Dat is het zichtbaarste rest: de kaart staat op Ascend, dat je elke dag opent. Voorstel: `yourWeek` krijgt `strengthOn` mee en laat `strengthLine` en het krachtdeel van `belowLine` weg. Is dit voor deze branch te groot, zeg dan eerlijk in het besluit dat de wijziging alleen Instellingen dekt, en zet dit als eerste in de backlog. De opdracht van deze branch is "nergens nog iets", dus mijn advies is mee.

Later (backlog):
4. De vaste notitie bij de rij Weekbudget (`engine/settingsDefs/doel.ts` regel 181: "Hoeveel minuten en hoeveel keer kracht een week vraagt ... Het advies is 150 minuten en 2 keer kracht") en de uitleg erachter (`settingsDefs/uitleg/doel.ts` regels 26 en 28). Ik heb niet gecontroleerd of een rijnotitie afhankelijk van een instelling kan zijn. Als dat een nieuw mechanisme vraagt, is het later; kan het al, dan hoort het bij punt 1.
5. De afwijkingenlijst (`engine/settingsDiff.ts` regel 184, `budgetText` in `weekBudget.ts`) geeft "n min, 2× kracht" bij een aangepast budget, ook met kracht uit. Zelfde oplossing als punt 1.
6. De tekstkaart heeft geen stand met kracht uit, daarom ving geen invariant dit. Voorstel: stand `instellingen-blad-bundel-zonder-doel-zonder-kracht` en een invariant: bij kracht uit komt "kracht" niet voor in de budgetschermen, de rij Zonder doel en de Je week-kaart.

## Wat ik niet kon zien

De schermen zelf (geen Lookout-screenshots), een stand met kracht uit, en het gedrag van Afronden over middernacht op een telefoon. De uitslag over Afronden leunt op `forgeSession.ts` en `FinishSheet.tsx`, niet op een doorloop.

## Samenvatting

Voor main: punt 3.1 en 3.2, en 3.3 tenzij de coördinator bewust kiest voor alleen Instellingen. Punt 1 en 2 mogen door. De rest naar de backlog onder "Samenhang".
