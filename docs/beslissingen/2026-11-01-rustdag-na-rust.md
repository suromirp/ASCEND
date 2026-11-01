# Geen rustdag terug na rust, inhalen gaat voor

Datum: 2026-11-01
Status: aangenomen

## Besluit

REST-BACK (`engine/restDayBack.ts`) stelt de rij Herstel op je vaste rustdag niet meer terug voor als de twee dagen ervoor geen trainingsbelasting hadden, en ook niet als er een gemiste test of sleuteltraining is die op die dag past: dan gaat het inhaalvoorstel voor. Titel en item noemen voortaan dezelfde rij: "Je herstelwandeling op maandag kan terug", met "de herstelwandeling" ook in de tekst en in de regel van het voorstel. Dit vult `2026-11-01-rustdag-terug.md` aan; dat besluit blijft staan.

## Reden

Een melding van de eigenaar uit de echte app: hij trainde zaterdag en zondag niet (Benen A, de herhaalde testloop en Bovenlichaam B overgeslagen) en REST-BACK stelde voor om maandag de rustdag terug te zetten. Na twee dagen zonder training is er niets om van te herstellen, en juist die maandag was eerder vrijgemaakt om in te halen. Dezelfde gedachte staat al in MISSED-CATCH-UP en SKIPPED-KEY-TO-REST: deed je de dag ervoor niets, dan is een rustdag niet nodig. Het voorstel heette "Je rustdag op maandag is weer vrij" terwijl het item "Herstelwandeling" heette; twee woorden voor één rij verwarren.

Hoe het telt:
- Belasting op een dag is wat er gedaan is op de dag van doen (een log die geen rust is) en wat nog komt op de geplande dag, dezelfde keuze als de belasting per dag in Week (`engine/weekProfile.ts#dayLoads`). Gemist, overgeslagen, rust of ziek telt niet. Hadden beide dagen ervoor niets, dan komt REST-BACK niet.
- Een gemiste belangrijke training is een training met de rol test, key of long (geen lijst met template-id's) uit de zeven dagen ervoor, niet gelogd, niet ingehaald, niet door een voorstel of vakantie losgelaten en niet op een ziektedag; gemist betekent voorbij zonder log of door jezelf overgeslagen. Past hij op die dag met de 48 uur tussen zware beendagen (`respectsHeavySpacing`), dan komt REST-BACK niet.
- In `computeAdvice` wint daarnaast elk inhaalvoorstel (MISSED-CATCH-UP, SKIPPED-KEY-TO-REST, TEST-MAKE-ROOM, TEST-RETRY) dat iets op die dag zet.

In de vorm van de melding (nagemaakt in `src/engine/restDayBack.test.ts`) komt daardoor geen REST-BACK, en wel TEST-MAKE-ROOM met de overgeslagen testloop op maandag. Het oude geval, gewoon getraind en de dag weer leeg, geeft REST-BACK zoals voorheen.

## Alternatieven

- Alleen de beenindex gebruiken: die kijkt naar benen, niet naar elke training; na een zware krachttraining voor het bovenlichaam kan een rustdag nog steeds zinnig zijn. De belasting per dag is ruimer en ligt dichter bij wat Week laat zien.
- Alleen op een bestaand inhaalvoorstel letten: TEST-MAKE-ROOM en MISSED-CATCH-UP vragen niet altijd (al beantwoord, instelling uit). De dag moet dan toch vrij blijven voor "Inhalen" in Week, dus de engine kijkt zelf ook of er iets past.
- De titel "Je rustdag" houden en het item hernoemen: het item is de rij die terugkomt en draagt de naam van zijn template; de titel volgt die naam.

## Bron

Melding van de eigenaar uit de app, 1 november 2026 (geen gegevens uit de back-up in de repo). Backlog-regel van 1 november.

## Vervangt

Niets; vult `2026-11-01-rustdag-terug.md` aan in wanneer het voorstel komt en hoe het heet.

## Terugdraaien

Haal in `restDaysToBringBack` de twee voorwaarden (`trainedOn`, `catchUpFits`) weg en in `computeAdvice` het filter `restBackLeft`; zet de oude titel terug in `restBackAdvice`.
