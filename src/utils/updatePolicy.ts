// ASCEND — wanneer mag de app zichzelf bijwerken?
//
// Een nieuwe versie wordt op de achtergrond binnengehaald en wacht (vite-
// plugin-pwa, registerType 'prompt'). Deze regelaar bepaalt het rustige
// moment om hem te activeren, zonder dat de gebruiker hoeft te tikken:
// - bij een koude start: een update die in het eerste minuutje wordt
//   gevonden of al klaarstond, meteen;
// - na terugkomen in de app als die langer dan ongeveer 30 minuten op de
//   achtergrond was: ook een minuutje om de update te vinden en toe te passen;
// - nooit als er iets open staat of wordt ingevuld (utils/appBusy.ts);
// - nooit terwijl de app uit beeld is: een herlading op de achtergrond start
//   een ASCEND die verborgen opent en op de opslag moet wachten
//   (storage/lifecycle.ts). Terug in beeld probeert hij het meteen.
// Buiten die vensters, bijvoorbeeld een app die uren open staat, blijft de
// handmatige knop BIJWERKEN het vangnet.
//
// Puur: de tijd, de bezet-controle en het toepassen komen van buiten, zodat
// dit zonder browser te testen is (updatePolicy.test.ts).

export const COLD_START_WINDOW_MS = 60 * 1000;
export const AWAY_THRESHOLD_MS = 30 * 60 * 1000;
export const RESUME_WINDOW_MS = 60 * 1000;

export interface UpdateControllerDeps {
  now: () => number;
  isBusy: () => boolean;
  // Of de app nu in beeld is; zonder deze functie telt alleen hidden()/visible().
  isVisible?: () => boolean;
  applyUpdate: () => void;
}

export interface UpdateController {
  // De nieuwe versie staat klaar (net gevonden, of al gedownload).
  updateWaiting(): void;
  // De app gaat naar de achtergrond / komt terug in beeld.
  hidden(): void;
  visible(): void;
  // Af en toe aanroepen (elke paar seconden): probeert opnieuw als het eerst druk was.
  tick(): void;
}

export function createUpdateController(deps: UpdateControllerDeps): UpdateController {
  let waiting = false;
  let applied = false;
  let hiddenAt: number | null = null;
  let quietUntil = deps.now() + COLD_START_WINDOW_MS;

  const tryApply = () => {
    if (!waiting || applied) return;
    if (deps.now() > quietUntil) return; // buiten het rustige venster: de knop blijft het vangnet
    if (hiddenAt !== null || deps.isVisible?.() === false) return; // uit beeld: pas als hij terug is
    if (deps.isBusy()) return; // er staat iets open of er wordt getypt: later nog eens
    applied = true;
    deps.applyUpdate();
  };

  return {
    updateWaiting() {
      waiting = true;
      tryApply();
    },
    hidden() {
      hiddenAt ??= deps.now();
    },
    visible() {
      const away = hiddenAt === null ? 0 : deps.now() - hiddenAt;
      hiddenAt = null;
      if (away >= AWAY_THRESHOLD_MS) quietUntil = deps.now() + RESUME_WINDOW_MS;
      tryApply();
    },
    tick() {
      tryApply();
    },
  };
}
