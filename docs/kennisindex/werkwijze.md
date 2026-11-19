# Kennisindex: werkwijze

Gemaakt met `npm run kennisindex`. Het overzicht staat in [README.md](README.md).

## Begin hier

- Geen werkbriefje. Hoe er aan ASCEND gewerkt wordt: rollen, poorten, kosten en het open werk.
- [backlog.md](../backlog.md): Het open werk van ASCEND: de Inbox met wat de eigenaar meldt en de bouwrij, bijgehouden door de coördinator.
- [beslissingen/_sjabloon.md](../beslissingen/_sjabloon.md): Het sjabloon voor een nieuw besluit: besluit, reden, alternatieven, bron, vervangt en terugdraaien.
- [onderhoud/2026-11-16-onderhoudsronde.md](../onderhoud/2026-11-16-onderhoudsronde.md): Onderhoudsronde 16 november 2026: grootte, dubbele en dode code, top tien om op te ruimen, ochtenden en IJkset.
- [werkbriefjes/README.md](../werkbriefjes/README.md): Wat een werkbriefje is, de vaste vorm en hoe het wordt bijgehouden.

## Besluiten die gelden

Nieuwste eerst. Bij een besluit staat welk later besluit het aanvult.

- 2026-11-19 [Geen gepland bouwmoment meer](../beslissingen/2026-11-19-geen-gepland-bouwmoment.md): De geplande taak Bouwmoment is weg; de coördinator bouwt de Inbox zelf in bouwrondes met helpers, met dezelfde poorten en één squash per ronde.
- 2026-11-11 [Pathfinder: een poort voor samenhang en UX](../beslissingen/2026-11-11-pathfinder.md): Er komt een zesde rol, Pathfinder (`.claude/agents/pathfinder.md`, skill `pathfinder`), die de app als geheel bewaakt vanuit de gebruiker.
- 2026-10-31 [Tekstkaart van de app als standaardcontrole](../beslissingen/2026-10-31-app-kaart.md): Data en teksten controleren we met de tekstkaart in `docs/app-kaart/` (`npm run kaart:vergelijk`), niet met screenshots.
- 2026-10-22 [Kwaliteitspoort voor alles wat live gaat](../beslissingen/2026-10-22-kwaliteitspoort.md): Niets gaat naar main voordat het door vier poorten is: de vier controles, een review door Warden, een doorloop door Lookout op 360 en 390 px en een screenshot dat de coördinator zelf bekijkt. Aangevuld door: 2026-11-11-pathfinder.
- 2026-10-21 [Werkwijze met Claude](../beslissingen/2026-10-21-werkwijze.md): Claude werkt aan ASCEND met een vaste set specialisten, vaste werkinstructies en een besluitenlogboek in de repo. Aangevuld door: 2026-10-22-kwaliteitspoort.

## Deels ingehaald

Nieuwste eerst. Van deze besluiten geldt alleen nog wat achter "Geldt nog" staat; lees voor de rest het latere besluit.

Geen.

## Onderzoek, ontwerpen en verslagen

- [onderhoud/2026-10-29.md](../onderhoud/2026-10-29.md): De nulmeting van 29 oktober 2026 voor de wekelijkse onderhoudsronde, alleen gelezen.
- [onderhoud/2026-10-31.md](../onderhoud/2026-10-31.md): Verslag van 31 oktober 2026: opruimen zonder dat de gebruiker iets ziet, onder meer de oude kleurnaam `--color-stone`.
- [onderhoud/2026-11-01-aanpak-backlog.md](../onderhoud/2026-11-01-aanpak-backlog.md): Het plan van 1 november 2026 om de hele backlog zelfstandig in rondes op te pakken.
- [onderhoud/2026-11-02-exports.md](../onderhoud/2026-11-02-exports.md): Opruiming van ongebruikte exports met knip op 2 november 2026: van 646 naar 57.
- [onderhoud/2026-11-02-sneller.md](../onderhoud/2026-11-02-sneller.md): Wat op 2 november 2026 meetbaar sneller is gemaakt, met de meting voor en na.
- [onderhoud/2026-11-11-backlog-opnieuw.md](../onderhoud/2026-11-11-backlog-opnieuw.md): Verslag van 11 november 2026: de backlog is opnieuw opgebouwd tegen wat live staat op main.
- [onderhoud/2026-11-11-pathfinder-route-start.md](../onderhoud/2026-11-11-pathfinder-route-start.md): Pathfinder vooraf op 11 november 2026 over de start van een lus en het laden van Route voorstellen.
- [onderhoud/2026-11-12-pathfinder-totaalplaatje-ui.md](../onderhoud/2026-11-12-pathfinder-totaalplaatje-ui.md): Inventaris van Pathfinder op 12 november 2026 voor de ontwerper, na de vraag om een rustiger UI.
- [onderhoud/2026-11-12-pathfinder-verborgen-schermen.md](../onderhoud/2026-11-12-pathfinder-verborgen-schermen.md): Pathfinder op 12 november 2026 over verborgen pagina's en wat anders kan; opgevolgd in `docs/beslissingen/2026-11-14-verborgen-schermen.md`.
- [onderhoud/reflectie-2026-11-01.md](../onderhoud/reflectie-2026-11-01.md): Terugblik per ronde op de backlogavond van 1 november 2026.
- [onderzoek/Dode code 2026-10-28.md](../onderzoek/Dode%20code%202026-10-28.md): Welke ongebruikte componenten en engine-bestanden op 28 oktober 2026 zijn verwijderd en wat bewust bleef.
- [onderzoek/Ponytail en Graphify.md](../onderzoek/Ponytail%20en%20Graphify.md): Proef van 13 november 2026 met twee hulpmiddelen voor agents; niets ervan staat in main.
- [onderzoek/Werkwijze autonome agents.md](../onderzoek/Werkwijze%20autonome%20agents.md): Hoe teams die vooral met AI bouwen zonder mens opleveren, met de lessen voor ASCEND en wat altijd een mens nodig heeft.
- [visie/Techniek en kwaliteit.md](../visie/Techniek%20en%20kwaliteit.md): Meting van 21 oktober 2026 van techniek en kwaliteit op commit 66641e4.
- [visie/Werkwijze met Claude.md](../visie/Werkwijze%20met%20Claude.md): Voorstel van oktober 2026 voor de werkwijze met specialisten; de punten over een verplichte PR en merge zijn vervangen door `docs/beslissingen/2026-10-21-werkwijze.md`.

## Vervangen of verouderd

- [onderhoud/2026-10-29-exports.txt](../onderhoud/2026-10-29-exports.txt): Ruwe lijst van 29 oktober 2026 met ongebruikte exports per bestand en regel. Verouderd: De meting van 2 november (`docs/onderhoud/2026-11-02-exports.md`) heeft deze lijst niet gebruikt en is nieuwer.
- [onderhoud/2026-11-06-kosten-voor-maandag.md](../onderhoud/2026-11-06-kosten-voor-maandag.md): Wat de coördinator na 6 november anders doet om de kosten te drukken. Verouderd: Eenmalige aanwijzing voor de sessie na 6 november; de vaste regels staan in de skill `werkverdeling`.
