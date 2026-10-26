import { ImportWizard } from '../../ImportWizard';
import { TextButton } from '../../TextButton';
import { settingsAnchor } from '../../../data/settingsIndex';
import { SettingsSection } from '../SettingsList';
import { BackupSheet, BaselineSheet, FolderSheet, RebuildSheet, ResetSheet, SnapshotsSheet, StorageSheet, VersionSheet } from './GegevensSheets';
import { SummaryRow } from './SummaryRow';
import type { GroupProps } from './types';

// Gegevens en back-up: alles staat op deze telefoon; hier bewaar en herstel je het. Acties staan in
// het blad van een rij, nooit op de pagina zelf.
export function GegevensGroup({ facts, reload, sheet, setSheet }: GroupProps) {
  const close = () => setSheet(null);
  return (
    <>
      <SettingsSection title="Back-up">
        <SummaryRow id="backup" title="Laatste back-up" facts={facts} onClick={() => setSheet('backup')} />
        <SummaryRow id="backupmap" title="Vaste map" facts={facts} onClick={() => setSheet('backupmap')} />
        <SummaryRow id="opslag" title="Opslag beschermd" facts={facts} kind={facts.storage === 'unsupported' || facts.storage === undefined ? 'static' : 'nav'} onClick={() => setSheet('opslag')} />
        <SummaryRow id="momentopnamen" title="Kopieën van voor een import" facts={facts} onClick={() => setSheet('momentopnamen')} />
      </SettingsSection>

      <SettingsSection title="App">
        <SummaryRow id="startniveau" title="Startniveau zelf invullen" facts={facts} onClick={() => setSheet('startniveau')} />
        <SummaryRow id="herbouwen" title="Adviezen opnieuw berekenen" facts={facts} onClick={() => setSheet('herbouwen')} />
      </SettingsSection>

      <SettingsSection>
        <SummaryRow id="wissen" title="Alles verwijderen" facts={facts} kind="danger" onClick={() => setSheet('wissen')} />
      </SettingsSection>

      {/* De versie is geen instelling maar een voettekst; tikken zoekt naar een update. */}
      <p className="st-foot" id={settingsAnchor('versie')} data-row="versie">
        <TextButton onClick={() => setSheet('versie')}>
          Versie <span className="st-num">{facts.buildLabel}</span>
        </TextButton>
      </p>

      {sheet === 'backup' && <BackupSheet onClose={close} onImport={() => setSheet('import')} />}
      {sheet === 'import' && <ImportWizard onClose={close} />}
      {sheet === 'backupmap' && <FolderSheet chosen={facts.folderChosen} onChanged={reload} onClose={close} />}
      {sheet === 'opslag' && <StorageSheet onChanged={reload} onClose={close} />}
      {sheet === 'momentopnamen' && <SnapshotsSheet onChanged={reload} onClose={close} />}
      {sheet === 'versie' && <VersionSheet onClose={close} />}
      {sheet === 'startniveau' && <BaselineSheet onClose={close} />}
      {sheet === 'herbouwen' && <RebuildSheet onClose={close} />}
      {sheet === 'wissen' && <ResetSheet onClose={close} onBackup={() => setSheet('backup')} />}
    </>
  );
}
