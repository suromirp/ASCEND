# Zweetverlies vragen bij het afronden en vooraf

Datum: 2026-10-27
Status: aangenomen

## Besluit

Zweetverlies vul je niet meer alleen achteraf in het Logboek in. Op de missiekaart van Vandaag staat bij een loop, wandeling of tocht een kleine regel "Weeg je even voor je begint" met een veld voor je gewicht. Bij "Hoe ging het?" (training van het horloge) en op het Gedaan-scherm (training die je zelf afrondt) staat een rij "Zweetverlies: gewicht na (kg)". Opslaan maakt dezelfde gewone meting als het blad in het Logboek, dat blijft voor achteraf. De instelling "Zweetverlies vragen" (Vandaag en meldingen, standaard aan) zet beide plekken uit.

## Reden

De eigenaar vergat zich vóór een run te wegen en zag achteraf nergens dat het kon. Het moment waarop je zegt hoe het ging is het moment waarop je het nog weet. Welke trainingen een meting krijgen blijft dezelfde regel als bij `isSweatLog` (lopen, wandelen, tocht zonder andere sport); voor een geplande training telt `engine/sweatMoments.ts#sweatActivityOfTemplate`, met een test dat template en log hetzelfde kiezen.

Het voorgewicht staat in `AppSettings.sweatPre`: één gewicht per dag, een concept dat twee weken blijft. Zodra de log van die dag een meting heeft, is het voorgewicht daarin overgenomen en telt het niet meer; een tweede training van dezelfde dag krijgt het niet nog eens (`preWeightForLog`). Het reist mee in de back-up (`storage/migrations.ts#migrateSweatPre`, defensief gelezen, per dag samengevoegd, het toestel wint). Een back-up van voor dit veld heeft geen sleutel en laat de lijst op het toestel met rust, dus het schemanummer blijft gelijk. De meting zelf (`sweatEntries`) is ongewijzigd en blijft de enige historie; een log wordt nooit herschreven.

Een gewicht dat er al is (weegschaal via MacroFactor of eigen invoer, van vandaag of gisteren) wordt nooit stil gebruikt: het staat als voorstel met één tik, en bij een weegschaalgewicht naast het trendgewicht is dat het weegschaalgewicht. Is er geen voorgewicht, dan staan voor en na naast elkaar als veld, zonder verwijt; drinken, plassen en de schatting van het horloge staan achter "Meer". De rij slaat alleen iets op als er een bruikbare uitkomst is (zelfde regels als het blad), anders zegt hij zacht dat het later in het Logboek kan.

## Alternatieven

Het voorgewicht als SweatEntry zonder log: afgewezen, een meting hoort bij een training en de lijst wordt op andere plekken geteld en samengevoegd per log. Het gewicht uit MacroFactor stil overnemen: afgewezen, het is een trendgewicht of een weging van een ander moment. De herinnering in het trainingsblad: afgewezen, de missiekaart is waar je kijkt voordat je loopt, en een tekstknop houdt het bij één mint accent.

## Bron

`docs/beslissingen/2026-10-25-zweet-en-water.md` en een verzoek van de eigenaar.

## Vervangt

Niets. Vult `2026-10-25-zweet-en-water.md` aan.

## Terugdraaien

Zet "Zweetverlies vragen" uit: de herinnering en de rij verdwijnen, wegingen blijven bewaard. Het veld `sweatPre` mag leeg blijven of weg; niets anders leest het.
