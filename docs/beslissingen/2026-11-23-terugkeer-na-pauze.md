# Terugkeer na een pauze

Datum: 2026-11-23
Status: aangenomen

## Besluit

De rustiger instap na een pauze (`engine/reentry.ts`, regel REENTRY) telt de pauze vanaf je laatste echte training en verloopt niet meer na vier dagen. Een vrije periode mag je achteraf vastleggen of verlengen, tot een grens die je instelt. Backlog I-124.

- De pauze telt vanaf je laatste echte training: het laatste log dat geen herstel is (sjabloon van type recovery), voor de dag dat je terug bent. Hij loopt tot je eerste training daarna, of tot vandaag. Meer dan zeven dagen zonder training (`REENTRY_PAUSE_DAYS`) na een gemelde pauze (ziek, vakantie, tocht, zonder sportschool) is genoeg voor een voorstel, ook als de twee weken ervoor vol waren. Dat is bewust breder dan eerst: wie na een gemelde pauze meer dan een week niet trainde krijgt het voorstel, wat de weken ervoor ook waren. De oude toets (minder dan 40 procent van twee gewone weken gedaan) blijft daarnaast gelden, en is de enige toets zonder gemelde pauze (de maandag). Het verhaal en de oorzaak (ziek, weg, allebei, of stil) lezen vanaf je laatste training als die eerder lag dan de twee weken.
- De dag terug blijft dezelfde: de dag van weer beter of de dag na een periode weg. Eén id per terugkomst (`reentry:<dag terug>`). Het voorstel staat de hele eerste week na die dag (dag terug tot en met zes dagen erna, `OFFER_DAYS`), tot je kiest. Na Liever niet of Akkoord komt het voor die terugkomst niet terug. De dag na die eerste week niet meer: dan is de terugkomst voorbij.
- Het venster van zeven dagen kortere duur begint op de dag dat je het voorstel ziet, of op de dag terug als die nog moet komen. Nooit in het verleden. De bescherming voor een test of wedstrijd en `raceWeekGuard` kijken naar dat venster.
- Het droge feit eerst: "Je laatste training was wo 13 januari, 12 dagen geleden. Daartussen was je ziek en weg." Daarna wat een gewone week heeft en het voorstel ("vanaf vandaag tot en met ..."). Zonder lange pauze blijft de oude zin over de twee weken. Liever niet links, Bekijk rechts, dan het voorstel van de planningsronde met Akkoord: dezelfde primitives als eerst (`CoachCard.tsx#AdviceItem`, `useHorizonChange`).
- Forge iets lichter: na meer dan tien dagen zonder krachttraining tot het begin van het venster (`REENTRY_FORGE_DAYS`) zegt het voorstel er één zin over ("Je laatste krachttraining was 12 dagen geleden, dus je eerste krachttraining in die dagen begint 5% lichter."), en die zin staat ook in de regel van het voorstel van de planningsronde. Alleen met Akkoord op de instap: Forge leest de bewaarde week (`reentryForgeLighter`) en rekent dan met dezelfde 5% minder kracht als Na een pauze lichter beginnen (`strengthModel.ts#prescribe`, `reentry`), met de reden onder de oefening. Forge meet de tien dagen tot het begin van de bewaarde week, net als het voorstel: zo wordt Forge nooit lichter als die zin niet in het voorstel stond, en alleen de eerste krachttraining. Komt 5% minder kracht nog op hetzelfde gewicht uit, dan zakt de eerste werkset naar het gewicht het dichtst bij 95% van vorige keer, minstens één stap: de zin zegt lichter, dus het gewicht is lichter. Alleen als krachttraining aan staat en Na een pauze lichter beginnen aan staat; daar hoort deze keuze bij, dus geen eigen instelling. De ijkset staat in een instap al uit (`quietWeeks`, oorzaak `eased`); daaraan verandert niets.
- Een periode achteraf: `validateLeaveDraft` weigert een periode die voorbij is niet meer, zolang de eerste dag binnen de grens valt. Een periode die je bijwerkt mag zijn eigen eerste dag houden. Een periode die nog loopt of komt mag zoals altijd eerder beginnen. Bij een te oude periode zegt de melding het feit en wat wel kan: "Dit begint meer dan 4 weken geleden. Achteraf vastleggen kan vanaf ma 28 december." Het voorstel verplaatst niets op voorbije dagen (dat deed `planLeaveChange` al nooit) en zegt in een eigen regel welke dagen nu als weg tellen; zonder sportschool alleen kracht in de sportschool. Logs blijven ongemoeid, een dag met een log blijft een gedane training (`deriveSessionStatus`, `isPausedFor`). Een periode die nu later eindigt geeft een nieuwe terugkomst en een nieuw id, maar binnen dezelfde pauze (een antwoord voor een dag terug na je laatste training) vraagt ASCEND niet opnieuw: Liever niet geldt voor de hele pauze. Vrije dagen leg je niet achteraf vast; de melding zegt dat je een einddatum vanaf vandaag kiest of het als vakantie vastlegt. De regel Voorbij in het voorstel staat er alleen als er voorbije dagen bijkomen.
- Nieuwe instelling Periode achteraf vastleggen (Planning, in de nieuwe bundel Rond een vakantie samen met Rond een vakantie schuiven en Opzij voor een vakantie (dat stond onder Geavanceerd), want Planning zit op het plafond van 12 rijen): Tot 4 weken terug (het advies), Tot 2 weken, Tot 8 weken of Niet achteraf (zoals vroeger). `AppSettings.leaveBackfill`, optioneel, dus geen migratiestap; een onbekende waarde in een back-up valt weg (`backupClean.ts`). De lijst in Week toont een periode zolang je hem nog mag verlengen.
- Geen nieuwe instelling voor de terugkeer zelf: de keuze driekwart, de helft of niet voorstellen blijft de enige. De zeven dagen van de pauze en de tien dagen voor Forge zijn de regel, geen keuze die de app voor je maakt naast die ene.

## Reden

Nagespeeld met echte gegevens (alleen het patroon, nagemaakt in `src/engine/terugkeerNaPauze.test.ts`): laatste training op dag D, vanaf D+3 vijf dagen zonder sportschool met twee dagen ziek, en vanaf D+12 een volle week zonder voorstel. `returnDay` nam D+8 als terugkomst, het voorstel stond alleen D+8 tot en met D+11, het venster telde vanaf D+8, en de twee weken voor D+8 waren vol, dus zelfs op tijd was er geen voorstel gekomen. Wie op reis is of ziek was opent de app niet altijd meteen; een voorstel moet staan tot je kiest. En wie langer weg was dan hij vooraf zei, wil dat achteraf kunnen zeggen, zodat die dagen niet als gemist tellen.

Tien dagen voor Forge: tot ongeveer vier weken verlies je weinig kracht (Bosquet 2013, de bron van Na een pauze lichter beginnen), maar na anderhalve week zonder kracht en een week met minder duur is een eerste training iets lichter een kleine, veilige stap. Dezelfde 5% als na een lange pauze, zodat er geen tweede rekenregel bij komt.

## Alternatieven

- De dag terug verschuiven naar je eerste training na de pauze. Niet gekozen: het id moet bij de terugkomst horen (valkuil in het werkbriefje planning), en wie niet traint krijgt dan nooit een voorstel.
- Het voorstel laten staan tot de eerste volle kalenderweek voorbij is (D+15 nog wel). Niet gekozen: de eerste week na de terugkomst is één heldere grens, en het venster begint toch op de dag dat je kiest, dus wie op D+14 kiest heeft zeven dagen.
- Een eigen instelling voor hoeveel dagen een pauze is. Niet gekozen: de keuze driekwart, de helft of niet voorstellen dekt wat je wilt; een drempel erbij is een knop zonder vraag van de eigenaar.
- Forge lichter als eigen kaart in Forge met een eigen Akkoord. Niet gekozen: het hoort bij dezelfde terugkomst; twee voorstellen voor één pauze is te veel. De reden staat wel onder de oefening.
- Achteraf vastleggen zonder grens. Niet gekozen: een periode van maanden terug verandert weken die je allang afsloot (Ritme, de reeks, de weekterugblik).

## Bron

Backlog I-124 (eigenaar), nagespeeld met de skill naspelen; `docs/beslissingen/2026-11-14-vakantie-en-ziek-niet-gemist.md` (K), `docs/beslissingen/2026-11-15-week-telling-zonder-sportschool.md`.

## Vervangt

`2026-11-14-vakantie-en-ziek-niet-gemist.md` op één punt van K: het voorstel staat niet meer vier dagen maar de hele eerste week na de terugkomst, en het venster begint op de dag dat je kiest in plaats van op de dag terug.

## Terugdraaien

Achteraf vastleggen: de instelling op Niet achteraf. De terugkeer: `OFFER_DAYS` terug naar 3, `from` weer de dag terug, en de toets `longPause` uit `proposeReentry` halen. Forge: `reentryWeeks` uit de context van `planWorkout` halen of Na een pauze lichter beginnen uit zetten. Er is geen opgeslagen vorm veranderd behalve het optionele veld `leaveBackfill`, dat een oudere app negeert.
