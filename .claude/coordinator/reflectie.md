# Reflectie van de coördinator

Eigenaar, 14 november: elke ronde van de Wachter geeft een check-in en reflecteert. Per ronde één blok, nieuwste bovenaan, hoogstens vijf korte regels. Bij de wissel vat de coördinator de dag samen in de skill werkverdeling (kop Wat werkt, per soort werk) en kort hij dit bestand in tot de laatste drie dagen.

Vaste vragen per ronde:
- Check-in: wat liep, wat is af, wat staat stil.
- Beter: wat ging goed en waarom.
- Slechter: wat kostte tijd of tokens zonder nut.
- Gereedschap: welke skill, plugin of helper werkte, en waar zit potentie (ook wat we nog niet gebruiken).
- Werkstijl: welke aanpak past bij welk soort werk (tekst, engine, opslag, scherm, onderzoek).

## 15 november 09:40 Portugal (Wachter)

- Werkkaart vers (09:22, eigen uurtaak werkt). Bouwers: Q, StairMaster, Sherpa beginner licht stap 1 en 2 (Opus high), Scout dribbelen (Fable).
- Routes wandelen stap 3: proefmerge, tsc, lint, vitest en build groen; kaart:vergelijk loopt; Warden (Sonnet) loopt.
- H gestart op advies van de eigenaar (10% per stap), niet tot 12:00 gewacht. Les: een vraag met deadline beantwoord? Meteen starten.
- Kosten coördinator sinds 14 november ochtend ongeveer $259; de wissel van 10:47 is daarom geen formaliteit.

## 09:05 Portugal (15 november)
- Main fe704a3: 20 onderdelen uit de nacht, web en Android groen. Alle poorten liepen; Warden of Lookout hielden zes keer iets tegen dat de tests niet zagen.
- Les: proefmerges bundelen scheelt tijd maar geeft conflicten in de foto en de standen; steeds de foto opnieuw maken en het verschil lezen.
- Les: effort high voor de coördinator ving de meeste conflicten zelf op; het waard voor een nacht met acht sessies.

## 05:40 Portugal (15 november)
- Op claude/nacht: afbreker, horloge, routes-vorm, logboek, planner (gemist, ziek, randen), M2, instellingen stap 0 tot 2, zonder ASCEND ronde 1 en 2. Lookout over de hele nacht: groen.
- Tegengehouden door de poorten: routes wandelen (getal kwam niet aan in de app), G (eigenaar zou stil zijn tent verliezen), R (afbouw klapte om). Alle drie gevonden door Warden of Lookout, niet door de tests.
- Les: een test op de engine bewijst niet dat de component het doorgeeft; Lookout op het echte scherm blijft nodig.
- Instellingen stap 2 maakt de startlading 4% groter tot stap 3.

## 00:45 Portugal (15 november)
- Goed: Afbreker op claude/nacht na alle poorten; horloge, routes en logboek in één proefmerge (scheelt drie keer tien minuten controles).
- Fout van mij: aangenomen dat bouwers zich niet kunnen melden; twee deden het wel. Vangnet van een half uur blijft.
- Gevonden: test met vaste datum viel na middernacht om (drie bouwers repareerden hem elk apart: conflict); voortaan zo'n fix meteen op claude/nacht en de bouwers melden.
- Gevonden: tekstkaart ziet instellingenteksten niet; "ASCEND" als onderwerp glipte twee keer door. Stap 0 lost dat op.

## 22:40 Portugal (14 november)

- Check-in: live vanavond: oude sportlogs, geen stille Thuis; vier bouwers (planner, horloge, routevorm, afbreker); nachtbranch claude/nacht, één livegang om 07:25.
- Beter: de eigenaar kreeg zijn vragen apart onderaan met keuzeknoppen; vier besluiten in één minuut.
- Slechter: de backlog liep een dag achter op wat live ging; voortaan opschonen bij elke livegang.
- Gereedschap: AskUserQuestion voor beslissingen werkt beter dan een vraag in de tekst; potentie: per ochtend één set knoppen.
- Werkstijl: 's nachts verzamelen en één keer live; overdag per functie.

## 21:40 Amsterdam, 20:40 Portugal (14 november)

- Check-in: om 20:50 Portugese tijd live (route bijsturen, UV, korte training); drie bouwers klaar (geen stille Thuis, planner, oude sportlogs), Warden kijkt.
- Beter: de opdracht van de eigenaar ("stoppen met automatisch thuis") binnen drie minuten bij de bouwer die die bestanden al kende.
- Slechter: drie klare bouwers stonden een half uur stil; ze melden zich niet vanzelf en ik had geen controle gepland.
- Gereedschap: send_later van 30 minuten na elke start is het vangnet; potentie: de bouwer zelf een send_later naar de coördinator laten zetten als hij klaar is.
- Werkstijl: tijden in de tijd waar de eigenaar is; reviews van planner en engine op Fable, de rest op Sonnet.

## 18:40 (14 november)

- Check-in: Klein deel 2 live om 18:35; Route-kaart bij Warden, Buiten bij Lookout, Profielen klein en drie profielen geport na de vijfuurslimiet; vijf profielen binnen, punten A tot L in de Inbox.
- Beter: zelf niet afgeschaald na de correctie van de eigenaar, en het werk liep door tot de limiet.
- Slechter: negen sessies tegelijk liepen de vijfuurslimiet in anderhalf uur vol (17:50 tot 18:40 stil); daarvoor was ik zelf de oorzaak.
- Gereedschap: get_session met rate_limit_info per helper is het vroege signaal; potentie: een teller van lopende sessies in de werkkaart.
- Werkstijl: hoogstens zes sessies tegelijk, profielen in rondes van drie.

## 17:40 (14 november)

- Check-in: drie dingen live om 17:25 (Opwarmset later, Hoe ging het? in Je dag, Opslaan rest); Klein deel 2 bij Lookout; Route-kaart, Buiten en Profielen klein bouwen; vier nieuwe profielen lopen twee weken door.
- Beter: de bouwplekken weer vol na het besluit van de eigenaar om niet af te schalen; de profielen leverden in een kwartier veel echte punten (A tot J).
- Slechter: twee groene branches braken samen Vandaag (`question` weg en nog gelezen); de eerste profielen stopten na 8 tot 20 minuten in plaats van 90.
- Gereedschap: Lookout op een proefmerge van alles samen is de vangst van de dag; potentie: tsc op elke proefmerge vóór Lookout, en profielen die bevindingen in de code bevestigen.
- Werkstijl: bouwen op Opus, Warden op Fable alleen bij engine en opslag; profielen op Sonnet met een harde ondergrens in tijd.

## 14 november, 16:40 (Wachter)

- Check-in: Info-blad (15c405c) en Racedag (3f9962a) live; drie bouwers in review; limiet van zeven dagen op waarschuwing tot zondag 19:00.
- Beter: kleine laatste fixes (een tekstregel) zelf gedaan in plaats van een extra ronde.
- Slechter: veel Fable-reviews op één dag; de weeklimiet kwam in zicht. Volgende keer reviews van tekst en schermen op sonnet.
- Gereedschap: Warden op fable blijft de beste vanger van echte fouten; voor herreviews volstaat sonnet.
- Werkstijl: bij een waarschuwing alleen afmaken, herreviews op sonnet, geen nieuwe bouwers.

## 14 november, 15:40 (Wachter)

- Check-in: fe3e80a live (web en APK groen); Racedag en Info-blad herstelronde klaar, Opwarmset klaar; alle drie in review.
- Beter: herstelrondes in één keer met alle punten van Warden, Pathfinder en de eigen blik samen.
- Slechter: twee van drie bouwers hadden een moet-punt dat de bouwer zelf had kunnen zien (minutenafronding, scherm dat de training opent).
- Gereedschap: Warden op fable met proefmerge en mutaties vangt echte fouten; potentie: die twee vragen als vaste regel in elke bouwopdracht.
- Werkstijl: bouwopdracht noemt voortaan per regel welk scherm de training opent en welke precisie een getal heeft.

## 14 november, 14:40 (Wachter)

- Check-in: 77dc3dc live (web en APK groen); drie nieuwe bouwers klaar en in review.
- Beter: vijf controles tegelijk (drie Warden, één Lookout, één Pathfinder) in plaats van per bouwer.
- Slechter: de volle controle liep over de tijdslimiet van tien minuten; tekstkaart los en met langere grens draaien.
- Gereedschap: Scout op fable leverde een bruikbaar stuk met bronnen in vijf minuten; potentie: refuges.info als adapter.
- Werkstijl: vergelijkingen en grote checks altijd op de achtergrond met een lange grens.

## 14 november, 13:40 (Wachter)

- Check-in: drie bouwers klaar en in review; voorstel begrijpelijk live; werkkaart en reflectie staan.
- Beter: drie reviews tegelijk in plaats van na elkaar.
- Slechter: tijden in UTC gemeld; de eigenaar zag het. Nu regel: altijd Amsterdamse tijd.
- Gereedschap: Lookout vond een kale ISO-datum in de wizard die buiten de opdracht viel; potentie: Lookout standaard laten letten op datumnotatie.
- Werkstijl: kleine fixes die Lookout vindt neemt de coördinator zelf mee bij de squash.

## 14 november, 12:30 (coördinator)

- Check-in: voorstel begrijpelijk live; drie bouwers bezig; werkkaart staat.
- Beter: Lookout liet de stand van de eigenaar zelf namaken (evenwicht) in minuten; eigen blik op afdrukken ving de Engelse naam in Forge.
- Slechter: een half uur maar één bouwer terwijl ik op een review wachtte.
- Gereedschap: Warden op fable vindt echte races (nearbyTerrain) met een proeftest; Ponytail-audit als prompt in onderhoud; Graphify zelf leverde niets, het idee (een graaf van het werk) wel: de werkkaart.
- Werkstijl: tekst en schermen op opus in één ronde plus herstel; engine en opslag op fable met mutatietests door Warden; tests-only op sonnet.
