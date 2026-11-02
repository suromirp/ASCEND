# Instellingen ronde 3: Geavanceerd als pagina, één tijdnotatie, tochten

Datum: 2026-11-02
Status: aangenomen

## Besluit

Drie kleine dingen, met akkoord van de eigenaar.

Geavanceerd is een eigen pagina. Elke groep met geavanceerde rijen (Planning, Forge, Vandaag en meldingen, Gegevens en back-up) toont onderaan één rij "Geavanceerd" met eronder de titels van wat erachter zit. Die rij opent `/more/<groep>/geavanceerd`. De terugknop op die pagina gaat naar de groep, de terugknop van de telefoon werkt als bij elke pagina. Zoeken en sprongen vinden de rijen nog: een sprong naar een geavanceerde rij gaat vanzelf naar die pagina (`SettingsGroupPage`, `isAdvancedRow` in `data/settingsLayout.ts`). Het openklappen en het onthouden daarvan (`ascend.instellingen.geavanceerd`) vervalt.

Eén notatie voor een tijd van de dag: "13:05", 24 uur, dubbele punt, twee cijfers voor de minuten. Eén helper, `formatClock` in `src/utils/clock.ts`, met tests. Daaronder vallen de weerregel ("bijgewerkt om 13:05", ook voor de bergen), de horlogestatus ("om 19:04"), het beste moment ("Beste moment: 16:00 tot 17:30, droog"), de laatste keer ophalen bij Garmin, de bouwtijd, de tijd bij een Forge-gebeurtenis en de tijden in Instellingen.

Bij een hoofddoel dat zelf een tocht is (GR5, een bergtocht) zegt Doel en tochten niet "Geen tochten". De groep zegt "Alleen je doel", de rij Tochten "Geen andere" met eronder "GR5 is je doel". Bij een doel dat geen tocht is en zonder tochten blijft het "Geen tochten".

## Reden

De uitklapper liet een lange pagina nog langer worden en onthield zijn stand per telefoon, waardoor dezelfde pagina er per keer anders uitzag. Een eigen pagina houdt de groep rustig en blijft 44 px per rij.

Twee notaties voor de tijd ("13.05" en "06:11") staan in dezelfde app naast elkaar. De Nederlandse schrijfwijze met de dubbele punt is overal te lezen en past bij de klok op het horloge.

"Geen tochten" naast een doel als GR5 klopt niet: de tocht is het doel zelf. De samenvatting hoort te zeggen wat waar is.

## Alternatieven

Geavanceerd laten uitklappen en alleen de standaard onthouden: dat blijft een lange pagina. Een tweede niveau in het overzicht: te zwaar voor vier groepen.

Voor de tijd de punt kiezen ("13.05"): is in Nederland gangbaar in lopende tekst, maar het hoofdgetal in de app (horloge, back-up, Instellingen) stond al met de dubbele punt, en een punt lijkt op een decimaal.

Voor de tochten een lange zin ("GR5 is je doel, geen andere tochten") als waarde: past niet op 360 px. Daarom een korte waarde met de rest eronder.

## Plafonds

Het plafond blijft 12 rijen per groep en hoogstens 6 onder Geavanceerd (minstens 2). De rij "Geavanceerd" zelf telt niet mee: ze is geen instelling maar de deur naar een eigen pagina. Planning staat op 10 rijen en 6 geavanceerd, Forge op 12 en 5, Vandaag op 12 en 6, Gegevens op 12 en 4. Daarmee is niets verplaatst.

## Niet aangepast

De vaste teksten in `data/journeyTasks.ts`, `data/knowledge/` en `data/gr5Bivouac.ts` over openingstijden en bivaktijden ("van 19.00 tot 9.00 uur") zijn een bewuste uitzondering: ze staan in lopende tekst over de wereld buiten de app en blijven zoals ze waren. Bestandsnamen van back-ups ("14u05") ook.

## Bron

Gesprek met de eigenaar, ronde 3 van Instellingen (`docs/visie/Ontwerprapport instellingen.md`).

## Vervangt

De uitklapbare Geavanceerd uit `docs/beslissingen/2026-10-26-instellingen-opruimen.md`; de rest daarvan blijft.

## Terugdraaien

Geavanceerd: in `SettingsSection` (`components/settings/SettingsList.tsx`) de rij weer door de uitklapper vervangen en de route `/more/:groep/geavanceerd` weghalen. Tijd: `formatClock` terug naar de oude notaties per plek. Tochten: `mainIsTrek` uit `rowSummary` halen.
