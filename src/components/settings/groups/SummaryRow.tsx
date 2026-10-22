import { rowSummary, type SettingsFacts } from '../../../engine/settingsSummary';
import { SettingsRow, type RowKind } from '../SettingsList';

// Een rij waarvan de waarde, de regel en het label "auto" uit engine/settingsSummary.ts
// komen, zodat de rij nooit iets anders zegt dan het zoekresultaat en het overzicht.
// Een rij die er nu niet hoort (hidden) tekent niets. Geeft de samenvatting een
// schakelaarstand (`checked`), dan is het een schakelaar.
export function SummaryRow({
  id,
  title,
  facts,
  kind = 'nav',
  onClick,
  onChange,
  info,
  noChevron,
  sub,
}: {
  id: string;
  title: string;
  facts: SettingsFacts;
  kind?: RowKind;
  onClick?: () => void;
  onChange?: (checked: boolean) => void;
  info?: string;
  noChevron?: boolean;
  // Een eigen regel, als de samenvatting er geen heeft.
  sub?: string;
}) {
  const r = rowSummary(id, facts);
  if (r.hidden) return null;
  const toggle = r.checked !== undefined;
  return (
    <SettingsRow
      id={id}
      title={r.title ?? title}
      kind={toggle ? 'toggle' : kind}
      value={r.value}
      sub={r.sub ?? sub}
      auto={r.auto}
      dim={r.dim}
      dot={r.dot}
      checked={r.checked}
      onChange={onChange}
      onClick={onClick}
      info={info}
      noChevron={noChevron}
    />
  );
}
