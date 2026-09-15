import { useEffect, useRef, useState } from "react";
import { useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, Pencil, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserProfileEditor } from "@/components/admin/UserProfileEditor";
import type { ProfilePayload } from "@/lib/userProfileForm";
import { AdminViewBar } from "@/components/admin/AdminViewBar";
import { AdminSearchField } from "@/components/admin/AdminSearchField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { KwsSegmentedControl } from "@/components/ui/kws-segmented-control";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type UserProfileRecord = {
  id: string; email: string | null; full_name: string | null;
  first_name: string | null; last_name: string | null; birth_date: string | null; created_at: string | null;
};
type UserRoleRecord = { user_id: string; role: string };
type AdminUserRecord = UserProfileRecord & { isAdmin: boolean; isSetter: boolean };
type UserSegment = "all" | "admins" | "setters" | "users";
type AccountAction =
  | { kind: "role"; entry: AdminUserRecord; role: "admin" | "setter"; enabled: boolean }
  | { kind: "email"; entry: AdminUserRecord };
const SEGMENTS = [{ value: "all", label: "Alle" }, { value: "admins", label: "Admins" }, { value: "setters", label: "Setter" }, { value: "users", label: "Mitglieder" }] as const;
const PAGE_SIZE = 24;

const formatJoinedDate = (value: string | null) => {
  if (!value) return "Nicht hinterlegt";
  try { return format(new Date(value), "dd.MM.yyyy"); } catch { return "Nicht hinterlegt"; }
};
const getDisplayName = (entry: Partial<AdminUserRecord>) =>
  [entry.first_name, entry.last_name].filter(Boolean).join(" ").trim()
  || entry.full_name || entry.email?.split("@")[0] || "Unbekannter Nutzer";

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const instanceId = useId();
  const editTrigger = useRef<HTMLElement | null>(null);
  const actionTrigger = useRef<HTMLElement | null>(null);
  const { user, session, loading: authLoading } = useAuth();
  const sessionRef = useRef(session);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSegment, setActiveSegment] = useState<UserSegment>("all");
  const [editUser, setEditUser] = useState<AdminUserRecord | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [sort, setSort] = useState("newest");
  const [accountAction, setAccountAction] = useState<AccountAction | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const actionLock = useRef(false);
  const [actionError, setActionError] = useState("");
  useEffect(() => { sessionRef.current = session; }, [session]);

  const { data: users = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin-users", user?.id],
    enabled: !authLoading && !!user && !!session,
    queryFn: async ({ signal }) => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const token = sessionRef.current?.access_token;
      if (!url || !key || !token) throw new Error("Keine aktive Sitzung");
      const headers = { apikey: key, Authorization: `Bearer ${token}` };
      const [profilesResponse, rolesResponse] = await Promise.all([
        window.fetch(`${url}/rest/v1/profiles?select=*&order=created_at.desc`, { headers, signal }),
        window.fetch(`${url}/rest/v1/user_roles?select=*`, { headers, signal }),
      ]);
      if (!profilesResponse.ok || !rolesResponse.ok) throw new Error("Benutzer konnten nicht geladen werden");
      const [profiles, roles]: [UserProfileRecord[], UserRoleRecord[]] = await Promise.all([profilesResponse.json(), rolesResponse.json()]);
      if (!Array.isArray(profiles) || !Array.isArray(roles)) throw new Error("Ungültige Antwort");
      const admins = new Set(roles.filter(row => row.role === "admin").map(row => row.user_id.toLowerCase()));
      const setters = new Set(roles.filter(row => row.role === "setter").map(row => row.user_id.toLowerCase()));
      return profiles.map(profile => ({ ...profile, isAdmin: admins.has(profile.id.toLowerCase()), isSetter: setters.has(profile.id.toLowerCase()) }));
    },
    retry: 2, retryDelay: 1000, staleTime: 0,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (payload: ProfilePayload) => {
      if (!editUser) throw new Error("Kein Profil ausgewählt");
      const { data, error } = await supabase.from("profiles").update(payload).eq("id", editUser.id).select("id");
      if (error) throw error;
      if (data?.length !== 1 || data[0].id !== editUser.id) throw new Error("Profiländerung nicht bestätigt");
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Profil gespeichert"); },
  });
  const requestAction = (action: AccountAction) => {
    actionTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setActionError("");
    setAccountAction(action);
  };
  const adminCount = users.filter(entry => entry.isAdmin).length;
  const confirmAction = async () => {
    if (!accountAction || actionLock.current) return;
    const action = accountAction;
    actionLock.current = true;
    setActionPending(true);
    setActionError("");
    try {
      if (action.kind === "email") {
        if (!action.entry.email) throw new Error("E-Mail fehlt");
        const { error } = await supabase.auth.resetPasswordForEmail(action.entry.email, { redirectTo: `${window.location.origin}/auth` });
        if (error) throw error;
        toast.success("Passwort-E-Mail angefordert");
      } else {
        // UI guard only. Authorization remains enforced by the server/RLS.
        if (action.role === "admin" && !action.enabled && (action.entry.id === user?.id || adminCount <= 1)) throw new Error("Adminrechte geschützt");
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const token = sessionRef.current?.access_token;
        if (!url || !key || !token) throw new Error("Keine aktive Sitzung");
        const response = await window.fetch(`${url}/rest/v1/user_roles${action.enabled ? "" : `?user_id=eq.${encodeURIComponent(action.entry.id)}&role=eq.${action.role}`}`, {
          method: action.enabled ? "POST" : "DELETE",
          headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
          ...(action.enabled ? { body: JSON.stringify({ user_id: action.entry.id, role: action.role }) } : {}),
        });
        if (!response.ok) throw new Error("Rollenänderung fehlgeschlagen");
        const rows: UserRoleRecord[] = await response.json();
        if (!Array.isArray(rows) || rows.length !== 1 || rows[0].user_id !== action.entry.id || rows[0].role !== action.role) throw new Error("Rollenänderung nicht bestätigt");
        void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        toast.success("Rolle aktualisiert");
      }
      setAccountAction(null);
    } catch {
      setActionError(accountAction.kind === "email" ? "Die E-Mail konnte nicht angefordert werden. Bitte erneut versuchen." : "Die Rollenänderung wurde nicht bestätigt. Bitte erneut versuchen oder die Liste aktualisieren.");
    } finally { actionLock.current = false; setActionPending(false); }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter(entry => {
    const matchesRole = activeSegment === "all"
      || (activeSegment === "admins" && entry.isAdmin)
      || (activeSegment === "setters" && entry.isSetter)
      || (activeSegment === "users" && !entry.isAdmin && !entry.isSetter);
    return matchesRole && (!normalizedSearch || `${getDisplayName(entry)} ${entry.email || ""}`.toLowerCase().includes(normalizedSearch));
  }).sort((a, b) => sort === "name"
    ? getDisplayName(a).localeCompare(getDisplayName(b), "de")
    : (b.created_at || "").localeCompare(a.created_at || ""));
  const clearFilters = () => { setSearchTerm(""); setActiveSegment("all"); setVisibleLimit(PAGE_SIZE); };

  return <div className="space-y-4">
    <AdminViewBar refreshing={isFetching} onRefresh={() => void refetch()} disabled={authLoading}>
      <KwsSegmentedControl value={activeSegment} onValueChange={value => { setActiveSegment(value); setVisibleLimit(PAGE_SIZE); setExpandedUserId(null); }} ariaLabel="Benutzer nach Rolle filtern" options={SEGMENTS} />
    </AdminViewBar>
    <AdminSearchField value={searchTerm} onChange={value => { setSearchTerm(value); setVisibleLimit(PAGE_SIZE); setExpandedUserId(null); }} placeholder="Name oder E-Mail" label="Benutzer nach Name oder E-Mail suchen" />
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground" role="status">{isLoading || authLoading ? "Benutzer werden geladen …" : isError ? "Benutzer nicht verfügbar" : filteredUsers.length === users.length ? `${users.length} Benutzer` : `${filteredUsers.length} von ${users.length} Benutzern`}</p>
      <Select value={sort} onValueChange={value => { setSort(value); setVisibleLimit(PAGE_SIZE); }}><SelectTrigger aria-label="Benutzer sortieren" className="h-11 w-auto gap-3 border-0 bg-transparent text-xs shadow-none"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Neueste zuerst</SelectItem><SelectItem value="name">Name A–Z</SelectItem></SelectContent></Select>
    </div>
    {isLoading || authLoading ? <div className="animate-pulse space-y-3 rounded-kws-card bg-card p-4 motion-reduce:animate-none" aria-hidden="true">{[1, 2, 3].map(row => <div key={row} className="h-14 rounded-kws-control bg-secondary" />)}</div> : isError ? <div role="alert" className="rounded-kws-card bg-card p-5"><p className="text-sm">Benutzer konnten nicht geladen werden.</p><Button variant="outline" className="mt-4" disabled={isFetching} onClick={() => void refetch()}>Erneut versuchen</Button></div> : filteredUsers.length === 0 ? <div className="rounded-kws-card bg-card p-8 text-center"><p className="text-sm text-muted-foreground">Keine Benutzer gefunden.</p>{(searchTerm || activeSegment !== "all") && <Button variant="ghost" className="mt-3" onClick={clearFilters}>Filter zurücksetzen</Button>}</div> :
      <div className="overflow-hidden rounded-kws-card bg-card shadow-soft">
        <div className="divide-y divide-border/50">
          {filteredUsers.slice(0, visibleLimit).map(entry => {
            const expanded = expandedUserId === entry.id;
            const protectedAdmin = entry.isAdmin && (entry.id === user?.id || adminCount <= 1);
            return <article key={entry.id}>
              <button type="button" onClick={() => setExpandedUserId(expanded ? null : entry.id)} aria-expanded={expanded} aria-controls={instanceId + entry.id + "-details"} className={cn("flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", expanded && "bg-secondary/45")}>
                <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-kws-control bg-secondary text-sm font-semibold">{getDisplayName(entry).split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <h3 className="break-words font-sans text-sm font-semibold">{getDisplayName(entry)}{entry.id === user?.id ? " (du)" : ""}</h3>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{entry.email || "Keine E-Mail hinterlegt"}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5 lg:hidden">{entry.isAdmin && <Badge className="border-0 bg-primary/10 text-primary-ink">Admin</Badge>}{entry.isSetter && <Badge variant="secondary" className="border-0">Setter</Badge>}</span>
                </span>
                <span className="hidden shrink-0 items-center gap-2 lg:flex">{entry.isAdmin && <Badge className="border-0 bg-primary/10 text-primary-ink">Admin</Badge>}{entry.isSetter && <Badge variant="secondary" className="border-0">Setter</Badge>}{!entry.isAdmin && !entry.isSetter && <span className="text-xs text-muted-foreground">Mitglied</span>}</span>
                <ChevronDown aria-hidden="true" className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", expanded && "rotate-180")} />
              </button>
              {expanded && <div id={instanceId + entry.id + "-details"} className="space-y-4 px-4 pb-4 pt-3 sm:px-5">
                <dl className="grid grid-cols-2 gap-3 text-xs lg:grid-cols-4"><div><dt className="text-muted-foreground">Registriert</dt><dd className="mt-1">{formatJoinedDate(entry.created_at)}</dd></div><div><dt className="text-muted-foreground">Geburtsdatum</dt><dd className="mt-1">{formatJoinedDate(entry.birth_date)}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">E-Mail</dt><dd className="mt-1 break-all">{entry.email || "Nicht hinterlegt"}</dd></div></dl>
                <div className="grid gap-2 lg:grid-cols-2">
                  <div className="flex min-h-14 items-center justify-between gap-3 rounded-kws-control bg-secondary/60 p-3"><div><Label htmlFor={instanceId + entry.id + "-admin"}>Admin-Rechte</Label>{protectedAdmin && <p id={instanceId + entry.id + "-protected"} className="mt-1 text-xs text-muted-foreground">{entry.id === user?.id ? "Dein Adminzugang bleibt geschützt." : "Mindestens ein Admin bleibt erhalten."}</p>}</div><Switch id={instanceId + entry.id + "-admin"} checked={entry.isAdmin} disabled={actionPending || protectedAdmin} aria-describedby={protectedAdmin ? instanceId + entry.id + "-protected" : undefined} onCheckedChange={enabled => requestAction({ kind: "role", entry, role: "admin", enabled })} /></div>
                  <div className="flex min-h-14 items-center justify-between gap-3 rounded-kws-control bg-secondary/60 p-3"><Label htmlFor={instanceId + entry.id + "-setter"}>Setter-Rechte</Label><Switch id={instanceId + entry.id + "-setter"} checked={entry.isSetter} disabled={actionPending} onCheckedChange={enabled => requestAction({ kind: "role", entry, role: "setter", enabled })} /></div>
                </div>
                <div className="flex flex-wrap gap-2"><Button onClick={() => { editTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setEditUser(entry); }}><Pencil className="h-4 w-4" aria-hidden="true" />Bearbeiten</Button><Button variant="ghost" disabled={!entry.email || actionPending} onClick={() => requestAction({ kind: "email", entry })}><Mail className="h-4 w-4" aria-hidden="true" />Passwort-E-Mail</Button></div>
              </div>}
            </article>;
          })}
        </div>
        {filteredUsers.length > visibleLimit && <div className="p-3 text-center"><Button variant="ghost" onClick={() => setVisibleLimit(limit => limit + PAGE_SIZE)}>Weitere {Math.min(PAGE_SIZE, filteredUsers.length - visibleLimit)} anzeigen</Button></div>}
      </div>}
    {editUser && <UserProfileEditor key={editUser.id} profile={editUser} onSave={payload => saveProfileMutation.mutateAsync(payload)} onClose={() => setEditUser(null)} onRestoreFocus={() => editTrigger.current?.focus()} />}
    <AlertDialog open={!!accountAction} onOpenChange={open => { if (!open && !actionLock.current) setAccountAction(null); }}>
      <AlertDialogContent onEscapeKeyDown={event => { if (actionPending) event.preventDefault(); }} onCloseAutoFocus={event => { event.preventDefault(); actionTrigger.current?.focus(); }}>
        <AlertDialogTitle>{accountAction?.kind === "email" ? "Passwort-E-Mail senden?" : `${accountAction?.role === "admin" ? "Admin" : "Setter"}-Rechte ${accountAction?.enabled ? "vergeben" : "entfernen"}?`}</AlertDialogTitle>
        <AlertDialogDescription className="break-words">{accountAction?.kind === "email" ? `Ein Link zum Zurücksetzen wird an ${accountAction.entry.email} angefordert.` : `Zugriff für ${accountAction ? getDisplayName(accountAction.entry) : ""} ${accountAction?.enabled ? "freigeben" : "entziehen"}.`}</AlertDialogDescription>
        {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
        <AlertDialogFooter><AlertDialogCancel disabled={actionPending}>Abbrechen</AlertDialogCancel><Button disabled={actionPending} onClick={() => void confirmAction()}>{actionPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{accountAction?.kind === "email" ? "E-Mail anfordern" : "Bestätigen"}</Button></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
};

