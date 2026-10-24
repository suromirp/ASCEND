# Een vlak lucht halverwege en een rustiger kop op Ascend

Datum: 2026-10-24
Status: aangenomen

## Besluit

Op lange pagina's staat hoogstens één vlak lucht (`SkyPanel` in `src/components/SkyBand.tsx`) om de donkerte te breken, en de kop van Ascend toont alleen de naam van het doel, de datum en het aftellen. De route en de regels over een pauze of een ontbrekend aantal dagen staan achter de knop "Details van het doel".

## Hoe het werkt

Het vlak heeft het verloop van de lucht bovenaan (`--color-sky-top` naar `--color-sky-bottom`), een smalle rand bergen onderaan (`--color-mountain-back` en `--color-mountain-front`) en de klasse `.on-light`, dus de inhoud is donker op licht. Met `data-sky="night"` volgt het vanzelf de nachtlucht, met een haarlijn in plaats van een schaduw. Er zijn geen nieuwe tokens of kleuren. Het lege deel van een meter staat op `--color-track`, dat in een licht vlak zijn eigen waarde heeft.

Wanneer: alleen op een lange pagina, op een kaart die halverwege staat en iets samenvat of aanwijst, nooit de eerste kaart (die staat al op de lucht bovenaan) en nooit meer dan één per pagina. De gevulde mint hoofdknop blijft het ene accent van het scherm; het vlak gebruikt mint alleen als tekst en voortgang.

Waar: Ascend op "Volgend kamp" (niet zichtbaar zolang de hele ladder open staat), Je stand op de vier regels onder de sprongknoppen, Logboek op de lijst per sport. Week blijft zonder: het is een lage band en de pagina is niet lang genoeg.

De kop van Ascend: de route (totalen, gemiddelde dag, trainingsdag) en de waarschuwingen over een gepauzeerd doel of een ontbrekend aantal loopdagen staan in een onderblad (`Sheet`, met de terugknop erbij), te openen met de knop "Details van het doel".

## Reden

Advies van de vriendin van de eigenaar: lange donkere pagina's af en toe breken met een vlak in de kleuren van de lucht, niet te veel, en de kop van Ascend had te veel kleine tekst onder de datum.

## Alternatieven

Een smalle band met bergen zonder kaart: minder betekenis, het vlak draagt nu zelf inhoud. Een knop "Doelen" op de kop: "Doelen beheren" staat al onderaan, dus de knop heet "Details van het doel".

## Bron

Ontwerpadvies, 24 oktober 2026. Stijl: `docs/beslissingen/2026-10-24-thema-zee-en-berg.md`, `docs/beslissingen/2026-10-24-nachtlucht.md`, `docs/beslissingen/2026-10-24-ontwerpadvies-kop-en-weekstrook.md`.

## Vervangt

Niets.

## Terugdraaien

Vervang `SkyPanel` op de drie pagina's door `Card` en zet `RouteLine` weer in `SkyBand` op Ascend.
