import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
        isAdmin: roles?.some(r => r.user_id === profile.id && r.role === 'admin') || false
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

  if (isLoading) {
    return <div>Lädt...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg shadow-soft bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-Mail</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Registriert am</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  {user.isAdmin ? (
                    <Badge variant="default" className="gap-1">
                      <Shield className="w-3 h-3" />
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Benutzer</Badge>
                  )}
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
