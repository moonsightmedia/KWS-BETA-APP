import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, RefreshCcw, Search, Shield, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialIcon } from "@/components/MaterialIcon";
import { toast } from "sonner";

type UserProfileRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  created_at: string | null;
};

type UserRoleRecord = {
  user_id: string;
  role: "admin" | "setter" | string;
};

type AdminUserRecord = UserProfileRecord & {
  isAdmin: boolean;
  isSetter: boolean;
};

type UserSegment = "all" | "admins" | "setters" | "users";

const formatJoinedDate = (value?: string | null) => {
  if (!value) return "Unbekannt";

  try {
    return format(new Date(value), "dd.MM.yyyy HH:mm");
  } catch {
    return "Unbekannt";
  }
};

const getDisplayName = (user: Partial<AdminUserRecord>) => {
  const combinedName = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
  if (combinedName) return combinedName;
  if (user?.full_name) return user.full_name;
  if (user?.email) return String(user.email).split("@")[0];
  return "Unbekannter Nutzer";
};

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user, session, loading: authLoading } = useAuth();

  const queriesEnabled = !authLoading && !!user && !!session;
  const sessionRef = useRef(session);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSegment, setActiveSegment] = useState<UserSegment>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRecord | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [passwordResetPending, setPasswordResetPending] = useState(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const { data: users, isLoading, error, isError } = useQuery({
    queryKey: ["admin-users"],
    enabled: queriesEnabled,
    queryFn: async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const accessToken = sessionRef.current?.access_token;

      if (!supabaseUrl || !publishableKey) {
        throw new Error("Supabase URL oder API Key fehlt");
      }

      if (!accessToken) {
        throw new Error("Keine aktive Session verfuegbar");
      }

      const profilesResponse = await window.fetch(`${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`, {
        method: "GET",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!profilesResponse.ok) {
        throw new Error(await profilesResponse.text());
      }

      const rolesResponse = await window.fetch(`${supabaseUrl}/rest/v1/user_roles?select=*`, {
        method: "GET",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!rolesResponse.ok) {
        throw new Error(await rolesResponse.text());
      }

      const profiles = (await profilesResponse.json()) as UserProfileRecord[];
      const roles = (await rolesResponse.json()) as UserRoleRecord[];
      const normalizeId = (value: string) => String(value ?? "").toLowerCase();

      return profiles.map((profile) => ({
        ...profile,
        isAdmin: roles.some((roleEntry) => normalizeId(roleEntry.user_id) === normalizeId(profile.id) && roleEntry.role === "admin"),
        isSetter: roles.some((roleEntry) => normalizeId(roleEntry.user_id) === normalizeId(profile.id) && roleEntry.role === "setter"),
      }));
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  const fetchRoleMutation = (method: "POST" | "DELETE", userId: string, role: "admin" | "setter") => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const accessToken = session?.access_token;

    if (!supabaseUrl || !publishableKey || !accessToken) {
      throw new Error("Session oder Konfiguration fehlt");
    }

    const url =
      method === "DELETE"
        ? `${supabaseUrl}/rest/v1/user_roles?user_id=eq.${userId}&role=eq.${role}`
        : `${supabaseUrl}/rest/v1/user_roles`;

    const init: RequestInit = {
      method,
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    };

    if (method === "POST") {
      init.body = JSON.stringify({ user_id: userId, role });
    }

    return window.fetch(url, init);
  };

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const res = await fetchRoleMutation(isAdmin ? "DELETE" : "POST", userId, "admin");
      if (!res.ok) {
        throw new Error(await res.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Admin-Rechte aktualisiert");
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : "Fehler beim Aktualisieren");
    },
  });

  const toggleSetterMutation = useMutation({
    mutationFn: async ({ userId, isSetter }: { userId: string; isSetter: boolean }) => {
      const res = await fetchRoleMutation(isSetter ? "DELETE" : "POST", userId, "setter");
      if (!res.ok) {
        throw new Error(await res.text());
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Setter-Rechte aktualisiert");
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : "Fehler beim Aktualisieren");
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;

      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
      const payload: Pick<UserProfileRecord, "first_name" | "last_name" | "full_name" | "birth_date"> = {
        first_name: firstName || null,
        last_name: lastName || null,
        full_name: fullName,
        birth_date: birthDate || null,
      };

      const { error: updateError } = await supabase.from("profiles").update(payload).eq("id", editUser.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setEditOpen(false);
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Profil gespeichert");
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : "Fehler beim Speichern");
    },
  });

  const openEdit = (entry: AdminUserRecord) => {
    setEditUser(entry);
    const full = entry.full_name || "";
    const parts = full.trim().split(/\s+/).filter(Boolean);
    setFirstName(entry.first_name || parts[0] || "");
    setLastName(entry.last_name || parts.slice(1).join(" ") || "");
    setBirthDate(entry.birth_date ? String(entry.birth_date).slice(0, 10) : "");
    setEditOpen(true);
  };

  const resetPasswordForEmail = async (email: string | null | undefined) => {
    if (!email) return;
    try {
      setPasswordResetPending(true);
      const redirectUrl = `${window.location.origin}/auth`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });

      if (resetError) {
        toast.error(resetError.message);
        return;
      }

      toast.success("Passwort-Reset E-Mail gesendet");
    } finally {
      setPasswordResetPending(false);
    }
  };

  const resetPasswordForEditedUser = async () => {
    await resetPasswordForEmail(editUser?.email);
  };

  const allUsers = users ?? [];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = allUsers.filter((entry) => {
    const matchesSegment =
      activeSegment === "all" ||
      (activeSegment === "admins" && entry.isAdmin) ||
      (activeSegment === "setters" && entry.isSetter) ||
      (activeSegment === "users" && !entry.isAdmin && !entry.isSetter);

    if (!matchesSegment) return false;

    if (!normalizedSearch) return true;

    return (
      String(entry.email ?? "").toLowerCase().includes(normalizedSearch) ||
      String(entry.full_name ?? "").toLowerCase().includes(normalizedSearch) ||
      String(entry.first_name ?? "").toLowerCase().includes(normalizedSearch) ||
      String(entry.last_name ?? "").toLowerCase().includes(normalizedSearch)
    );
  });

  const adminCount = allUsers.filter((entry) => entry.isAdmin).length;
  const setterCount = allUsers.filter((entry) => entry.isSetter).length;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <section>
          <h2 className="mb-1 text-xl font-bold text-foreground">Benutzer</h2>
          <p className="mb-4 text-sm text-muted-foreground">Lade Benutzerverwaltung...</p>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Benutzer werden geladen.</p>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  if (isError || error) {
    return (
      <div className="space-y-8">
        <section>
          <h2 className="mb-1 text-xl font-bold text-foreground">Benutzer</h2>
          <p className="mb-4 text-sm text-muted-foreground">Fehlerzustand</p>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-destructive">Fehler beim Laden der Benutzer.</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Unbekannter Fehler"}
              </p>
              <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}>
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-xl font-bold text-foreground">Benutzer</h2>
        <p className="mb-4 text-sm text-muted-foreground">Verwalte Profile, Rollen und Stammdaten</p>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Übersicht</CardTitle>
            <CardDescription>{allUsers.length} Profile im System</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Alle Benutzer</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{allUsers.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Admins</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{adminCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Setter</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{setterCount}</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="space-y-3">
              <Tabs value={activeSegment} onValueChange={(value) => setActiveSegment(value as UserSegment)}>
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
                  <TabsTrigger value="all">Alle</TabsTrigger>
                  <TabsTrigger value="admins">Admin Accounts</TabsTrigger>
                  <TabsTrigger value="setters">Setter</TabsTrigger>
                  <TabsTrigger value="users">User</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Name oder E-Mail suchen"
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Neu laden
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-bold text-foreground">Benutzerliste</h2>
        <p className="mb-4 text-sm text-muted-foreground">{filteredUsers.length} sichtbare Eintraege</p>

        <div className="space-y-4">
          {filteredUsers.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{getDisplayName(entry)}</CardTitle>
                <CardDescription>{entry.email || "Keine E-Mail"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {entry.isAdmin ? (
                    <Badge>
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Benutzer</Badge>
                  )}
                  {entry.isSetter && (
                    <Badge variant="outline">
                      <MaterialIcon name="build" className="mr-1 h-3 w-3" size={12} />
                      Setter
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Registriert</p>
                    <p className="mt-1 text-foreground">{formatJoinedDate(entry.created_at)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Geburtsdatum</p>
                    <p className="mt-1 text-foreground">{entry.birth_date ? String(entry.birth_date).slice(0, 10) : "Nicht hinterlegt"}</p>
                  </div>
                </div>

                <Separator />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Rollen & Rechte</CardTitle>
                    <CardDescription>Verwalte Zugriffe direkt in diesem Bereich</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground">Admin-Rechte</Label>
                        <p className="text-xs text-muted-foreground">Voller Zugriff auf den Adminbereich</p>
                      </div>
                      <Switch
                        checked={entry.isAdmin}
                        disabled={toggleAdminMutation.isPending}
                        onCheckedChange={() =>
                          toggleAdminMutation.mutate({
                            userId: entry.id,
                            isAdmin: entry.isAdmin,
                          })
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label className="text-sm font-medium text-foreground">Setter-Rechte</Label>
                        <p className="text-xs text-muted-foreground">Boulder und Inhalte pflegen</p>
                      </div>
                      <Switch
                        checked={entry.isSetter}
                        disabled={toggleSetterMutation.isPending}
                        onCheckedChange={() =>
                          toggleSetterMutation.mutate({
                            userId: entry.id,
                            isSetter: entry.isSetter,
                          })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={() => openEdit(entry)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Bearbeiten
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => resetPasswordForEmail(entry.email)}
                    disabled={passwordResetPending}
                  >
                    Passwort-Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>Bearbeite die Stammdaten dieses Profils.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input value={editUser?.email || ""} readOnly />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Vorname</Label>
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nachname</Label>
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Geburtsdatum</Label>
              <Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
            </div>

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={resetPasswordForEditedUser} disabled={passwordResetPending}>
                Passwort zurücksetzen
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending}>
                  Speichern
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

