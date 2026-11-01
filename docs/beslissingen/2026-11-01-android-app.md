# Een Android-app met Capacitor, naast de website

Datum: 2026-11-01
Status: aangenomen

## Besluit

ASCEND krijgt een Android-app: dezelfde Vite-build als de website, ingepakt met Capacitor 8 en
gebundeld in de app, zodat hij altijd offline werkt. De website op GitHub Pages blijft precies zoals
hij was. Alles wat de app anders doet zit achter drie kleine lagen in `src/integrations/`
(`notifications.ts`, `liveUpdate.ts`, `deviceShell.ts`); geen andere code weet of hij op Android
draait. In de browser heeft elke functie een webweg of een nette stilte, nooit een fout of een knop
die niets doet.

Per functie, in de app en in de browser:

- Meldingen op tijd (`engine/deviceNotices.ts`, `integrations/notifications.ts`). App: de plugin
  Local Notifications plant een melding op een exact moment, ook met het scherm uit; zonder de
  toestemming Exacte wekker "ongeveer op tijd". De laag vraagt nooit zelf om toestemming of opent
  nooit zelf een scherm midden in een training. Browser: niets; de ochtendmelding van de PWA
  (Periodic Background Sync) blijft zoals hij was.
  - Einde van de rust in Forge (`components/forge/useRestNotice.ts`): bij het starten van de rust
    een melding op de eindtijd; stopt of verandert de rust, dan wordt hij geschrapt of verzet. De
    rustklok rekende al met de eindtijd. Staat het scherm aan als de rust bijna om is, dan geeft Forge
    het signaal zelf en verdwijnt de melding. Geluid en trillen volgen "Signaal als de rust om is"
    van Forge (een eigen kanaal per keuze, met een stil geluid voor alleen trillen), zoals het
    rustsignaal in de app al los van Trillen stond.
  - De ochtendvraag: de komende zeven ochtenden op de tijd van de ochtendvraag, nooit voor "Ochtend
    begint om"; opnieuw gezet na een ochtendcheck en bij elke start. Trilt volgens Trillen.
  - De weekmelding op zondag (`weekNoticeText`): wat er gebeurde, wat er komt en één tip, uit de
    weekterugblik; zonder plan en zonder training geen melding. Trilt volgens Trillen.
  - Instellingen: de bundel Meldingen bij Vandaag en meldingen (vervangt Ochtendmelding en Tijd van
    de melding), met Einde van de rust en Weekmelding op zondag (aan als advies, alleen in de app).
- Toestemmingen (Gegevens en back-up, op de plek van Opslag beschermd, dat erin opgaat): per
  toestemming Aan of Uit, een amber stip als iets wat je aan hebt hem nodig heeft, en "Toestemming
  geven". App: meldingen, exacte wekker, Health Connect ("Binnenkort", nog niet gekoppeld). Browser:
  meldingen en Opslag beschermd.
- Welkomstreeks (`components/welcome/PermissionWelcome.tsx`). App: één keer na de eerste start,
  per toestemming één scherm met de knop om toe te staan en "Niet nu", dan Health Connect en "Je
  gegevens meenemen" (de app en de website hebben elk hun eigen opslag; wie de website al gebruikte
  maakt daar een back-up en zet die in de app terug). Browser: verschijnt niet, behalve in de
  testmodus `#/?welkom=test`.
- Zelf bijwerken (`engine/liveUpdate.ts`, `integrations/liveUpdate.ts`). App: de deploy-workflow zet
  naast de site een zip van de appbuild en `app-versie.json` (versie, bouwtijd, het native niveau
  dat de build nodig heeft, SHA-256). Bij het openen kijkt de app stil of er een nieuwere versie is,
  haalt die op de achtergrond binnen en gebruikt hem bij de volgende start. Meldt een nieuwe bundel
  zich niet binnen 20 seconden als goed gestart, dan valt de app terug op de vorige werkende versie
  en wordt die bundel nooit meer geladen. Vraagt een webversie een nieuwer native deel dan de
  geïnstalleerde APK (`android/native-level.txt`, op te hogen bij een nieuwe plugin of toestemming),
  dan wordt hij niet geladen en staat er één regel "Er staat een nieuwe versie van de app klaar."
  met een link naar de release. Instelling Automatisch bijwerken (aan als advies, alleen in de app).
  Browser: de service worker werkt de site bij zoals altijd.
- De APK (`.github/workflows/android.yml`): bij een push naar main en met de hand, ondertekend met
  een vaste sleutel uit vier secrets in de environment `android-release` en als release op GitHub.
  Zonder de secrets alleen een proef-APK ("ASCEND proef", die naast de echte app staat) als
  artefact, geen release, en een waarschuwing in de run. De `versionCode` is het
  native niveau maal 100000 plus het runnummer, dus elke APK is een update van de vorige. Uitleg:
  `docs/android-sleutel.md`.
- De terugknop (`engine/backPress.ts`, `components/DeviceShellHost.tsx`). App: de knop van
  `@capacitor/app` gaat door dezelfde geschiedenis als de browser, dus een open blad sluit eerst
  (`utils/backLayers.ts`); op een andere pagina terug zoals de browser, en zonder stap terug naar
  Vandaag; op Vandaag sluit pas een tweede druk binnen twee seconden de app, met een korte melding.
  Browser: onveranderd.
- Scherm aan tijdens Forge (de bestaande instelling "Scherm aan tijdens je training", aan als
  advies). App: de plugin Keep Awake. Browser: de Screen Wake Lock API.
- Trillen (`utils/haptics.ts`, instelling Trillen). App: de plugin Haptics, een patroon als losse
  stoten. Browser: `navigator.vibrate`, op een iPhone stil.
- Statusbalk en openingsscherm. App: de statusbalk krijgt de kleur van de lucht bovenaan
  (`--color-sky-top`, 's avonds de donkere), het openingsscherm het marine van `--color-bg` met het
  logo. Browser: niets.

- Back-up door Android: uit (`android:allowBackup="false"` in `android/app/src/main/AndroidManifest.xml`,
  één regel om te wisselen). Zo gaan je gegevens, ook die over je gezondheid, niet ongemerkt naar
  Google; de eigen back-up in Instellingen is de weg. Het nadeel: na een nieuwe telefoon komt de app
  leeg terug tot je je back-up terugzet. De eigenaar beslist dit nog definitief. Toestemmingen zegt
  het in de uitleg.
- Wat er bij het bijwerken naar buiten gaat: alleen het opvragen van `app-versie.json` en de zip bij
  GitHub Pages, op een adres dat met `https://` begint en op `.github.io` eindigt (een ander adres in
  de build betekent: niet bijwerken). De plugin stuurt bij het downloaden de kop
  `X-Capawesome-Device-Id` mee: een willekeurige id die de plugin zelf op het toestel maakt, zonder
  iets van jou erin, en die alleen naar GitHub Pages gaat. Een bouwtijd meer dan een dag in de
  toekomst wordt niet geloofd.
- Database en native niveau: gaat `DB_VERSION` omhoog, dan gaat `android/native-level.txt` mee
  omhoog, zodat terugvallen nooit een oude bundel op een nieuwere database zet. Een test
  (`src/storage/nativeLevel.test.ts`) bewaakt dat, en vergelijkt ook de plugins in `package.json`
  met de vaste lijst in `android/native-plugins.json`: een nieuwe plugin vraagt een nieuwe APK.
- De workflow: bouwen met alleen leesrechten en zonder sleutel; ondertekenen met `zipalign` en
  `apksigner` alleen vanaf main in de environment `android-release`, met de geheimen alleen in die
  stap; de release in een eigen job, de enige die mag schrijven.

De webview laadt de bundel van `https://localhost`. Die herkomst bepaalt waar de gegevens van de app
staan en mag dus nooit veranderen.

## Reden

De rusttimer met het scherm uit en straks Health Connect kunnen alleen in een app
(`docs/onderzoek/Android-app.md`). De eigenaar wil niet bij elke update een APK installeren: de
webcode komt daarom via een eigen zip op GitHub Pages, zonder server en zonder account, en een APK is
alleen nodig als het native deel verandert.

## Alternatieven

- `server.url` naar de live site: officieel niet voor productie, en zonder verbinding start de app
  niet. Niet gekozen.
- `@capgo/capacitor-updater`: kan ook zelf gehost, maar MPL-2.0 en standaard statistiek naar de
  maker die je uit moet zetten. Gekozen is `@capawesome/capacitor-live-update` (MIT): zonder appId
  praat hij met niemand behalve het adres dat ASCEND hem geeft, en hij heeft terugvallen en
  blokkeren van een mislukte bundel ingebouwd.
- Een Trusted Web Activity: geen toegang tot exacte alarmen of Health Connect.
- Keep Awake is geen officiële plugin van Capacitor; `@capacitor-community/keep-awake` (MIT) is de
  gangbare, omdat de Screen Wake Lock API in de Android-webview ontbreekt.

## Bron

`docs/onderzoek/Android-app.md`, `docs/visie/Ontwerprapport instellingen.md` (Meldingen,
Toestemmingen), opdrachten van de eigenaar via de coördinator op 1 november 2026.

## Vervangt

Niets. Opslag beschermd als losse rij gaat op in Toestemmingen.

## Terugdraaien

De map `android/`, `capacitor.config.ts`, `.github/workflows/android.yml` en de stap "Webbuild voor
de app als zip" in `deploy.yml` weghalen. In de browser verandert er dan niets: de lagen vallen
terug op hun webweg. De instellingen `restNotice`, `weekNotice`, `weekNoticeTime` en `autoUpdate`
zijn optioneel en mogen blijven staan.
