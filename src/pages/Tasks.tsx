import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext, DragEndEvent, DragOverlay, PointerSensor, useDraggable, useDroppable,
  useSensor, useSensors,
} from "@dnd-kit/core";
import {
  TASK_STATUSES, PRIORITIES, SECTORS, labelOf,
} from "@/lib/enums";
import {
  Plus,
  Trash2,
  ArrowRightCircle,
  AlertCircle,
  MessageSquare,
  CalendarDays,
  User,
  ListChecks,
  KanbanSquare,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isBefore, startOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const COLUMNS = TASK_STATUSES.filter((s) => s.value !== "archived");

interface Task {
  id: string;
  title: string;
  description: string | null;
  sector: string | null;
  priority: string;
  status: string;
  sprint_id: string | null;
  assignee_id: string | null;
  due_date: string | null;
  created_by: string | null;
  turned_into_process: boolean;
  process_id: string | null;
  task_checklist_items?: { id: string; is_done: boolean }[] | null;
}

interface TaskCommentRow {
  id: string;
  content: string;
  created_at: string;
  created_by: string | null;
  profiles: { full_name: string } | null;
}

function checklistStats(task: Task) {
  const raw = task.task_checklist_items;
  const items = Array.isArray(raw) ? raw : [];
  if (items.length === 0) return null;
  const done = items.filter((i) => i.is_done).length;
  return { done, total: items.length };
}

const TERMINAL_STATUSES = new Set(["done", "became_process", "archived"]);

function isTaskLate(task: Task) {
  if (!task.due_date || TERMINAL_STATUSES.has(task.status)) return false;
  return isBefore(new Date(task.due_date), startOfDay(new Date()));
}

function TaskCard({
  task,
  assigneeName,
  sprintName,
  onClick,
}: {
  task: Task;
  assigneeName: string | null;
  sprintName: string | null;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const late = isTaskLate(task);
  const chk = checklistStats(task);
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.45 : 1 }}
      className={cn(
        "group mb-2.5 cursor-grab rounded-xl border bg-gradient-to-b from-card to-[hsl(218_44%_8%)] p-3.5 shadow-sm transition-all duration-200 active:cursor-grabbing",
        "hover:border-primary/35 hover:shadow-[0_8px_28px_-12px_hsl(199_89%_48%/0.25)]",
        late
          ? "border-destructive/35 border-l-[3px] border-l-destructive ring-1 ring-destructive/15"
          : "border-white/[0.08]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start gap-1.5">
            <h4 className="text-[15px] font-semibold leading-snug tracking-tight text-white">{task.title}</h4>
            {late && (
              <Badge variant="destructive" className="h-5 shrink-0 px-1.5 py-0 text-[10px]">
                Atrasada
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] font-semibold normal-case">
              {labelOf(PRIORITIES, task.priority)}
            </Badge>
            {sprintName && (
              <span className="inline-flex max-w-[10rem] items-center gap-1 truncate rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <KanbanSquare className="h-3 w-3 shrink-0 opacity-80" />
                {sprintName}
              </span>
            )}
            {chk && (
              <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/25 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                <ListChecks className="h-3 w-3 text-slate-500" />
                {chk.done}/{chk.total}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {assigneeName ? (
              <span className="flex min-w-0 items-center gap-1 truncate">
                <User className="h-3 w-3 shrink-0 text-slate-600" />
                <span className="truncate text-slate-400">
                  <span className="font-medium text-slate-300">Resp.</span> {assigneeName}
                </span>
              </span>
            ) : (
              <span className="text-slate-600">Sem responsável</span>
            )}
            <span className="flex items-center gap-1 truncate text-slate-600">
              <ClipboardList className="h-3 w-3 shrink-0" />
              <span className="truncate">{labelOf(SECTORS, task.sector)}</span>
            </span>
          </div>
        </div>
      </div>
      {task.due_date && (
        <div
          className={cn(
            "mt-2.5 flex items-center justify-end gap-1 border-t border-white/[0.06] pt-2 text-xs tabular-nums",
            late ? "font-semibold text-destructive" : "text-slate-500",
          )}
        >
          {late && <AlertCircle className="h-3.5 w-3.5" />}
          <CalendarDays className="h-3.5 w-3.5 opacity-70" />
          {format(new Date(task.due_date), "dd MMM yyyy", { locale: ptBR })}
        </div>
      )}
    </div>
  );
}

function Column({
  status,
  label,
  tasks,
  assigneeMap,
  sprintMap,
  onCardClick,
}: {
  status: string;
  label: string;
  tasks: Task[];
  assigneeMap: Map<string, string>;
  sprintMap: Map<string, string>;
  onCardClick: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-80 flex-shrink-0 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[hsl(218_44%_9%/0.55)] to-[hsl(222_47%_6%/0.85)] p-3 shadow-inner transition-shadow duration-200",
        isOver && "ring-2 ring-primary/45 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="mb-3 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="min-w-0 text-[11px] font-extrabold uppercase leading-tight tracking-[0.12em] text-white">
            {label}
          </h3>
          <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 px-2 text-xs font-bold tabular-nums text-primary">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="min-h-[120px]">
        {tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-black/25 px-3 py-10 text-center">
            <KanbanSquare className="mx-auto mb-2 h-8 w-8 text-slate-600 opacity-80" />
            <p className="text-xs font-semibold text-slate-400">Coluna vazia</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Arraste uma tarefa para aqui ou altere o status no cartão para organizar o fluxo diário.
            </p>
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              assigneeName={t.assignee_id ? assigneeMap.get(t.assignee_id) ?? null : null}
              sprintName={t.sprint_id ? sprintMap.get(t.sprint_id) ?? null : null}
              onClick={() => onCardClick(t)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user, isAdmin, hasRole } = useAuth();
  const [search] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterSprint, setFilterSprint] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [transformOpen, setTransformOpen] = useState(false);
  const [taskComments, setTaskComments] = useState<TaskCommentRow[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const editorSupportAssigneeOnly =
    !!user &&
    hasRole("editor_support") &&
    !hasRole(["admin", "operation", "commercial"]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    document.title = "Tarefas — Hera DG OS";
    void load();
  }, []);

  useEffect(() => {
    if (search.get("new") === "1") {
      setEditing(null);
      setTaskComments([]);
      setNewCommentText("");
      setOpen(true);
    }
  }, [search]);

  useEffect(() => {
    const sprintId = search.get("sprint");
    if (!sprintId) return;
    if (sprints.length > 0 && sprints.some((s) => s.id === sprintId)) {
      setFilterSprint(sprintId);
    }
  }, [search, sprints]);

  useEffect(() => {
    if (editorSupportAssigneeOnly && user) setFilterAssignee(user.id);
  }, [editorSupportAssigneeOnly, user?.id]);

  const load = async () => {
    const [{ data: t }, { data: s }, { data: p }] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, task_checklist_items(id, is_done)")
        .order("created_at", { ascending: false }),
      supabase.from("sprints").select("id, name").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("is_active", true),
    ]);
    setTasks((t ?? []) as Task[]);
    setSprints(s ?? []);
    setProfiles(p ?? []);
  };

  const loadChecklist = async (taskId: string) => {
    const { data } = await supabase.from("task_checklist_items").select("*").eq("task_id", taskId).order("position");
    setChecklist(data ?? []);
  };

  const loadComments = async (taskId: string) => {
    const { data, error } = await supabase
      .from("comments")
      .select("id, content, created_at, created_by, profiles(full_name)")
      .eq("entity_type", "task")
      .eq("entity_id", taskId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setTaskComments([]);
      return;
    }
    setTaskComments((data ?? []) as TaskCommentRow[]);
  };

  const addTaskComment = async () => {
    if (!editing || !user) return;
    const text = newCommentText.trim();
    if (!text) return toast.error("Escreva um comentário");
    setPostingComment(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({
        entity_type: "task",
        entity_id: editing.id,
        content: text,
        created_by: user.id,
      })
      .select("id, content, created_at, created_by, profiles(full_name)")
      .single();
    setPostingComment(false);
    if (error) return toast.error(error.message);
    setNewCommentText("");
    if (data) setTaskComments((prev) => [...prev, data as TaskCommentRow]);
    else void loadComments(editing.id);
  };

  const deleteTaskComment = async (commentId: string) => {
    if (!isAdmin) return;
    if (!confirm("Excluir este comentário?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) return toast.error(error.message);
    setTaskComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const assigneeMap = useMemo(() => new Map(profiles.map((p) => [p.id, p.full_name] as const)), [profiles]);

  const sprintMap = useMemo(() => new Map(sprints.map((sp) => [sp.id, sp.name] as const)), [sprints]);

  const visibleTasks = useMemo(() => {
    if (!editorSupportAssigneeOnly || !user) return tasks;
    return tasks.filter((t) => t.assignee_id === user.id);
  }, [tasks, editorSupportAssigneeOnly, user]);

  const filtered = useMemo(() => {
    return visibleTasks.filter((t) => {
      if (!showArchived && t.status === "archived") return false;
      if (filterSector !== "all" && t.sector !== filterSector) return false;
      if (filterAssignee !== "all" && t.assignee_id !== filterAssignee) return false;
      if (filterSprint === "none" && t.sprint_id != null) return false;
      if (filterSprint !== "all" && filterSprint !== "none" && t.sprint_id !== filterSprint) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [visibleTasks, filterSector, filterAssignee, filterSprint, filterPriority, showArchived]);

  const lateCount = useMemo(() => visibleTasks.filter(isTaskLate).length, [visibleTasks]);

  const grouped = useMemo(() => {
    const g: Record<string, Task[]> = {};
    COLUMNS.forEach((c) => (g[c.value] = []));
    filtered.forEach((t) => {
      if (g[t.status]) g[t.status].push(t);
    });
    return g;
  }, [filtered]);

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const newStatus = String(e.over.id);
    const t = visibleTasks.find((x) => x.id === id);
    if (!t || t.status === newStatus) return;
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, status: newStatus } : x)));
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast.error(error.message);
      void load();
    }
  };

  const openEdit = async (t: Task) => {
    setEditing(t);
    setOpen(true);
    setNewCommentText("");
    await Promise.all([loadChecklist(t.id), loadComments(t.id)]);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      title: String(f.get("title") || "").trim(),
      description: String(f.get("description") || "") || null,
      sector: f.get("sector") || null,
      priority: f.get("priority") || "medium",
      status: f.get("status") || "backlog",
      sprint_id: (f.get("sprint_id") as string) || null,
      assignee_id: (f.get("assignee_id") as string) || null,
      due_date: f.get("due_date") || null,
    };
    if (payload.sector === "none") payload.sector = null;
    if (payload.sprint_id === "none") payload.sprint_id = null;
    if (payload.assignee_id === "none") payload.assignee_id = null;
    if (!payload.title) return toast.error("Informe o título");

    if (editing) {
      const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Tarefa atualizada");
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("tasks").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Tarefa criada");
    }
    setOpen(false);
    setEditing(null);
    setChecklist([]);
    setTaskComments([]);
    setNewCommentText("");
    void load();
  };

  const addCheck = async () => {
    if (!editing || !newCheckItem.trim()) return;
    const { data, error } = await supabase
      .from("task_checklist_items")
      .insert({ task_id: editing.id, label: newCheckItem.trim(), position: checklist.length })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setChecklist([...checklist, data]);
    setNewCheckItem("");
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editing.id
          ? { ...t, task_checklist_items: [...(t.task_checklist_items ?? []), { id: data.id, is_done: !!data.is_done }] }
          : t,
      ),
    );
  };
  const toggleCheck = async (i: any) => {
    const { error } = await supabase.from("task_checklist_items").update({ is_done: !i.is_done }).eq("id", i.id);
    if (error) return toast.error(error.message);
    setChecklist(checklist.map((x) => (x.id === i.id ? { ...x, is_done: !x.is_done } : x)));
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== editing?.id) return t;
        const items = t.task_checklist_items ?? [];
        return {
          ...t,
          task_checklist_items: items.map((row) => (row.id === i.id ? { ...row, is_done: !row.is_done } : row)),
        };
      }),
    );
  };
  const removeCheck = async (id: string) => {
    await supabase.from("task_checklist_items").delete().eq("id", id);
    setChecklist(checklist.filter((x) => x.id !== id));
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== editing?.id) return t;
        const items = t.task_checklist_items ?? [];
        return { ...t, task_checklist_items: items.filter((row) => row.id !== id) };
      }),
    );
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir esta tarefa?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setOpen(false);
    setEditing(null);
    setTaskComments([]);
    setNewCommentText("");
    void load();
  };

  const transformToProcess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const f = new FormData(e.currentTarget);
    const { data: process, error } = await supabase
      .from("processes")
      .insert({
        name: String(f.get("name") || editing.title),
        sector: editing.sector,
        objective: String(f.get("objective") || "") || null,
        steps: String(f.get("steps") || "") || null,
        source_task_id: editing.id,
        status: "draft",
        created_by: user?.id,
      })
      .select().single();
    if (error || !process) return toast.error(error?.message ?? "Erro");
    await supabase
      .from("tasks")
      .update({ status: "became_process", turned_into_process: true, process_id: process.id })
      .eq("id", editing.id);
    toast.success("Processo criado a partir da tarefa");
    setTransformOpen(false);
    setOpen(false);
    setEditing(null);
    setTaskComments([]);
    setNewCommentText("");
    void load();
  };

  return (
    <div className="max-w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Operação diária</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Tarefas</h1>
          <p className="mt-1 text-sm text-slate-400">Centro operacional — Kanban da Hera DG.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setChecklist([]);
            setTaskComments([]);
            setNewCommentText("");
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nova tarefa
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 border-border/70 bg-card/40 p-4">
        <Select value={filterSector} onValueChange={setFilterSector}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {SECTORS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee} disabled={editorSupportAssigneeOnly}>
          <SelectTrigger className="w-48 min-w-[12rem]"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSprint} onValueChange={setFilterSprint}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Sprint" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as sprints</SelectItem>
            <SelectItem value="none">Sem sprint</SelectItem>
            {sprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as prioridades</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400 transition-colors hover:text-slate-300">
          <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
          Mostrar arquivadas
        </label>
      </Card>

      {editorSupportAssigneeOnly && (
        <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs text-slate-400">
          Modo apoio: a lista mostra apenas tarefas em que você é o responsável (alinhado ao acesso da equipa).
        </p>
      )}

      {lateCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-destructive font-medium">
            {lateCount} {lateCount === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
          </span>
          <span className="text-muted-foreground">— prazo anterior a hoje e ainda não concluída.</span>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((c) => (
            <Column
              key={c.value}
              status={c.value}
              label={c.label}
              tasks={grouped[c.value] ?? []}
              assigneeMap={assigneeMap}
              sprintMap={sprintMap}
              onCardClick={openEdit}
            />
          ))}
        </div>
        <DragOverlay>
          {activeId && (() => {
            const t = visibleTasks.find((x) => x.id === activeId);
            return t ? (
              <TaskCard
                task={t}
                assigneeName={t.assignee_id ? assigneeMap.get(t.assignee_id) ?? null : null}
                sprintName={t.sprint_id ? sprintMap.get(t.sprint_id) ?? null : null}
                onClick={() => {}}
              />
            ) : null;
          })()}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditing(null);
            setChecklist([]);
            setTaskComments([]);
            setNewCommentText("");
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto p-0 sm:rounded-xl">
          <div className="border-b border-white/10 bg-black/30 px-6 py-5">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-white">
                {editing ? "Editar tarefa" : "Nova tarefa"}
                {editing?.turned_into_process && (
                  <Badge variant="secondary" className="font-semibold normal-case">
                    Virou processo
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                {editing ? "Atualize o contexto operacional e comunique à equipa nos comentários." : "Defina responsável, sprint e prioridade para entrar no fluxo diário."}
              </p>
            </DialogHeader>
          </div>

          <div className="space-y-0 px-6 py-5">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Informação principal</p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título *</Label>
                    <Input id="title" name="title" defaultValue={editing?.title} required maxLength={200} className="mt-1.5" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Setor</Label>
                      <Select name="sector" defaultValue={editing?.sector ?? "none"}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {SECTORS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Prioridade</Label>
                      <Select name="priority" defaultValue={editing?.priority ?? "medium"}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select name="status" defaultValue={editing?.status ?? "backlog"}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="due_date">Prazo</Label>
                      <Input id="due_date" name="due_date" type="date" defaultValue={editing?.due_date ?? ""} className="mt-1.5" />
                    </div>
                    <div>
                      <Label>Sprint</Label>
                      <Select name="sprint_id" defaultValue={editing?.sprint_id ?? "none"}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {sprints.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Responsável</Label>
                      <Select name="assignee_id" defaultValue={editing?.assignee_id ?? "none"}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Observações internas</p>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editing?.description ?? ""}
                  rows={4}
                  placeholder="Contexto, links, decisões e notas para a equipa."
                  className="min-h-[100px] resize-y"
                />
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Visível para quem tem acesso à tarefa. Mesmo campo de descrição na base de dados.
                </p>
              </div>

              {editing && (
                <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Checklist</p>
                    {checklist.length > 0 && (
                      <span className="text-[11px] font-medium tabular-nums text-slate-400">
                        {checklist.filter((i) => i.is_done).length}/{checklist.length} feitos
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {checklist.map((i) => (
                      <div
                        key={i.id}
                        className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-card/40 px-2 py-2 text-sm"
                      >
                        <Checkbox checked={i.is_done} onCheckedChange={() => toggleCheck(i)} />
                        <span className={cn("flex-1", i.is_done && "text-muted-foreground line-through")}>{i.label}</span>
                        <Button type="button" size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" onClick={() => removeCheck(i.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="Novo item de checklist"
                        value={newCheckItem}
                        onChange={(e) => setNewCheckItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void addCheck();
                          }
                        }}
                      />
                      <Button type="button" size="sm" variant="outline" onClick={() => void addCheck()}>
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Separator className="bg-white/10" />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {editing && (editing.status === "done" || editing.status === "review") && !editing.turned_into_process && (
                    <Button type="button" variant="outline" className="border-primary/30 text-primary" onClick={() => setTransformOpen(true)}>
                      <ArrowRightCircle className="h-4 w-4 mr-1" /> Transformar em processo
                    </Button>
                  )}
                  {editing && isAdmin && (
                    <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={remove}>
                      <Trash2 className="h-4 w-4 mr-1" /> Excluir
                    </Button>
                  )}
                </div>
                <Button type="submit" className="sm:min-w-[120px]">
                  {editing ? "Salvar alterações" : "Criar tarefa"}
                </Button>
              </div>
            </form>

            {editing && (
              <>
                <Separator className="my-6 bg-white/10" />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Comentários da equipa</p>
                      <p className="text-[11px] text-slate-500">Linha do tempo visível para quem tem acesso à tarefa.</p>
                    </div>
                  </div>

                  <div className="max-h-60 space-y-3 overflow-y-auto rounded-xl border border-white/[0.08] bg-black/35 p-3">
                    {taskComments.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-500">Nenhum comentário ainda — abra o diálogo com a equipa aqui.</p>
                    ) : (
                      taskComments.map((c) => {
                        const profile = c.profiles as { full_name: string } | { full_name: string }[] | null | undefined;
                        const author = Array.isArray(profile) ? profile[0]?.full_name : profile?.full_name;
                        return (
                          <div
                            key={c.id}
                            className="rounded-xl border border-white/[0.07] bg-gradient-to-b from-card/90 to-[hsl(218_44%_8%/0.9)] p-3.5 shadow-sm"
                          >
                            <div className="mb-2 flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
                              <span className="text-sm font-semibold text-white">{author ?? "Utilizador"}</span>
                              <div className="flex items-center gap-1">
                                <time
                                  className="text-[11px] font-medium tabular-nums text-slate-400"
                                  dateTime={c.created_at}
                                >
                                  {format(new Date(c.created_at), "dd MMM yyyy · HH:mm", { locale: ptBR })}
                                </time>
                                {isAdmin && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-500 hover:text-destructive"
                                    onClick={() => void deleteTaskComment(c.id)}
                                    aria-label="Excluir comentário"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-200">{c.content}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
                    <Label htmlFor="new-task-comment" className="text-slate-300">
                      Novo comentário
                    </Label>
                    <Textarea
                      id="new-task-comment"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      rows={4}
                      placeholder="Decisões, dúvidas ou atualizações para a equipa…"
                      className="mt-2 min-h-[100px] resize-y border-white/10 bg-black/30"
                    />
                    <Button type="button" className="mt-3" disabled={postingComment} onClick={() => void addTaskComment()}>
                      {postingComment ? "Publicando…" : "Publicar comentário"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={transformOpen} onOpenChange={setTransformOpen}>
        <DialogContent className="max-w-lg border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-white">Transformar em processo</DialogTitle>
            <p className="text-xs text-slate-500">Cria um rascunho de processo ligado a esta tarefa.</p>
          </DialogHeader>
          <form onSubmit={transformToProcess} className="space-y-4">
            <div>
              <Label htmlFor="p-name">Nome do processo</Label>
              <Input id="p-name" name="name" defaultValue={editing?.title} required />
            </div>
            <div>
              <Label htmlFor="p-obj">Objetivo</Label>
              <Textarea id="p-obj" name="objective" rows={2} />
            </div>
            <div>
              <Label htmlFor="p-steps">Passo a passo</Label>
              <Textarea id="p-steps" name="steps" rows={4} placeholder="1. ...&#10;2. ..." />
            </div>
            <DialogFooter>
              <Button type="submit">Criar processo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
