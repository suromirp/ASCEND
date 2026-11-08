# Koppelingen en data

Wat van buiten komt (intervals.icu, MacroFactor, Health Connect, weer, locatie), de Android-schil, bijwerken zonder nieuwe APK, en wat ASCEND uit die data leert.

## Bestanden
- `src/integrations/types.ts#DataSourceAdapter` de enige vorm waarachter een bron komt; geen veld met een leveranciersnaam
- `src/integrations/intervalsIcu.ts#ACTIVITY_FIELDS` welke velden de aanvraag vraagt; een veld dat je leest hoort erin
- `src/integrations/healthConnect.ts#mapHealthWorkout` het enige bestand dat de plugin kent
- `src/storage/externalActivities.ts` activiteiten van buiten, op dit toestel en niet in de back-up
- `src/storage/macrofactor.ts#importMacroFactorWorkouts` MacroFactor-training erin, `getMacroFactorState` leest
- `src/engine/sourcePrecedence.ts#isSameMoment` dezelfde training van twee bronnen is één moment
- `src/engine/sourceWatch.ts#sourceSilence` Vangnet: stil na drie dagen zonder data terwijl de koppeling werkt
- `src/engine/morningBackup.ts#archiveToClear` ochtendgetallen in de back-up, archief en opruimen
- `src/engine/liveUpdate.ts#updateDecision` bijwerken zonder nieuwe APK, `minNative` in `app-versie.json` (gemaakt bij de build door `scripts/app-versie.mjs`, niet in de repo)
- `src/engine/signalSettings.ts` instellingen van de signalen uit je gegevens, allemaal aan en geen verandert de planning
- `src/engine/rainSoon.ts#rainSoonNote` regen in het komende uur uit `minutely_15`, alleen tekst; `src/engine/moon.ts#moonNote` maanstand zonder API
- `src/engine/activityText.ts#activityText` Strava-tekst om te kopiëren

## Nooit
- Een veld met een leveranciersnaam in het domein (`garminElevation`): bronnen vullen dezelfde vormen met `source`.
- Naar Strava schrijven; alleen een tekst om te kopiëren.
- Een signaal uit je data de planning zelf laten veranderen: elk signaal is instelbaar en alleen een voorstel met Akkoord mag dat.
- Een sleutel of API-sleutel plakken, gebruiken of opslaan; een back-up van de eigenaar komt niet in de repo.
- Weer, luchtkwaliteit, bergweer of een plek in een back-up zetten.
- Een log omschrijven omdat een bron iets anders zegt: zie `docs/architectuur/historie-en-logs.md`.

## Valkuilen
- Een native wijziging (plugin, rechten, manifest) bouw je eerst als proefbouw door de Android-workflow (`.github/workflows/android.yml`, "ASCEND proef") voordat het op main komt.
- Staat `minNative` in `app-versie.json` hoger dan het niveau van de geïnstalleerde app, dan vraagt dat een nieuwe APK (`needs-app`). Gaat `DB_VERSION` omhoog, dan gaat `android/native-level.txt` mee; een nieuwe plugin vraagt een nieuwe APK (`src/storage/nativeLevel.test.ts`).
- Een Capacitor-plugin is een Proxy met een `then`: geef hem nooit terug als waarde van een belofte (`src/integrations/pluginPatroon.scan.test.ts`).
- Bij Health Connect telde bewegingstijd tegen totale tijd een tocht dubbel (review 2 november); vergelijk dezelfde tijd.
- De ochtenden in de back-up zijn een archief dat blijft na ontkoppelen; uitzetten vraagt eerst en biedt Ongedaan maken, want het ging bijna fout met dataverlies (review 1 november).
- De locatie heeft een grens van tien seconden en geeft altijd een plek of een reden; het weer volgt alleen je plek als dat aan staat. Kwartierregen (`rainSoon`) leest "nu" op de klok van de plek, staat alleen in het geheugen en zwijgt bij oude of lege data.
- Een nieuwe bron krijgt een regel in `settingsParts` (`src/components/settings/settingsFactsParts.ts`) en een eigen grens in tijd; een trage bron houdt geen andere rij tegen.

## Testen
- Tijdens het werk: `npx vitest run src/integrations src/engine/sourcePrecedence src/engine/sourceWatch src/engine/liveUpdate src/storage/macrofactor src/storage/nativeLevel`
- Nooit laten bewegen: `src/storage/planGolden.test.ts`.
- Tekstkaart (`npm run kaart:vergelijk`) alleen als een scherm verandert; native werk controleer je op een toestel.

## Lees verder
- `docs/architectuur/koppelingen-en-data.md`
- `docs/beslissingen/2026-11-01-android-app.md`, `docs/beslissingen/2026-11-02-locatie.md`
- `docs/beslissingen/2026-10-31-kansen-stap-0.md`, `docs/onderzoek/Kansen met gegevens.md`
