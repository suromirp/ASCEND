# Wat speelde er

Datum: 2026-10-25
Status: aangenomen

## Besluit

Je kunt in het logboek vastleggen wat er speelde bij een training of op een dag: alcohol (met hoeveel glazen: 1 à 2, 3 tot 5 of 6 of meer), wiet, ziek, kort geslapen, laat gegeten, cafeïne, stress of iets anders in je eigen woord. Dat gebeurt alleen in het logboek: in het blad van een training en in een dag van de kalender. De ochtendkaart vraagt er niet naar. Een training met een hartslag die bij een rustig tempo duidelijk afwijkt krijgt een klein teken in Logboek en Week. Los van de reden kun je een training laten "Niet meetellen voor hartslag" en een nacht "Deze nacht niet meetellen"; beide staan standaard uit. Op Je stand laat "Wat doet dit met je?" vanaf 3 keer per reden zien wat het met je rusthartslag, HRV, slaap, hartslag bij tempo en zwaarte doet, tegenover je eigen normale schommeling.

Alles staat in `AppSettings.influences` (`models/influence.ts`) en gaat mee in de back-up.

## Reden

De eigenaar wil weten wat alcohol en wiet met zijn herstel en trainingen doen, ook als dat confronterend is, en wil dat een avond met een paar glazen zijn trends niet scheef trekt. Het onderzoek (`docs/onderzoek/Alcohol en herstel.md`, `docs/onderzoek/Cannabis en training.md`) laat zien dat het effect bij één of twee glazen klein is en bij meer duidelijk: daarom de hoeveelheid in drie stappen, en het overzicht per stap.

De antwoorden van de eigenaar op de vijf open vragen van het ontwerp:

1. De redenen gaan mee in de back-up. Alles wat in de app gebeurt hoort in de back-up.
2. Een voorstel om een test te verschuiven komt alleen als er die dag een test of wedstrijd staat en je de avond ervoor 3 of meer glazen vastlegde, of als er morgen een staat na 6 of meer glazen. Bij wiet alleen als de test dezelfde dag is. Gewone trainingen schuiven nooit om een reden. Het voorstel gaat zoals elk voorstel met Akkoord.
3. ASCEND zegt alleen "lijkt op" als een reden minstens 4 keer is vastgelegd, de andere ochtenden of loopjes samen ook minstens 4 keer, en de twee banden elkaar niet raken. Anders zegt ASCEND niets over een oorzaak.
4. Alcohol en wiet staan standaard tussen de keuzes. Een instelling om een reden uit de lijst te halen is niet nodig.
5. De keuzes staan in het logboek, niet op de ochtendkaart.

Wat ASCEND zelf weet (warmte uit het weer, een zware beendag uit het logboek, een korte nacht van het horloge, een ziekmelding) staat in het blad als voorstel met de bron erbij, en telt pas na een tik. ASCEND noemt nooit uit zichzelf alcohol of wiet. De reden staat nooit in de lijst, nooit in de tekst voor Strava en nooit in een melding.

## Alternatieven

Een vraag op de ochtendkaart na een afwijkende nacht: de eigenaar wil dat niet, de ochtendkaart blijft kort. Een verborgen of neutrale "afwijking" zonder namen: de eigenaar wil alcohol en wiet bij naam, met de hoeveelheid. Een veld op `SessionLog`: een log wordt nooit herschreven, dus een eigen lijst naast de historie, zoals `nightJudgments`.

## Bron

Gesprek met de eigenaar op 25 oktober 2026, het ontwerp "Invloeden ASCEND" van Cartographer en de twee onderzoeken hierboven.

## Vervangt

Niets.

## Terugdraaien

Zet in Instellingen, Lichaam, de rijen van "Wat speelde er" uit: het teken, het overzicht en het voorstel verdwijnen, en wat je vastlegde blijft bewaard. "Vastgelegd" wist alles na bevestiging. Het veld `influences` mag blijven staan.
