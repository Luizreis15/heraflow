import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format, isToday, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { labelOf, DIARY_CATEGORIES } from "@/lib/enums";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [todayList, setTodayList] = useState<any[]>([]);
  const [recentDiary, setRecentDiary] = useState<any[]>([]);
  const [pipelineByStatus, setPipelineByStatus] = useState<Record<string, number>>({});

  useEffect(() => {
    document.title = "Dashboard — Hera DG OS";
    void load();
  }, []);

  const load = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const [
      { data: tasks },
      { data: processes },
      { data: leads },
      { data: diary },
      { data: sprint },
    ] = await Promise.all([
      supabase.from("tasks").select("id, status, due_date, title, priority"),
      supabase.from("processes").select("id"),
      supabase.from("leads").select("id, status"),
      supabase.from("diary_entries").select("id, title, category, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("sprints").select("*").eq("status", "active").maybeSingle(),
    ]);

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

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral da execução da Hera DG.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card
            key={c.label}
            onClick={() => navigate(c.to)}
            className={`p-4 cursor-pointer hover:shadow-[var(--shadow-soft)] transition-shadow ${
              c.warn && (c.value ?? 0) > 0 ? "border-destructive/40" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
                <div className="font-serif text-3xl mt-1">{c.value ?? "—"}</div>
              </div>
              <c.icon className={`h-5 w-5 ${c.warn && (c.value ?? 0) > 0 ? "text-destructive" : c.accent ? "text-accent" : "text-muted-foreground"}`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-serif text-xl mb-1">Sprint ativa</h2>
          {activeSprint ? (
            <>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-medium">{activeSprint.name}</div>
                  {activeSprint.objective && (
                    <p className="text-sm text-muted-foreground mt-1">{activeSprint.objective}</p>
                  )}
                </div>
                <Badge variant="secondary">{activeSprint.computed_progress ?? 0}%</Badge>
              </div>
              <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${activeSprint.computed_progress ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {activeSprint.done_tasks}/{activeSprint.total_tasks} tarefas concluídas
              </p>
            </>
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma sprint ativa.{" "}
              <button onClick={() => navigate("/sprints")} className="text-primary underline">
                Ativar sprint
              </button>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-serif text-xl mb-3">Pipeline comercial</h2>
          {Object.keys(pipelineByStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem leads cadastrados ainda.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {Object.entries(pipelineByStatus).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="font-medium">{v}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-serif text-xl mb-3 flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> Tarefas do dia
          </h2>
          {todayList.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa marcada para hoje.</p>
          ) : (
            <ul className="space-y-2">
              {todayList.map((t) => (
                <li
                  key={t.id}
                  onClick={() => navigate("/tasks")}
                  className="text-sm flex justify-between items-center cursor-pointer hover:bg-muted px-2 py-1.5 rounded-md"
                >
                  <span className="truncate">{t.title}</span>
                  <Badge variant="outline" className="text-xs ml-2 shrink-0">{t.priority}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-serif text-xl mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Últimos aprendizados
          </h2>
          {recentDiary.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada registrado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {recentDiary.map((d) => (
                <li
                  key={d.id}
                  onClick={() => navigate("/diary")}
                  className="text-sm flex justify-between items-center cursor-pointer hover:bg-muted px-2 py-1.5 rounded-md"
                >
                  <div className="truncate">
                    <div className="truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(d.created_at), "dd MMM", { locale: ptBR })}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs ml-2 shrink-0">
                    {labelOf(DIARY_CATEGORIES, d.category)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
