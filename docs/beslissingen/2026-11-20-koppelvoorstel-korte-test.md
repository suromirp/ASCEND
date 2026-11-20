# Het koppelvoorstel zegt het als je korte test verschuift

Datum: 2026-11-20
Status: aangenomen

## Besluit

Verandert een koppeling achteraf welke korte test van de week telt, dan staat dat in het koppelvoorstel op Vandaag, in één zin, altijd zichtbaar: "Je korte test van donderdag telt dan niet meer, die uit deze loop wel." Verandert er niets, dan staat er niets bij.

## Reden

Per week telt de vroegste geldige korte test van een loop die aan een geplande training hangt (`2026-11-20-korte-test-rest.md`). Koppel je een losse loop met een teststuk die je eerder in de week liep, dan wordt die de test van de week en verliest de latere zijn oordeel. Het voorstel zei alleen "Met Akkoord telt die training als gedaan" (Warden 20 november, G4 bij I-91). Een voorstel zegt wat er verandert.

Hoe het werkt:

- `engine/linkShortTest.ts#linkShortTestShift` telt twee keer met dezelfde functies als het logblad (`shortTestsFound`, `countedShortTests`): met de logs zoals ze zijn, en met de koppeling erbij (`missedTraining.ts#linkLog`). Telt nu een andere loop en na Akkoord de losse loop, dan geeft het de test terug die verdwijnt. Er is geen tweede regel voor "vroegste van de week".
- `linkShortTestLine` maakt de zin. De dag is de dag van het log van de test die niet meer telt: deze week alleen de weekdag, verder terug met de datum, zoals de vraag erboven. Liep je beide op dezelfde dag, dan staat er "Je latere korte test van dinsdag".
- De kaart leest de bewaarde reeksen van de rustige lopen van die week via `components/useLinkShortTest.ts`. Alleen lezen. De knoppen zijn niet veranderd: Liever niet links, Akkoord rechts.
- Er wordt niets bewaard en geen log verandert. Ontkoppelen zet alles terug zoals het was.

## Eigen keuzes

- De zin komt alleen als een test die nu telt, niet meer telt. Gaat de losse loop na Akkoord tellen terwijl er nog geen test telde, dan staat er niets: dan verliest geen andere loop iets.
- Zonder gelezen reeks geen zin. Zijn de reeksen van die week niet op tijd of niet allemaal gelezen, of heeft de losse loop geen bewaarde reeks, dan is er geen teststuk te zien en zegt het voorstel niets. De zin verschijnt dus een ogenblik na de kaart, zoals het blok Korte test op het logblad.
- Dezelfde keuzes als het logblad: geen Akkoord op de korte test betekent geen zin, de instelling Korte test telt niet mee voor wat achteraf telt, en de keuze voor een test zonder borstband en "Ik had hem wel om" gelden hier ook.
- De week is die van de dag van het log, niet van de dag van het plan, zoals `countedShortTests` telt.
- Geen nieuwe instelling: de app maakt hier geen keuze, het voorstel zegt alleen wat Akkoord doet.

## Alternatieven

- De zin achter een i zetten. Niet gedaan: het is een gevolg van Akkoord en hoort op de kaart.
- In `missedTraining.ts` zelf uitrekenen welke loop de vroegste is. Niet gedaan: dat is een tweede regel naast `countedShortTests`, en die twee lopen dan uit elkaar.
- Ook melden dat de losse loop na Akkoord een oordeel krijgt als er nog geen test telde. Niet gedaan: de opdracht is wat er verschuift, en de kaart blijft kort.

## Open

- De melding na Akkoord (met Ongedaan maken) noemt de korte test niet.
- Een losse loop zonder bewaarde reeks kan toch een teststuk hebben gehad; dan zegt het voorstel niets en zegt het logblad het ook niet.

## Bron

Backlog I-95; review Warden van 20 november bij I-91. `docs/beslissingen/2026-11-20-korte-test-rest.md`, `docs/beslissingen/2026-11-01-niet-doorgegaan.md`.

## Vervangt

Niets.

## Terugdraaien

De regel met `shortTestLine` uit `components/MissedTrainingCard.tsx` halen. De koppeling en de telling zelf zijn niet veranderd.
