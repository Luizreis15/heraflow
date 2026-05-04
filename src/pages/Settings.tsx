import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLES } from "@/lib/enums";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/contexts/AuthContext";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  roles: AppRole[];
}

export default function Settings() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Configurações — Hera DG OS"; void load(); }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, is_active").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser: Record<string, AppRole[]> = {};
    (roles ?? []).forEach((r: any) => {
      byUser[r.user_id] = [...(byUser[r.user_id] ?? []), r.role];
    });
    setUsers((profiles ?? []).map((p) => ({ ...p, roles: byUser[p.id] ?? [] })));
    setLoading(false);
  };

  const setRole = async (userId: string, newRole: AppRole) => {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado");
    void load();
  };

  const toggleActive = async (userId: string, active: boolean) => {
    if (userId === me?.id && !active) return toast.error("Você não pode se desativar");
    const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", userId);
    if (error) return toast.error(error.message);
    void load();
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-slate-400">Gestão de usuários e permissões.</p>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-slate-400">Carregando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="align-middle">
                    <Select value={u.roles[0] ?? "viewer"} onValueChange={(v) => setRole(u.id, v as AppRole)}>
                      <SelectTrigger className="h-10 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch checked={u.is_active} onCheckedChange={(v) => toggleActive(u.id, v)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
