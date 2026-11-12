# Een volle week na gemiste dagen: eerst vragen, met advies

Datum: 2026-11-12
Status: aangenomen

## Besluit

Valt er in je week een training weg en is de rest van de week daarna te vol, dan doet ASCEND één voorstel met een advies welke training vervalt, de reden in één zin en een tweede keuze (regel WEEK-FULL, `src/engine/fullWeek.ts`). Er vervalt nooit iets vanzelf. Na Liever niet blijft de volle week staan, vraagt ASCEND het die week niet meer en zegt Week in een gewone regel dat de week vol is. De extra training (`src/engine/extraRun.ts`) kijkt met dezelfde toets mee en komt er niet bij in een week die al iets verloor en er vol van wordt.

## De regel

Verlies: een training van deze week op een dag die voorbij is en niet gedaan (gemist of door jou overgeslagen), of een training die jij of een voorstel van een voorbije dag van deze week naar later zette terwijl die dag daarna leeg bleef. Gedaan is hetzelfde als in de andere adviezen (`adviceShared.ts#isDone`): een eigen log, of dezelfde training los gelogd binnen twee dagen. Geen verlies: een herstelwandeling, een ruil van twee dagen, wat ASCEND zelf wegliet of verving (Minder, zonder sportschool, een geaccepteerd voorstel dat een training liet vervallen), en een vakantie-, tocht- of ziektedag. Ben je ziek gemeld of net beter, dan zwijgt de regel.

Vol, gemeten van vandaag tot en met zondag, is één van deze vijf:

- twee of meer dagen met twee trainingen;
- twee of meer trainingen meer dan er dagen over zijn (een vakantiedag of een dag van een tocht is geen dag die over is);
- vier loopdagen op rij;
- drie zware dagen achter elkaar (een harde loop, een zware beendag of de lange training);
- meer trainingen dan dagen, terwijl de weekcontrole in die dagen iets vindt over drukte (TWO-HARD-RUNS, DAY-FULL, LEG-SPACING, HARD-DAYS uit `src/engine/weekValidator.ts`).

Een reeks dagen telt alleen als er nog minstens twee van komen; op de laatste dag van de week verandert een reeks niet meer.

Het advies kiest in deze volgorde, en alleen een training die de week ook rustiger maakt:

1. de extra training die je via een voorstel kreeg (de rol `extra` met het slot van een voorstel, niet van het raceblok) en een extra van Hoeveel per soort;
2. een rustige loop;
3. een andere training die niet zwaar is;
4. een harde loop of een zware beendag.

Nooit in het advies: een test, een wedstrijd, je sleuteltraining (`src/engine/keySession.ts`), een vaste afspraak, een wandeldag van een tocht, wat het raceblok voor je wedstrijd neerzette en wat je zelf neerzette, verplaatste of inhaalde. Wat een geaccepteerd voorstel neerzette, mag wel in het advies staan: dat kwam van ASCEND.

Vervallen is `status: 'skipped'` via het voorstel (`action: 'remove'`). De rij blijft staan, historie en logs blijven ongemoeid, en Ongedaan maken werkt zoals bij elk voorstel.

## Reden

Nagespeeld met een week waarin maandag en dinsdag wegvielen. Op woensdagochtend stelde de extra training een loop voor op vrijdag, omdat dinsdag (de dag die hij anders kiest) al voorbij was. Daarmee stonden er van donderdag tot en met zondag zes trainingen in vier dagen, met twee dubbele dagen en vier loopdagen op rij. De weekcontrole vond niets: elke regel afzonderlijk klopte. Twee gaten dus. De extra training keek alleen naar de weken ervoor en niet naar wat de week zelf al verloor, en geen regel zag de rest van de week als geheel.

De extra training kijkt nu mee omdat hij de oorzaak was: hij wordt verdiend met goede weken, maar een week die net een dag verloor en waar de loop alleen nog naast de overige trainingen past, is geen week om te groeien. De vraag achteraf is het vangnet voor alles wat er verder vol van wordt (een periode zonder sportschool, een eigen verplaatsing).

De eigenaar koos op 11 november voor "alleen laten vallen na vragen, met advies". Daarom is het een voorstel en geen reparatie in de planningsronde.

## Eigen keuzes van de bouwer

- De grenzen (twee dubbele dagen, vier loopdagen, drie zware dagen) zijn een eigen vertaling van de melding, geen onderzoek. De gewone week met een extra loop op dinsdag haalt ze niet.
- Zijn alleen jouw eigen trainingen over, dan komt er geen voorstel maar een zin met Begrepen, met als tip de lichtste van jouw trainingen. ASCEND raakt wat van jou is dan ook niet met Akkoord aan; overslaan doe je zelf in Week.
- De sleuteltraining staat nooit in het advies, ook niet als laatste keuze.
- Het voorstel wijkt voor elk ander open voorstel uit `computeAdvice` dat iets in deze week verandert (inhalen, weer, ochtend). Het advies van de planner, de golven, de bergspieren en de weekoplossingen in Week ziet het niet. Eerst dat antwoord, daarna de vraag over wat er dan staat. De afdaalklok zet geen trapsessie in een week waar deze vraag ligt.
- Staat de instelling uit, dan vraagt ASCEND niets en zegt Week alleen de regel. Het probleem verbergen doet de instelling niet.
- De toets bij de extra training staat altijd aan en hangt niet aan de instelling: het is geen keuze maar een grens aan een eigen voorstel van ASCEND.
- De regel kijkt alleen naar de week van vandaag en telt reeksen binnen die week. Een reeks die over de weekgrens doorloopt, ziet hij niet.
- De trapsessie van de afdaalklok is geen extra in de zin van trede 1: voor een tocht dient ze het doel. Ze telt in het advies als een gewone training, na de extra.
- In het blad staan het advies en de reden in de tip onder de wijziging; daar toont het blad ze (`CoachCard.tsx`).
- Bekende grenzen, uit de zelfreview: de drempels zijn absoluut, dus een plan dat al zo vol gepland is (Meer per soort, vier loopdagen in een loopplan) krijgt de vraag na elke gemiste training opnieuw. De toets bij de extra training kent je tijd per dag niet, dus de regel DAY-FULL kan daar anders uitvallen dan in het voorstel. Komt de extra loop zonder verlies op vrijdag en mis je daarna een dag, dan vraagt ASCEND hem terug.
- Na Akkoord vraagt ASCEND het die week niet nog eens, ook als de week daarna nog vol is. Het voorstel zegt dat vooraf ("Ook daarna is je week vol") en Week houdt de regel.

## Instelling

"Vragen als je week te vol wordt", standaard aan (`fullWeekAsk`), bij Planning.

## Alternatieven

De planningsronde de minst belangrijke training zelf laten weghalen: sneller, maar de eigenaar wil het eerst gevraagd krijgen. Een nieuwe regel in de weekcontrole met een eigen reparatie: dan komt de vraag als melding in Week in plaats van als voorstel op Vandaag, en de weekcontrole repareert wat van het systeem is zonder te vragen. Alleen de extra training tegenhouden: lost de gemelde week op, maar niet een week die op een andere manier volloopt.

## Bron

Melding van de eigenaar van 11 november (`docs/backlog.md`, Inbox) en het naspelen door de coördinator. De testweek in `src/engine/fullWeek.test.ts` is nagemaakt.

## Vervangt

Niets.

## Terugdraaien

Zet de instelling uit voor alleen de regel in Week. Helemaal terug: haal `fullWeekAdvice` uit `computeAdvice`, `fullWithExtra` uit `proposeExtraSession` en `plain` uit `WeekNotice`. Er is geen opgeslagen vorm veranderd behalve de instelling, dus er is geen migratie terug nodig.
