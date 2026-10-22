// ASCEND — Paklijst: the example list to start from (docs/visie/GR5-reis en
// coaching.md, 2b). A solo bivouac set-up for August, "licht maar
// comfortabel", with rounded weights of common models. You change it to
// what you really have: engine/packList.ts does the sums, and the changed
// list is kept in the settings (AppSettings.packList).

export type PackGroup = 'slapen' | 'koken' | 'kleding' | 'elektronica' | 'verzorging' | 'overig';

export const PACK_GROUPS: PackGroup[] = ['slapen', 'koken', 'kleding', 'elektronica', 'verzorging', 'overig'];

export const PACK_GROUP_LABEL: Record<PackGroup, string> = {
  slapen: 'Slapen en dragen',
  koken: 'Koken en water',
  kleding: 'Kleding die mee gaat',
  elektronica: 'Elektronica en navigatie',
  verzorging: 'Verzorging en veiligheid',
  overig: 'Overig',
};

export interface PackItem {
  id: string;
  group: PackGroup;
  name: string;
  grams: number;
  // Ticked when you have it (not when it is packed).
  have: boolean;
}

function item(id: string, group: PackGroup, name: string, grams: number): PackItem {
  return { id, group, name, grams, have: false };
}

export const DEFAULT_PACK_ITEMS: PackItem[] = [
  item('tent', 'slapen', 'Eenpersoons tent, laag model', 1100),
  item('slaapzak', 'slapen', 'Donzen slaapzak, comfort rond 0 °C', 850),
  item('matje', 'slapen', 'Opblaasbaar matje, R-waarde 3 tot 4', 450),
  item('kussen', 'slapen', 'Opblaasbaar kussen', 60),
  item('rugzak', 'slapen', 'Rugzak 50 tot 60 liter met heupband', 1300),
  item('binnenzak', 'slapen', 'Waterdichte binnenzak', 60),

  item('kookset', 'koken', 'Brander, pan van 750 ml, lepel, aansteker', 235),
  item('gas', 'koken', 'Volle gascartouche van 230 g', 370),
  item('filter', 'koken', 'Waterfilter, twee flessen en een zak van 2 liter', 195),

  item('regenjas', 'kleding', 'Regenjas', 350),
  item('regenbroek', 'kleding', 'Regenbroek', 220),
  item('isolatiejas', 'kleding', 'Isolatiejas, dons of synthetisch', 350),
  item('fleece', 'kleding', 'Dunne fleece', 250),
  item('nachtkleding', 'kleding', 'Droog thermoshirt en lange onderbroek voor de nacht', 350),
  item('kleinkleding', 'kleding', 'Twee paar sokken, onderbroek, muts, handschoenen, pet', 380),

  item('powerbank', 'elektronica', 'Powerbank 10.000 mAh', 190),
  item('kabels', 'elektronica', 'Kabels en stekker', 80),
  item('hoofdlamp', 'elektronica', 'Hoofdlamp', 60),
  item('satelliet', 'elektronica', 'Satellietcommunicator', 115),
  item('kaart', 'elektronica', 'Kaartuitsnede en kompas', 120),

  item('ehbo', 'verzorging', 'EHBO- en voetenset met papiertape', 200),
  item('toilettas', 'verzorging', 'Toilettas met troffel en wc-papier', 180),
  item('zonnebrand', 'verzorging', 'Zonnebrand en lippenbalsem', 100),
  item('reparatie', 'verzorging', 'Reparatiesetje, mes, oordoppen, oogmasker, zakken', 270),
];
