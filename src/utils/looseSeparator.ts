// Een scheidingsteken staat alleen tussen twee delen (I-164): breekt een deel van een regel naar een volgende regel,
// dan begint die regel niet met een losse "·". Meet zonder terugkoppeling: eerst staan alle tekens aan, dan gaan de
// tekens uit die vooraan op een regel staan; een nieuwe meting begint weer met alle tekens aan.
//
// Een teken heeft `data-sep` en staat in een deel met `data-part`; het deel is het stuk dat mag afbreken.
export function hideLooseSeparators(line: HTMLElement | null): void {
  if (!line) return;
  const seps = Array.from(line.querySelectorAll<HTMLElement>('[data-sep]'));
  for (const s of seps) s.style.display = '';
  const first = line.firstElementChild as HTMLElement | null;
  if (!first) return;
  const top = first.offsetTop;
  const loose = seps.filter((s) => {
    const part = s.closest<HTMLElement>('[data-part]');
    return !!part && part.offsetTop > top + 1;
  });
  for (const s of loose) s.style.display = 'none';
}

// Meet opnieuw als de regel van breedte verandert (draaien, een ander lettertype, het blad dat opent).
export function watchLooseSeparators(line: HTMLElement | null): () => void {
  if (!line) return () => {};
  hideLooseSeparators(line);
  if (typeof ResizeObserver === 'undefined') return () => {};
  const ro = new ResizeObserver(() => hideLooseSeparators(line));
  ro.observe(line);
  return () => ro.disconnect();
}
