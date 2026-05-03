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
import { Plus, Trash2, ArrowRightCircle, AlertCircle } from "lucide-react";
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

const priorityColor: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary text-secondary-foreground",
  high: "bg-accent/30 text-brown",
  urgent: "bg-destructive text-destructive-foreground",
};

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const late = task.due_date && task.status !== "done" && isBefore(new Date(task.due_date), startOfDay(new Date()));
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="bg-card border border-border rounded-lg p-3 mb-2 cursor-grab active:cursor-grabbing hover:shadow-[var(--shadow-card)] transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-medium leading-snug">{task.title}</h4>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityColor[task.priority]}`}>
          {labelOf(PRIORITIES, task.priority)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{labelOf(SECTORS, task.sector)}</span>
        {task.due_date && (
          <span className={`flex items-center gap-1 ${late ? "text-destructive font-medium" : ""}`}>
            {late && <AlertCircle className="h-3 w-3" />}
            {format(new Date(task.due_date), "dd MMM", { locale: ptBR })}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({ status, label, tasks, onCardClick }: { status: string; label: string; tasks: Task[]; onCardClick: (t: Task) => void }) {
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
        {tasks.map((t) => <TaskCard key={t.id} task={t} onClick={() => onCardClick(t)} />)}
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user, isAdmin } = useAuth();
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
  const [showArchived, setShowArchived] = useState(false);
  const [transformOpen, setTransformOpen] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    document.title = "Tarefas — Hera DG OS";
    void load();
  }, []);

  useEffect(() => {
    if (search.get("new") === "1") {
      setEditing(null);
      setOpen(true);
    }
  }, [search]);

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

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!showArchived && t.status === "archived") return false;
      if (filterSector !== "all" && t.sector !== filterSector) return false;
      if (filterAssignee !== "all" && t.assignee_id !== filterAssignee) return false;
      return true;
    });
  }, [tasks, filterSector, filterAssignee, showArchived]);

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
    const t = tasks.find((x) => x.id === id);
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
    await loadChecklist(t.id);
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
    void load();
  };

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl">Tarefas</h1>
          <p className="text-muted-foreground text-sm">Kanban de execução.</p>
        </div>
        <Button onClick={() => { setEditing(null); setChecklist([]); setOpen(true); }}>
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
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os responsáveis</SelectItem>
            {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(!!v)} />
          Mostrar arquivadas
        </label>
      </Card>

      <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((c) => (
            <Column key={c.value} status={c.value} label={c.label} tasks={grouped[c.value] ?? []} onCardClick={openEdit} />
          ))}
        </div>
        <DragOverlay>
          {activeId && (() => {
            const t = tasks.find((x) => x.id === activeId);
            return t ? <TaskCard task={t} onClick={() => {}} /> : null;
          })()}
        </DragOverlay>
      </DndContext>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setChecklist([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
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
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" name="description" defaultValue={editing?.description ?? ""} rows={3} />
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
        </DialogContent>
      </Dialog>

      <Dialog open={transformOpen} onOpenChange={setTransformOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">Transformar em processo</DialogTitle></DialogHeader>
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
