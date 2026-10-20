import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { accountProfileKey } from '@/hooks/useAccountProfile';

import { DashboardPageLayout } from '@/components/DashboardPageLayout';
import { AccountDeletion } from '@/components/AccountDeletion';
import { BlockedUsers } from '@/components/BlockedUsers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KwsSurface } from '@/components/ui/kws-surface';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { deleteProfileAvatar, uploadProfileAvatar } from '@/integrations/supabase/storage';
import { fetchProfileRecord, updateProfileRecord } from '@/lib/profileCompat';

const AUTH_UPDATE_TIMEOUT_MS = 10_000;
const AVATAR_UPLOAD_TIMEOUT_MS = 45_000;
const PROFILE_SAVE_TIMEOUT_MS = 12_000;
const AVATAR_CLEANUP_TIMEOUT_MS = 5_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function updateAuthUserWithTimeout(
  update: Parameters<typeof supabase.auth.updateUser>[0],
  timeoutMessage: string,
) {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, AUTH_UPDATE_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      supabase.auth.updateUser(update),
      timeoutPromise,
    ]);

    if (result.error) {
      throw result.error;
    }
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function cleanupAvatarBestEffort(imageUrl: string | null) {
  if (!imageUrl) return;

  try {
    await withTimeout(
      deleteProfileAvatar(imageUrl),
      AVATAR_CLEANUP_TIMEOUT_MS,
      'Die Bereinigung des alten Profilbilds hat zu lange gedauert.',
    );
  } catch (error) {
    console.warn('[Profile Avatar Cleanup] Cleanup skipped:', error);
  }
}

const ProfileEdit = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedProfile = useRef<string | null>(null);
  const savedSuccessfully = useRef(false);
  const { user, session, resetPassword } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: 'Kletterer',
    email: '',
    avatarUrl: null as string | null,
  });
  const [initialAvatarUrl, setInitialAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '' });
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [initialFields, setInitialFields] = useState<{ name: string; email: string } | null>(null);
  const hasUnsavedChanges = !loadingProfile && initialFields !== null && (
    form.name.trim() !== initialFields.name.trim() || form.email.trim() !== initialFields.email.trim()
  );
  const blocker = useBlocker(() => hasUnsavedChanges && !savedSuccessfully.current);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (savedSuccessfully.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!user) {
      loadedProfile.current = null;
      setLoadingProfile(false);
      return;
    }
    if (loadedProfile.current === user.id) return;

    let cancelled = false;

    const loadProfile = async () => {
      setLoadingProfile(true);

      const metadataFullName =
        typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
      const metadataFirstName =
        typeof user.user_metadata?.first_name === 'string' ? user.user_metadata.first_name.trim() : '';
      const metadataLastName =
        typeof user.user_metadata?.last_name === 'string' ? user.user_metadata.last_name.trim() : '';
      const metadataAvatarUrl =
        typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null;
      const fallbackName =
        metadataFullName ||
        [metadataFirstName, metadataLastName].filter(Boolean).join(' ').trim() ||
        user.email?.split('@')[0] ||
        'Kletterer';

      const fallbackForm = { name: fallbackName, email: user.email || '', avatarUrl: metadataAvatarUrl };
      setForm(fallbackForm);
      setInitialFields(fallbackForm);
      setInitialAvatarUrl((current) => current ?? metadataAvatarUrl);
      try {
        if (cancelled) return;
        const data = await queryClient.fetchQuery({ queryKey: accountProfileKey(user.id),
          queryFn: () => fetchProfileRecord(user.id, session?.access_token), staleTime: 60_000 });
        if (cancelled) return;

        const profileName =
          data?.full_name?.trim() ||
          [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim() ||
          fallbackName;
        const nextAvatarUrl = data ? data.avatar_url : metadataAvatarUrl;

        setForm({
          name: profileName,
          email: data?.email || user.email || '',
          avatarUrl: nextAvatarUrl,
        });
        setInitialAvatarUrl(nextAvatarUrl);
        setInitialFields({ name: profileName, email: data?.email || user.email || '' });
      } catch (error: unknown) {
        toast.error('Profil konnte nicht geladen werden', {
          description: error instanceof Error ? error.message : 'Bitte versuche es erneut.',
        });
      } finally {
        if (!cancelled) {
          loadedProfile.current = user.id;
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [session?.access_token, user, queryClient]);

  const avatarPreviewUrl = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const displayAvatarUrl = avatarPreviewUrl || form.avatarUrl;

  const initials = useMemo(() => {
    const source = form.name.trim();
    if (!source) return 'K';
    const parts = source.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }, [form.name]);

  const persistAvatar = async (url: string | null) => {
    if (!user) throw new Error('Bitte melde dich erneut an.');
    await withTimeout(updateProfileRecord(user.id, { avatar_url: url }, session?.access_token),
      PROFILE_SAVE_TIMEOUT_MS, 'Das Profilbild konnte nicht rechtzeitig gespeichert werden.');
    await queryClient.cancelQueries({ queryKey: accountProfileKey(user.id) });
    queryClient.setQueryData(accountProfileKey(user.id), (current: Awaited<ReturnType<typeof fetchProfileRecord>> | undefined) =>
      current ? { ...current, avatar_url: url } : current);
    setForm(current => ({ ...current, avatarUrl: url }));
    setInitialAvatarUrl(url);
    // Old account metadata is compatibility-only; photo visibility uses profiles.
    void updateAuthUserWithTimeout({ data: { avatar_url: url } }, 'Profilbild-Synchronisierung verzögert.').catch(() => {});
  };

  const handleAvatarPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || avatarSaving || saving || loadingProfile) return;
    setAvatarSaving(true);
    setAvatarFile(file);
    let uploaded: string | null = null;
    const previous = initialAvatarUrl;
    try {
      uploaded = await withTimeout(uploadProfileAvatar(file, user!.id), AVATAR_UPLOAD_TIMEOUT_MS,
        'Das Profilbild konnte nicht rechtzeitig hochgeladen werden.');
      await persistAvatar(uploaded);
      if (previous && previous !== uploaded) void cleanupAvatarBestEffort(previous);
      toast.success('Profilbild gespeichert');
    } catch (error) {
      if (uploaded) void cleanupAvatarBestEffort(uploaded);
      toast.error('Profilbild nicht gespeichert', { description: error instanceof Error ? error.message : 'Bitte versuche es erneut.' });
    } finally { setAvatarFile(null); setAvatarSaving(false); }
  };

  const handleRemoveAvatar = async () => {
    if (avatarSaving || saving || loadingProfile) return;
    setAvatarSaving(true);
    try {
      await persistAvatar(null);
      if (initialAvatarUrl) void cleanupAvatarBestEffort(initialAvatarUrl);
      toast.success('Profilbild entfernt');
    } catch (error) {
      toast.error('Profilbild nicht entfernt', { description: error instanceof Error ? error.message : 'Bitte versuche es erneut.' });
    } finally { setAvatarSaving(false); }
  };

  const handleSave = async () => {
    if (avatarSaving || saving) return;
    if (!user) {
      toast.error('Du bist nicht angemeldet.');
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();

    const errors = {
      name: trimmedName ? '' : 'Bitte gib einen Namen ein.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) ? '' : 'Bitte gib eine gültige E-Mail-Adresse ein.',
    };
    setFieldErrors(errors);
    if (errors.name || errors.email) {
      document.getElementById(errors.name ? 'name' : 'email')?.focus();
      return;
    }

    setSaving(true);

    let saveStage = 'initialisieren';

    try {
      const nameParts = trimmedName.split(' ').filter(Boolean);
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ').trim() || null;
      const nextAvatarUrl = form.avatarUrl;
      const emailChanged = trimmedEmail !== (user.email || '');

      const metadata = {
        ...user.user_metadata,
        first_name: firstName,
        last_name: lastName,
        full_name: trimmedName,
        avatar_url: nextAvatarUrl,
      };

      if (emailChanged) {
        saveStage = 'E-Mail aktualisieren';
        await updateAuthUserWithTimeout(
          { email: trimmedEmail, data: { ...metadata, email: trimmedEmail } },
          'Die neue E-Mail-Adresse konnte nicht rechtzeitig gespeichert werden.',
        );
      }

      saveStage = 'Profil speichern';
      await withTimeout(
        updateProfileRecord(
          user.id,
          {
            first_name: firstName,
            last_name: lastName,
            full_name: trimmedName,
            email: trimmedEmail,
          },
          session?.access_token,
        ),
        PROFILE_SAVE_TIMEOUT_MS,
        'Das Profil konnte nicht rechtzeitig gespeichert werden. Bitte versuche es erneut.',
      );

      await queryClient.cancelQueries({ queryKey: accountProfileKey(user.id) });
      queryClient.setQueryData(accountProfileKey(user.id), {
        first_name: firstName, last_name: lastName, full_name: trimmedName,
        email: trimmedEmail, avatar_url: nextAvatarUrl,
      });

      if (!emailChanged) {
        void updateAuthUserWithTimeout(
          { data: { ...metadata, email: trimmedEmail } },
          'Die Kontodaten konnten nicht rechtzeitig synchronisiert werden.',
        ).catch(() => {
          // Das sichtbare Profil kommt aus `profiles`; ein hängender Metadaten-Sync darf den Flow nicht blockieren.
        });
      }

      saveStage = 'Abschließen';
      toast.success('Profil gespeichert', {
        description:
          emailChanged
            ? 'Bitte bestätige gegebenenfalls deine neue E-Mail-Adresse.'
            : 'Deine Änderungen wurden gespeichert.',
      });

      setInitialAvatarUrl(nextAvatarUrl);
      setForm((current) => ({ ...current, avatarUrl: nextAvatarUrl }));
      setAvatarFile(null);
      savedSuccessfully.current = true;
      navigate('/profile', { replace: true });
    } catch (error: unknown) {
      console.error('[Profile Edit] Save failed:', {
        stage: saveStage,
        error,
      });

      toast.error('Speichern fehlgeschlagen', {
        description: error instanceof Error ? error.message : 'Bitte versuche es erneut.',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetField = (field: 'name' | 'email') => {
    if (!initialFields || loadingProfile || saving || avatarSaving) return;
    setForm(current => ({ ...current, [field]: initialFields[field] }));
    setFieldErrors(current => ({ ...current, [field]: '' }));
    document.getElementById(field)?.focus();
  };

  const handlePasswordChange = async () => {
    const email = form.email.trim() || user?.email || '';

    if (!email) {
      toast.error('Keine E-Mail-Adresse gefunden.', {
        description: 'Bitte hinterlege zuerst eine gültige E-Mail-Adresse.',
      });
      return;
    }

    try {
      await resetPassword(email);
    } catch {
      // Fehler werden bereits in useAuth behandelt.
    }
  };

  return (
    <DashboardPageLayout headerBackTo="/profile" mainClassName="pt-4 md:pt-6">
      <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset();
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>Dein Name oder deine E-Mail-Adresse wurde noch nicht gespeichert.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (blocker.state === 'blocked') blocker.proceed();
            }}>Verwerfen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="mx-auto max-w-3xl space-y-4">
        <KwsSurface className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 rounded-kws-control border border-border">
              {displayAvatarUrl ? (
                <AvatarImage src={displayAvatarUrl} alt={form.name} className="rounded-kws-control object-cover" />
              ) : null}
              <AvatarFallback className="rounded-kws-control bg-primary/10 font-sans text-2xl font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground">Profilbild</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Wird nach der Auswahl automatisch gespeichert.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={event => void handleAvatarPick(event)}
          />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 border-border"
              disabled={loadingProfile || saving || avatarSaving}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Camera className="mr-2 h-4 w-4" />}
              {avatarSaving ? 'Bild wird gespeichert …' : displayAvatarUrl ? 'Bild ersetzen' : 'Bild auswählen'}
            </Button>

            {displayAvatarUrl ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 border-[#F1D7D2] text-[#B64332] hover:bg-[#FFF4F2] hover:text-[#B64332]"
                disabled={loadingProfile || saving || avatarSaving}
                onClick={() => void handleRemoveAvatar()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Bild entfernen
              </Button>
            ) : null}
          </div>
        </KwsSurface>

        <KwsSurface className="p-4 sm:p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Kontodaten</h2>
              {hasUnsavedChanges && <span role="status" className="text-xs text-muted-foreground">Ungespeichert</span>}
              <p className="w-full text-xs text-muted-foreground">Name und E-Mail erst mit „Speichern“ übernehmen.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-muted-foreground">
                Name
              </Label>
              <Input
                id="name" autoComplete="name" aria-invalid={!!fieldErrors.name} aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                value={form.name}
                onChange={(event) => {setForm((current) => ({ ...current, name: event.target.value }));setFieldErrors(current=>({...current,name:''}));}}
                disabled={loadingProfile || saving}
                className="h-11 rounded-kws-control"
              />
              {initialFields && form.name !== initialFields.name && <Button type="button" variant="ghost" className="h-auto min-h-11 px-0 text-xs underline underline-offset-4" disabled={loadingProfile || saving || avatarSaving} onClick={() => resetField('name')}>Name zurücksetzen</Button>}
              {fieldErrors.name ? <p id="name-error" className="text-xs text-destructive">{fieldErrors.name}</p>:null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                E-Mail
              </Label>
              <Input
                id="email" autoComplete="email" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                type="email"
                value={form.email}
                onChange={(event) => {setForm((current) => ({ ...current, email: event.target.value }));setFieldErrors(current=>({...current,email:''}));}}
                disabled={loadingProfile || saving}
                className="h-11 rounded-kws-control"
              />
              {initialFields && form.email !== initialFields.email && <Button type="button" variant="ghost" className="h-auto min-h-11 px-0 text-xs underline underline-offset-4" disabled={loadingProfile || saving || avatarSaving} onClick={() => resetField('email')}>E-Mail zurücksetzen</Button>}
              {fieldErrors.email ? <p id="email-error" className="text-xs text-destructive">{fieldErrors.email}</p>:null}
            </div>
          </div>
        </KwsSurface>

        <div className="space-y-3">
          <Button
            onClick={handleSave}
            disabled={saving || loadingProfile || avatarSaving}
            className="h-12 w-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Speichern
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePasswordChange}
            disabled={loadingProfile || saving || avatarSaving}
            className="h-12 w-full font-medium"
          >
            Passwort ändern
          </Button>
        </div>
        {user && <><BlockedUsers /><AccountDeletion userId={user.id} /></>}
      </div>
    </DashboardPageLayout>
  );
};

export default ProfileEdit;
