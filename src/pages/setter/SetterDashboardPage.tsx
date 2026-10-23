import { useSetterDashboard } from '@/hooks/useSetterDashboard';
import { SetterDashboard } from '@/components/setter/SetterDashboard';

export default function SetterDashboardPage() {
  const query = useSetterDashboard();
  return <SetterDashboard data={query.data} loading={query.isLoading} refreshing={query.isFetching}
    error={!!query.error} updatedAt={query.dataUpdatedAt} onRefresh={() => { void query.refetch(); }} />;
}
