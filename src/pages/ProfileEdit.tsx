import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { SetupAreaLayout } from '@/components/SetupAreaLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { deleteProfileAvatar, uploadProfileAvatar } from '@/integrations/supabase/storage';

const ProfileEdit = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user, resetPassword } = useAuth();

  const [form, setForm] = useState({
    name: 'Kletterer',
    email: '',
    avatarUrl: null as string | null,
  });
  const [initialAvatarUrl, setInitialAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

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

      setForm((current) => ({
        ...current,
        name: current.name && current.name !== 'Kletterer' ? current.name : fallbackName,
        email: current.email || user.email || '',
        avatarUrl: current.avatarUrl ?? metadataAvatarUrl,
      }));
      setInitialAvatarUrl((current) => current ?? metadataAvatarUrl);
      setLoadingProfile(false);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name,last_name,full_name,email,avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;

        const profileName =
          data?.full_name?.trim() ||
          [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim() ||
          fallbackName;
        const nextAvatarUrl =
          data?.avatar_url ||
          metadataAvatarUrl ||
          null;

        setForm({
          name: profileName,
          email: data?.email || user.email || '',
          avatarUrl: nextAvatarUrl,
        });
        setInitialAvatarUrl(nextAvatarUrl);
      } catch (error: unknown) {
        toast.error('Profil konnte nicht geladen werden', {
          description: error instanceof Error ? error.message : 'Bitte versuche es erneut.',
        });
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const handleAvatarPick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setForm((current) => ({ ...current, avatarUrl: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Du bist nicht angemeldet.');
      return;
    }

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();

    if (!trimmedName) {
      toast.error('Bitte gib einen Namen ein.');
      return;
    }

    if (!trimmedEmail) {
      toast.error('Bitte gib eine E-Mail-Adresse ein.');
      return;
    }

    setSaving(true);

    let uploadedAvatarUrl: string | null = null;

    try {
      const nameParts = trimmedName.split(' ').filter(Boolean);
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ').trim() || null;
      let nextAvatarUrl = form.avatarUrl;

      if (avatarFile) {
        uploadedAvatarUrl = await uploadProfileAvatar(avatarFile, user.id);
        nextAvatarUrl = uploadedAvatarUrl;
      }

      const metadata = {
        ...user.user_metadata,
        first_name: firstName,
        last_name: lastName,
        full_name: trimmedName,
        avatar_url: nextAvatarUrl,
      };

      const profileUpdate = supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          full_name: trimmedName,
          email: trimmedEmail,
          avatar_url: nextAvatarUrl,
        } as any)
        .eq('id', user.id);

      const authUpdate =
        trimmedEmail !== (user.email || '')
          ? supabase.auth.updateUser({ email: trimmedEmail, data: { ...metadata, email: trimmedEmail } })
          : supabase.auth.updateUser({ data: { ...metadata, email: trimmedEmail } });

      const [{ error: profileError }, { error: authError }] = await Promise.all([profileUpdate, authUpdate]);
      if (profileError) throw profileError;
      if (authError) throw authError;

      if (initialAvatarUrl && initialAvatarUrl !== nextAvatarUrl) {
        await deleteProfileAvatar(initialAvatarUrl);
      }

      toast.success('Profil gespeichert', {
        description:
          trimmedEmail !== (user.email || '')
            ? 'Bitte best\u00E4tige gegebenenfalls deine neue E-Mail-Adresse.'
            : 'Deine \u00C4nderungen wurden gespeichert.',
      });

      setInitialAvatarUrl(nextAvatarUrl);
      setForm((current) => ({ ...current, avatarUrl: nextAvatarUrl }));
      setAvatarFile(null);
      navigate(-1);
    } catch (error: unknown) {
      if (uploadedAvatarUrl && uploadedAvatarUrl !== initialAvatarUrl) {
        await deleteProfileAvatar(uploadedAvatarUrl);
      }

      toast.error('Speichern fehlgeschlagen', {
        description: error instanceof Error ? error.message : 'Bitte versuche es erneut.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    const email = form.email.trim() || user?.email || '';

    if (!email) {
      toast.error('Keine E-Mail-Adresse gefunden.', {
        description: 'Bitte hinterlege zuerst eine g\u00FCltige E-Mail-Adresse.',
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
    <SetupAreaLayout className="bg-background" contentClassName="bg-background">
      <div className="space-y-4 px-4 pb-28 pt-12">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors active:scale-95"
            aria-label={'Zur\u00FCck'}
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <h1 className="text-lg font-bold tracking-[-0.02em] text-foreground">Profil bearbeiten</h1>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(19,17,43,0.05)] sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 rounded-2xl border border-border">
              {displayAvatarUrl ? (
                <AvatarImage src={displayAvatarUrl} alt={form.name} className="rounded-2xl object-cover" />
              ) : null}
              <AvatarFallback className="rounded-2xl bg-primary/10 text-2xl font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground">Profilbild</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional. Wird im Profil und in der Sidebar angezeigt.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarPick}
          />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-border"
              disabled={loadingProfile || saving}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              {displayAvatarUrl ? 'Bild ersetzen' : 'Bild ausw\u00E4hlen'}
            </Button>

            {displayAvatarUrl ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-[#F1D7D2] text-[#B64332] hover:bg-[#FFF4F2] hover:text-[#B64332]"
                disabled={loadingProfile || saving}
                onClick={handleRemoveAvatar}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Bild entfernen
              </Button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_8px_24px_rgba(19,17,43,0.05)] sm:p-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-muted-foreground">
                Name
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                disabled={loadingProfile}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">
                E-Mail
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                disabled={loadingProfile}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleSave}
            disabled={saving || loadingProfile}
            className="h-12 w-full rounded-xl bg-[#69B545] font-semibold text-white hover:bg-[#5FA039]"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Speichern
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handlePasswordChange}
            disabled={loadingProfile || saving}
            className="h-12 w-full rounded-xl font-medium"
          >
            {'Passwort \u00E4ndern'}
          </Button>
        </div>
      </div>
    </SetupAreaLayout>
  );
};

export default ProfileEdit;
