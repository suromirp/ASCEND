// ASCEND — what the rest day says, for each choice in Settings → Training →
// Rustdag: real rest (walking allowed, nothing to tick off), or a light
// recovery day (20 to 30 minutes very easy, ticked off in one tap, never
// counted as a training or as load).

export type RestDayMode = 'rest' | 'active';

export const ACTIVE_RECOVERY_MINUTES = 25;

// `valley`: the one sentence on Today's quiet card (a valley, not an empty box).
export const REST_DAY_COPY: Record<RestDayMode, { title: string; line: string; badge: string; body: string; detail: string; valley: string }> = {
  rest: {
    title: 'Rustdag',
    line: 'Wandelen mag, niets af te vinken',
    badge: 'rustdag',
    valley: 'Je lichaam bouwt op wat je deze week deed. Wandelen mag, traplopen telt ook.',
    body: 'Geen training vandaag. Je lichaam bouwt op wat je deze week deed.',
    detail: 'Wandelen mag, rustig, een kwartier tot een uur. Ook je wandeling in de pauze telt. Er valt niets af te vinken.',
  },
  active: {
    title: 'Hersteldag',
    line: '20 tot 30 min heel rustig wandelen of fietsen',
    badge: 'herstel',
    valley: 'Licht bewegen kan helpen om je benen los te maken, zonder nieuwe vermoeidheid. Het telt niet als training.',
    body: 'Licht bewegen kan helpen om je benen los te maken, zonder nieuwe vermoeidheid. Het telt niet als training.',
    detail: '20 tot 30 minuten heel rustig wandelen of fietsen. Je moet makkelijk kunnen praten. Voel je je moe, dan is gewoon rust ook goed.',
  },
};
