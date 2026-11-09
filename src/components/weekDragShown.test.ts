import { describe, expect, it } from 'vitest';
import { dragHandlesShown } from './weekDragShown';

describe('dragHandlesShown', () => {
  it('toont de grepen met de instelling aan, ook terwijl een blad open is of sluit', () => {
    expect(dragHandlesShown({ setting: true, monthView: false })).toBe(true);
  });
  it('toont geen grepen met de instelling uit of in het jaaroverzicht', () => {
    expect(dragHandlesShown({ setting: false, monthView: false })).toBe(false);
    expect(dragHandlesShown({ setting: true, monthView: true })).toBe(false);
  });
});
