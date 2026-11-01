# Terugblik op de backlog van 1 november

Eén kopje per ronde, zoals de aanpak vraagt (`docs/onderhoud/2026-11-01-aanpak-backlog.md`).

## Ronde 1

Gestart om 19:00, af om ongeveer 23:00. Live gezet in acht stappen: Stand schuift niet meer zijwaarts, het
cijferblok van Forge blijft open, de ochtendkaart na je antwoord, de rustdag die terugkomt, de rustiger fysioregel
met de kortere voorschriftregel en het citaat in het Engels, een vakantie bijwerken, trainingen die niet
doorgingen, en de ochtenden in de back-up met de opmaak samengebracht. Daarnaast drie ontwerprapporten
(gegevens, instellingen, Forge) en de tekstkaart met 21 schermen en vier standen.

### Wat het kostte

Ongeveer 2,7 miljoen tokens aan helpers volgens het kostenlogboek (de hervatte bouwers zijn daarin onderschat).
De drie ontwerprapporten op opus kostten samen ongeveer 500k, de zes bouwers op opus samen ongeveer 1,3 miljoen,
de bouwers op sonnet en alle reviews samen de rest. Herstelrondes: vijf, allemaal na een review, geen enkele omdat
de controles rood waren.

### Wat heel goed ging, en hoe dat de standaard wordt

- De sonnet-bouwers voor afgebakende fouten in de interface (Stand, cijferblok, ochtendkaart) waren in één keer
  groen en goed. Wat ze gemeen hadden: de opdracht noemde het gemeten symptoom, de verwachte oorzaak als vermoeden
  en niet als feit ("meet het"), en een doorloop met de kit als eis. Dat wordt het sjabloon voor een fout in de
  interface (werkverdeling).
- Warden vond vijf echte fouten die de tests niet vingen: de spoedtekst achter een tik, de vakantiedata van de
  eigenaar in de openbare repo, een koppeling met de training van vandaag, dataverlies bij het uitzetten van de
  ochtenden, en een tweede woord voor "over" in Forge. De review op opus voor opslag en planning verdiende zich
  terug; die blijft.
- Dezelfde bouwer hervatten na een review was goedkoop (20k tot 40k tegen 90k tot 290k voor een nieuwe) en
  foutloos. Standaard: herstel na review gaat altijd terug naar dezelfde bouwer.
- Hoogstens drie bouwers tegelijk met elk een eigen worktree gaf alleen kleine conflicten (imports, instellingenlijsten,
  `week.md`), steeds op te lossen door beide kanten te houden.

### Wat misging, met de echte oorzaak

- Spoedtekst verstopt (kleine punten). Oorzaak: de opdracht. Er stond "de inhoud blijft gelijk", niet dat een
  waarschuwing nooit achter een tik mag. Aanpassing: in de werkverdeling een eis voor alles wat zorg of gezondheid
  raakt.
- Vakantiedata van de eigenaar in de repo. Oorzaak: de coördinator. De opdracht nam datums uit een back-up
  letterlijk over uit het aanpakbestand, en dat bestand had ze al. Aanpassing: datums en details uit een back-up
  gaan altijd verschoven of geanonimiseerd in een opdracht (werkverdeling). Het opschonen van de geschiedenis
  gebeurt aan het eind, met toestemming van de eigenaar.
- Koppelen aan de training van vandaag en dataverlies bij de ochtenden. Oorzaak: de opdracht. Bij historie en
  opslag noemde de opdracht niet wat er gebeurt bij een fout halverwege, bij een verlopen koppeling, of op de dag
  zelf. Aanpassing: een vaste lijst randgevallen voor opslag en historie in de werkverdeling.
- Een tweede woord voor hetzelfde ("in reserve" naast "over"). Oorzaak: de opdracht noemde een voorbeeld met een
  nieuw woord. Aanpassing: een bouwer zoekt het bestaande woord op voordat hij een tekst maakt, en een voorbeeld in
  een opdracht is nooit een nieuw vast woord.
- De poort zelf. Twee gaten: de tekstkaart gebruikte een draaiende server van een andere helper met een oude
  build, en de coördinator filterde de uitvoer op een paar woorden en zag daardoor "N gewijzigde regels" niet.
  Oorzaak: de poort en de coördinator. Aanpassing: de kaart bouwt nu altijd zelf op een vrije poort, en alleen
  "Geen verschil met docs/app-kaart/." telt als gelijk (werkverdeling).
- Het dashboard voor de eigenaar werkte niet en kostte zes keer bijwerken en een reeks toestemmingsvragen.
  Oorzaak: de coördinator, die het nooit zelf opende. Aanpassing: geen pagina voor de eigenaar zonder dat hij
  geopend en gecontroleerd is; berichten in de chat zijn genoeg.
- De tekstkaart duurt nu bijna vier minuten in plaats van anderhalf. Gevolg van meer schermen; acceptabel, maar
  ronde 3 kijkt of de standen tegelijk kunnen.

### Klopt het geheel?

De functies van deze ronde passen bij de vraag "wat is mijn missie vandaag", maar ze vragen allemaal ruimte op
Vandaag: de ochtendkaart, Niet gedaan?, een koppelvoorstel, de rustdag terug, de back-up, de missie. Op een slechte
ochtend kunnen er vier kaarten boven de missie staan. Dat is het belangrijkste wat er nu mist: een vaste volgorde
en een maximum voor kaarten op Vandaag.

Verder opgekomen:
- Ziek gemeld en toch de vraag Niet gedaan? over een training van voor de ziekte. Logischer is dat zulke vragen
  wachten tot je beter bent.
- Inhalen (MISSED-CATCH-UP) kan iets voorstellen wat al gedaan is maar nog niet gekoppeld: eerst koppelen, dan
  inhalen.
- De ontwerprapporten hebben kleine delen die zonder herinrichting kunnen (teksten en waarden in Instellingen),
  en grote delen die na het opsplitsen horen (Stand, Logboek, Forge met het weghalen van de snelknoppen).

Nieuw in de backlog, vijf punten (het maximum per ronde): de volgorde en het maximum van kaarten op Vandaag;
vragen pauzeren tijdens ziekte; eerst koppelen, dan inhalen; de kleine delen van het rapport instellingen in ronde
2; en de grote herinrichtingen (gegevens en Forge) na het opsplitsen in ronde 3.

### Wat ronde 2 anders doet

- Elke opdracht voor opslag of historie krijgt de vaste lijst randgevallen mee.
- Datums uit een back-up nooit letterlijk in een opdracht.
- Na het samenvoegen eerst de kaart met eigen build; alleen "Geen verschil" telt.
- Herstel na review altijd bij dezelfde bouwer.
