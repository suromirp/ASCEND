# Ontwerpadvies: kop zonder cirkels, weekstrook met sporticonen, mint in het Logboek

Datum: 2026-10-24
Status: aangenomen

## Besluit

Het advies van de vriendin van de eigenaar over de tabkoppen en de weekstrook is
als volgt overgenomen.

- De kop op de lucht (`SkyBand`) heeft geen cirkels meer. Het tandwiel, het
  lichaamknopje op Vandaag en de pijltjes van Week en Logboek zijn alleen een
  pictogram in `--color-on-light`, elk een tikdoel van 44 bij 44 px, op één rij
  naast het merkteken. De pijltjes staan direct links van het tandwiel. De groep
  schuift 10 px de paginamarge in, zodat het pictogram zelf op de rand van de
  kaarten eindigt.
- Het poppetje op Vandaag is een klein lichaam met één gemarkeerde plek (de knie):
  icoon `lichaam`. Het knopje doet hetzelfde als eerst (het blad "Waar zit het?")
  en heet "Lichaam: rekken en klachten".
- De weekstrook op Vandaag toont per dag het sporticoon in de kleur van die sport.
  Gepland is alleen het icoon, gedaan is hetzelfde icoon met een klein mint vinkje.
  Een rustdag is een poppetje dat zit en uitrust (icoon `ontspannen`, gedempt), een
  vrije dag een streepje, en vandaag houdt de ijsblauwe bol om de letter. Twee
  trainingen op één dag staan kleiner onder elkaar; meer dan twee worden in de
  strook niet uitgebeeld, wel in het label voor de schermlezer.
- Je stand heeft geen groot wit vlak meer: "Klaar voor de GR5" is op Je stand en
  op Ascend dezelfde gewone marine kaart onder de bergen. De lucht houdt kopje,
  titel en één regel, zoals op de andere tabs.
- Op Ascend staat de kop zoals op de andere tabs: het merkteken linksboven, daaronder
  links uitgelijnd het kopje, de naam van het hoofddoel en de regel eronder. Het grote
  geanimeerde teken naast de tekst is uit de kop gehaald; het merkteken in de kop is
  hetzelfde teken.
- Het kalendertje in het Logboek krijgt mint terug op de plek waar mint al
  voor staat: wat je nog moet doen. Een training die vandaag of later gepland staat en
  nog niet gedaan is, krijgt een mint ring. Gedaan blijft een gevuld bolletje in de
  sportkleur, rust een grijze ring, vandaag de ijsblauwe rand. De sportkleuren zelf
  zijn niet veranderd.

## Reden

Cirkels om losse pictogrammen maakten de kop druk en het tandwiel, de pijltjes en het
poppetje stonden willekeurig verspreid. Een sporticoon met een vinkje laat in één
oogopslag zien wat af is, en een staafje zegt dat niet. Een groot wit vlak op Je stand
woog zwaarder dan op elke andere tab. Op Ascend las de kop rommelig naast het grote
teken. Mint hoort in het Logboek terug te komen, en "wat je nog moet doen" is de
betekenis die mint in de app al heeft.

## Alternatieven

- Wandelen in mint tekenen: afgewezen. Dan botst een sportkleur met de actiekleur en
  zou het groen elders (weekstrook, grafieken) niet meer kloppen.
- Een mint vinkje op elk gevuld bolletje van het kalendertje: afgewezen, het zegt
  niets nieuws, want elk gevuld bolletje is al gedaan.
- Twee iconen naast elkaar in een dag van de strook: past op 360 px niet zonder
  dat de vinkjes elkaar raken; onder elkaar past.
- Een licht, kleiner kaartje met het percentage op de lucht van Je stand: afgewezen, dan
  staat hetzelfde getal twee keer op het scherm.

## Bron

Het ontwerpadvies van de vriendin van de eigenaar, 24 oktober 2026, met haar keuzes.
Kleurregels: `docs/beslissingen/2026-10-24-thema-zee-en-berg.md`.

## Vervangt

Alleen het onderdeel over het tandwiel "in een ronde knop" in
`docs/beslissingen/2026-10-22-steen-en-contour.md` en de weekstrook met staafjes en
maantje uit `docs/beslissingen/2026-10-24-thema-zee-en-berg.md`. De rest van die
besluiten blijft staan.

## Terugdraaien

De rand en de ronde vorm terugzetten in `SettingsGear`, `StretchMenuButton` en de
pijltjes van Week en Logboek, de staafjes terugzetten in `WeekStrip` en de lichte
`LightCard` van "Klaar voor de GR5" terug in de lucht van Je stand. Er verandert niets
aan gegevens of instellingen.
