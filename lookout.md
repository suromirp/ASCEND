# Lookout: Waar je nu bent (I-61), tak claude/waar-je-nu-bent, commit f29ca07d

Doorloop: Chromium 360, 390 en 412 px, processor 4x vertraagd, echte touch, vaste klok 1 november 2026
(Lange duurloop, Briefing, Hardlopen, Start bij: Waar je nu bent), nagemaakte stand (kracht-demoprogramma met een
nagemaakte plaats). Geolocatie nagemaakt in de pagina; routeplanner, kaartbronnen en Open-Meteo geblokkeerd en
alleen geteld (er kwam geen echte route of kaartondergrond).

1. Grof (2000 m) en daarna scherp (15 m, na 5 s): GROEN op 360, 390 en 412. De eerste verzoeken van de
   routeplanner (BRouter) beginnen bij de scherpe plek (7.9123,46.5123), nooit bij de grove (7.9,46.5).
2. Alleen grove plekken tot de grens: GROEN. Na ongeveer 15 s: "Je plek is nog niet scherp genoeg. Probeer het
   buiten of bij een raam opnieuw, of kies hierboven Andere plek." met Opnieuw, Andere plek erboven en de kaart
   met "Tik op de kaart waar je wilt beginnen." Geen stille Thuis (er was een Thuis, er liep niets vanaf Thuis).
3. Toegang geweigerd: GROEN. "Geen toegang tot je locatie. Probeer het opnieuw, of kies hierboven Andere plek."
   met Opnieuw en de kaart.
4. Kaart zonder lus: tikken GROEN, scrollen ROOD. Een tik zet de ring, Start hier verschijnt, Start hier zoekt
   vanaf het getikte punt (verzoeken bij 7.898,46.501, niet bij het midden). Een veeg met een vinger over de kaart
   verschuift de sheet NIET (scrollTop blijft 300, richting omlaag en omhoog, op alle drie de breedtes); een veeg
   direct erbuiten scrolt wel (300 naar 251). Oorzaak: `src/components/RouteMap.tsx` regel 309,
   `touchAction: quiet ? 'pan-y' : 'none'`; de kaart van AskStart is niet stil (geen onOpen), dus touch-action none
   en de kaart pant zelf. De kaart is 222 px van een scherm van 800 px: een duim die erop begint, scrolt de pagina
   niet. Dit wijkt af van de eis dat een veeg over de kaart de pagina scrolt.
5. Audit in het blad: geen horizontale overloop, geen tikdoel onder 44 px, geen tekst onder 12 px, op alle
   breedtes en scenario's. Tekst niet afgekapt (regels lopen door, Opnieuw en meldingen volledig zichtbaar).
   Enige mint accent in beeld: de knop Gedaan (de zonebalk is bestaande Z2-kleur). Console: alleen de
   bewust geblokkeerde verzoeken (ERR_FAILED) en een WebGL-prestatiewaarschuwing van MapLibre.

Niet gecontroleerd: echte GPS of de Android-plugin (alleen navigator.geolocation nagemaakt; de melding
"alleen bij benadering" en `checkPermissions` niet); Wandelen (alleen Hardlopen bekeken, hetzelfde blok);
echte kaartondergrond en echte lussen (verzoeken geblokkeerd); de kaart met Luchtfoto; het Routepaneel buiten
de Briefing. De vier controles (tsc, lint, vitest, build) draaide ik niet; alleen een build voor de doorloop (groen).

Afdrukken (afdrukken/, voorvoegsel waar-je-nu-bent-): scherp-3-na-scherp, grof-3-melding, grof-4-na-veeg,
grof-5-na-tik, grof-6-start-hier, geweigerd-3-melding, elk op 360, 390 en 412.
