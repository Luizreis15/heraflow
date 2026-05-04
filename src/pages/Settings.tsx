import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ROLES, labelOf, LEAD_STATUSES, LEAD_SOURCES } from "@/lib/enums";
import { ADMIN_PERMISSIONS_MATRIX, PERMISSION_BADGE_LABEL, permissionCell, type PermissionBadge } from "@/lib/adminPermissionsMatrix";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { AppRole } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Shield,
  Users,
  Mail,
  Sparkles,
  UserX,
  UserCheck,
  KeyRound,
  Pencil,
  UserPlus,
  RefreshCw,
  ClipboardCopy,
  Activity,
  Database,
  Lock,
  Plug,
  KanbanSquare,
  Settings2,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string | null;
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

const PERM_CELL: Record<PermissionBadge, string> = {
  full: "border-emerald-500/35 bg-emerald-500/12 text-emerald-100",
  read: "border-sky-500/35 bg-sky-500/12 text-sky-100",
  own: "border-amber-500/35 bg-amber-500/12 text-amber-100",
  none: "border-white/10 bg-white/[0.04] text-slate-500",
};

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function maskSupabaseHost(url: string | undefined): string {
  if (!url) return "—";
  try {
    const u = new URL(url);
    const h = u.hostname;
    if (h.length <= 12) return `${u.protocol}//${h}`;
    return `${u.protocol}//${h.slice(0, 4)}…${h.slice(-10)}`;
  } catch {
    return "••••••••";
  }
}

const INTEGRATIONS = [
  { id: "supabase", title: "Supabase", status: "live" as const, desc: "Base de dados, Auth e RLS." },
  { id: "whyzapp", title: "WhatsApp / WhyZapp", status: "future" as const, desc: "Conectar atendimento e automações." },
  { id: "gcal", title: "Google Calendar", status: "future" as const, desc: "Agenda, reuniões e follow-ups." },
  { id: "meta", title: "Meta Ads", status: "future" as const, desc: "Campanhas, leads e performance." },
  { id: "drive", title: "Google Drive", status: "future" as const, desc: "Documentos, propostas e ativos." },
  { id: "openai", title: "IA / OpenAI", status: "future" as const, desc: "Geração de processos, resumos e insights." },
];

export default function Settings() {
  const { user: me, session, profile, loading: authLoading, isAdmin, hasRole, roles: myRoles } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    users: number;
    usersActive: number;
    tasks: number;
    processes: number;
    leads: number;
    sprints: number;
    diary: number;
    assets: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [newUserOpen, setNewUserOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, email, is_active, created_at").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser: Record<string, AppRole[]> = {};
    (roles ?? []).forEach((r: { user_id: string; role: AppRole }) => {
      byUser[r.user_id] = [...(byUser[r.user_id] ?? []), r.role];
    });
    setUsers((profiles ?? []).map((p) => ({ ...p, roles: byUser[p.id] ?? [] })));
    setLoading(false);
  }, []);

  const loadSystemStats = useCallback(async () => {
    setStatsLoading(true);
    const [
      { count: cUsers },
      { count: cActive },
      { count: cTasks },
      { count: cProc },
      { count: cLeads },
      { count: cSprints },
      { count: cDiary },
      { count: cAssets },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("tasks").select("id", { count: "exact", head: true }),
      supabase.from("processes").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("sprints").select("id", { count: "exact", head: true }),
      supabase.from("diary_entries").select("id", { count: "exact", head: true }),
      supabase.from("assets").select("id", { count: "exact", head: true }),
    ]);
    setStats({
      users: cUsers ?? 0,
      usersActive: cActive ?? 0,
      tasks: cTasks ?? 0,
      processes: cProc ?? 0,
      leads: cLeads ?? 0,
      sprints: cSprints ?? 0,
      diary: cDiary ?? 0,
      assets: cAssets ?? 0,
    });
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    document.title = "Super Admin — Hera DG OS";
    void loadUsers();
    void loadSystemStats();
  }, [loadUsers, loadSystemStats]);

  const setRole = async (userId: string, newRole: AppRole) => {
    const row = users.find((u) => u.id === userId);
    const prev = row?.roles[0] ?? "viewer";
    if (userId === me?.id && prev === "admin" && newRole !== "admin") {
      const ok = window.confirm(
        "CONFIRMAR: remover o papel ADMIN de si próprio?\n\nNão poderá voltar a aceder a /settings até outro administrador restaurar o seu acesso.\n\nDeseja continuar?",
      );
      if (!ok) return;
    }
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado");
    void loadUsers();
  };

  const toggleActive = async (userId: string, active: boolean) => {
    if (userId === me?.id && !active) return toast.error("Não pode desativar a sua própria conta.");
    const { error } = await supabase.from("profiles").update({ is_active: active }).eq("id", userId);
    if (error) return toast.error(error.message);
    void loadUsers();
  };

  const saveEditedName = async () => {
    if (!editUser) return;
    const name = editName.trim();
    if (!name) return toast.error("Indique o nome");
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", editUser.id);
    setSavingName(false);
    if (error) return toast.error(error.message);
    toast.success("Nome atualizado");
    setEditUser(null);
    void loadUsers();
  };

  const verifySession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) return toast.error(error.message);
    if (data.session) toast.success("Sessão válida.");
    else toast.info("Sem sessão ativa.");
  };

  const copyDebug = async () => {
    const payload = {
      mode: import.meta.env.MODE,
      userId: me?.id,
      email: me?.email,
      roles: myRoles,
      sessionExpires: session?.expires_at,
      supabaseHost: maskSupabaseHost(import.meta.env.VITE_SUPABASE_URL),
      appVersion: "MVP v1",
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("Informação copiada para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  if (!authLoading && !hasRole(["admin"])) {
    return <Navigate to="/dashboard" replace />;
  }

  const currentRole = (u: UserRow): AppRole => u.roles[0] ?? "viewer";
  const rb = (role: AppRole) => ROLE_BADGE[role] ?? ROLE_BADGE.viewer;

  const statCards = stats
    ? [
        { label: "Utilizadores", value: stats.users, icon: Users },
        { label: "Utilizadores ativos", value: stats.usersActive, icon: UserCheck },
        { label: "Tarefas", value: stats.tasks, icon: Activity },
        { label: "Processos", value: stats.processes, icon: Settings2 },
        { label: "Leads", value: stats.leads, icon: KanbanSquare },
        { label: "Sprints", value: stats.sprints, icon: Sparkles },
        { label: "Diário", value: stats.diary, icon: BookOpen },
        { label: "Biblioteca", value: stats.assets, icon: Database },
      ]
    : [];

  return (
    <div className="max-w-7xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Super Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Configurações</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Painel operacional — utilizadores, permissões, pipeline, integrações, sistema e segurança.
          </p>
        </div>
        {isAdmin && (
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200">
            <Shield className="h-3.5 w-3.5" />
            Admin
          </span>
        )}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList
            className={cn(
              "inline-flex h-auto min-w-full flex-nowrap justify-start gap-1 rounded-xl border border-white/[0.08] bg-black/25 p-1.5 sm:flex-wrap",
            )}
          >
            {[
              { id: "users", label: "Utilizadores", icon: Users },
              { id: "permissions", label: "Permissões", icon: Lock },
              { id: "leads", label: "Leads", icon: KanbanSquare },
              { id: "integrations", label: "Integrações", icon: Plug },
              { id: "system", label: "Sistema", icon: Activity },
              { id: "security", label: "Segurança", icon: Shield },
            ].map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className={cn(
                  "shrink-0 gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm",
                  "data-[state=active]:border data-[state=active]:border-primary/35 data-[state=active]:bg-primary/12 data-[state=active]:text-white",
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ——— Utilizadores ——— */}
        <TabsContent value="users" className="mt-6 space-y-4 outline-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Gerir equipa, papéis e estado das contas.</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="border-white/10" onClick={() => void loadUsers()}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Atualizar
              </Button>
              <Button size="sm" onClick={() => setNewUserOpen(true)}>
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                Novo utilizador
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-white/[0.07] bg-card/40 backdrop-blur-sm">
            {loading ? (
              <div className="flex items-center gap-2 p-10 text-slate-400">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                A carregar…
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Users className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                Nenhum utilizador encontrado.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {users.map((u) => {
                  const role = currentRole(u);
                  const style = rb(role);
                  const isMe = u.id === me?.id;
                  const created = u.created_at ? format(new Date(u.created_at), "dd MMM yyyy", { locale: ptBR }) : "—";

                  return (
                    <li
                      key={u.id}
                      className={cn(
                        "flex flex-col gap-4 p-5 transition-colors lg:flex-row lg:items-center lg:justify-between lg:gap-6",
                        u.is_active ? "hover:bg-white/[0.02]" : "bg-black/25 opacity-[0.92]",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-bold",
                            u.is_active
                              ? "border-primary/35 bg-gradient-to-br from-primary/25 to-sky-500/10 text-white"
                              : "border-white/10 bg-slate-800/80 text-slate-500",
                          )}
                        >
                          {initials(u.full_name || u.email || "?")}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-white">{u.full_name || "—"}</p>
                            {isMe && (
                              <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                                Você
                              </Badge>
                            )}
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                                <UserCheck className="h-3 w-3" />
                                Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/50 bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                                <UserX className="h-3 w-3" />
                                Inativo
                              </span>
                            )}
                          </div>
                          <p className="flex items-center gap-2 truncate text-sm text-slate-500">
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {u.email}
                          </p>
                          <p className="text-[11px] text-slate-600">Criado: {created}</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-white/10 text-xs"
                              onClick={() => {
                                setEditUser(u);
                                setEditName(u.full_name);
                              }}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Editar nome
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-white/10 text-xs"
                              onClick={() => setResetTarget(u)}
                            >
                              <KeyRound className="mr-1 h-3 w-3" />
                              Reset senha
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:shrink-0">
                        <div className="flex min-w-[220px] flex-col gap-1 sm:items-end">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Papel</span>
                          <Select value={role} onValueChange={(v) => void setRole(u.id, v as AppRole)}>
                            <SelectTrigger
                              className={cn(
                                "h-11 w-full justify-between gap-2 rounded-xl border font-semibold sm:w-[220px]",
                                style.className,
                              )}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} />
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
                        <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                          <Switch
                            checked={u.is_active}
                            onCheckedChange={(v) => void toggleActive(u.id, v)}
                            disabled={u.id === me?.id && u.is_active}
                            aria-label={`Ativar ${u.full_name}`}
                          />
                          <span className="text-xs text-slate-400">{u.is_active ? "Conta ligada" : "Conta desligada"}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </TabsContent>

        {/* ——— Permissões ——— */}
        <TabsContent value="permissions" className="mt-6 outline-none">
          <Card className="border-white/[0.08] bg-gradient-to-br from-card/80 to-[hsl(218_44%_7%)] p-6">
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100/90">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p>
                As permissões reais são aplicadas por <strong className="text-white">RLS no Supabase</strong> e por{" "}
                <strong className="text-white">rotas protegidas no frontend</strong>. Esta matriz resume o modelo de
                acesso do MVP.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-black/30 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3 font-semibold">Área</th>
                    {ROLES.map((roleDef) => (
                      <th key={roleDef.value} className="px-2 py-3 font-semibold">
                        {roleDef.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ADMIN_PERMISSIONS_MATRIX.map((row) => (
                    <tr key={row.area} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="px-3 py-2.5 font-medium text-slate-200">{row.area}</td>
                      {ROLES.map((roleDef) => {
                        const cell = permissionCell(row, roleDef.value);
                        return (
                          <td key={roleDef.value} className="px-2 py-2">
                            <span
                              className={cn(
                                "inline-flex max-w-[140px] truncate rounded-md border px-2 py-1 text-[10px] font-semibold",
                                PERM_CELL[cell],
                              )}
                            >
                              {PERMISSION_BADGE_LABEL[cell]}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ——— Leads ——— */}
        <TabsContent value="leads" className="mt-6 space-y-4 outline-none">
          <Card className="border-white/[0.08] bg-card/40 p-6">
            <h2 className="text-lg font-semibold text-white">Pipeline comercial</h2>
            <p className="mt-1 text-sm text-slate-500">Valores alinhados aos enums da aplicação. Persistência futura.</p>
            <Separator className="my-5 bg-white/[0.06]" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Status do pipeline</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                  {LEAD_STATUSES.map((s) => (
                    <li key={s.value} className="flex justify-between gap-2 border-b border-white/[0.04] py-1.5 last:border-0">
                      <span>{s.label}</span>
                      <code className="text-[10px] text-slate-600">{s.value}</code>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Origens</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                  {LEAD_SOURCES.map((s) => (
                    <li key={s.value} className="flex justify-between gap-2 border-b border-white/[0.04] py-1.5 last:border-0">
                      <span>{s.label}</span>
                      <code className="text-[10px] text-slate-600">{s.value}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Regras ativas (app)</h3>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-400">
                <li>Perdido exige motivo de perda.</li>
                <li>Diagnóstico agendado exige próxima ação ou data de follow-up.</li>
                <li>Proposta enviada mostra campo de valor da proposta.</li>
              </ul>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button type="button" disabled className="opacity-60">
                Editar regras do pipeline
              </Button>
              <Badge variant="secondary" className="text-[10px]">
                Em breve
              </Badge>
            </div>
          </Card>
        </TabsContent>

        {/* ——— Integrações ——— */}
        <TabsContent value="integrations" className="mt-6 outline-none">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {INTEGRATIONS.map((it) => (
              <Card
                key={it.id}
                className="border-white/[0.08] bg-gradient-to-b from-card/90 to-[hsl(218_44%_7%)] p-5 shadow-inner"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white">{it.title}</h3>
                  {it.status === "live" ? (
                    <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-200">Conectado</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] text-slate-400">
                      Futuro
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-500">{it.desc}</p>
                {it.id === "supabase" && (
                  <p className="mt-3 font-mono text-[11px] text-slate-600">{maskSupabaseHost(import.meta.env.VITE_SUPABASE_URL)}</p>
                )}
                <Button type="button" size="sm" variant="outline" className="mt-4 w-full border-white/10" disabled={it.status !== "live"}>
                  {it.status === "live" ? "Ativo" : "Configurar em breve"}
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ——— Sistema ——— */}
        <TabsContent value="system" className="mt-6 space-y-6 outline-none">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void loadUsers();
                void loadSystemStats();
              }}
            >
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              Recarregar dados
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void verifySession()}>
              Verificar sessão
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void copyDebug()}>
              <ClipboardCopy className="mr-1 h-3.5 w-3.5" />
              Copiar debug
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((s) => (
              <Card key={s.label} className="border-white/[0.08] bg-black/25 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <s.icon className="h-3.5 w-3.5 text-primary" />
                  {s.label}
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                  {statsLoading ? "…" : stats ? s.value : "—"}
                </p>
              </Card>
            ))}
          </div>

          <Card className="border-white/[0.08] bg-card/40 p-6">
            <h3 className="text-sm font-semibold text-white">Saúde do sistema</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Supabase: conectado (cliente anónimo/publishable key)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Auth: ativo (sessão persistida)
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                RLS: políticas ativas na base de dados (fonte de verdade)
              </li>
              <li>
                Ambiente: <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-primary">{import.meta.env.MODE}</code>
              </li>
              <li>Versão da app: MVP v1</li>
            </ul>
          </Card>
        </TabsContent>

        {/* ——— Segurança ——— */}
        <TabsContent value="security" className="mt-6 space-y-6 outline-none">
          <Card className="border-white/[0.08] bg-card/40 p-6">
            <h3 className="text-sm font-semibold text-white">Sessão atual</h3>
            <dl className="mt-4 space-y-2 text-sm text-slate-400">
              <div className="flex flex-wrap gap-2">
                <dt className="text-slate-600">Utilizador</dt>
                <dd className="text-slate-200">{me?.email ?? "—"}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-slate-600">Papéis</dt>
                <dd className="text-slate-200">{myRoles.length ? myRoles.map((r) => labelOf(ROLES, r)).join(", ") : "—"}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-slate-600">Conta</dt>
                <dd className="text-slate-200">{profile?.is_active ? "Ativa" : "Inativa"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="border-white/[0.08] bg-card/40 p-6">
            <h3 className="text-sm font-semibold text-white">Regras de segurança</h3>
            <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-400">
              <li>A chave service_role nunca deve estar no frontend.</li>
              <li>RLS no Supabase é a fonte de verdade para acesso a dados.</li>
              <li>Utilizadores inativos são bloqueados na aplicação (AuthContext / ProtectedRoute).</li>
              <li>Apenas administradores gerem papéis em user_roles.</li>
            </ul>
          </Card>

          <Card className="border-white/[0.08] bg-card/40 p-6">
            <h3 className="text-sm font-semibold text-white">Ações futuras</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Forçar reset de senha", "Exigir 2FA", "Logs de acesso", "Auditoria de ações"].map((l) => (
                <Button key={l} type="button" size="sm" variant="secondary" disabled className="opacity-70">
                  {l}
                  <span className="ml-1.5 text-[9px] font-normal text-slate-500">Em breve</span>
                </Button>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Editar nome */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="border-white/[0.08] bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar nome</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Nome completo</Label>
            <Input className="mt-1.5" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveEditedName()} disabled={savingName}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo utilizador MVP */}
      <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
        <DialogContent className="border-white/[0.08] bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo utilizador</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-400">
            <p>
              Nesta versão, crie o utilizador no <strong className="text-slate-200">Supabase Auth</strong> ou envie um
              convite manualmente. Depois, ajuste o perfil e o papel aqui no painel.
            </p>
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-amber-100/90">
              Não utilize a service_role no frontend. Integrações futuras (Edge Function) poderão automatizar o convite.
            </p>
            <div className="grid gap-2 opacity-50">
              <Label>Nome (exemplo)</Label>
              <Input disabled placeholder="Preencher após criar em Auth" />
              <Label>E-mail (exemplo)</Label>
              <Input disabled placeholder="user@empresa.com" />
              <Label>Papel inicial (exemplo)</Label>
              <Input disabled placeholder="viewer" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewUserOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset senha — instruções */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="border-white/[0.08] bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset de senha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-400">
            Para <span className="font-medium text-white">{resetTarget?.full_name}</span> ({resetTarget?.email}):
          </p>
          <ul className="list-inside list-decimal space-y-2 text-sm text-slate-400">
            <li>No Supabase Dashboard → Authentication → Users, localize o utilizador e envie o email de recovery.</li>
            <li>Ou peça ao utilizador para usar “Esqueci a senha” no ecrã de login, se estiver configurado.</li>
          </ul>
          <DialogFooter>
            <Button onClick={() => setResetTarget(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
