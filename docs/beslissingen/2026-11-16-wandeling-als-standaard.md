# Wandeling als standaard onder Wandelen

Datum: 2026-11-16
Status: aangenomen

## Besluit

Onder Wandelen in Losse training is de standaard een gewone wandeling (`tpl_walk`, naam Wandeling, 45 minuten, geen vaste dag), geen Herstelwandeling meer. Het sjabloon blijft van type recovery en krijgt de rol `plain_walk` (`data/templateRoles.ts`). Die rol geeft de soort zijn eigen woord: de rij, het moment na Gedaan, de feiten en het Logboek zeggen Wandelen en Gedaan, nergens Herstel. Alleen de echte herstelwandeling blijft Herstel en Herstel gedaan.

## Reden

Een gewone wandeling is geen herstel: wie met zijn ouders loopt, herstelt niet. Type hiking was de verkeerde weg, want dan telt de wandeling als training in de planner, in Week en in de belasting, en bewegen de golden scenario's A en C. Type recovery laat de planner en de golden scenario's staan en telt niet als training in Week, Logboek en belasting. Het woord komt daarom uit een rol op het sjabloon in plaats van uit het type of een lijst met id's in componenten (`engine/sports.ts#sessionKindLabel`, `engine/savedMoments.ts#isRestLog`, feitenregel `walk` in `data/sessionStyle.ts`). De wandeling is ook geen kandidaat in het weekvoorschrift (`rankCandidateTemplates`).

Het log bewaart `modality: 'recovery_walk'`, met het label Wandelen: `walkKind` (`engine/routeTarget.ts`) leest die sleutel om een wandeling van een herstelwandeling te onderscheiden, en historie schrijven we niet om.

De import van het horloge (`engine/activityImport.ts`) noemt een wandeling nog Herstelwandeling; dat is een apart punt.

## Alternatieven

- Type hiking voor de wandeling: telt als training, beweegt de planner en de golden scenario's.
- Een lijst met sjabloon-id's in de componenten: dat is precies wat de rollen voorkomen.
- Een nieuw sjabloontype: raakt elke plek die op type leest, voor één woord.

## Bron

Review van Warden op de eerste versie (16 november), inbox I-70. Code: `engine/sports.ts`, `engine/savedMoments.ts`, `data/templateRoles.ts`, `data/sessionStyle.ts`, `engine/sessionBrief.ts`.

## Vervangt

De alinea uit `docs/beslissingen/2026-11-15-wandeling-plannen.md`: "Wandelen heeft geen gewone wandeling; de rustigste is de Herstelwandeling". Dat bestand blijft staan zoals het was.

## Terugdraaien

Haal `plain_walk` uit `data/templateRoles.ts`, `tpl_walk` uit `AD_HOC_DEFAULT_ID` en zet de feitenregel van `tpl_walk` terug op `recovery`. Bewaarde logs van `tpl_walk` blijven geldig.
