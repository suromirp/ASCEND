import { Navigate, useParams } from 'react-router-dom';
import { spotForStretchArea } from '../engine/bodyMap';

// Een oude link naar een groep rekoefeningen (/stretches/:areaId) opent nu de bijbehorende
// plek op Lichaam, of Lichaam zelf als de groep niet meer bestaat.
export function StretchAreaRedirect() {
  const { areaId } = useParams<{ areaId: string }>();
  const spot = spotForStretchArea(areaId);
  return <Navigate to={spot ? `/lichaam/${spot.id}` : '/lichaam'} replace />;
}
