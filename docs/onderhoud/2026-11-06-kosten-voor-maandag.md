# Kosten: wat de volgende sessie anders doet (6 november)

Voor de coördinator van de volgende sessie, op vraag van de eigenaar. Eerst dit lezen, dan het kostenlogboek
(`.claude/kosten/logboek.md`) van de week bekijken zoals de skill `werkverdeling` op maandag vraagt.

Wat deze week duur maakte:
- Eén sessie liep dagen door. Elke beurt leest de hele geschiedenis opnieuw; tegen het eind kostte een kleine
  tekstfix meer dan een helper. Grootste post.
- De coördinator draaide op Opus, ook voor kleine teksten en een regel CSS.
- De tekstkaart (`npm run kaart:vergelijk`, ongeveer 3 minuten en veel uitvoer) liep ook bij wijzigingen die
  geen scherm raakten.
- Een fout zoeken in de app met de back-up van de eigenaar ging in stappen (eerst zonder registers, dan met);
  dat kostte drie extra rondes.

Afspraken voor volgende week:
- Een nieuwe sessie per onderwerp of per dag. Wat moet blijven staat in `docs/backlog.md` en hier, niet in het gesprek.
- Kleine fixes in een sessie op Sonnet; Opus alleen voor planning, opslag, migraties en lastige fouten.
- Per wijziging alleen de controles die erbij horen: tsc, lint en de tests van het geraakte deel tijdens het
  werk, de hele set en de build één keer voor de push. De tekstkaart alleen als een scherm verandert.
- Een fout uit de app nabootsen: meteen met `primePlanningRegisters()` en de tijdzone Europe/Amsterdam, zoals de
  app zelf opent (les van 5 november).
- Meerdere kleine punten bundelen in één commit en één push in plaats van een push per punt.
- Helpers alleen voor echt werk (een onderzoek, een bouw van een uur of meer), en dan op het model uit de tabel.

## Leerpunten uit de nachtronde (1 en 2 november, uit het kostenlogboek)

- Ongeveer 13 miljoen tokens aan helpers in twee dagen: Sherpa op opus ruim 10 miljoen, Warden 3,5 miljoen,
  Cartographer en Scout samen minder dan 1 miljoen. Bijna alles was bouwen op opus.
- De duurste posten waren grote opdrachten in één keer (Sporten die meetellen 600k en 191 minuten, Kansen 405k,
  Android 389k). Kleinere opdrachten met een duidelijke grens kosten per stuk minder en lopen minder vaak vast.
- Een helper hervatten na de limiet of voor een paar kleine reviewpunten kostte 300k tot 400k, omdat hij zijn
  hele context opnieuw leest. Kleine reviewpunten doet de coördinator zelf of een nieuwe Sherpa op sonnet met
  alleen de lijst.
- Drie keer kwam Warden rood terug (testloop, zware benen, back-up): telkens een randgeval dat in de opdracht had
  kunnen staan. Eisen vooraf in de opdracht blijft de goedkoopste les.
- Niet alles wat de planning raakt hoeft een opus-Sherpa van een uur: tekst en UI rond de planning kan op sonnet,
  alleen de engine-regel op opus.
