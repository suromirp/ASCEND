# Tempo bij zone 2 op een vlak tempo, en de afstand op Vandaag

Datum: 8 november 2026

## Besluit
- `aerobicTrend` rekent met het vlakke tempo per km (`gapSecKm`) zodra een loop een passende run in detail heeft en meer dan 15 m per km stijgt, tot 30 m per km. Lopen die ook zonder dat meetellen houden hun echte tempo, zodat vensters vergelijkbaar blijven.
- Wijkt de stijging van het horloge meer dan 60 tot 140 procent af van ASCEND's eigen optelling (`gainAgreementPct`), dan telt de eigen optelling.
- De afstand op Vandaag rekent met het echte tempo van de laatste hoogstens 3 lopen van dezelfde training: laatste 90 dagen, minstens 3 km, 3 procent marge. Zonder die lopen blijft het testtempo gelden.

## Eigen keuzes van de bouwer
De grens van 30 m per km, de marge 60 tot 140, en de getallen 3 lopen, 90 dagen, 3 km en 3 procent. Allemaal startwaarden, niets op planning.

## Terugdraaien
Zet `flat` in `aerobicTrend.ts` op undefined en laat `missionFacts` zonder `recentRunPace` rekenen.

## Open
De zin zegt "je laatste lopen" ook bij één loop; zonder testloop komt er geen afstand.
