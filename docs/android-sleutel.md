# De sleutel van de Android-app

Android installeert een nieuwe versie van een app alleen over de oude heen als beide met dezelfde sleutel zijn ondertekend. Met een andere sleutel moet je de app eerst verwijderen, en dan zijn al je gegevens in de app weg. Daarom ondertekent de workflow `.github/workflows/android.yml` de APK met één vaste sleutel die alleen jij hebt. Je maakt hem één keer.

## 1. De sleutel maken

Doe dit op je eigen computer, niet op een laptop van je werk: daar kan de werkgever meekijken of back-ups maken, en de sleutel hoort alleen bij jou.

Kijk eerst of Java er is: typ in een terminal (Windows: PowerShell, Mac: Terminal) `keytool -help`. Krijg je "niet gevonden", installeer dan Temurin JDK 21 van adoptium.net en open de terminal opnieuw.

Op een computer met Java (Android Studio heeft het al), in een map buiten de repo en buiten een cloudmap (dus niet in OneDrive, Google Drive, Dropbox of iCloud Drive, die kopiëren alles vanzelf naar een server):

```bash
keytool -genkeypair -v -keystore ascend.keystore -alias ascend -keyalg RSA -keysize 4096 -validity 10000
```

`keytool` vraagt een wachtwoord (twee keer) en een paar gegevens. Bij naam en plaats mag je iets neutraals invullen; die gegevens komen in de sleutel te staan en zijn voor iedereen met de APK te lezen. Gebruik voor het tweede wachtwoord (van de sleutel zelf) hetzelfde, of noteer allebei.

## 2. De vier secrets in GitHub

Zet het bestand om naar tekst:

```bash
base64 -w 0 ascend.keystore > ascend.keystore.txt
```

(Op een Mac: `base64 -i ascend.keystore -o ascend.keystore.txt`.)

Op Windows, in PowerShell in dezelfde map:

```bash
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$PWD\ascend.keystore")) | Set-Content ascend.keystore.txt
```

Gebruik op Windows niet `certutil`: die zet er kop- en voetregels in en dan mislukt de bouw.

De sleutel staat niet bij de gewone secrets van de repo, maar in een environment, zodat alleen de stap die vanaf main ondertekent erbij kan. Ga in GitHub naar de repo, Settings, Environments, New environment, en noem hem `android-release1`. Zet bij Deployment branches "Selected branches" en voeg `main` toe. Maak daar onder Environment secrets vier secrets:

1. `ANDROID_KEYSTORE_BASE64`: de hele inhoud van `ascend.keystore.txt`.
2. `ANDROID_KEYSTORE_PASSWORD`: het wachtwoord van het bestand.
3. `ANDROID_KEY_ALIAS`: `ascend` (de naam achter `-alias`).
4. `ANDROID_KEY_PASSWORD`: het wachtwoord van de sleutel.

Gooi `ascend.keystore.txt` daarna weg. Zeg de coördinator dat de secrets erin staan; plak nooit een wachtwoord of de sleutel in een chat. Zet de sleutel en de wachtwoorden nooit in de repo.

De volgende keer dat de workflow vanaf main draait (bij een push naar main, of met de hand via Actions, Android-app, Run workflow) bouwt hij de APK zonder sleutel, ondertekent hij hem daarna in een aparte stap en zet hij hem als release `apk-<nummer>` op GitHub. Zonder de vier secrets bouwt hij alleen een proef-APK als artefact, zonder release, en meldt hij dat in de run.

Het versienummer gaat vanzelf omhoog: het is het native niveau (`android/native-level.txt`) maal een vaste offset van 100000, plus het nummer van de run, zodat Android elke nieuwe APK als update ziet.

## 3. De sleutel bewaren

Bewaar `ascend.keystore` en de wachtwoorden op twee veilige plekken, bijvoorbeeld in je wachtwoordbeheerder en op een usb-stick. Ben je de sleutel kwijt, dan kan geen enkele nieuwe APK nog over de geïnstalleerde app heen: je moet de app dan verwijderen en opnieuw installeren. Maak in dat geval eerst een back-up in de app (Instellingen, Gegevens en back-up) en zet die daarna terug.

## 4. Als de sleutel is uitgelekt

Denk je dat iemand anders de sleutel of de wachtwoorden heeft, dan kan die een APK maken die Android als update van jouw app accepteert. Doe dan dit:

1. Verwijder de vier secrets uit de environment `android-release1`, zodat er niets meer mee ondertekend wordt.
2. Maak in de app een back-up (Instellingen, Gegevens en back-up) en bewaar hem op je telefoon of computer.
3. Maak een nieuwe sleutel zoals bij stap 1 en zet de vier secrets opnieuw.
4. Laat de workflow draaien, verwijder de oude app, installeer de nieuwe APK en zet je back-up terug.
5. Installeer daarna nooit meer een APK van een andere plek dan de releases van je eigen repo.
