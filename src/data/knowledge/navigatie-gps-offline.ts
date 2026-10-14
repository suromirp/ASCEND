import type { KnowledgeContent } from '../knowledge';

const content: KnowledgeContent = {
  intro:
    'Een maand op de GR5 betekent zo\'n 30 dagen GPS, vaak zonder bereik en met stroom alleen in hutten en dorpen. Horloge en telefoon vullen elkaar aan: het horloge zegt of je nog op de lijn zit, de telefoon laat de kaart zien. Wie dat vooraf goed inricht, kijkt onderweg twee seconden op zijn pols en loopt door.',
  weeklyTip:
    'Zet je GR5-track per etappe als course op je Forerunner en test er thuis één op een rondje in het bos.',
  sections: [
    {
      heading: 'Wat je Forerunner 255 wel en niet kan',
      body:
        'De Forerunner 255 heeft geen kaart. Hij volgt een course als broodkruimellijn: een lijn op een leeg scherm met jouw pijl erop, plus een waarschuwing als je van de route afwijkt. Verder heeft hij Back to Start en TracBack (terug naar je startpunt, of over je eigen gelopen spoor), Up Ahead (afstand tot punten op je course), een barometrische hoogtemeter en een kompas. Volgens Garmin houdt de batterij het 30 uur vol met alleen GPS, 25 uur met All Systems en 16 uur met multiband. Navigeren en een fel scherm kosten extra. Reken bij 7 tot 8 uur lopen per dag op opladen om de twee à drie dagen in GPS-only, en neem de korte kabel altijd mee naar de hut.',
    },
    {
      heading: 'De route op je horloge krijgen',
      items: [
        'Haal de GR5-track als GPX, bijvoorbeeld van de FFRandonnée-site MonGR of uit een planner, en knip hem op in etappes. Kleine courses laden sneller en je ziet de afstand tot het einde van de dag in plaats van tot Nice.',
        'Importeer de GPX in Garmin Connect (Courses) of plan in Komoot of Outdooractive en laat die met je Garmin-account synchroniseren. Vanuit Connect stuur je de course naar het horloge.',
        'Kies de activiteit Hike en zet de course aan via Navigation. IJk de hoogtemeter bij elk wegwijzerbordje met een hoogte.',
        'Test het: in de Alpen merk je anders pas op dag één dat een course in omgekeerde richting staat.',
      ],
    },
    {
      heading: 'Offline kaarten op je telefoon',
      body:
        'De GPS-chip in je telefoon werkt zonder bereik en in vliegtuigmodus; alleen de kaarttegels moet je vooraf binnenhalen. In Frankrijk is de IGN-kaart 1:25.000 de beste ondergrond. Die krijg je met een abonnement in de app van het IGN (lang bekend als IGNrando), of via apps die IGN-lagen aanbieden zoals Visorando of Gaia GPS. Komoot en Outdooractive werken met eigen kaarten, die goed genoeg zijn voor het pad maar minder detail in rots en puin tonen. Download over wifi het hele gebied plus een marge van een paar kilometer, en open de kaart daarna één keer in vliegtuigmodus om te zien of hij er echt staat. Prijzen en downloadlimieten wisselen per app en per jaar.',
    },
    {
      heading: 'Stroom: een systeem voor 30 dagen',
      items: [
        'Telefoon standaard in vliegtuigmodus met GPS aan, en alleen de app open als je hem nodig hebt. Scherm uit, kaart in je hoofd.',
        'Een powerbank van 10.000 mAh laadt een gemiddelde telefoon ongeveer twee keer en je horloge vele keren. Laad hem bij elke stopcontactkans, ook als hij nog half vol is.',
        'Eén lader met twee USB-poorten en korte kabels: in volle hutten is één stopcontact per slaapzaal normaal.',
        'Neem de IGN-papierkaart of een geprinte etappekaart mee voor de dagen dat beide apparaten leeg zijn.',
      ],
    },
    {
      heading: 'Als de batterij of het signaal opgeeft',
      body:
        'Raakt het horloge leeg, dan heb je de telefoon nog. Raakt alles leeg, dan loop je door op markering en kaart: noteer \'s ochtends op de kaart de tijden die de wegwijzers geven en de hoogte van elke col. In diepe dalen en onder steile wanden springt je positie soms 20 tot 50 m door weerkaatsing; kijk naar de lijn van je track over een minuut, niet naar één punt. Multiband helpt daar, maar kost veel stroom.',
    },
  ],
  videos: [
    {
      title: 'Navigation Setup and Overview - Garmin Forerunner 255 Tutorial',
      channel: 'Gauging Gadgets',
      url: 'https://www.youtube.com/watch?v=92lmfYFUgSw',
      minutes: 7,
      language: 'en',
      note: 'Precies jouw horloge: courses laden en volgen, stap voor stap.',
    },
    {
      title: 'Are You Lost?! Get “Back to Start” With Your Garmin! - Forerunner / Fenix / Instinct Tutorial',
      channel: 'Chase the Summit',
      url: 'https://www.youtube.com/watch?v=oTbShRvYM6Y',
      minutes: 7,
      language: 'en',
      note: 'Laat zien hoe Back to Start werkt en wanneer je TracBack gebruikt.',
    },
    {
      title: 'Komoot Offline Maps and Tours 2026 - Save and Manage Without Internet',
      channel: 'Outdoor Tech Instructor',
      url: 'https://www.youtube.com/watch?v=plCKWAvO480',
      minutes: 5,
      language: 'en',
      note: 'Offline kaarten en routes in Komoot opslaan en beheren.',
    },
    {
      title: 'Gaia GPS - Download Maps for Offline Use (iOS)',
      channel: 'Gaia GPS',
      url: 'https://www.youtube.com/watch?v=xaM39xMqpwU',
      minutes: 2,
      language: 'en',
      note: 'Officiële uitleg om een kaartgebied te downloaden, handig met een IGN-laag.',
    },
  ],
  sources: [
    { label: 'Garmin Forerunner 255: Battery Life Information (handleiding)', url: 'https://www8.garmin.com/manuals-apac/webhelp/forerunner255series/EN-SG/GUID-96FA5810-836F-45C4-85DC-2C811F68F0CD-9120.html' },
    { label: 'Garmin Forerunner 255: productpagina en specificaties', url: 'https://www.garmin.com/en-US/p/780139/pn/010-02641-00' },
    { label: 'Komoot Support: Download routes and maps for offline use', url: 'https://support.komoot.com/hc/articles/10356476920986' },
    { label: 'IGN: dossier de presse loisirs outdoor (IGNrando, hors ligne)', url: 'https://www.ign.fr/files/default/2020-07/dp_loisirs_outdoor.pdf' },
  ],
};

export default content;
