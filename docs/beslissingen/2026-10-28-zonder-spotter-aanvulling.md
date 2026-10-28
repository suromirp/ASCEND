# Zonder spotter bij raak: de sportschool en de datum van het log

Datum: 2026-10-28
Status: aangenomen

## Besluit

Dit vult `2026-10-28-zonder-spotter.md` aan en laat het besluit zelf staan. Bij raak telt de regel per log: de sportschool van dat log beslist of er veiligheidsarmen waren (de actieve sportschool alleen als terugval, bijvoorbeeld bij een log zonder sportschool), en de regel geldt alleen voor logs vanaf 2026-10-28, de dag dat Zonder spotter bestaat. Oudere trainingen zijn zonder dit voorschrift gedaan en tellen dus niet met terugwerkende kracht anders.

Jouw kant wordt altijd getoetst aan wat de planning vroeg (ook als je precies het voorstel volgde), de kant van ASCEND aan zijn eigen doel met de bewuste 1. Staat die 1 er, dan zet de controle (`RowCheck.didTarget`) het doel van jouw kant erbij, zodat een scherm per kant kan tonen waaraan is getoetst. Zonder verschil is er alleen `target`.

## Reden

Eerst las raak de huidige instellingen en de actieve sportschool, waardoor een oude training of een training in een andere sportschool anders kon tellen dan toen. Bij een training uit Forge die het voorstel volgde werd jouw kant bovendien aan het doel van ASCEND getoetst, terwijl het besluit zegt dat jouw kant aan de planning wordt getoetst.

## Hoe het werkt

`engine/spotter.ts#spotterAppliesOnLog` en `SPOTTER_SINCE`; `ResolvedStrengthSettings.profiles` is de lijst van sportscholen. `strengthHistory.ts#comparisonRows` roept het per log aan.

## Vervangt

Niets; vult `2026-10-28-zonder-spotter.md` aan.

## Terugdraaien

Zet `SPOTTER_SINCE` op een vroege datum. Opgeslagen sets zijn nooit veranderd.
