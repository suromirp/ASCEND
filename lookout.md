# Lookout: Waar je nu bent (I-61), herkeuring, tak claude/waar-je-nu-bent, commit 4e2efdf

Doorloop: Chromium 360, 390 en 412 px, processor 4x vertraagd, echte touch (CDP en touchscreen), vaste klok
1 november 2026 (Lange duurloop, Briefing, Hardlopen, Start bij: Waar je nu bent), nagemaakte stand met een
nagemaakte plaats. Geolocatie nagemaakt in de pagina; routeplanner en Open-Meteo geblokkeerd en geteld;
kaarttegels vervangen door een raster met lijnen, zodat slepen en knijpen zichtbaar zijn.

Punten van deze keer, alle GROEN op 360, 390 en 412:
1. Veeg met een vinger over de kaart zonder lus (locatie geweigerd) scrolt de pagina: touch-action pan-y op kaart
   en laag; scrollTop 560 naar 682 naar 586 (360), 540, 663, 563 (390), 524, 647, 550 (412).
2. Tik op de kaart zet de ring en toont Start hier; Start hier zoekt vanaf het getikte punt (BRouter-verzoeken
   beginnen bij ongeveer 7.903,46.501, niet bij het midden van de kaart).
3. Groter opent het blad; daar staat de knop Hele kaart; Hele kaart laat slepen en knijpen toe (touch-action none;
   de kaart verschuift bij slepen en zoomt in bij knijpen).
4. De grote kaart toont zonder tik geen ring en geen Start hier; een tik in Hele kaart zet de ring.
5. Audit (Briefing met kaart, blad, Hele kaart): geen horizontale overloop, geen tikdoel onder 44 px, geen tekst
   onder 12 px. Enig mint accent in beeld: de knop Gedaan; de ring is wit met donkere kern.
Herhaald, GROEN op alle breedtes: grof (2000 m) dan scherp (15 m na 5 s): verzoeken beginnen bij 7.9123,46.5123
en nooit bij de grove plek; alleen grof: na ongeveer 15 s "Je plek is nog niet scherp genoeg", nul verzoeken, kaart
met "Tik op de kaart waar je wilt beginnen."; geweigerd: "Geen toegang tot je locatie...", nul verzoeken, kaart.
Console: alleen de bewust geblokkeerde verzoeken (ERR_FAILED) en een WebGL-prestatiewaarschuwing.

Niet gecontroleerd: echte GPS of de Android-plugin; echte kaartondergrond en echte lussen (tegels nagemaakt, routes
geblokkeerd); Wandelen en Luchtfoto; het blad Route buiten de Briefing; de ring in Hele kaart is alleen na een tik
bekeken. De vier controles (tsc, lint, vitest, build) draaide ik niet; alleen een build voor de doorloop (groen).

Afdrukken (afdrukken/, voorvoegsel waar-je-nu-bent-2-): NNN-1-kaart-voor-veeg, -2-na-veeg, -3-na-tik-ring,
-4-na-start-hier, -5-groter-blad, -6-hele-kaart, -7-hele-kaart-na-slepen, -8-hele-kaart-na-knijpen,
-9-hele-kaart-na-tik, herhaal-coarsefine, herhaal-coarse, herhaal-denied, elk op 360, 390 en 412.
