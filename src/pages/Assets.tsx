import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ASSET_CATEGORIES, ASSET_STATUSES, labelOf } from "@/lib/enums";
import { Plus, ExternalLink, Trash2, Library, Link2, Tag, Layers, FileStack } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** URL segura para abrir em novo separador (evita relativos / javascript:) */
function safeExternalHref(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^\/\//.test(t)) return `https:${t}`;
  return `https://${t}`;
}

const CATEGORY_BAR: Record<string, string> = {
  proposal: "from-violet-500 via-violet-400/50 to-violet-600/10",
  contract: "from-emerald-500 via-emerald-400/45 to-emerald-600/10",
  script: "from-sky-500 via-sky-400/45 to-sky-600/10",
  content_script: "from-cyan-500 via-cyan-400/45 to-cyan-600/10",
  creative: "from-fuchsia-500 via-fuchsia-400/40 to-fuchsia-600/10",
  template: "from-slate-400 via-slate-300/40 to-slate-600/10",
  presentation: "from-amber-500 via-amber-400/45 to-amber-600/10",
  diagnosis: "from-primary via-primary/60 to-primary/10",
  checklist: "from-lime-500 via-lime-400/35 to-lime-600/10",
  training: "from-orange-500 via-orange-400/40 to-orange-600/10",
  case: "from-rose-500 via-rose-400/40 to-rose-600/10",
  other: "from-slate-500 via-slate-400/40 to-slate-600/10",
};

const CATEGORY_CHIP: Record<string, string> = {
  proposal: "border-violet-500/35 bg-violet-500/12 text-violet-200",
  contract: "border-emerald-500/35 bg-emerald-500/12 text-emerald-200",
  script: "border-sky-500/35 bg-sky-500/12 text-sky-200",
  content_script: "border-cyan-500/35 bg-cyan-500/12 text-cyan-100",
  creative: "border-fuchsia-500/35 bg-fuchsia-500/12 text-fuchsia-100",
  template: "border-slate-500/35 bg-slate-500/12 text-slate-200",
  presentation: "border-amber-500/35 bg-amber-500/12 text-amber-100",
  diagnosis: "border-primary/40 bg-primary/12 text-primary-foreground",
  checklist: "border-lime-500/35 bg-lime-500/12 text-lime-100",
  training: "border-orange-500/35 bg-orange-500/12 text-orange-100",
  case: "border-rose-500/35 bg-rose-500/12 text-rose-100",
  other: "border-white/10 bg-white/[0.06] text-slate-300",
};

const STATUS_CHIP: Record<string, string> = {
  draft: "border-slate-500/40 bg-slate-500/15 text-slate-200",
  in_use: "border-cyan-500/40 bg-cyan-500/12 text-cyan-100",
  approved: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
  archived: "border-white/15 bg-white/[0.05] text-slate-400",
};

export default function Assets() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [formCategory, setFormCategory] = useState("none");
  const [formStatus, setFormStatus] = useState("draft");

  useEffect(() => {
    document.title = "Biblioteca — Hera DG OS";
    void load();
  }, []);

  const syncForm = useCallback(() => {
    if (!open) return;
    setFormCategory(editing?.category ?? "none");
    setFormStatus(editing?.status ?? "draft");
  }, [open, editing]);

  useEffect(() => {
    syncForm();
  }, [syncForm]);

  const load = async () => {
    const { data } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };

  const filtered = useMemo(
    () => (filterCat === "all" ? items : items.filter((i) => i.category === filterCat)),
    [items, filterCat],
  );

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload: any = {
      name: String(f.get("name") || "").trim(),
      category: formCategory === "none" ? null : formCategory,
      description: String(f.get("description") || "") || null,
      url: String(f.get("url") || "").trim() || null,
      status: formStatus,
      version: String(f.get("version") || "").trim() || null,
    };
    if (!payload.name) return toast.error("Informe o nome");

    if (editing) {
      const { error } = await supabase.from("assets").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      payload.created_by = user?.id;
      const { error } = await supabase.from("assets").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Salvo");
    setOpen(false);
    setEditing(null);
    void load();
  };

  const remove = async () => {
    if (!editing || !confirm("Excluir ativo?")) return;
    const { error } = await supabase.from("assets").delete().eq("id", editing.id);
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Biblioteca de ativos</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Biblioteca</h1>
          <p className="mt-1 text-sm text-slate-400">Materiais, templates e links reutilizáveis da Hera DG.</p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="mr-1 h-4 w-4" /> Novo ativo
        </Button>
      </div>

      <Card className="border-border/70 bg-card/40 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-slate-500">Categoria</span>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-56 border-white/[0.08] bg-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {ASSET_CATEGORIES.map((c) => (
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
          <Library className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-lg font-medium text-slate-300">Nenhum ativo neste filtro</p>
          <p className="mt-1 text-sm text-slate-500">Centralize propostas, scripts e links para a equipa reutilizar com consistência.</p>
          <Button className="mt-6" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar primeiro ativo
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => {
            const cat = a.category ?? "other";
            const bar = CATEGORY_BAR[cat] ?? CATEGORY_BAR.other;
            const chipCat = CATEGORY_CHIP[cat] ?? CATEGORY_CHIP.other;
            const chipSt = STATUS_CHIP[a.status] ?? STATUS_CHIP.draft;
            const href = safeExternalHref(a.url);

            return (
              <Card
                key={a.id}
                className={cn(
                  "group flex cursor-pointer flex-col overflow-hidden border-white/[0.07] bg-gradient-to-br from-card via-card to-[hsl(218_44%_7%)] p-0 shadow-sm transition-all duration-200",
                  "hover:border-primary/28 hover:shadow-[0_14px_44px_-18px_hsl(199_89%_48%/0.18)]",
                )}
                onClick={() => {
                  setEditing(a);
                  setOpen(true);
                }}
              >
                <div className={cn("h-1 w-full bg-gradient-to-r", bar)} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.category ? (
                      <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", chipCat)}>
                        <Tag className="h-3 w-3 opacity-80" />
                        {labelOf(ASSET_CATEGORIES, a.category)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sem categoria</span>
                    )}
                    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", chipSt)}>
                      {labelOf(ASSET_STATUSES, a.status)}
                    </span>
                    {a.version ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-300">
                        <Layers className="h-3 w-3 text-primary/80" />v{a.version}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight text-white group-hover:text-primary/95">{a.name}</h3>
                  {a.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">{a.description}</p>}
                  <div className="mt-auto flex flex-wrap gap-2 pt-4" onClick={(e) => e.stopPropagation()}>
                    {href ? (
                      <Button size="sm" variant="outline" className="border-primary/30 bg-primary/5 hover:bg-primary/10" asChild>
                        <a href={href} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir link
                        </a>
                      </Button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Link2 className="h-3.5 w-3.5" />
                        Sem URL
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-400 hover:text-white"
                      onClick={() => {
                        setEditing(a);
                        setOpen(true);
                      }}
                    >
                      Editar
                    </Button>
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
        <DialogContent className="max-h-[90vh] max-w-lg gap-0 overflow-hidden border-white/[0.08] p-0 sm:max-w-lg" key={editing?.id ?? "new-asset"}>
          <div className="border-b border-white/[0.06] bg-gradient-to-r from-[hsl(218_44%_11%)] to-card px-6 py-5">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-xl font-semibold tracking-tight text-white">{editing ? "Editar ativo" : "Novo ativo"}</DialogTitle>
              <p className="text-xs text-slate-500">Nome, classificação, ligação externa e versão para controlo da biblioteca.</p>
            </DialogHeader>
          </div>

          <form onSubmit={onSubmit} className="max-h-[calc(90vh-5rem)] space-y-0 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Nome *</Label>
                <Input name="name" className="mt-1.5" defaultValue={editing?.name} required placeholder="Ex.: Template de proposta comercial" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-slate-400">Categoria</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Sem categoria</SelectItem>
                      {ASSET_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
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
                      {ASSET_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="my-6 bg-white/[0.06]" />

            <div className="space-y-4">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <FileStack className="h-3.5 w-3.5 text-primary" />
                Ligação e versão
              </p>
              <div>
                <Label className="text-slate-400">URL</Label>
                <Input name="url" type="url" className="mt-1.5 font-mono text-sm" defaultValue={editing?.url ?? ""} placeholder="https://… ou docs.google.com/…" />
                <p className="mt-1 text-[11px] text-slate-600">Endereços sem protocolo recebem https:// ao abrir.</p>
              </div>
              <div>
                <Label className="text-slate-400">Versão</Label>
                <Input name="version" className="mt-1.5 font-mono" defaultValue={editing?.version ?? ""} placeholder="1.0, 2025-Q1…" />
              </div>
              <div>
                <Label className="text-slate-400">Descrição</Label>
                <Textarea name="description" className="mt-1.5 min-h-[88px]" defaultValue={editing?.description ?? ""} rows={3} placeholder="Para que serve e quando usar." />
              </div>
            </div>

            <DialogFooter className="mt-8 flex flex-row flex-wrap gap-2 border-t border-white/[0.06] pt-5">
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
