import { useSyncExternalStore } from 'react';
import { getAutoBackupStatus, subscribeAutoBackup, type AutoBackupStatus } from '../storage/autoBackup';

// De stand van de automatische back-up (storage/autoBackup.ts) voor een scherm: is er na het openen
// al gekeken, wat was de uitkomst en mislukte de laatste poging.
export function useAutoBackupStatus(): AutoBackupStatus {
  return useSyncExternalStore(subscribeAutoBackup, getAutoBackupStatus, getAutoBackupStatus);
}
