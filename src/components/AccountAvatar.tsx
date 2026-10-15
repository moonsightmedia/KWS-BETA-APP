import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAccountProfile } from '@/hooks/useAccountProfile';

type AccountAvatarProps = {
  user: { email?: string; user_metadata?: { avatar_url?: unknown } };
  className?: string;
};

export function UserAvatar({ src, name, className }: { src?: string | null; name?: string | null; className?: string }) {
  const initials = name?.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'KS';
  return <Avatar className={cn('h-10 w-10 shrink-0 rounded-kws-control', className)}>
    {src ? <AvatarImage src={src} alt="" className="object-cover" /> : null}
    <AvatarFallback className="rounded-kws-control bg-secondary font-sans text-xs font-semibold text-foreground">{initials}</AvatarFallback>
  </Avatar>;
}

/** Keep the account identity identical in the sidebar and its menu. */
export const AccountAvatar = ({ user, className }: AccountAvatarProps) => {
  const profile = useAccountProfile();
  const metadataAvatar = typeof user.user_metadata?.avatar_url === 'string'
    ? user.user_metadata.avatar_url.trim()
    : '';
  const avatarUrl = profile.data ? profile.data.avatar_url : metadataAvatar;

  return <UserAvatar src={avatarUrl} name={profile.data?.full_name || user.email?.split('@')[0]} className={className} />;
};
