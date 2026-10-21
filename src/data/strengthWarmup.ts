// ASCEND — de warming-up voor een krachtdag, ongeveer 3 minuten: only
// what demonstrably helps or is cheap and well argued (production feedback:
// "de combi van nuttig en snel, de workouts zelf zijn al lang")
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
  // Only when you come in cold: not counted in the minutes.
  optional?: boolean;
  steps: WarmupStep[];
}

export interface StrengthWarmup {
  blocks: WarmupBlock[];
  later: string; // what to do before the next exercises
  short: string; // when there are only 3 minutes
}

const RAISE_HINT = 'Ben je gefietst of gelopen en begin je binnen 5 minuten, sla het over: bovenop opwarmsets voegt het weinig toe.';

export const WARMUP_UPPER: StrengthWarmup = {
  blocks: [
    {
      title: 'Op temperatuur',
      hint: RAISE_HINT,
      optional: true,
      steps: [{ name: 'Roeitrainer, rustig', amount: '60 sec', seconds: 60, note: 'armen en rug doen mee, dat warmt wat je gaat gebruiken' }],
    },
    {
      title: 'Schouders klaar',
      steps: [
        { name: 'Band pull-aparts', amount: '15 keer', seconds: 30, note: 'band op borsthoogte uit elkaar, schouderbladen naar elkaar' },
        { name: 'Externe rotatie met band', amount: '12 per arm', seconds: 45, note: 'elleboog in een hoek van 90 graden tegen je zij, onderarm naar buiten draaien' },
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
  short: 'Echt haast? Alleen de opwarmsets. Het absolute minimum is één set van 3 tot 5 keer op ongeveer 80%.',
};

export const WARMUP_LOWER: StrengthWarmup = {
  blocks: [
    {
      title: 'Op temperatuur',
      hint: RAISE_HINT,
      optional: true,
      steps: [{ name: 'Fiets of loopband, rustig', amount: '60 sec', seconds: 60 }],
    },
    {
      title: 'Enkels en heupen los',
      steps: [
        { name: 'Knie naar de muur', amount: '8 per kant', seconds: 40, note: 'voet een handbreedte van de muur, knie over je tenen naar de muur' },
        { name: 'Squat met pauze onderin', amount: '8 keer', seconds: 40, note: 'zonder gewicht, 2 tellen onderin, knieën over je tenen' },
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
  later: 'Voor de RDL één voelset van 5 keer op ongeveer 65%: een nieuw patroon, dat warmt je heupscharnier op. Voor eenbenig werk (split squat, step-up) één set van 5 per been, licht of zonder gewicht. Hamstringcurls na de RDL hebben geen opwarmset nodig. Laat weg: rekhoudingen langer dan 30 seconden, bilspieroefeningen tot het brandt, sprongen en meer dan twee minuten cardio. Je benen dragen ook je loopjes.',
  short: 'Echt haast? Alleen de opwarmsets. Het absolute minimum is één set van 3 tot 5 keer op ongeveer 80%.',
};

export const warmupTotalMinutes = (w: StrengthWarmup) => Math.round(w.blocks.filter((b) => !b.optional).flatMap((b) => b.steps).reduce((n, s) => n + s.seconds, 0) / 60);
