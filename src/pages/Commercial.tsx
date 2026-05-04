import { useEffect, useState, useMemo, useCallback } from "react";
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
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { LEAD_STATUSES, LEAD_SOURCES, labelOf } from "@/lib/enums";
import { Plus, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function LeadCard({ lead, onClick }: { lead: any; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners} onClick={onClick}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="mb-2 cursor-grab rounded-lg border border-border bg-card p-3 transition-all duration-200 hover:border-primary/25 hover:shadow-lg"
    >
      <div className="font-medium text-sm">{lead.clinic_name}</div>
      <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
        <span>{lead.city ?? "—"}</span>
        {lead.potential_score && (
          <span className="flex items-center gap-0.5 text-accent">
            {Array.from({ length: lead.potential_score }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
          </span>
        )}
      </div>
      {lead.next_action && <div className="text-xs mt-1 text-muted-foreground truncate">→ {lead.next_action}</div>}
    </div>
  );
}

function Column({ status, label, leads, onCardClick }: any) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 rounded-xl border border-border/50 bg-card/40 p-3 shadow-inner transition-shadow ${isOver ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background" : ""}`}
    >
      <div className="mb-3 flex justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{label}</h3>
        <span className="text-xs text-muted-foreground">{leads.length}</span>
      </div>
      <div className="min-h-[100px]">
        {leads.map((l: any) => <LeadCard key={l.id} lead={l} onClick={() => onCardClick(l)} />)}
      </div>
    </div>
  );
}

export default function Commercial() {
  const { user, isAdmin } = useAuth();
  const [search] = useSearchParams();
  const [leads, setLeads] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [leadStatus, setLeadStatus] = useState("mapped");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { document.title = "Comercial — Hera DG OS"; void load(); }, []);
  useEffect(() => { if (search.get("new") === "1") { setEditing(null); setOpen(true); } }, [search]);

  useEffect(() => {
    if (open) setLeadStatus(editing?.status ?? "mapped");
  }, [open, editing?.id, editing?.status]);

  const load = async () => {
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("is_active", true),
    ]);
    setLeads(l ?? []); setProfiles(p ?? []);
  };

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    LEAD_STATUSES.forEach((s) => (g[s.value] = []));
    leads.forEach((l) => { if (g[l.status]) g[l.status].push(l); });
    return g;
  }, [leads]);

  const validateStatusTransition = useCallback((status: string, row: { lost_reason?: string | null; next_action?: string | null; next_follow_up_date?: string | null }) => {
    if (status === "lost") {
      const r = String(row.lost_reason ?? "").trim();
      if (!r) {
        toast.error("Preencha o motivo de perda no lead antes de mover para Perdido.");
        return false;
      }
    }
    if (status === "diagnosis_scheduled") {
      const na = String(row.next_action ?? "").trim();
      const fd = String(row.next_follow_up_date ?? "").trim();
      if (!na && !fd) {
        toast.error("Para Diagnóstico agendado, informe a próxima ação ou a data de follow-up no cadastro do lead.");
        return false;
      }
    }
    return true;
  }, []);

  const onDragEnd = async (e: DragEndEvent) => {
    if (!e.over) return;
    const id = String(e.active.id); const newStatus = String(e.over.id);
    const l = leads.find((x) => x.id === id);
    if (!l || l.status === newStatus) return;
    if (!validateStatusTransition(newStatus, l)) return;
    setLeads((p) => p.map((x) => x.id === id ? { ...x, status: newStatus } : x));
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error(error.message); void load(); }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nextAction = String(f.get("next_action") || "").trim();
    const followUp = String(f.get("next_follow_up_date") || "").trim();
    const lostReason = String(f.get("lost_reason") || "").trim();

    const payload: any = {
      clinic_name: String(f.get("clinic_name") || "").trim(),
      contact_name: String(f.get("contact_name") || "") || null,
      city: String(f.get("city") || "") || null,
      state: String(f.get("state") || "") || null,
      instagram_url: String(f.get("instagram_url") || "") || null,
      website_url: String(f.get("website_url") || "") || null,
      whatsapp: String(f.get("whatsapp") || "") || null,
      specialty: String(f.get("specialty") || "") || null,
      priority_treatment: String(f.get("priority_treatment") || "") || null,
      source: f.get("source") || null,
      status: leadStatus,
      potential_score: f.get("potential_score") ? Number(f.get("potential_score")) : null,
      main_pain: String(f.get("main_pain") || "") || null,
      next_action: nextAction || null,
      next_follow_up_date: followUp || null,
      lost_reason: lostReason || null,
      owner_id: (f.get("owner_id") as string) || null,
    };
    if (payload.source === "none") payload.source = null;
    if (payload.owner_id === "none") payload.owner_id = null;
    if (!payload.clinic_name) return toast.error("Informe a clínica");

    if (payload.status === "lost" && !lostReason) {
      return toast.error("Para status Perdido, o motivo de perda é obrigatório.");
    }
    if (payload.status === "diagnosis_scheduled" && !nextAction && !followUp) {
      return toast.error("Para Diagnóstico agendado, preencha a próxima ação ou a data de follow-up.");
    }

    if (leadStatus === "proposal_sent") {
      const raw = f.get("proposal_value");
      payload.proposal_value = raw ? Number(raw) : null;
    } else if (editing) {
      payload.proposal_value = editing.proposal_value ?? null;
    } else {
      payload.proposal_value = null;
    }

    if (editing) {
      const { error } = await supabase.from("leads").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Lead atualizado");
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("leads").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Lead criado");
    }
    setOpen(false); setEditing(null); void load();
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setOpen(false); setEditing(null); void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Comercial</h1>
          <p className="text-sm text-slate-400">Pipeline de leads.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Novo lead</Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((s) => (
            <Column key={s.value} status={s.value} label={s.label} leads={grouped[s.value]} onCardClick={(l: any) => { setEditing(l); setOpen(true); }} />
          ))}
        </div>
      </DndContext>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg font-semibold tracking-tight">{editing ? "Editar lead" : "Novo lead"}</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Clínica *</Label><Input name="clinic_name" defaultValue={editing?.clinic_name} required /></div>
              <div><Label>Contato</Label><Input name="contact_name" defaultValue={editing?.contact_name ?? ""} /></div>
              <div><Label>WhatsApp</Label><Input name="whatsapp" defaultValue={editing?.whatsapp ?? ""} /></div>
              <div><Label>Cidade</Label><Input name="city" defaultValue={editing?.city ?? ""} /></div>
              <div><Label>Estado</Label><Input name="state" maxLength={2} defaultValue={editing?.state ?? ""} /></div>
              <div><Label>Instagram</Label><Input name="instagram_url" defaultValue={editing?.instagram_url ?? ""} /></div>
              <div><Label>Site</Label><Input name="website_url" defaultValue={editing?.website_url ?? ""} /></div>
              <div><Label>Especialidade</Label><Input name="specialty" defaultValue={editing?.specialty ?? ""} /></div>
              <div><Label>Tratamento prioritário</Label><Input name="priority_treatment" defaultValue={editing?.priority_treatment ?? ""} /></div>
              <div>
                <Label>Origem</Label>
                <Select name="source" defaultValue={editing?.source ?? "none"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {LEAD_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={leadStatus} onValueChange={setLeadStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Potencial (1-5)</Label><Input name="potential_score" type="number" min={1} max={5} defaultValue={editing?.potential_score ?? ""} /></div>
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
              <div className="col-span-2"><Label>Principal dor</Label><Textarea name="main_pain" defaultValue={editing?.main_pain ?? ""} rows={2} /></div>
              <div className="col-span-2">
                <Label>Próxima ação</Label>
                <Input name="next_action" defaultValue={editing?.next_action ?? ""} />
                {leadStatus === "diagnosis_scheduled" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Obrigatório neste status: preencha a próxima ação <span className="font-medium">ou</span> a data de follow-up abaixo.
                  </p>
                )}
              </div>
              <div>
                <Label>Próximo follow-up</Label>
                <Input name="next_follow_up_date" type="date" defaultValue={editing?.next_follow_up_date ?? ""} />
              </div>
              {leadStatus === "proposal_sent" && (
                <div className="col-span-2 rounded-lg border-2 border-accent/50 bg-accent/10 p-4 space-y-2">
                  <Label htmlFor="proposal_value" className="text-base font-semibold">
                    Valor da proposta <span className="font-normal text-muted-foreground">(opcional)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Registe o valor quando fizer sentido; o pipeline continua válido sem valor.
                  </p>
                  <Input
                    id="proposal_value"
                    name="proposal_value"
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Ex.: 15000"
                    defaultValue={editing?.proposal_value ?? ""}
                    className="bg-background"
                  />
                </div>
              )}
              <div className="col-span-2">
                <Label>
                  Motivo de perda
                  {leadStatus === "lost" && <span className="text-destructive"> *</span>}
                </Label>
                <Textarea name="lost_reason" defaultValue={editing?.lost_reason ?? ""} rows={2} required={leadStatus === "lost"} />
              </div>
            </div>
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
