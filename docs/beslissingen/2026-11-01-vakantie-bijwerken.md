# Een vakantie bijwerken in Week

Datum: 2026-11-01
Status: aangenomen

## Besluit

Een tik op een vrije periode, vakantie of tocht in Week opent een blad waarin je de eerste en laatste dag, de soort en de notitie bijwerkt; Verwijderen staat in hetzelfde blad. Andere data of een andere soort is één voorstel met Akkoord via `engine/leaveProposal.ts` (met `replaces`, dezelfde weg als een tocht die je wijzigt), dat laat zien wat erbij komt, wat vervalt en wat schuift. De periode wordt pas bij Akkoord bewaard en Liever niet laat alles zoals het was. Alleen een andere notitie raakt de planning niet: die wordt meteen bewaard, met Ongedaan maken in de melding (`engine/leaveEdit.ts`, `saveLeaveNote`).

Een training die moet wijken voor een vakantie of de lichte dagen rond een tocht (regels LEAVE-OFF en LEAVE-LIGHT) belandt niet meer vlak voor of na zijn eigen volgende keer: dezelfde template, of een template met dezelfde taak via een rol (`long`, `hard_run`, `hills`, `blocks`, `engine/leaveSpacing.ts`). De nieuwe dag houdt minstens de helft van de gewone afstand (naar boven afgerond), voor een wekelijkse training vier dagen. Lukt dat niet, dan vervalt hij. De instelling "Opzij voor een vakantie" (Planning, Geavanceerd, `AppSettings.leaveCrowding`) heeft als advies Liever laten vervallen; Toch verschuiven geeft het oude gedrag terug. Twee zware beendagen binnen 48 uur blijven verboden.

Een training die je zelf verplaatste nadat de vakantie hem had verschoven, verliest het merk van die periode zodra de periode weg is of verandert (`putBack` in `engine/leaveProposal.ts`). Dat gaat als een `keep`-item met `leave: null` in hetzelfde voorstel: de dag en jouw eigen slot blijven, alleen het merk gaat.

## Reden

Een periode kon alleen weg en opnieuw, met twee voorstellen en twee keer verschuiven. Een nagemaakt voorbeeld (`engine/leaveEdit.test.ts`, vrij van zaterdag 5 tot en met woensdag 9 december) laat zien wat er misging: Bovenlichaam A schoof van dinsdag 8 naar zondag 13, naast de lange duurloop en twee dagen voor de volgende Bovenlichaam A, zodat er drie bovenlichaamtrainingen in vijf dagen stonden. Een training die zo dicht op zijn volgende keer komt, levert weinig op en kost herstel; laten vervallen is dan beter. Een merk naar een periode die er niet meer is, liet een training bij slepen blijvend om Akkoord vragen.

## Alternatieven

Een vaste afstand van zeven dagen: dan vervalt elke wekelijkse training die moet schuiven, ook als donderdag prima past. Een nieuwe rol voor bovenlichaam: dat vraagt een migratie van opgeslagen templates en dekt alleen dit ene geval. Bij een andere notitie ook een voorstel tonen: dat is een voorstel zonder inhoud.

## Bron

Gebruik van de app (alleen het patroon, nagemaakt in de test), `docs/architectuur/planning.md`, `docs/architectuur/week.md`.

## Vervangt

Niets.

## Terugdraaien

Zet "Opzij voor een vakantie" op Toch verschuiven voor het oude schuiven. Wie het bijwerken weg wil halen, maakt de rij in `components/LeavePeriods.tsx` weer een rij met alleen Verwijderen; de engine blijft werken voor Tochten.
