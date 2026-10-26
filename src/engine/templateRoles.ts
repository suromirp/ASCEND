import type { SessionTemplate, TemplateRole } from '../models/training';
import { defaultRolesOf } from '../data/templateRoles';

// Rollen op sjablonen. Een regel vraagt naar een rol, niet naar een lijst met
// sjabloon-id's. Een sjabloon zonder `roles` (opgeslagen voor dit veld bestond,
// of uit een oude back-up) krijgt de rollen van zijn id.
export type RoleCarrier = Pick<SessionTemplate, 'id'> & { roles?: readonly TemplateRole[] };

export function templateRoles(template: RoleCarrier): readonly TemplateRole[] {
  // A broken backup could carry anything here; only a real list counts.
  return Array.isArray(template.roles) ? template.roles : defaultRolesOf(template.id);
}

export function hasRole(template: RoleCarrier, role: TemplateRole): boolean {
  return templateRoles(template).includes(role);
}

// Voor plekken die alleen een sjabloon-id hebben. Met de sjablonen erbij telt
// wat op het sjabloon staat; zonder (of een onbekend id) de rollen van het id.
export function idHasRole(templateId: string, role: TemplateRole, templates?: Iterable<RoleCarrier> | ReadonlyMap<string, RoleCarrier>): boolean {
  if (templates instanceof Map) {
    const t = templates.get(templateId);
    if (t) return hasRole(t, role);
  } else if (templates) {
    for (const t of templates as Iterable<RoleCarrier>) if (t.id === templateId) return hasRole(t, role);
  }
  return defaultRolesOf(templateId).includes(role);
}

export function isTestOrRace(template: RoleCarrier): boolean {
  return hasRole(template, 'test') || hasRole(template, 'race');
}

export function idIsTestOrRace(templateId: string, templates?: Iterable<RoleCarrier> | ReadonlyMap<string, RoleCarrier>): boolean {
  return idHasRole(templateId, 'test', templates) || idHasRole(templateId, 'race', templates);
}
