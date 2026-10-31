import { ImportWizard } from '../../ImportWizard';
import { TextButton } from '../../TextButton';
import { settingsAnchor } from '../../../data/settingsIndex';
import { AdjustedSheet } from '../AdviceReset';
import { useAppData } from '../../../state/AppDataContext';
import { SettingsSection } from '../SettingsList';
import { useAdviceReset } from '../useAdviceReset';
import { BackupSheet, BaselineSheet, FolderSheet, RebuildSheet, ResetSheet, SnapshotsSheet, StorageSheet, StreamsSheet, VersionSheet } from './GegevensSheets';
import { SummaryRow } from './SummaryRow';
import { ChoiceFromDef } from './ChoiceFromDef';
import { CHOICES } from '../../../data/settingsChoices';
import { resolveStreamsBackup } from '../../../engine/streamsBackup';
import { resolveProposalTidyMonths } from '../../../engine/proposalTidy';
import type { GroupProps } from './types';

// Gegevens en back-up: alles staat op deze telefoon; hier bewaar en herstel je het. Acties staan in
// het blad van een rij, nooit op de pagina zelf.
export function GegevensGroup({ facts, reload, sheet, setSheet }: GroupProps) {
  const close = () => setSheet(null);
  // Terugzetten naar het advies leeft hier en niet in het blad, zodat het voorstel (met Akkoord)
  // en de uitkomst blijven staan als het blad dicht is.
  const advice = useAdviceReset();
  const { updateSettings } = useAppData();
  return (
    <>
      <SettingsSection title="Back-up">
        <SummaryRow id="backup" title="Laatste back-up" facts={facts} onClick={() => setSheet('backup')} />
        <SummaryRow id="backupmap" title="Vaste map" facts={facts} onClick={() => setSheet('backupmap')} />
        <SummaryRow id="opslag" title="Opslag beschermd" facts={facts} kind={facts.storage === 'unsupported' || facts.storage === undefined ? 'static' : 'nav'} onClick={() => setSheet('opslag')} />
        <SummaryRow id="ruimte-app" title="Ruimte op dit toestel" facts={facts} kind="static" info="ruimteApp" />
        <SummaryRow id="momentopnamen" title="Kopieën van voor een import" facts={facts} onClick={() => setSheet('momentopnamen')} />
      </SettingsSection>

      <SettingsSection title="Reeksen van je horloge">
        <SummaryRow id="reeksen-bewaren" title="Volledige reeks bewaren" facts={facts} info="reeksenBewaren" onChange={(on) => void updateSettings({ keepStreams: on })} />
        <SummaryRow id="reeksen-backup" title="Reeksen in back-up" facts={facts} info="reeksenBackup" onClick={() => setSheet('reeksen-backup')} />
        <SummaryRow id="reeksen-ruimte" title="Ruimte van reeksen" facts={facts} onClick={() => setSheet('reeksen')} />
      </SettingsSection>

      <SettingsSection
        title="App"
        advancedIds={['voorstellen-opruimen', 'startniveau']}
        advancedTitles="Oude voorstellen opruimen, Startniveau zelf invullen"
        storageKey="gegevens-geavanceerd"
        advanced={
          <>
            <SummaryRow id="voorstellen-opruimen" title="Oude voorstellen opruimen" facts={facts} info="voorstellenOpruimen" onClick={() => setSheet('voorstellen-opruimen')} />
            <SummaryRow id="startniveau" title="Startniveau zelf invullen" facts={facts} onClick={() => setSheet('startniveau')} />
          </>
        }
      >
        <SummaryRow id="herbouwen" title="Adviezen opnieuw berekenen" facts={facts} onClick={() => setSheet('herbouwen')} />
        <SummaryRow id="aangepast" title="Aangepaste instellingen" facts={facts} info="aangepast" onClick={() => setSheet('aangepast')} />
      </SettingsSection>
      {advice.note && <p className="st-hint" role="status">{advice.note}</p>}

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
      {sheet === 'reeksen' && <StreamsSheet onChanged={reload} onClose={close} />}
      {sheet === 'reeksen-backup' && (
        <ChoiceFromDef
          def={CHOICES.reeksenBackup}
          value={resolveStreamsBackup(facts.settings)}
          // De oude schakelaar gaat weg zodra je zelf kiest (engine/streamsBackup.ts).
          onPick={(v) => void updateSettings({ streamsBackup: v, streamsInBackup: v !== 'none' })}
          onClose={close}
        />
      )}
      {sheet === 'voorstellen-opruimen' && (
        <ChoiceFromDef def={CHOICES.voorstellenOpruimen} value={resolveProposalTidyMonths(facts.settings.proposalTidyMonths)} onPick={(v) => void updateSettings({ proposalTidyMonths: v })} onClose={close} />
      )}
      {sheet === 'momentopnamen' && <SnapshotsSheet onChanged={reload} onClose={close} />}
      {sheet === 'versie' && <VersionSheet onClose={close} />}
      {sheet === 'startniveau' && <BaselineSheet onClose={close} />}
      {sheet === 'herbouwen' && <RebuildSheet onClose={close} />}
      {sheet === 'aangepast' && <AdjustedSheet facts={facts} advice={advice} onClose={close} />}
      {advice.impact}
      {sheet === 'wissen' && <ResetSheet onClose={close} onBackup={() => setSheet('backup')} />}
    </>
  );
}
