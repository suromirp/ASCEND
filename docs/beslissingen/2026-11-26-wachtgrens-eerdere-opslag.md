# Wachtgrens van 30 seconden op een eerdere opslag

Datum: 2026-11-26
Status: aangenomen

## Besluit

Tik je in Hoe ging het? of Afronden in Forge op Opslaan terwijl een eerdere poging voor dezelfde geplande training nog loopt, dan wacht het formulier hoogstens 30 seconden op die poging (`EARLIER_SAVE_LIMIT_MS` in `src/state/logSave.ts`, `waitForEarlierSave`). Daarna staat Opslaan altijd weer aan met een zichtbare uitkomst: al gedaan, mislukt of de zin dat het nog loopt (`waited`).

Na de gewone grens in tijd (10 seconden in Hoe ging het?, 15 in Forge) gaat Opslaan bij een geplande training in beide formulieren weer aan; een tik wacht dan via dezelfde weg op de eerste poging. Bij een losse training in Hoe ging het? blijft Opslaan uit tot het opslaan klaar is (I-140).

## Reden

Een knop die wacht heeft een tijdsgrens en een zichtbare uitkomst (CLAUDE.md). Zonder grens bleef Opslaan uit zolang de eerste poging hing, in het ergste geval tot de app opnieuw start. Een tweede tik kan geen tweede log maken: `SessionLogsRepo.add` kijkt en schrijft voor een geplande training in één readwrite-transactie, dus de grens mag Opslaan gerust weer aanzetten.

30 seconden is ruim boven de gewone grens: een trage telefoon of een volle IndexedDB krijgt de tijd om af te ronden, en wie wacht ziet in die tijd de wachtzin met Sluiten als uitweg. Korter geeft sneller de zin dat het nog loopt bij een poging die even later gewoon landt; langer voelt als een knop die het niet doet.

## Alternatieven

Geen grens, wachten tot de eerste poging antwoordt: kan eindeloos duren en breekt de regel van de tijdsgrens. Opslaan meteen weer aan zonder te wachten: dan geeft elke tik dezelfde zin zonder nieuws. De grens instelbaar maken: overwogen, maar het is een technische veiligheidsgrens en geen keuze over je training; wie hem verandert merkt alleen een andere wachttijd.

## Bron

Backlog I-135 (Hoe ging het? en Forge gelijk getrokken met dezelfde woorden), I-139 (dit besluit vastleggen) en I-140 (Opslaan na de grens gelijk in beide formulieren). Werkbriefje `historie-en-logs.md`.

## Vervangt

Niets.

## Terugdraaien

Verander `EARLIER_SAVE_LIMIT_MS` in `src/state/logSave.ts`. Wil je Opslaan na de gewone grens weer uit, zet dan in `src/components/logForm/howDidItGo.ts#saveButton` de tak voor een geplande training terug.
