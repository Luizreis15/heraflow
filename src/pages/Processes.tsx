import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PROCESS_STATUSES, SECTORS, labelOf } from "@/lib/enums";
import {
  Plus,
  Trash2,
  FileText,
  Target,
  ListOrdered,
  CheckSquare,
  Wrench,
  Award,
  AlertTriangle,
  Clock,
  Link2,
  ListTodo,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PROCESS_SELECT = `
  *,
  tasks!processes_source_task_id_fkey(id, title)
`;

/** Playbook: cor de estado do documento */
const STATUS_PLAYBOOK: Record<
  string,
  { bar: string; badge: string; dot: string }
> = {
  draft: {
    bar: "from-slate-500 via-slate-400/50 to-slate-600/10",
    badge: "border-slate-500/35 bg-slate-500/12 text-slate-200",
    dot: "bg-slate-400",
  },
  testing: {
    bar: "from-amber-500 via-amber-400/45 to-amber-600/10",
    badge: "border-amber-500/40 bg-amber-500/12 text-amber-100",
    dot: "bg-amber-400",
  },
  validated: {
    bar: "from-cyan-500 via-cyan-400/45 to-cyan-600/10",
    badge: "border-cyan-500/35 bg-cyan-500/12 text-cyan-100",
    dot: "bg-cyan-400",
  },
  official: {
    bar: "from-emerald-500 via-emerald-400/50 to-emerald-600/10",
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
    dot: "bg-emerald-400",
  },
  needs_review: {
    bar: "from-orange-500 via-orange-400/45 to-orange-600/10",
    badge: "border-orange-500/40 bg-orange-500/12 text-orange-100",
    dot: "bg-orange-400",
  },
};

function linkSourceTask(p: any) {
  const row = p?.tasks;
  return row && typeof row === "object" && !Array.isArray(row) ? row : Array.isArray(row) ? row[0] : null;
}

function stepsPreview(steps: string | null | undefined, maxLines = 3) {
  if (!steps?.trim()) return null;
  const lines = steps.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(0, maxLines).join("\n");
}

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

  const [formStatus, setFormStatus] = useState("draft");
  const [formSector, setFormSector] = useState("none");
  const [formOwner, setFormOwner] = useState("none");

  useEffect(() => {
    document.title = "Processos — Hera DG OS";
    void load();
  }, []);
  useEffect(() => {
    if (search.get("new") === "1") {
      setEditing(null);
      setOpen(true);
    }
  }, [search]);

  const syncForm = useCallback(() => {
    if (!open) return;
    setFormStatus(editing?.status ?? "draft");
    setFormSector(editing?.sector ?? "none");
    setFormOwner(editing?.owner_id ?? "none");
  }, [open, editing]);

  useEffect(() => {
    syncForm();
  }, [syncForm]);

  const load = async () => {
    const [{ data: p }, { data: pr }] = await Promise.all([
      supabase.from("processes").select(PROCESS_SELECT).order("created_at", { ascending: false }),
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
    if (formStatus === "official" && !isAdmin) return toast.error("Apenas Admin pode marcar como Oficial");
    const payload: any = {
      name: String(f.get("name") || "").trim(),
      sector: formSector === "none" ? null : formSector,
      objective: String(f.get("objective") || "") || null,
      when_to_use: String(f.get("when_to_use") || "") || null,
      owner_id: formOwner === "none" ? null : formOwner,
      status: formStatus,
      steps: String(f.get("steps") || "") || null,
      checklist: String(f.get("checklist") || "") || null,
      tools: String(f.get("tools") || "") || null,
      quality_standard: String(f.get("quality_standard") || "") || null,
      common_errors: String(f.get("common_errors") || "") || null,
      estimated_time_minutes: f.get("estimated_time_minutes") ? Number(f.get("estimated_time_minutes")) : null,
    };
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
    setOpen(false);
    setEditing(null);
    void load();
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir este processo?")) return;
    const { error } = await supabase.from("processes").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setOpen(false);
    setEditing(null);
    void load();
  };

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Playbook da agência</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Processos</h1>
          <p className="mt-1 text-sm text-slate-400">Documentação operacional viva — rascunho a oficial, com passos claros.</p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" /> Novo processo
        </Button>
      </div>

      <Card className="flex flex-wrap items-center gap-3 border-border/70 bg-card/40 p-4 backdrop-blur-sm">
        <Input
          placeholder="Buscar por nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs border-white/[0.08] bg-black/20"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 border-white/[0.08] bg-black/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {PROCESS_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSector} onValueChange={setFilterSector}>
          <SelectTrigger className="w-44 border-white/[0.08] bg-black/20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {SECTORS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-white/10 bg-gradient-to-b from-card/80 to-transparent p-14 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-lg font-medium text-slate-300">Nenhum processo neste filtro</p>
          <p className="mt-1 text-sm text-slate-500">Crie playbooks por setor ou transforme tarefas concluídas em processo.</p>
          <Button className="mt-6" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Novo processo
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const st = STATUS_PLAYBOOK[p.status] ?? STATUS_PLAYBOOK.draft;
            const src = linkSourceTask(p);
            const preview = stepsPreview(p.steps);

            return (
              <Card
                key={p.id}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setEditing(p);
                    setOpen(true);
                  }
                }}
                className={cn(
                  "group cursor-pointer overflow-hidden border-white/[0.07] bg-gradient-to-br from-card via-card to-[hsl(218_44%_7%)] p-0 shadow-sm transition-all duration-200",
                  "hover:border-primary/28 hover:shadow-[0_14px_44px_-18px_hsl(199_89%_48%/0.2)]",
                )}
                onClick={() => {
                  setEditing(p);
                  setOpen(true);
                }}
              >
                <div className={cn("h-1 w-full bg-gradient-to-r", st.bar)} />
                <div className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                            st.badge,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", st.dot)} aria-hidden />
                          {labelOf(PROCESS_STATUSES, p.status)}
                        </span>
                        {p.sector && (
                          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                            {labelOf(SECTORS, p.sector)}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-base font-semibold leading-snug tracking-tight text-white group-hover:text-primary/95">
                        {p.name}
                      </h3>
                    </div>
                    {p.estimated_time_minutes != null && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/[0.08] bg-black/30 px-2 py-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {p.estimated_time_minutes} min
                      </span>
                    )}
                  </div>
                  {src && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Link
                        to="/tasks"
                        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 px-2.5 py-1.5 text-[11px] font-medium text-violet-200 transition-colors hover:border-violet-400/40"
                        title={src.title}
                      >
                        <Link2 className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                        <ListTodo className="h-3.5 w-3.5 shrink-0 text-violet-300/80" />
                        <span className="truncate">Origem: {src.title}</span>
                      </Link>
                    </div>
                  )}
                  {preview ? (
                    <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Passo a passo</p>
                      <pre className="mt-1.5 max-h-[4.5rem] overflow-hidden text-left font-mono text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap">
                        {preview}
                        {p.steps && p.steps.split(/\r?\n/).filter(Boolean).length > 3 ? "\n…" : ""}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-600">Sem passos definidos ainda.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent
          className="max-h-[92vh] max-w-2xl gap-0 overflow-hidden border-white/[0.08] p-0 lg:max-w-3xl"
          key={editing?.id ?? "new-process"}
        >
          <div className="border-b border-white/[0.06] bg-gradient-to-r from-[hsl(218_44%_11%)] to-card px-6 py-5">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                {editing ? "Editar processo" : "Novo processo"}
              </DialogTitle>
              <p className="text-xs text-slate-500">Estruture como documentação interna: objetivo, quando usar e execução passo a passo.</p>
            </DialogHeader>
          </div>

          <form onSubmit={onSubmit} className="max-h-[calc(92vh-5.5rem)] space-y-0 overflow-y-auto px-6 py-5">
            {editing && linkSourceTask(editing) && (
              <div className="mb-5 flex items-center gap-2 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2.5 text-sm text-violet-100">
                <Link2 className="h-4 w-4 shrink-0 text-violet-400" />
                <span className="text-slate-400">Vinculado à tarefa:</span>
                <Link to="/tasks" className="truncate font-medium text-violet-200 underline-offset-2 hover:underline">
                  {linkSourceTask(editing)?.title}
                </Link>
              </div>
            )}

            <div className="space-y-4">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Identidade do playbook
              </p>
              <div>
                <Label className="text-slate-400">Nome *</Label>
                <Input id="name" name="name" className="mt-1.5" defaultValue={editing?.name} required placeholder="Nome curto e acionável" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-slate-400">Setor</Label>
                  <Select value={formSector} onValueChange={setFormSector}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {SECTORS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400">Status</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROCESS_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value} disabled={s.value === "official" && !isAdmin}>
                          {s.label}
                          {s.value === "official" && !isAdmin ? " (admin)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400">Responsável</Label>
                  <Select value={formOwner} onValueChange={setFormOwner}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {profiles.map((pr) => (
                        <SelectItem key={pr.id} value={pr.id}>
                          {pr.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="estimated_time_minutes" className="text-slate-400">
                    Tempo estimado (min)
                  </Label>
                  <Input
                    id="estimated_time_minutes"
                    name="estimated_time_minutes"
                    type="number"
                    min={0}
                    className="mt-1.5"
                    defaultValue={editing?.estimated_time_minutes ?? ""}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-6 bg-white/[0.06]" />

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Target className="h-3.5 w-3.5 text-sky-400" />
                Objetivo e contexto
              </p>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <Label className="text-xs text-slate-500">Objetivo</Label>
                <Textarea name="objective" className="mt-2 min-h-[72px] border-white/[0.06] bg-transparent" defaultValue={editing?.objective ?? ""} rows={3} placeholder="O que este processo entrega quando bem executado." />
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <Label className="text-xs text-slate-500">Quando usar</Label>
                <Textarea name="when_to_use" className="mt-2 min-h-[72px] border-white/[0.06] bg-transparent" defaultValue={editing?.when_to_use ?? ""} rows={3} placeholder="Gatilhos, tipo de cliente ou fase do trabalho." />
              </div>
            </div>

            <Separator className="my-6 bg-white/[0.06]" />

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <ListOrdered className="h-3.5 w-3.5 text-primary" />
                Passo a passo (núcleo do playbook)
              </p>
              <div className="rounded-xl border-2 border-primary/25 bg-[hsl(218_44%_8%)] p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                <Textarea
                  name="steps"
                  className="min-h-[220px] resize-y border-0 bg-transparent font-mono text-[13px] leading-relaxed text-slate-200 placeholder:text-slate-600 focus-visible:ring-0"
                  defaultValue={editing?.steps ?? ""}
                  spellCheck={false}
                  placeholder={"1. …\n2. …\n3. …\n\nUse uma linha por passo. Subpassos com indentação (espaços) se precisar."}
                />
              </div>
            </div>

            <Separator className="my-6 bg-white/[0.06]" />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/15 p-4">
                <Label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                  Checklist
                </Label>
                <Textarea name="checklist" className="min-h-[100px] border-white/[0.06] bg-transparent text-sm" defaultValue={editing?.checklist ?? ""} rows={4} placeholder="Itens verificáveis antes de considerar concluído." />
              </div>
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/15 p-4">
                <Label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Wrench className="h-3.5 w-3.5 text-slate-400" />
                  Ferramentas
                </Label>
                <Textarea name="tools" className="min-h-[100px] border-white/[0.06] bg-transparent text-sm" defaultValue={editing?.tools ?? ""} rows={4} placeholder="Figma, Sheets, CRM, templates…" />
              </div>
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/15 p-4">
                <Label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Award className="h-3.5 w-3.5 text-amber-400/90" />
                  Padrão de qualidade
                </Label>
                <Textarea name="quality_standard" className="min-h-[88px] border-white/[0.06] bg-transparent text-sm" defaultValue={editing?.quality_standard ?? ""} rows={3} />
              </div>
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/15 p-4">
                <Label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-400/90" />
                  Erros comuns
                </Label>
                <Textarea name="common_errors" className="min-h-[88px] border-white/[0.06] bg-transparent text-sm" defaultValue={editing?.common_errors ?? ""} rows={3} />
              </div>
            </div>

            <DialogFooter className="mt-8 flex flex-row flex-wrap gap-2 border-t border-white/[0.06] bg-card/30 px-0 pt-5">
              {editing && isAdmin && (
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={remove}>
                  <Trash2 className="mr-1 h-4 w-4" /> Excluir
                </Button>
              )}
              <Button type="submit" className="ml-auto">
                {editing ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
