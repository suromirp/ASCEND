# Ontwerp Stand minimaal

Ontwerpvoorstel van Cartographer, 12 november 2026. Geen code. Aanleiding: de eigenaar wil dat Stand meegaat in de verbeteringen: minimaal en vernieuwend, mooi en makkelijk, elke informatie één keer. Pathfinder zag zes tot zeven blokken, drie cijfers bovenaan die ook op Vandaag en in Week staan, een grote grafiek voor frisheid met een deel dat schatting heet, een eigen volgorde-instelling en kolommen die verspringen.

Gelezen: `CLAUDE.md`, `docs/architectuur/ontwerp-en-tokens.md`, `docs/beslissingen/2026-11-09-stem-van-ascend.md`, hoofdstuk 6 van `docs/visie/Ontwerp trainingsscherm minimaal.md` en het besluit `docs/beslissingen/2026-11-12-trainingsscherm-en-ontwerpregels.md` (de acht regels gelden hier), `docs/onderhoud/2026-11-12-pathfinder-totaalplaatje-ui.md`, `docs/visie/Ontwerp Je dag.md`, `docs/visie/Ontwerp Je week tot nu.md`, `docs/beslissingen/2026-11-09-tempo-grafiek.md`, de tekstkaart `docs/app-kaart/stand.md`, en de code: `src/pages/Standing.tsx`, `src/components/stand/` (onder meer `StandSummary`, `FreshnessChart`, `WeeklyLoadChart`, `IntensityMixCard`, `RhythmCard`, `RunTrendsCard`, `PaceCurveCard`, `WeightStandCard`, `Zone2PaceChart`, `Sparkline`, `OrderSheet`), `src/components/LegFatigueCard.tsx`, `src/components/AerobicTrendCard.tsx`, `src/components/influence/InfluenceCard.tsx` en `src/engine/cardOrder.ts`.

Niet gedaan en niet nagelopen:

- De app heb ik niet gedraaid. Ik had in deze beurt geen opdrachtregel, dus geen blik op 412 px. De lange scroll ken ik uit de tekstkaart (390 px, twaalf kaarten) en uit de code. Lookout moet het beeld nog bevestigen.
- Het besluit `docs/beslissingen/2026-11-12-zone2-kaart.md` staat niet op deze tak; de bouwer werkt op `claude/zone2-kaart`. Ik neem de vorm uit de opdracht als gegeven: lijn, stippen, het eindlabel bij zijn stip, sneller boven, geen gekleurde woorden. Wijkt de echte kaart daarvan af, dan wint de kaart en volgt hoofdstuk 4 hem.
- `DescentCard`, `ClimbPaceCard`, `LegCalendar`, `IndexCheckCard`, `ForgeEntryCard`, `StrengthProgressionCard`, `TrainingSplitRow` en `YourWeekStandCard` ken ik alleen van hun kop en commentaar. Of Forge de krachtprogressie per oefening al toont heb ik niet gezien.

## 1. Wat Stand is

Stand beantwoordt één vraag: hoe sta ik ervoor, in mijn benen, mijn belasting en mijn ritme, en word ik beter?

Wat er niet in hoort:

- Wat je vandaag doet. Dat is de missie op Vandaag.
- Wanneer wat gepland staat en wat je verplaatst. Dat is Week.
- Hoe ver je bent naar je doel. "Klaar voor je doel" staat alleen op Ascend.
- Wat je deed, training voor training. Dat is het Logboek.
- Een taak, een vraag of een voorstel. Stand vraagt niets en verandert niets. Er staat geen gevulde mint knop op.

## 2. De pagina van boven naar onder

De pagina wordt drie blokken en past op 412 px zo goed als op één scherm. Nu zijn het twaalf kaarten onder elkaar.

### De lucht

`SkyBand` zoals nu: `AppMark`, het tandwiel, het kopje met de week (`Eyebrow`, ongewijzigd) en de titel Je stand.

De zin onder de titel ("Je benen zijn fris en je week is in lijn") vervalt in het gewone geval. Hij zegt hetzelfde als de drie regels eronder. Hij blijft in twee gevallen, omdat hij dan iets zegt wat de regels niet zeggen: zonder een enkele training ("Na je eerste training zie je hier hoe je ervoor staat.") en in een rustweek.

### Blok 1, de eerste blik: drie regels

Dit is het hart van de pagina, op de lucht, als lichte kaart (`Card` in de lucht). De drie kolommen van `StandSummary` worden drie regels onder elkaar, in de vorm van het blok Stand en morgen uit Je dag. Daarmee zijn de verspringende kolommen weg: elke regel heeft dezelfde drie plekken.

- Links het vaste woord in gedempte inkt, met een vaste breedte: Benen, Belasting, Ritme.
- Daarnaast het oordeel in gewone inkt, halfvet, in Inter: "Fris", "In lijn", "Op koers". Niet in Marcellus: drie Marcellus-woorden in één kaart is er twee te veel (regel 2).
- Eronder in 12 px gedempt het ene feit, met zijn uitleg: "index 0,1", "wordt 424, gewoonlijk 540", "7 van 8 gedaan in vier weken". De teksten komen uit dezelfde functies als nu.
- Rechts een pijltje. Elke regel is minstens 56 px hoog en opent zijn eigen scherm.

Let op is alleen een amber stip voor het vaste woord: bij vermoeide benen en bij een week die al meer dan 30 procent boven je gemiddelde ligt (de bestaande grens `LOAD_JUMP`). Dezelfde grenzen als het blok op Vandaag, zodat de stip op beide plekken tegelijk staat. Achter bij Ritme krijgt geen stip; dat is een feit, geen waarschuwing.

De regels springen niet meer naar een kaart verderop. De kaart verderop bestaat niet meer; de regel is de ingang.

### Blok 2, het ene beeld: Tempo bij zone 2

Eén grafiek op de pagina, niet meer. Het is de nieuwe kaart Tempo bij zone 2 zoals de bouwer hem nu maakt, ongewijzigd. Hij beantwoordt de tweede helft van de vraag: word ik beter. Zonder loop met details toont hij zijn eigen lege regel, op dezelfde hoogte, zodat er niets verspringt als de lijn er is.

### Blok 3, de lijst

Eén `Card` met rijen, zonder kopje, in de vaste rijvorm: links het vaste woord gedempt, dan de waarde in gewone inkt, rechts een pijltje.

- Lopen, met het opvallendste woord uit de looptrends, bijvoorbeeld "Bergop beter". Opent het scherm Lopen.
- Kracht, met de regel van Forge ("1 oefening ging omhoog in 8 weken"). Opent Forge.
- Gewicht, met "78,4 kg, trend". Opent het bestaande overzicht Gewicht (`WeightOverviewSheet`).
- Wat speelde er, met "3 redenen vastgelegd". Opent het scherm Wat speelde er.
- Zonder doel komt Je week er als eerste rij bij, met de minuten van deze week; hij opent de kaart op Ascend.

Een rij is er alleen als er iets achter zit, behalve Kracht: die blijft staan zodat Forge te vinden is, met "Aanzetten" als Kracht meerekenen uit staat, zoals nu. Meer dan vijf rijen komen er niet, dus er is geen rij Meer nodig.

De knop Volgorde aanpassen onderaan de pagina vervalt (zie 5).

### Per huidige kaart

- De drie kolommen (`StandSummary`): houden, als drie regels. Het is nu de pagina zelf, geen samenvatting van wat eronder nog eens staat.
- Benen (`LegFatigueCard`): verplaatsen naar het scherm Benen, als hart. Reden: dezelfde index stond bovenaan en direct eronder nog eens.
- Frisheid (`FreshnessChart`): verplaatsen naar het scherm Benen, in de nieuwe stijl (hoofdstuk 4). Eén lijn, frisser boven.
- Beenkalender (`LegCalendar`): samenvoegen. De stippen per dag onder de lijn van Frisheid zeggen al wat een dag je benen gaf. De kalender van vijf weken wordt een blad achter de rij "Beendagen" op het scherm Benen. Zo is de amber kalender van het scherm en gaat er niets verloren.
- Index naast je eigen benen (`IndexCheckCard`): verplaatsen, als rij onderaan het scherm Benen, alleen als er iets te vergelijken is.
- Belasting per week (`WeeklyLoadChart`): verplaatsen naar het scherm Belasting, als hart, in de nieuwe stijl.
- Intensiteit (`IntensityMixCard`): verplaatsen naar het scherm Belasting, direct onder de grafiek. Dit is de plek waar Je week tot nu naar verwijst voor rustig en hard.
- Afdaling en Klimtempo (`DescentCard`, `ClimbPaceCard`): verplaatsen naar het scherm Belasting, als twee rijen met hun getal ("Bergaf, 320 m deze week", "Klimtempo, 410 m per uur") die elk hun bestaande inhoud in een blad openen. Ze horen inhoudelijk bij je doel; verhuizen naar Ascend is een later, eigen besluit.
- Forge, Krachtprogressie en Trainingsverdeling: samenvoegen tot de ene rij Kracht die Forge opent. Forge is het thuis van kracht. Krachtprogressie verhuist naar Forge, of vervalt als Forge de lijn per oefening al toont; de bouwer kijkt dat eerst na. Trainingsverdeling wordt een rij op het scherm Belasting, want het gaat over hoe je week verdeeld is.
- Ritme (`RhythmCard`): verplaatsen naar het scherm Ritme.
- Looptrends (`RunTrendsCard`): verplaatsen naar het scherm Lopen. De rij Efficiëntie vervalt daar: hij leest dezelfde berekening als Tempo bij zone 2 en is dus hetzelfde feit. De instelling Efficiëntie blijft bestaan en blijft gelden voor het blad na een loop.
- Tempo naast je test (`PaceCurveCard`): verplaatsen naar het scherm Lopen, zonder kaart, als twee regels onder de trends.
- Tempo bij zone 2: houden op de pagina, in de nieuwe vorm.
- Wat doet dit met je (`InfluenceCard`): verplaatsen naar een eigen scherm achter de rij. De inhoud blijft gelijk.
- Gewicht (`WeightStandCard`): wordt een rij. Het grote getal en het lijntje staan al in het overzicht dat hij opent. Stand is het thuis van je gewicht; de rij op Vandaag is alleen de taak om te wegen.
- Je week zonder doel (`YourWeekStandCard`): wordt een rij die naar Ascend verwijst. Dezelfde getallen stonden op twee tabs.

### De schermen achter de regels

Elk scherm heeft de lage lucht (`SkyBand variant="low"`) met de terugknop, het kopje "Je stand" en de naam, zoals de Briefing. Routes onder `/stand`, in de `HashRouter`: benen, belasting, ritme, lopen en invloed. Terug gaat naar Stand.

Benen, van boven naar onder: het hart met het getal, het woord en de balk met drie zones; de regel wat nog doorwerkt; de regel voor je test of wedstrijd als die er binnen twee weken is; de grafiek Frisheid; de rij Beendagen; de rij over hoe de index klopte. De i opent de bestaande uitleg. Gekleurde woorden verdwijnen: "Fris" en "op de grens" staan in gewone inkt, en een grensgeval krijgt de amber stip vooraan de regel.

Belasting: de grafiek per week met eronder de ene zin van het oordeel; Intensiteit met zijn balk en één zin; de rijen Bergaf, Klimtempo en Trainingsverdeling. De uitleg van de punten ("45 minuten op zwaarte 6 is 270 punten") gaat achter de i. De waarschuwing bij een sprong blijft volledig op het scherm.

Ritme: het oordeel in Marcellus (het ene woord van dit scherm), de weken als stipjes, de ene zin en de reeks. De i opent de bestaande uitleg. Dit is het thuis van "x van y gedaan" over weken.

Lopen: de trends als rijen met hun lijntje en woord; daaronder Tempo naast je test.

### Standen

- Leeg: zonder een enkele training staan de drie regels er met "Nog niets" en wanneer het komt ("na enkele weken", "na twee weken"), zoals nu. Geen grafiek, en in de lijst alleen Kracht. De app toont nooit een lege pagina.
- Laden: alles komt uit de opslag op het toestel en staat er meteen. Geen laadteken. De kaart Tempo bij zone 2 heeft een vaste hoogte.
- Fout: Stand en zijn schermen lezen alleen. Opslaan gebeurt alleen in het blad Gewicht en in de volgorde bij instellingen; die houden hun bestaande melding.

Hergebruik: `SkyBand`, `Card`, `Eyebrow`, `InfoButton`, `Meter`, `TextButton`, de rijvorm van het blok Stand en morgen, `ChevronGlyph`, `LegFatigueInfoSheet`, `RhythmSheet`, `WeightOverviewSheet`, `TrainingSplitSheet`, `RunInsightSheet`, `Zone2InfoSheet`, `Sparkline`, en elke berekening die er al is. Elk blad gaat door `useSheetClose` met `ref={sheetRef}` en `<SheetGrip />`; elke rij die een blad opent krijgt `data-sheet-from`.

## 3. Eén thuis voor benen, belasting en de week

De regel: het getal en zijn uitleg staan alleen op Stand. Elders staat hoogstens één regel met het woord, en die regel opent het scherm waar het getal woont.

- Benen woont op het scherm Benen. Vandaag toont in het blok Stand en morgen "Benen, Vermoeid" met de amber stip en opent rechtstreeks het scherm Benen, niet de bovenkant van Stand. De losse Benen-kaart en de samenvattingskaart op Vandaag vervallen, zoals `Ontwerp Je dag.md` al zegt. Week toont een beendag als markering op de dag, zonder index.
- Belasting woont op het scherm Belasting. Vandaag toont alleen de regel Week als het een waarschuwing is ("35% zwaarder dan de 4 weken ervoor") en opent dat scherm. Het blad Je week tot nu toont geen verdeling rustig en hard meer; die staat onder Intensiteit.
- De week over weken woont op het scherm Ritme. De ring in Week blijft, want die gaat over het plan van deze ene week; hij krijgt geen tweede zin over de weken ervoor.

Een waarschuwing blijft altijd volledig staan waar hij nu staat. Verwijzen geldt voor het gewone geval, nooit voor zorg.

## 4. Grafieken: één stijl

Eén tekenwijze voor elke grafiek op Stand, gelijk aan de nieuwe kaart Tempo bij zone 2.

- Eén maat: dezelfde breedte, dezelfde linkerrand en dezelfde strook rechts voor labels als `Zone2PaceChart`. Daardoor beginnen en eindigen alle grafieken op dezelfde plek.
- Eén lijn van 2 px in `--color-progress` met ronde uiteinden. Mint is hier voortgang, geen actie.
- Stippen: vol is gemeten of gedaan, open telt niet mee of is nog gepland. Wat gepland is loopt als gestippeld vervolg van dezelfde lijn. Er is nooit een tweede lijn.
- Het eindlabel staat bij zijn stip: het laatste getal in Inter 12 px, gewone inkt, in de strook rechts. Er staat geen groot getal in de kop dat hetzelfde zegt.
- Sneller of beter staat altijd boven. Frisheid draait daarom om: frisser boven, zodat de lijn zakt na een zware dag en weer klimt. Bij belasting en gewicht bestaat geen beter; daar is meer boven en zegt de regel onder de grafiek dat.
- Hoogstens twee haarlijnen in `--color-card-border` met een label van 12 px in de strook rechts (bij Frisheid "test" en "hard", bij Belasting "gewoonlijk"). Onderaan links de begindatum, rechts "vandaag".
- Geen legenda bij één reeks. Geen gekleurd woord in een zin. Het oordeel is één zin in gewone inkt onder de grafiek; de uitleg staat achter de i.
- Geen vak in een kaart. De gekozen dag of week staat als gewone regels onder een haarlijn.
- Geen animatie. De grafiek staat meteen op zijn eindstand, zoals de zone 2-grafiek.

Wat dat per grafiek betekent:

- Frisheid: de lijn is vol tot vandaag en gestippeld erna. De band van onzekerheid verdwijnt uit het beeld; de marge staat in de regel van de gekozen dag ("ongeveer 3 tot 7"). Het woord schatting staat alleen nog in die regel, zoals de stemgids wil. De stippen onder de lijn (test, harde loop, benen) blijven, in gedempte inkt met de ruit voor een test of wedstrijd.
- Belasting per week: een stip per week op één lijn, de lopende week met een open stip voor wat nog gepland is. De verdeling per sport met vier kleuren en een legenda verdwijnt uit de grafiek; hij staat in de telling van de gekozen week, waar elke training al zijn eigen regel heeft.
- Gewicht en krachtprogressie: dezelfde lijn en hetzelfde eindlabel in hun eigen blad of in Forge.
- De kleine lijntjes in de rijen van Lopen (`Sparkline`) zijn de kleine vorm van dezelfde stijl: dezelfde lijn, zonder as en zonder label.
- Intensiteit en de balk van Benen zijn geen grafieken in de tijd en houden hun balk.

## 5. De volgorde-instelling

Op de pagina is hij niet meer nodig. Drie blokken met een vaste vorm hebben geen volgorde om te slepen, en de pagina past op één scherm. De knop Volgorde aanpassen onderaan vervalt.

De instelling zelf blijft, in Instellingen bij Planning waar hij al staat. Een bewaarde volgorde blijft werken zonder migratie: de onderlinge volgorde van Benen, Belasting en Ritme bepaalt de drie regels bovenaan, die van Kracht, Lopen en Wat speelde er de rijen in de lijst. `settings.cardOrder` en `resolveCardOrder` veranderen niet; alleen de ene regel uitleg per blok in het blad wordt korter. Weghalen van de instelling is een keuze van de eigenaar (vraag 1).

## 6. Vernieuwend en rustig: het label loopt mee

Elke grafiek op Stand werkt als een liniaal. Leg je vinger op de grafiek en schuif: de stip onder je vinger licht op en het eindlabel verhuist naar die stip. De regel onder de grafiek zegt wat die dag of week was. Laat je los, dan staat het label weer bij vandaag.

- Eén gebaar voor alle grafieken, in plaats van "Tik op een week voor de telling" op de ene en een tik op een dag op de andere.
- Het vervangt de vakken onder de grafieken en de zin die uitlegt dat je kunt tikken.
- De hele grafiek is het tikdoel, dus ruim boven 44 px. Verticaal scrollen blijft werken; alleen een beweging opzij schuift.
- Per stip een korte tik via `utils/haptics.ts`, volgens de bestaande instelling Trillen.
- Met het toetsenbord: de pijltjes. De regel onder de grafiek wordt voorgelezen.
- De gekozen stip krijgt een rand in gewone inkt, geen mint: er komt geen tweede accent bij.
- Het verschuiven van het label duurt 150 ms, ease-out; in Rustig en Uit staat het er meteen. Geen lus.

Dit sluit aan op de zone 2-kaart: daar staat het label bij de laatste stip, hier mag je het langs de lijn meenemen. De stippen van de zone 2-grafiek waren eerder te klein om op te tikken; met schuiven hoeft dat niet meer. Geen nieuwe token.

Wat ik bewust niet doe: geen score of cijfer voor je stand als geheel, geen ring, geen pijltjes omhoog of omlaag, geen kleur per regel, geen grafiek in de lucht, geen uitklapblok, geen beloning bij een goede week, geen tweede grafiek op de pagina, en geen wijziging aan Vandaag, Week of Ascend buiten de ene regel die verwijst.

## 7. Voor de bouwer

Sporen, elk alleen weergave en met een eigen einde.

1. De pagina: drie regels in de lucht, de zone 2-kaart, de lijst. De oude blokken verhuizen ongewijzigd naar hun scherm (routes onder `/stand`). Einde: elk feit één keer op de tekstkaart van Stand.
2. De schermen Benen, Belasting en Ritme opschonen: uitleg achter de i, gekleurde woorden naar gewone inkt, de vakken in kaarten weg, de rijen onderaan.
3. Eén grafiekonderdeel in `src/components/stand/` uit de delen van `Zone2PaceChart`, daarna Frisheid en Belasting erop. Pas beginnen als `claude/zone2-kaart` op main staat.
4. Het label loopt mee, op dat ene onderdeel.
5. De rij Kracht en de plek van Krachtprogressie, na een blik in Forge.
6. De verwijzingen: het blok Stand en morgen op Vandaag opent de schermen Benen en Belasting rechtstreeks. Pas na Je dag op main.
7. De volgorde: de knop van de pagina, de bewaarde volgorde op regels en rijen.

Wat niet mag bewegen:

- De berekeningen: `engine/standing.ts`, `engine/legFatigue.ts`, `engine/standRhythm.ts`, `engine/onCourse.ts`, `engine/aerobicTrend.ts`, `engine/zone2Chart.ts`, `engine/runTrends.ts`, `engine/paceCurve.ts`, `engine/weightCard.ts`, `engine/influenceEffects.ts`, `engine/climbPace.ts`. Geen grens, geen telling en geen woord van het oordeel verandert. Frisheid omdraaien is alleen tekenen; de index blijft de index.
- De instellingen van de gebruiker: Gewicht op Je stand, het overzicht Wat speelde er, de looptrends per onderwerp, Tempo naast je test, Tempo uit stabiele stukken, hoe intensiteit telt, Trillen, Beweging en de volgorde van Je stand. Staat iets uit, dan is de rij er niet.
- `settings.cardOrder` in opslag en back-up (`storage/backupClean.ts`), en `resolveCardOrder`.
- Zonder doel: Je week houdt dezelfde berekening als op Ascend (`engine/yourWeek.ts`).
- De waarschuwingen: de sprong in belasting, de regel voor je test of wedstrijd en de pijnmelding staan volledig op het scherm, nooit achter een i.
- Logs en planning: Stand leest alleen. `src/storage/planGolden.test.ts` beweegt niet.

Testen:

- Tellen op de tekstkaart: de beenindex één keer op Stand, het gemiddelde van vier weken één keer, het zone 2-tempo één keer, geen rij Efficiëntie naast de kaart.
- De drie regels: fris zonder stip, vermoeid met stip, een sprong met stip, achter zonder stip, rustweek, minder dan drie weken gegevens, geen enkele training, het hoofddoel voorbij.
- Dezelfde stip op Vandaag en op Stand bij dezelfde gegevens.
- De lijst: elke rij aan en uit met zijn instelling, Kracht met Aanzetten, zonder doel de rij Je week, met een doel niet.
- Een bewaarde volgorde van voor de wijziging geeft de verwachte regels en rijen; Terug naar standaard werkt.
- De grafieken: frisser boven en sneller boven, het eindlabel bij de laatste stip, gepland gestippeld, één loop, geen loop, het label loopt mee en keert terug, pijltjes op het toetsenbord, Rustig en Uit op de eindstand.
- Terug: van elk scherm naar Stand, van een blad eerst het blad.
- Op 360, 390 en 412 px met vertraagde processor: de drie regels en de bovenkant van de grafiek boven de vouw, niets afgekapt, geen tikdoel onder 44 px, geen tekst onder 12 px, hoogstens drie kopjes in beeld, geen gevulde mint knop.
- Vast: `npx vitest run src/engine/standing src/engine/standRhythm src/engine/standLoad src/engine/cardOrder src/storage/cardOrder src/components/stand src/components/sheetDrag`, en `npm run kaart:vergelijk` met elk verschil in `docs/app-kaart/stand.md` en `docs/app-kaart/stand-zonder-doel.md` verklaard. De tekstkaart verandert sterk; dat is bedoeld.

## Samenvatting

Stand wordt drie blokken: drie regels in de lucht (Benen, Belasting, Ritme), één grafiek (Tempo bij zone 2) en één lijst (Lopen, Kracht, Gewicht, Wat speelde er). Elke regel opent zijn eigen scherm, waar de bestaande kaarten wonen, zonder herhaling. Benen, belasting en de week hebben daar hun ene thuis; Vandaag en Week verwijzen met één regel. Alle grafieken krijgen de stijl van de nieuwe zone 2-kaart, met frisser en sneller boven, en het label dat met je vinger meeloopt. De knop voor de volgorde gaat van de pagina; de instelling blijft. Geen nieuwe kleur of token, en de berekeningen, de instellingen en de planning bewegen niet.

## Vragen

1. De volgorde-instelling: houden in Instellingen en alleen de knop van de pagina halen, of de instelling helemaal weg? Mijn advies: houden. Het kost niets, een bewaarde volgorde blijft werken, en een instelling van de eigenaar verdwijnt niet zonder dat hij erom vraagt.
2. Het ene beeld op de pagina: Tempo bij zone 2, of geen grafiek en alleen regels en rijen? Mijn advies: Tempo bij zone 2. Zonder beeld is Stand een menu; met dit ene beeld beantwoordt de pagina ook "word ik beter", en het is de kaart die net opnieuw gemaakt wordt.
