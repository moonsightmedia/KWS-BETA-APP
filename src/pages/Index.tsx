import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { StatCard } from '@/components/StatCard';
import { RevenueChart } from '@/components/RevenueChart';
import { CountCard } from '@/components/CountCard';
import { CategoryChart } from '@/components/CategoryChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        
        <main className="flex-1 p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-3xl font-bold mb-1">Hallo, Kletterwelt! 👋</h1>
                <p className="text-muted-foreground">Das passiert gerade in deiner Halle.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Select defaultValue="month">
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Dieser Monat</SelectItem>
                    <SelectItem value="week">Diese Woche</SelectItem>
                    <SelectItem value="year">Dieses Jahr</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="icon">
                  <Calendar className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Aktive Boulder"
              value="51"
              change={2.6}
              variant="primary"
              subtitle="Aktueller Stand"
            />
            
            <StatCard
              title="Neue Boulder"
              value="8"
              change={-2.2}
              subtitle="Seit letzter Woche"
            />
            
            <StatCard
              title="Check-ins heute"
              value="324"
              change={2.2}
              subtitle="Aktueller Tag"
            />
            
            <StatCard
              title="Auslastung"
              value="87%"
              change={5.6}
              subtitle="Durchschnitt heute"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <RevenueChart />
            <CategoryChart />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CountCard
              type="orders"
              count={98}
              subtitle="12 neue Boulder warten auf Freigabe."
            />
            
            <CountCard
              type="customers"
              count={17}
              subtitle="17 Kletterer warten auf Antwort."
            />
            
            <div className="lg:col-span-1">
              {/* Placeholder for future content */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
