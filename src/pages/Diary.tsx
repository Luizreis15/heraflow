import { useEffect, useState, useMemo, useCallback } from "react";
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
import { DIARY_CATEGORIES, labelOf, SPRINT_STATUSES, TASK_STATUSES, LEAD_STATUSES } from "@/lib/enums";
import {
  Plus,
  Trash2,
  Building2,
  ListTodo,
  KanbanSquare,
  Scale,
  Lightbulb,
  TrendingUp,
  ArrowRightCircle,
  BookMarked,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type DiaryEmbedSprint = Pick<Tables<"sprints">, "id" | "name" | "status">;
type DiaryEmbedTask = Pick<Tables<"tasks">, "id" | "title" | "status">;
type DiaryEmbedLead = Pick<Tables<"leads">, "id" | "clinic_name" | "status">;

type DiaryEntryListRow = Tables<"diary_entries"> & {
  sprints?: DiaryEmbedSprint | DiaryEmbedSprint[] | null;
  tasks?: DiaryEmbedTask | DiaryEmbedTask[] | null;
  leads?: DiaryEmbedLead | DiaryEmbedLead[] | null;
};

type SprintOption = Pick<Tables<"sprints">, "id" | "name" | "status">;
type TaskOption = Pick<Tables<"tasks">, "id" | "title" | "status">;
type LeadOption = Pick<Tables<"leads">, "id" | "clinic_name" | "status">;

const DIARY_LIST_SELECT = `
  *,
  sprints!diary_entries_sprint_id_fkey(id, name, status),
  tasks!diary_entries_related_task_id_fkey(id, title, status),
  leads!diary_entries_related_lead_id_fkey(id, clinic_name, status)
`;

/** Barra lateral + chip da categoria (memória operacional) */
const CATEGORY_VISUAL: Record<
  string,
  { bar: string; chip: string; labelTone: string }
> = {
  commercial: {
    bar: "from-sky-500 via-sky-400/60 to-sky-500/20",
    chip: "border-sky-500/35 bg-sky-500/10 text-sky-200",
    labelTone: "text-sky-400/90",
  },
  content: {
    bar: "from-violet-500 via-violet-400/50 to-violet-500/15",
    chip: "border-violet-500/35 bg-violet-500/10 text-violet-200",
    labelTone: "text-violet-400/90",
  },
  offer: {
    bar: "from-amber-500 via-amber-400/45 to-amber-500/15",
    chip: "border-amber-500/35 bg-amber-500/10 text-amber-100",
    labelTone: "text-amber-400/90",
  },
  client: {
    bar: "from-emerald-500 via-emerald-400/45 to-emerald-500/15",
    chip: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
    labelTone: "text-emerald-400/90",
  },
  process: {
    bar: "from-cyan-500 via-cyan-400/45 to-cyan-500/15",
    chip: "border-cyan-500/35 bg-cyan-500/10 text-cyan-100",
    labelTone: "text-cyan-400/90",
  },
  technology: {
    bar: "from-indigo-500 via-indigo-400/45 to-indigo-500/15",
    chip: "border-indigo-500/35 bg-indigo-500/10 text-indigo-200",
    labelTone: "text-indigo-400/90",
  },
  mentorship: {
    bar: "from-rose-400 via-rose-300/40 to-rose-500/15",
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-100",
    labelTone: "text-rose-400/90",
  },
  mistake: {
    bar: "from-destructive via-destructive/70 to-destructive/20",
    chip: "border-destructive/40 bg-destructive/15 text-red-200",
    labelTone: "text-red-400/90",
  },
  insight: {
    bar: "from-primary via-primary/70 to-primary/15",
    chip: "border-primary/40 bg-primary/12 text-primary-foreground",
    labelTone: "text-primary/90",
  },
  win: {
    bar: "from-lime-400 via-lime-300/50 to-lime-500/15",
    chip: "border-lime-500/35 bg-lime-500/10 text-lime-100",
    labelTone: "text-lime-400/90",
  },
};

const DEFAULT_CAT_VISUAL = {
  bar: "from-slate-500 via-slate-400/40 to-slate-600/15",
  chip: "border-white/10 bg-white/[0.06] text-slate-300",
  labelTone: "text-slate-500",
};

function linkSprint(d: DiaryEntryListRow): DiaryEmbedSprint | null {
  const row = d?.sprints;
  return row && typeof row === "object" && !Array.isArray(row) ? row : Array.isArray(row) ? row[0] ?? null : null;
}
function linkTask(d: DiaryEntryListRow): DiaryEmbedTask | null {
  const row = d?.tasks;
  return row && typeof row === "object" && !Array.isArray(row) ? row : Array.isArray(row) ? row[0] ?? null : null;
}
function linkLead(d: DiaryEntryListRow): DiaryEmbedLead | null {
  const row = d?.leads;
  return row && typeof row === "object" && !Array.isArray(row) ? row : Array.isArray(row) ? row[0] ?? null : null;
}

export default function Diary() {
  const { user, isAdmin } = useAuth();
  const [search] = useSearchParams();
  const [items, setItems] = useState<DiaryEntryListRow[]>([]);
  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryEntryListRow | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  const [formCategory, setFormCategory] = useState("none");
  const [formSprintId, setFormSprintId] = useState("none");
  const [formTaskId, setFormTaskId] = useState("none");
  const [formLeadId, setFormLeadId] = useState("none");

  useEffect(() => {
    document.title = "Diário — Hera DG OS";
    void load();
  }, []);
  useEffect(() => {
    if (search.get("new") === "1") {
      setEditing(null);
      setOpen(true);
    }
  }, [search]);

  const syncFormFromEditing = useCallback(() => {
    if (!open) return;
    setFormCategory(editing?.category ?? "none");
    setFormSprintId(editing?.sprint_id ?? "none");
    setFormTaskId(editing?.related_task_id ?? "none");
    setFormLeadId(editing?.related_lead_id ?? "none");
  }, [open, editing]);

  useEffect(() => {
    syncFormFromEditing();
  }, [syncFormFromEditing]);

  const load = async () => {
    const [{ data: d }, { data: s }, { data: t }, { data: l }] = await Promise.all([
      supabase.from("diary_entries").select(DIARY_LIST_SELECT).order("created_at", { ascending: false }),
      supabase.from("sprints").select("id, name, status").order("created_at", { ascending: false }),
      supabase.from("tasks").select("id, title, status").order("created_at", { ascending: false }).limit(500),
      supabase.from("leads").select("id, clinic_name, status").order("created_at", { ascending: false }).limit(500),
    ]);
    setItems((d ?? []) as DiaryEntryListRow[]);
    setSprints(s ?? []);
    setTasks(t ?? []);
    setLeads(l ?? []);
  };

  const filtered = useMemo(
    () => (filterCategory === "all" ? items : items.filter((i) => i.category === filterCategory)),
    [items, filterCategory],
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: TablesUpdate<"diary_entries"> = {
      title: String(f.get("title") || "").trim(),
      category: formCategory === "none" ? null : formCategory,
      content: String(f.get("content") || "").trim(),
      decision: String(f.get("decision") || "") || null,
      learning: String(f.get("learning") || "") || null,
      impact: String(f.get("impact") || "") || null,
      next_action: String(f.get("next_action") || "") || null,
      sprint_id: formSprintId === "none" ? null : formSprintId,
      related_task_id: formTaskId === "none" ? null : formTaskId,
      related_lead_id: formLeadId === "none" ? null : formLeadId,
    };
    if (!payload.title || !payload.content) return toast.error("Preencha título e conteúdo");

    if (editing) {
      const { error } = await supabase.from("diary_entries").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const insertPayload: TablesInsert<"diary_entries"> = {
        ...payload,
        title: payload.title ?? "",
        content: payload.content ?? "",
        created_by: user?.id ?? null,
      };
      const { error } = await supabase.from("diary_entries").insert(insertPayload);
      if (error) return toast.error(error.message);
    }
    toast.success("Salvo");
    setOpen(false);
    setEditing(null);
    void load();
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir registro?")) return;
    const { error } = await supabase.from("diary_entries").delete().eq("id", editing.id);
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
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Memória operacional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Diário de Bordo</h1>
          <p className="mt-1 text-sm text-slate-400">Decisões, aprendizados, erros e vitórias da construção da Hera DG.</p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" /> Novo registro
        </Button>
      </div>

      <Card className="border-border/70 bg-card/40 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-500">Filtrar</span>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-56 border-white/[0.08] bg-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {DIARY_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-white/10 bg-gradient-to-b from-card/80 to-transparent p-14 text-center">
          <BookMarked className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-lg font-medium text-slate-300">Nenhum registo neste filtro</p>
          <p className="mt-1 text-sm text-slate-500">Documente decisões e aprendizados para a equipa consultar depois.</p>
          <Button className="mt-6" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Criar primeiro registo
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => {
            const sp = linkSprint(d);
            const tk = linkTask(d);
            const ld = linkLead(d);
            const cat = d.category ? CATEGORY_VISUAL[d.category] ?? DEFAULT_CAT_VISUAL : DEFAULT_CAT_VISUAL;
            const dateStr = format(new Date(d.created_at), "dd MMM yyyy", { locale: ptBR });
            const dayNum = format(new Date(d.created_at), "dd");
            const monthStr = format(new Date(d.created_at), "MMM", { locale: ptBR });

            return (
              <Card
                key={d.id}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setEditing(d);
                    setOpen(true);
                  }
                }}
                className={cn(
                  "group cursor-pointer overflow-hidden border-white/[0.07] bg-gradient-to-br from-card via-card to-[hsl(218_44%_7%)] p-0 shadow-sm transition-all duration-200",
                  "hover:border-primary/30 hover:shadow-[0_12px_40px_-16px_hsl(199_89%_48%/0.18)]",
                )}
                onClick={() => {
                  setEditing(d);
                  setOpen(true);
                }}
              >
                <div className="flex min-h-[120px]">
                  <div className={cn("w-1 shrink-0 bg-gradient-to-b", cat.bar)} aria-hidden />
                  <div className="flex flex-1 gap-4 p-5">
                    <div className="hidden shrink-0 flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-center sm:flex">
                      <span className="text-xl font-bold tabular-nums leading-none text-white">{dayNum}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{monthStr}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {d.category ? (
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                              cat.chip,
                            )}
                          >
                            {labelOf(DIARY_CATEGORIES, d.category)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Sem categoria</span>
                        )}
                        <span className="text-xs text-slate-500 sm:hidden">{dateStr}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-white group-hover:text-primary/95">
                        {d.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-400">{d.content}</p>
                      {(sp || tk || ld) && (
                        <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          {sp && (
                            <Link
                              to="/sprints"
                              className={cn(
                                "inline-flex max-w-full items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200 transition-colors",
                                "hover:border-cyan-400/45 hover:bg-cyan-500/15",
                              )}
                              title={sp.name}
                            >
                              <KanbanSquare className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                              <span className="truncate">{sp.name}</span>
                            </Link>
                          )}
                          {tk && (
                            <Link
                              to="/tasks"
                              className={cn(
                                "inline-flex max-w-full items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-200 transition-colors",
                                "hover:border-violet-400/45 hover:bg-violet-500/15",
                              )}
                              title={tk.title}
                            >
                              <ListTodo className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                              <span className="truncate">{tk.title}</span>
                            </Link>
                          )}
                          {ld && (
                            <Link
                              to="/commercial"
                              className={cn(
                                "inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200 transition-colors",
                                "hover:border-emerald-400/45 hover:bg-emerald-500/15",
                              )}
                              title={ld.clinic_name}
                            >
                              <Building2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                              <span className="truncate">{ld.clinic_name}</span>
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="hidden shrink-0 flex-col items-end justify-between sm:flex">
                      <span className="text-xs text-slate-500">{dateStr}</span>
                    </div>
                  </div>
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
          className="max-h-[90vh] max-w-2xl gap-0 overflow-hidden border-white/[0.08] p-0 sm:max-w-2xl"
          key={editing?.id ?? "new-entry"}
        >
          <div className="border-b border-white/[0.06] bg-gradient-to-r from-[hsl(218_44%_11%)] to-card px-6 py-5">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-xl font-semibold tracking-tight text-white">
                {editing ? "Editar registo" : "Novo registo no diário"}
              </DialogTitle>
              <p className="text-xs text-slate-500">Título, contexto e memória operacional (decisão, aprendizado, impacto).</p>
            </DialogHeader>
          </div>

          <form onSubmit={onSubmit} className="max-h-[calc(90vh-5.5rem)] space-y-0 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Título *</Label>
                <Input name="title" className="mt-1.5" defaultValue={editing?.title} required placeholder="Ex.: Decisão sobre pacote de onboarding" />
              </div>
              <div>
                <Label className="text-slate-400">Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Escolher…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Sem categoria</SelectItem>
                    {DIARY_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-400">Conteúdo *</Label>
                <Textarea
                  name="content"
                  className="mt-1.5 min-h-[100px] resize-y"
                  defaultValue={editing?.content}
                  required
                  placeholder="Contexto: o que aconteceu, números, conversas relevantes…"
                />
              </div>
            </div>

            <Separator className="my-6 bg-white/[0.06]" />

            <div className="space-y-3">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Memória operacional
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <Scale className="h-3.5 w-3.5 text-sky-400" />
                    Decisão tomada
                  </Label>
                  <Textarea
                    name="decision"
                    className="mt-2 min-h-[88px] border-white/[0.06] bg-transparent text-sm leading-relaxed"
                    defaultValue={editing?.decision ?? ""}
                    placeholder="O que ficou decidido, por quem e com que critério."
                  />
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                    Aprendizado
                  </Label>
                  <Textarea
                    name="learning"
                    className="mt-2 min-h-[88px] border-white/[0.06] bg-transparent text-sm leading-relaxed"
                    defaultValue={editing?.learning ?? ""}
                    placeholder="O que passaríamos a fazer diferente."
                  />
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    Impacto
                  </Label>
                  <Textarea
                    name="impact"
                    className="mt-2 min-h-[88px] border-white/[0.06] bg-transparent text-sm leading-relaxed"
                    defaultValue={editing?.impact ?? ""}
                    placeholder="Efeito esperado ou medido no negócio ou na equipa."
                  />
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <Label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <ArrowRightCircle className="h-3.5 w-3.5 text-primary" />
                    Próxima ação
                  </Label>
                  <Input
                    name="next_action"
                    className="mt-2"
                    defaultValue={editing?.next_action ?? ""}
                    placeholder="Quem faz o quê até quando"
                  />
                </div>
              </div>
            </div>

            <Separator className="my-6 bg-white/[0.06]" />

            <div className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vínculos (opcional)</p>
              <div className="mt-3 grid gap-3">
                <div>
                  <Label className="text-xs text-slate-500">Sprint</Label>
                  <Select value={formSprintId} onValueChange={setFormSprintId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
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
                  <Label className="text-xs text-slate-500">Tarefa</Label>
                  <Select value={formTaskId} onValueChange={setFormTaskId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
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
                  <Label className="text-xs text-slate-500">Lead</Label>
                  <Select value={formLeadId} onValueChange={setFormLeadId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
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

            <DialogFooter className="mt-8 flex flex-row flex-wrap gap-2 border-t border-white/[0.06] bg-card/30 px-0 pt-5">
              {editing && isAdmin && (
                <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={remove}>
                  <Trash2 className="mr-1 h-4 w-4" /> Excluir
                </Button>
              )}
              <Button type="submit" className="ml-auto">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
