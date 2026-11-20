// ASCEND: een belofte die nooit langer duurt dan afgesproken. Een knop mag niet
// op "Bezig..." blijven staan omdat een antwoord halverwege stokt: na de tijd
// komt er een fout, en de aanroeper zet de knop terug in een finally.

export class TimeoutError extends Error {
  constructor(message = 'Het duurde te lang.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Een grens die je kunt wissen: `result` is de uitkomst van de belofte, of 'slow' als de tijd eerder
// om is. De klok wordt gewist zodra de belofte klaar is (gelukt of mislukt), en met `cancel` als het
// scherm weg is; na `cancel` komt er geen 'slow' meer.
export function timeLimit<T>(promise: Promise<T>, ms: number): { result: Promise<T | 'slow'>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const result = new Promise<T | 'slow'>((resolve, reject) => {
    timer = setTimeout(() => {
      timer = undefined;
      resolve('slow');
    }, ms);
    promise.then(
      (value) => {
        cancel();
        resolve(value);
      },
      (err) => {
        cancel();
        reject(err);
      },
    );
  });
  return { result, cancel };
}
