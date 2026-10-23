# Ochtendantwoord terugdraaien

Datum: 2026-10-24
Status: aangenomen

## Besluit

Na één tik op de ochtendkaart blijft de kaart klein staan met wat je koos ("Benen fris. Opgeslagen.") en twee knoppen: Wijzigen (opent het blad) en Ongedaan maken (haalt het antwoord van vandaag weg, de vraag komt terug). Later op de dag kan het via Gevoel in Je dag: het blad heeft dan "Antwoord van vanochtend wissen".

## Reden

De eigenaar wist niet hoe hij een ochtendkeuze terugdraait: na de tik verdween de kaart meteen.

## Alternatieven

Een melding onderin met Ongedaan maken. Die is voor wijzigingen aan de planning; dit is een antwoord, en de kaart zelf is de plek waar je het gaf.

## Bron

Gesprek met de eigenaar, 24 oktober.

## Vervangt

Vult `2026-10-24-ochtend-een-tik.md` aan.

## Terugdraaien

`markMorningAnswered` en de beantwoorde stand in `components/MorningCard.tsx` weghalen, en de wisknop in `components/MorningCheckInSheet.tsx`.
