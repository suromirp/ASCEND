# Rustdag deze week

Datum: 2026-11-02
Status: aangenomen

## Besluit

Staat er een training op je vaste rustdag, dan heet in Week de eerste vrije dag van die week "Rustdag deze week", met de reden eronder ("je rustdag op maandag is bezet"). Is er keus, dan liever een vrije dag die niet vlak voor een zware dag ligt. Het is alleen weergave: er verschuift niets en er wordt niets opgeslagen. Is er geen vrije dag over, dan blijft de bestaande melding "Deze week heeft geen rustdag." met een voorstel met Akkoord.

## Reden

De eigenaar deed zijn testloop op zijn vaste rustdag; de app telde een andere vrije dag stil als rust maar zei dat nergens. Met het label ziet hij in één oogopslag waar zijn rust deze week zit.

## Alternatieven

De rustdag automatisch verschuiven: niet gekozen, want dat verandert de planning en moet via een voorstel. Niets tonen: dat was de oude stand die verwarde.

## Bron

Gesprek met de eigenaar, 2 november. `engine/restDayThisWeek.ts`, `docs/architectuur/week.md`.

## Vervangt

Niets.

## Terugdraaien

`emptyDayText` zonder de extra gegevens aanroepen in `WeekPlanner.tsx`; dan toont Week weer "Vrij".
