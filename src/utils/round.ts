// Gedeelde afrondhulpjes. `round` rondt af op een aantal decimalen, `r1` en `r2` op een en twee.

export const round = (n: number, decimals = 0): number => {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

export const r1 = (n: number): number => Math.round(n * 10) / 10;

export const r2 = (n: number): number => Math.round(n * 100) / 100;
