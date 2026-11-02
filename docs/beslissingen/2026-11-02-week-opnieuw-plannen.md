# Week opnieuw plannen

Datum: 2026-11-02
Status: aangenomen

## Besluit

Onder de week in Week staat "Week opnieuw plannen", alleen voor de getoonde week als die vandaag of later nog dagen heeft. Het zet de rest van die week, vandaag meegeteld als er nog niets gelogd is, terug naar hoe de planner hem uit het programma maakt voor iemand die niets verschoof, altijd als voorstel met Akkoord en met Ongedaan maken in de melding.

Wat blijft zoals het is: alles wat gelogd of voorbij is, een vaste afspraak van een sport, een race, wat een vakantie, vrije dagen of een tocht plaatste, verschoof of liet gaan, wat je zelf oversloeg, en wat op een dag staat waarop je ziek bent of nog opbouwt (zwaar pas weer vanaf de dag dat het mag). Een test die nog moet blijft in de week en neemt de plek van een harde loop in; hij gaat alleen naar een andere dag van de week als de week daar na de planningsronde minder problemen heeft. Wat je zelf verplaatste of vastzette (lockLevel 1) gaat in dit geval wel terug naar het plan, omdat je er zelf om vraagt; het voorstel zegt dat: "Ook wat je zelf verplaatste gaat terug naar het plan." Een training die een voorstel liet gaan (overgeslagen, niet door jou, niet gelogd) komt terug als hij in het plan van die week hoort.

Erbij, op verzoek van de eigenaar: verplaats je een testpoging die regel TEST-RETRY plaatste, dan komt wat dat voorstel alleen voor die test liet gaan ("Zodat je benen fris zijn voor de testloop.") in hetzelfde voorstel van de verplaatsing terug, als "weer op", met dezelfde Akkoord en dezelfde Ongedaan maken (`engine/testMoveRestore.ts`). Alleen als het niet botst met de test op zijn nieuwe dag: niet op de testdag, niet de dag erna, iets zwaars niet binnen twee dagen.

## Reden

De week van de eigenaar was door een reeks verplaatsingen en voorstellen scheef geraakt: twee lange duurlopen, zware dagen achter elkaar, een test vlak erna, en een rustige duurloop die overgeslagen bleef nadat de testpoging die zijn plek innam weer verhuisde. Losse correcties per training lossen dat niet in één keer op. Het plan zelf is al de beste week die ASCEND kan maken; het terugzetten daarnaar is de eenvoudigste en eerlijkste knop.

De stap gebruikt dezelfde planningsronde als de sync (`previewProgramHorizon`, `planPass`), zodat wat het voorstel laat zien is wat je krijgt en de sync na Akkoord niets meer verandert. Alleen de getoonde week wordt geschreven.

Het terugbrengen na een testverplaatsing zit in de verplaatsing zelf en niet in een eigen regel op Vandaag, omdat een test verplaatsen al altijd om Akkoord vraagt (`weekDrag.ts#decideMove`) en "Toch doen" dezelfde weg (`ScheduleChange.restore`) al heeft. Zo is het één beslissing met één Ongedaan maken, zonder tweede voorstel achteraf.

## Alternatieven

Een regel in de weekcontrole die alles van jou toch herstelt: nee, wat jij vastzette raakt de automatische planning nooit zonder dat je erom vraagt. De hele planning vanaf vandaag opnieuw: te groot, en het raakt weken die in orde zijn. Een eigen regel op Vandaag "X kan terug" na een testverplaatsing (zoals REST-BACK): een tweede voorstel voor één handeling, en tot je antwoordt staat de week scheef.

## Bron

Verzoek van de eigenaar in het gesprek ("Er moet ook een optie zijn om je week in 1x opnieuw te kunnen laten plannen als je het verpest hebt"), en de melding over de rustige duurloop na een testpoging.

## Vervangt

Niets.

## Terugdraaien

De knop weghalen uit `pages/Week.tsx` (`WeekReplanButton`) en de aanvulling in `state/moveActions.ts#moveSession` (de `restoresForTestMove`-regels). Opgeslagen vormen zijn niet veranderd; `RecentPlanChange.replan` leeft alleen in het geheugen.
