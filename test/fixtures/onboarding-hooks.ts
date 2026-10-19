import { useMemo, type ReactNode } from 'react';
export const AuthProvider = ({children}: {children: ReactNode}) => children;
import { useBouldersWithSectors as base } from './filter-user-hooks';
export * from './filter-user-hooks';
const params = new URLSearchParams(location.search);
export const useAuth = () => ({ user: params.has('signedIn') ? { id: 'fixture-user' } : null, session: null, loading: false });
export function useBouldersWithSectors() {
  const query = base();
  const data = useMemo(() => query.data?.map(boulder => ({ ...boulder,
    betaVideoUrl: params.has('noVideo') ? undefined : '/test/fixtures/vertical-player.mp4',
  })), [query.data]);
  return { ...query, data };
}

export const useBoulders = useBouldersWithSectors;
const unexpectedWrite = () => { throw new Error('Personal/admin writes are forbidden in onboarding QA.'); };
export const useCreateBoulder = unexpectedWrite;
export const useDeleteAllBoulders = unexpectedWrite;
export const useCreateSector = unexpectedWrite;
export const useUpdateSector = unexpectedWrite;
export const useDeleteSector = unexpectedWrite;
export const useAdminColors = unexpectedWrite;
export const useAddDefaultColors = unexpectedWrite;
export const useReorderColors = unexpectedWrite;
export const useCreateColor = unexpectedWrite;
export const useUpdateColor = unexpectedWrite;
export const useDeleteColor = unexpectedWrite;
