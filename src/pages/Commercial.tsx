import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { LEAD_STATUSES, LEAD_SOURCES, labelOf } from "@/lib/enums";
import {
  Plus,
  Star,
  Trash2,
  MapPin,
  CalendarClock,
  ArrowRight,
  Building2,
  TrendingUp,
  KanbanSquare,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type LeadRow = Tables<"leads">;
type ProfileOption = Pick<Tables<"profiles">, "id" | "full_name">;

/** Destaque visual por etapa do funil (borda superior + tom do cabeçalho) */
const STAGE_ACCENT: Record<string, string> = {
  mapped: "from-slate-500/50 via-slate-400/20 to-transparent",
  contacted: "from-cyan-500/55 via-cyan-400/15 to-transparent",
  replied: "from-sky-500/50 via-sky-400/15 to-transparent",
  diagnosis_scheduled: "from-primary/60 via-primary/20 to-transparent",
  diagnosis_done: "from-emerald-500/45 via-emerald-400/12 to-transparent",
  proposal_sent: "from-violet-500/50 via-violet-400/15 to-transparent",
  follow_up: "from-amber-500/40 via-amber-400/10 to-transparent",
  won: "from-emerald-400/60 via-emerald-500/15 to-transparent",
  lost: "from-destructive/55 via-destructive/20 to-transparent",
  nurturing: "from-indigo-500/45 via-indigo-400/12 to-transparent",
};

function LeadCard({ lead, onClick }: { lead: LeadRow; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  const followUp = lead.next_follow_up_date
    ? format(new Date(lead.next_follow_up_date), "dd MMM yyyy", { locale: ptBR })
    : null;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.45 : 1 }}
      className={cn(
        "group mb-2.5 cursor-grab rounded-xl border border-white/[0.08] bg-gradient-to-b from-card to-[hsl(218_44%_8%)] p-3.5 shadow-sm transition-all duration-200 active:cursor-grabbing",
        "hover:border-primary/35 hover:shadow-[0_8px_28px_-12px_hsl(199_89%_48%/0.22)]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug tracking-tight text-white">{lead.clinic_name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3 shrink-0 text-slate-600" />
              <span className="truncate text-slate-400">{lead.city?.trim() ? lead.city : "Cidade não informada"}</span>
            </span>
          </div>
        </div>
        {lead.potential_score ? (
          <span className="flex shrink-0 items-center gap-0.5 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-1" title="Potencial">
            {Array.from({ length: lead.potential_score }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-primary text-primary" />
            ))}
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-600">Sem potencial</span>
        )}
      </div>

      {lead.next_action && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-white/[0.06] bg-black/25 px-2 py-1.5 text-xs text-slate-300">
          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="line-clamp-2 leading-snug">{lead.next_action}</span>
        </div>
      )}

      {followUp && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-slate-500">
          <CalendarClock className="h-3.5 w-3.5 text-slate-600" />
          <span>Follow-up: {followUp}</span>
        </div>
      )}
    </div>
  );
}

function Column({
  status,
  label,
  leads,
  onCardClick,
  onNewInStage,
}: {
  status: string;
  label: string;
  leads: LeadRow[];
  onCardClick: (l: LeadRow) => void;
  onNewInStage: (stage: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const accent = STAGE_ACCENT[status] ?? STAGE_ACCENT.mapped;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-80 flex-shrink-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[hsl(218_44%_9%/0.5)] to-[hsl(222_47%_6%/0.9)] shadow-inner transition-shadow duration-200",
        isOver && "ring-2 ring-primary/45 ring-offset-2 ring-offset-background",
      )}
    >
      <div className={cn("h-1 bg-gradient-to-r", accent)} />
      <div className="p-3">
        <div className="mb-3 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="min-w-0 text-[11px] font-extrabold uppercase leading-tight tracking-[0.1em] text-white">{label}</h3>
            <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 px-2 text-xs font-bold tabular-nums text-primary">
              {leads.length}
            </span>
          </div>
        </div>
        <div className="min-h-[120px]">
          {leads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-8 text-center">
              <KanbanSquare className="mx-auto mb-2 h-7 w-7 text-slate-600 opacity-80" />
              <p className="text-xs font-semibold text-slate-400">Sem leads aqui</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Arraste um cartão de outra coluna ou abra um lead para alterar o status.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full border-primary/25 text-xs"
                onClick={() => onNewInStage(status)}
              >
                + Novo lead nesta etapa
              </Button>
            </div>
          ) : (
            leads.map((l) => <LeadCard key={l.id} lead={l} onClick={() => onCardClick(l)} />)
          )}
        </div>
      </div>
    </div>
  );
}

export default function Commercial() {
  const { user, isAdmin } = useAuth();
  const [search] = useSearchParams();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [editing, setEditing] = useState<LeadRow | null>(null);
  const [open, setOpen] = useState(false);
  const [leadStatus, setLeadStatus] = useState("mapped");
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    document.title = "Comercial — Hera DG OS";
    void load();
  }, []);
  useEffect(() => {
    if (search.get("new") === "1") {
      setEditing(null);
      setLeadStatus("mapped");
      setOpen(true);
    }
  }, [search]);

  useEffect(() => {
    if (open && editing) setLeadStatus(editing.status);
  }, [open, editing]);

  const load = async () => {
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").eq("is_active", true),
    ]);
    setLeads(l ?? []);
    setProfiles(p ?? []);
  };

  const grouped = useMemo(() => {
    const g: Record<string, LeadRow[]> = {};
    LEAD_STATUSES.forEach((s) => (g[s.value] = []));
    leads.forEach((l) => {
      if (g[l.status]) g[l.status].push(l);
    });
    return g;
  }, [leads]);

  const validateStatusTransition = useCallback(
    (status: string, row: { lost_reason?: string | null; next_action?: string | null; next_follow_up_date?: string | null }) => {
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
    },
    [],
  );

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const newStatus = String(e.over.id);
    const l = leads.find((x) => x.id === id);
    if (!l || l.status === newStatus) return;
    if (!validateStatusTransition(newStatus, l)) return;
    setLeads((p) => p.map((x) => (x.id === id ? { ...x, status: newStatus } : x)));
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);
    if (error) {
      toast.error(error.message);
      void load();
    }
  };

  const openLeadModal = (l: LeadRow) => {
    setEditing(l);
    setOpen(true);
  };

  const openNewLeadForStage = (stage: string) => {
    setEditing(null);
    setLeadStatus(stage);
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const nextAction = String(f.get("next_action") || "").trim();
    const followUp = String(f.get("next_follow_up_date") || "").trim();
    const lostReason = String(f.get("lost_reason") || "").trim();

    const payload: TablesUpdate<"leads"> = {
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
      const insertPayload: TablesInsert<"leads"> = {
        ...payload,
        clinic_name: payload.clinic_name ?? "",
        created_by: user?.id ?? null,
      };
      const { error } = await supabase.from("leads").insert(insertPayload);
      if (error) return toast.error(error.message);
      toast.success("Lead criado");
    }
    setOpen(false);
    setEditing(null);
    void load();
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setOpen(false);
    setEditing(null);
    void load();
  };

  const activeLead = activeId ? leads.find((x) => x.id === activeId) : null;

  return (
    <div className="max-w-full space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Pipeline</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Comercial</h1>
          <p className="mt-1 text-sm text-slate-400">Prospecção e movimento de leads da Hera DG — arraste entre etapas.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setLeadStatus("mapped");
            setOpen(true);
          }}
          className="shrink-0 gap-1"
        >
          <Plus className="h-4 w-4" /> Novo lead
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e) => setActiveId(String(e.active.id))}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {LEAD_STATUSES.map((s) => (
            <Column
              key={s.value}
              status={s.value}
              label={s.label}
              leads={grouped[s.value]}
              onCardClick={openLeadModal}
              onNewInStage={openNewLeadForStage}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} onClick={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl gap-0 overflow-y-auto p-0 sm:rounded-xl">
          <div className="border-b border-white/10 bg-black/30 px-6 py-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                {editing ? "Editar lead" : "Novo lead"}
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Organize por blocos. Validações de Perdido, Diagnóstico agendado e Proposta enviada mantêm-se ativas.
              </p>
            </DialogHeader>
          </div>

          <form onSubmit={onSubmit} className="space-y-5 px-6 py-5">
            {/* Dados da clínica */}
            <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-card/50">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Dados da clínica</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Clínica *</Label>
                  <Input name="clinic_name" className="mt-1.5" defaultValue={editing?.clinic_name} required />
                </div>
                <div>
                  <Label>Contato</Label>
                  <Input name="contact_name" className="mt-1.5" defaultValue={editing?.contact_name ?? ""} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input name="whatsapp" className="mt-1.5" defaultValue={editing?.whatsapp ?? ""} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input name="city" className="mt-1.5" defaultValue={editing?.city ?? ""} />
                </div>
                <div>
                  <Label>Estado (UF)</Label>
                  <Input name="state" className="mt-1.5" maxLength={2} defaultValue={editing?.state ?? ""} />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input name="instagram_url" className="mt-1.5" defaultValue={editing?.instagram_url ?? ""} />
                </div>
                <div>
                  <Label>Site</Label>
                  <Input name="website_url" className="mt-1.5" defaultValue={editing?.website_url ?? ""} />
                </div>
                <div>
                  <Label>Especialidade</Label>
                  <Input name="specialty" className="mt-1.5" defaultValue={editing?.specialty ?? ""} />
                </div>
                <div>
                  <Label>Tratamento prioritário</Label>
                  <Input name="priority_treatment" className="mt-1.5" defaultValue={editing?.priority_treatment ?? ""} />
                </div>
              </div>
            </div>

            {/* Comercial */}
            <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-card/50">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Comercial</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Origem</Label>
                  <Select name="source" defaultValue={editing?.source ?? "none"}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status no pipeline</Label>
                  <Select value={leadStatus} onValueChange={setLeadStatus}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Potencial (1–5)</Label>
                  <Input name="potential_score" type="number" min={1} max={5} className="mt-1.5" defaultValue={editing?.potential_score ?? ""} />
                </div>
                <div>
                  <Label>Responsável</Label>
                  <Select name="owner_id" defaultValue={editing?.owner_id ?? "none"}>
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

            {/* Diagnóstico */}
            <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-card/50">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Diagnóstico</p>
              </div>
              <div>
                <Label>Principal dor / contexto</Label>
                <Textarea name="main_pain" className="mt-1.5 min-h-[88px]" defaultValue={editing?.main_pain ?? ""} rows={3} placeholder="Dor, objeções, contexto clínico…" />
              </div>
            </div>

            {/* Follow-up & fechamento */}
            <div className="rounded-xl border border-white/[0.08] bg-black/25 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-card/50">
                  <CalendarClock className="h-4 w-4 text-primary" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Follow-up & fechamento</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Próxima ação</Label>
                  <Input name="next_action" className="mt-1.5" defaultValue={editing?.next_action ?? ""} />
                  {leadStatus === "diagnosis_scheduled" && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                      Neste status é <span className="font-semibold text-slate-400">obrigatório</span> preencher a próxima ação{" "}
                      <span className="text-slate-500">ou</span> a data de follow-up.
                    </p>
                  )}
                </div>
                <div>
                  <Label>Data do próximo follow-up</Label>
                  <Input name="next_follow_up_date" type="date" className="mt-1.5" defaultValue={editing?.next_follow_up_date ?? ""} />
                </div>
              </div>

              {leadStatus === "proposal_sent" && (
                <>
                  <Separator className="my-4 bg-white/10" />
                  <div className="rounded-lg border border-primary/25 bg-primary/[0.07] p-4">
                    <Label htmlFor="proposal_value" className="text-slate-200">
                      Valor da proposta <span className="font-normal text-slate-500">(opcional)</span>
                    </Label>
                    <p className="mt-1 text-[11px] text-slate-500">Visível na equipa comercial; pode ficar em branco.</p>
                    <Input
                      id="proposal_value"
                      name="proposal_value"
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Ex.: 15000"
                      className="mt-2"
                      defaultValue={editing?.proposal_value ?? ""}
                    />
                  </div>
                </>
              )}

              <Separator className="my-4 bg-white/10" />
              <div>
                <Label>
                  Motivo de perda
                  {leadStatus === "lost" && <span className="text-destructive"> *</span>}
                </Label>
                <Textarea name="lost_reason" className="mt-1.5" defaultValue={editing?.lost_reason ?? ""} rows={2} required={leadStatus === "lost"} placeholder="Obrigatório ao marcar como Perdido." />
              </div>
            </div>

            <DialogFooter className="flex-col-reverse gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-between">
              {editing && isAdmin ? (
                <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={remove}>
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit">{editing ? "Salvar lead" : "Criar lead"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
