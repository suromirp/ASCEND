# Ochtendkaart vernieuwd

Datum: 2026-10-31
Status: aangenomen

## Besluit

De ochtendkaart toont na je antwoord één regel met wat het voor vandaag doet (`engine/morningCard.ts#morningConsequence`, alleen tekst, plant niets) en klapt daarna in tot één rij met Wijzigen en Ongedaan maken. Het voorstel van de beenindex is een brede "Klopt: fris", de andere keuzes zijn pillen die nooit breken.

## Reden

Na de tik stond er alleen "Fris. Opgeslagen." zonder wat het met je dag deed, "Flinke spierpijn" brak in een rij van vier, en het voorstel was een kleine grijze regel. Ontwerp: `docs/visie/Ochtendkaart vernieuwd.md`.

## Alternatieven

De kaart open laten staan tot je erop tikt: dan blijft hij hangen. Gekozen is een timer van 6 seconden, 12 bij een voorstel, niet zolang een vinger op de kaart ligt, en een tik op de kaart klapt hem direct in. Wijzigen staat altijd binnen één tik. Een eigen instelling is er niet: het is gedrag, geen keuze voor je planning. De mint gloed bovenin de kaart uit het ontwerp is niet gebouwd: er staat al één mint accent op Vandaag (de missiekaart).

## Bron

`docs/visie/Ochtendkaart vernieuwd.md`, `docs/beslissingen/2026-10-23-ochtendkaart-en-melding.md`.

## Vervangt

Het stuk over de vorm van de kaart in `2026-10-23-ochtendkaart-en-melding.md`; de regels voor wanneer de kaart er staat blijven.

## Terugdraaien

Zet `MorningCard.tsx` terug op de versie van voor deze commit. `morningConsequence` en de `data-advice-ids` blijven onschadelijk.
