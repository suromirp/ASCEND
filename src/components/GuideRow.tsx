import type { GuideGroup, GuideRowSpec } from '../engine/guideMenu';
import { Icon } from './icons';
import { Eyebrow } from './ui';
import './settings/settings.css';

// Een groep van het uitlegblad: een kopje en daaronder een lijst met haarlijnen, met dezelfde
// klassen als de rijen van de Instellingen (settings.css). SettingsRow zelf past hier niet: die
// zet een anker `instelling-<id>` op de pagina en kent geen `data-sheet-from`. Geen logica: welke
// rijen er staan komt uit engine/guideMenu.ts.
export function GuideGroupList({ group, onPick }: { group: GuideGroup; onPick: (row: GuideRowSpec) => void }) {
  return (
    <>
      <div className="st-eyebrow" style={{ marginLeft: 0 }}><Eyebrow>{group.title}</Eyebrow></div>
      <div className="st-list">
        {group.rows.map((row) => (
          <GuideRow key={row.id} row={row} onClick={() => onPick(row)} />
        ))}
      </div>
    </>
  );
}

// Ook gebruikt door het blad Je horloge (WatchSheet.tsx), met een eigen voorvoegsel voor `data-row`.
export function GuideRow({ row, onClick, prefix = 'uitleg' }: { row: Pick<GuideRowSpec, 'title' | 'sub' | 'page'> & { id: string }; onClick: () => void; prefix?: string }) {
  const label = row.page ? `${row.title}, pagina` : row.sub ? `${row.title}, ${row.sub}` : row.title;
  return (
    <div className={`st-row go${row.sub ? ' two' : ''}`} data-row={`${prefix}-${row.id}`} data-sheet-from={row.page ? undefined : ''}>
      <button type="button" className="st-hit" aria-label={label} onClick={onClick} />
      <span className="t"><span className="st-title-text">{row.title}</span></span>
      {row.sub && <span className="s st-num">{row.sub}</span>}
      {row.page && <span className="v"><span className="st-num">Pagina</span></span>}
      <span className="chev"><Icon name="verder" size={16} /></span>
    </div>
  );
}
