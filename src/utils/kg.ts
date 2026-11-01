// Een gewicht in kilo's zoals de app het toont: komma als decimaalteken, geen
// ",0" achter een heel getal en een punt bij duizendtallen ("12,5 kg",
// "20 kg"). Standaard één decimaal; krachttraining en schijven rekenen op twee.
import { formatNumberNL } from './number';

export function kgLabel(kg: number, decimals = 1): string {
  return `${formatNumberNL(kg, decimals)} kg`;
}
