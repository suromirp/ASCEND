# Planning losse punten: ziek alleen vandaag, een open dag, het voorbeeld en de vaste rijen

Datum: 2026-11-26
Status: aangenomen

## Besluit

Zes losse punten van de planning (I-146, I-147, I-148, I-151, I-156 en de zin van het krachtblok), elk op advies. Niets ervan verandert de planning zonder voorstel; historie blijft zoals hij is.

- I-151: in het dagbeeld (`src/engine/dayPlan.ts`) krijgt alleen vandaag de ziekteregel. Een andere dag rekent `primary` en `rest` zonder de ziekte van vandaag, ook morgen, dat de lopende melding nog als ziek telt.
- I-147: Geen tijd vandaag en de opstartstap beschikbaarheid kiezen alleen een open dag (`src/engine/scheduler.ts#proposeNoTimeToday`, opties `isOpen`, `stays`, `window`): geen dag die je bij je dagen uitzette en geen dag met een test of wedstrijd ernaast volgens de bestaande afstandsregels (`findHeavyConflicts`). Een voorstel dat een rij op een dichte dag zou zetten of een vaste rij zou verschuiven telt niet; dan de volgende dag. Eigen keuze: in een vervolgweek probeert de opstartstap na de latere dagen ook de eerdere dagen van die week, want die liggen ook nog in de toekomst; Geen tijd vandaag blijft bij latere dagen. Lukt niets, dan de bestaande uitkomst: de rij vervalt, met de melding op Vandaag (`passiveSummary`) of als voorstel bij Geen tijd vandaag. Een test, wedstrijd, gelogde rij of rij met een slot krijgt geen voorstel meer; de `break` achteraan is weg. `lockLevel` krijgt de logs mee.
- I-148: invariant 2 blijft de eerste twee weken, zoals `docs/visie/Ontwerp Eén plan.md` al zegt. Het eerste voorstel zegt er met een doel met een datum één zin bij: "Vanaf over twee weken stemt het weekplan elke week af op je doel. Wat het daar verandert, meldt het je." (`src/engine/firstPlan.ts#FOLLOW_WEEKS_LINE`).
- I-146: nagegaan, de rij die Hoeveel per soort op Meer in de startweken erbij zet krijgt na Akkoord al geen vaste lengte. De lengte op het item van het voorstel is alleen tekst; `applyHorizonPlanNow` laat de planningsronde de rij zetten, zonder `plannedMinutes`. Bij een ander niveau van de start schuift hij mee. Een test legt dat vast; geen code veranderd.
- I-156: de vaste rijen en Hoeveel per soort rekenen in de planningsronde tot de doeldag of hun eigen weken vooruit, nooit tot `until` (`src/engine/planPass.ts`). `until` is het venster van de weekcontrole in een voorbeeld (vandaag plus 28 dagen); daarmee haalde het voorbeeld de vaste rijen erna weg en stonden ze als "vervalt" in het voorstel, terwijl de opening ze laat staan.
- Krachtblok: de zin over een week zonder plek zegt nu wat de telling telt: "In 1 week is er geen dag voor nog een krachttraining: elke dag heeft al een training, is geen trainingsdag van je of ligt te dicht op een zware dag. Daar past hij alleen als je een andere training verplaatst of schrapt."

## Reden

Een voorstel dat iets anders laat zien dan wat er na Akkoord staat, ondergraaft het Akkoord (invariant 2). Bij I-148 is het enige verschil, nagespeeld met nagemaakte starts (halve marathon, drie dagen ma, wo, vr en vier dagen di, do, za, zo), één rustige duurloop in de week van de wedstrijd, en die ligt altijd vanaf over twee weken. Het weekvoorschrift rekent bij elke opening opnieuw met je logs en je voortgang, dus wat het voorbeeld daar nu zou tonen klopt over een paar weken ook niet meer. Het voorschrift in het voorbeeld narekenen vraagt een droge versie van de hele stap met de ronde erachter in het zwaarste pad van de opslag; de zin zegt eerlijk wat er gebeurt, en het weekvoorschrift meldt zelf wat het verandert of vraagt het eerst.

Bij I-147 ging een systeemrij van een dichte zaterdag naar een dichte zondag naast een test, of bleef hij op de dichte dag staan omdat de `break` de hele dag stopte. Eerdere dagen van een vervolgweek proberen geeft een rij een plek in plaats van hem te laten vervallen terwijl vrijdag open en leeg is.

## Alternatieven

I-148: het weekvoorschrift in het voorbeeld narekenen. Niet gekozen, zie de reden. Niets zeggen en alleen invariant 2 tot twee weken laten: niet gekozen, dan noemt het voorbeeld de vervolgweken niet terwijl ze wel veranderen.

I-147: alleen latere dagen, zoals Geen tijd vandaag. Niet gekozen voor de vervolgweken: dan vervalt een rij die vrijdag had gekund. Bij Geen tijd vandaag wel, want daar is de dag zelf al bezig.

I-156: het voorbeeld zonder `until` rekenen. Niet gekozen: het venster houdt de weekcontrole in een voorbeeld snel, en alleen de vaste rijen en Hoeveel per soort mogen niet van dat venster afhangen.

## Bron

Backlog `docs/backlog.md`, Inbox I-146, I-147, I-148, I-151, I-156 en de regel onder Nakijken over `engine/strengthScheduling.ts`. Reviews van de Warden en Lookout van 23 november 2026. `docs/visie/Ontwerp Eén plan.md` (invariant 2). Verslag: `docs/onderhoud/2026-11-26-planning-losse-punten.md`.

## Vervangt

Niets. Vult `docs/beslissingen/2026-11-23-een-plan-eerste-voorstel.md` aan: daar bleef een test, wedstrijd of rij met een slot staan door een `break`; nu krijgt hij geen voorstel.

## Terugdraaien

I-151: de toets `date !== today` in `weekPlan` eruit. I-147: de opties van `proposeNoTimeToday` weglaten geeft het oude gedrag; in `computeForecastReplan` de oude volgorde met `break` terugzetten. I-148: de regel `FOLLOW_WEEKS_LINE` uit de staart van `buildFirstPlan`. I-156: in `planPass` weer `ctx.until ??` voor de vaste rijen en Hoeveel per soort; dan komt "vervalt" terug. Krachtblok: de oude zin terugzetten.
