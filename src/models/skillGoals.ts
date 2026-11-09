// ASCEND: het doel Vaardigheid (F4e van de calisthenics-lijn, docs/beslissingen/2026-11-09-calisthenics-vaardigheidsdoel.md).
//
// Een vaardigheid is een stap op een ladder uit data/skillLadders.ts: "Pull-up" is stap 4 van de ladder Optrekken.
// Het is bewust geen TrainingGoal: een TrainingGoal stuurt de planning (een actief doel heeft een datum, het doel met
// mijlpalen is het hoofddoel, botsingen, Je week). Een vaardigheid heeft geen datum, plant niets en wordt nooit het
// hoofddoel. Daarom staat het in een eigen opslag (storage/skillGoals.ts) en leest de planner het nergens.

export interface SkillGoal {
  id: string;
  name: string;
  // Een ladder uit data/skillLadders.ts.
  ladderId: string;
  // De doelstap, vanaf 1 zoals `Exercise.ladder.step`.
  targetStep: number;
  createdAt: string;
  updatedAt: string;
  // Weggehaald door jou. De gehaalde stappen blijven staan (append-only); de logs raakt dit nooit.
  removedAt?: string;
}

// De mijlpaalsoort van een vaardigheid: één per ladderstap tot en met de doelstap. Afgeleid uit het doel, nooit
// opgeslagen.
export interface SkillStepMilestone {
  kind: 'skillStep';
  ladderId: string;
  step: number;
  exerciseId: string;
}

// Wanneer een stap gehaald werd. Append-only, net als GoalMilestoneProgress: een rij wordt alleen toegevoegd en
// nooit herschreven, zodat een gehaalde stap gehaald blijft als de toets of de ladder later verandert.
export interface SkillStepProgress {
  id: string;
  goalId: string;
  ladderId: string;
  step: number;
  // De oefening van die stap toen hij gehaald werd.
  exerciseId: string;
  clearedDate: string;
}

// Wat er in de opslag staat (MetaRepo, sleutel `skillGoals`) en in een back-up (`payload.skillGoals`).
export interface SkillGoalStore {
  goals: SkillGoal[];
  progress: SkillStepProgress[];
}
