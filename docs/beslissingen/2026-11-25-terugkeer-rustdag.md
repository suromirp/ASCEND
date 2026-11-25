# Een gemiste training op de eerste rustdag van de instap

Datum: 2026-11-25
Status: aangenomen

## Besluit

Na een pauze zonder ziekte (vakantie, stille periode) stelt de rustiger instap in hetzelfde voorstel met Akkoord voor om
een lichte gemiste training op de eerste rustdag van de instap te doen. Na ziekte blijft de rustdag staan. Instelbaar:
Gemiste training op je rustdag (Instellingen, Planning, Training die niet doorging), standaard aan.

Wat telt:
- Gemist: een training van de pauze of de dagen terug, voor vandaag, zonder log en niet overgeslagen. Vandaag telt nog
  niet. Een vakantie- of tochtdag is nooit gemist en wat voor een vakantie of tocht open stond vervalt, net als bij het
  inhalen (`engine/missedTraining.ts#pauseSince`).
- Licht: kracht of een rustige loop. Nooit een test of wedstrijd, een harde loop of de lange duurloop of bergtocht.
- Rustdag: de eerste dag in de zeven dagen van de instap zonder open training, zonder gelogde training en zonder vakantie
  of tocht; niet een dag die de ruil van de eerste dag (I-144) al gebruikt. Herstel mag er blijven staan.
- Geen zware benen binnen 48 uur van een zware beensessie, gelogd of gepland, en zonder sportschool geen
  sportschooltraining.
- Een rij die je zelf vastzette of verplaatste blijft staan.
- De duur volgt de instap: de rij valt in de zeven dagen en de duurregisters korten hem in; een vaste lengte gaat mee
  met de factor.
- De laatste gemiste training die past gaat voor; daarna de volgorde op de dag en het id.

## Reden

De eigenaar (I-159): de terugkeerweek na een vakantie met twee of drie dagen niet fit. Sinds I-154 komt er tijdens een
open instap geen inhaaladvies, dus de gemiste dagen bleven liggen terwijl de rustdag leeg was.

## Alternatieven

Een eigen voorstel na Akkoord op de instap. Niet gekozen: na een antwoord op de instap komt het gewone inhalen al terug
(I-154), en twee voorstellen over dezelfde dagen botsen. In hetzelfde voorstel zoals de ruil van de eerste dag blijft
het één Akkoord en één Ongedaan maken.

## Bron

Inbox I-159 in `docs/backlog.md`; `docs/beslissingen/2026-11-23-terugkeer-eerste-dag.md`,
`docs/beslissingen/2026-11-23-terugkeer-voor-inhalen.md`.

## Vervangt

Niets. Vult `2026-11-23-terugkeer-eerste-dag.md` en `2026-11-23-terugkeer-voor-inhalen.md` aan.

## Terugdraaien

De instelling uit zetten; in code `reentryCatchUp` in `engine/reentry.ts#proposeReentry` niet meer aanroepen.
