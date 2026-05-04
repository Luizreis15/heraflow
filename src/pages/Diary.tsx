import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DIARY_CATEGORIES, labelOf, SPRINT_STATUSES, TASK_STATUSES, LEAD_STATUSES } from "@/lib/enums";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const DIARY_LIST_SELECT = `
  *,
  sprints!diary_entries_sprint_id_fkey(id, name, status),
  tasks!diary_entries_related_task_id_fkey(id, title, status),
  leads!diary_entries_related_lead_id_fkey(id, clinic_name, status)
`;

export default function Diary() {
  const { user, isAdmin } = useAuth();
  const [search] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => { document.title = "Diário — Hera DG OS"; void load(); }, []);
  useEffect(() => { if (search.get("new") === "1") { setEditing(null); setOpen(true); } }, [search]);

  const load = async () => {
    const [{ data: d }, { data: s }, { data: t }, { data: l }] = await Promise.all([
      supabase.from("diary_entries").select(DIARY_LIST_SELECT).order("created_at", { ascending: false }),
      supabase.from("sprints").select("id, name, status").order("created_at", { ascending: false }),
      supabase.from("tasks").select("id, title, status").order("created_at", { ascending: false }).limit(500),
      supabase.from("leads").select("id, clinic_name, status").order("created_at", { ascending: false }).limit(500),
    ]);
    setItems(d ?? []);
    setSprints(s ?? []);
    setTasks(t ?? []);
    setLeads(l ?? []);
  };

  const filtered = useMemo(() => filterCategory === "all" ? items : items.filter((i) => i.category === filterCategory), [items, filterCategory]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      title: String(f.get("title") || "").trim(),
      category: f.get("category") || null,
      content: String(f.get("content") || "").trim(),
      decision: String(f.get("decision") || "") || null,
      learning: String(f.get("learning") || "") || null,
      impact: String(f.get("impact") || "") || null,
      next_action: String(f.get("next_action") || "") || null,
      sprint_id: (f.get("sprint_id") as string) || null,
      related_task_id: (f.get("related_task_id") as string) || null,
      related_lead_id: (f.get("related_lead_id") as string) || null,
    };
    if (payload.category === "none") payload.category = null;
    if (payload.sprint_id === "none") payload.sprint_id = null;
    if (payload.related_task_id === "none") payload.related_task_id = null;
    if (payload.related_lead_id === "none") payload.related_lead_id = null;
    if (!payload.title || !payload.content) return toast.error("Preencha título e conteúdo");

    if (editing) {
      const { error } = await supabase.from("diary_entries").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("diary_entries").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Salvo");
    setOpen(false); setEditing(null); void load();
  };

  const linkSprint = (d: any) => {
    const row = d?.sprints;
    return row && typeof row === "object" && !Array.isArray(row) ? row : Array.isArray(row) ? row[0] : null;
  };
  const linkTask = (d: any) => {
    const row = d?.tasks;
    return row && typeof row === "object" && !Array.isArray(row) ? row : Array.isArray(row) ? row[0] : null;
  };
  const linkLead = (d: any) => {
    const row = d?.leads;
    return row && typeof row === "object" && !Array.isArray(row) ? row : Array.isArray(row) ? row[0] : null;
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir registro?")) return;
    const { error } = await supabase.from("diary_entries").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setOpen(false); setEditing(null); void load();
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Diário de Bordo</h1>
          <p className="text-sm text-slate-400">Aprendizados, decisões, erros e vitórias.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo registro</Button>
      </div>

      <Card className="border-border/70 p-4">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {DIARY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-border/60 bg-muted/10 p-12 text-center text-slate-400">Nenhum registro ainda.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => {
            const sp = linkSprint(d);
            const tk = linkTask(d);
            const ld = linkLead(d);
            return (
            <Card key={d.id} className="p-5 cursor-pointer transition-all duration-200 hover:border-primary/25 hover:shadow-lg" onClick={() => { setEditing(d); setOpen(true); }}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight">{d.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{d.content}</p>
                  {(sp || tk || ld) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {sp && (
                        <Badge variant="outline" className="text-[10px] font-normal max-w-full truncate" title={sp.name}>
                          Sprint: {sp.name}
                        </Badge>
                      )}
                      {tk && (
                        <Badge variant="outline" className="text-[10px] font-normal max-w-full truncate" title={tk.title}>
                          Tarefa: {tk.title}
                        </Badge>
                      )}
                      {ld && (
                        <Badge variant="outline" className="text-[10px] font-normal max-w-full truncate" title={ld.clinic_name}>
                          Lead: {ld.clinic_name}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {d.category && <Badge variant="secondary">{labelOf(DIARY_CATEGORIES, d.category)}</Badge>}
                  <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" key={editing?.id ?? "new-entry"}>
          <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">{editing ? "Editar registro" : "Novo registro"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div><Label>Título *</Label><Input name="title" defaultValue={editing?.title} required /></div>
            <div>
              <Label>Categoria</Label>
              <Select name="category" defaultValue={editing?.category ?? "none"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {DIARY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 rounded-xl border border-white/[0.08] bg-black/25 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Vínculos (opcional)</p>
              <div className="grid gap-3 sm:grid-cols-1">
                <div>
                  <Label className="text-xs">Sprint vinculada</Label>
                  <Select name="sprint_id" defaultValue={editing?.sprint_id ?? "none"}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum vínculo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum vínculo</SelectItem>
                      {sprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} · {labelOf(SPRINT_STATUSES, s.status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tarefa vinculada</Label>
                  <Select name="related_task_id" defaultValue={editing?.related_task_id ?? "none"}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum vínculo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum vínculo</SelectItem>
                      {tasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title} · {labelOf(TASK_STATUSES, t.status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Lead vinculado</Label>
                  <Select name="related_lead_id" defaultValue={editing?.related_lead_id ?? "none"}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum vínculo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum vínculo</SelectItem>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.clinic_name} · {labelOf(LEAD_STATUSES, l.status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div><Label>Conteúdo *</Label><Textarea name="content" defaultValue={editing?.content} rows={4} required /></div>
            <div><Label>Decisão tomada</Label><Textarea name="decision" defaultValue={editing?.decision ?? ""} rows={2} /></div>
            <div><Label>Aprendizado</Label><Textarea name="learning" defaultValue={editing?.learning ?? ""} rows={2} /></div>
            <div><Label>Impacto</Label><Textarea name="impact" defaultValue={editing?.impact ?? ""} rows={2} /></div>
            <div><Label>Próxima ação</Label><Input name="next_action" defaultValue={editing?.next_action ?? ""} /></div>
            <DialogFooter>
              {editing && isAdmin && (
                <Button type="button" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>
              )}
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
