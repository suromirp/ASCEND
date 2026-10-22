// ASCEND — bivakregels per gebied langs de GR5, zoals ze in het onderzoek
// staan (docs/visie/GR5-reis en coaching.md, 2b, "Bivakregels per gebied").
// Alleen wat daar met een bron staat; niets is aangevuld. Bronnen zijn van
// 2024 tot 2026 en regels veranderen: elk gebied toont "controleer voor
// vertrek" met de link.

export interface SourceLink {
  label: string;
  url: string;
}

export type BivouacAreaId =
  | 'zwitserland'
  | 'contamines'
  | 'sixt-passy'
  | 'aiguilles-rouges'
  | 'vanoise'
  | 'queyras'
  | 'mercantour';

export interface BivouacRegime {
  id: BivouacAreaId;
  area: string;
  // Korte regels, elk een volledige zin.
  lines: string[];
  // Een tent zomaar neerzetten waar je wilt mag hier niet. Dan waarschuwt de
  // app bij de keuze "Tent".
  restrictsFreeTent: boolean;
  // Wat de bronnen nog niet beantwoorden.
  openPoint?: string;
  sources: SourceLink[];
}

const RESERVE_SITE: SourceLink = { label: 'Reserveren: bivouac.nature-haute-savoie.fr', url: 'https://bivouac.nature-haute-savoie.fr' };
const FFR_HAUTE_SAVOIE: SourceLink = {
  label: 'FFRandonnée, augustus 2025',
  url: 'https://www.ffrandonnee.fr/s-informer/actualites/reserver-sa-place-de-bivouac-c-est-dans-les-reserves-naturelles-de-haute-savoie',
};
const FFR_GTA_BIVAK: SourceLink = {
  label: 'FFRandonnée, oktober 2024',
  url: 'https://www.ffrandonnee.fr/s-informer/actualites/le-bivouac-sur-la-grande-traversee-des-alpes-gr-5-gta',
};

export const BIVOUAC_REGIMES: Record<BivouacAreaId, BivouacRegime> = {
  zwitserland: {
    id: 'zwitserland',
    area: 'Zwitsers stuk bij de Portes du Soleil',
    lines: [
      'Volgens het merkblad van de Zwitserse alpenclub is één nacht van een kleine groep boven de boomgrens meestal geen probleem.',
      'Dat geldt buiten beschermde gebieden en wildrustzones.',
    ],
    restrictsFreeTent: false,
    sources: [
      { label: 'SAC-merkblad', url: 'https://ascona-locarno.com/dam/jcr:964ca17a-0ddc-404f-93b7-a78dc2dc52b1/SAC_Campieren_Biwakieren_d.pdf' },
      { label: 'DAV, overnachten in de bergen', url: 'https://www.alpenverein.de/uebernachten-am-berg' },
    ],
  },
  contamines: {
    id: 'contamines',
    area: 'Natuurreservaat Contamines-Montjoie (Haute-Savoie)',
    lines: [
      'Sinds 2023 reserveer je bivakplekken in de reservaten van de Haute-Savoie via een reserveringssite.',
      'In de Contamines mag je alleen op de bivakplekken La Rollaz en La Balme, van 19.00 tot 9.00 uur.',
    ],
    restrictsFreeTent: true,
    sources: [RESERVE_SITE, FFR_HAUTE_SAVOIE, FFR_GTA_BIVAK],
  },
  'sixt-passy': {
    id: 'sixt-passy',
    area: 'Natuurreservaat Sixt-Fer-à-Cheval en Passy, rond Anterne (Haute-Savoie)',
    lines: [
      'Sinds 2023 reserveer je bivakplekken in de reservaten van de Haute-Savoie via een reserveringssite.',
      'Rond Anterne noemt het toerismebureau 19.00 tot 9.00 uur, van half juni tot eind september.',
      'Honden zijn er verboden.',
    ],
    restrictsFreeTent: true,
    sources: [
      RESERVE_SITE,
      FFR_HAUTE_SAVOIE,
      { label: 'Haute-Savoie Tourisme, Lac d\'Anterne', url: 'https://www.haute-savoie-tourisme.org/nature/itineraires-randonnees/5667450-montee-au-lac-d-anterne' },
    ],
  },
  'aiguilles-rouges': {
    id: 'aiguilles-rouges',
    area: 'Natuurreservaat Aiguilles Rouges (Haute-Savoie)',
    lines: [
      'Sinds 2023 reserveer je bivakplekken in de reservaten van de Haute-Savoie via een reserveringssite.',
      'Bij sommige meren is bivak in juli en augustus verboden, bij andere alleen op reservering.',
    ],
    restrictsFreeTent: true,
    openPoint: 'De bronnen spreken elkaar over de precieze periodes tegen. Dat is een taak voor het voorjaar van 2027.',
    sources: [
      RESERVE_SITE,
      FFR_HAUTE_SAVOIE,
      { label: 'Asters-CEN74, presentatie 2025', url: 'https://www.biodiversite-auvergne-rhone-alpes.fr/wp-content/uploads/2025/04/8_2025-03-20-Presentation-AstersCEN74.pdf' },
    ],
  },
  vanoise: {
    id: 'vanoise',
    area: 'Nationaal park Vanoise',
    lines: [
      'In het hart van het park mag je alleen bivakkeren vlak bij bepaalde bemande refuges, van 1 juni tot 30 september, van 19.00 tot 8.00 uur.',
      'Dat gaat op reservering bij de refuge en tegen een kleine vergoeding, bijvoorbeeld 6 euro bij Rosuel en 5 euro bij de Martin.',
      'Het park noemt zo\'n 20 plekken.',
      'Chris Townsend vond op zijn GR5 geen enkele refuge met bivakplek op zijn lijn en sliep twee nachten net buiten het park.',
    ],
    restrictsFreeTent: true,
    openPoint: 'Welke refuges langs deze etappe een bivakplek hebben, staat in de brochure van het park.',
    sources: [
      { label: 'FFRandonnée, mei 2024', url: 'https://www.ffrandonnee.fr/s-informer/actualites/le-bivouac-dans-le-c%C5%93ur-du-parc-national-de-la-vanoise' },
      FFR_GTA_BIVAK,
      { label: 'Brochure bivak Vanoise 2025', url: 'https://www.savoie.fr/upload/docs/application/pdf/2025-06/brochure_bivouac_-_parc_national_de_la_vanoise.pdf.pdf' },
      { label: 'Townsend, 2018', url: 'https://www.christownsendoutdoors.com/2018/10/camping-on-gr5-trail-through-french-alps.html' },
    ],
  },
  queyras: {
    id: 'queyras',
    area: 'Regionaal natuurpark Queyras',
    lines: [
      'Sinds 2023 hebben de tien gemeenten bivak per besluit geregeld.',
      'Getolereerd op meer dan een uur lopen van dorp en gehuchten, en verboden in de Vallon de Bouchouse.',
    ],
    restrictsFreeTent: false,
    openPoint: 'Voor Ceillac en de Col Girardin is het precieze besluit niet gevonden.',
    sources: [
      { label: 'FFRandonnée, Queyras', url: 'https://www.ffrandonnee.fr/s-informer/actualites/queyras-harmonisation-de-la-reglementation-des-espaces-naturels' },
    ],
  },
  mercantour: {
    id: 'mercantour',
    area: 'Nationaal park Mercantour',
    lines: [
      'Bivak mag van 19.00 tot 9.00 uur, op meer dan een uur lopen van de parkgrens of de laatste weg.',
      'Met een lage tent en één nacht per plek. De boete kan oplopen tot 1.500 euro.',
    ],
    restrictsFreeTent: false,
    sources: [
      { label: 'Mercantour, folder 2022', url: 'https://www.mercantour-parcnational.fr/sites/mercantour-parcnational.fr/files/2023-11/plaquette%20FR%202022-05-13-VF-VD-light.pdf' },
      { label: 'Mercantour, aanvraagpagina', url: 'https://demarche.numerique.gouv.fr/commencer/demande-d-autorisation-de-campement-en-coeur-de-pa' },
    ],
  },
};

// Gedeeld bij elk gebied: de regels veranderen.
export const BIVOUAC_CHECK_NOTE = 'Controleer voor vertrek of dit nog klopt. De bronnen zijn van 2024 tot 2026 en regels veranderen.';

// Overal, ook buiten deze gebieden (FFRandonnée, oktober 2024).
export const BIVOUAC_EVERYWHERE = 'Overal geen vuur. Veel refuges bieden bivakkers een maaltijd, een douche of soms een huurtent tegen betaling.';
