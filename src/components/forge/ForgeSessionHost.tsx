import { useEffect, useState } from 'react';
import { useAppData } from '../../state/AppDataContext';
import type { SessionVariant } from '../../models/training';
import { clearOpenRequest, openRequestFinishes, readSession, rememberTrainingReturn, trainingReturn } from '../../utils/forgeSessionStore';
import { ForgeWorkout } from './ForgeWorkout';

// Opent het volle scherm van Forge op de lopende sessie, vanaf de pil of vanaf "Naar de training".
// De training en de dag komen uit de wijzer van de sessie (utils/forgeSessionStore.ts), eenmaal gelezen
// bij het openen: zolang dit scherm open is, verandert de sessie niet van training, ook niet na Afronden.
export default function ForgeSessionHost() {
  const { templates, program, loading } = useAppData();
  // Zonder lopende sessie: de training waar je vandaan sprong naar Instellingen (forgeSessionStore.ts#TrainingReturn).
  const [pointer] = useState(() => readSession()?.pointer ?? trainingReturn());
  // De terugweg is hiermee gebruikt of niet nodig: altijd wissen, na het lezen (zuiver in StrictMode).
  useEffect(() => rememberTrainingReturn(undefined), []);
  // Afronden vanaf het blad van een training die bleef liggen: Forge opent meteen op Training afronden.
  const [finish] = useState(openRequestFinishes);
  const template = pointer ? templates.find((t) => t.id === pointer.templateId) : undefined;
  useEffect(() => {
    // Geen training meer om te openen: het verzoek vervalt, maar niet zolang de gegevens nog laden.
    if (loading) return;
    if (!pointer || !template) clearOpenRequest();
  }, [loading, pointer, template]);
  if (!pointer || !template) return null;
  return (
    <ForgeWorkout
      template={template}
      plannedSessionId={pointer.plannedSessionId}
      scheduledDate={pointer.scheduledDate}
      program={program}
      initialVariant={(pointer.variant as SessionVariant | undefined) ?? 'full'}
      startAtForm={finish}
      onClose={clearOpenRequest}
    />
  );
}
