# Een gemiste training inhalen

Datum: 2026-10-29
Status: aangenomen

## Besluit

Een gemiste training (de dag is voorbij, geen log, niet overgeslagen, geen test, wedstrijd, herstelwandeling, vakantie of tocht, van deze of de vorige week) kun je inhalen: in het actieblad als "Inhalen" met dezelfde dagkeuze als Verplaatsen, en in Week met de greep, mits de getoonde week nog een dag heeft van vandaag of later. De rij van toen wordt overgeslagen (met jouw slot) en blijft op zijn dag staan; er komt een nieuwe rij met hetzelfde sjabloon en dezelfde lengte op de gekozen dag, met jouw slot en `PlannedSession.catchUp` (de oude rij en zijn dag). De dag in het verleden kan niet.

## Reden

Een voorbije rij verplaatsen zou de historie omschrijven. Overslaan van een gemiste training is al een keuze die je zelf mag maken (het blad biedt Overslaan op een voorbije dag aan), en een overgeslagen rij telt in alle regels niet meer mee, dus een gemiste beendag blokkeert de 48 uur van de nieuwe niet. Er wordt geen log geschreven en niets als "voltooid" opgeslagen. Het ene voorstel van Verplaatsen (`proposeMove`, `decideMove`, `RescheduleDialog`) blijft de weg: een schone dag gaat meteen met Ongedaan maken, een botsing, rustdag, volle dag vraagt Akkoord. `applyProposal` herkent de inhaal aan de verandering zelf (een gemiste rij die naar vandaag of later gaat), zodat blad, voorgestelde dagen en slepen hetzelfde doen. Ongedaan maken zet de oude rij terug en haalt de nieuwe weg (`before` en `addedIds`).

## Alternatieven

De oude rij laten staan als gemist en alleen een nieuwe maken: dan blijft de gemiste beendag meetellen in de 48 uur en kun je dezelfde training twee keer inhalen. Verworpen. De oude rij echt verplaatsen: omschrijft historie. Verworpen.

## Bron

Gesprek met de eigenaar, CLAUDE.md ("Who may touch a planned session", "Never rewrite historical logs").

## Vervangt

Niets.

## Terugdraaien

Haal de koppeling in `applyProposal` en de greep in `WeekPlanner` weg. Rijen met `catchUp` blijven gewone, geldige rijen.
