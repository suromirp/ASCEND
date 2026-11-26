# Rustdag schuift mee (I-162, I-150)

Verslag van Sherpa Rustdag, 26 november. Tak `claude/rustdag-schuift`, vanaf `claude/bouwmoment-25nov`.

## Bewijs

Een nagemaakte week (ma 23 tot zo 29 november), vandaag maandag. Je sleept de Rustige duurloop van donderdag naar dinsdag, waar je rustdag staat. Dezelfde stand staat in `src/storage/rustdagSchuift.test.ts` en `src/engine/restDayFollows.test.ts`.

Voor de sleep:
- ma 23: Bovenlichaam A
- di 24: Rustdag, bewust herstel
- wo 25: vrij
- do 26: Rustige duurloop
- vr 27: Benen A (zwaar)
- za 28: vrij
- zo 29: Lange duurloop

Na de sleep (meteen toegepast, zoals altijd; Ongedaan maken in de melding):
- di 24: Rustdag en Rustige duurloop
- do 26: vrij

Dan één blad Schema-aanpassing, met de rij Rustdag van 24 november naar 26 november, met de regel "Rustige duurloop staat nu op je rustdag. Je rustdag kan naar do 26, die dag is nu vrij." Links Liever niet, rechts Akkoord.

Na Liever niet: de week blijft zoals na de sleep. Na Akkoord:
- di 24: Rustige duurloop
- do 26: Rustdag, bewust herstel

Ongedaan maken in de melding zet de rustdag terug op dinsdag; de duurloop blijft op dinsdag.

I-150: doe je op dinsdag de tempoloop van donderdag, dan zegt de rustdagrij van dinsdag "Di 24 · Tempoloop gedaan" in plaats van "bewust herstel". De tempoloop blijft in Week op donderdag ("gedaan di 24"), zoals het besluit over het dagbeeld wil. Twee trainingen: "2 trainingen gedaan".

## Wat er gebouwd is

- `src/engine/restDayFollows.ts`: `restDayFollowProposal` kiest de dag, `restDayFollowAfterMove` rekent hem uit na jouw verplaatsing. Puur en deterministisch.
- `src/pages/Week.tsx#moveTo`: na een verplaatsing die meteen gaat, en na Akkoord op een verplaatsing die eerst vroeg, opent het blad met het voorstel. Slepen en Verplaatsen in het blad lopen allebei door `moveTo`.
- `src/engine/dayPlan.ts#restRowLine` en `src/components/WeekPlanner.tsx`: de tweede regel van een rustdagrij.
- Instelling Rustdag schuift mee in Planning, onder Dagen en tijd, standaard aan (`restDayFollows`, leeg is aan). Verklaring in `src/engine/settingsDefs/planning.ts`, uitleg in `uitleg/planning.ts`, waarde in `settingsSummary.ts`, advies in `settingsDiff.ts` direct na Op je rustdag (ook in beide lijsten van `order.ts`).

## Keuzes

- Welke dag: de vrijgekomen dag als die vrij is, niet voorbij (vandaag telt als niet voorbij) en in dezelfde week ligt. Anders de vrije dag van die week die het dichtst bij de oude rustdag ligt, bij gelijke afstand de latere (rust na de training die nu op die dag staat). Geen vrije dag: geen voorstel. Het briefje geeft hier geen advies; dit volgt de opdracht.
- Test of wedstrijd: de rustdag komt nooit op een dag direct naast een test of wedstrijd. Ik las "als dat een test- of wedstrijddag naast zou zetten" zo; de rust voor een test en de raceweek hebben hun eigen regels. Is dat anders bedoeld, dan is het één regel (`besideTest`).
- Weekgrens: de rustdag blijft in zijn eigen week. Gaat de zondagtraining naar de rustdag van maandag, dan zoekt hij een vrije dag in de week van maandag, niet de zondag ervoor. Zo houdt elke week zijn rust.
- Vakantie, tocht en vrije dagen: geen rustdag op een dag van zo'n periode (je traint er al niet). Zonder sportschool wel.
- Een rustdag die jij vastzette (bijvoorbeeld via een eerder voorstel, zoals bij de eigenaar) krijgt het voorstel ook: het is een voorstel, jij beslist. Een rij van jou op een andere dag maakt die dag bezet. Een rustdag die een periode neerzette krijgt geen voorstel.
- Liever niet: niets opgeslagen, geen id. Het voorstel komt alleen direct na jouw verplaatsing en wordt niet later opnieuw berekend, dus het komt niet terug.
- Akkoord schrijft via dezelfde weg als Verplaatsen (`applyProposal`), met jouw slot en Ongedaan maken. De melding van het voorstel vervangt die van je sleep; je sleep terugzetten kan nog door terug te slepen.
- Rustdag of Hersteldag: het woord in het blad volgt Op je rustdag.
- Geen nieuwe opgeslagen vorm behalve een optionele instelling: geen migratie nodig, oude back-ups blijven gelijk.

## Wat niet bewoog

`planGolden.test.ts`, de scheduler en de historie zijn niet aangeraakt. Bestaande tests zijn niet aangepast, behalve de twee die voor een nieuwe instelling mogen meebewegen: `src/engine/settingsDiff.test.ts` (`restDayFollows: false` in de stand "alles anders") en de foto `src/engine/__snapshots__/instellingen-foto.json` (de nieuwe rij `rustdag-schuift`).

## Niet gecontroleerd

Het blad op een echt toestel en de tijd tussen de melding van de sleep en het blad. Een Lookout op 360 px hoort bij dit bouwmoment.
