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
import { Plus, Trash2, ArrowRightCircle, AlertCircle, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isBefore, startOfDay, format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
}

interface TaskCommentRow {
  id: string;
  content: string;
  created_at: string;
  created_by: string | null;
  profiles: { full_name: string } | null;
}

const priorityColor: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-sky-500/15 text-sky-300 border border-sky-500/25",
  urgent: "bg-destructive text-destructive-foreground",
};

const TERMINAL_STATUSES = new Set(["done", "became_process", "archived"]);

function isTaskLate(task: Task) {
  if (!task.due_date || TERMINAL_STATUSES.has(task.status)) return false;
  return isBefore(new Date(task.due_date), startOfDay(new Date()));
}

function TaskCard({
  task,
  assigneeName,
  onClick,
}: {
  task: Task;
  assigneeName: string | null;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const late = isTaskLate(task);
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={`mb-2 cursor-grab rounded-lg border bg-card p-3 transition-all duration-200 active:cursor-grabbing hover:border-primary/25 hover:shadow-lg ${
        late ? "border-muted border-l-4 border-l-destructive shadow-sm ring-1 ring-destructive/15" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="text-sm font-medium leading-snug">{task.title}</h4>
            {late && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                Atrasada
              </Badge>
            )}
          </div>
          {assigneeName && (
            <p className="text-[11px] text-muted-foreground truncate">
              <span className="font-medium text-foreground/80">Resp.:</span> {assigneeName}
            </p>
          )}
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${priorityColor[task.priority]}`}>
          {labelOf(PRIORITIES, task.priority)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
        <span className="truncate">{labelOf(SECTORS, task.sector)}</span>
        {task.due_date && (
          <span className={`flex items-center gap-1 shrink-0 ${late ? "text-destructive font-semibold" : ""}`}>
            {late && <AlertCircle className="h-3 w-3" />}
            {format(new Date(task.due_date), "dd MMM", { locale: ptBR })}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({ status, label, tasks, assigneeMap, onCardClick }: { status: string; label: string; tasks: Task[]; assigneeMap: Map<string, string>; onCardClick: (t: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-muted/40 rounded-lg p-3 ${isOver ? "ring-2 ring-accent" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="min-h-[100px]">
        {tasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-8 text-center text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground/70 mb-1">Nenhuma tarefa</p>
            <p>Arraste um cartão para cá ou crie uma tarefa com este status.</p>
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              assigneeName={t.assignee_id ? assigneeMap.get(t.assignee_id) ?? null : null}
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
    if (editorSupportAssigneeOnly && user) setFilterAssignee(user.id);
  }, [editorSupportAssigneeOnly, user?.id]);

  const load = async () => {
    const [{ data: t }, { data: s }, { data: p }] = await Promise.all([
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
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
      .select().single();
    if (error) return toast.error(error.message);
    setChecklist([...checklist, data]);
    setNewCheckItem("");
  };
  const toggleCheck = async (i: any) => {
    const { error } = await supabase.from("task_checklist_items").update({ is_done: !i.is_done }).eq("id", i.id);
    if (error) return toast.error(error.message);
    setChecklist(checklist.map((x) => (x.id === i.id ? { ...x, is_done: !x.is_done } : x)));
  };
  const removeCheck = async (id: string) => {
    await supabase.from("task_checklist_items").delete().eq("id", id);
    setChecklist(checklist.filter((x) => x.id !== id));
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
    <div className="space-y-4 max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground text-sm">Kanban de execução.</p>
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

      <Card className="p-3 flex flex-wrap gap-3 items-center">
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
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
          Mostrar arquivadas
        </label>
      </Card>

      {editorSupportAssigneeOnly && (
        <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/30 px-3 py-2">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              {editing ? "Editar tarefa" : "Nova tarefa"}
              {editing?.turned_into_process && <Badge variant="secondary">Virou processo</Badge>}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input id="title" name="title" defaultValue={editing?.title} required maxLength={200} />
            </div>
            <div>
              <Label htmlFor="description">Observações internas</Label>
              <Textarea id="description" name="description" defaultValue={editing?.description ?? ""} rows={4} placeholder="Contexto, links, decisões e notas para a equipa." />
              <p className="text-xs text-muted-foreground mt-1">
                Visível para quem tem acesso à tarefa. Usa o mesmo campo de descrição já existente na base.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Setor</Label>
                <Select name="sector" defaultValue={editing?.sector ?? "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {SECTORS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select name="priority" defaultValue={editing?.priority ?? "medium"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "backlog"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="due_date">Prazo</Label>
                <Input id="due_date" name="due_date" type="date" defaultValue={editing?.due_date ?? ""} />
              </div>
              <div>
                <Label>Sprint</Label>
                <Select name="sprint_id" defaultValue={editing?.sprint_id ?? "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {sprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Select name="assignee_id" defaultValue={editing?.assignee_id ?? "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editing && (
              <div className="border-t border-border pt-3">
                <Label>Checklist</Label>
                <div className="space-y-1.5 mt-2">
                  {checklist.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={i.is_done} onCheckedChange={() => toggleCheck(i)} />
                      <span className={i.is_done ? "line-through text-muted-foreground flex-1" : "flex-1"}>{i.label}</span>
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeCheck(i.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Novo item"
                      value={newCheckItem}
                      onChange={(e) => setNewCheckItem(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheck(); } }}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={addCheck}>+</Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex-wrap gap-2">
              {editing && (editing.status === "done" || editing.status === "review") && !editing.turned_into_process && (
                <Button type="button" variant="outline" onClick={() => setTransformOpen(true)}>
                  <ArrowRightCircle className="h-4 w-4 mr-1" /> Transformar em processo
                </Button>
              )}
              {editing && isAdmin && (
                <Button type="button" variant="ghost" onClick={remove}>
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              )}
              <Button type="submit">{editing ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>

          {editing && (
            <div className="border-t border-border pt-4 mt-2 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-semibold">Comentários</Label>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-md border border-border bg-muted/20 p-3 space-y-3">
                {taskComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum comentário ainda.</p>
                ) : (
                  taskComments.map((c) => (
                    <div key={c.id} className="rounded-md bg-card border border-border/80 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-medium text-foreground">
                          {c.profiles?.full_name ?? "Utilizador"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => void deleteTaskComment(c.id)}
                              aria-label="Excluir comentário"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words text-foreground/90">{c.content}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-task-comment">Novo comentário</Label>
                <Textarea
                  id="new-task-comment"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  rows={3}
                  placeholder="Decisões, dúvidas ou atualizações para a equipa…"
                  className="resize-y"
                />
                <Button type="button" disabled={postingComment} onClick={() => void addTaskComment()}>
                  {postingComment ? "A publicar…" : "Publicar comentário"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={transformOpen} onOpenChange={setTransformOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">Transformar em processo</DialogTitle></DialogHeader>
          <form onSubmit={transformToProcess} className="space-y-3">
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
