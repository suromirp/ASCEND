# Testdag in Week

Datum: 2026-10-31
Status: aangenomen

## Besluit

TEST-DAY (iets zwaars op de dag van een test of wedstrijd) is nu ook een melding onder "Let op" in Week, met een voorstel via `engine/weekFixProposal.ts`. Eerst kijkt het voorstel of de andere training naar een andere dag kan. Lukt dat niet zonder een nieuw probleem, dan is het weghalen van die training de laatste keuze, alleen als jij hem daar zette (niveau 1) en de week nog een sessie met dezelfde taak heeft, zoals een tweede lange duurloop. De test of wedstrijd zelf gaat nooit weg.

## Reden

In een volle week gaf de melding geen voorstel: verplaatsen van de lange duurloop gaf een nieuw probleem met de beendagen of een volle dag, en de test verplaatsen botste met de dagen ervoor of erna. Dan bleef je met een melding zonder uitweg zitten. Weghalen mag alleen als de week er niets wezenlijks bij verliest, daarom de voorwaarde van een tweede sessie met dezelfde taak.

## Alternatieven

De test verplaatsen: een test of wedstrijd verschuift alleen via zijn eigen voorstel, en hier gaf dat ook een nieuw probleem. De andere training korter maken: op de dag van een test hoort niets zwaars, ook geen korte versie. Weghalen zonder voorwaarde: dan kan de enige lange duurloop van de week verdwijnen.

## Bron

Review van Warden op de wijziging "Data klopt tussen schermen"; `docs/architectuur/week.md`.

## Vervangt

Niets.

## Terugdraaien

Haal in `planWeekFix` het blok voor TEST-DAY met `lastResort` weg; de melding en de verplaatsingen blijven dan zoals ze waren.
