# Werkwijze met Claude

Datum: 2026-10-21
Status: aangenomen

## Besluit

Claude werkt aan ASCEND met een vaste set specialisten, vaste werkinstructies
en een besluitenlogboek in de repo. Claude zet wijzigingen zelf live nadat de
controles groen zijn. Alleen wat de planning van de gebruiker inhoudelijk
verandert, gaat in de app via een voorstel met Akkoord.

## De afspraken

- Geen verplichte PR of merge door de eigenaar. Kleine en middelgrote
  wijzigingen gaan via een eigen branch `claude/<onderwerp>`, dan lint, tests
  en build, en dan naar main.
- Grote of riskante wijzigingen mogen wel via een PR als dat handiger is voor
  de review, maar dat is geen verplichting.
- De repo blijft openbaar. Er komen nooit persoonsgegevens in de repo, ook
  niet in tests. Testdata is altijd nagemaakt.
- Kosten zo laag mogelijk. Sonnet voor specialisten en routines. Opus alleen
  voor review en lastig onderzoek. Effort gemiddeld als standaard; hoger
  alleen als een taak dat aantoonbaar nodig heeft.
- De telefoon is Android en de app is een geïnstalleerde webapp. Schermen
  worden op telefoonformaat gecontroleerd.
- Meldingen lopen via de GitHub-app.
- Besluiten staan in `docs/beslissingen/`, onderzoek in `docs/onderzoek/`,
  de visie in `docs/visie/`.

## Reden

De eigenaar wil weinig handwerk en snelheid. Een verplichte goedkeuring per
wijziging kost telefoontijd en voegt weinig toe zolang de controles groen zijn
en de planning alleen via een voorstel met Akkoord verandert.

## Alternatieven

Het visierapport "Werkwijze met Claude" stelde een verplichte PR met
goedkeuring door de eigenaar voor, plus een beschermde main en Opus voor
onderzoek op hoge inspanning. Dat is vervangen door de afspraken hierboven,
omdat het meer handwerk en meer kosten geeft.

## Bron

Gesprek met de eigenaar op 2026-10-21 en `docs/visie/Werkwijze met Claude.md`.

## Vervangt

De punten over verplichte PR, verplichte merge door de eigenaar en Opus voor
alle onderzoek in `docs/visie/Werkwijze met Claude.md`.

## Terugdraaien

Pas dit besluit aan met een nieuw besluit dat dit vervangt, en pas de sectie
"Werkafspraken voor agents" in `CLAUDE.md` aan.
