# Het eerste voorstel noemt wat daarna in Week staat

Datum: 2026-11-23
Status: aangenomen

## Besluit

Het eerste voorstel maakt zijn zinnen over de week uit het voorbeeld van het plan: dezelfde namen, hetzelfde aantal keer kracht en dezelfde rustdag als Week daarna. Vraag 2 en 3 van `docs/visie/Ontwerp Eén plan.md` zijn op advies beslist. Vraag 2: de tekst volgt het plan, het budget van de richting staat er apart bij ("1 keer kracht; je richting vraagt 2, met een vierde dag past het"); het plan volgt de richting niet stil. Vraag 3: de herstelwandeling op de rustdag heet in het voorstel zoals in Week ("Rustdag ma, wandelen mag", of Hersteldag in die stand van Op je rustdag). Een test, wedstrijd of rij met een slot blijft op zijn dag, ook als die dag niet in je beschikbare dagen zit: de beschikbaarheidsstap schuift ze niet en haalt ze niet weg, in het voorbeeld en bij de opening.

## Reden

Een voorstel dat iets anders noemt dan Week daarna laat zien, ondergraaft het Akkoord. De wedstrijddag viel stil uit het plan als hij op een dag lag die niet in je dagen zat; dat breekt de regel dat de automatische planning een test of wedstrijd nooit verschuift (werkbriefje planning, Nooit).

## Alternatieven

Vraag 2: het plan volgt de richting en een loop wordt kracht. Niet gekozen: dat verandert je planning en hoort bij het voorstel van de richting, niet stil bij de start. Vraag 3: de rustdag weglaten uit het voorstel. Niet gekozen: hij staat daarna wel in Week. Voor de wedstrijd: hem naar een beschikbare dag verplaatsen. Niet gekozen: de datum van een wedstrijd ligt vast.

## Bron

`docs/visie/Ontwerp Eén plan.md` (symptoom A, vraag 2 en 3), backlogpunt I-14, de review van de Warden van 23 november 2026. Verslag: `docs/onderhoud/2026-11-23-een-plan-eerste-voorstel.md`.

## Vervangt

Niets.

## Terugdraaien

De zinnen: `computeHorizonPlan` zonder `FirstPlanExtras.text` valt terug op de regels van `buildFirstPlan`. De wedstrijddag: de regel met `anchored` in `src/engine/adaptiveReplanner.ts#computeForecastReplan` eruit; dan verdwijnt een wedstrijd op een niet beschikbare dag weer, dus liever niet.
