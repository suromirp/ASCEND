# Zonder sportschool beter: heuveltraining, duidelijker Hoeveel, 48 uur tussen krachtsessies

Datum: 2026-11-09
Status: aangenomen

## Besluit

Vier verbeteringen aan de periode Zonder sportschool (`engine/noGym.ts`), akkoord van de eigenaar op 9 november. Het blijft een voorstel met Akkoord.

1. Heuvels in de buurt aan: één loop per week van de periode wordt een echte heuveltraining, niet alleen een tip. Dat is Heuvelsprints en afdalen (`tpl_hills_descent`, de korte versie bij Licht) of de Rustige heuvelloop (`tpl_hill_easy`, nieuw sjabloon zonder vaste dag, geen sprints en geen afdalen in tempo). Sprints alleen als de week geen basisfase, afbouw of rustweek is, de week niet al heuvels, intervallen of een andere harde loop heeft, en er geen beenzware dag of lange duurloop op de dag ervoor, erna of dezelfde dag staat (48 uur). Anders de rustige heuvelloop. Staat er een klacht aan een knie of been op Matig of erger open (`legSpots.ts#legComplaintOpen`), dan altijd de rustige heuvelloop. Elke keuze krijgt één zin waarom in het voorstel. Staat er al een heuveltraining op een dag van de periode, dan blijft die de heuveltraining van die week (bij Licht de korte versie); er komt er geen tweede bij.
2. Hoeveel is duidelijker. Licht (het advies): twee keer lopen per week, korter en rustig, de harde loop wordt een rustige loop. Gewoon: je looptrainingen zoals gepland, alleen zonder sportschool, dus geen kortere versie en geen harde loop die rustig wordt. De uitleg staat in het blad (`LeavePeriods.tsx`) en in het voorstel (`leaveProposal.ts#explain`).
3. Trainingen vóór de periode blijven staan als ze passen. In het nagemaakte voorbeeld liet de planning Heuvelintervallen op vr 13 (vóór de periode) vervallen. Oorzaak: een voorstel draait de hele planningsronde, dus elke reparatie van de weekcontrole in dezelfde weken ging mee in het voorstel, ook die niets met de periode te maken had, onder de reden "door je periode". Op een weekindeling die de planning zelf al goed vindt raakt de periode niets vóór zijn eerste dag (getoetst op 376 indelingen, ook op de oude code); de verplaatsing kwam dus uit een indeling met een eigen bevinding. Een reparatie van de weekcontrole op een dag buiten de periode noemt nu zijn eigen reden (`REPAIR_REASON`) in plaats van "door je periode". Een terugzetroute is overwogen en weggelaten: Warden vond dat hij nooit loopt. De stap zelf zet nu geen Eigen gewicht, sprint of lange duurloop-conflict naast een training vóór de periode.
4. Nooit Eigen gewicht (of twee krachtsessies) op twee dagen na elkaar: minstens 48 uur ertussen, ook met een krachtsessie vóór of na de periode in de sportschool en ook met een andere Eigen gewicht in de periode. Past de dag niet, dan komt Eigen gewicht op de dichtstbijzijnde dag van de periode die wel past (niet op je rustdag); past geen enkele dag, dan vervalt de krachtsessie met de zin "Een sessie met je eigen gewicht past niet, want tussen twee krachtsessies zit minstens 48 uur."
5. Niets vervalt zonder zin waarom: elke verandering in dit voorstel heeft een reden, ook een verschoven of vervallen training buiten de periode.

## Eigen keuzes

- Heuvels in de buurt verandert nu de planning, dus een wijziging van die schakelaar is een voorstel met Akkoord en zit in de sleutel van de planning (`engine/leaveEdit.ts#leaveKey`, `leaveEditScope`). De losse notitie blijft meteen bewaard. Dit vervangt "Alleen Heuvels in de buurt anders is geen voorstel maar woorden" uit het werkbriefje.
- Een week van de periode zonder loop op een dag van de periode (alleen de lange duurloop, die nooit een heuveltraining wordt) krijgt er geen bij: ASCEND voegt geen loop toe.
- De klacht komt alleen mee bij het voorstel (`PlanPassContext.noGymLegComplaint`, gezet in `planLeave`). Wat Akkoord neerzette blijft staan; een klacht die later komt verandert de planning niet stil.
- Het nieuwe sjabloon wordt, zoals Eigen gewicht, bij bestaande gebruikers bijgezet door `databaseSeed` en heeft de heuvelwens voor OpenStreetMap (`nearbyTerrain.ts`).
- Een eerdere afspraak "Een harde loop die blijft wordt een rustige duurloop in de korte versie" geldt nu alleen bij Licht.

## Reden

Wens van de eigenaar (9 november): met Heuvels in de buurt aan stond er alleen een tip onder Blijft staan; Hoeveel Gewoon liet toch korter en rustiger lopen; twee Eigen gewichtsessies stonden op di 17 en wo 18 naast elkaar; een training vóór de periode verviel zonder uitleg.

## Alternatieven

- Een extra loop neerzetten in een week zonder loop: dat voegt training toe die je niet plande, en Gewoon belooft je looptrainingen zoals gepland.
- Het sjabloon van de rustige heuvelloop weglaten en de Rustige duurloop met een tip laten staan: dan is het weer alleen een tip.
- De klacht ook in de dagelijkse ronde meelezen: dan verandert een nieuwe klacht stil een geplande loop.

## Bron

`docs/beslissingen/2026-11-09-zonder-sportschool.md`, `docs/beslissingen/2026-11-09-heuvels-osm-zonder-sportschool.md`, `docs/beslissingen/2026-11-09-planner-rond-vakantie.md`.

## Vervangt

Niets. Het vult het besluit van 9 november aan en vervangt daarin: Gewoon maakt loopjes niet meer korter, en Heuvels in de buurt plant nu wel.

## Terugdraaien

Haal de aanroep van de heuvelstap en de 48-uurscontrole voor Eigen gewicht uit `applyNoGymDays`; de periode leest dan weer als voorheen. Er is niets opgeslagen dat terug moet: `tpl_hill_easy` mag blijven staan.
