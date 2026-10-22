# Een zware beendag vlak na een tocht

Datum: 2026-10-22
Status: aangenomen

## Besluit

Een aanvulling op `2026-10-22-tochten-als-doel.md`, dat ongewijzigd blijft. Staat er een zware beendag (Benen A of B) van ASCEND zelf binnen 72 uur na een bergtocht, dan zoekt de weekcontrole in deze volgorde: een dag in dezelfde week die ver genoeg weg ligt, met de volle lengte; dezelfde dag-zoektocht met de korte versie; en, als de instelling "Soepele rust na een bergtocht" aan staat (standaard), de korte versie op een dag die minstens 48 uur na de tocht ligt, ook de dag zelf. Past ook dat niet, dan vervalt de beendag. De reden staat dan in gewone woorden in het voorstel: "Te dicht na je tocht: na een bergtocht houdt ASCEND 72 uur tot de volgende zware beendag, en deze week is er geen dag voor." Is de beendag soepel verkort, dan staat er: "Iets eerder dan ASCEND graag ziet na je tocht, daarom de korte versie."

## Reden

Voorheen vervalt zo'n beendag zodra binnen de week geen dag past, zonder uitleg. De 72 uur komt uit de bestaande regel (`engine/scheduler.ts#legSpacingDays`: afdalen is de meest spierbeschadigende belasting). De eigenaar vindt die regel goed maar "niet te hard": liever een kortere beendag iets eerder dan geen beendag. Daarom is de soepele stap standaard, en met de instelling (`AppSettings.trekLegRest`, `soft` of `strict`) kan hij terug naar de strenge regel.

De korte versie die soepel mag staat alleen in de weekcontrole; wat verkort is draagt het merk van de tocht (`PlannedSession.leave`), zodat het verwijderen van de tocht de volle lengte teruggeeft. Buiten tochten verandert er niets: alleen een beendag naast een wandeldag van een tocht wordt zo behandeld.

## Terrein en rugzak

Het terrein van een tocht kiest de wandeling per tochtdag: vlak en heuvels de rugzakwandeling (`tpl_ruck_walk`), bergen en sneeuw de bergtocht (`tpl_mountain_hike`). Er komt geen nieuwe template bij. De 72 uur blijft ook na een rugzakwandeling gelden, omdat de bestaande regel elke wandeling met enige daling meetelt; dat voor vlakke tochten uitzetten zou de planning buiten tochten veranderen. Het rugzakgewicht dat bij een tocht is ingevuld is voorlopig informatief: een geplande sessie heeft geen eigen gewicht, het komt uit de template en de rugzakladder (`engine/packLadder.ts`) en wordt op zes plekken gelezen. Een eigen gewicht per tochtdag vraagt een nieuw veld op de sessie en aanpassingen op die plekken; dat is een vervolgstap.

## Alternatieven

Altijd laten vallen, zoals eerst. Verworpen: de gebruiker verliest een training zonder te horen waarom.

De 72 uur voor iedereen verlagen naar 48. Verworpen: dat raakt de planning buiten tochten en de onderbouwing voor afdalen.

## Bron

Review van de tochten op 22 oktober 2026 en een aanvulling van de eigenaar over een soepeler regel. `engine/scheduler.ts#legSpacingDays` voor de 72 uur.

## Vervangt

Niets. Vult `2026-10-22-tochten-als-doel.md` aan.

## Terugdraaien

Zet "Soepele rust na een bergtocht" uit voor de strenge regel van 72 uur. De instelling is optioneel en additief; een back-up zonder het veld werkt als soepel.
