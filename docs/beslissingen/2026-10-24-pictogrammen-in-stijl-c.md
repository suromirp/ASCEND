# Pictogrammen in stijl C voor sporten, rust en lichaam

Datum: 2026-10-24
Status: aangenomen

## Besluit

De sporten, de rustdag en het lichaam krijgen pictogrammen in stijl C, "kleine illustraties": drie tinten van één kleur, een lichte achtergrondvorm, een middentint en de volle hoofdvorm (`src/components/pictograms.tsx`, `Pictogram` met `name` en `size`). De bediening (tandwiel, pijltjes, info, vinkje, terug, tabbalk) blijft de lijnset in `icons.tsx` met lijnen van 1,6 px. Bergtocht krijgt een eigen sportkleur, een heldere bergzon-geel.

Dit wijkt af van de regel in CLAUDE.md dat alle iconen uit één lijnset van 1,6 px komen. Die regel geldt nu voor de bediening; sporten, rust en lichaam zijn pictogrammen in stijl C.

## Reden

De eigenaar koos op het ontwerpbord voor stijl C, en wel overal waar een sport, de rust of het lichaam getoond wordt. De pictogrammen lezen als een plaatje en zijn herkenbaarder dan een lijn van 1,6 px, ook in de weekstrook op 24 px, omdat de volle hoofdvorm het silhouet draagt. De lichte en de middentint zijn dekking op dezelfde sportkleur (`--pic-light`, `--pic-mid` in `index.css`), dus er komen geen nieuwe kleurwaarden bij. Op de lichte lucht zijn de tinten wat sterker, zodat de lichte vorm niet wegsmelt; op de nachtlucht staan ze weer op de gewone waarde.

Bergtocht was dezelfde groen als wandelen en is nu te onderscheiden. De vrije plek in het palet is smal: mint is actie, ijsblauw is status, amber is let op, oranje is hardlopen, lila is kracht, groen is wandelen, roze is rekken, rood is gevaar. Gekozen is geel (`--color-sport-mountain`, `#f4d94e`): duidelijk geler en lichter dan het amber, en het is de zon bij de berg in het pictogram zelf. Op het marine is het contrast 12:1 (icoon en tekst), op de lichte lucht is de diepe oker `--color-sport-mountain-on-light` (`#7a6400`) 4,7:1 op de lichte kaart en 4,0:1 op de lucht. Voor de nachtlucht en de grafieken zijn er `--color-chart-mountain` en de nachtvariant naast de andere `-on-light` tokens.

Een bergtocht is de template "Bergtocht" (`tpl_mountain_hike`) of een training van het soort tocht (`isMountainTrip` in `sportKind.ts`, met test). Dat is alleen weergave; de planning en de engine veranderen niet. In het Logboek krijgt een bergtocht daardoor een eigen regel, kleur en bolletje naast wandelen. De grafiek "Belasting per week" telt bergtochten nog onder wandelen (dat is engine-logica en bleef zoals het was).

De drie lagen komen bij het verschijnen na elkaar op (200 ms ease-out, 3 omhoog en vervagen, 80 ms ertussen), met `mx-pic-1` tot en met `mx-pic-3`. Bij Rustig en Uit en bij beperkte beweging staan ze meteen op de eindstand.

Er is ook een pictogram voor fietsen gemaakt (het Logboek kent die sport) en een pictogram "lichaam" voor het knopje rechtsboven op Vandaag. Dat knopje is nog niet gekoppeld; het blijft mint (op de lucht `--color-action-on-light`), een andere kleur dan het tandwiel.

## Alternatieven

Stijl A en B van het ontwerpbord (lijn en vlak) bleven lijniconen. De eigenaar koos C. Een lijnset voor de sporten houden en alleen de weekstrook veranderen is niet gekozen, omdat dezelfde sport dan op elke plek anders zou ogen. Voor bergtocht is amber overwogen, maar dat is "let op" en te dicht bij oranje (hardlopen); limoen is te dicht bij het groen van wandelen en het lichtgroen van Logboek.

## Bron

Keuze van de eigenaar op het canvas "Iconen, voorstel C" (kleine illustraties). Eigen getekende pictogrammen, geen paden uit een bibliotheek.

## Vervangt

Niets. Het vult de regel over de eigen iconenset in `CLAUDE.md` aan: de lijnset blijft voor de bediening.

## Terugdraaien

Laat `SportDisc`, `WeekStrip`, `sportLook` en de Logboekpagina weer `Icon` uit `icons.tsx` gebruiken (de lijniconen `lopen`, `kracht`, `wandelen`, `rugzak`, `rekken`, `ontspannen` staan er nog) en geef `walk` en `mountain` dezelfde kleur. De tokens kunnen blijven staan.

## Aanvulling (24 oktober, na de review)

Het knopje is inmiddels gekoppeld: het lichaamknopje rechtsboven op Vandaag is het
pictogram "lichaam" in mint, 24 px, net zo groot als het tandwiel. De regel uit
2026-10-24-ontwerpadvies-kop-en-weekstrook.md dat alles in `actions` de kleur van het
tandwiel heeft, geldt hier bewust niet: de eigenaar wil een andere kleur, omdat het
tandwiel bij de instellingen hoort. Het is een pictogram en geen gevulde knop, dus de
gevulde mint knop blijft het ene accent van het scherm. CLAUDE.md is hierop bijgewerkt.
