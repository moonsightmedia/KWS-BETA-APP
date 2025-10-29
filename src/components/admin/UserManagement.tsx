import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ShieldOff, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const UserManagement = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profileError) throw profileError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      return profiles?.map(profile => ({
        ...profile,
        isAdmin: roles?.some(r => r.user_id === profile.id && r.role === 'admin') || false,
        isSetter: roles?.some(r => r.user_id === profile.id && r.role === 'setter') || false
      }));
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      if (isAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(
        variables.isAdmin 
          ? "Admin-Rechte erfolgreich entzogen"
          : "Admin-Rechte erfolgreich vergeben"
      );
    },
    onError: (error) => {
      toast.error("Fehler beim Ändern der Rechte: " + error.message);
    },
  });

  const toggleSetterMutation = useMutation({
    mutationFn: async ({ userId, isSetter }: { userId: string; isSetter: boolean }) => {
      if (isSetter) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "setter");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "setter" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Rolle aktualisiert");
    },
    onError: (error) => {
      toast.error("Fehler beim Ändern der Rolle: " + error.message);
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const openEdit = (u: any) => {
    setEditUser(u);
    const full = (u.full_name as string) || "";
    const parts = full.trim().split(/\s+/);
    const derivedFirst = u.first_name || (parts.length ? parts[0] : "");
    const derivedLast = u.last_name || (parts.length > 1 ? parts.slice(1).join(" ") : "");
    setFirstName(derivedFirst);
    setLastName(derivedLast);
    const bd = u.birth_date ? (
      typeof u.birth_date === 'string' && u.birth_date.length > 10
        ? new Date(u.birth_date).toISOString().slice(0,10)
        : u.birth_date
    ) : "";
    setBirthDate(bd as string);
    setEditOpen(true);
  };

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      const computedFullName = [firstName, lastName].filter(Boolean).join(' ').trim() || null;
      const payload: any = {
        first_name: firstName || null,
        last_name: lastName || null,
        full_name: computedFullName,
        birth_date: birthDate || null,
      };
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", editUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditOpen(false);
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Profil gespeichert");
    },
    onError: (error) => {
      toast.error("Fehler beim Speichern: " + error.message);
    },
  });

  if (isLoading) {
    return <div>Lädt...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}>
          Neu laden
        </Button>
      </div>
      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg shadow-soft bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-Mail</TableHead>
                <TableHead>Rollen</TableHead>
                <TableHead>Registriert am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      {user.isAdmin ? (
                        <Badge variant="default" className="gap-1">
                          <Shield className="w-3 h-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Benutzer</Badge>
                      )}
                      {user.isSetter && (
                        <Badge variant="outline">Setter</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), "dd.MM.yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={user.isAdmin ? "destructive" : "default"}
                      size="sm"
                      onClick={() =>
                        toggleAdminMutation.mutate({
                          userId: user.id,
                          isAdmin: user.isAdmin,
                        })
                      }
                      disabled={toggleAdminMutation.isPending}
                    >
                      {user.isAdmin ? (
                        <>
                          <ShieldOff className="w-4 h-4 mr-2" />
                          Admin entfernen
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Zum Admin machen
                        </>
                      )}
                    </Button>
                    <Button
                      variant={user.isSetter ? "destructive" : "outline"}
                      size="sm"
                      className="ml-2"
                      onClick={() =>
                        toggleSetterMutation.mutate({
                          userId: user.id,
                          isSetter: user.isSetter,
                        })
                      }
                      disabled={toggleSetterMutation.isPending}
                    >
                      {user.isSetter ? "Setter entfernen" : "Als Setter"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {users?.map((user) => (
          <Card key={user.id} className="shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(user.created_at), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {user.isAdmin ? (
                    <Badge variant="default" className="gap-1">
                      <Shield className="w-3 h-3" />
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Benutzer</Badge>
                  )}
                  {user.isSetter && (
                    <Badge variant="outline">Setter</Badge>
                  )}
                </div>
              </div>
              <Button
                variant={user.isAdmin ? "destructive" : "default"}
                size="sm"
                className="w-full"
                onClick={() =>
                  toggleAdminMutation.mutate({
                    userId: user.id,
                    isAdmin: user.isAdmin,
                  })
                }
                disabled={toggleAdminMutation.isPending}
              >
                {user.isAdmin ? (
                  <>
                    <ShieldOff className="w-4 h-4 mr-2" />
                    Admin entfernen
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Zum Admin machen
                  </>
                )}
              </Button>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant={user.isSetter ? "destructive" : "outline"}
                  size="sm"
                  onClick={() =>
                    toggleSetterMutation.mutate({
                      userId: user.id,
                      isSetter: user.isSetter,
                    })
                  }
                  disabled={toggleSetterMutation.isPending}
                >
                  {user.isSetter ? "Setter entfernen" : "Als Setter"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(user)}
                >
                  <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1">
              <Label>E-Mail</Label>
              <Input value={editUser?.email || ""} readOnly />
            </div>
            <div className="grid gap-1">
              <Label>Vorname</Label>
              <Input value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Nachname</Label>
              <Input value={lastName} onChange={(e)=>setLastName(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Geburtsdatum</Label>
              <Input type="date" value={birthDate || ""} onChange={(e)=>setBirthDate(e.target.value)} />
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button variant="outline" onClick={()=>setEditOpen(false)}>Abbrechen</Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={async ()=>{
                    if (!editUser?.email) return;
                    const redirectUrl = `${window.location.origin}/auth`;
                    const { error } = await supabase.auth.resetPasswordForEmail(editUser.email, { redirectTo: redirectUrl });
                    if (error) {
                      toast.error('Fehler beim Senden: ' + error.message);
                    } else {
                      toast.success('Passwort-Reset E-Mail gesendet');
                    }
                  }}
                >Passwort zurücksetzen</Button>
                <Button onClick={()=>saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending}>Speichern</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
