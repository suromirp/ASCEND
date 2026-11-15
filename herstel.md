# Warden Week samenhang: oordeel over claude/week-samenhang (eb6bc01)

Oordeel: NIET AKKOORD in deze vorm. De code zelf is goed en mag door; wat blokkeert is de basis van de branch. Na punt 1 en de drie moet-punten is het akkoord, zonder nieuwe review van de code.

Bekeken: de vijf eigen commits (25ec6ac, a11bcf8, ef141e3, f138702, eb6bc01) bovenop 98b71df, backlog I-40 tot I-43, besluit `docs/beslissingen/2026-11-15-gemist-en-opnieuw-plannen.md`, getoetst aan CLAUDE.md, `docs/werkbriefjes/week.md` en `docs/werkbriefjes/planning.md`.

## Blokkerend

1. De boom van de branch mag niet als squash naar main. De branch staat op 98b71df, een oudere stand van claude/nacht. Main (09c716d) heeft sindsdien 46 bestanden in `src/` en `scripts/` die de branch mist (Routes op reis, back-up maken, kracht uit in het weekbudget, de invariant Kracht uit). `git commit-tree HEAD^{tree} -p origin/main` zou dat stil terugdraaien. Een gewone merge geeft conflicten in 16 bestanden. Voorstel: de vijf commits opnieuw op origin/main zetten. De wijziging in `src/` past er schoon op (`git diff 98b71df eb6bc01 -- src | git apply --3way`); alleen `scripts/app-kaart/invarianten.mjs` (beide kanten houden: Kracht uit van main en de drie nieuwe invarianten) en `docs/kennisindex/README.md` (opnieuw maken, het aantal documenten verschilt) vragen handwerk. Daarna `npm run kennisindex` en `npm run kaart` opnieuw.

## Moet

2. `docs/beslissingen/2026-11-15-gemist-en-opnieuw-plannen.md:25` zegt "de beendag en de telling blijven op de geplande dag". Voor de beendag klopt dat niet: Benen A gepland op maandag en gedaan op dinsdag geeft de belasting en de beendag op dinsdag (`src/engine/weekProfile.ts:80`, proeftest "belasting en beendag bij een log op een andere dag"). Alleen de rij en "x van n" blijven op de geplande dag. De tekstkaart zegt het zelf al goed ("Dinsdag was je zwaarste dag"). Voorstel: de zin verbeteren voor het besluit op main staat (daarna mag het niet meer): "de rij en de telling blijven op de geplande dag; de belasting en de beendag volgen de dag van het log (`engine/weekProfile.ts#dayLoads`)".

3. De tests van de bouwer vangen negen van de negentien mutaties in `src/engine/weekReview.ts` niet. Wat overleeft: vervallen ook vandaag en later (regel 181), vervallen ook met een log (182), overgeslagen ook met een log (171), "telt niet mee" ook voor de oude rij van een inhaal (175), ook voor wat een periode liet vallen (175), ook voor een rustdag (175), vervallen zonder ziekte (180), zonder de afbouw van een race (180) en voor de start van het programma (183). De code is op al deze punten goed; ze is alleen niet vastgelegd. Voorstel: `herstel-proeftests.patch` overnemen als `src/engine/wardenWeekProef.test.ts` (16 tests, groen op main plus de wijziging, tsc en lint schoon). Die vangt ze allemaal, met een willekeurige vergelijking van 400 standen tussen de rijen van Week en de terugblik.

4. Na het opnieuw opzetten: `npm run kaart:vergelijk` met elk verschil verklaard. Ik kon hem niet draaien (hij stopt hier in `scripts/app-kaart/kaart.mjs:351`, `maakScherm`); de kaart in de branch is dus niet door mij nagerekend.

## Mag

5. `src/engine/weekRow.ts:82` (`doneOnOtherDay`): een log die verder dan zes dagen van de geplande dag ligt (achteraf gekoppeld) geeft "gedaan vr 6" zonder maand; gepland op di 6 oktober en gedaan op vr 6 november leest als dezelfde week. Voorstel: buiten zes dagen de maand erbij, of niets tonen.
6. Een inhaal die zelf is overgeslagen: Week toont de oude en de nieuwe rij, de terugblik zegt "Overgeslagen: Lange duurloop en Lange duurloop" (`src/engine/weekGlance.ts:102`). Voorstel: dubbele namen samenvoegen ("Lange duurloop (2 keer)").
7. `src/engine/weekReview.ts:79` tot 81: de opmerking zegt dat de rij Week opnieuw plannen ook in een week zonder trainingen staat; `src/pages/Week.tsx:142` vraagt `trainings > 0`. Het gedrag klopt (Gemist bestaat alleen met trainingen), de opmerking niet.
8. `src/engine/weekList.ts:67` (`replanSub`): de zin is ruim twee keer zo lang geworden. Lookout kijkt op 360 px of de rij onder de dagen boven de tabbalk blijft.
9. Bestond al, niet van deze branch: een rij van voor de start van het programma telt de kaart "Je hebt n gemist" wel en de terugblik niet; en bij een log in een andere week zegt de geplande week "2 van 2 gedaan · 45 min" terwijl de minuten een week later staan. Beide vastgelegd in de proeftests, voor de backlog.

## Wat klopt

- Historie: niets herschreven. `doneOnOtherDay` leest alleen; de proeftest vergelijkt de stand voor en na. Geen vlag voor gedaan, geen nieuwe opgeslagen vorm, dus geen migratie nodig.
- Planning: alleen tekst en afgeleide lijsten; niets plant of verschuift. Het inhaaladvies houdt zijn voorstel met Akkoord, alleen de titel verandert. `src/storage/planGolden.test.ts` (A en C) is groen en niet aangeraakt.
- Telling: in 400 willekeurige standen (zonder sportschool, vakantie, tocht, vrije dagen, ziek met en zonder einddag, open concept, inhaal, rustdag, log op een andere dag, elke dag van de week en de maandag en dinsdag erna) noemt de terugblik gemist, overgeslagen en vervallen precies zoals de rijen in Week, en de som sluit.
- Randen: zondag is de training van vandaag niet gemist en verwijst Gemist naar Week opnieuw plannen; maandag is de week voorbij en verwijst hij nergens meer naar. Zonder sportschool blijft een loop gemist en vervalt kracht. Ziek: de dag voor de melding blijft gemist, de dag van beter melden vervalt, een log op een zieke dag is gedaan.
- Engine en ontwerp: de logica staat in `src/engine/`, de componenten geven alleen door; kleuren via tokens; geen gedachtestreepjes in de wijziging; geen persoonsgegevens; besluit en regel in de kennisindex aanwezig; `Klaar: I-40` tot `I-43` in de commits.

## Controles

- Op de branch (eb6bc01): tsc groen, lint groen (één bestaande waarschuwing in `LegFatigueCard.tsx`), `npx vitest run` 10840 groen, build groen, `npm run kennisindex:vergelijk` zegt geen verschil.
- Op origin/main (09c716d) met de wijziging in `src/` en de proeftests: tsc groen, lint groen, `npx vitest run` 734 bestanden en 10919 tests groen, build groen.
- Niet gedraaid: `npm run kaart:vergelijk`, Chromium op 360 en 390 px (Lookout), de doorloop van Pathfinder.

## Voorgestelde regel voor het werkbriefje Week (Valkuilen)

Een lijst in de terugblik die een woord van een rij in Week overneemt (gemist, overgeslagen, vervallen) krijgt een test die beide naast elkaar legt over willekeurige standen, niet alleen één voorbeeldweek: elke voorwaarde in het filter (log, rustdag, inhaal, wat een periode liet vallen, programmastart, afbouw) heeft een stand die hem raakt. En: de rij en "x van n" staan op de geplande dag, de belasting en de beendag op de dag van het log.
