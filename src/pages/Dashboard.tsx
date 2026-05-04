import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  KanbanSquare,
  Calendar,
  AlertCircle,
  FileText,
  TrendingUp,
  CalendarCheck,
  Send,
  BookOpen,
  ClipboardList,
  ChevronRight,
  Activity,
} from "lucide-react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { labelOf, DIARY_CATEGORIES, LEAD_STATUSES, PRIORITIES } from "@/lib/enums";
import { cn } from "@/lib/utils";

interface Stats {
  openTasks: number;
  todayTasks: number;
  lateTasks: number;
  processes: number;
  pipelineLeads: number;
  diagnosticsScheduled: number;
  proposalsSent: number;
  diaryEntries: number;
}

function assigneeNameFromTask(t: { profiles?: { full_name: string } | { full_name: string }[] | null }) {
  const p = t.profiles;
  if (!p) return null;
  if (Array.isArray(p)) return p[0]?.full_name ?? null;
  return p.full_name ?? null;
}

function isTaskRowLate(t: { due_date?: string | null; status?: string }) {
  const terminal = new Set(["done", "became_process", "archived"]);
  if (!t.due_date || terminal.has(t.status ?? "")) return false;
  return isBefore(new Date(t.due_date), startOfDay(new Date()));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [todayList, setTodayList] = useState<any[]>([]);
  const [recentDiary, setRecentDiary] = useState<any[]>([]);
  const [pipelineByStatus, setPipelineByStatus] = useState<Record<string, number>>({});
  const [hasSprints, setHasSprints] = useState(false);
  const [hasTasks, setHasTasks] = useState(false);
  const [hasLeads, setHasLeads] = useState(false);
  const [hasDiaryEntries, setHasDiaryEntries] = useState(false);

  const todayLabel = useMemo(() => format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: ptBR }), []);

  const opStatus = useMemo(() => {
    if (!stats) return { label: "Carregando…", variant: "neutral" as const };
    if (stats.lateTasks > 0)
      return {
        label: `${stats.lateTasks} tarefa${stats.lateTasks > 1 ? "s" : ""} atrasada${stats.lateTasks > 1 ? "s" : ""}`,
        variant: "warn" as const,
      };
    if (stats.todayTasks > 0)
      return {
        label: `${stats.todayTasks} para hoje`,
        variant: "active" as const,
      };
    return { label: "Operação em curso", variant: "neutral" as const };
  }, [stats]);

  useEffect(() => {
    document.title = "Command Center — Hera DG OS";
    void load();
  }, []);

  const load = async () => {
    const [
      { data: tasks },
      { data: processes },
      { data: leads },
      { data: diary },
      { data: sprint },
      { count: sprintCount },
      { count: taskCount },
      { count: leadCount },
      { count: diaryCount },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select("id, status, due_date, title, priority, assignee_id, profiles!tasks_assignee_id_fkey(full_name)"),
      supabase.from("processes").select("id"),
      supabase.from("leads").select("id, status"),
      supabase
        .from("diary_entries")
        .select("id, title, category, created_at, sprints!diary_entries_sprint_id_fkey(id, name)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("sprints").select("*").eq("status", "active").maybeSingle(),
      supabase.from("sprints").select("id", { count: "exact", head: true }),
      supabase.from("tasks").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("diary_entries").select("id", { count: "exact", head: true }),
    ]);

    setHasSprints((sprintCount ?? 0) > 0);
    setHasTasks((taskCount ?? 0) > 0);
    setHasLeads((leadCount ?? 0) > 0);
    setHasDiaryEntries((diaryCount ?? 0) > 0);

    const allTasks = tasks ?? [];
    const open = allTasks.filter((t) => !["done", "archived", "became_process"].includes(t.status));
    const todayTasks = open.filter((t) => t.status === "today" || (t.due_date && isToday(new Date(t.due_date))));
    const lateTasks = open.filter((t) => t.due_date && isBefore(new Date(t.due_date), startOfDay(new Date())));

    const pipeline: Record<string, number> = {};
    (leads ?? []).forEach((l) => {
      pipeline[l.status] = (pipeline[l.status] ?? 0) + 1;
    });

    setStats({
      openTasks: open.length,
      todayTasks: todayTasks.length,
      lateTasks: lateTasks.length,
      processes: processes?.length ?? 0,
      pipelineLeads: (leads ?? []).filter((l) => !["won", "lost"].includes(l.status)).length,
      diagnosticsScheduled: pipeline["diagnosis_scheduled"] ?? 0,
      proposalsSent: pipeline["proposal_sent"] ?? 0,
      diaryEntries: diary?.length ?? 0,
    });
    setActiveSprint(sprint);
    setTodayList(todayTasks.slice(0, 8));
    setRecentDiary(diary ?? []);
    setPipelineByStatus(pipeline);

    if (sprint) {
      const { data: sprintTasks } = await supabase
        .from("tasks")
        .select("status")
        .eq("sprint_id", sprint.id);
      const total = sprintTasks?.length ?? 0;
      const done = sprintTasks?.filter((t) => t.status === "done" || t.status === "became_process").length ?? 0;
      const progress = total ? Math.round((done / total) * 100) : 0;
      setActiveSprint({ ...sprint, computed_progress: progress, total_tasks: total, done_tasks: done });
    }
  };

  const cards = [
    { label: "Tarefas abertas", value: stats?.openTasks, icon: KanbanSquare, to: "/tasks" },
    { label: "Para hoje", value: stats?.todayTasks, icon: Calendar, to: "/tasks", accent: true },
    { label: "Atrasadas", value: stats?.lateTasks, icon: AlertCircle, to: "/tasks", warn: true },
    { label: "Processos", value: stats?.processes, icon: FileText, to: "/processes" },
    { label: "Leads no pipeline", value: stats?.pipelineLeads, icon: TrendingUp, to: "/commercial" },
    { label: "Diagnósticos agendados", value: stats?.diagnosticsScheduled, icon: CalendarCheck, to: "/commercial" },
    { label: "Propostas enviadas", value: stats?.proposalsSent, icon: Send, to: "/commercial" },
    { label: "Aprendizados", value: stats?.diaryEntries, icon: BookOpen, to: "/diary" },
  ];

  const pipelineFunnel = LEAD_STATUSES.filter((s) => !["won", "lost"].includes(s.value));
  const closedWon = pipelineByStatus["won"] ?? 0;
  const closedLost = pipelineByStatus["lost"] ?? 0;

  return (
    <div className="max-w-7xl space-y-8">
      {/* Command Center hero */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-card via-card to-[hsl(218_44%_7%)]",
          "p-6 shadow-[0_0_0_1px_hsl(199_89%_48%/0.08),0_24px_48px_-28px_rgba(0,0,0,0.65)] sm:p-8",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-96 rounded-full bg-indigo-500/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">HeraFlow</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Command Center</h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Visão operacional da construção da Hera DG — execução, comercial e aprendizagem no mesmo painel.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 border-t border-white/5 pt-6 lg:border-t-0 lg:pt-0 lg:text-right">
            <div className="flex items-center gap-2 text-sm capitalize text-slate-300 lg:ml-auto">
              <Activity className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium">{todayLabel}</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "border font-semibold normal-case lg:ml-auto",
                opStatus.variant === "warn" && "border-destructive/50 bg-destructive/10 text-destructive",
                opStatus.variant === "active" && "border-primary/40 bg-primary/10 text-primary",
                opStatus.variant === "neutral" && "border-white/10 bg-black/20 text-slate-300",
              )}
            >
              {opStatus.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {cards.map((c) => {
          const warn = c.warn && (c.value ?? 0) > 0;
          return (
            <Card
              key={c.label}
              onClick={() => navigate(c.to)}
              className={cn(
                "group cursor-pointer border-white/[0.06] bg-gradient-to-br from-card to-[hsl(218_44%_8%/0.95)] p-4 transition-all duration-200",
                "shadow-[0_0_0_1px_hsl(199_89%_48%/0.04)] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_12px_40px_-16px_hsl(199_89%_48%/0.2)]",
                warn && "border-destructive/35 hover:border-destructive/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{c.label}</div>
                  <div
                    className={cn(
                      "mt-2 text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl",
                      warn && "text-destructive",
                    )}
                  >
                    {c.value ?? "—"}
                  </div>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-black/25 transition-colors group-hover:border-primary/25 group-hover:bg-primary/10",
                    warn && "border-destructive/20 bg-destructive/10 group-hover:border-destructive/40",
                    c.accent && !warn && "group-hover:text-primary",
                  )}
                >
                  <c.icon
                    className={cn(
                      "h-5 w-5 text-slate-400 transition-colors group-hover:text-primary",
                      warn && "text-destructive group-hover:text-destructive",
                      c.accent && !warn && "text-primary",
                    )}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sprint ativa */}
        <Card
          className={cn(
            "border-white/[0.07] bg-gradient-to-br from-card to-[hsl(218_44%_7%)] p-6 lg:col-span-2",
            "shadow-[0_0_0_1px_hsl(199_89%_48%/0.05)]",
          )}
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">Sprint ativa</h2>
              <p className="mt-1 text-xs text-slate-500">Ciclo de execução em foco</p>
            </div>
            {activeSprint && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => navigate("/sprints")}
              >
                Abrir sprint
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {activeSprint ? (
            <div className="space-y-4">
              <div>
                <p className="text-xl font-semibold tracking-tight text-white">{activeSprint.name}</p>
                {activeSprint.objective ? (
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{activeSprint.objective}</p>
                ) : (
                  <p className="mt-2 text-sm italic text-slate-500">Sem objetivo definido nesta sprint.</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-slate-300">
                  {activeSprint.done_tasks ?? 0}/{activeSprint.total_tasks ?? 0} tarefas concluídas
                </span>
                <Badge variant="secondary" className="tabular-nums">
                  {activeSprint.computed_progress ?? 0}%
                </Badge>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted/80 ring-1 ring-inset ring-white/5">
                <div
                  className="h-full bg-gradient-to-r from-primary to-sky-400 transition-all duration-500"
                  style={{ width: `${activeSprint.computed_progress ?? 0}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2 text-center">
              <p className="text-sm text-slate-400">
                {hasSprints
                  ? "Nenhuma sprint ativa. Ative uma sprint para concentrar a equipa num ciclo."
                  : "Ainda não há sprints. Comece pelo primeiro ciclo de execução."}
              </p>
              <Button size="sm" variant="outline" className="border-primary/25" onClick={() => navigate("/sprints")}>
                {hasSprints ? "Gerir sprints" : "Criar primeira sprint"}
              </Button>
            </div>
          )}
        </Card>

        {/* Pipeline comercial */}
        <Card className="border-white/[0.07] bg-gradient-to-b from-card to-[hsl(218_44%_7%)] p-6 shadow-[0_0_0_1px_hsl(199_89%_48%/0.05)]">
          <div className="mb-4">
            <h2 className="text-lg font-bold tracking-tight text-white">Pipeline comercial</h2>
            <p className="mt-1 text-xs text-slate-500">Distribuição por estágio</p>
          </div>

          <ul className="max-h-[min(420px,55vh)] space-y-0 overflow-y-auto pr-1">
            {pipelineFunnel.map((s) => {
              const n = pipelineByStatus[s.value] ?? 0;
              return (
                <li
                  key={s.value}
                  className="flex items-center justify-between gap-3 border-b border-border/40 py-2.5 text-sm last:border-b-0"
                >
                  <span className="min-w-0 flex-1 truncate text-slate-400">{s.label}</span>
                  <span className="shrink-0 tabular-nums text-base font-semibold text-white">{n}</span>
                </li>
              );
            })}
          </ul>

          {(closedWon > 0 || closedLost > 0) && (
            <div className="mt-3 flex gap-3 border-t border-border/50 pt-3 text-xs text-slate-500">
              <span>
                Fechados: <strong className="text-slate-300">{closedWon}</strong> ganhos
              </span>
              <span>
                <strong className="text-slate-300">{closedLost}</strong> perdidos
              </span>
            </div>
          )}

          <div className="mt-5 space-y-2">
            <Button className="w-full gap-1" size="sm" onClick={() => navigate("/commercial")}>
              Abrir comercial
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" className="w-full" size="sm" onClick={() => navigate("/commercial?new=1")}>
              + Novo lead
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tarefas do dia */}
        <Card className="border-white/[0.07] bg-gradient-to-br from-card to-[hsl(218_44%_7%)] p-6 shadow-[0_0_0_1px_hsl(199_89%_48%/0.05)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              <ClipboardList className="h-5 w-5 text-primary" />
              Tarefas do dia
            </h2>
            <Button size="sm" variant="ghost" className="text-primary hover:text-primary" onClick={() => navigate("/tasks")}>
              Ver tarefas
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {todayList.length === 0 ? (
            <div className="space-y-4 py-2 text-center text-sm">
              <p className="text-slate-400">Nenhuma tarefa marcada para hoje ou com prazo para hoje.</p>
              {!hasTasks && (
                <Button size="sm" variant="outline" className="border-primary/25" onClick={() => navigate("/tasks?new=1")}>
                  Criar primeira tarefa
                </Button>
              )}
              {hasTasks && (
                <Button size="sm" variant="outline" onClick={() => navigate("/tasks")}>
                  Ir ao Kanban
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {todayList.map((t) => {
                const late = isTaskRowLate(t);
                const assignee = assigneeNameFromTask(t);
                return (
                  <li
                    key={t.id}
                    onClick={() => navigate("/tasks")}
                    className="flex cursor-pointer flex-col gap-2 rounded-xl border border-transparent bg-black/10 px-3 py-3 text-sm transition-all hover:border-primary/25 hover:bg-muted/25"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 font-medium leading-snug text-foreground">{t.title}</span>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                        {late && (
                          <Badge variant="destructive" className="text-[10px]">
                            Atrasada
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] font-medium normal-case">
                          {labelOf(PRIORITIES, t.priority)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {assignee ? (
                        <span>
                          <span className="text-slate-600">Resp.</span>{" "}
                          <span className="font-medium text-slate-300">{assignee}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">Sem responsável</span>
                      )}
                      {t.due_date && (
                        <span className="tabular-nums">
                          Prazo: {format(new Date(t.due_date), "dd MMM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Últimos aprendizados */}
        <Card className="border-white/[0.07] bg-gradient-to-br from-card to-[hsl(218_44%_7%)] p-6 shadow-[0_0_0_1px_hsl(199_89%_48%/0.05)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              <BookOpen className="h-5 w-5 text-primary" />
              Últimos aprendizados
            </h2>
            <Button size="sm" variant="ghost" className="text-primary hover:text-primary" onClick={() => navigate("/diary")}>
              Ver diário
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {recentDiary.length === 0 ? (
            <div className="space-y-4 py-2 text-center text-sm">
              <p className="text-slate-400">Sem registros recentes no diário de bordo.</p>
              {!hasDiaryEntries && (
                <Button size="sm" variant="outline" className="border-primary/25" onClick={() => navigate("/diary?new=1")}>
                  Registrar primeiro aprendizado
                </Button>
              )}
              {hasDiaryEntries && (
                <Button size="sm" variant="outline" onClick={() => navigate("/diary")}>
                  Abrir diário
                </Button>
              )}
            </div>
          ) : (
            <>
              <ul className="space-y-2">
                {recentDiary.map((d) => {
                  const sp = d?.sprints;
                  const sprintName =
                    sp && typeof sp === "object" ? (Array.isArray(sp) ? sp[0]?.name : sp.name) : null;
                  const catLabel = d.category ? labelOf(DIARY_CATEGORIES, d.category) : "Sem categoria";
                  return (
                    <li
                      key={d.id}
                      onClick={() => navigate("/diary")}
                      className="cursor-pointer rounded-xl border border-transparent bg-black/10 px-3 py-3 transition-all hover:border-primary/25 hover:bg-muted/25"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-snug text-foreground">{d.title}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {catLabel}
                            </Badge>
                            {sprintName && (
                              <span className="text-[11px] text-slate-500">
                                Sprint: <span className="font-medium text-slate-400">{sprintName}</span>
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs text-slate-500">
                            {format(new Date(d.created_at), "d MMM yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <Button
                variant="outline"
                className="mt-4 w-full border-primary/25"
                size="sm"
                onClick={() => navigate("/diary?new=1")}
              >
                + Registrar aprendizado
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
