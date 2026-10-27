// ASCEND — Kennisbank: what to know before and during a long trek, in
// small lessons. This file holds the list of topics (title, summary and
// when in the run-up the lesson fits); the text, videos and sources of each
// topic live in its own file, data/knowledge/<id>.ts, so a topic can be
// written and checked on its own. A topic without a file is listed as
// "volgt" and never offered as the lesson of the week.

export type KnowledgeCategory = 'route' | 'navigatie' | 'weer' | 'sneeuw' | 'slapen' | 'lichaam' | 'uitrusting' | 'mentaal';

export const CATEGORY_LABEL: Record<KnowledgeCategory, string> = {
  route: 'De route',
  navigatie: 'Navigeren',
  weer: 'Weer',
  sneeuw: 'Sneeuw en lawines',
  slapen: 'Slapen en eten',
  lichaam: 'Lichaam en eerste hulp',
  uitrusting: 'Uitrusting',
  mentaal: 'Hoofd en alleen lopen',
};

export interface KnowledgeSection {
  heading: string;
  body?: string;
  items?: string[];
}

export interface KnowledgeVideo {
  title: string;
  channel: string;
  url: string;
  minutes?: number;
  language?: 'nl' | 'en' | 'de' | 'fr';
  note?: string; // why this one, in a sentence
}

export interface KnowledgeSource {
  label: string;
  url: string;
}

// What a topic file contains.
export interface KnowledgeContent {
  intro: string; // two or three sentences: why it matters on your trek
  sections: KnowledgeSection[];
  videos: KnowledgeVideo[];
  sources: KnowledgeSource[];
  weeklyTip?: string; // one line for the lesson card
}

export interface KnowledgeTopic {
  id: string;
  title: string;
  category: KnowledgeCategory;
  summary: string; // what you will learn, one line
  // When in the run-up it fits, in weeks before the main goal: from the
  // most weeks before to the fewest. The lesson of the week comes from the
  // topics whose window holds this week.
  window: [number, number];
}

export const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  { id: 'route-gr5', title: 'De GR5 in etappes', category: 'route', summary: 'Hoe de Grande Traversée opgebouwd is, de etappes, de hoogste passen en waar de lastige stukken liggen.', window: [42, 0] },
  { id: 'uitrusting-pakken', title: 'Je rugzak pakken', category: 'uitrusting', summary: 'Wat je rugzak met tent weegt (rond 14 kg), hoe je hem verdeelt en afstelt, en waar je op gewicht bespaart.', window: [42, 18] },
  { id: 'navigatie-kaart-kompas', title: 'Kaart en kompas', category: 'navigatie', summary: 'Een kaart lezen, hoogtelijnen begrijpen, een kompas gebruiken en je positie bepalen.', window: [40, 14] },
  { id: 'navigatie-gps-offline', title: 'Navigeren met GPS en offline kaarten', category: 'navigatie', summary: 'Je route op horloge en telefoon, offline kaarten en wat je doet als de batterij leeg raakt.', window: [34, 8] },
  { id: 'navigatie-slecht-zicht', title: 'Navigeren in mist en bij slecht zicht', category: 'navigatie', summary: 'Je weg vinden zonder zicht, een route terugvinden en wanneer je beter blijft staan.', window: [24, 4] },
  { id: 'voeding-water', title: 'Water en eten onderweg', category: 'slapen', summary: 'Hoeveel je drinkt en eet op een lange bergdag, water vinden en zuiveren, en voeding voor meerdere dagen.', window: [34, 6] },
  { id: 'slapen-hutten-bivak', title: 'Slapen: hutten, bivak en tent', category: 'slapen', summary: 'Bivakregels per gebied, slapen in je tent, en hutten reserveren en wat je daar verwacht.', window: [30, 6] },
  { id: 'voeten-blaren', title: 'Voeten, schoenen en blaren', category: 'lichaam', summary: 'Schoenen inlopen, sokken kiezen, blaren tegengaan en behandelen.', window: [32, 6] },
  { id: 'afdalen-stokken', title: 'Afdalen en wandelstokken', category: 'lichaam', summary: 'Techniek voor lange afdalingen, stokken goed afstellen en gebruiken, en je knieën sparen.', window: [28, 6] },
  { id: 'weer-lezen', title: 'Het bergweer lezen', category: 'weer', summary: 'Weersvoorspellingen in de bergen, wolken en wind lezen en een dag plannen rond het weer.', window: [30, 6] },
  { id: 'weer-onweer', title: 'Onweer herkennen en ermee omgaan', category: 'weer', summary: 'Aankomend onweer herkennen, wat je doet op een kam, in een dal en bij een hut, en hoe je het vermijdt.', window: [22, 4] },
  { id: 'sneeuw-velden', title: 'Sneeuwvelden en sneeuw in de zomer', category: 'sneeuw', summary: 'Oude sneeuwvelden oversteken, wat je daarvoor meeneemt en wanneer je omkeert.', window: [24, 6] },
  { id: 'sneeuw-lawines', title: 'Lawines: hoe ze ontstaan en herkennen', category: 'sneeuw', summary: 'Hoe lawines werken, de lawinebulletins lezen, terrein beoordelen en hoe je bij sneeuw tochten plant.', window: [26, 8] },
  { id: 'lichaam-eerste-hulp', title: 'Eerste hulp en hoogteziekte', category: 'lichaam', summary: 'De vaakste problemen onderweg, hoogteziekte herkennen, wat in je EHBO-set hoort en hoe je hulp haalt.', window: [22, 4] },
  { id: 'noodgevallen', title: 'Als het misgaat', category: 'lichaam', summary: 'Alarmnummers, hoe je een noodoproep doet, je positie doorgeeft en wanneer je een etappe afbreekt.', window: [18, 2] },
  { id: 'zomer-hitte', title: 'Zomerse hitte en droge etappes', category: 'weer', summary: 'Hitte, zon en uitdroging, vroeg vertrekken en je tempo aanpassen.', window: [14, 0] },
  { id: 'mentaal-lange-dagen', title: 'Lange dagen, tegenslag en alleen beslissen', category: 'mentaal', summary: 'Een maand mentaal volhouden, vooral alleen: tegenslag opvangen, een omkeerregel en een vaste check-in met thuis.', window: [40, 0] },
];

// The content of each topic, from data/knowledge/<id>.ts (default export).
const files = import.meta.glob<{ default: KnowledgeContent }>('./knowledge/*.ts', { eager: true });
const CONTENT = new Map<string, KnowledgeContent>(
  Object.entries(files).map(([path, mod]) => [path.replace(/^\.\/knowledge\//, '').replace(/\.ts$/, ''), mod.default]),
);

export function knowledgeContent(id: string): KnowledgeContent | undefined {
  return CONTENT.get(id);
}

export function topicById(id: string): KnowledgeTopic | undefined {
  return KNOWLEDGE_TOPICS.find((t) => t.id === id);
}
