import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PROCESS_STATUSES, SECTORS, labelOf } from "@/lib/enums";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Processes() {
  const { user, isAdmin } = useAuth();
  const [search] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSector, setFilterSector] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = "Processos — Hera DG OS";
    void load();
  }, []);
  useEffect(() => {
    if (search.get("new") === "1") { setEditing(null); setOpen(true); }
  }, [search]);

  const load = async () => {
    const [{ data: p }, { data: pr }] = await Promise.all([
      supabase.from("processes").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("is_active", true),
    ]);
    setItems(p ?? []);
    setProfiles(pr ?? []);
  };

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filterStatus !== "all" && i.status !== filterStatus) return false;
      if (filterSector !== "all" && i.sector !== filterSector) return false;
      if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, filterStatus, filterSector, q]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const status = f.get("status") as string;
    if (status === "official" && !isAdmin) return toast.error("Apenas Admin pode marcar como Oficial");
    const payload: any = {
      name: String(f.get("name") || "").trim(),
      sector: f.get("sector") || null,
      objective: String(f.get("objective") || "") || null,
      when_to_use: String(f.get("when_to_use") || "") || null,
      owner_id: (f.get("owner_id") as string) || null,
      status,
      steps: String(f.get("steps") || "") || null,
      checklist: String(f.get("checklist") || "") || null,
      tools: String(f.get("tools") || "") || null,
      quality_standard: String(f.get("quality_standard") || "") || null,
      common_errors: String(f.get("common_errors") || "") || null,
      estimated_time_minutes: f.get("estimated_time_minutes") ? Number(f.get("estimated_time_minutes")) : null,
    };
    if (payload.sector === "none") payload.sector = null;
    if (payload.owner_id === "none") payload.owner_id = null;
    if (!payload.name) return toast.error("Informe o nome");

    if (editing) {
      const { error } = await supabase.from("processes").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Processo atualizado");
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("processes").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Processo criado");
    }
    setOpen(false); setEditing(null); void load();
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir este processo?")) return;
    const { error } = await supabase.from("processes").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setOpen(false); setEditing(null); void load();
  };

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Processos</h1>
          <p className="text-muted-foreground text-sm">Documentação operacional viva.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo processo
        </Button>
      </div>

      <Card className="p-3 flex flex-wrap gap-3">
        <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {PROCESS_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSector} onValueChange={setFilterSector}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {SECTORS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">Nenhum processo encontrado.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tempo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => { setEditing(p); setOpen(true); }}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{labelOf(SECTORS, p.sector)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "official" ? "default" : "secondary"}>
                      {labelOf(PROCESS_STATUSES, p.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.estimated_time_minutes ? `${p.estimated_time_minutes} min` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">{editing ? "Editar processo" : "Novo processo"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div><Label htmlFor="name">Nome *</Label><Input id="name" name="name" defaultValue={editing?.name} required /></div>
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
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "draft"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROCESS_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value} disabled={s.value === "official" && !isAdmin}>
                        {s.label}{s.value === "official" && !isAdmin ? " (admin)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Select name="owner_id" defaultValue={editing?.owner_id ?? "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estimated_time_minutes">Tempo estimado (min)</Label>
                <Input id="estimated_time_minutes" name="estimated_time_minutes" type="number" min={0} defaultValue={editing?.estimated_time_minutes ?? ""} />
              </div>
            </div>
            <div><Label>Objetivo</Label><Textarea name="objective" defaultValue={editing?.objective ?? ""} rows={2} /></div>
            <div><Label>Quando usar</Label><Textarea name="when_to_use" defaultValue={editing?.when_to_use ?? ""} rows={2} /></div>
            <div><Label>Passo a passo</Label><Textarea name="steps" defaultValue={editing?.steps ?? ""} rows={4} /></div>
            <div><Label>Checklist</Label><Textarea name="checklist" defaultValue={editing?.checklist ?? ""} rows={3} /></div>
            <div><Label>Ferramentas</Label><Textarea name="tools" defaultValue={editing?.tools ?? ""} rows={2} /></div>
            <div><Label>Padrão de qualidade</Label><Textarea name="quality_standard" defaultValue={editing?.quality_standard ?? ""} rows={2} /></div>
            <div><Label>Erros comuns</Label><Textarea name="common_errors" defaultValue={editing?.common_errors ?? ""} rows={2} /></div>
            <DialogFooter>
              {editing && isAdmin && <Button type="button" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>}
              <Button type="submit">{editing ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
