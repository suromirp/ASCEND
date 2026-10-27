# Een stipje in plaats van het label "aangepast"

Datum: 2026-10-27
Status: aangenomen

## Besluit

Een instelling die je zelf anders koos dan het advies krijgt geen label "aangepast" meer, maar
een klein stipje voor de waarde, in mint gedempt (`AdjustedTag` in `src/components/ui.tsx`).
Het blad "Aangepaste instellingen" onder Gegevens en back-up legt uit wat het stipje betekent.
Een schermlezer hoort "aangepast" in het label van de rij; het stipje zelf is daar stil.

## Waarom

Het label liet titels op 360 px omslaan naar twee regels. Een stipje zegt hetzelfde zonder
ruimte te nemen. Dit vult `2026-10-26-advies-anders.md` aan, dat verder blijft staan.
