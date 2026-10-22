import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocation } from 'react-router-dom';
import { pageMemory, pageStateKey } from '../utils/pageMemory';

// Zoals useState, maar de waarde hoort bij de stap in de geschiedenis (zie
// utils/pageMemory.ts): ga je naar een training of een subpagina en dan terug,
// dan staat de pagina zoals je hem liet (gekozen week, zoekwoord, uitgeklapt).
// Een nieuwe tik op dezelfde pagina begint weer schoon. Alleen waarden die
// naar JSON kunnen (geen functies, geen Set of Date).
export function usePageState<T>(name: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const location = useLocation();
  const key = pageStateKey(location, name);
  const [value, setValue] = useState<T>(() => pageMemory.get<T>(key) ?? initial);
  // Pas bewaren als de waarde echt veranderd is; de beginwaarde hoeft niet.
  const changed = useRef(false);
  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    changed.current = true;
    setValue(next);
  }, []);
  useEffect(() => {
    if (changed.current) pageMemory.set(key, value);
  }, [key, value]);
  return [value, set];
}
