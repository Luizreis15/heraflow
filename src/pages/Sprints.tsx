import { useEffect, useState } from "react";
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
import { Plus, Play, Pause, CheckCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Sprints() {
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
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Sprints</h1>
          <p className="text-muted-foreground text-sm">Ciclos de execução da Hera DG.</p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nova sprint
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : sprints.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhuma sprint criada ainda.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints.map((s) => {
            const total = s.tasks?.length ?? 0;
            const done = s.tasks?.filter((t: any) => t.status === "done" || t.status === "became_process").length ?? 0;
            const progress = total ? Math.round((done / total) * 100) : 0;
            return (
              <Card key={s.id} className="p-5 space-y-3 hover:shadow-[var(--shadow-soft)] transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-lg leading-snug">{s.name}</h3>
                  <Badge variant={s.status === "active" ? "default" : "secondary"}>
                    {labelOf(SPRINT_STATUSES, s.status)}
                  </Badge>
                </div>
                {s.objective && <p className="text-sm text-muted-foreground line-clamp-2">{s.objective}</p>}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{done}/{total} tarefas</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {(s.start_date || s.end_date) && (
                  <div className="text-xs text-muted-foreground">
                    {s.start_date && format(new Date(s.start_date), "dd MMM", { locale: ptBR })}
                    {" — "}
                    {s.end_date && format(new Date(s.end_date), "dd MMM yyyy", { locale: ptBR })}
                  </div>
                )}
                {canManage && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {s.status !== "active" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "active")}>
                        <Play className="h-3.5 w-3.5 mr-1" /> Ativar
                      </Button>
                    )}
                    {s.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "paused")}>
                        <Pause className="h-3.5 w-3.5 mr-1" /> Pausar
                      </Button>
                    )}
                    {s.status !== "completed" && (
                      <Button size="sm" variant="outline" onClick={() => setStatus(s.id, "completed")}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Concluir
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }}>
                      Editar
                    </Button>
                    {isAdmin && (
                      <Button size="sm" variant="ghost" onClick={() => remove(s.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{editing ? "Editar sprint" : "Nova sprint"}</DialogTitle>
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
                  {SPRINT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
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
