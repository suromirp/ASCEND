# Teksten Lichaam en Instellingen volgens de stemgids

Datum: 2026-11-09
Status: aangenomen

## Besluit

Stap 3 van de stemgids is gedaan voor Lichaam en voor Instellingen (R9). De uitleg achter de i is ingekort naar één zin vooraf en hoogstens drie punten. Voor de naam van een instelling geldt: de rij is de naam.

## De afspraken die hieruit volgen

1. De rij is de naam. De uitleg achter de i heet zoals de rij. De zoekindex heet zoals de rij, met de naam van het blad ervoor als de rij in een blad staat en los niets zegt ("Run in detail: patronen tonen", "MacroFactor: laatste export", "Back-up: vaste map"). Een uitleg die bij een blad en bij een rij hoort, heet zoals het blad.
2. Een oude naam verdwijnt niet uit het zoeken: hij staat als trefwoord bij de instelling ("momentopnamen", "ochtendmelding", "geluidseffecten", "loopjes").
3. De lengte is "ongeveer 40 woorden" en geen harde grens. Een onderwerp mag langer zijn als het een getal of regel op het scherm uitlegt, als het drie instellingen in één blad beschrijft (Hoe sporten meetellen), of als er een waarschuwing over zorg, gezondheid of privacy in staat. Die waarschuwing blijft volledig (Vroeg ziek zien, Lawinegevaar, Weerwaarschuwingen, Ochtendgetallen in back-up, Groei van de lange loop).
4. Waar de uitleg zei dat je planning pas na jouw Akkoord verandert, staat nu de vaste zin: "Eerst een voorstel, pas na Akkoord verandert er iets." Waar de oude tekst alleen zei dat je eerst ziet wat er verandert (Golven, Beginnersstart, Sporten), is dat zo gebleven: die instellingen volgen je keuze bij Wijzigingen, en bij Deels zelf of Alles zelf komt er niet altijd een Akkoord. Bij Blessures staat de zin niet, want melden verandert je planning niet.
5. Bij het inkorten zijn geen nieuwe beloftes gemaakt. Een zin is korter gemaakt of weggelaten, niet verzonnen. Waar de oude zin niet meer klopte met de code, is de zin aangepast en niet de code.

## Eigen keuzes buiten de opdracht

- In het blad "Hoe voelt je lijf?" staat de spoedtekst van een plek nu buiten de inklap, zoals op de plekpagina. Dat is een verplaatsing van één regel en geen tekst. Reden: een spoedtekst ("bel direct je huisarts of 112") staat nooit achter een tik.
- De Forge-uitleg in `settingsHelp.ts` en de Forge-regels in `settingsIndex.ts` zijn niet aangeraakt: daar loopt een andere bouwer, en R10 doet de Forge-tab. Ook `stravaTekst` is niet aangeraakt, die is net herschreven.
- De uitleg bij Gewicht op Je stand zei "Een tik opent Lichaamsgewicht". De kaart opent sinds het overzicht Gewicht dat overzicht. De zin is aangepast.
- Bij Toestemmingen is het punt Health Connect ("komt later") weggehaald: het klopte niet meer. De zoekregel zegt nu "en Health Connect" in plaats van "en straks Health Connect". Het punt Widget is gebleven, want het zegt wat er van je bewaard wordt. Toestemmingen en Vroeg ziek zien hebben daardoor vier punten in plaats van drie.
- Drie namen buiten de uitleg zijn meegetrokken, omdat ze hetzelfde ding anders noemden: het voorstel heet "Twee trainingen per dag" (was "Meerdere trainingen op één dag"), het blad heet "Ochtendvraag" (was "Ochtendmelding") en de schakelaar bij Garmin heet "Details van lopen en tochten".
- Besluit van de coördinator na de eerste oplevering (9 november): de lijst "Naar een fysio of je huisarts bij" staat altijd open, op de plekpagina en in het blad "Hoe voelt je lijf?". Alleen de inklap is weg, de woorden zijn gelijk. In het blad staat de regel "Naar een fysio of je huisarts bij" er nu ook boven, zoals op de plekpagina. De test `src/components/lichaam/lichaamZorg.scan.test.ts` legt het vast.
- Besluit van de coördinator (9 november): een uitlegzin moet altijd kloppen met de code. Een instelling die je keuze bij Wijzigingen volgt (Trainingstijd per dag, Aangepaste instellingen en Alles terugzetten, Beginnersstart, Golven, Sporten, Beenkracht de dag na de lange duurloop) zegt nu: "je planning verandert zoals je bij Wijzigingen koos: eerst een voorstel, of meteen met een melding en ongedaan maken." De vaste zin staat alleen nog waar bij elke stand van Wijzigingen een voorstel met Akkoord volgt. Bij Twee van drie stond de vaste zin al langer, maar je antwoord wordt meteen bewaard. Daar staat nu "Je planning verandert er niet vanzelf door."
- Blijft liggen voor een volgende ronde: het veld `openFysio` in `engine/bodyCheck.ts` leest de interface niet meer (dode code met twee asserts), en zoeken op "vaardigheidsdoelen" vindt de rij niet meer sinds een andere bouwer hem "Calisthenicsdoelen tonen" noemde. Die regel heb ik laten staan zoals hij is.
- "Loopinzicht: ..." in de zoekindex heet in het blad "Inzicht na een training". Dat is niet gelijkgetrokken: de kaart op Je stand heet Loopinzicht en het woord staat als trefwoord. Het is een punt voor later.

## Reden

De uitleg achter de i had gemiddeld 86 woorden per onderwerp, met uitschieters tot 250. Niemand leest dat op een telefoon. Na deze ronde is het voor de onderwerpen buiten Forge gemiddeld 66 woorden. Dat is meer dan 40: de meeste onderwerpen leggen een getal of een regel uit, en die zinnen zijn gebleven (les uit de review van R6 en R7).

## Alternatieven

Hard afkappen op 40 woorden: dat haalt de uitleg van getallen en de zorgzinnen weg. De zoekindex precies de rijtitel geven: "Vaste map" of "Patronen tonen" zegt in een zoekresultaat niets.

## Bron

`docs/beslissingen/2026-11-09-stem-van-ascend.md`, de backlog bij R6 tot R9, en de verschillen in `docs/teksten/verschil-lichaam.md` en `docs/teksten/verschil-r9-instellingen.md`.

## Vervangt

Niets.

## Terugdraaien

Zet `src/data/settingsHelp.ts`, `src/data/settingsIndex.ts` en de Lichaam-bestanden terug naar de commit voor deze ronde. Er is geen opgeslagen vorm, waarde of standaard veranderd.
