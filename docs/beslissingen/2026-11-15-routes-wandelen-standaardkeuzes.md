# Routes voor wandelen: de standaardkeuzes zonder antwoord van de eigenaar

Datum: 2026-11-15
Status: aangenomen (voorlopig, tot de eigenaar de drie vragen uit het ontwerp beantwoordt)

## Besluit

Stap 1 en 2 van `docs/visie/Ontwerp routes wandelen en rugzak.md` zijn gebouwd met het advies als standaard,
omdat de drie vragen aan de eigenaar nog open staan:

- Als duur en hoogtemeters botsen, gaat de duur voor. De lus mikt op de hoogtemeters die in de duur passen
  (klimmen en dalen samen hoogstens twee derde van de tijd); wat de training vraagt blijft het getal in elke
  zin (`askedAscentM`). In de code: `walkClash`, standaard `duration` (`src/engine/hikeTarget.ts#resolveWalkClash`).
- De wandelladder blijft zoals hij is. De lus zegt eerlijk wat past; er is geen code die de ladder aanpast.
- Een herstelwandeling krijgt een lus alleen na een tik, nooit vanzelf. In de code: `searchesOnOpen`
  (`src/engine/routeTarget.ts`) met de keuze `walkRoute`, standaard alleen na een tik.

Daarbij één lezing van het ontwerp: de rugzak verkort de lus. Het ontwerp zegt "de rugzak verandert de lus
niet, alleen de tijd". Met duur eerst ligt de tijd vast, dus een tragere tijd met rugzak wordt een kortere
lus (en zo nodig minder hoogtemeters). Dat gebeurt alleen op je eigen klimtempo, met een bekend gewicht op je
klimmen en een bekend lichaamsgewicht; op de wandelnorm rekent de lus zonder rugzak.

## Reden

De duur is wat de belasting, de 48 uur tussen beenzware sessies en het weekbudget tellen. Een lus die stil
langer duurt verandert de belasting zonder voorstel. Daarom ook de rugzak in de afstand en niet in de tijd:
anders duurt de lus met een zware rugzak langer dan de training.

## Alternatieven

- Hoogtemeters eerst: de lus haalt de gevraagde meters en duurt dan langer dan de training. Blijft mogelijk
  als keuze (`walkClash: 'ascent'`), in stap 5 instelbaar.
- De rugzak alleen in de getoonde tijd en niet in de afstand: past niet bij duur eerst, want dan is de lus
  met rugzak langer dan de training.
- De ladder aanpassen aan de wandelnorm: alleen na onderzoek en een voorstel met Akkoord (vraag 2 in het ontwerp).

## Bron

`docs/visie/Ontwerp routes wandelen en rugzak.md` (hoofdstuk 2 en de vragen aan de eigenaar), de review van
Warden op stap 1 en 2 (15 november).

## Vervangt

Niets.

## Terugdraaien

Antwoordt de eigenaar anders, dan verandert alleen de standaard van de keuze: `resolveWalkClash`,
`searchesOnOpen` of de omrekening in `walkRates`. Een bewaarde route bewaart geen doel, dus er is geen migratie.
