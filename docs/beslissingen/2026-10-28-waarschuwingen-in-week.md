# Waarschuwingen in Week

Datum: 2026-10-28
Status: aangenomen (stap 1 en 2 van het ontwerp)

## Besluit

Week zegt in woorden wat er in de week niet klopt: een kaart "Let op" bovenaan, onder de lucht, en een korte tekst in de rij van elke betrokken training. Kan de weekcontrole het niet zelf herstellen omdat jij of een geaccepteerd voorstel de training vastzette, dan komt er een voorstel met Akkoord (regel WEEK-CHECK, via `ProposalSheet`). Het amberen driehoekje van een zware beendag is weg: een zware beendag is gedempte tekst "zware benen". Stap 3 uit het ontwerp (de zin in het actieblad, de koppeling met TEST-MAKE-ROOM, de overige regels) is niet gebouwd.

## Reden

De eigenaar zag amber driehoekjes bij zware beendagen, las ze als waarschuwing en miste in een week zonder rustdag een voorstel. Het driehoekje was geen waarschuwing, en de echte bevindingen van de weekcontrole kwamen nergens in beeld. REST-DAY meldde bovendien geen training met een slot, en dat was precies zijn geval. Ontwerp: `docs/visie/Waarschuwingen in Week.md`.

## Gekozen antwoorden op de open vragen

Namens de eigenaar, het advies uit het ontwerp:

1. Ook een training die je zelf op je rustdag zette krijgt melding en voorstel; Liever niet is het rustige antwoord.
2. In een volle week mag het voorstel de lichtste training laten vervallen, nooit een lange duurloop, harde loop, test, wedstrijd of tocht (ook geen zware beendag en geen Herstel).
3. De kaart staat bovenaan, onder de lucht, zodat je in één oogopslag ziet wat er aan de hand is.
4. Een zware beendag zonder probleem is alleen gedempt "zware benen" in de rij, zonder icoon. De legenda en de markeringen in de bergkam zijn ook gedempt (`--color-ink-dim`), zodat amber in Week alleen "hier klopt iets niet" betekent.
5. Niet op Vandaag in deze ronde.
6. Geen tweede instelling.

## Wat er gebouwd is

- `CheckInput.reportYours` (standaard uit): REST-DAY meldt dan ook een training met een slot (niveau 1). Uit verandert er niets, dus de planning en `planGolden.test.ts` blijven zoals ze waren.
- `CheckInput.mayMove`: ids van trainingen met jouw slot die `repairWeeks` deze keer mag verschuiven of aanpassen. Alleen een voorstel zet het aan; de controle zelf raakt wat van jou is nooit aan. Niveau 0 (verleden, gedaan) en 2 (test, wedstrijd) blijven onaantastbaar.
- `engine/weekConcerns.ts`: de zes regels REST-DAY, LEG-SPACING, TWO-HARD-RUNS, AFTER-TEST, ONE-LONG en TEST-FRESH als kaartregel, feit, naam en reden van een voorstel en rijtekst. Alleen toekomstige dagen van de getoonde week.
- `engine/weekFixProposal.ts#planWeekFix`: rekent de herstelling die de controle anders zou doen en biedt hem aan als `Advice` (`WEEK-CHECK`, `plan_update`, id `weekfix:<regel>:<ids>:<datums>`), met hoogstens drie opties. Het voorstel komt alleen als de week er aantoonbaar beter van wordt: minder bevindingen en geen nieuwe. Een andere dag telt alleen als de dag ruimte heeft (tijd per dag, of leeg). De items hebben geen `restore`, dus een verplaatste training krijgt weer een slot. Een week zonder uitweg geeft alleen de melding: "ASCEND vond deze week geen dag die beter past."
- `WeekNotice` (kaart), `rowNotes` en de nieuwe tekst in `SessionRow`; de kaart wordt rustiger na Liever niet ("Toch een voorstel"). Weigeren verbergt dus een voorstel, nooit het probleem.
- Instelling "Voorstel bij een probleem in de week" (`AppSettings.weekFixProposal`, afwezig is aan; Planning, "Hoe ASCEND plant"). Uit laat de kaart en de rijteksten staan en haalt alleen de knop weg. De sleutel gaat mee in de back-up.
- Geen opgeslagen vorm veranderd behalve een optioneel veld op de instellingen, dus geen migratiestap.

## Alternatieven

De kaart lager, boven de lijst: dichter bij de rijen, maar de eigenaar wil het in één oogopslag zien. Een tweede instelling voor de melding zelf: een kaart die er alleen is bij een echt probleem hoeft niet uit. Een melding zonder voorstel in elke week zonder rustdag: de controle zou dan weer stil moeten blijven bij wat de gebruiker vastzette, of stil verplaatsen, en dat mag allebei niet.

## Bron

Ontwerp `docs/visie/Waarschuwingen in Week.md` en het gesprek met de eigenaar over de amberen driehoekjes. Geen persoonsgegevens.

## Vervangt

Niets. Het kleurdeel over het amberen driehoekje in de rij van Week (`LegMark`) vervalt.

## Terugdraaien

Zet de instelling uit voor alleen de voorstellen. Voor alles: haal `WeekNotice` en `concernNotes` uit `pages/Week.tsx`; de engine blijft ongemoeid omdat `reportYours` en `mayMove` standaard uit staan.
