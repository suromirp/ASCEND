# Een MacroFactor-training met een te lange duur

Datum: 2026-10-29
Status: aangenomen

## Besluit

Een nieuwe training uit het MacroFactor-bestand die alleen om de duur "te lang" staat (meer dan 300 minuten, `LONGEST_PLAUSIBLE_WORKOUT_MIN`) krijgt in zijn rij de rustige actie "Duur aanpassen". Het blad vraagt de duur in minuten, begint met wat ASCEND al verwacht voor die training (`engine/durationLearning.ts#predictDuration`: eigen mediaan, anders je schatting, anders die van het sjabloon) en zegt "Het bestand zegt 6 uur 16 min. Je klok liep waarschijnlijk door." Opslaan zet de rij bij de gewone rijen, aangevinkt. Er is geen keuze "Zonder duur": een krachtlog zonder minuten valt weg uit de belasting en de beenindex (review van Warden), dus er staat altijd een duur.

Bij "Alles verwerken" wordt de log gemaakt met de gekozen duur. De duur uit het bestand blijft bewaard op de log in `SessionLog.fileDurationMinutes`, een klein optioneel veld. De berekening zit in `engine/macrofactorDuration.ts` (puur, met tests); de kaart bewaart de keuze per training tot de knop wordt gebruikt en slaat zelf niets op.

## Reden

De eigenaar begon een training, moest na de bench press weg en deed de rest een dag later. De klok liep door en MacroFactor noteerde 6 uur 16 min voor minder dan een uur werk. De rij bleef onder "Eerst even kijken" en ging bij aanvinken met de geplande duur de log in, zonder dat hij kon kiezen.

## Alternatieven

- Geen instelling. Het is een handeling van de gebruiker op één rij, geen keuze die de app zelf maakt; er verandert niets aan de planning en er gebeurt niets zonder dat hij het kiest. Een instelling zou alleen een tweede plek zijn voor dezelfde vraag.
- De duur uit de sets berekenen zonder de lange pauze. Het bestand heeft geen tijd per set: `engine/macrofactorImport.ts` leest één duur en één begintijd per training. Dus niet te bouwen; het voorstel is de eigen verwachting van ASCEND.
- Ook rijen die een bestaande log overnemen of aanvullen laten aanpassen. Die negeren een onmogelijke duur al (`2026-10-23-krachtduur-die-niet-kan.md`), dus er is niets te kiezen.
- De duur uit het bestand ergens in `manualMeasured` zetten. Dat hoort bij een bestaande log die wordt overgenomen en terug te zetten is; hier ontstaat een nieuwe log, dus een eigen klein veld is eerlijker.

## Bron

Gesprek met de eigenaar, met een nagemaakt bestand als testgeval.

## Vervangt

Niets. Vult `2026-10-23-krachtduur-die-niet-kan.md` aan; de grens van 240 minuten voor een duur die kan blijft (het blad accepteert 1 tot 240 minuten).

## Terugdraaien

`engine/macrofactorDuration.ts`, `components/MacroFactorDurationSheet.tsx` en de aanpassingen in `MacroFactorCard.tsx` weghalen. Het veld `fileDurationMinutes` op reeds gemaakte logs is onschadelijk en blijft gewoon staan; het wordt door niets anders gelezen.
