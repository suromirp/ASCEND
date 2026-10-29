# Oefeningen opzij vegen in een Forge-training, soepel een set vegen, en Zonder spotter in een geopend concept

Datum: 2026-10-29
Status: aangenomen

## Besluit

In een Forge-training staat standaard een oefening per scherm. Je veegt opzij van oefening naar oefening, zoals in MacroFactor. Het is gewone CSS scroll-snap (`.forge-pager` en `.forge-page` in `index.css`), zonder bibliotheek, met `scroll-snap-stop: always` zodat een snelle veeg nooit een oefening overslaat. Elke oefening scrolt binnen haar eigen scherm naar beneden. Onder de klok staat een strook met een kaartje per oefening (`components/forge/ForgeStrip.tsx`): het bestaande kaartje met de tekening of het spierkaartje, de huidige met een mint rand en een mint streep eronder, een afgeronde met een klein vinkje. Een tik springt naar die oefening, in Uit zonder te schuiven. Er is geen kaartje "+", want een oefening toevoegen kan in een training nog niet.

Een set verwijderen blijft vegen naar links, maar een veeg begint alleen op het nummer of het voorschrift van de set (`data-swipe-zone`). Daar staat `touch-action: pan-y`: de browser laat het horizontale gebaar aan de rij, die het na de richtingskeuze van 8 px met pointer capture vasthoudt. Elders op het scherm (kg, herhalingen, RIR, het vinkje, de kop) is opzij vegen gewoon de pagina. Verticaal scrollen blijft overal werken. Na de laatste set van een oefening schuift Forge niet zelf door, en Forge scrolt nooit zelf naar een rij op een ander scherm.

De instelling heet "Oefeningen in een training" (`AppSettings.forgeLayout`, `engine/forgeLayout.ts`): "Een per scherm" (het advies, de standaard) of "Onder elkaar" (zoals eerst). Ze staat onder Forge, Bij het invullen, en als schakelaar "Een oefening per scherm" in het menu van de training, naast Snelknoppen tonen. De rust-balk, het invoerpaneel, Afronden, het verloop en alle bladen werken in beide standen.

Het vegen van een set is soepel gemaakt (`components/forge/SwipeRow.tsx`, de rekensom en de drempels blijven in `components/swipeRow.ts`): tijdens het vegen geen React-state en geen meting, alleen een transform via de refs, één keer per beeld met requestAnimationFrame. De breedte wordt één keer gelezen bij het neerzetten van je vinger. Het rode vlak ligt rechts naast de rij en schuift met dezelfde transform mee, in hetzelfde beeld, in plaats van in breedte te groeien. `will-change: transform` staat alleen aan zolang je veegt. Loslaten gaat in 200 ms ease-out, in Uit en bij beperkte beweging meteen naar de eindstand. Gemeten met Playwright en touch-events via CDP bij een vier keer vertraagde processor: 200 bewegingen in 6,9 seconden gaven 7 commits van React, precies de klok van de training (een per seconde); het vegen zelf gaf er geen.

Zonder spotter (`2026-10-28-zonder-spotter.md`) had een gat. Een oefening in een concept waar je niets aan deed, kreeg bij heropenen het plan van toen als de naam gelijk was. Een training die je opende voor de regel er was, hield zo een bankdrukset "7+ tot falen" met 0 over. De klok begint bij zo'n concept opnieuw (er was nog niets afgevinkt), dus het leek een nieuwe training. Nu krijgt een oefening zonder iets van jou (niets afgevinkt, getypt, geruild, erbij of eraf) altijd het plan van nu (`forgeInput.ts#touchedInDraft`), en komt het teken dan ook in het verloop. Een set tot falen wordt zonder spotter een open set met reserve (`SetTarget.open`): "7+ met 1 over" in de reden en "7+ herh., 1 RIR" in het voorschrift, in plaats van een gewone set van 7.

## Reden

De eigenaar wil in een training niet naar beneden scrollen maar van oefening naar oefening vegen, zoals hij gewend is van MacroFactor. Het vegen van een set voelde nog niet soepel: het rode vlak groeide in breedte, wat bij elke beweging layout kost, en de rij bewoog bij elke pointer-gebeurtenis in plaats van per beeld. Een veeg die overal op de rij kon beginnen zou bovendien botsen met het opzij vegen van de pagina; het besluit van de snelknoppen zei al dat een veeg op het nummer of het voorschrift begint.

De spotterregel klopte in de engine, maar het heropenen van een concept liet een voorschrift van voor die regel staan. Een oefening waar je niets aan deed bevat niets van jou, dus het plan van nu is daar altijd juist.

## Alternatieven

Een bibliotheek voor een carrousel: niet nodig, scroll-snap doet het in de browser zelf en scrolt vloeiender dan JavaScript. Eén verticale scroll voor alle schermen samen: dan is elk scherm zo hoog als de langste oefening, met lege ruimte onder een korte. Automatisch doorschuiven na de laatste set: kan later als instelling, nu niet, want het verrast als je nog iets wilt aanpassen. Bij het heropenen een concept alleen vervangen als het voorschrift van de spotter afwijkt: smaller, maar dan blijven andere nieuwe regels hetzelfde gat houden.

## Bron

Een wens van de eigenaar en zijn melding van de bankdrukset met 0 over. De vorm van zijn programma is gelezen uit zijn back-up, niet gekopieerd; de tests gebruiken nagemaakte gegevens (`engine/spotterProgram.test.ts`).

## Vervangt

Het open punt over de bankdrukset in `2026-10-29-snelknoppen-in-forge.md` is hiermee beantwoord. In `2026-10-28-zonder-spotter.md` wordt een set tot falen nu een open set met 1 over ("7+ met 1 over") in plaats van een gewone set van de onderkant van het bereik. Het rekenen blijft gelijk.

## Terugdraaien

Zet "Oefeningen in een training" op Onder elkaar. Het gedrag van het concept: `touchedInDraft` in `engine/forgeInput.ts`. De opgeslagen vorm is optioneel (`AppSettings.forgeLayout`), er is geen migratie.
