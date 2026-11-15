# Hutten of tent: één vraag bij een tocht op hutten zonder eigen keuze

Datum: 2026-11-15
Status: aangenomen

## Besluit

Een tocht op hutten zonder vastgelegde eigen keuze krijgt op de Reisplanner en de Paklijst één keer de vraag "Je tocht staat op hutten. Klopt dat?", met Klopt, Tent en Beide. Klopt legt het antwoord meteen vast; Tent en Beide gaan als voorstel met Akkoord en leggen het antwoord pas vast bij Akkoord of Liever niet. Twee optionele velden: `GoalDetails.shelterChosen` (true als je de keuze zelf maakte in de start, bij Doel aanpassen of bij Slapen onderweg) en `AppSettings.shelterAsked` (de doelen waarbij de vraag beantwoord is).

## Reden

Sinds de keuze hutten, tent of beide de paklijst en de Reisplanner bepaalt (`2026-11-14-keuzes-avond.md`), zou een hoofddoel dat de migratie op hutten zette (geen tentnacht in het etappeplan) stil de tent en negen tenttaken kwijtraken. Het doel blijft het doel: de app vraagt het, en verandert het alleen na Akkoord. Wie vóór 15 november zelf hutten koos, heeft het veld nog niet en krijgt de vraag ook één keer; dat is één tik. Het antwoord pas vastleggen bij de uitkomst houdt de vraag staan als het voorstel mislukt of veroudert.

## Alternatieven

Het gemigreerde doel stil op tent zetten (verandert een doel zonder vragen). Niets doen (de gebruiker verliest stil wat hij had). Het antwoord bij het tikken vastleggen (een mislukt voorstel laat de vraag dan voorgoed verdwijnen). Een migratiestap: beide velden zijn optioneel en komen er alleen bij, oude doelen en back-ups lezen ongewijzigd, dus er is niets om om te zetten.

## Bron

Review van Warden op backlogpunt G, 15 november; het profielverslag GR5 van 14 november.

## Vervangt

Niets. Vult `2026-11-14-keuzes-avond.md` aan.

## Terugdraaien

Haal `ShelterCheck` weg van de Reisplanner en de Paklijst. De velden mogen blijven staan: zonder de kaart leest niets ze behalve `needsShelterCheck`.
