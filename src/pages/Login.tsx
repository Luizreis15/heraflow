import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/auth/AuthShell";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

const labelLoginClass =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400";

const inputLoginClass =
  "h-11 rounded-lg border-slate-400/22 bg-[hsl(218_44%_9%/0.92)] px-3.5 text-[15px] font-medium text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.045)] transition-all duration-200 placeholder:text-slate-500/55 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_1px_hsl(199_89%_48%/0.22)] md:text-[15px]";

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

  return (
    <AuthShell>
      <Card
        className={cn(
          "login-glass-card border border-white/[0.12] bg-transparent p-8 shadow-none sm:p-10",
          "hover:border-white/15 hover:shadow-none",
        )}
      >
        <h2 className="text-[1.65rem] font-bold leading-none tracking-tight text-white">Bem-vindo</h2>
        <p className="mt-2.5 text-[15px] font-medium leading-snug text-slate-400">
          Acesse o sistema operacional da Hera DG
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full border-white/15 bg-white/5 text-[14px] font-medium text-slate-200 shadow-none hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link to="/forgot-password">Esqueci minha senha</Link>
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
