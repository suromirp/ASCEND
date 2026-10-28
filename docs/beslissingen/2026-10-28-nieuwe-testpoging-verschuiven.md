# Nieuwe testpoging: eerst verschuiven, dan pas laten vervallen

Datum: 2026-10-28
Status: aangenomen

## Besluit

Herstel op `2026-10-28-nieuwe-testpoging-herstel.md`, dat zelf ongewijzigd blijft. Waar dit besluit iets anders zegt, geldt dit besluit.

1. **Verschuiven gaat voor vervallen.** Maakt een zware beendag de benen op de testdag te moe, dan gaat hij eerst door dezelfde verplaatslus als TEST-MAKE-ROOM: doelen 0 tot 3 dagen na de test, met `respectsHeavySpacing`, `leavesNextHardFresh`, `dayHasRoomFor`, de vrije dagen, tochten en lichte dagen overgeslagen. Pas als hij nergens past, vervalt hij (`remove`, met naam en reden).
2. **Volgorde.** Lange duurlopen en harde lopen schuiven eerst, de beenkracht als laatste, zodat een dag die vrijkomt meetelt.
3. **Wat jij vastzette.** Ook een door jou vastgezette beendag krijgt eerst een verschuiving, met naam: "Benen A (zwaar), die je zelf vastzette, gaat naar ma 2 november." Laten vervallen is dan de tweede optie (`options`), of de terugval als hij nergens heen kan. Dit wijzigt punt 2 van `-herstel.md`, waar vervallen de enige weg was.
4. **Gewicht.** Een verschuiving van een systeemtraining weegt 2, van een eigen training 3. Vervallen weegt 5 voor het systeem en 8 voor een eigen training, dus vervallen weegt zwaarder dan verschuiven en eigen zwaarder dan systeem.
5. **Een stem per sessie.** Voor TEST-RETRY telt elke sessie die in een ander voorstel staat (rustdagruil, voortrekken, afstandsvoorstellen en alle andere voorstellen die een sessie raken) als gebruikt.
6. **De stille beenregel.** De regel in het voorstelblad ("op za is je beenindex ongeveer 13") rekent op de eindstand van het voorstel, niet op de planning van nu.

## Reden

De eerste versie liet een beendag meteen vervallen, ook als hij naar na de test kon, en een vastgezette beendag kon alleen vervallen. De stille regel in het blad noemde een index die na Akkoord niet meer klopt.

## Alternatieven

- Alleen bij een vastgezette beendag vervallen aanbieden. Dat is wat het was, en schrapt een training waar een verschuiving volstaat.
- De stille regel verbergen bij zo'n voorstel. Rekenen op de eindstand zegt hetzelfde als de weekcontrole en blijft nuttig bij gewone verplaatsingen.

## Gevolg

De standaardweek (wo Bovenlichaam A, do Benen A, vr Bovenlichaam B, za Heuvelintervallen, zo Lange duurloop, ma Herstelwandeling, di Bovenlichaam A, wo Benen A, test op di met 136 seconden stilstand in 4 stops) geeft, met en zonder lock op Benen A, hetzelfde voorstel: "Lange duurloop van zo 1 november doe je op ma 2 november in plaats van je rustdag. De herstelwandeling van die dag vervalt. Benen A (zwaar) van do 29 oktober laat je deze week gaan, zodat je benen zaterdag fris zijn." Er is geen dag na de test waar Benen A past. Is zondag 1 november leeg, dan gaat Benen A daarheen ("gaat naar zo 1 november, na de test", met lock "die je zelf vastzette, gaat naar zo 1 november" en vervallen als tweede optie). Na Akkoord geeft `computeAdvice` geen TEST-MAKE-ROOM en `planPass` geen herstelling, met en zonder `setFreshnessContext`. `planGolden.test.ts` verandert niet.

## Bron

Review door Warden en een doorloop in de browser van Lookout.

## Vervangt

Niets. Vult `-herstel.md` aan en wijzigt punt 2 ervan.

## Terugdraaien

Zet in `retryPlansFor` de verplaatspoging voor beendagen weer uit, zodat alleen `remove` overblijft.
