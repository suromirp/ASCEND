# De sleutel van de Android-app

Android installeert een nieuwe versie van een app alleen over de oude heen als beide met dezelfde sleutel zijn ondertekend. Met een andere sleutel moet je de app eerst verwijderen, en dan zijn al je gegevens in de app weg. Daarom ondertekent de workflow `.github/workflows/android.yml` de APK met één vaste sleutel die alleen jij hebt. Je maakt hem één keer.

## 1. De sleutel maken

Op een computer met Java (Android Studio heeft het al), in een map buiten de repo:

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

Ga in GitHub naar de repo, Settings, Secrets and variables, Actions, New repository secret, en maak er vier:

1. `ANDROID_KEYSTORE_BASE64`: de hele inhoud van `ascend.keystore.txt`.
2. `ANDROID_KEYSTORE_PASSWORD`: het wachtwoord van het bestand.
3. `ANDROID_KEY_ALIAS`: `ascend` (de naam achter `-alias`).
4. `ANDROID_KEY_PASSWORD`: het wachtwoord van de sleutel.

Gooi `ascend.keystore.txt` daarna weg. Zet de sleutel en de wachtwoorden nooit in de repo.

De volgende keer dat de workflow draait (bij een push naar main, of met de hand via Actions, Android-app, Run workflow) bouwt hij een ondertekende APK en zet hij die als release `apk-<nummer>` op GitHub. Zonder de vier secrets bouwt hij alleen een debug-APK als artefact, zonder release, en meldt hij dat in de run.

## 3. De sleutel bewaren

Bewaar `ascend.keystore` en de wachtwoorden op twee veilige plekken, bijvoorbeeld in je wachtwoordbeheerder en op een usb-stick. Ben je de sleutel kwijt, dan kan geen enkele nieuwe APK nog over de geïnstalleerde app heen: je moet de app dan verwijderen en opnieuw installeren. Maak in dat geval eerst een back-up in de app (Instellingen, Gegevens en back-up) en zet die daarna terug.
