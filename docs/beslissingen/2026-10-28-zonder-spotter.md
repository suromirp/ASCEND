# Nooit tot falen zonder spotter

Datum: 2026-10-28
Status: aangenomen

## Besluit

Bij een stangoefening waar falen gevaarlijk is (bankdrukken en schuin bankdrukken met een stang, squat met een stang) schrijft Forge minstens 1 herhaling in reserve voor, in het doel en in de hint. Dat geldt niet als de sportschool veiligheidsarmen of een rek met vangers heeft, en niet als de instelling "Zonder spotter" uitstaat (advies: aan). Het is een voorschrift, nooit een blokkade: je kunt altijd 0 invullen, dat wordt bewaard zoals je het deed.

## Reden

Alleen trainen met een stang op je borst of schouders en tot het uiterste gaan kan je klem zetten. Een set met 1 over geeft bijna dezelfde prikkel (reps in reserve, `docs/onderzoek/Kracht loggen en progressie.md`) zonder dat risico. De keuze is aan jou: de instelling en het veiligheidsrek per sportschool halen het voorschrift weg.

## Hoe het werkt

`Exercise.failureRisk` staat bij acht stangoefeningen (`data/exercises.ts`); toestellen, kabels en dumbbells hebben het niet. `GymProfile.spotterRack` is de keuze per sportschool. `AppSettings.strengthModel.noSpotter` is de instelling (rij Zonder spotter in Forge, rij Veiligheidsarmen onder Je sportschool, uitleg in `data/settingsHelp.ts`, in `settingsIndex`, `settingsLayout`, `settingsSummary`, `settingsDiff` en de back-up). `engine/spotter.ts#spotterSlot` verhoogt het voorschrift voordat het model rekent, in `planExercise`, dus ook na ruilen. Een set tot het uiterste wordt een gewone set met 1 over.

Het teken is hoogstens één per oefening, bij de eerste open set die is opgehoogd: een schild en "1 over, zonder spotter", gedempt, met uitleg achter een tik. Geen pop-up. Vul je zelf 0 in, dan verdwijnt het teken.

Raak (`prescriptionCheck`, `strengthHistory.ts#comparisonRows`): het voorstel van ASCEND met de bewuste 1 waar de planning 0 voorschreef wordt aan zijn eigen doel getoetst en telt niet als misser. Wat jij deed blijft getoetst aan wat de planning vroeg. De instelling zit in `checkModelKey`, zodat een andere keuze de telling opnieuw doet.

## Alternatieven

- Een pop-up bij het begin van de oefening: afgewezen, het houdt je tegen.
- De reserve niet aanpassen maar alleen waarschuwen: afgewezen, het voorschrift zelf hoort veilig te zijn.
- Een eigen lijst van oefeningen per gebruiker: nu niet, de lijst is klein en staat bij de oefeningen.

## Bron

Ontwerp in `docs/visie/Forge logboek en spotter.md`; reserve in de training volgt `docs/beslissingen/2026-10-25-bijsturen-in-forge.md`.

## Vervangt

Niets.

## Terugdraaien

Zet Zonder spotter uit, of zet Veiligheidsarmen aan bij je sportschool. Opgeslagen sets zijn nooit veranderd.
