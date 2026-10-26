# De Ascend-tab wordt de plek van je doelen

Datum: 2026-10-26
Status: aangenomen

## Besluit

De Ascend-tab laat zien wat je wilt bereiken en hoe ver je staat. Hij volgt variant B uit `docs/visie/Ascend-tab als doelen.md`, de route, met de bladen voor de meters en voor het label uit variant A.

De opbouw van boven naar onder:

1. Op de lucht staat een tijdlijn van je seizoen, met een vlag per doel.
2. Daaronder staan je doelen in de volgorde die jij kiest door te slepen. Het eerste doel staat open, de andere zijn compacte rijen die uitklappen.
3. Onderaan staan "Doel toevoegen" en "Eerder, afgerond of weggelegd".

Elk doel toont:
- zijn label met één regel eronder;
- "Klaar voor je doel" als één percentage, met de zin waaruit het bestaat;
- de volgende stap;
- het aantal weken tot het doel.

Een doel toevoegen gaat in drie stappen: soort, een paar vragen, en dan een voorstel met Akkoord voor de planning. Zonder doel staat er één regel met de knop.

De labels zijn Top, Voortop en Verkenning, altijd met hun regel uitleg eronder:
- Top: hier train je naartoe.
- Voortop: wil je goed doen onderweg.
- Verkenning: doe je mee als training.

"Alleen volgen" bestaat niet meer. Een ladder met mijlpalen hoort alleen bij een trektocht.

Per sport kies je hoe ASCEND ermee omgaat, op het scherm Sporten: "Plan dit voor mij", "Vaste dag", "Telt mee als ik het doe" of "Negeren".

## Reden

De eigenaar wil de tab ombouwen tot de plek van doelen en missies, overzichtelijk en met een duidelijke werking. De tijdlijn laat in één beeld zien wat ASCEND onderscheidt: meerdere doelen in één plan, en hoeveel weken er tussen zit. De eigenaar koos B en vond het sportenscherm met een voorbeeld duidelijk, waar het in tekst onduidelijk bleef.

## Alternatieven

- **Variant A, de missielijst.** Het belangrijkste doel staat groot op de lucht, de andere als volle kaarten, het seizoen onderaan. Dit is helder, maar laat de samenhang tussen doelen minder goed zien.
- **De labelsets "Hoofddoel, Tussendoel, Als training" en "Alles erop, Fris starten, Meetrainen".** De eigenaar wilde labels die pakkender zijn en bij de stijl passen.

## Bron

- `docs/visie/Ascend-tab als doelen.md` met de mockups (buiten de repo).
- `docs/onderzoek/Meerdere doelen en prioriteit.md`.
- Een gesprek met de eigenaar op 26 oktober 2026.

## Vervangt

De indeling van de Ascend-tab rond de GR5 en `/ascend/doelen`. Wat van de huidige kaarten blijft, verhuist of verdwijnt, staat in deel 7 van het ontwerpvoorstel.

## Terugdraaien

De tab is een eigen pagina (`pages/Ascend.tsx`). De oude versie staat in de geschiedenis en kan terug zonder de opslag te raken, omdat de doelgegevens dezelfde blijven.
