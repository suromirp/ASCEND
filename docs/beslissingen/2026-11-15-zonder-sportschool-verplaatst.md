# Een sportschooltraining die in een periode zonder sportschool belandt

Datum: 2026-11-15
Status: aangenomen

## Besluit

Zonder sportschool vervalt wat de sportschool nodig heeft, of het wordt eigen gewicht. Dat geldt nu voor elke weg waarlangs een training naar een andere dag gaat, niet alleen voor de stap zonder sportschool zelf (`engine/noGym.ts`), die alleen omzet wat van het systeem is.

- Eén toets: `engine/noGymGuard.ts#needsGymOn` (een sportschooltraining, `isGymStrengthTemplate`, op een dag zonder sportschool; een vakantie of tocht gaat voor).
- Verplaatsen in het actieblad (Week en Vandaag): de voorgestelde dagen slaan zo'n dag over voor een sportschooltraining (`engine/moveSuggestions.ts#keptDayReason`, reden `nogym`). Een loop, een wandeling en Eigen gewicht mogen er gewoon heen.
- Slepen in Week en een datum kiezen in het actieblad: het mag, maar eerst komt de vraag met Akkoord, met de zin "Sportschool nodig, en je zit zonder sportschool." (`engine/weekDrag.ts`, dag `nogym` met de chip "Zonder sportschool"; `DecideOptions.extraAsk` voor de datumkiezer in Week en op Vandaag).
- Ruilen naar zo'n dag: dezelfde vraag (`engine/weekSwap.ts`).
- Een voorstel van ASCEND zet nooit een sportschooltraining op zo'n dag: een vangnet aan het eind van `computeAdvice` haalt zo'n keuze weg, en een voorstel zonder goede keuze komt niet (`engine/noGymGuard.ts#withoutGymOnNoGym`). Het inhalen keek al goed (`adviceShared.ts#awayOn`).
- Staat er toch een, door jou of door een voorstel vastgezet: Week zegt het in Let op, in amber, met "Sportschool nodig, en je zit zonder sportschool." als kop, "Bovenlichaam A staat op woensdag 18, in je periode zonder sportschool." als feit en "geen sportschool" op de rij (regel `NO-GYM`, alleen met `reportYours`; de planningsronde leest hem niet). Het voorstel erbij doet wat de periode zelf doet: eigen gewicht op die dag, of op een andere dag van de periode voor 48 uur tussen krachtsessies, of laten vervallen, met de zin van de stap zonder sportschool (`planNoGymFix`). Daarna, als die er is, een schone dag in de week buiten de periode. Alleen eigen gewicht hoort bij dit voorstel; een rustige heuvelloop die de periode verder zou neerzetten komt bij de volgende planningsronde, met zijn eigen zin. De training die vervalt houdt jouw slot en krijgt het merk van de periode; eigen gewicht komt zonder slot, zoals de periode het neerzet.
- Wat jij sleept blijft staan tot je Akkoord geeft op het voorstel; Liever niet laat het punt staan.

## Aanvulling na Warden (16 november)

- Haal je de periode weg, of maak je hem korter zodat de dag erbuiten valt, dan komt de training terug op jouw dag, met jouw slot en "verplaatst van" (`engine/leaveProposal.ts#putBack`, `engine/proposalEngine.ts`, het terughalen van een overgeslagen rij). Blijft de dag in de periode, dan blijft hij vervallen.
- Zonder sportschool vraagt alleen en komt daarom na elke reden die een dag dicht houdt of zelf vraagt (`keptDayReason`): een dag in je ziekte en je doeldag blijven dicht, ook in de periode. Op je rustdag in de periode vragen slepen en ruilen allebei: "Dit is je rustdag. Een rustdag is er om te herstellen. Sportschool nodig, en je zit zonder sportschool."
- "wordt eigen gewicht" staat er alleen als er echt eigen gewicht bij komt; met Kracht laten vervallen heet de keuze "laten vervallen".
- Valt in een voorstel van ASCEND de eerste keuze weg, dan volgt het effect de nieuwe eerste.
- Een datum kiezen op Vandaag vraagt dezelfde Akkoord als in Week (een test, wat een periode neerzette).
- De instelling Voorstel bij een probleem in de week is te vinden met "zonder sportschool".
- Het terughalen houdt jouw slot alleen als de training op dezelfde dag terugkomt; op een andere dag komt hij zonder slot.

## Aanvulling na Lookout (16 november)

- Een training die een periode verschoof of korter maakte, noemt bij slepen en ruilen de soort periode: "Deze training werd korter door je periode zonder sportschool." in plaats van "schoof opzij voor je vakantie" (`engine/weekDrag.ts#leaveAskReason`). Bij een vakantie blijft de zin zoals hij was.
- Staan er twee trainingen met dezelfde naam in de week, dan krijgt de andere zijn dag erbij: "valt dicht op Bovenlichaam A van donderdag 19". Lookout las het als dicht op zichzelf.
- De regel onder de vinger bij een ruil die eerst vraagt, is de dag, één feit en "Als je loslaat, komt eerst de vraag.". Sportschool nodig gaat voor afstand; de chip zegt al met wie je ruilt. Het blad na loslaten noemt alle feiten. Een ruil zonder vraag zegt zoals eerst met wie en waarheen (tweede ronde Lookout: op 360 waren het acht regels).
- "werd korter door je periode" alleen als de rij het merk shortened heeft en nu echt korter staat dan zijn volle lengte; anders "schoof opzij voor".
- Schuift een andere training door een verplaatsing naar je rustdag, dan zegt het blad het: "Bovenlichaam A gaat naar maandag 16, je rustdag." (`DecideOptions.restDay`).
- Laten vervallen staat er als eigen gewicht niet past (48 uur tussen krachtsessies) of als de periode kracht laat vallen; anders wordt het eigen gewicht. Lookout zag eigen gewicht omdat er in zijn stand ruimte was.

De stand van de eigenaar (de training staat er al): de rustigste weg is het punt in Let op met het voorstel, geen nieuwe kaart op Vandaag. Week opent, het amber punt staat er, één tik op het voorstel. Voor zijn week is dat "Geen sportschool: Bovenlichaam A vervalt. Een sessie met je eigen gewicht past niet, want tussen twee krachtsessies zit minstens 48 uur.": Eigen gewicht staat al op dinsdag 17.

## Reden

Melding van de eigenaar, zondag 15 november 22:00, met een schermafdruk van Week: periode Zonder sportschool za 14 t/m wo 18 november; ma 16 de lange duurloop doorgestreept (ziek gemeld, boven de nek), di 17 Eigen gewicht (goed), maar wo 18 "Bovenlichaam A · 50 min · verplaatst van ...", een sportschooltraining.

Nagespeeld met nagemaakte gegevens op de code van voor dit besluit (`5d68b87`), zondag 22:00 met de ziekmelding (de ziekte deed er niet toe): ziek melden haalt alleen weg en verplaatst niets. Het actieblad gaf bij Verplaatsen voor Bovenlichaam A en B als eerste dag "wo 18, Vrije dag" (zo en ma zijn ziek of rustdag, de andere dagen vol), slepen naar wo 18 was een vrije dag en ging meteen door, ruilen ook, en Let op zei niets. Zo'n verplaatsing krijgt jouw slot, en de stap zonder sportschool laat een vastgezette training staan (`lockLevel` 1).

De coördinator speelde het na met de echte back-up (alleen gelezen, niets in de repo): de rij op wo 18 heeft status `moved`, `movedFromDate` 2026-11-10, een slot van de gebruiker van 10 november 20:36 en geen merk van de periode. De periode bestond toen al. De eigenaar zette hem dus zelf op dinsdag 10 november van die dag naar wo 18 (het actieblad bood wo 18 aan, of slepen of een datum kiezen ging zonder vraag), en daarna zei niets het. Een periode die pas na zo'n vastzetting komt of langer wordt, laat hem net zo staan; ook dan meldt Let op hem nu.

## Alternatieven

- De stap zonder sportschool ook vastgezette trainingen laten omzetten. Niet gekozen: dan verandert de planning stil wat jij of een voorstel vastzette.
- Een kaart op Vandaag bij het openen. Niet gekozen: drukker dan nodig voor iets dat in de week hoort; Let op heeft al de vorm voor een punt met voorstel.
- Slepen naar zo'n dag helemaal blokkeren. Niet gekozen: de eigenaar mag het zelf zo willen (een hotel met een fitnessruimte); daarom een vraag en een waarschuwing.

## Bron

De eigenaar koos eerder (15 november, "Ja advies"): zonder sportschool vervalt alleen wat de sportschool nodig heeft, of het wordt eigen gewicht. Melding van 15 november 22:00 via de coördinator. Toetsen in `src/engine/zonderSportschoolVerplaatst.test.ts`.

## Vervangt

Niets. Vult `2026-11-09-zonder-sportschool.md` aan: "een krachttraining die vaststaat blijft staan" geldt voor de planning zelf; Week zegt het nu wel, met een voorstel.

## Terugdraaien

Haal de reden `nogym` uit `keptDayReason` (voorgestelde dagen, slepen, ruilen), `extraAsk` uit Week en Vandaag, het vangnet uit `computeAdvice` en de regel `NO-GYM` uit `weekValidator.ts`, `weekConcerns.ts` en `weekFixProposal.ts`. Er verandert geen opgeslagen vorm.
