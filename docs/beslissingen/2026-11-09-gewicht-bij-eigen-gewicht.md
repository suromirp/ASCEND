# Gewicht bij eigen gewicht: de trend overal

Datum: 2026-11-09
Status: aangenomen

## Besluit

Forge (eigen gewicht, optrekhulp, dips), het rugzakaandeel en de beenindex rekenen met je gewichtstrend, niet met je laatste weging. Eén instelling, Gewicht bij eigen gewicht (Instellingen, Lichaam, in het blad Lichaamsgewicht), kiest: Trend (advies) of Laatste weging. Zijn er te weinig wegingen voor een trend (minder dan drie in twee weken), of is de laatste dag een trendgewicht uit MacroFactor, dan telt de laatste weging, ook bij Trend.

In Forge staat bij een oefening met eigen gewicht een klein bolletje met het gewicht en het aandeel dat als weerstand meetelt, bijvoorbeeld "84,2 kg · 50%". Een tik opent een blad met je gewicht (met waar het vandaan komt), het aandeel in procent en kilo's, de bron van dat aandeel, één zin uitleg en Gewicht aanpassen (opent het blad Lichaamsgewicht). Zonder weging staat er "Gewicht invullen · 50%".

Het aandeel (`bodyweightFraction`) is aangevuld bij de oefeningen met eigen gewicht en herhalingen die er nog geen hadden, elk met een bron in `data/bodyweightShares.ts`: Hanging Leg Raise 0,5 (schatting: je benen en heupen bewegen mee), Chest-to-Bar Pull-Up, Straight Bar Dip, Negative Muscle-Up en Muscle-Up 1 (het hele lichaam beweegt mee, zoals bij Pull-Up en Dip), Pistol Squat, Box Pistol Squat en Skater Squat 0,9 (je lichaam zonder het onderbeen en de voet van het zwevende been, de Leva 1996). Niet aangevuld: houdingen in seconden, balans (handstand, L-sit, front lever), oefeningen zonder last (banden, plank, bird dog), pike push-ups en handstand push-ups (geen meting gevonden) en de Assisted Pistol Squat (de hulp is niet te schatten).

## Hoe het werkt

Rekenen. `engine/weightTrend.ts#loadWeight` en `#loadBodyKg` lezen de wegingen die in gebruik zijn (`weightsInUse`) en geven de trend (`weightTrend`) of de laatste weging. Alle plekken die `currentBodyKg(...)` lazen, lezen nu `loadBodyKg(settings)`: Forge en het scherm Forge, de kaart van Forge op Je stand, de beenindex (`planningSync`, `useLegEase`, `useLegMoveNote`, `LegFatigueCard`), de rugzak bij de etappes en de instellingenfeiten. `currentBodyKg` zelf blijft bestaan en leest de laatste weging.

Met één weging is de trend die weging, dus de golden scenario's met een doel bewegen niet (`storage/planGolden.test.ts`).

Laten zien. `engine/bodyLoad.ts#bodyLoadView` maakt de tekst, `components/forge/BodyLoad.tsx` het bolletje en het blad. Alleen een oefening met eigen gewicht of hulp krijgt het bolletje (`carriesBodyweight`): een dumbbell-oefening met een aandeel (een split squat) en een roeioefening met 0,08 niet.

Opslag. Nieuw is alleen het optionele veld `AppSettings.weightForLoad` ('trend' of 'latest'; afwezig is Trend). Geen schemastap; een kapotte waarde valt weg in `storage/backupClean.ts`. De instelling staat ook in `settingsIndex`, `settingsLayout`, `settingsDiff` en `settingsHelp`.

## Reden

Eigenaar, 9 november: "een laatste gewicht is helemaal niet betrouwbaar". Een weging schommelt een kilo met water en eten, en bij een push-up of een dip gaat die kilo rechtstreeks in de last en in de geschatte kracht. De beenindex leest hetzelfde gewicht voor de zwaarte van een beentraining.

Het bolletje volgt de wens van de eigenaar (MacroFactor Workouts, alleen als inspiratie): klein, één getal en het aandeel, de rest pas na een tik. MacroFactor gebruikt de laatste weging, ASCEND de trend.

## Alternatieven

Het gewicht splitsen in een lastgewicht (Forge, hulp) en een beengewicht, zoals het vorige besluit voorstelde, zodat de beenindex de laatste weging houdt: de eigenaar vroeg om de trend overal, en met een trend die op één weging gelijk is aan die weging verandert er voor wie weinig weegt niets. De instelling geeft een weg terug. Het aandeel per oefening zelf te laten kiezen: te veel keuze voor een schatting; de bron staat in het blad.

## Bron

Opdracht van de eigenaar via de coördinator (backlog F5). `2026-11-09-gewichtstrend.md`, `2026-11-09-gewicht-buiten-instellingen.md`, `docs/onderzoek/Lichaamsgewicht in de last bij beenoefeningen.md` (de Leva 1996, de lichaamsdelen), `docs/onderzoek/Calisthenics in apps en wetenschap.md` (Wurm en Ebben 2010 voor de push-up).

## Vervangt

Van `2026-11-09-gewichtstrend.md` het stuk "Waarom het rekenen nog niet verandert" en de regel "In deze stap verandert alleen wat je ziet". De rest blijft.

## Terugdraaien

Voor de gebruiker: Gewicht bij eigen gewicht op Laatste weging. In de code: `loadBodyKg` laten teruggeven wat `currentBodyKg` geeft; het veld `weightForLoad` mag blijven staan.
