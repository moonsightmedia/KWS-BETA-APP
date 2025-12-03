import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ShieldOff, Pencil } from "lucide-react";
import { MaterialIcon } from "@/components/MaterialIcon";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export const UserManagement = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      console.log('[UserManagement] Loading profiles...');
      // First check if we're admin
      const { data: currentUser } = await supabase.auth.getUser();
      console.log('[UserManagement] Current user:', currentUser?.user?.id);
      
      // Test has_role function
      if (currentUser?.user?.id) {
        const { data: isAdminTest, error: roleTestError } = await supabase.rpc('has_role', {
          _user_id: currentUser.user.id,
          _role: 'admin'
        });
        console.log('[UserManagement] Admin check:', {
          isAdmin: isAdminTest,
          error: roleTestError
        });
      }
      
      // Try to get all profiles - first without any filter
      const { data: profiles, error: profileError, count } = await supabase
        .from("profiles")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false });
      
      console.log('[UserManagement] Query result with count:', {
        profiles,
        count,
        error: profileError
      });

      console.log('[UserManagement] Profiles result:', {
        count: profiles?.length || 0,
        profiles: profiles?.map(p => ({ id: p.id, email: p.email, first_name: p.first_name, last_name: p.last_name })),
        error: profileError
      });

      if (profileError) {
        console.error('[UserManagement] Profile error:', profileError);
        throw profileError;
      }

      console.log('[UserManagement] Loading user roles...');
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      console.log('[UserManagement] Roles result:', {
        count: roles?.length || 0,
        roles,
        error: rolesError
      });

      if (rolesError) {
        console.error('[UserManagement] Roles error:', rolesError);
        throw rolesError;
      }

      const mapped = profiles?.map(profile => ({
        ...profile,
        isAdmin: roles?.some(r => r.user_id === profile.id && r.role === 'admin') || false,
        isSetter: roles?.some(r => r.user_id === profile.id && r.role === 'setter') || false
      }));

      console.log('[UserManagement] Mapped users:', {
        count: mapped?.length || 0,
        users: mapped
      });

      return mapped;
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
    <div className="space-y-4 w-full min-w-0">
      <div className="flex items-center justify-end w-full min-w-0">
        <Button 
          variant="outline" 
          className="h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-users"] })}
        >
          Neu laden
        </Button>
      </div>
      {/* Desktop Table View */}
      <div className="hidden md:block border border-[#E7F7E9] rounded-xl bg-white overflow-hidden w-full min-w-0 shadow-sm">
        <div className="overflow-x-auto w-full min-w-0">
          <Table className="w-full min-w-0">
            <TableHeader>
              <TableRow className="border-b border-[#E7F7E9]">
                <TableHead className="text-[#13112B] font-medium">E-Mail</TableHead>
                <TableHead className="text-[#13112B] font-medium">Rollen</TableHead>
                <TableHead className="text-[#13112B] font-medium">Registriert am</TableHead>
                <TableHead className="text-right text-[#13112B] font-medium">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id} className="border-b border-[#E7F7E9]">
                  <TableCell className="font-medium text-[#13112B]">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      {user.isAdmin ? (
                        <Badge className="gap-1 bg-[#36B531] text-white rounded-xl">
                          <Shield className="w-3 h-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge className="bg-[#E7F7E9] text-[#13112B] rounded-xl">Benutzer</Badge>
                      )}
                      {user.isSetter && (
                        <Badge className="gap-1 border border-[#E7F7E9] text-[#13112B] rounded-xl">
                          <MaterialIcon name="build" className="w-3 h-3" size={12} />
                          Setter
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#13112B]/60">
                    {format(new Date(user.created_at), "dd.MM.yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant={user.isAdmin ? "destructive" : "default"}
                        className="h-9 rounded-xl"
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
                        className="h-9 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
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
                        className="h-9 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
                        onClick={() => openEdit(user)}
                      >
                        <Pencil className="w-4 h-4 mr-2" /> Bearbeiten
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 w-full min-w-0">
        {users?.map((user) => (
          <Card key={user.id} className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm w-full min-w-0">
            <CardContent className="p-4 w-full min-w-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#13112B] truncate">{user.email}</p>
                  <p className="text-xs text-[#13112B]/60 mt-1">
                    {format(new Date(user.created_at), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {user.isAdmin ? (
                    <Badge className="gap-1 bg-[#36B531] text-white rounded-xl">
                      <Shield className="w-3 h-3" />
                      Admin
                    </Badge>
                  ) : (
                    <Badge className="bg-[#E7F7E9] text-[#13112B] rounded-xl">Benutzer</Badge>
                  )}
                  {user.isSetter && (
                    <Badge className="gap-1 border border-[#E7F7E9] text-[#13112B] rounded-xl">
                      <MaterialIcon name="build" className="w-3 h-3" size={12} />
                      Setter
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant={user.isAdmin ? "destructive" : "default"}
                className="w-full h-11 rounded-xl"
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
              <div className="grid grid-cols-2 gap-2 mt-2 w-full min-w-0">
                <Button
                  variant={user.isSetter ? "destructive" : "outline"}
                  className="h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] min-w-0 text-xs sm:text-sm"
                  onClick={() =>
                    toggleSetterMutation.mutate({
                      userId: user.id,
                      isSetter: user.isSetter,
                    })
                  }
                  disabled={toggleSetterMutation.isPending}
                >
                  <span className="truncate">{user.isSetter ? "Setter entfernen" : "Als Setter"}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] min-w-0 text-xs sm:text-sm"
                  onClick={() => openEdit(user)}
                >
                  <Pencil className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Bearbeiten</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-heading font-bold text-[#13112B]">Benutzer bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#13112B]">E-Mail</Label>
              <Input value={editUser?.email || ""} readOnly className="h-11 rounded-xl border-[#E7F7E9] bg-[#F9FAF9]" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#13112B]">Vorname</Label>
              <Input 
                value={firstName} 
                onChange={(e)=>setFirstName(e.target.value)} 
                className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#13112B]">Nachname</Label>
              <Input 
                value={lastName} 
                onChange={(e)=>setLastName(e.target.value)} 
                className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#13112B]">Geburtsdatum</Label>
              <Input 
                type="date" 
                value={birthDate || ""} 
                onChange={(e)=>setBirthDate(e.target.value)} 
                className="h-11 rounded-xl border-[#E7F7E9] focus:ring-2 focus:ring-[#36B531] focus:border-[#36B531]" 
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 px-6 pb-6 pt-0 border-t border-[#E7F7E9]">
            <Button 
              variant="outline" 
              onClick={()=>setEditOpen(false)} 
              className="flex-1 h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9]"
            >
              Abbrechen
            </Button>
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-[#E7F7E9] text-[#13112B] hover:bg-[#E7F7E9] text-xs sm:text-sm"
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
              >
                <span className="truncate">Passwort zurücksetzen</span>
              </Button>
              <Button 
                onClick={()=>saveProfileMutation.mutate()} 
                disabled={saveProfileMutation.isPending} 
                className="h-11 rounded-xl bg-[#36B531] hover:bg-[#2da029] text-white"
              >
                Speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
