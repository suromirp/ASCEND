# Gegevens op lange termijn: oude voorstellen samenvatten, reeksen in de back-up kiezen, ruimte tonen

Datum: 2026-10-31
Status: aangenomen

## Besluit

ASCEND vat besliste voorstellen (planChangeProposals) na 3 maanden samen tot een korte regel, laat je kiezen welke reeksen van je horloge in de back-up gaan (de laatste 2 jaar, alle of geen) en toont in Gegevens en back-up hoeveel ruimte de app gebruikt, met een waarschuwing boven 80 % van wat de browser geeft. Alle drie staan in Gegevens en back-up, met het advies als standaard.

## Reden

Gemeten op een echte back-up van ongeveer 1 MB: een voorstel is ongeveer 3,4 KB en ze blijven allemaal staan, een training ongeveer 2,4 KB, en een volledige reeks ongeveer 100 KB per activiteit, 15 tot 25 MB per jaar. Over een paar jaar is de back-up dan vooral oude voorstellen en oude reeksen, terwijl geen scherm die details nog leest.

Waarom samenvatten mag. Een voorstel is geen historie in de zin van `docs/architectuur/historie-en-logs.md`: het is de beslisregel achter een wijziging van de planning, geen verslag van wat je deed. SessionLog en MilestoneProgress komen in deze stap niet eens in beeld, en een voorstel wordt niet weggegooid maar kleiner gemaakt. De samenvatting houdt id, soort, titel, datum, het moment van beslissen, de uitslag (Akkoord of Liever niet), de verwijzingen naar een ongedaan maken of een vrije periode, en het aantal wijzigingen. Van een aangenomen voorstel blijven ook de trainingen staan die het uit de planning haalde, alleen met actie en id, omdat `engine/weekLogs.ts#leftOutOfCount` die over de hele geschiedenis leest: een training die ASCEND zelf weghaalde telt dan ook later niet als gemist.

Eerst uitgezocht wat de details nog nodig heeft, en dat blijft heel:

- een voorstel dat nog open staat (geen uitslag);
- een voorstel waar een geplande training naar wijst (`PlannedSession.lock.proposalId`), want `engine/leaveStrays.ts` leest dan de wijzigingen;
- alles wat bij een ongedaan maken hoort, het ongedaan maken zelf en wat het terugdraaide. "Ongedaan maken" zelf werkt met `RecentPlanChange`, dat nooit wordt opgeslagen, dus het leest geen oude voorstellen;
- een voorstel van een vrije periode of tocht die nog bestaat, want het weghalen ervan zoekt naar wat die periode deed;
- een voorstel dat een dag of training raakte die na de grens ligt. De stappen die bij het opstarten oude wijzigingen lezen (`engine/systemMoves.ts`, `engine/raceBlock.ts#revivePrescriptionRemovedTests`, `storage/database.ts#restorePatternSessionsOnce`) kijken alleen naar trainingen van vandaag of later; de schermen die recente wijzigingen tonen kijken hoogstens 28 dagen terug.

Een samengevatte regel telt niet mee bij het samenvoegen van dubbele regels (`engine/planLogDedupe.ts`), omdat twee samenvattingen op elkaar kunnen lijken zonder dubbel te zijn. Het model kent geen aparte status "vervallen": beslist betekent hier Akkoord of Liever niet, met een moment van beslissen.

De stap draait bij het openen van een nieuwe versie (een opstartstap, `tidyOldProposals`, ook na het terugzetten van een back-up) en vlak voor je een back-up maakt. Instelling "Oude voorstellen opruimen": na 3 maanden (advies), 6 maanden, een jaar of nooit.

Reeksen in de back-up. De schakelaar "Reeksen in back-up" wordt een keuze. De laatste 2 jaar is het advies: dat houdt de recente runs heel, terwijl de back-up niet elk jaar 20 MB groeit. Twee jaar telt vanaf de dag van de training. De samenvatting per loop (`runDetail`, `bestEffort`) staat op de log en gaat altijd mee. Wie de oude schakelaar uit had staan, houdt Geen reeksen. Aan of niet ingesteld wordt het advies; omdat ASCEND nog geen twee jaar reeksen bewaart, merkt niemand daar nu iets van.

Ruimte op dit toestel. `navigator.storage.estimate` met een grens van 3 seconden; geeft de browser geen antwoord of kan hij het niet, dan staat er "Niet te zien" met een zin waarom. Boven 80 % van de quota krijgt de rij een amber stip en de raad een back-up te maken en reeksen op te ruimen. Dit is een meting, geen keuze, dus er is geen instelling voor.

## Alternatieven

- Oude voorstellen helemaal weggooien. Niet gekozen: de regel "op deze dag koos je Akkoord" is klein en kan later nog nuttig zijn, en `leftOutOfCount` heeft de weggehaalde trainingen nodig.
- De samenvatting in een eigen opslag zetten. Niet gekozen: dan moet elke lezer twee plekken lezen. Een samenvatting is een gewoon voorstel met lege lijsten, dus elke lezer en elke oude versie van de import kan het lezen.
- Reeksen ouder dan 2 jaar ook van het toestel halen. Niet gekozen: dat is een andere vraag (Volledige reeks bewaren, Ruimte van reeksen) en dit besluit gaat over de back-up.

## Bron

Opdracht van de coördinator met de metingen op een echte back-up (alleen groottes, geen inhoud). `docs/architectuur/historie-en-logs.md`, `docs/architectuur/koppelingen-en-data.md`, `docs/beslissingen/2026-10-22-alles-instelbaar.md` en `docs/beslissingen/2026-10-27-run-in-detail-gegevens.md`.

## Vervangt

Niets. De schakelaar "Reeksen in back-up" (`streamsInBackup`) blijft gelezen worden en staat nog in elke nieuwe back-up, zodat een oudere versie van de app hetzelfde bestand leest; de keuze `streamsBackup` gaat ervoor.

## Terugdraaien

Zet "Oude voorstellen opruimen" op Nooit; dan wordt niets meer samengevat. Wat al samengevat is, staat met alle details in elke back-up van daarvoor: zet die terug en zet daarna de instelling weer op Nooit, voordat je de app opnieuw opent. Om de stap helemaal te stoppen, haal je `tidyOldProposals` uit `engine/bootWatch.ts` en `storage/bootMigrations.ts` en de aanroep uit `AppDataContext#exportData`. Voor de reeksen: kies Alle reeksen, dan gaat alles mee zoals voor dit besluit.
