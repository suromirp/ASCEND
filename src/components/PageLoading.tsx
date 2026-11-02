import { useLocation } from 'react-router-dom';
import { pageLoadingHeading } from '../engine/pageLoading';
import { SkyBand } from './SkyBand';
import { Card, Eyebrow, PageHeader } from './ui';

// De laadstand van een lui geladen pagina (Suspense in App.tsx): de lucht van die pagina met haar
// titel en één lege kaart, zodat de app nooit op een leeg scherm staat. Staat stil: geen spinner en
// geen eigen animatie, dus in Rustig en Uit hetzelfde. De kop komt uit engine/pageLoading.ts.
export function PageLoading() {
  const { pathname } = useLocation();
  const heading = pageLoadingHeading(pathname);
  const empty = <Card className="h-32" aria-hidden="true">{null}</Card>;

  if (heading.kind === 'page') {
    return (
      <div className="flex flex-col gap-5 px-4 pb-10 pt-6" aria-busy="true">
        <PageHeader eyebrow={heading.eyebrow} title={heading.title} />
        {empty}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5 px-4 pb-6" aria-busy="true">
      <SkyBand variant={heading.kind === 'settings' ? 'low' : 'tall'} gear={heading.kind !== 'settings'}>
        <div>
          {heading.eyebrow && <Eyebrow>{heading.eyebrow}</Eyebrow>}
          <h1 className="font-display text-[28px] leading-[34px]" style={{ color: 'var(--color-ink)' }}>{heading.title}</h1>
        </div>
      </SkyBand>
      {empty}
    </div>
  );
}
