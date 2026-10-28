# Adviesblad compact

Datum: 2026-10-28
Status: aangenomen

## Besluit

1. **Feitregel en lijst in plaats van een alinea.** Een advies met een voorstel toont in het blad de titel, één feitregel (`Advice.lead`), de wijzigingen als lijst (dezelfde regels als "Zo ziet je week eruit") en hoogstens één tip (`Advice.tip`). Een advies zonder `lead` houdt zijn alinea (`effect`), zodat er niets verdwijnt.
2. **Het waarom zit dicht.** Het staat achter "Waarom?" en klapt niet uit zonder tik.
3. **Akkoord is gevuld als enige keuze.** Staat er maar één keuze naast Liever niet, dan is Akkoord de gevulde mint knop; zijn er meer keuzes, dan is Akkoord omlijnd. Zo blijft er één gevuld mint accent per scherm.
4. **De Pill is vervangen.** Het ronde label met de soort advies is een Eyebrow in de kleur van de soort, met het pictogram ernaast. Geen losse opmaak meer.
5. **Lead, brief en tip.** `lead` is de feitregel in het blad, `brief` de korte regel op de kaart van Vandaag (dag en feit, bijvoorbeeld "Di 27 okt: 2:16 stilgestaan"), `tip` de ene praktische regel onder de lijst. TEST-RETRY levert alle drie; andere adviezen volgen later. De pure helpers staan in `engine/adviceText.ts`, met tests.

## Reden

Het blad was een muur van tekst: drie alinea's voor een voorstel dat uit een paar wijzigingen bestaat. Wie wil weten wat er gebeurt, ziet nu eerst het feit en dan precies wat verschuift.

## Alternatieven

- Alles inklappen achter een tik: de wijzigingen zijn het antwoord op "wat doet dit met mijn week", dus die blijven zichtbaar.
- Overal tegelijk invoeren: eerst TEST-RETRY, zodat de andere adviezen niet stil van toon veranderen.

## Gevolg

De kaart op Vandaag toont titel plus één korte regel. Planning, logs en opgeslagen vormen veranderen niet. `planGolden.test.ts` verandert niet.
