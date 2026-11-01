# De rustdag komt terug na een voorstel

Datum: 2026-11-01
Status: aangenomen

## Besluit

Liet een voorstel de rij Herstel op je vaste rustdag vervallen (status overgeslagen, slot van het voorstel) en is die dag later weer leeg, dan stelt ASCEND voor hem terug te zetten: "Je rustdag op maandag is weer vrij" als titel en "Zet hem terug?" eronder, met Akkoord en Liever niet (regel REST-BACK, `engine/restDayBack.ts`). Akkoord zet dezelfde rij terug op zijn dag, gepland en zonder slot, zoals het systeem hem had. In Week heet een lege dag op je vaste rustdag voortaan "Rustdag", met als tweede regel "je vaste rustdag" en de hangmat, in plaats van "Vrij, niets gepland". Dat is alleen weergave.

## Reden

TEST-RETRY haalde Herstel op een maandag weg om plek te maken voor de lange duurloop. Toen de test en de lange duurloop daarna elders heen gingen, bleef de rustdag weg en toonde Week "Vrij" op de vaste rustdag. Niets in de planning zette hem terug: de planningsronde raakt overgeslagen rijen niet aan, en dat hoort zo, want een rij met het slot van een voorstel is van de gebruiker. Een voorstel met Akkoord houdt die afspraak: niets verandert stil.

Wanneer het voorstel komt: alleen op de vaste rustdag, als de rij Herstel daar door een voorstel is overgeslagen (niet door jezelf, niet door een vakantie of tocht, geen ingehaalde rij), de dag vandaag of later is, er die dag niets anders gepland of gedaan is en de week zijn rust niet al op een andere dag heeft. Niet in een vakantie, op een ziektedag of op of na de dag van je hoofddoel. Liever niet wordt per rij onthouden (id `restback:<rij>`). Het voorstel staat op Vandaag tussen de adviezen en in Week in de kaart Rustdag van de week waarin de dag valt.

Na Akkoord blijft de rij in `removedByPlanIds` staan (`state/AppDataContext.tsx`, opgebouwd uit elke aanvaarde 'remove'): hij staat weer gepland, maar het eerdere voorstel liet hem vallen. Een latere regel die die verzameling leest, kijkt dus ook naar de status van de rij en niet alleen naar het id. SKIPPED-KEY-TO-REST en TEST-MAKE-ROOM lezen hem nu alleen voor overgeslagen rijen of tests, dus daar speelt het niet.

De instelling "Rustdag terugzetten voorstellen" (Planning, `AppSettings.restDayBack`, afwezig is aan) zet het voorstel uit; de weergave "Rustdag" in Week blijft dan. Het veld is optioneel en erbij gekomen, zoals de andere ja-nee-instellingen: een oude back-up leest zoals altijd en de import houdt alleen een ja of nee over (`storage/backup.ts`), dus er is geen migratiestap nodig.

## Alternatieven

- `engine/restDayProposal.ts` hergebruiken: dat voorstel is voor een andere rustdag en zet een overgeslagen rij alleen terug als de planningsronde dat doet, wat hij nooit doet. Het dekt dit geval dus niet.
- De planningsronde de rij zelf laten terugzetten: dat raakt een rij met het slot van een voorstel aan, en verandert de planning stil. Afgewezen.
- De bestaande terugzetweg "Toch doen" (`proposeBackOnPlan`) gebruiken: die zet het slot van de gebruiker op de rij, en hij is voor wat jij zelf oversloeg. Voor dit voorstel is de 'add' die een overgeslagen rij noemt (`applyPlanChangeItems`) de juiste weg: dezelfde rij terug, zonder slot, zoals een tocht die terugzet.
- Elke overgeslagen rij Herstel terugzetten, ook die buiten de vaste rustdag: dan komt een rustdag terug waar hij niet hoort, bijvoorbeeld na een andere rustdag. Voor nu alleen de vaste rustdag.

## Bron

Een back-up van de eigenaar van 1 november 2026 (alleen gelezen, niet in de repo): na TEST-RETRY van 28 oktober stond Herstel op maandag 2 november op overgeslagen met het slot van dat voorstel, terwijl de dag leeg was. De tests in `src/engine/restDayBack.test.ts` gebruiken nagemaakte gegevens in dezelfde vorm.

## Vervangt

Niets.

## Terugdraaien

Haal `restBackAdvice` uit `computeAdvice` en `REST_BACK_RULE` uit de kaart Rustdag in `pages/Week.tsx`; de instelling kan blijven staan of mee weg (een afwezig veld leest als aan). Voor de weergave zet je in `components/WeekPlanner.tsx` de tekst "Vrij, niets gepland" terug.
