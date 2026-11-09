# Rond een periode Zonder sportschool deelt de planner de weken ook opnieuw in

Datum: 2026-11-09
Status: aangenomen

## Besluit

De indeling rond een vakantie (`engine/leaveAround.ts`, besluiten van 9 november over de planner rond een vakantie, de lange duurloop en beenkracht) geldt ook rond een periode Zonder sportschool. De dagen van die periode houden wat `engine/noGym.ts` er neerzet (eigen gewicht, de loopjes, de rustige heuvelloop): die zijn een vast gegeven, de planner zet daar niets bij en haalt er niets weg. Wat vóór de eerste dag van zo'n periode staat blijft staan, want tot dan train je gewoon zoals gepland. De planner deelt alleen de rest van de week van de periode en de week erna opnieuw in, met dezelfde regels: 48 uur tussen beenzware dagen (ook voor het weekendblok van heuvels en lange duurloop), één lange duurloop per week, beenkracht voor een tweede keer heuvels, liever geen dubbele dag. Het blijft een voorstel met Akkoord; de instelling "Rond een vakantie schuiven" geldt ook hier.

## Reden

Melding van de eigenaar (9 november): in het voorstel voor zijn periode Zonder sportschool (za 14 tot wo 18 november) stonden in de week erna Heuvelsprints en afdalen op zaterdag en de Lange duurloop op zondag, twee beenzware dagen naast elkaar, wat hij eerder al een fout noemde. De indeling rond een vakantie gold alleen voor Vakantie zonder training. Nagemaakt voorbeeld in `storage/zonderSportschoolBeter.test.ts`: nu vr 20 Heuvelsprints, za 21 Bovenlichaam B, zo 22 Lange duurloop.

## Alternatieven

- Ook de week vóór de periode opnieuw indelen, zoals bij Vakantie zonder training: verschuift trainingen die je nog gewoon kunt doen. Afgewezen.
- Alleen een extra regel in de weekcontrole voor het weekendblok: blijft per week kijken en lost het niet op over de weekgrens.

## Vervangt

Niets; vult de besluiten van 9 november over de planner rond een vakantie aan.

## Terugdraaien

Zet "Rond een vakantie schuiven" op Weinig, of haal `no_gym` uit het filter in `planAroundLeave` en uit `leaveReshuffle` in `engine/leaveProposal.ts`.
