# De dag van een afgeronde training in Forge

Datum: 2026-11-15
Status: aangenomen

## Besluit

Afronden in Forge stelt bij Gedaan op de dag van je laatst afgevinkte set voor, ook bij een geplande training die je een dag eerder of later deed (`engine/forgeSession.ts#finishDayDefault`). De training blijft gekoppeld aan de geplande sessie; alleen de `completedDate` van het nieuwe log volgt het werk. Bij een geplande training staan de geplande dag (als die niet na vandaag ligt), de dag van je laatste set en vandaag als knoppen (`finishDayChoices`). Zonder afgevinkte set blijft het zoals het was: een geplande training van een eerdere dag krijgt die dag, anders vandaag.

## Reden

Warden (15 november, backlog I-4): een geplande beendag die je een dag later deed, kreeg de geplande dag. De 48-uursregel en de beenindex lezen `completedDate`, dus de rust na die beendag werd een dag te vroeg geteld. Een training van gisteren die je vandaag pas afrondt kreeg bij een planning op vandaag stil vandaag, zonder keuze.

## Alternatieven

Altijd de geplande dag houden (de fout zelf). Het log achteraf naar de juiste dag zetten: mag niet, een log wordt nooit herschreven. De dag van de eerste set: een training over middernacht hoort bij de dag waarop je hem afmaakte, zoals bij een losse training al gold.

## Bron

Backlogpunt I-4, review van Warden op 15 november; `2026-10-29-dag-van-een-training.md` (een handmatig log bij een sessie van een dag eerder houdt zijn eigen datum).

## Vervangt

Niets. Vult `2026-11-14-training-blijven-liggen.md` aan, dat de dag van de laatste set alleen voor een losse training gaf.

## Terugdraaien

In `finishDayDefault` de geplande sessie weer voor de dag van de laatste set laten gaan en in `FinishSheet.tsx` de knoppen terug naar geplande dag en vandaag. Gemaakte logs blijven zoals ze zijn.
