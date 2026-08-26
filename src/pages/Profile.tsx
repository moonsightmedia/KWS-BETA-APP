import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Flame,
  Info,
  LogOut,
  Map,
  Mountain,
  Pencil,
  Trophy,
} from 'lucide-react';

import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { KwsMetricStrip } from '@/components/ui/kws-metric-strip';
import { KwsSurface } from '@/components/ui/kws-surface';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useMyTrackedBoulders, useMyTrackingSessions } from '@/hooks/useBoulderCommunity';
import { formatDifficulty } from '@/lib/difficulty';
import { fetchProfileRecord } from '@/lib/profileCompat';

const Profile = () => {
  const navigate = useNavigate();
  const { user, session, signOut, loading } = useAuth();
  const { data: trackedBoulders } = useMyTrackedBoulders(null);
  const { data: trackingSessions } = useMyTrackingSessions();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileIdentityLoading, setProfileIdentityLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfileName(null);
      setProfileAvatarUrl(null);
      setProfileIdentityLoading(false);
      return;
    }

    let cancelled = false;

    const loadProfileName = async () => {
      setProfileIdentityLoading(true);

      const metadataAvatarUrl =
        typeof user.user_metadata?.avatar_url === 'string' && user.user_metadata.avatar_url.trim().length > 0
          ? user.user_metadata.avatar_url
          : null;

      try {
        const data = await fetchProfileRecord(user.id, session?.access_token);
        if (cancelled) return;

        const nextProfileName =
          data?.full_name?.trim() ||
          [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim() ||
          null;

        setProfileName(nextProfileName);
        setProfileAvatarUrl(data?.avatar_url?.trim() || metadataAvatarUrl || null);
      } catch {
        if (!cancelled) {
          setProfileName(null);
          setProfileAvatarUrl(metadataAvatarUrl);
        }
      } finally {
        if (!cancelled) {
          setProfileIdentityLoading(false);
        }
      }
    };

    loadProfileName();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, user]);

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
    { icon: Mountain, value: stats.highestGrade, label: 'Top-Grad' },
  ];

  const settingsGroups = [
    {
      title: 'Einstellungen',
      items: [
        { icon: Bell, label: 'Benachrichtigungen', description: 'Hinweise und Push-Einstellungen', path: '/profile/notifications' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: Map, label: 'Sektoren', description: 'Hallenbereiche und aktuelle Boulder', path: '/sectors' },
        { icon: Info, label: 'Über die App', description: 'Version und Informationen', path: '/profile/about' },
      ],
    },
  ];

  return (
    <DashboardPageLayout>
      <div className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="space-y-5">
          <KwsSurface className="p-4 sm:p-5">
            {profileIdentityLoading ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 shrink-0 rounded-kws-control" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 rounded-kws-badge" />
                  <Skeleton className="h-3 w-48 rounded-kws-badge" />
                  <Skeleton className="h-5 w-28 rounded-kws-badge" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 shrink-0 rounded-kws-control">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} className="rounded-kws-control object-cover" /> : null}
                  <AvatarFallback className="rounded-kws-control bg-primary/10 font-sans text-xl font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-sans text-lg font-semibold tracking-[-0.03em] text-[#192436]">{displayName}</h2>
                  {user?.email ? <p className="mt-0.5 truncate font-sans text-xs text-muted-foreground">{user.email}</p> : null}
                  <span className="mt-2 inline-flex rounded-kws-badge bg-secondary px-2 py-1 font-sans text-[9px] font-semibold text-muted-foreground">
                    {memberSinceLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/profile/edit')}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-kws-control bg-secondary text-[#192436]/65 transition-colors hover:bg-[#E8EEE8] hover:text-[#192436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                  aria-label="Profil bearbeiten"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </KwsSurface>

          <section>
            <h2 className="mb-2.5 px-0.5 font-sans text-sm font-semibold tracking-[-0.01em] text-[#192436]">Deine Aktivität</h2>
            <KwsMetricStrip items={statsTiles} onItemClick={() => navigate('/statistics')} />
          </section>
        </div>

        <div className="space-y-5">
          {settingsGroups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-2.5 px-0.5 font-sans text-sm font-semibold tracking-[-0.01em] text-[#192436]">{group.title}</h2>
              <KwsSurface className="overflow-hidden">
                {group.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className="flex min-h-[66px] w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-secondary/45 active:bg-secondary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/45"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-kws-control bg-secondary text-[#192436]/65">
                        <ItemIcon className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-sm font-semibold text-[#192436]">{item.label}</span>
                        <span className="mt-0.5 block truncate font-sans text-[10px] text-muted-foreground">{item.description}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden="true" />
                    </button>
                  );
                })}
              </KwsSurface>
            </section>
          ))}

          {user ? (
            <Button
              type="button"
              variant="ghost"
              onClick={signOut}
              disabled={loading}
              className="min-h-11 w-full bg-[#FFF3F1] font-sans text-sm font-semibold text-[#C6453A] hover:bg-[#FDE7E3] hover:text-[#C6453A]"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Abmelden
            </Button>
          ) : (
            <Button onClick={() => navigate('/auth')} className="h-11 w-full font-sans text-sm font-semibold">
              Zur Anmeldung
            </Button>
          )}
        </div>
      </div>
    </DashboardPageLayout>
  );
};

export default Profile;
