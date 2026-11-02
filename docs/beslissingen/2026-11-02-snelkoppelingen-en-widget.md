# Snelkoppelingen en widget in de Android-app

Datum: 2026-11-02
Status: aangenomen

## Besluit

De Android-app krijgt vier snelkoppelingen onder het icoon (Vandaag, Week, Logboek, Training afvinken, gelijk aan de PWA) en een kleine widget Vandaag. Dit vraagt een nieuwe APK, dus het native niveau gaat naar 3.

## Reden

De widget laat zien wat je missie van vandaag is zonder de app te openen: de naam van de training en de duur, of Rustdag, of Vakantie. Is de datum in de samenvatting niet van vandaag, dan staat er Open ASCEND. Een tik opent de app op Vandaag.

De web-app schrijft de samenvatting (`engine/widgetSummary.ts`, via `integrations/widgetBridge.ts` en een eigen plugin) naar de voorkeuren van de app op het toestel. Er is geen nieuw pakket, dus `native-plugins.json` krijgt alleen het nieuwe niveau. De snelkoppelingen sturen `app.ascend.training://open/<naam>`; de webview zet dat om naar dezelfde hash-route als de PWA en de origin blijft https://localhost.

Er is geen eigen instelling: je zet de widget zelf op je startscherm, en de snelkoppelingen horen bij het icoon. De uitleg staat bij Toestemmingen in de hulp.

Privacy: de widget kan op een vergrendelscherm staan. Bij ziekte staat er daarom Rust vandaag en niet Ziek. Vakantie mag er wel staan.

Beperkingen:
- De widget ververst als de app draait (na elke wijziging van de planning, bij terugkeer in de app en bij middernacht) en daarbuiten door Android: bij een andere datum of tijdzone en ongeveer elk halfuur. Sluit je de app voor middernacht, dan staat er tot de volgende verversing Open ASCEND.
- Een training die je op je horloge doet en nog niet is binnengehaald, staat nog als open op de widget.
- In ASCEND proef wijzen de snelkoppelingen naar de proefversie (`android/app/src/debug/res/xml/shortcuts.xml`).
- Niet op een toestel of in een Gradle-build geprobeerd bij het schrijven; de eerste echte build is de controle.

## Alternatieven

Het pakket Preferences van Capacitor: een extra pakket en dus een nieuwe lijst, terwijl een plugin van een paar regels genoeg is. Een widget met de week of meer knoppen: past niet bij "wat is mijn missie vandaag".

## Bron

`docs/beslissingen/2026-11-01-android-app.md`, `docs/architectuur/bediening-en-beweging.md`.

## Vervangt

Niets.

## Terugdraaien

Haal de receiver en de `meta-data` voor de snelkoppelingen uit de manifest en de bijbehorende bestanden weg; laat het native niveau staan, want het gaat nooit omlaag.
