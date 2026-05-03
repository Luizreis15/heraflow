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
import { DIARY_CATEGORIES, labelOf } from "@/lib/enums";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Diary() {
  const { user, isAdmin } = useAuth();
  const [search] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => { document.title = "Diário — Hera DG OS"; void load(); }, []);
  useEffect(() => { if (search.get("new") === "1") { setEditing(null); setOpen(true); } }, [search]);

  const load = async () => {
    const [{ data: d }, { data: s }] = await Promise.all([
      supabase.from("diary_entries").select("*").order("created_at", { ascending: false }),
      supabase.from("sprints").select("id, name"),
    ]);
    setItems(d ?? []); setSprints(s ?? []);
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
    };
    if (payload.category === "none") payload.category = null;
    if (payload.sprint_id === "none") payload.sprint_id = null;
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

  const remove = async () => {
    if (!editing || !confirm("Excluir registro?")) return;
    const { error } = await supabase.from("diary_entries").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setOpen(false); setEditing(null); void load();
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-3xl">Diário de Bordo</h1>
          <p className="text-muted-foreground text-sm">Aprendizados, decisões, erros e vitórias.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo registro</Button>
      </div>

      <Card className="p-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {DIARY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum registro ainda.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id} className="p-5 cursor-pointer hover:shadow-[var(--shadow-soft)]" onClick={() => { setEditing(d); setOpen(true); }}>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-serif text-lg">{d.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{d.content}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {d.category && <Badge variant="secondary">{labelOf(DIARY_CATEGORIES, d.category)}</Badge>}
                  <span className="text-xs text-muted-foreground">{format(new Date(d.created_at), "dd MMM yyyy", { locale: ptBR })}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif">{editing ? "Editar registro" : "Novo registro"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div><Label>Título *</Label><Input name="title" defaultValue={editing?.title} required /></div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
            <div><Label>Conteúdo *</Label><Textarea name="content" defaultValue={editing?.content} rows={4} required /></div>
            <div><Label>Decisão tomada</Label><Textarea name="decision" defaultValue={editing?.decision ?? ""} rows={2} /></div>
            <div><Label>Aprendizado</Label><Textarea name="learning" defaultValue={editing?.learning ?? ""} rows={2} /></div>
            <div><Label>Impacto</Label><Textarea name="impact" defaultValue={editing?.impact ?? ""} rows={2} /></div>
            <div><Label>Próxima ação</Label><Input name="next_action" defaultValue={editing?.next_action ?? ""} /></div>
            <DialogFooter>
              {editing && (editing.created_by === user?.id || isAdmin) && (
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
