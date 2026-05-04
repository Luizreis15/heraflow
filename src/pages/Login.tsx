import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Informe seu nome").max(100),
});

const labelLoginClass =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400";

const inputLoginClass =
  "h-11 rounded-lg border-slate-400/22 bg-[hsl(218_44%_9%/0.92)] px-3.5 text-[15px] font-medium text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.045)] transition-all duration-200 placeholder:text-slate-500/55 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_1px_hsl(199_89%_48%/0.22)] md:text-[15px]";

const tabsListClass =
  "mb-8 grid h-12 w-full grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-black/30 p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md";

const tabsTriggerClass =
  "rounded-lg py-2.5 text-[13px] font-semibold tracking-wide text-slate-500 transition-all duration-200 data-[state=active]:bg-gradient-to-b data-[state=active]:from-primary/22 data-[state=active]:to-primary/[0.07] data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_0_24px_-10px_hsl(199_89%_48%/0.45)] data-[state=active]:border data-[state=active]:border-primary/25 data-[state=inactive]:hover:text-slate-300";

const submitButtonClass =
  "h-11 w-full rounded-lg border border-primary/35 bg-gradient-to-b from-sky-400 to-primary text-[15px] font-semibold tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:from-sky-300 hover:to-sky-500 hover:shadow-xl hover:shadow-primary/35 active:translate-y-0 disabled:hover:translate-y-0";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Entrar — Hera DG OS";
  }, []);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: f.get("email"), password: f.get("password") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate("/dashboard");
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      fullName: f.get("fullName"),
      email: f.get("email"),
      password: f.get("password"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Você já pode entrar.");
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div
        className={cn(
          "relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[hsl(222_47%_3.5%)] lg:flex",
          "login-hero-grid",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_15%_-5%,hsl(199_89%_48%/0.2),transparent_58%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_95%_15%,hsl(239_70%_55%/0.14),transparent_52%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[hsl(222_47%_4%)] via-transparent to-[hsl(222_47%_3%)]"
        />

        <div className="relative z-10 px-12 pb-8 pt-12">
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                "border border-primary/55 bg-gradient-to-br from-slate-950 to-slate-900",
                "shadow-[0_0_28px_-4px_hsl(199_89%_48%_/_0.5)]",
              )}
            >
              <Hexagon className="h-6 w-6 text-primary" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 leading-tight">
              <div className="text-xl font-bold tracking-tight text-white">HeraFlow</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                Command Center
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-12 py-10">
          <div className="max-w-lg rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[hsl(222_47%_6%/0.92)] via-[hsl(222_47%_5%/0.55)] to-transparent p-8 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.5)] backdrop-blur-[2px]">
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.025em] text-white sm:text-[2.65rem]">
              O cockpit interno da Hera DG.
            </h1>
            <p className="mt-5 max-w-md text-[15px] font-medium leading-relaxed text-slate-300">
              Sprints, tarefas, processos, comercial e diário de bordo no mesmo lugar. Cada execução vira
              ativo. Cada aprendizado vira processo.
            </p>
          </div>
        </div>

        <div className="relative z-10 px-12 pb-12 pt-4 text-[11px] font-medium tracking-wide text-slate-500">
          © Digital Hera
        </div>
      </div>

      <div
        className={cn(
          "login-form-panel relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35] login-hero-grid lg:opacity-25"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-5%,hsl(199_89%_48%/0.12),transparent_55%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"
        />

        <Card
          className={cn(
            "login-glass-card relative z-10 w-full max-w-[420px] border border-white/[0.12] bg-transparent p-8 shadow-none sm:p-10",
            "hover:border-white/15 hover:shadow-none",
          )}
        >
          <h2 className="text-[1.65rem] font-bold leading-none tracking-tight text-white">Bem-vindo</h2>
          <p className="mt-2.5 text-[15px] font-medium leading-snug text-slate-400">
            Acesse o sistema operacional da Hera DG
          </p>

          <Tabs defaultValue="login" className="mt-8">
            <TabsList className={tabsListClass}>
              <TabsTrigger value="login" className={tabsTriggerClass}>
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className={tabsTriggerClass}>
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0 outline-none">
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <Label htmlFor="email" className={labelLoginClass}>
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={inputLoginClass}
                    placeholder="nome@empresa.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className={labelLoginClass}>
                    Senha
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={inputLoginClass}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" className={cn(submitButtonClass, "mt-1")} disabled={busy}>
                  {busy ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0 outline-none">
              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <Label htmlFor="fullName" className={labelLoginClass}>
                    Nome completo
                  </Label>
                  <Input id="fullName" name="fullName" required className={inputLoginClass} placeholder="Seu nome" />
                </div>
                <div>
                  <Label htmlFor="email-s" className={labelLoginClass}>
                    E-mail
                  </Label>
                  <Input
                    id="email-s"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={inputLoginClass}
                    placeholder="nome@empresa.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password-s" className={labelLoginClass}>
                    Senha
                  </Label>
                  <Input
                    id="password-s"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className={inputLoginClass}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <Button type="submit" className={cn(submitButtonClass, "mt-1")} disabled={busy}>
                  {busy ? "Criando..." : "Criar conta"}
                </Button>
                <p className="pt-1 text-center text-[12px] leading-relaxed text-slate-500">
                  Novos usuários começam como <span className="font-semibold text-slate-400">viewer</span>. Um Admin
                  precisa promover seu acesso.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
