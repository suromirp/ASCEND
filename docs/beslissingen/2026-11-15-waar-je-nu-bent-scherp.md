# Waar je nu bent: volgen tot je plek scherp is, en zeggen waarom niet

Datum: 2026-11-15
Status: aangenomen

## Besluit

Waar je nu bent (en Gebruik waar ik nu ben) neemt niet meer de eerste plek van het toestel, maar volgt je plek binnen de bestaande grens van 15 seconden tot hij hoogstens 50 m nauwkeurig is, en neemt de eerste goede. Het volgen stopt altijd: bij een goede plek, bij de grens, bij Sluiten en bij een fout. Een plek na de grens telt niet.

De reden als het niet lukt is nu eerlijk:

- Toegang geweigerd: "Geen toegang tot je locatie."
- Android gaf alleen je plek bij benadering: "Android geeft alleen je plek bij benadering. Zet Precieze locatie aan voor ASCEND in de instellingen van je telefoon." Er wordt dan niet gewacht, want scherper komt hij nooit.
- Na de grens alleen grove plekken: "Je plek is nog niet scherp genoeg." met "Probeer het buiten of bij een raam opnieuw, of kies hierboven Andere plek." De vaste vraag van `askStartLine` blijft; alleen het woord voor opnieuw proberen past zich aan, zodat er geen twee keer "probeer opnieuw" staat.
- Een vraag om toegang die zelf faalt, of 'prompt' of 'unknown' teruggeeft, telt niet als weigering. Dan leest de app één keer zonder venster wat Android weet (`checkPermissions`): alleen bij benadering zegt meteen `approximate`; anders probeert de app de plek gewoon en zegt Android zelf of het mag.

De grens van 15 seconden telt vanaf de start van het volgen. Vraagt Android dan zelf nog om toegang (na 'prompt' of een vraag die faalde), dan valt dat venster binnen die 15 seconden; wie rustig leest, krijgt daarna "Je locatie kwam niet op tijd." en tikt Opnieuw. Naar de achtergrond stopt het volgen niet zelf, wel altijd bij de grens; dat is bewust, want de grens houdt het kort.

Nooit stil terug op Thuis of Ongeveer (`2026-11-14-geen-stille-thuis.md` blijft). Er komt geen nieuwe bewaarde vorm bij; de nieuwe reden `approximate` leeft alleen in het geheugen.

## De kaart zonder lus

De eigenaar, 15 november 21:58: "waarom kan ik de kaart niet zien als er nog geen route is; soms wil je gewoon een startpunt selecteren in je omgeving." Lukt je plek niet, dan staat onder de reden en Opnieuw toch de kaart (dezelfde ondergrond, in de Briefing dezelfde lage hoogte), zonder lussen, met de regel "Tik op de kaart waar je wilt beginnen." Een tik zet de ring en Start hier zoekt vanaf dat punt, zoals al na een zoektocht (`startFromMap`; niets bewaard tenzij Bewaar als plek of Maak dit Thuis). In de Briefing is deze kaart niet stil: tikken is hier de keuze, dus geen omweg via Groter.

Het midden van de kaart (`engine/routeStart.ts#askMapCenter`): de laatste grove plek van het volgen van deze poging (alleen in het geheugen, op drie decimalen), anders Thuis, anders je plaats voor het weer (twee decimalen); zonder iets een overzicht met "Tik op de kaart waar je wilt beginnen, of kies hierboven Andere plek." Het midden is nooit een startpunt: geen ring, geen zoektocht, de stand blijft de vraag tot je tikt of een chip kiest. Bij Ongeveer komt de vraag niet voor (de lus begint dan afgerond), dus daar verandert niets.

## Na Warden (15 november)

- Een watch van de plugin kan pas beginnen nadat de app hem stopte (het venster van Android stond nog open, of `clearWatch` kwam net eerder); de plugin kende het id toen nog niet. Een plek voor een handle die al gestopt is, stopt de plugin nu nog een keer (`integrations/geolocation.ts`). Getest met een nagemaakte plugin die "WatchId not found." geeft zolang het volgen niet begon (`src/integrations/geolocationWatch.test.ts`).
- Een fout van de plugin wordt gelezen op zijn code (`OS-PLUG-GLOC-0003` geweigerd, `-0010` te laat), de Engelse tekst alleen als terugval.
- Thuis als midden van de kaart gaat ook afgerond op drie decimalen, zoals de grove plek.
- Na Lookout: de kaart zonder lus in de pagina (Briefing en blad) is stil. Een veeg scrolt de pagina; slepen, knijpen en dubbeltik-zoom staan uit en een laag over de kaart vangt de tik, die de ring zet. Slepen en knijpen doe je in Hele kaart: in het blad de knop op de kaart, in de Briefing eerst Groter. Oorzaak van het oude gedrag: `touch-action: none` en `overscroll-behavior: contain` op het vak van de kaart; dat laatste hield ook een veeg vast die MapLibre niet nam.
- Nog open: bij `approximate` geeft Android wel een grove plek, maar die wordt nog niet gevraagd voor het midden van de kaart.

## Reden

De eigenaar, 15 november, binnen, in de Android-app: bij Start bij, Waar je nu bent, stond steeds "Je precieze plek is niet beschikbaar." Twee oorzaken in de code. Elke toegang die niet precies 'granted' was, ook een fout van de vraag zelf of een weigering, gaf 'coarse'. En de eerste plek boven 50 m werd meteen afgekeurd, terwijl binnen de eerste plek bijna altijd van wifi of een zendmast komt en pas na een paar seconden scherper wordt.

## Alternatieven

- De grens van 50 m ruimer maken: dan ligt het startpunt weer een paar straten naast je deur (`2026-11-11-route-verfijnen.md`).
- Herhaald `getCurrentPosition`: de plugin geeft dan vaak dezelfde bewaarde grove plek terug. `watchPosition` met een update per seconde krijgt wel elke nieuwe plek.
- Stil terugvallen op Ongeveer bij een grove plek: in strijd met `2026-11-14-geen-stille-thuis.md`.
- De stille kaart van de Briefing ook bij de vraag, met een tik naar Groter: een stap extra voor precies wat je hier wilt doen.
- Het midden van de kaart als ring tekenen: dan lijkt het een startpunt, en dat is het niet.

## Bron

Melding van de eigenaar, 15 november 21:42, en zijn aanvulling om 21:58 (Inbox I-61). Code: `src/storage/routeStart.ts#locateStartHere`, `src/utils/geolocation.ts#watchFine`, `src/integrations/geolocation.ts#fineAccessOf`, `src/engine/routeStart.ts#askStartLine`.

## Vervangt

Niets. Vult `2026-11-14-geen-stille-thuis.md` aan met twee redenen en een nieuwe zin voor te grof.

## Terugdraaien

Zet in `locateStartHere` het volgen terug op één `locateMe` met `withTimeout`, en laat `approximate` weer onder `coarse` vallen. De zinnen staan alleen in `engine/routeStart.ts`. De kaart zonder lus: laat `askCenter` weg in `useRouteSearch.ts`, dan toont `AskStart` weer het vak zonder kaart.
