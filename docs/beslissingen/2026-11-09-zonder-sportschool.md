# Periode zonder sportschool

Datum: 2026-11-09
Status: aangenomen

## Besluit

Naast Vakantie zonder training, Tocht met rugzak en Vrije dagen is er een vierde soort periode: Zonder sportschool (`no_gym`, `engine/noGym.ts`). Je bent weg, je kunt lopen, maar er is geen sportschool. Zoals de andere periodes is het een voorstel met Akkoord (`engine/leaveProposal.ts`); de periode wordt pas bij Akkoord bewaard, de planning blijft deterministisch en zonder AI.

Wat er op de dagen van de periode gebeurt, vanaf vandaag:

- Kracht in de sportschool vervalt. Met het advies komt op dezelfde dag een korte sessie met je eigen gewicht (nieuw sjabloon `tpl_bodyweight`, Eigen gewicht: squats, lunges, push-ups en kuitheffingen, 20 minuten, kort 15). Kies je Laten vervallen, dan komt er niets voor in de plaats.
- Hoeveel, Licht (het advies): per week hoogstens twee keer lopen op de dagen van de periode. De lange duurloop blijft eerst, dan de rustige loopjes, dan de harde. Wat al gelogd, vastgezet of een test is telt mee en blijft staan.
- Hoeveel, Gewoon: alle loopjes blijven.
- Een harde loop die blijft (heuvels, intervallen, tempo) wordt op dezelfde dag een rustige duurloop in de korte versie. Elke andere loop krijgt zijn korte versie. Geen opbouw weg van huis. Een test of een sessie van een raceblok in de periode verplaatst ASCEND niet zomaar; een test staat als regel in het voorstel.
- Heuvels in de buurt is een schakelaar bij de periode. Hij plant niets: de dagband zegt "Lopen, rustig heuvels op" en het voorstel geeft één regel uitleg.

Eigen keuzes:

- Niets wordt herschreven: een training die vervalt krijgt `status: 'skipped'` met het merk van de periode (`dropped`), een nieuwe sessie krijgt het merk `placed`, een kortere loop het merk `moved` met `shortened`. Weghalen of wijzigen van de periode zet alles terug via `putBack`, dat nu ook een kortere loop weer zijn eigen lengte geeft.
- Alleen loopjes zonder eigen lengte worden korter; een lengte die je zelf koos blijft.
- Een test of wedstrijd, wat gelogd is, het verleden, wat je zelf vastzette, een sessie van een raceblok en een sessie die een andere periode al verschoof, raakt deze stap nooit. Een test in de periode staat als regel in het voorstel.
- Overlap: de strengste telt. Vakantie, dan tocht, dan zonder sportschool, dan vrije dagen. De lichte dagen rond een tocht gelden ook op een dag zonder sportschool.
- Hoeveel per soort voegt op deze dagen niets toe, zoals bij een vakantie of tocht.
- Zonder doel komt er geen bergtocht, wandeldag of rugzak bij: de stap zet alleen eigen gewicht en een rustige loop neer.
- Opslag: `LeavePeriod.noGym` (`amount`, `strength`, `hills`), optioneel. Een oudere back-up heeft het soort niet en leest zoals voorheen; kapotte keuzes vallen weg bij import en tellen mee, de periode blijft met het advies (`storage/migrationsPlanning.ts#migrateLeavePeriods`).
- Instelling Kracht zonder sportschool (Planning, `AppSettings.noGymStrength`, advies Eigen gewicht): alleen de eerste keuze in het blad voor een nieuwe periode. Elke periode bewaart zijn eigen keuze, dus de instelling verandert nooit een plan en wordt meteen bewaard.
- Het sjabloon gebruikt alleen oefeningen die de catalogus al kent (Eccentric Squat, Reverse Lunge zonder gewicht, Push-Up, Bodyweight Calf Raise). MacroFactor-koppelingen slaan het over, anders raadt een beendag uit MacroFactor op Eigen gewicht.
- Na de review (Warden, 9 november):
  - Een loop die de periode korter maakte en die je daarna zelf verplaatste, houdt bij weghalen van de periode jouw dag en jouw slot en krijgt zijn eigen lengte terug. Bij wijzigen alleen als de dag niet meer onder de nieuwe periode valt (bij een tocht: niet meer in de drie dagen erna); valt hij er nog onder, dan blijft hij kort en krijgt hij het merk van de nieuwe periode. Een periode die je bijwerkt houdt zijn id, dus dat merk is in de praktijk hetzelfde. In het voorstel is dat een `keep` met `leave: null` en `restore`; dat haalt naast het merk ook de lengte weg, zodat de fase de lengte weer bepaalt. Dit geldt ook voor een beendag die een tocht korter maakte.
  - Het item dat de lengte teruggeeft, bewaart de korte lengte die de loop nu heeft. Heeft hij intussen een andere lengte, dan is het voorstel verouderd. De melding na Akkoord zegt "blijft staan, weer op gewone lengte".
  - De uitleg van het voorstel zegt nu: wat je zelf vastzette blijft op zijn dag (de lengte kan terugkomen).
  - Een krachttraining of loop in de periode die vaststaat (door jou of door een eerder voorstel), blijft staan. Het voorstel zegt dat per sessie, en bij Licht dat een vastgezette loop meetelt voor de twee keer lopen.
  - Bij Licht telt een dag van de periode die al voorbij is alleen mee met een log. Een geplande loop die niet gelopen is, telt niet.
  - Staat er op de dag van een harde loop al een rustige loop, dan vervalt de harde loop zonder tweede rustige loop, en de reden zegt dat.
  - "Goed voor je benen in de bergen" (voorstel) en "Goed voor je bergdoel" (blad) staan er alleen als het hoofddoel een bergdoel is (`engine/mountainMuscles.ts#mainGoalIsMountain`: een tocht, bergtocht of mountaineering, of een hoofddoel zonder soort).
- Een vakantie omzetten in zonder sportschool gaat via het bestaande bijwerken in Week: een andere soort is één voorstel met `replaces`.

## Reden

Wens van de eigenaar (6 november, `docs/backlog.md`): een week weg zonder sportschool liet alleen kiezen tussen een vakantie zonder training of een plan dat in de sportschool rekent. Twee keer lopen en een korte sessie met je eigen gewicht houdt de draad vast zonder de reis te vullen.

## Alternatieven

Het sjabloon van een krachtsessie zelf veranderen (`templateId` op de geplande rij): dan moet het oude sjabloon ergens in het merk, met een migratie, en een gelogde rij zou een ander sjabloon kunnen tonen. Vervallen plus een nieuwe rij gebruikt het bestaande terugzetten. De instelling ook in de planning laten rekenen: dan verandert een instelling stil een plan.

## Bron

`docs/backlog.md` (Periode "Zonder sportschool", Heuvels en trappen in de buurt), `docs/beslissingen/2026-11-01-vakantie-bijwerken.md`.

## Vervangt

Niets.

## Terugdraaien

Haal `no_gym` uit `LEAVE_KINDS` in `engine/leave.ts`: dan kun je er geen meer toevoegen. Een bewaarde periode blijft leesbaar; verwijder hem in Week om alles terug te zetten.
