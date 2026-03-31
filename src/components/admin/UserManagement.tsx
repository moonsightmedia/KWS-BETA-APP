import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, Pencil, RefreshCcw, Search, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaterialIcon } from "@/components/MaterialIcon";
import { cn } from "@/lib/utils";
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
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
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
        throw new Error("Keine aktive Session verfügbar");
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

  const toggleExpandedUser = (userId: string) => {
    setExpandedUserIds((current) =>
      current.includes(userId) ? current.filter((entryId) => entryId !== userId) : [...current, userId],
    );
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
  const segmentTriggerClassName =
    "h-10 rounded-lg border border-[#DDE7DF] bg-white px-4 text-sm text-[#13112B] data-[state=active]:border-[#36B531] data-[state=active]:bg-[#F7FBF7] data-[state=active]:text-[#13112B]";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Benutzer</div>
          <h2 className="text-[1.32rem] font-semibold tracking-[-0.02em] text-[#13112B]">
            Profile und Rollen verwalten
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#13112B]/58">
            Lade die Benutzerverwaltung und bereite die Stammdaten sowie Rollenansichten vor.
          </p>
        </div>

        <div className="rounded-2xl border border-[#DDE7DF] bg-white px-5 py-6 text-sm text-[#13112B]/58">
          Benutzer werden geladen.
        </div>
      </div>
    );
  }

  if (isError || error) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Benutzer</div>
          <h2 className="text-[1.32rem] font-semibold tracking-[-0.02em] text-[#13112B]">
            Profile und Rollen verwalten
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#13112B]/58">
            Die Benutzerseite konnte gerade nicht geladen werden.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E8C9C0] bg-white px-5 py-6">
          <p className="text-sm font-medium text-[#C14E37]">Fehler beim Laden der Benutzer.</p>
          <p className="mt-2 text-sm text-[#13112B]/58">
            {error instanceof Error ? error.message : "Unbekannter Fehler"}
          </p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
          >
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="text-[0.82rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Benutzer</div>
        <h2 className="text-[1.32rem] font-semibold tracking-[-0.02em] text-[#13112B]">
          Profile und Rollen verwalten
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-[#13112B]/58">
          Suche Nutzer, prüfe Stammdaten und vergebe Admin- oder Setterrechte direkt im selben Bereich.
        </p>
        <div className="text-xs text-[#13112B]/58">
          {allUsers.length} Profile / {adminCount} Admins / {setterCount} Setter
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Filter</div>
          <p className="mt-2 text-sm text-[#13112B]/58">
            Grenze die Liste nach Rollen ein und suche gezielt nach Namen oder E-Mail-Adressen.
          </p>
        </div>

        <Tabs value={activeSegment} onValueChange={(value) => setActiveSegment(value as UserSegment)}>
          <TabsList className="flex h-auto w-full flex-wrap gap-2 bg-transparent p-0">
            <TabsTrigger value="all" className={segmentTriggerClassName}>Alle</TabsTrigger>
            <TabsTrigger value="admins" className={segmentTriggerClassName}>Admins</TabsTrigger>
            <TabsTrigger value="setters" className={segmentTriggerClassName}>Setter</TabsTrigger>
            <TabsTrigger value="users" className={segmentTriggerClassName}>Benutzer</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#13112B]/38" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Name oder E-Mail suchen"
              className="h-11 rounded-xl border-[#DDE7DF] bg-white pl-9"
            />
          </div>
          <Button
            variant="outline"
            className="h-11 w-11 rounded-xl border-[#DDE7DF] bg-white px-0 text-[#13112B] sm:w-auto sm:px-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
          >
            <RefreshCcw className="h-4 w-4 sm:mr-2" />
            <span className="sr-only sm:not-sr-only sm:inline">Neu laden</span>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">Benutzerliste</div>
            <p className="mt-2 text-sm text-[#13112B]/58">
              {filteredUsers.length} sichtbare Einträge
            </p>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DDE7DF] bg-[#FCFEFC] px-5 py-6 text-sm text-[#13112B]/58">
            Kein passender Benutzer gefunden.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((entry) => {
              const isExpanded = expandedUserIds.includes(entry.id);

              return (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-[#DDE7DF] bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpandedUser(entry.id)}
                    className="w-full px-4 py-4 text-left md:px-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-[#13112B] md:text-lg">{getDisplayName(entry)}</h3>
                        <p className="mt-1 truncate text-sm text-[#13112B]/62">
                          {entry.email || "Keine E-Mail hinterlegt"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-lg px-3 py-1 text-[11px] font-semibold",
                              entry.isAdmin
                                ? "border-[#36B531] bg-[#F7FBF7] text-[#13112B]"
                                : "border-[#DDE7DF] bg-white text-[#13112B]/72",
                            )}
                          >
                            {entry.isAdmin ? <Shield className="mr-1 h-3 w-3" /> : null}
                            {entry.isAdmin ? "Admin" : "Benutzer"}
                          </Badge>
                          {entry.isSetter ? (
                            <Badge variant="outline" className="rounded-lg border-[#DDE7DF] bg-white px-3 py-1 text-[11px] font-semibold text-[#13112B]">
                              <MaterialIcon name="build" className="mr-1 h-3 w-3" size={12} />
                              Setter
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-col gap-2 text-sm text-[#13112B]/68 sm:flex-row sm:flex-wrap sm:gap-x-5">
                          <span>Registriert: {formatJoinedDate(entry.created_at)}</span>
                          <span>Geburtsdatum: {entry.birth_date ? String(entry.birth_date).slice(0, 10) : "Nicht hinterlegt"}</span>
                        </div>
                      </div>

                      <ChevronDown
                        className={cn(
                          "mt-1 h-5 w-5 shrink-0 text-[#13112B]/42 transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="border-t border-[#DDE7DF] px-4 py-4 md:px-5">
                      <div className="space-y-4">
                        <div>
                          <div className="text-[0.78rem] font-semibold uppercase tracking-[0.18em] text-[#6E806A]">
                            Rollen und Rechte
                          </div>
                          <p className="mt-2 text-sm text-[#13112B]/58">
                            Verwalte Zugriffe direkt in diesem Bereich.
                          </p>
                        </div>

                        <div className="divide-y divide-[#DDE7DF] rounded-xl border border-[#DDE7DF] bg-[#FCFEFC]">
                          <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <div>
                              <Label className="text-sm font-medium text-[#13112B]">Admin-Rechte</Label>
                              <p className="mt-1 text-xs text-[#13112B]/58">Voller Zugriff auf den Adminbereich</p>
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

                          <div className="flex items-center justify-between gap-4 px-4 py-3">
                            <div>
                              <Label className="text-sm font-medium text-[#13112B]">Setter-Rechte</Label>
                              <p className="mt-1 text-xs text-[#13112B]/58">Boulder und Inhalte pflegen</p>
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
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            className="rounded-xl bg-[#36B531] text-white hover:bg-[#2FA12B] sm:w-auto"
                            onClick={() => openEdit(entry)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Bearbeiten
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B] sm:w-auto"
                            onClick={() => resetPasswordForEmail(entry.email)}
                            disabled={passwordResetPending}
                          >
                            Passwort zurücksetzen
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl border-[#DDE7DF] bg-white sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>Bearbeite die Stammdaten dieses Profils.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-Mail</Label>
              <Input value={editUser?.email || ""} readOnly className="h-11 rounded-xl border-[#DDE7DF] bg-white" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Vorname</Label>
                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11 rounded-xl border-[#DDE7DF] bg-white" />
              </div>
              <div className="space-y-2">
                <Label>Nachname</Label>
                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11 rounded-xl border-[#DDE7DF] bg-white" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Geburtsdatum</Label>
              <Input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="h-11 rounded-xl border-[#DDE7DF] bg-white" />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B]"
                onClick={resetPasswordForEditedUser}
                disabled={passwordResetPending}
              >
                Passwort zurücksetzen
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="rounded-xl border-[#DDE7DF] bg-white text-[#13112B]" onClick={() => setEditOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  className="rounded-xl bg-[#36B531] text-white hover:bg-[#2FA12B]"
                  onClick={() => saveProfileMutation.mutate()}
                  disabled={saveProfileMutation.isPending}
                >
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

