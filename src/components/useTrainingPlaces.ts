// ASCEND: de bewaarde keuzes Waar train je? (storage/trainingPlace.ts) voor een scherm. Meteen het
// laatst bekende, daarna wat er op het toestel staat, en elke nieuwe tik op het trainingsscherm.
// undefined zolang er nog niets gelezen is. De regel zelf staat in engine/trainingPlace.ts.

import { useEffect, useState } from 'react';
import { getTrainingPlaces, onTrainingPlaceChange, peekTrainingPlaces } from '../storage/trainingPlace';

export function useTrainingPlaces(): Record<string, string> | undefined {
  const [places, setPlaces] = useState(peekTrainingPlaces);
  useEffect(() => {
    let live = true;
    void getTrainingPlaces().then((found) => {
      // Een tik van net gaat voor wat er nog op het toestel stond.
      if (live) setPlaces(peekTrainingPlaces() ?? found);
    });
    const off = onTrainingPlaceChange(() => setPlaces(peekTrainingPlaces()));
    return () => {
      live = false;
      off();
    };
  }, []);
  return places;
}
