# Een krachtduur die niet kan

Datum: 2026-10-23
Status: aangenomen

## Besluit

Een krachtlog langer dan 240 minuten telt bij het lezen als de geschatte duur van die training. De opgeslagen log blijft zoals hij is. Bij het inlezen uit MacroFactor wordt zo'n duur genegeerd: een nieuwe log krijgt de geplande duur en een bestaande log krijgt geen voorstel om zijn duur over te nemen.

## Reden

Een workout die in MacroFactor dagen open bleef staan kwam binnen met 11.472 minuten. Het Logboek meldde daardoor "−10.963 min t.o.v. vorige maand", en alles wat duur optelt rekende met acht dagen kracht. Dezelfde grens van 240 minuten gold al bij het leren van de duur (`engine/durationLearning.ts`).

## Alternatieven

De log in de opslag herschrijven. Dat breekt de afspraak dat een log nooit herschreven wordt, en het origineel zou weg zijn.

## Bron

Schermafdruk van het Logboek door de eigenaar.

## Vervangt

Niets.

## Terugdraaien

`withPlausibleDurations` uit `state/AppDataContext.tsx#loadState` halen en `plausibleStrengthMinutes` uit `engine/macrofactorLink.ts` en `engine/macrofactorLead.ts`.
