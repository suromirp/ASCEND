# Lange chat of verse chats, en waar de kosten zitten

Datum: 2026-11-20
Status: aangenomen

## Besluit

- De coördinator wisselt op lengte, niet op de klok: bij ongeveer 250k tot 300k context en na elke afgeronde bouwronde. De wissel van 04:47 vervalt als de chat nog kort is. Een opvolger start bij voorkeur als eenmalige taak met een verse sessie, zodat de keten van sessies niet volloopt (`coordinator-wissel`).
- De overdracht is kort en vast van vorm, onder 10 KB: de stand, wat aan de sessie hangt, open vragen en besluiten met reden. Oude standen staan in git. Backlog en werkverdeling lees je op aanvraag.
- Twee haken rond het samenvatten (`.claude/settings.json`, `.claude/hooks/`): vóór het samenvatten krijgt de samenvatting de opdracht om bouwers, open vragen, besluiten en wat nog niet in de overdracht staat te bewaren; na het samenvatten komt de bovenste stand van de overdracht terug, met de opdracht die eerst bij te werken.
- Bouwers en helpers blijven vers: een herstelronde naar dezelfde bouwer alleen binnen een paar minuten, anders een nieuwe Sherpa met alleen de lijst en het briefje. Geen uurtaken die een lange chat wekken zonder werk.
- Kosten: bij planner, opslag en migraties beoordeelt Warden eerst het plan, dan pas bouwen; elke opdracht volgt het sjabloon met eisen en randgevallen vooraf. Model naar wat het werk raakt (planner, opslag en migraties op Opus of Fable; teksten, schermen en kleine fixes op Sonnet); maximaal denkwerk alleen op verzoek. Kleine punten bundelen. Controles groeien mee met de grootte: een kleine wijziging krijgt één gecombineerde Warden en Lookout.
- Meten: per coördinatorsessie de context bij de wissel en de kosten in het kostenlogboek; wekelijks per soort werk kosten, herstelrondes en wat de eigenaar merkt, in de maandagbriefing. Na twee weken bijstellen.

## Reden

Uit `docs/onderzoek/Lange chat of verse chats.md` (19 november): een cloudsessie vat pas samen rond 967k tokens, elke beurt leest de hele geschiedenis opnieuw, en de kwaliteit zakt bij een volle context. Het kostenlogboek van 12 tot 18 november liet zien dat herstelrondes na Warden de grootste post zijn en dat klein werk op Opus hoog vijf tot tien keer duurder was dan op Sonnet.

## Alternatieven

Eén lange coördinator die zelf samenvat: goedkoper per wissel, maar duurder per beurt en minder scherp. Een vaste wissel per dag: wisselt ook als de chat nog kort is. De omgevingsvariabele CLAUDE_CODE_AUTO_COMPACT_WINDOW=300000 als vangnet: zet de eigenaar zelf in zijn omgeving, niet de coördinator.

## Bron

`docs/onderzoek/Lange chat of verse chats.md`, `.claude/kosten/logboek.md`, akkoord van de eigenaar op 19 en 20 november.
