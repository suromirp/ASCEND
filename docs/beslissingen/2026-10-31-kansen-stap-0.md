# Kansen met gegevens, stap 0 en het kleine werk

Datum: 2026-10-31
Status: aangenomen

## Besluit

Eerst het vangnet: ASCEND merkt op wanneer er van je horloge niets meer binnenkomt terwijl de koppeling werkt, de ochtendgetallen gaan mee in de back-up, en het activiteitenverzoek bij intervals.icu vraagt alleen de velden die ASCEND leest. Daarna vijf kleine signalen uit wat er al lokaal ligt: vroeg ziek zien, hitte en dauwpunt bij het tempo, patronen per weekdag, luchtkwaliteit en de ochtendregel twee van drie (alleen de engine). Elk is instelbaar en staat standaard aan. Niets ervan verandert de planning; dat blijft een voorstel met Akkoord.

## Reden

Garmin scherpte in oktober 2026 zijn voorwaarden aan en intervals.icu verwacht Garmin-gegevens via de API te moeten blokkeren. Dan valt de belangrijkste bron stil, en dat zie je niet aan een foutmelding: het ophalen lukt, er komt alleen niets mee. De eigenaar koos steeds de aanbevolen optie.

Bronbewaking (`engine/sourceWatch.ts`). Eén rustige zin op Vandaag als het laatste geslaagde ophalen van vandaag of gisteren is en er drie dagen geen ochtend binnenkwam, of drie dagen geen activiteit terwijl je wel een training invulde (geen kracht, die meet niet iedereen). Zonder ochtenden vraagt het twee ingevulde trainingen. Begrepen verbergt deze stilte; een nieuwe stilte komt terug. Instelling "Melden als je horloge stilvalt" onder Koppelingen.

Ochtendgetallen in de back-up (`engine/morningBackup.ts`, `payload.mornings`). Per ochtend alleen de datum, rusthartslag, HRV, slaapduur en slaapscore, niets anders van het horloge. Optioneel en additief, dus het schemanummer blijft 5; `storage/migrations.ts#migrateMornings` leest ze en laat een beschadigde ochtend weg. Bij terugzetten komt alleen terug wat het toestel nog niet heeft, en alleen als de geschiedenis wordt teruggezet. De kopie van voor een import bevat ze niet. Het bestand bevat daarmee gezondheidsgegevens; de rij en de uitleg zeggen dat. Instelling "Ochtendgetallen in back-up" onder Gegevens.

Velden bij intervals.icu (`integrations/intervalsIcu.ts#ACTIVITY_FIELDS`). De parameter `fields` staat in de officiële OpenAPI-beschrijving (gelezen op 31 oktober 2026). Het verzoek noemt de 28 velden die `mapIntervalsActivity` leest, ook `deleted`, dat niet in die beschrijving staat maar wel gelezen wordt. Weigert de server de lijst of komt er een antwoord dat de app niet begrijpt, dan vraagt ASCEND een keer opnieuw zonder lijst, zoals vroeger. Het wellnessverzoek bleef zoals het was. De FIT-route is niet gebouwd.

Vroeg ziek zien (`engine/illnessSigns.ts`). Rusthartslag minstens 6 slagen boven je gemiddelde en HRV onder je gewone bereik, twee ochtenden op rij. Niet als je bij Wat speelde er iets vastlegde of al ziek gemeld bent. Een vraag op Vandaag: Voel me goed, Word ziek (de gewone ziekmelding, zelf een voorstel met Akkoord) of Niet nu.

Hitte bij het tempo (`engine/heatPace.ts`). De voorspelling vraagt dauwpunt en luchtvochtigheid erbij. Bij een loop buiten, als het voelt als 22 graden of meer of het dauwpunt 16 of hoger is: loop op hartslag, met een band van 10 tot 20 seconden per km, of 20 tot 40 als het heet of benauwd is.

Patronen per weekdag (`engine/weekdayPattern.ts`). Acht weken terug, minstens zes keer een training op die dag, minstens vier keer en de helft weggevallen, en 30 procentpunt vaker dan op de andere dagen. Eén zin op Week; de weekvorm wijzigen blijft iets van de planning.

Luchtkwaliteit (`engine/airQuality.ts`). Alleen bij een harde training buiten binnen vier dagen vraagt ASCEND de Europese luchtkwaliteitsindex, ozon en fijnstof bij Open-Meteo, met dezelfde afgeronde plek als het weer, hoogstens eens per drie uur, nooit in de back-up. Bij een index van 60 of meer staat er een raad onder het weer.

Ochtendregel twee van drie (`engine/morningRule.ts`). Elk getal een woord tegen je eigen 28 dagen, en bij twee van de drie afwijkend de vraag of je moe bent. Alleen de engine: de ochtendkaart wordt tegelijk door een andere bouwer vernieuwd en is niet aangeraakt.

Slaap tegenover prestatie is niet gebouwd: een korte nacht van het horloge telt al vanzelf als feit in "Wat doet dit met je?", met hartslag bij rustig tempo en zwaarte (`engine/influence.ts#derivedFactEntries`, `docs/beslissingen/2026-10-25-feiten-tellen-vanzelf.md`). Dat is precies de persoonlijke uitkomst die het onderzoek voorstelde.

De vijf signalen staan in een blad "Signalen uit je gegevens" op de pagina Lichaam, zodat geen pagina boven het plafond van twaalf rijen komt.

## Alternatieven

- De ochtendgetallen buiten de back-up houden, zoals eerst. Niet gekozen: valt de bron weg, dan is de telefoon het enige exemplaar.
- Alle velden van het wellnessrecord mee in de back-up. Niet gekozen: alleen wat ASCEND leest, omdat het bestand dan zo min mogelijk gezondheidsgegevens bevat.
- De bronbewaking als melding op de telefoon. Niet gekozen: niet storend was de vraag; een zin op Vandaag is genoeg.
- Bij twee van drie meteen een voorstel om de training lichter te maken. Niet gekozen in deze stap: dat hoort bij de ochtendkaart en gaat via een voorstel met Akkoord.

## Bron

`docs/onderzoek/Kansen met gegevens.md` (stap 0 en de top 10), de opdracht van de coördinator, `docs/beslissingen/2026-10-31-data-lange-termijn.md`, `docs/beslissingen/2026-10-22-alles-instelbaar.md`. Geen persoonsgegevens; alle testdata is nagemaakt.

## Vervangt

Het deel van de opmerking in `storage/wellness.ts` dat de ochtendgetallen nooit in een export gaan. Verder niets.

## Terugdraaien

Elke instelling uitzetten zet het signaal stil. Voor de back-up: zet Ochtendgetallen in back-up uit; een back-up met `mornings` blijft importeren in een oudere app, die het veld niet kent en overslaat. Voor de velden bij intervals.icu: laat `activitiesUrl` zonder `fields` bouwen (`{ fields: false }`).
