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
- De kop van Week: het grote getal ("Week 1") blijft, de kleine regel eronder zegt "Basisfase van 4 weken" (`weekPageHeading`). Week wijkt hier bewust af van Vandaag en Stand ("Basisfase, week 1 van 4"): het weeknummer staat al groot, dus nog eens "week 1" was dubbel (Pathfinder). In een golf of een vaste week blijft de oude regel. De regel staat onder het getal in plaats van ernaast, zodat hij op 360 tot 412 px niet midden in breekt.

## Aanvulling: keuzes van de bouwer bij spoor 2, 3 en 4 (12 november)

- De bergkam blijft. Gemeten: Stand toont de belasting per week (`WeeklyLoadChart`), de frisheid als curve en de beendagen (`LegCalendar`), maar niet de belasting per dag van deze week met wat nog komt. Hij staat nu als eigen kaart onder de dagen, boven de lijst, en alleen in een week met trainingen. Ring, tijd, kilometers en stijgen zijn weg van Week; de stand staat als regel onder "Je week tot nu".
- Het vak boven de dagen kiest in `engine/weekList.ts#weekBox`: Let op, dan Rustdag, dan Extra training. Wat het vak niet krijgt is een rij "Voorstel" (`components/WeekProposalRow.tsx`) die een blad met hetzelfde advies opent. De kaarten Rustdag en Extra training hebben geen contourlijnen meer.
- De lijst onder de dagen is één `SheetRows` met `SheetRow`, in deze volgorde: Voorstel, Rustweek (of herhaalde week of een stap achter, blad met de bestaande kaarten), Je week tot nu (of Je week), Aangepast door ASCEND, Week opnieuw plannen, Vrije dagen en vakanties, Jaaroverzicht. Week opnieuw plannen zegt tijdens het rekenen en bij een fout dat in de regel onder de rij. De periodes staan in een blad achter de rij; de zin "Eerst een voorstel, pas na Akkoord verandert er iets." staat daar onder de knop. Een verouderd voorstel van een periode staat in de regel onder de rij.
- "Naar deze week" is een gedempte tekstknop onder de titel in de lucht. In een week zonder trainingen staat in de lucht "Niets gepland deze week." en zijn Je week tot nu, Week opnieuw plannen en de bergkam er niet.
- Let op: een amber stip vooraan, het kopje in de tabkleur. De volle week na weggevallen dagen is een punt in `weekConcerns` (`PlainConcern`, `engine/fullWeek.ts#fullWeekConcern`), vooraan, zodat hij nooit achter "en nog" valt; hij telt mee in de kop. Zijn amber stip staat op de rijen van de dagen met twee trainingen ("volle dag"); is de week vol om een andere reden, dan zonder stip op een rij. Hij heeft in Week geen knop: het voorstel staat op Vandaag. Een kaart zonder knop zegt ook geen "Nog 2 punten open".
- De dagrij is 52 px (niet 56): bij 56 paste de week op 360 bij 640 net niet boven de tabbalk. De schijf is 36 px. Vandaag staat als woord in ijs op de plek van de dag ("Vandaag · 40 min") in plaats van als pil naast de naam: een pil naast een lange naam brak de naam naar een tweede regel. Een gemiste training met greep zegt "gemist" in de tweede regel; rechts staat dan alleen de greep. Zonder greep blijft het teken Gemist rechts. Een stille tekst in de tweede regel blijft op één regel en wordt zo nodig afgekapt; een punt uit Let op mag breken. De volgorde van het ene ding staat in `engine/weekRow.ts#rowExtra`; "verplaatst" zegt waar vandaan als dat bekend is. Het horloge staat in de tweede regel, verstuurd gedempt, mislukt in amber.
- Opgeruimd: `weekChanges`, `adjustedSessionReasons`, `changesSub` en `review.changes`. `weekHeading` en `weekPageHeading` zijn één functie, `weekHeading`, met de regel van de pagina.
- "aangepast" gaat in de rang direct na een punt uit Let op, en staat naast zo'n punt als die training ook een regel heeft: de enige rij met twee dingen. Zo blijft het getal op de rij Aangepast door ASCEND gelijk aan de dagrijen met het woord (invariant op de tekstkaart). Ook een rustdag met een regel zegt "aangepast". Gaan meer punten uit Let op over één training, dan zegt de rij er één, een punt van de weekcontrole voor de volle week (`rowNotes`).
- Week opnieuw plannen staat er niet in een week zonder trainingen, zoals het ontwerp zegt (Warden vroeg of een lege toekomstige week dan nog terug kan; dat kan niet vanuit Week, wel door de periode of het voorstel ongedaan te maken). Het blad Rustweek blijft open als de rij na een Akkoord verdwijnt.
- Na Pathfinder: direct onder de dagen staat wat nu iets van je vraagt, in een eigen lijst boven de bergkam: een voorstel dat wacht, en Week opnieuw plannen als er in de lopende week een training gemist is ("Je hebt 2 trainingen gemist. Zet de rest terug naar het plan."). Zonder gemiste training staat Week opnieuw plannen onderaan, zoals eerst. De rij Rustweek zegt "Minder uren, zo is je plan opgebouwd". Het blad Rustweek houdt zijn titel na een Akkoord, ook als de kaart erin dan "Rustweek overgeslagen" heet.
