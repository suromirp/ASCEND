# Een tocht door heuvels krijgt de bergtocht

Datum: 2026-10-22
Status: aangenomen

## Besluit

Het terrein van een tocht kiest de wandeling per tochtdag: vlak de rugzakwandeling (`tpl_ruck_walk`), heuvels, bergen en sneeuw de bergtocht (`tpl_mountain_hike`). Dit verandert de regel over terrein in `2026-10-22-zware-beendag-na-tocht.md`, waar heuvels nog de rugzakwandeling kregen.

Wat er echt geldt: de rust tussen zware beendagen (`engine/scheduler.ts#legSpacingDays`, 72 uur na een tocht met veel dalen, anders 48 uur) geldt alleen tussen twee beenzware sessies. De bergtocht is beenzwaar (`lowerBodyLoad` zwaar), de rugzakwandeling niet (matig). Na een rugzakwandeling geldt de 72 uur dus niet, en een rugzakwandeling telt ook niet als zware beendag voor de beenindex. De zin "De 72 uur blijft ook na een rugzakwandeling gelden" in het eerdere besluit klopte niet.

## Reden

Een meerdaagse heuveltocht met zware rugzak werd een rugzakwandeling en telde niet mee voor de beenrust, terwijl zulke dagen de benen wel flink belasten. Heuvels met een zware rugzak horen bij de bergtocht.

## Alternatieven

Heuvels als rugzakwandeling laten en de beenzwaarte van die template verhogen. Verworpen: dat verandert de planning ook buiten tochten.

## Bron

Review van de tochten op 22 oktober 2026.

## Vervangt

Niets. Corrigeert de zin over de 72 uur en de keuze voor heuvels in `2026-10-22-zware-beendag-na-tocht.md`, dat zelf ongewijzigd blijft.

## Terugdraaien

Zet `uneven_trail` in `engine/leaveBlock.ts#trekTemplateFor` terug bij de vlakke terreinen.
