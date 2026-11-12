# Week: de dagen eerst, één kaart erboven, één lijst eronder

Datum: 2026-11-12
Status: aangenomen

## Besluit

De tab Week en het blad van een training worden gebouwd volgens `docs/visie/Ontwerp Week minimaal.md`. Op advies van Cartographer:
1. Wat ASCEND aanpaste heeft één thuis: Week, met één venster en alleen wat de app zelf bedacht. Een toevoeging met een bijbehorende verwijdering op dezelfde dag heet niet "toegevoegd"; bij twijfel geen regel. De rij in Je week tot nu vervalt (dit vervangt dat ene punt van `2026-11-12-je-week-tot-nu.md`).
2. Ring, tijd en kilometers gaan van Week naar Je week tot nu; de bergkam pas nadat is nagekeken dat Stand de belasting per dag toont.
3. Het blad van een training in Week gaat over wanneer en schuiven; de Briefing over voorbereiden; Waarom deze training over lezen. Het uitlegblad wordt kort, maar op de plekken in Forge en bij kracht verdwijnt niets voordat het een ander thuis heeft. Eerst naspelen hoe de eigenaar met één tik in Week op het uitlegblad kwam.

## Reden

De eigenaar vond delen van Week lelijk en onduidelijk en het blad van een training nutteloos. De lijst van aanpassingen noemde een opnieuw neergelegde training "toegevoegd", en twee plekken gaven twee getallen.

## Alternatieven

Wat ASCEND aanpaste in Je week tot nu houden: dat blad kijkt alleen terug, terwijl aanpassingen ook komende dagen raken.

## Bron

Gesprek met de eigenaar op 12 november, `docs/visie/Ontwerp Week minimaal.md`, naspelen met zijn back-up (de drie regels kwamen uit het voorstel voor de vrije periode).

## Vervangt

De rij Wat ASCEND aanpaste in `2026-11-12-je-week-tot-nu.md`.

## Terugdraaien

Alleen weergave en de telling van de lijst; voorstellen, Akkoord, slepen en historie blijven gelijk.

## Aanvulling: keuzes van de bouwer bij spoor 1 en 5 (12 november)

- Eén functie, één venster: `engine/changeLog.ts#weekAdjustments` met `ADJUST_WINDOW_DAYS` (14 dagen, gerekend op de lokale dag in Europe/Amsterdam). De rij, het blad en het woord "aangepast" op de dagrij lezen dezelfde uitkomst (`adjustedIdsOf`). Het venster telt vanaf het moment van besluiten tot vandaag; in een week van langer geleden staat dus geen rij meer, wat daar ooit veranderde is dan ook niet meer te bewijzen. De oude `weekChanges` en `adjustedSessionReasons` worden door het scherm niet meer gelezen.
- Zelf weg en weer terug naar de dag waar ASCEND hem zette: geen regel. Jouw slot staat op de rij, dus het log bewijst niet meer dat ASCEND hem daar neerzette. Hetzelfde voor elke rij met jouw slot (ook lichter of andere invulling) en voor een rij met het slot van een ander voorstel.
- Geen regel voor: Week opnieuw plannen (jij vroeg erom), de eerste opbouw van je plan bij een nieuw doel (`goal_created`, er stond nog niets), en de inhoud die de weekplanning elke week invult (`replace` en `reduce` van `weekly_prescription_computed`; anders stond "aangepast" op elke komende week). Verplaatsen, erbij en vervallen door de weekplanning tellen wel.
- Per saldo niets is geen regel: door ASCEND heen en terug naar dezelfde dag, eraf en weer terug, erbij en weer weg, binnen het venster.
- Een rij die Week niet toont krijgt geen regel (de oude rij van een inhaal, een overgeslagen rustdag, wat een vakantie liet vallen), zodat het getal gelijk is aan de dagrijen met het woord. Een gedane training met een regel toont het woord ook.
- In het blad: "na jouw Akkoord" alleen als het voorstel meer dan 10 seconden na het uitrekenen werd vastgelegd, "vanzelf met een melding" alleen voor de weekcontrole, de weekplanning en een krachtblok die de app zelf vastlegde (hetzelfde moment van uitrekenen en vastleggen, of zonder wijzigingen); een weekcontrole uit Let op kan ook jouw snelle Akkoord zijn. Anders alleen de datum.
- De kop van Week: het grote getal blijft, de kleine regel "Basisfase, week 1 van 4" (`weekPositionLabel`) staat eronder in plaats van ernaast, zodat hij op 360 tot 412 px niet midden in breekt.
