# Verschil R8: het Logboek en Run in detail

Elk verschil dat `npm run kaart:vergelijk` liet zien, met de reden. Regels van de stemgids: `docs/beslissingen/2026-11-09-stem-van-ascend.md`. De kaart gaf 2 gewijzigde regels voor Logboek en 12 voor Run in detail. De andere 19 schermen bleven gelijk. Geen schendingen van de invarianten.

## Logboek

- Legenda onder de maandkaart: "Gedaan, in de kleur van je sport" wordt "Gedaan: een stip in de kleur van je sport". Regel 5: de legenda zegt wat je ziet. De bijbehorende "Gepland" wordt "Gepland: omcirkeld", want in de kalender is gepland een ring. Die tweede staat niet op de kaart, omdat de nagemaakte maand geen geplande dag heeft.

## Run in detail

- Kop: "Hoe de run liep" wordt "Hoe de loop liep". Regel 5, en het open Inbox-punt: "loop" voor een training. De naam van het blad, Run in detail, blijft: dat is de naam van de functie.
- Oordeel bij een gelijke loop: "Je tempo bleef gelijk: de tweede helft wijkt minder dan 2 procent af van de eerste." wordt twee zinnen. Eén gedachte per zin. De uitleg van wat de 2 procent is blijft staan.
- Cadans: "Hij verandert weinig met je tempo; wat bij jou past hangt af ..." wordt twee zinnen. De uitleg dat 180 geen vaste norm is blijft, want die verklaart het getal.
- Wat opvalt: "Een gelijkmatige run." wordt "Een gelijkmatige loop."
- Vergelijking: "Tegen je eerdere runs" wordt "Tegen je eerdere lopen" en "er zijn nog geen vergelijkbare runs" wordt "vergelijkbare lopen". Dezelfde reden. Het woord komt ook in de zin "Vergeleken met je N laatste lopen" en in de grafieknoot, die de kaart niet toont.

## Buiten de kaart (zichtbaar zodra er een toestand is die de kaart niet laat zien)

- Logblad, uitzonderingen op "logs nooit herschrijven": de uitleg blijft, korter en in korte zinnen. "Niets terug te zetten. Je getallen staan al zo." in plaats van "Er was niets terug te zetten; ...". Time-outs: "Kijk zo of je getallen terug staan. Zo niet, probeer het nog eens." Geen puntkomma's meer, dezelfde inhoud. Het bevestigingsblad bij Mijn getallen terugzetten zegt "tellen dan niet meer voor deze training" in plaats van "worden dan niet meer gebruikt".
- Logblad, Verwijderen: "Deze training uit je logboek verwijderen? Dat kan niet terug." Regel 3: wat niet terug kan staat er vooraf bij.
- Inkorten: het blad zegt erbij dat je het in de training ongedaan maakt ("Je kunt het later in de training ongedaan maken", na review Warden). Regel 3 voor een uitzondering: wat er verandert en dat terugzetten bestaat. De zin "Zat er een stuk bij ..." wordt "Een stuk dat niet van jou is, zoals een autorit? Haal het weg." "Inkorten kan dan niet" wordt "Inkorten kan niet", want "dan" was onnodig. Fouten bij het ophalen van reeksen zijn in korte zinnen gezet.
- "In intervals.icu staat nu anders ... Neem je de cijfers over, dan vervalt de inkorting." is niet veranderd. Het is al een korte waarschuwing met wat er verandert.
- Details ophalen en de uitkomsten ervan: "Details van loopjes en tochten staan uit, dus ..." wordt "Details van lopen en tochten staan uit. Er zijn geen kilometers opgehaald." Geen telling, dus "lopen". "Voor kilometer na kilometer heb je de gegevens van je horloge nodig" wordt "Kilometer na kilometer komt van je horloge" (twee plekken). Mislukt en te lang: puntkomma wordt een punt, "Probeer het later nog eens." begint met een hoofdletter.
- Loopinzicht (blad Waarom en de regel na een training): "je laatste loopjes", "vergelijkbare loopjes" en "Eén loopje" worden "lopen" en "Eén loop", omdat het geen telling is. "Je laatste drie rustige loopjes" en "N lange loopjes" blijven: dat is een telling. "je eerdere runs van deze soort" wordt "je eerdere lopen van deze soort". Puntkomma's zijn zinnen geworden. "dus de moeite waard, maar de trend ... zegt meer" is drie korte zinnen.
- Trends (Stand, kaart Loopinzicht): zelfde regels. "Details van loopjes en tochten staan uit" wordt "Details van lopen en tochten staan uit". "Nog geen loopjes met loopvorm" wordt "geen lopen met loopvorm". "Je drift is ongeveer gelijk aan die van de loopjes ervoor" wordt "lopen ervoor". "3 loopjes lagen te ver van zone 2" wordt "3 lopen lagen ..." met enkelvoud erbij. De lange uitleg over de trend is in vijf korte zinnen gezet. Het zinnetje "Dat zijn feiten. Er is geen oordeel over dalen." blijft staan, want het verklaart de lijn over bergaf.
- Run in detail, uitleg: "hele run" wordt "hele loop" (Stijging, Tempo, de uitleg bij Verdeling), "deze run" wordt "deze loop" (hartslag, advies), "eerdere runs" wordt "eerdere lopen", "meerdere runs" wordt "meerdere lopen". Puntkomma's zijn zinnen geworden, ook bij wind, drift, grondcontact en het oordeel "vrij gelijkmatig". "harde loopjes" bij je begint vaak te snel wordt "harde lopen" ("3 van je laatste 5 harde lopen").
- Advies bij Run in detail: "Wil je iets aanpassen, dan gaat dat zoals altijd via een voorstel met Akkoord" wordt de vaste zin "Eerst een voorstel, pas na Akkoord verandert er iets."
- Wat speelde er (blad Hoe ASCEND rekent): "Nachten en loopjes die je niet liet meetellen" wordt "Nachten en lopen ...", en de uitleg is in kortere zinnen gezet.
- Zweetverlies: één time-outzin met puntkomma wordt twee zinnen.

## Open Inbox-punten

- "hele run" wordt "hele loop": gedaan in runDetailView.ts.
- "loopjes" alleen als telling: runTrends.ts, runInsight.ts, runDetailView.ts, InfluenceEffectSheet.tsx, dayOrder.ts ("Twee harde lopen op één dag", "Twee rustige lopen") en KoppelingenGroup.tsx (titel "Details van lopen"). RunTrendsCard.tsx had alleen een code-opmerking en AerobicTrendCard.tsx kwam al in R7 aan bod.
- De oude Akkoord-uitleg is de vaste zin in TrekGoals.tsx en KindAmountPage.tsx.

## Bewust niet aangeraakt

- `settingsHelp.ts` en `settingsIndex.ts` (R9). Daar staat nog "Details van loopjes" als titel; de rij in KoppelingenGroup heet nu "Details van lopen". Dat moet R9 gelijktrekken.
- Week-bestanden met "Twee harde loopjes" (`weekConcerns.ts`, `weekValidator.ts`) en `GarminLink.tsx`, `influence.ts`, `influenceEffects.ts`: buiten de scope. Wel dezelfde reden als hierboven.
- Koppelen achteraf (`MissedTrainingCard`, `MacroFactorLinkCard`) staat op Vandaag, niet in het Logboek.
- Forge, `weightTrend` en de Lichaam-tab.
