import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CompetitionOnboardingProvider } from '@/components/CompetitionOnboarding';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Original imports preserved below - temporarily disabled
// import { useState } from 'react';
// import { useCompetitionBoulders } from '@/hooks/useCompetitionBoulders';
// import { useCompetitionParticipant, useCreateCompetitionParticipant } from '@/hooks/useCompetitionParticipant';
// import { useCompetitionResults } from '@/hooks/useCompetitionResults';
// import { useCompetitionOnboarding } from '@/components/CompetitionOnboarding';
// import { ResultInput } from '@/components/competition/ResultInput';
// import { Leaderboard } from '@/components/competition/Leaderboard';
// import { Card, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Skeleton } from '@/components/ui/skeleton';
// import { Badge } from '@/components/ui/badge';
// import { Trophy, List, Home, ArrowLeft, Info } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { getColorBackgroundStyle } from '@/utils/colorUtils';
// import { useColors } from '@/hooks/useColors';
// import { useQueryClient } from '@tanstack/react-query';

// const TEXT_ON_COLOR: Record<string, string> = {
//   'Grün': 'text-white',
//   'Gelb': 'text-black',
//   'Blau': 'text-white',
//   'Orange': 'text-black',
//   'Rot': 'text-white',
//   'Schwarz': 'text-white',
//   'Weiß': 'text-black',
//   'Lila': 'text-white',
// };

const CompetitionContent = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Temporarily redirect to home page - Wettkampf system is hidden
  useEffect(() => {
    if (!authLoading) {
      navigate(user ? '/' : '/guest', { replace: true });
    }
  }, [authLoading, navigate, user]);
  
  // Show loading while redirecting
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAF9]">
        <Loader2 className="w-8 h-8 animate-spin text-[#36B531]" />
      </div>
    );
  }
  
  return null;
  
  // Original code preserved below - temporarily disabled
  // To re-enable: Remove the return null above and uncomment the code below
};

const Competition = () => {
  return (
    <CompetitionOnboardingProvider>
      <CompetitionContent />
    </CompetitionOnboardingProvider>
  );
};

export default Competition;

