import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  Flame,
  Mountain,
  Map,
  ChevronRight,
  Bell,
  Info,
  LogOut,
  UserCog,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SetupAreaLayout } from '@/components/SetupAreaLayout';
import { useAuth } from '@/hooks/useAuth';
import { useMyTrackedBoulders, useMyTrackingSessions } from '@/hooks/useBoulderCommunity';
import { supabase } from '@/integrations/supabase/client';
import { formatDifficulty } from '@/lib/difficulty';

interface ProfileRow {
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { data: trackedBoulders } = useMyTrackedBoulders(null);
  const { data: trackingSessions } = useMyTrackingSessions();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfileName(null);
      setProfileAvatarUrl(null);
      return;
    }

    let cancelled = false;

    const loadProfileName = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name,last_name,full_name,avatar_url')
          .eq('id', user.id)
          .maybeSingle<ProfileRow>();

        if (cancelled) return;
        if (error) throw error;

        const nextProfileName =
          data?.full_name?.trim() ||
          [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim() ||
          null;

        setProfileName(nextProfileName);
        setProfileAvatarUrl(data?.avatar_url ?? null);
      } catch {
        if (!cancelled) {
          setProfileName(null);
          setProfileAvatarUrl(null);
        }
      }
    };

    loadProfileName();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const fullName = typeof meta?.full_name === 'string' ? meta.full_name : null;
    const firstName = typeof meta?.first_name === 'string' ? meta.first_name : null;
    const lastName = typeof meta?.last_name === 'string' ? meta.last_name : null;
    const joined = [firstName, lastName].filter(Boolean).join(' ').trim();
    return profileName || fullName?.trim() || joined || user?.email?.split('@')[0] || 'Kletterer';
  }, [profileName, user]);

  const initials = useMemo(() => {
    const source = displayName.trim();
    if (!source) return 'K';
    const parts = source.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }, [displayName]);

  const avatarUrl = useMemo(() => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    const metadataAvatar =
      typeof meta?.avatar_url === 'string' && meta.avatar_url.trim().length > 0
        ? meta.avatar_url
        : null;
    return profileAvatarUrl || metadataAvatar || null;
  }, [profileAvatarUrl, user]);

  const memberSinceLabel = useMemo(() => {
    if (!user?.created_at) return 'Mitglied';
    return `Mitglied seit ${new Intl.DateTimeFormat('de-DE', { month: 'short', year: 'numeric' }).format(new Date(user.created_at))}`;
  }, [user?.created_at]);

  const stats = useMemo(() => {
    const entries = trackedBoulders ?? [];
    const topped = entries.filter((entry) => entry.tick.status === 'top' || entry.tick.status === 'flash').length;
    const totalSessions = trackingSessions?.length ?? 0;

    const highestDifficulty = entries
      .filter((entry) => entry.tick.status === 'top' || entry.tick.status === 'flash')
      .reduce<number | null>((max, entry) => {
        const difficulty = entry.boulder?.difficulty;
        if (difficulty == null) return max;
        return max == null ? difficulty : Math.max(max, difficulty);
      }, null);

    return {
      topped,
      totalSessions,
      highestGrade: highestDifficulty == null ? '-' : formatDifficulty(highestDifficulty),
    };
  }, [trackedBoulders, trackingSessions]);

  const statsTiles = [
    { icon: Trophy, value: stats.topped, label: 'Tops' },
    { icon: Flame, value: stats.totalSessions, label: 'Sessions' },
    { icon: Mountain, value: stats.highestGrade, label: 'H\u00F6chster Grad' },
  ];

  const settingsGroups = [
    [
      { icon: Map, label: 'Sektoren', path: '/sectors' },
      { icon: UserCog, label: 'Profil bearbeiten', path: '/profile/edit' },
      { icon: Bell, label: 'Benachrichtigungen', path: '/profile/notifications' },
    ],
    [{ icon: Info, label: '\u00DCber die App', path: '/profile/about' }],
  ];

  return (
    <SetupAreaLayout className="bg-background" contentClassName="bg-background">
      <div className="px-4 pt-12 pb-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center transition-colors active:scale-95"
          aria-label={'Zur\u00FCck'}
        >
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 pt-5">
        <div className="flex flex-col items-center text-center">
          <Avatar className="mb-3 h-16 w-16 rounded-xl">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} className="rounded-xl object-cover" /> : null}
            <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-3xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-[1.2rem] font-bold leading-none text-foreground">{displayName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{memberSinceLabel}</p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {statsTiles.map(({ icon: Icon, value, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate('/statistics')}
              className="rounded-xl border border-border bg-card px-2.5 py-4 text-center active:scale-[0.98] transition-transform"
            >
              <div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="text-[1.1rem] font-bold leading-none text-foreground">{value}</div>
              <div className="mt-2 text-[11px] text-muted-foreground">{label}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          {settingsGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="overflow-hidden rounded-xl border border-border bg-card">
              {group.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-secondary/30 active:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.9} />
                    <span className="text-base font-semibold text-foreground">{item.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
                </button>
              ))}
            </div>
          ))}

          <button
            type="button"
            onClick={signOut}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-4 text-base font-semibold text-destructive transition-colors hover:bg-destructive/5 active:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" strokeWidth={2} />
            Abmelden
          </button>

          {!user ? (
            <Button onClick={() => navigate('/auth')} className="h-11 w-full rounded-xl text-sm font-semibold">
              Zur Anmeldung
            </Button>
          ) : null}
        </div>
      </div>
    </SetupAreaLayout>
  );
};

export default Profile;
