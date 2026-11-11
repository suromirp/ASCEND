# Backlog opnieuw opgebouwd (11 november 2026)

Opdracht van de eigenaar: de backlog precies laten kloppen met wat live staat en wat nog open is. Gemeten tegen
main op 2a333d5. Een punt ging eruit als de code het doet (gecontroleerd in `src/`), niet omdat een tekst het
zei. Twijfel staat in de backlog onder Nakijken.

## Bronnen

- `git log origin/main` (50 commits sinds 31 oktober), de besluiten in `docs/beslissingen/` van 31 oktober tot 10 november, `.claude/coordinator/overdracht.md`.
- De sessielijst van claude-code-remote (titels en laatste samenvatting van de coördinatoren, bouwers en bouwmomenten van 9 tot 11 november). De volledige gesprekken waren niet te lezen: `list_events` is in deze sessie niet beschikbaar. Open vragen komen dus uit de samenvattingen en de overdracht.

## Eruit, want live

- De "Live op"-blokken van 31 oktober tot 10 november (een paar dozijn): staan in git en in de besluiten; de backlog houdt alleen nog de open resten eruit.
- De lijnen Forge (F1 tot F5) en rest (R1 tot R9) uit het rooster: af; bewijs in de squashcommits van 9 en 10 november en de besluiten per ronde. R10 en stap 4 blijven open.
- Planner en de 48 uur na de lange duurloop: op main sinds 2 november (staat in het blok Live op 8 november).
- Weekcontrole die heen en weer schuift: live 8 november ("de weekcontrole die niet meer heen en weer schuift").
- Spieren voor de berg buiten de weekterugblik: live 8 november, ook in Forge.
- RPE bij een testloop: gebouwd (`PLANNED_MAX_EFFORT_RPE`, `easyMinutes` en de gesplitste test in `engine/legFatigue.ts`, `testEffortRemark` in `TestVerdictCard.tsx`); R3 stelde dat vast.
- Vandaag: vaste volgorde en maximum van kaarten: groepen in `engine/todayCards.ts` (R3).
- Vragen wachten tijdens een ziekmelding: `engine/missedTraining.ts`, test "ziek gemeld: de vragen wachten".
- Eerst koppelen, dan inhalen: `engine/missedTraining.ts` stelt eerst koppelen voor (`missedLink`).
- Rustdag na rust, het deel `trainedOn` tegenover `dayLoads`: gelijkgetrokken (`engine/restDayBack.ts`); het deel over een afgewezen inhaalvoorstel staat onder Nakijken.
- Kansen middelgroot (klimtempo, etappe als band, warmte, bergweer): aangenomen besluit `2026-11-01-kansen-middelgroot.md`, `engine/climbPace.ts`, kaart Klimtempo.
- Back-up naar een eigen map in de Android-app: Map kiezen in `components/settings/groups/GegevensSheets.tsx`.
- Android-meldingen (ochtendvraag, weekmelding op zondag) en scherm aan tijdens Forge: `integrations/notifications.ts`, `DeviceNoticesHost.tsx`, `components/forge/useWakeLock.ts`.
- Gewicht uit Health Connect verder: trend (F5 en R1), vindbaar in zoeken (`settingsIndex.ts`, id `health-connect-gewicht`), uitkomst na Gewicht toestaan (bouwmoment 9 november, 1af7630), gewicht op Stand (b39130d).
- Gewichtstrend voor Forge, rugzakaandeel en beenindex: F5, besluit `2026-11-09-gewicht-bij-eigen-gewicht.md`.
- Forge: ruilen met een echte vervanger (F1), uitleg bij oefeningen proef en batches 1 tot 4 (F3, ab70e8b), gewicht op een toestel (ronde 3), afvinken is de RIR van het doel (ronde 2), vermoeidheid tussen oefeningen (F2), Hoe goed kent Forge je (a770d69).
- Onderzoek RIR en RPE in krachtapps: `docs/onderzoek/RIR en RPE in krachtapps.md`.
- Periode Zonder sportschool: ronde 3 en 46a4e11, 5b70b13, 20fae29. Alleen feestdagen bleef liggen.
- Heuvels en trappen via OpenStreetMap: ronde 2 (live eerste deel 9 november).
- Weerwaarschuwingen en lawinebulletin, regen in het komende uur, maanstand: R2, R3 en het bouwmoment van 8 november.
- Tempo bij zone 2: engine (besluit `2026-11-09-tempo-stabiele-stukken.md`) en grafiek met uitleg achter de i (besluit `2026-11-09-tempo-grafiek.md`). De kleine rest staat onder Nakijken.
- Calisthenics stap 1 tot 3 en Calisthenics algemeen: F4a tot F4g en 8f5ba7e. Het voorstel voor squat op één been en L-sit blijft open.
- Teksten stap 1 tot 3 voor Vandaag, Week, Ascend, Stand, Logboek, Lichaam en Instellingen (R4 tot R9, a39ef65). De oude Akkoord-uitleg "Je ziet eerst wat er verandert" komt in `src/` niet meer voor.
- Zonder doel: de kaart Je week op Je stand (`components/stand/YourWeekStandCard.tsx`). De vorm van de week bij een andere richting blijft open.
- Toestelstanden: "Minder bij een leeg veld zegt naar 0 kilo" is opgelost (`ForgeDock.tsx`, `forgeInput.ts`); Standen wissen met Terugdraaien kwam in F1.
- "Loopinzicht" in de zoekindex: de rij heet nu "Inzicht na een training" met loopinzicht als zoekwoord (`settingsIndex.ts`).
- Uit "Twee harde loopjes": `GarminLink.tsx`, `influence.ts` en `influenceEffects.ts` zijn schoon; `weekConcerns.ts` en `weekValidator.ts` blijven open.
- Routeplanner: fase 1 tot 3, het startpunt (Precies, vanaf je deur, besluit `2026-11-09-startpunt-lus.md`) en de uitleg (besluit `2026-11-10-route-uitleg.md`). De vraag "mag een exact startpunt als eigen instelling" is daarmee beantwoord.
- Bouwmoment 10 november (2741647): datavelden-rij, weeknummer, route-uitleg, uitlegblad, melding in Week.
- Het oordeel van de eigenaar over lengte en toon van de uitleg bij oefeningen: batches 3 en 4 zijn op dezelfde manier gebouwd en live, dus niet meer open.

## Verplaatst, niet weg

- De reviewresten uit de Inbox van 8 tot 10 november: naar Klein en fouten (deel 1 en 2) of Nakijken; de Inbox houdt alleen meldingen van de eigenaar.
- Het plan uit de overdracht (Buiten, Feestdagen, Inbox-rest, Forge herinrichting, uitleg batch 5) is het nieuwe rooster.
- Niet-gezien-op-toestel uit alle Live-blokken: samengevoegd onder Nakijken.
- Meteoalarm: naar Bewust niet (geen CORS), met de reden.
