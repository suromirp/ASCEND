# Een losse training staat op Week

Datum: 2026-10-24
Status: aangenomen

## Besluit

Een log zonder geplande training (een losse training, bijvoorbeeld een Garmin-activiteit die je als losse training bewaarde) staat op Week op zijn dag, als gedane rij met dezelfde vormgeving als een gedane geplande training en het kleine label "zonder plan". Een tik opent het logblad, hetzelfde als in het Logboek. Een dag met alleen een losse training heet niet meer "Vrij, niets gepland". Ook een log waarvan de geplande training niet meer in de planning staat telt als los.

De tijd bovenaan Week telt nu met dezelfde functie als de weekterugblik (`engine/weekLogs.ts`): alles wat je in die week deed, op de dag van doen, zonder rustdagen. Het totaal ("van ...") is wat gedaan is plus wat nog openstaat op het geplande aantal minuten. De kilometers en meters stijgen komen uit dezelfde logs.

De ring "x van y gedaan" blijft het plan tellen, zoals de weekterugblik (`done` en `planned`): een losse training is geen geplande training en verandert die teller niet. De tijd telt dus alles wat je deed, de ring alleen wat gepland was.

Er wordt niets opgeslagen of veranderd: de log blijft zoals hij was, de planning ook.

## Reden

Je stand en de weekterugblik telden een losse training al mee, maar Week liet hem niet zien: de dag stond er leeg en de tijd bovenaan klopte niet met de weekterugblik. Eén bron voor de som voorkomt dat de twee weer uit elkaar lopen.

## Alternatieven

De losse training ook in de ring tellen: dan zou "x van y" afwijken van de weekterugblik, en "van y" is wat gepland stond.

Een eigen telling in de pagina houden en de weekterugblik laten zoals hij was: dat is precies hoe ze uit elkaar liepen.

## Bron

Verzoek van de eigenaar, 24 oktober.

## Vervangt

Niets.

## Terugdraaien

In `src/pages/Week.tsx` `looseLogs` en `onSelectLog` niet meer doorgeven aan `WeekPlanner`: de rij is dan weg. De tijd bovenaan blijft dan wel de som van de weekterugblik; terug naar een som per geplande training is een eigen wijziging in `weekTime`.

## Let op

Een log die in een andere week valt dan zijn geplande training (vandaag gedaan wat voor volgende week stond) telt voor de tijd bij de week waarin hij gedaan is, net als in de weekterugblik. Zijn rij blijft op de week van de geplande training staan, met een vinkje.
