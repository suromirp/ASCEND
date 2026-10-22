// Waits for a promise, but never longer than `ms`: after that it gives
// 'timeout' and the caller moves on (the promise itself carries on). Used so a
// button never stays on "Bezig…".
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
