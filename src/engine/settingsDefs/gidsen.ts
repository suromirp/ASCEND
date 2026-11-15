// ASCEND: de instellingen van de groep Gidsen en kennis (docs/visie/Ontwerp instellingen op een plek.md).
//
// Elke instelling van deze groep staat hier één keer: titel, zin en trefwoorden voor het zoekveld, de plek op de
// pagina, de voorwaarden en de keuze; de uitleg achter de i staat in uitleg/gidsen.ts. De volgorde is die van de
// pagina: een rij, met daaronder wat in haar blad staat. Samenvatting en advies volgen in stap 4.

import type { SettingDef } from './types';

export const GIDSEN: SettingDef[] = [
  {
    id: 'weer-gids',
    page: 'gidsen',
    place: { row: true },
    title: 'Weer en kleding',
    note: 'Het weer en wat je aantrekt bij je training, je plaats, en hoe ASCEND het weer beoordeelt.',
    keywords: ['weer', 'weerbericht', 'kleding', 'aantrekken', 'jas', 'voorspelling', 'open-meteo', 'regen', 'wind', 'regels'],
    route: '/weer',
  },
  {
    id: 'kennisbank',
    page: 'gidsen',
    place: { row: true },
    title: 'Kennisbank',
    note: 'Navigeren, weer, sneeuw, slapen en meer: alles voor onderweg.',
    keywords: ['kennis', 'leren', 'tips', 'navigatie', 'sneeuw', 'slapen', 'veiligheid', 'trainingsgids', 'gids'],
    route: '/kennis',
  },
  {
    id: 'plekken',
    page: 'gidsen',
    place: { row: true },
    title: 'Trainingsplekken',
    note: 'Waar je in Nederland bergop en bergaf kunt trainen.',
    keywords: ['heuvels', 'trap', 'helling', 'bergop', 'locatie', 'dichtbij', 'woonplaats'],
    route: '/plekken',
  },
  {
    id: 'datavelden-bekijken',
    page: 'gidsen',
    place: { row: true },
    title: 'Datavelden bekijken',
    note: 'Open de pagina met de datavelden voor je horloge, ook als de schakelaar uit staat.',
    keywords: ['datavelden', 'dataschermen', 'bekijken', 'horloge', 'pagina', 'velden', 'garmin', 'je horloge', 'workout'],
    route: '/horloge/datavelden',
  },
  {
    id: 'bronnen',
    page: 'gidsen',
    place: { row: true },
    title: 'Bronnen',
    note: 'Alle onderzoeken en bronnen achter de adviezen.',
    keywords: ['onderzoek', 'wetenschap', 'studie', 'literatuur', 'waarom', 'bewijs'],
    route: '/bronnen',
  },
];
