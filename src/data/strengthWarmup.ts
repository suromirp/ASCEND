// ASCEND — de warming-up voor een krachtdag, ongeveer 5 minuten
// (docs/onderzoek/Warming up voor krachttraining.md). What the research
// supports most is the specific part: one or two warm-up sets of the first
// exercise, the last at about 80% of the working weight for 3 to 5 reps
// (Ribeiro e.a. 2020; Viveiros e.a. 2024). Light cardio only when you're not
// warm yet: 5 minutes on top of warm-up sets added nothing in trials (Barroso 2013),
// and it should warm the muscles you'll use. Short dynamic drills, no long
// static holds (Behm e.a. 2016). The shoulder drills follow the handball
// programme that lowered shoulder problems (Andersson e.a. 2017); the ankle
// and hip drills are for squat depth, with running and hiking in the legs.

export interface WarmupStep {
  name: string;
  amount: string; // "60 sec", "15 keer", "10 per arm"
  seconds: number; // about how long it takes
  note?: string;
  videoUrl?: string;
}

export interface WarmupBlock {
  title: string;
  hint?: string;
  steps: WarmupStep[];
}

export interface StrengthWarmup {
  blocks: WarmupBlock[];
  later: string; // what to do before the next exercises
  short: string; // when there are only 3 minutes
}

const RAISE_HINT = 'Rustig, op praattempo. Sla het over als je naar de sportschool bent gefietst of gelopen en binnen 5 minuten begint; zit er 10 minuten omkleden tussen, doe het dan toch.';

export const WARMUP_UPPER: StrengthWarmup = {
  blocks: [
    {
      title: 'Op temperatuur',
      hint: RAISE_HINT,
      steps: [{ name: 'Roeitrainer, rustig', amount: '60 sec', seconds: 60, note: 'armen en rug doen mee, dat warmt wat je gaat gebruiken' }],
    },
    {
      title: 'Schouders klaar',
      steps: [
        { name: 'Band pull-aparts', amount: '15 keer', seconds: 30, note: 'band op borsthoogte uit elkaar, schouderbladen naar elkaar' },
        { name: 'Externe rotatie met band', amount: '12 per arm', seconds: 45, note: 'elleboog in een hoek van 90 graden tegen je zij, onderarm naar buiten draaien' },
        { name: 'Scapula push-ups', amount: '10 keer', seconds: 30, note: 'armen gestrekt, alleen je schouderbladen laten zakken en duwen' },
      ],
    },
    {
      title: 'Opwarmsets van je eerste oefening',
      hint: 'Bijvoorbeeld bankdrukken. Het belangrijkste deel: dit maakt je eerste echte set beter.',
      steps: [
        { name: 'Opwarmset 1', amount: '8 keer', seconds: 45, note: 'ongeveer de helft van je werkgewicht' },
        { name: 'Opwarmset 2', amount: '4 keer', seconds: 60, note: 'ongeveer 80% van je werkgewicht. Dan 1 tot 1,5 minuut rust en je eerste echte set' },
      ],
    },
  ],
  later: 'Voor je eerste trek-oefening (roeien of pulldown) één voelset van 5 tot 6 keer op ongeveer 65%. Een schouderpers na bankdrukken hooguit één lichte set. Curls, triceps en lateral raises hebben geen opwarmset nodig.',
  short: 'Drie minuten? Sla het roeien over. Doe 15 pull-aparts en 10 externe rotaties per arm, dan de twee opwarmsets: 6 keer op de helft, 3 keer op 80%.',
};

export const WARMUP_LOWER: StrengthWarmup = {
  blocks: [
    {
      title: 'Op temperatuur',
      hint: RAISE_HINT,
      steps: [{ name: 'Fiets, rustig', amount: '60 sec', seconds: 60 }],
    },
    {
      title: 'Enkels en heupen los',
      steps: [
        { name: 'Knie naar de muur', amount: '8 per kant', seconds: 40, note: 'voet een handbreedte van de muur, knie over je tenen naar de muur' },
        { name: 'Beenzwaaien voor en achter', amount: '10 per been', seconds: 40, videoUrl: 'https://www.youtube.com/watch?v=EBmvMaPc1kg' },
        { name: 'Squat met pauze onderin', amount: '8 keer', seconds: 40, note: 'zonder gewicht, 2 tellen onderin, knieën over je tenen' },
        { name: 'Heupscharnier', amount: '8 keer', seconds: 25, note: 'zonder gewicht, billen naar achter, rug recht: de beweging van de RDL' },
      ],
    },
    {
      title: 'Opwarmsets van je eerste oefening',
      hint: 'Bijvoorbeeld de squat. Het belangrijkste deel: dit maakt je eerste echte set beter.',
      steps: [
        { name: 'Opwarmset 1', amount: '6 keer', seconds: 45, note: 'ongeveer de helft van je werkgewicht' },
        { name: 'Opwarmset 2', amount: '4 keer', seconds: 60, note: 'ongeveer 80% van je werkgewicht. Dan 1 tot 1,5 minuut rust en je eerste echte set' },
      ],
    },
  ],
  later: 'Voor de RDL één voelset van 5 keer op ongeveer 65%: een nieuw patroon. Voor eenbenig werk (split squat, step-up) één set van 5 per been, licht of zonder gewicht. Hamstringcurls na de RDL hebben geen opwarmset nodig. Laat weg: rekhoudingen langer dan 30 seconden, bilspieroefeningen tot het brandt, sprongen en meer dan twee minuten cardio. Je benen dragen ook je loopjes.',
  short: 'Drie minuten? Sla het fietsen over. Doe 8 keer knie naar de muur per kant en 8 squats zonder gewicht, dan de twee opwarmsets: 5 keer op de helft, 3 keer op 80%.',
};

export const warmupTotalMinutes = (w: StrengthWarmup) => Math.round(w.blocks.flatMap((b) => b.steps).reduce((n, s) => n + s.seconds, 0) / 60);
