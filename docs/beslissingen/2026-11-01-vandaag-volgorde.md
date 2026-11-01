# Vaste volgorde op Vandaag, hoogstens één kaart boven de missie

Datum: 2026-11-01
Status: aangenomen

## Besluit

De kaarten die op Vandaag met de missie om de plek bovenaan concurreren krijgen één vaste rangorde
(`engine/todayCards.ts`): eerst ziek zijn of weer opbouwen en het vroege ziektesignaal, dan de ochtendkaart,
dan het advies voor vandaag (de coachkaart, ook de rustdag terug), dan de vraag over een training die niet
doorging (Niet gedaan? of het koppelvoorstel), dan onderhoud (Nieuw begonnen, de back-up). Hoogstens één
kaart staat boven de missie; de rest staat direct onder de missie, in dezelfde volgorde. Het maximum is
instelbaar bij Kaarten op Vandaag: Eén (advies), Twee of Alles.

Een advies over je planning en de vraag over een training die niet doorging staan nooit boven de missie, ook
niet met Alles: die beantwoord je rustig in een blad, en de missie gaat voor.

Twee regels erbij voor de kaart Training die niet doorging (`engine/missedTraining.ts`):
- Zolang je ziek gemeld bent wachten Niet gedaan?, het koppelvoorstel en Zelf overslaan. Ben je beter, dan
  komen ze terug, nog steeds binnen veertien dagen gerekend vanaf de training.
- Eerst koppelen, dan inhalen. Kan een losse log van je horloge of MacroFactor bij een gemiste training horen,
  dan staat het koppelvoorstel er en komt het inhaalvoorstel (MISSED-CATCH-UP) voor die training niet. Zeg je
  Liever niet op dat paar, of staat koppelen uit, dan komt het inhalen terug. De kaart en het advies lezen
  dezelfde functie (`linkCandidates`).

## Reden

Op een slechte ochtend stonden er vier kaarten boven de missie (gemeten op 360 bij 800 px met vertraagde
processor, nagemaakte stand: de missiekaart begon op 1462 px). Elk scherm moet binnen twee seconden zeggen wat
je missie vandaag is. Met één kaart erboven begint de missie in dezelfde stand op 478 px. Wie liever alles
bovenaan heeft, kiest Alles.

Een vraag over een training van voor je ziekte is zinloos zolang je ziek bent: je kunt er niets mee, en het
zegt je alleen wat je mist. Een inhaalvoorstel voor een training die misschien al gedaan is (de log staat los
in je horloge) zet een tweede training in je week die je niet nodig hebt.

## Alternatieven

- Kaarten samenvoegen tot één stapel met "nog 3": verbergt een waarschuwing over ziekte achter een tik, en
  waarschuwingen en zorgteksten staan nooit achter een tik.
- Een maximum zonder rangorde (de eerste die laadt wint): de volgorde zou per opening verschillen.
- Het advies en de vraag over gisteren ook boven de missie laten mogen: dan staat er bijna elke dag een kaart
  boven de missie, en die vragen kunnen wachten.
- De ochtendkaart kleiner maken: helpt ook, maar is een herontwerp van die kaart en hoort niet bij deze
  wijziging.

## Bron

`docs/onderhoud/reflectie-2026-11-01.md`, kopje "Klopt het geheel?". CLAUDE.md: elk scherm beantwoordt binnen
twee seconden wat je missie vandaag is.

## Vervangt

Niets. Vult `2026-11-01-niet-doorgegaan.md` en `2026-10-29-gemiste-training-inhalen.md` aan.

## Terugdraaien

Kies Alles bij Kaarten boven de missie om de oude plek van de kaarten terug te krijgen (op het advies en de
vraag over gisteren na, die blijven onder de missie). In de code: `arrangeToday` vervangen door de vaste
lijst in `Today.tsx`; het wachten tijdens ziekte zit in de eerste regel van `planMissed`, eerst koppelen in
`linkable` in `missedAdvice`.
