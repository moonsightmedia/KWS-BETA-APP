import { Navigate, useSearchParams } from 'react-router-dom';

import { setterLegacyViewToPath } from '@/components/setter/SetterAreaLayout';

export default function Setter() {
  const [searchParams] = useSearchParams();

  return <Navigate to={setterLegacyViewToPath(searchParams.get('view'))} replace />;
}
