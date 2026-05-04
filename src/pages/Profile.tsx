import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ROLES, labelOf } from "@/lib/enums";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { User, Lock, SlidersHorizontal, Sparkles, Moon, Globe, Bell } from "lucide-react";

export default function Profile() {
  const { user, profile, roles, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    document.title = "Meu perfil — Hera DG OS";
  }, []);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  const saveName = async () => {
    if (!user) return;
    const name = fullName.trim();
    if (!name) return toast.error("Indique o nome completo");
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setSavingName(false);
    if (error) return toast.error(error.message);
    toast.success("Nome atualizado");
    await refresh();
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error("A nova senha deve ter pelo menos 8 caracteres.");
    if (newPassword !== confirmPassword) return toast.error("A confirmação não coincide com a nova senha.");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    setNewPassword("");
    setConfirmPassword("");
  };

  const primaryRole = roles[0] ?? "viewer";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Conta</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Meu perfil</h1>
        <p className="mt-1 text-sm text-slate-400">Dados pessoais, segurança e preferências da sua conta HeraFlow.</p>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList
          className={cn(
            "flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-white/[0.08] bg-black/25 p-1.5",
            "text-slate-400",
          )}
        >
          <TabsTrigger
            value="dados"
            className="gap-2 rounded-lg data-[state=active]:border data-[state=active]:border-primary/35 data-[state=active]:bg-primary/12 data-[state=active]:text-white"
          >
            <User className="h-4 w-4" />
            Dados pessoais
          </TabsTrigger>
          <TabsTrigger
            value="seguranca"
            className="gap-2 rounded-lg data-[state=active]:border data-[state=active]:border-primary/35 data-[state=active]:bg-primary/12 data-[state=active]:text-white"
          >
            <Lock className="h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger
            value="prefs"
            className="gap-2 rounded-lg data-[state=active]:border data-[state=active]:border-primary/35 data-[state=active]:bg-primary/12 data-[state=active]:text-white"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Preferências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-6 space-y-6 outline-none">
          <Card className="border-white/[0.08] bg-gradient-to-br from-card/90 to-[hsl(218_44%_7%)] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div
                className={cn(
                  "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/15",
                  "bg-black/30 text-2xl font-bold text-slate-500",
                )}
                aria-hidden
              >
                {profile?.full_name?.trim()?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <p className="text-xs text-slate-500">Avatar — upload em breve.</p>
                <div>
                  <Label className="text-slate-400">Nome completo</Label>
                  <Input
                    className="mt-1.5 border-white/[0.08] bg-black/25"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="O seu nome"
                  />
                </div>
                <div>
                  <Label className="text-slate-400">E-mail</Label>
                  <Input className="mt-1.5 border-white/[0.06] bg-black/40 text-slate-400" value={profile?.email ?? ""} readOnly disabled />
                  <p className="mt-1 text-[11px] text-slate-600">O e-mail não pode ser alterado nesta versão.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Papel</span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {labelOf(ROLES, primaryRole)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                      profile?.is_active
                        ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-600 bg-slate-800 text-slate-400",
                    )}
                  >
                    {profile?.is_active ? "Conta ativa" : "Conta inativa"}
                  </span>
                </div>
                <Button type="button" onClick={() => void saveName()} disabled={savingName}>
                  {savingName ? "A guardar…" : "Guardar nome"}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca" className="mt-6 outline-none">
          <Card className="border-white/[0.08] bg-gradient-to-br from-card/90 to-[hsl(218_44%_7%)] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Lock className="h-5 w-5 text-primary" />
              Alterar senha
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Por segurança, use uma senha forte. Ao alterar, a sessão pode ser renovada automaticamente. O Supabase não
              exige a senha atual neste fluxo.
            </p>
            <Separator className="my-5 bg-white/[0.06]" />
            <form onSubmit={(e) => void changePassword(e)} className="max-w-md space-y-4">
              <div>
                <Label className="text-slate-400">Nova senha</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1.5 border-white/[0.08] bg-black/25"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <Label className="text-slate-400">Confirmar nova senha</Label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1.5 border-white/[0.08] bg-black/25"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={savingPw}>
                {savingPw ? "A atualizar…" : "Atualizar senha"}
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="prefs" className="mt-6 outline-none">
          <Card className="border-white/[0.08] bg-gradient-to-br from-card/90 to-[hsl(218_44%_7%)] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Preferências
            </h2>
            <p className="mt-2 text-sm text-slate-500">Definições de experiência. No MVP, valores estão fixos.</p>
            <Separator className="my-5 bg-white/[0.06]" />
            <ul className="space-y-4">
              <li className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-slate-300">
                  <Moon className="h-4 w-4 text-slate-500" />
                  Tema
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3 w-3" />
                  Dark premium
                </span>
              </li>
              <li className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-slate-300">
                  <Globe className="h-4 w-4 text-slate-500" />
                  Idioma
                </span>
                <span className="text-xs font-medium text-slate-500">PT-BR (fixo)</span>
              </li>
              <li className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3 opacity-70">
                <span className="flex items-center gap-2 text-sm text-slate-300">
                  <Bell className="h-4 w-4 text-slate-500" />
                  Notificações
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Em breve
                </span>
              </li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
