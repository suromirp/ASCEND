# Terugkeer: de eerste dag is een training, en de pauze loopt door

Datum: 2026-11-23
Status: aangenomen

## Besluit

Een aanvulling op `2026-11-23-terugkeer-na-pauze.md` (I-124), na een melding van de eigenaar. Backlog I-144.

- Het voorstel voor een rustiger instap stopt na de eerste week na de terugkomst alleen als je sindsdien trainde. Wie na een periode zonder sportschool, vakantie, tocht of ziekte nog niets deed, zit nog in dezelfde pauze en houdt het voorstel, met hetzelfde id, tot de terugkomst buiten de twee weken van `returnDay` valt (daarna neemt de maandag met weinig training het over). Liever niet geldt nog steeds voor de hele pauze.
- Staat er op de eerste dag van de instap alleen herstel (een Herstelwandeling) en trainde je sinds de terugkomst niet, dan is die dag geen rustdag maar je eerste lichte training: de eerste kracht- of looptraining van de zeven dagen (geen test of wedstrijd, geen zware benen binnen 48 uur na een zware beensessie) ruilt van dag met het herstel (`reentry.ts#reentryFirstDay`). Dat staat in hetzelfde voorstel ("Vandaag geen herstel maar je eerste training: ...") en gebeurt alleen met Akkoord, als eigen voorstel dat vóór de planningsronde gaat (`startItems`, met slot). Met Liever niet blijft alles staan. De duur van die training volgt de instap (driekwart of de helft).
- Zonder Akkoord zegt Vandaag op een dag met alleen herstel na meer dan zeven dagen zonder echte training eerlijk: "Je trainde N dagen niet. Vandaag rustig beginnen: houd je eerste training korter dan gewoon." Met Hersteldag (licht bewegen) staat er "wandel een half uur, en" voor. Niet op een vakantie- of tochtdag en niet tijdens Weer opbouwen na ziekte. N is afgeleid uit de logs (dagen sinds je laatste training die geen herstel is). Dat is alleen tekst in plaats van "Je lichaam bouwt op wat je deze week deed"; het plan verandert er niet door.

## Reden

Nagespeeld met een nagemaakte staat van dezelfde vorm (`src/engine/terugkeerRustdag.test.ts`): laatste krachttraining twaalf dagen terug, zonder sportschool van T-9 tot en met T-5 met twee dagen ziek, de laatste vijf dagen alles overgeslagen of verplaatst, vandaag een maandag met de vaste Herstelwandeling. Die gemelde vorm geeft op main na I-124 al het voorstel (dag terug T-4). De oorzaak van de melding is daarmee niet bewezen; het meest waarschijnlijk draaide de app nog de bouw van voor I-124, waarin het voorstel maar vier dagen stond. Wel een tweede gat: eindigt de periode op T-8 of eerder, dan noemde `proposeReentry` de terugkomst voorbij, ook zonder training sindsdien, en de maandag met weinig training kwam er ook niet, want een terugkomst in de laatste twee weken gaat voor. Die test ligt nu vast, met de gemelde vorm erbij.

Een herstelwandeling na twaalf dagen zonder training is geen herstel: er is niets om van te herstellen. Wie na de terugkomst al trainde, heeft dat wel; dan ruilt er niets. Zware benen komen nooit binnen 48 uur na een zware beensessie naar voren, want de ruil krijgt het slot van een voorstel en de ronde repareert hem dan niet meer (Warden).

## Alternatieven

- De Herstelwandeling stil vervangen. Niet gekozen: alles wat de planning inhoudelijk verandert gaat via een voorstel met Akkoord.
- Een training toevoegen op de eerste dag in plaats van ruilen. Niet gekozen: dan heeft de eerste week terug een training meer dan een gewone week. Ruilen houdt de week gelijk.
- De eerste week vanaf de laatste training tellen in plaats van vanaf de terugkomst. Niet gekozen: het id hoort bij de terugkomst (valkuil in het werkbriefje planning).

## Bron

Melding van de eigenaar (I-144): "Vandaag staat er een rustdag, maar ik heb de hele week niks gedaan." Nagespeeld met de skill naspelen, zonder echte back-up.

## Vervangt

`2026-11-23-terugkeer-na-pauze.md` op één punt: "De dag na die eerste week niet meer" geldt alleen nog als je na de terugkomst trainde. De rest van dat besluit blijft.

## Terugdraaien

De pauze: in `proposeReentry` de toets weer `daysBetween(back.day, today) > OFFER_DAYS` zonder `firstAfter`. De eerste dag: `firstDay` uit `proposeReentry` halen; zonder `reentryFirstDay` op het advies gaan er geen `startItems` mee. De tekst op Vandaag: `pauseRestDayLine` uit `Today.tsx` halen. Er is geen opgeslagen vorm veranderd.
