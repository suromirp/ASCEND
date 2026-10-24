# Het beste moment van de dag voor een buitentraining

Datum: 2026-10-24
Status: aangenomen

## Besluit

Is het weer op het uur waarop je gewoonlijk traint slechter dan in een blok eerder of later op dezelfde dag, dan staat er onder de weerregel één rustige regel in gedempte inkt: "Beste moment: 16 tot 17.30 uur, droog". Is het gewone uur al prima, of is er geen beter blok, dan staat er niets extra. Het is een aanwijzing en geen planning: er verschuift niets en er is geen voorstel met Akkoord. Een andere dag zoeken blijft het ruilvoorstel van `2026-10-22-weer-open-meteo.md`.

## Reden

De eigenaar vroeg om het beste moment van de dag voor een buitentraining, "lekker subtiel". Een training die je 's avonds doet kan met één uur eerder of later in de droge uren vallen, en dat kost geen handwerk om te weten. De regel staat waar je het weer al leest (de missiekaart van Vandaag, het trainingsblad en bovenaan Weer), en alleen als hij iets zegt. Geen nieuwe kaart, geen knop, geen kleur buiten de tokens: `--color-ink-dim`.

De regels staan in `src/engine/bestMoment.ts` (`BEST_MOMENT_RULES`) en gebruiken dezelfde beoordeling als de weerregel: de blokken worden met `sessionWeather` beoordeeld, dus "beter" betekent hier hetzelfde als daar.

Wat een blok is: een start op een heel uur en de duur van de training, zoals de weerregel hem ook rekent (de uren van de voorspelling waar de training in valt). Het einde staat naar boven afgerond op vijf minuten.

Wat "beter" is, alleen een drempel van `WEATHER_RULES` die het gewone uur overschrijdt en het blok niet:

- Het blok heeft een klasse hoger: van slecht naar let op, of van let op naar prima.
- Of de klasse is gelijk, er komt niets nieuws bij en er is een reden weg: de regen of de wind blijft onder de drempel, of de mist, hitte of kou is weg.
- Minder regen die nog steeds regen is (6 mm tegen 1,5 mm) telt niet. Een venster dat een uur opschuift halveert een bui altijd, en dat is ruis.
- Een blok dat zelf slecht weer heeft wordt nooit aangeraden.

Waar een blok mag liggen:

- Helemaal in daglicht: niet voor zonsopkomst en niet na zonsondergang (hetzelfde `lampNeeded` als de weerregel). Heeft de voorspelling geen zonsopkomst en zonsondergang, dan van 7 tot 21 uur.
- Niet in het verleden: op vandaag begint een blok op het eerstvolgende hele uur vanaf nu. Is het beste uur voorbij, dan staat er niets.
- Een blok later of eerder op de dag mag, ook een kort blok. Het blok dichtst bij het gewone uur wint van gelijke blokken, daarna het eerste.
- Niet verder dan drie dagen vooruit, dezelfde grens als het ruilvoorstel: een voorspelling per uur wisselt daarna te vaak.
- Een training die al gedaan is (een log van dezelfde training op die dag) krijgt niets.

Donker maakt het gewone uur niet slechter. Een hardloper die na het werk traint, zou anders de hele winter een blok rond de middag aangeraden krijgen. Het gewone uur in het donker komt wel in de reden terug als er een weerreden is: "droog en licht".

De reden zegt wat er beter is dan op het gewone uur, in hoogstens twee woorden: "droog", "minder regen", "minder wind", "geen onweer", "koeler", "milder" en "licht".

De schakelaar "Beste moment tonen" staat bij Vandaag en meldingen, onder Weer, standaard aan. Hij staat in `OverviewSettings.bestMoment`, een optioneel veld: ontbreekt het in een oude back-up, dan leest het als aan, dus er is geen migratie nodig. Hij geldt voor de weerregel op Vandaag en in het trainingsblad en voor de kaart bovenaan Weer. Staat de weerregel zelf uit, dan staat de regel op Vandaag er ook niet.

## Alternatieven

Een voorstel met Akkoord om het uur te verplaatsen: de app weet je dag niet, alleen het uur waarop je gewoonlijk traint, en het blok is een tip. Een blok op de kwartier: een voorspelling per uur is niet preciezer. Donker als reden: zie boven. Een regel ook als het blok maar een beetje beter is: botst met "geen ruis". Een blok op een andere dag: dat is het ruilvoorstel.

## Bron

De eigenaar, 24 oktober 2026: "Het beste moment van de dag voor een buitentraining. Ja, helemaal top. Lekker subtiel." Code: `src/engine/bestMoment.ts` met tests in `src/engine/bestMoment.test.ts`, de weergave in `src/components/WeatherLine.tsx` en `src/components/WeatherTodayCard.tsx`. De drempels en de klassen komen uit `docs/beslissingen/2026-10-22-weer-open-meteo.md`.

## Vervangt

Niets.

## Terugdraaien

Zet de schakelaar uit. Of haal de regel `best` en de twee plekken waar hij getoond wordt weg uit `WeatherLine.tsx` en `WeatherTodayCard.tsx`. Het veld `bestMoment` in de instellingen blijft dan ongebruikt staan en is onschadelijk.
