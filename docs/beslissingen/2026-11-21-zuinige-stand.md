# Zuinige stand

Datum: 2026-11-21
Status: aangenomen

## Besluit

ASCEND wordt gebouwd in de zuinige stand: lichtere modellen, poorten naar risico, één review en één doorloop per bouwmoment, en bouwen alleen op het bouwmoment. De regels staan in de skill `werkverdeling` onder Zuinige stand.

## Reden

De eigenaar ging te snel door zijn abonnement. Van 18 tot 20 november liepen bouwers en reviews vaak op Fable, kreeg elke feature eigen poorten en kwamen er herstelrondes op Mag-punten. Dat kostte veel zonder dat de eigenaar er meer van merkte.

## Alternatieven

- Alles laten zoals het was en alleen minder bouwen. Niet gekozen: de kosten per feature blijven dan even hoog.
- Alles op Sonnet, ook opslag en planner. Niet gekozen: daar is een fout duur, en Opus vangt meer.

## Bron

Opdracht van de eigenaar, 21 november, doorgegeven door de chat ASCEND.

## Vervangt

Deels `2026-11-20-lange-chat-en-kosten.md` (de modelkeuze en het wisselmoment: nu rond 150k context of na elke bouwronde) en deels `2026-11-20-gemengde-bouwers-en-wissel.md` (een losse chat nu alleen voor opslag of migraties, en hetzelfde wisselmoment). De werkverdeling van 10 en 11 november geldt niet meer voor zover ze Fable of meer poorten vraagt.

## Terugdraaien

De eigenaar zegt dat het weer ruimer mag; dan geldt de tabel van de skill `werkverdeling` van voor 21 november (git-geschiedenis). Het kostenlogboek laat na een week zien wat het scheelde.

## Aanvulling, dezelfde dag

De eigenaar gaf de coördinator mandaat om de werkwijze verder goedkoper te maken. De poortregel geldt nu zo: voor main zijn tsc, lint, vitest en build groen; daarbovenop poorten naar risico (tekst of kleine fix: één screenshot dat de coördinator bekijkt; UI: Lookout; engine, opslag of planner: Warden en Lookout; Pathfinder alleen bij een nieuw scherm of nieuwe flow). Dit vervangt de vaste vier poorten uit `2026-10-22-kwaliteitspoort.md`; de rest van dat besluit (een tijdsgrens met zichtbare uitkomst, nooit een leeg scherm) blijft.

Verder: CLAUDE.md is ingekort (elke sessie en elke helper leest hem), de Werkkaart werkt drie keer per dag bij in plaats van elk uur, en uit de skill `werkverdeling` zijn de verlopen delen gehaald (Fable als standaard, effort high, de Wachter, de zelfreview door een extra reviewer, de check-in per ronde).

Wat blijft: de veiligheidsregels (back-up, API-sleutels, persoonsgegevens, squash naar main, f7e63c3 nooit op main, geen geschiedenis herschrijven), historie append-only, planning alleen via een voorstel met Akkoord, "het doel blijft het doel" en de vier controles groen voor main.
