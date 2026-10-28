import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepo, wipeAllData } from './database';
import { buildBackupEnvelope, normalizeBackupToCurrentModel } from './backup';
import { defaultOrder, resolveCardOrder } from '../engine/cardOrder';

describe('de volgorde van Je stand in de back-up', () => {
  beforeEach(async () => {
    await wipeAllData();
  });

  it('reist mee met de instellingen', async () => {
    const order = ['kracht', ...defaultOrder('stand').filter((id) => id !== 'kracht')];
    await SettingsRepo.set({ cardOrder: { stand: order } });
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    const back = normalizeBackupToCurrentModel(envelope).settings?.cardOrder;
    expect(back).toEqual({ stand: order });
    expect(resolveCardOrder('stand', back)).toEqual(order);
  });

  it('een oudere back-up zonder de sleutel geeft de standaard', async () => {
    const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
    delete envelope.payload.settings.cardOrder;
    const back = normalizeBackupToCurrentModel(envelope).settings?.cardOrder;
    expect(back).toBeUndefined();
    expect(resolveCardOrder('stand', back)).toEqual(defaultOrder('stand'));
  });

  it('een beschadigde sleutel valt weg', async () => {
    for (const bad of ['uit', [1, 2], { stand: 'kracht' }, { stand: [1] }, null]) {
      const envelope = JSON.parse(JSON.stringify(await buildBackupEnvelope()));
      envelope.payload.settings = { ...envelope.payload.settings, cardOrder: bad };
      const back = normalizeBackupToCurrentModel(envelope).settings?.cardOrder;
      expect(back).toBeUndefined();
      expect(resolveCardOrder('stand', back)).toEqual(defaultOrder('stand'));
    }
  });
});
