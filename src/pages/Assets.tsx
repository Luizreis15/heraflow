import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSET_CATEGORIES, ASSET_STATUSES, labelOf } from "@/lib/enums";
import { Plus, ExternalLink, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Assets() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filterCat, setFilterCat] = useState("all");

  useEffect(() => { document.title = "Biblioteca — Hera DG OS"; void load(); }, []);

  const load = async () => {
    const { data } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  const filtered = useMemo(() => filterCat === "all" ? items : items.filter((i) => i.category === filterCat), [items, filterCat]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      name: String(f.get("name") || "").trim(),
      category: f.get("category") || null,
      description: String(f.get("description") || "") || null,
      url: String(f.get("url") || "") || null,
      status: f.get("status") || "draft",
      version: String(f.get("version") || "") || null,
    };
    if (payload.category === "none") payload.category = null;
    if (!payload.name) return toast.error("Informe o nome");

    if (editing) {
      const { error } = await supabase.from("assets").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("assets").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Salvo"); setOpen(false); setEditing(null); void load();
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir ativo?")) return;
    const { error } = await supabase.from("assets").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setOpen(false); setEditing(null); void load();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-3xl">Biblioteca</h1>
          <p className="text-muted-foreground text-sm">Materiais e links reutilizáveis.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo ativo</Button>
      </div>

      <Card className="p-3">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {ASSET_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum ativo cadastrado.</Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => (
            <Card key={a.id} className="p-4 hover:shadow-[var(--shadow-soft)] transition-shadow">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="font-medium leading-snug">{a.name}</h3>
                <Badge variant="secondary">{labelOf(ASSET_STATUSES, a.status)}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-2">{labelOf(ASSET_CATEGORIES, a.category)}{a.version ? ` · v${a.version}` : ""}</div>
              {a.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.description}</p>}
              <div className="flex gap-2">
                {a.url && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={a.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir</a>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }}>Editar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">{editing ? "Editar ativo" : "Novo ativo"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div><Label>Nome *</Label><Input name="name" defaultValue={editing?.name} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select name="category" defaultValue={editing?.category ?? "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {ASSET_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "draft"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSET_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>URL</Label><Input name="url" type="url" defaultValue={editing?.url ?? ""} /></div>
            <div><Label>Versão</Label><Input name="version" defaultValue={editing?.version ?? ""} /></div>
            <div><Label>Descrição</Label><Textarea name="description" defaultValue={editing?.description ?? ""} rows={3} /></div>
            <DialogFooter>
              {editing && isAdmin && <Button type="button" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>}
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
