// ASCEND: waar de namen op de seizoensstrook komen te staan (Ascend-tab). Pure rekenwerk: posities
// van de vlaggen in, rijen en breedtes van de namen uit. Twee regels: twee namen op dezelfde rij
// overlappen niet, en de vlaggenstok van een vlag op een hogere rij loopt niet door de naam van een
// lagere rij. Past een naam niet op volle breedte, dan gaat hij naar een hogere rij of wordt hij
// korter getoond (de weergave kapt hem af).
//
// Puur: geen React, geen IndexedDB.

export const NAME_WIDTHS = [96, 72, 52] as const;
export const NAME_ROWS = 3;
const GAP = 4;
// Een stok mag de naam niet raken, ook niet net langs de rand.
const POLE_LEFT = 3;
// De vlag hangt rechts van de stok (12 px breed).
const POLE_RIGHT = 14;

export interface NamePlacement {
  // 0 is de laagste rij (de kortste stok).
  row: number;
  // De breedte van het naamvak in px.
  width: number;
  // De linkerkant van het naamvak, aan de randen naar binnen geschoven.
  left: number;
  // De naam past niet in de volle breedte en wordt afgekapt getoond.
  shortened: boolean;
}

export function placeSeasonNames(xs: readonly number[], totalWidth: number): NamePlacement[] {
  const out: NamePlacement[] = [];
  // Waar het naamvak ten opzichte van de stok staat, als afstand van de stok tot de linkerkant:
  // eerst midden op de stok, dan met de stok bij de rand, en als laatste naast de stok.
  const ANCHORS: readonly ((w: number) => number)[] = [(w) => -w / 2, (w) => -w * 0.06, (w) => -w * 0.94, () => POLE_RIGHT, (w) => -w - POLE_LEFT];
  const boxOf = (x: number, width: number, anchor: (w: number) => number = ANCHORS[0]) => {
    const w = Math.min(width, totalWidth);
    const left = Math.max(0, Math.min(totalWidth - w, x + anchor(w)));
    return { left, right: left + w, width: w };
  };
  const fits = (i: number, row: number, width: number, anchor: (w: number) => number): boolean => {
    const mine = boxOf(xs[i], width, anchor);
    for (let j = 0; j < out.length; j++) {
      const other = out[j];
      const theirs = { left: other.left, right: other.left + other.width };
      if (other.row === row && mine.left < theirs.right + GAP && theirs.left < mine.right + GAP) return false;
      // Hun stok (hogere rij) door mijn naam, of mijn stok door hun naam.
      if (other.row > row && xs[j] + POLE_RIGHT > mine.left && xs[j] - POLE_LEFT < mine.right) return false;
      if (row > other.row && xs[i] + POLE_RIGHT > theirs.left && xs[i] - POLE_LEFT < theirs.right) return false;
    }
    return true;
  };
  // Zoeken met teruggaan: de eerste volledige indeling in de voorkeursvolgorde (volle breedte, lage
  // rij, midden op de stok). Zo kan een eerdere naam ruimte laten voor een latere. Bij te veel
  // vlaggen stopt het zoeken en geldt de gulzige indeling, die een naam desnoods afkapt.
  let nodes = 0;
  const options = (i: number): NamePlacement[] => {
    const list: NamePlacement[] = [];
    for (const width of NAME_WIDTHS) {
      for (let row = 0; row < NAME_ROWS; row++) {
        for (const anchor of ANCHORS) {
          if (fits(i, row, width, anchor)) {
            const b = boxOf(xs[i], width, anchor);
            list.push({ row, width: b.width, left: b.left, shortened: width !== NAME_WIDTHS[0] });
          }
        }
      }
    }
    return list;
  };
  const search = (i: number): boolean => {
    if (i === xs.length) return true;
    if (++nodes > 20000) return false;
    for (const option of options(i)) {
      out.push(option);
      if (search(i + 1)) return true;
      out.pop();
    }
    return false;
  };
  if (search(0)) return out;
  out.length = 0;
  for (let i = 0; i < xs.length; i++) {
    const b = boxOf(xs[i], NAME_WIDTHS[NAME_WIDTHS.length - 1]);
    out.push(options(i)[0] ?? { row: NAME_ROWS - 1, width: b.width, left: b.left, shortened: true });
  }
  return out;
}
