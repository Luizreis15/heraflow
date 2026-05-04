import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLES, labelOf } from "@/lib/enums";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Shield, Users, Mail, Sparkles, UserX, UserCheck } from "lucide-react";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  roles: AppRole[];
}

const ROLE_BADGE: Record<AppRole, { className: string; dot: string }> = {
  admin: {
    className: "border-amber-500/45 bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-100 shadow-[0_0_20px_-8px_rgba(245,158,11,0.5)]",
    dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
  },
  operation: {
    className: "border-cyan-500/40 bg-cyan-500/12 text-cyan-100",
    dot: "bg-cyan-400",
  },
  editor_support: {
    className: "border-violet-500/40 bg-violet-500/12 text-violet-100",
    dot: "bg-violet-400",
  },
  commercial: {
    className: "border-emerald-500/40 bg-emerald-500/12 text-emerald-100",
    dot: "bg-emerald-400",
  },
  viewer: {
    className: "border-slate-500/40 bg-slate-500/10 text-slate-300",
    dot: "bg-slate-500",
  },
};

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function Settings() {
  const { user: me, loading: authLoading, isAdmin, hasRole } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Configurações — Hera DG OS";
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, is_active").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser: Record<string, AppRole[]> = {};
    (roles ?? []).forEach((r: { user_id: string; role: AppRole }) => {
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

  if (!authLoading && !hasRole(["admin"])) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentRole = (u: UserRow): AppRole => u.roles[0] ?? "viewer";
  const rb = (role: AppRole) => ROLE_BADGE[role] ?? ROLE_BADGE.viewer;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Acesso à equipa</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Configurações</h1>
          <p className="mt-1 text-sm text-slate-400">Utilizadores, papéis e estado da conta. Apenas administradores.</p>
        </div>
        {isAdmin && (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
            <Shield className="h-3.5 w-3.5" />
            Modo admin
          </span>
        )}
      </div>

      <Card className="overflow-hidden border-white/[0.07] bg-card/30">
        {loading ? (
          <div className="flex items-center gap-2 p-10 text-slate-400">
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            A carregar utilizadores…
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {users.map((u) => {
              const role = currentRole(u);
              const style = rb(role);
              const isMe = u.id === me?.id;

              return (
                <li
                  key={u.id}
                  className={cn(
                    "flex flex-col gap-4 p-5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                    u.is_active ? "bg-transparent hover:bg-white/[0.02]" : "bg-black/25 opacity-[0.92]",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-bold tracking-tight",
                        u.is_active
                          ? "border-primary/35 bg-gradient-to-br from-primary/25 to-sky-500/10 text-white"
                          : "border-white/10 bg-slate-800/80 text-slate-500",
                      )}
                      aria-hidden
                    >
                      {initials(u.full_name || u.email || "?")}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-white">{u.full_name || "—"}</p>
                        {isMe && (
                          <span className="shrink-0 rounded-md border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            Você
                          </span>
                        )}
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
                            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/50 bg-slate-800/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                            <UserX className="h-3.5 w-3.5" />
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="flex items-center gap-2 truncate text-sm text-slate-500">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-[220px] flex-col gap-2 sm:items-end">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Papel</span>
                      <Select value={role} onValueChange={(v) => setRole(u.id, v as AppRole)}>
                        <SelectTrigger
                          className={cn(
                            "h-11 w-full justify-between gap-2 rounded-xl border font-semibold shadow-sm sm:w-[220px]",
                            style.className,
                            "focus:ring-2 focus:ring-primary/25",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} aria-hidden />
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent align="end">
                          {ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 sm:flex-col sm:justify-center sm:py-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Conta</span>
                      <div className="flex items-center gap-2">
                        <Switch checked={u.is_active} onCheckedChange={(v) => toggleActive(u.id, v)} aria-label={`Ativar ${u.full_name}`} />
                        <span className="text-xs text-slate-400">{u.is_active ? "Ligada" : "Desligada"}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {!loading && users.length === 0 && (
        <Card className="border-dashed border-white/10 p-10 text-center text-slate-500">
          <Users className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          Nenhum utilizador encontrado.
        </Card>
      )}
    </div>
  );
}
