// ASCEND: het anker van een rij in Instellingen (`instelling-<id>`), los van de index zodat een rij
// (components/settings/SettingsList.tsx) niet het hele register van instellingen binnenhaalt.
export const settingsAnchor = (id: string) => `instelling-${id}`;
