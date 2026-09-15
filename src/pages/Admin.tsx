import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardHeader, AdminTabTitleProvider } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { UserManagement } from '@/components/admin/UserManagement';
import { ColorManagement } from '@/components/admin/ColorManagement';
import { SectorManagement } from '@/components/admin/SectorManagement';
import { HallMapManagement } from '@/components/admin/HallMapManagement';
import { BoulderOperationLogs } from '@/components/admin/BoulderOperationLogs';
import { FeedbackManagement } from '@/components/admin/FeedbackManagement';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { PushNotificationTest } from '@/components/admin/PushNotificationTest';
import { useSidebar } from '@/components/SidebarContext';
import { ADMIN_TABS, resolveAdminTab } from '@/lib/adminNavigation';
import { cn } from '@/lib/utils';

const SETTINGS_TABS = [
  { value: 'sectors', label: 'Sektoren' },
  { value: 'hallMap', label: 'Hallenkarte' },
  { value: 'colors', label: 'Farben' },
];

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const { isExpanded } = useSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = resolveAdminTab(searchParams.get('tab'));
  const settingsTab = SETTINGS_TABS.find(tab => tab.value === searchParams.get('settingsTab'))?.value || 'sectors';
  const tabTitle = ADMIN_TABS.find(tab => tab.value === currentTab)!.label.toUpperCase();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth', { replace: true });
    else if (!authLoading && !loading && !isAdmin) navigate('/', { replace: true });
  }, [authLoading, user, loading, isAdmin, navigate]);

  const changeTab = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true });
  };
  if (!authLoading && (!user || (!loading && !isAdmin))) return null;

  return <AdminTabTitleProvider tabTitle={tabTitle}>
    <div className="flex min-h-screen overflow-x-clip bg-canvas">
      <div className={cn('kws-sidebar-content flex w-full min-w-0 flex-1 flex-col overflow-x-clip bg-canvas pb-[calc(var(--app-safe-area-bottom)+96px)] md:pb-0', isExpanded ? 'md:ml-64' : 'md:ml-20')}>
        <DashboardHeader />
        <main className={cn('mx-auto w-full min-w-0 flex-1 p-4 md:p-6 xl:p-8', currentTab === 'settings' && settingsTab === 'hallMap' ? 'max-w-[1680px]' : 'max-w-[1244px]')}>
          {authLoading || loading ? <div role="status" aria-label="Adminbereich wird geladen"><Skeleton className="mb-8 h-12 w-64" /><Skeleton className="h-96 w-full" /></div> :
            <Tabs value={currentTab} onValueChange={value => changeTab('tab', value)} className="w-full min-w-0">
              <TabsList aria-label="Adminbereiche" className="hidden">
                {ADMIN_TABS.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="min-w-0 flex-1 px-3 text-xs lg:text-sm">{tab.label}</TabsTrigger>)}
              </TabsList>
              <TabsContent value="users" className="mt-0"><UserManagement /></TabsContent>
              <TabsContent value="settings" className="mt-0">
                <Tabs value={settingsTab} onValueChange={value => changeTab('settingsTab', value)}>
                  <TabsList aria-label="Hallenverwaltung" className="mb-4 flex h-auto w-full max-w-[480px] flex-wrap">
                    {SETTINGS_TABS.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="min-w-0 flex-1 px-3 text-xs lg:text-sm">{tab.label}</TabsTrigger>)}
                  </TabsList>
                  <TabsContent value="sectors" className="mt-0"><SectorManagement /></TabsContent>
                  <TabsContent value="hallMap" className="mt-0"><HallMapManagement /></TabsContent>
                  <TabsContent value="colors" className="mt-0"><ColorManagement /></TabsContent>
                </Tabs>
              </TabsContent>
              <TabsContent value="feedback" className="mt-0"><FeedbackManagement /></TabsContent>
              <TabsContent value="monitoring" className="mt-0"><MonitoringDashboard /></TabsContent>
              <TabsContent value="logs" className="mt-0"><BoulderOperationLogs /></TabsContent>
              <TabsContent value="tests" className="mt-0"><PushNotificationTest /></TabsContent>
            </Tabs>}
        </main>
      </div>
    </div>
  </AdminTabTitleProvider>;
};

export default Admin;
