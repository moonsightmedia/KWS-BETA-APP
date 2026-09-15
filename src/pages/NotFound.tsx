import { Link } from 'react-router-dom';
import { ArrowRight, House } from 'lucide-react';
import { AppErrorView } from '@/components/AppErrorView';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/SidebarContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const NotFound = () => {
  const { isExpanded } = useSidebar();
  const { user } = useAuth();
  return (
    <div className={cn('kws-sidebar-content', user && (isExpanded ? 'md:ml-64' : 'md:ml-20'))}>
    <AppErrorView embedded code="404" title="Hier geht’s nicht weiter." description="Diese Seite gibt es nicht mehr oder der Link ist nicht vollständig. Deine nächste Session findest du trotzdem.">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild><Link to="/"><House aria-hidden="true" />Zur Startseite</Link></Button>
        <Button variant="secondary" asChild><Link to="/boulders">Boulder ansehen<ArrowRight aria-hidden="true" /></Link></Button>
      </div>
    </AppErrorView>
    </div>
  );
};

export default NotFound;
