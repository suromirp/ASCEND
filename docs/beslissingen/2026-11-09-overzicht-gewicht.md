# Overzicht Gewicht achter de kaart op Je stand

Datum: 2026-11-09
Status: aangenomen

## Besluit

Een tik op de kaart Gewicht op Je stand opent een eigen overzicht Gewicht, niet meer het blad Lichaamsgewicht uit Instellingen. De lijn op de kaart en in het overzicht komt alleen uit echte wegingen: een trendgewicht uit MacroFactor (`basis: 'trend'`) telt nooit als losse weging.

## Hoe het werkt

Het overzicht (`components/stand/WeightOverviewSheet.tsx`, een blad zoals de andere bladen) toont van boven naar beneden: het gewicht groot (hetzelfde getal als de kaart en het blad Lichaamsgewicht, via `weightShown`), de keuze 4 weken, 3 maanden of Een jaar, de grafiek met je wegingen als stippen en de trend als lijn, de verandering per week en over de periode, het vetpercentage als dat er is en Vetpercentage tonen aan staat, de lijst van wegingen met datum, bron en kilo, Weging toevoegen, en onderaan Instellingen voor gewicht (opent het blad Lichaamsgewicht eroverheen).

De lijn (`engine/weightTrend.ts#weightLineAt`). Op elke dag is de lijn het gewogen gemiddelde van de echte wegingen in de 14 dagen tot en met die dag, met dezelfde halfwaardetijd en dezelfde uitschieterregel als de trend. Een dag met een trendgewicht uit MacroFactor telt met de weging van die dag (`scaleKg`); zonder die weging telt de dag niet. Alleen als er in die 14 dagen geen enkele echte weging is, staat het trendgewicht van de bron zelf op de lijn, want dat is al een trend. Met Gewichtstrend gebruiken uit is de lijn de laatste weging.

De kaart (`engine/weightCard.ts#weightCardData`) tekent zijn zes weekpunten met dezelfde `weightLineAt`. De vreemde V kwam doordat de kaart per week het getal van `weightShown` nam: tot de overstap het trendgewicht van MacroFactor en daarna losse wegingen.

De verandering (`engine/weightOverview.ts#weightOverview`). Het verschil tussen het laatste en het eerste punt van de lijn in de periode. Onder een week tussen die punten staat er geen verandering; per week staat er pas vanaf twee weken. Vult de lijn de periode voor minstens 85 procent, dan staat de periode erbij ("in 4 weken"), anders de echte duur ("in 9 dagen", "in 21 weken").

De lijst. Per dag de weging. Een dag uit MacroFactor met alleen een trendgewicht staat erin als "MacroFactor, trendgewicht" en is geen stip in de grafiek. Eerst zeven regels, daarna Alle wegingen tonen.

Weging toevoegen bewaart een weging van vandaag met bron zelf ingevuld, zoals Zelf invullen in het blad Lichaamsgewicht (`addWeightEntry`). Het veld wordt niet vooraf gevuld met de trend.

Instelling. Overzicht Gewicht opent op (`AppSettings.weightRange`: 4 weken, het advies, 3 maanden of een jaar), in het blad Lichaamsgewicht. In het overzicht zelf kies je elke keer vrij; die keuze wordt niet bewaard. Optioneel veld, geen schemastap; een kapotte waarde valt weg in `storage/backupClean.ts`. De plekken: `data/settingsIndex.ts`, `data/settingsLayout.ts`, `data/settingsChoices.ts`, `engine/settingsSummary.ts`, `engine/settingsDiff.ts`.

## Reden

De eigenaar (9 november) tikt op de kaart en verwacht een overzicht, geen instellingen. En de lijn op de kaart klopte niet met wat hij woog.

## Eigen keuzes van de bouwer

- Een blad en geen pagina: geen andere kaart op Je stand heeft een eigen pagina, en een blad sluit met de terugknop.
- De lijn telt ook met één of twee wegingen in de 14 dagen (het grote getal vraagt er drie). Anders springt de lijn op de dag dat de derde weging binnenkomt, en wie om de twee weken weegt zou nooit een lijn zien. Gevolg: met precies twee wegingen kan het eind van de lijn een paar tienden afwijken van het grote getal, dat dan de laatste weging is.
- De lijn rekent op twee decimalen; op één decimaal werd hij een trap. Teksten blijven op één decimaal.
- Het grote getal verandert niet: is de nieuwste dag een trendgewicht uit MacroFactor, dan staat dat er, zoals in het besluit over de gewichtstrend.
- Wat Forge, de rugzak en de beenindex gebruiken (`loadWeight`) is niet aangeraakt; `weightTrend` geeft dezelfde uitkomsten als voorheen (alle bestaande tests ongewijzigd groen).
- De regel in de Inbox van `docs/backlog.md` is niet weggehaald; dat doet de coördinator.

## Alternatieven

De lijn alleen tekenen met drie of meer wegingen: zie hierboven. Een trendgewicht zonder weging helemaal van de lijn laten: wie alleen trendgewichten uit MacroFactor heeft, zou dan geen lijn meer hebben. De gekozen periode onthouden: dan verandert een instelling stil; een eigen instelling met advies is duidelijker.

## Bron

Wens van de eigenaar, 9 november (Inbox van `docs/backlog.md`). `docs/beslissingen/2026-11-09-gewichtstrend.md`, `docs/beslissingen/2026-11-09-gewicht-buiten-instellingen.md`. Testdata nagemaakt.

## Vervangt

Uit `2026-11-09-gewicht-buiten-instellingen.md`: "Een tik opent het blad Lichaamsgewicht" en de lijn van de kaart uit `weightShown`.

## Terugdraaien

In `WeightStandCard.tsx` weer `WeightSheet` openen en in `weightCardData` weer `weightShown` per week. Het veld `weightRange` mag blijven staan; niets anders leest het.
