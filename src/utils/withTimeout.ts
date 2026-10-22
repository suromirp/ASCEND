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
