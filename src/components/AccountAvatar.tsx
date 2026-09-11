import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type AccountAvatarProps = {
  user: { email?: string; user_metadata?: { avatar_url?: unknown } };
  className?: string;
};

/** Keep the account identity identical in the sidebar and its menu. */
export const AccountAvatar = ({ user, className }: AccountAvatarProps) => {
  const avatarUrl = typeof user.user_metadata?.avatar_url === 'string'
    ? user.user_metadata.avatar_url.trim()
    : '';

  return (
    <Avatar className={cn('h-10 w-10 shrink-0 rounded-full', className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" className="object-cover" /> : null}
      <AvatarFallback className="bg-secondary font-sans text-xs font-semibold text-foreground">
        {user.email?.trim().slice(0, 2).toUpperCase() || 'KS'}
      </AvatarFallback>
    </Avatar>
  );
};
