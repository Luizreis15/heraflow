import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPRINT_STATUSES, labelOf } from "@/lib/enums";
import { Plus, Play, Pause, CheckCircle, Trash2, KanbanSquare, CalendarRange, ChevronRight, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

function sprintStatusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "border-primary/55 bg-primary/15 text-primary shadow-[0_0_24px_-10px_hsl(199_89%_48%/0.45)]";
    case "planned":
      return "border-white/15 bg-black/25 text-slate-300";
    case "paused":
      return "border-slate-500/45 bg-slate-500/10 text-slate-300";
    case "completed":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-400";
    case "cancelled":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    default:
      return "border-white/10 bg-muted/30 text-slate-400";
  }
}

export default function Sprints() {
  const navigate = useNavigate();
  const { user, isAdmin, hasRole } = useAuth();
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.title = "Sprints — Hera DG OS";
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sprints")
      .select("*, tasks:tasks(id, status)")
      .order("created_at", { ascending: false });
    setSprints(data ?? []);
    setLoading(false);
  };

  const orderedSprints = useMemo(() => {
    const list = [...sprints];
    const ai = list.findIndex((s) => s.status === "active");
    if (ai > 0) {
      const [a] = list.splice(ai, 1);
      list.unshift(a);
    }
    return list;
  }, [sprints]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      name: String(f.get("name") || "").trim(),
      objective: String(f.get("objective") || "") || null,
      description: String(f.get("description") || "") || null,
      start_date: f.get("start_date") || null,
      end_date: f.get("end_date") || null,
      status: f.get("status") || "planned",
    };
    if (!payload.name) return toast.error("Informe o nome");
    if (editing) {
      const { error } = await supabase.from("sprints").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Sprint atualizada");
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("sprints").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Sprint criada");
    }
    setOpen(false);
    setEditing(null);
    void load();
  };

  const setStatus = async (id: string, status: string) => {
    if (status === "active") {
      const others = sprints.filter((s) => s.status === "active" && s.id !== id);
      if (others.length) {
        if (!confirm(`Já existe sprint ativa (${others[0].name}). Pausá-la?`)) return;
        await supabase.from("sprints").update({ status: "paused" }).in("id", others.map((s) => s.id));
      }
    }
    const { error } = await supabase.from("sprints").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta sprint?")) return;
    const { error } = await supabase.from("sprints").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void load();
  };

  const canManage = hasRole(["admin", "operation"]);

  return (
    <div className="max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Execução</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Sprints</h1>
          <p className="mt-1 text-sm text-slate-400">Ciclos de execução da Hera DG — uma sprint ativa por vez.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="shrink-0 gap-1">
            <Plus className="h-4 w-4" /> Nova sprint
          </Button>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-card/50 py-16 text-center text-sm text-slate-400">
          Carregando sprints…
        </div>
      ) : sprints.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-muted/5 px-6 py-14 text-center">
          <div className="mx-auto max-w-md space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground">Nenhuma sprint ainda</p>
            <p className="text-sm text-slate-400">
              Crie a Sprint 1 (ou a primeira sprint da equipa) para concentrar tarefas e acompanhar progresso.
            </p>
            {canManage ? (
              <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-1">
                <Plus className="h-4 w-4" /> Criar primeira sprint
              </Button>
            ) : (
              <p className="text-xs text-slate-500">Peça a um Admin ou Operação para criar a primeira sprint.</p>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orderedSprints.map((s) => {
            const total = s.tasks?.length ?? 0;
            const done = s.tasks?.filter((t: any) => t.status === "done" || t.status === "became_process").length ?? 0;
            const progress = total ? Math.round((done / total) * 100) : 0;
            const isActive = s.status === "active";

            return (
              <Card
                key={s.id}
                className={cn(
                  "relative flex flex-col overflow-hidden border-white/[0.06] bg-gradient-to-br from-card to-[hsl(218_44%_7%)] p-5 transition-all duration-200",
                  "shadow-[0_0_0_1px_hsl(199_89%_48%/0.04)] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_40px_-20px_hsl(199_89%_48%/0.25)]",
                  isActive &&
                    "border-primary/40 ring-2 ring-primary/25 ring-offset-2 ring-offset-background hover:border-primary/50",
                )}
              >
                {isActive && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
                  />
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                        </span>
                        Sprint ativa
                      </span>
                    )}
                    <h3 className="text-lg font-bold leading-snug tracking-tight text-white">{s.name}</h3>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 font-semibold normal-case", sprintStatusBadgeClass(s.status))}>
                    {labelOf(SPRINT_STATUSES, s.status)}
                  </Badge>
                </div>

                {s.objective ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-400">{s.objective}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-slate-600">Sem objetivo definido.</p>
                )}

                <div className="mt-4 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium text-slate-400">
                      <KanbanSquare className="h-3.5 w-3.5 text-primary/80" />
                      Tarefas vinculadas
                    </span>
                    <span className="tabular-nums text-sm font-bold text-white">{total}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {done} concluída{done !== 1 ? "s" : ""}
                      {total > 0 ? ` · ${total - done} em aberto` : ""}
                    </span>
                    <span className="tabular-nums font-semibold text-slate-400">{progress}%</span>
                  </div>
                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted/80 ring-1 ring-inset ring-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-sky-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {(s.start_date || s.end_date) && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarRange className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                    <span>
                      {s.start_date && format(new Date(s.start_date), "dd MMM", { locale: ptBR })}
                      {s.start_date && s.end_date ? " — " : ""}
                      {s.end_date && format(new Date(s.end_date), "dd MMM yyyy", { locale: ptBR })}
                    </span>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-4">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="w-full justify-center gap-1 font-semibold"
                    onClick={() => navigate(`/tasks?sprint=${s.id}`)}
                  >
                    <KanbanSquare className="h-4 w-4" />
                    Ver tarefas desta sprint
                    <ChevronRight className="h-4 w-4 opacity-80" />
                  </Button>

                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      {s.status !== "active" && (
                        <Button size="sm" variant="outline" className="flex-1 min-w-[7rem]" onClick={() => setStatus(s.id, "active")}>
                          <Play className="h-3.5 w-3.5 mr-1" /> Ativar
                        </Button>
                      )}
                      {s.status === "active" && (
                        <Button size="sm" variant="outline" className="flex-1 min-w-[7rem]" onClick={() => setStatus(s.id, "paused")}>
                          <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
                        </Button>
                      )}
                      {s.status !== "completed" && (
                        <Button size="sm" variant="outline" className="flex-1 min-w-[7rem]" onClick={() => setStatus(s.id, "completed")}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Concluir
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" className="flex-1 min-w-[6rem]" onClick={() => { setEditing(s); setOpen(true); }}>
                        Editar
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="px-3 text-muted-foreground hover:text-destructive" onClick={() => remove(s.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">{editing ? "Editar sprint" : "Nova sprint"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" defaultValue={editing?.name} required maxLength={120} />
            </div>
            <div>
              <Label htmlFor="objective">Objetivo</Label>
              <Textarea id="objective" name="objective" defaultValue={editing?.objective ?? ""} rows={2} />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" name="description" defaultValue={editing?.description ?? ""} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="start_date">Início</Label>
                <Input id="start_date" name="start_date" type="date" defaultValue={editing?.start_date ?? ""} />
              </div>
              <div>
                <Label htmlFor="end_date">Fim</Label>
                <Input id="end_date" name="end_date" type="date" defaultValue={editing?.end_date ?? ""} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select name="status" defaultValue={editing?.status ?? "planned"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPRINT_STATUSES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">{editing ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
