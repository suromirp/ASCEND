# Sleuteltraining: hoe ver het inhalen en de rustdag terugkijken

Datum: 2026-11-14
Status: aangenomen

## Besluit

Een aanvulling op `2026-11-11-sleuteltraining.md`, dat blijft staan. Twee regels gebruiken de sleuteltraining, en ze kijken bewust verschillend terug. Het inhalen (`engine/adviceWeek.ts`) kijkt drie dagen terug en haalt hoogstens één training in: die van de beste trede (`weekKeySession`). De rustdag terug (`engine/restDayBack.ts`, REST-BACK) kijkt zeven dagen terug en telt elke trede mee (`isKeyFor`), en ook een test.

Daarnaast noemt de zin met de sleuteltrainingen (`keyPhrase`) ze nu met één "of": "de tempoloop, de intervallen, de heuvelintervallen of de lange duurloop" in plaats van twee keer "of" in één zin.

## Reden

Het inhalen zet iets nieuws in de week, dus het is zuinig: kort terug en alleen de belangrijkste. De rustdag terug zet alleen een dag die al leeg is weer op rust en haalt niets in; daar mag het venster ruimer zijn en telt elke sleuteltraining. Het verschil stond niet in het eerste besluit en zag eruit als een fout.

## Alternatieven

Beide regels hetzelfde venster en dezelfde trede geven. Niet gekozen: dan haalt het inhalen meer in dan goed is, of laat de rustdag een gemiste lagere trede liggen.

## Bron

De code van beide regels en hun tests; de Bouwrij van `docs/backlog.md`.

## Vervangt

Niets.

## Terugdraaien

Het venster staat in `restDayBack.ts` (zeven dagen) en `adviceWeek.ts` (drie dagen); de zin in `keySession.ts` (`parts` van de kwaliteitstraining).
