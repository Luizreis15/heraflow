import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ArrowLeft, KeyRound } from "lucide-react";

const passwordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres").max(72),
    confirm: z.string().min(8, "Confirme a senha"),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não coincidem", path: ["confirm"] });

const labelClass =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400";
const inputClass =
  "h-11 rounded-lg border-slate-400/22 bg-[hsl(218_44%_9%/0.92)] px-3.5 text-[15px] font-medium text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.045)] transition-all placeholder:text-slate-500/55 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0";
const submitClass =
  "h-11 w-full rounded-lg border border-primary/35 bg-gradient-to-b from-sky-400 to-primary text-[15px] font-semibold tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:from-sky-300 hover:to-sky-500 disabled:hover:translate-y-0";

function snapshotRecoveryFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.replace(/^#/, "");
  if (new URLSearchParams(hash).get("type") === "recovery") return true;
  const search = new URLSearchParams(window.location.search);
  return search.get("type") === "recovery";
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const allowResetRef = useRef(snapshotRecoveryFromUrl());

  useEffect(() => {
    document.title = "Nova senha — Hera DG OS";
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) {
          allowResetRef.current = true;
          setPhase("ready");
        }
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY") {
        allowResetRef.current = true;
        setPhase("ready");
      }
    });

    const decide = () => {
      if (cancelled) return;
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return;
        setPhase((prev) => {
          if (prev === "ready" || prev === "done") return prev;
          const allow = allowResetRef.current;
          if (allow && session?.user) return "ready";
          return "invalid";
        });
      });
    };

    const t1 = window.setTimeout(decide, 100);
    const t2 = window.setTimeout(decide, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (phase !== "ready") return;
    const f = new FormData(e.currentTarget);
    const parsed = passwordSchema.safeParse({
      password: f.get("password"),
      confirm: f.get("confirm"),
    });
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.confirm?.[0] ?? parsed.error.issues[0]?.message;
      return toast.error(msg ?? "Dados inválidos");
    }
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada. A redirecionar…");
    setPhase("done");
    window.setTimeout(() => navigate("/dashboard", { replace: true }), 600);
  };

  return (
    <AuthShell eyebrow="Nova credencial">
      <Card className="login-glass-card border border-white/[0.12] bg-transparent p-8 shadow-none sm:p-10">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>

        <h2 className="text-[1.65rem] font-bold leading-none tracking-tight text-white">Definir nova senha</h2>
        <p className="mt-2.5 text-[15px] font-medium leading-snug text-slate-400">
          Escolha uma senha forte que ainda não use noutros serviços.
        </p>

        {phase === "checking" && (
          <p className="mt-8 text-center text-sm text-slate-400">A validar o link…</p>
        )}

        {phase === "invalid" && (
          <div className="mt-8 rounded-xl border border-white/10 bg-black/30 p-5 text-center text-sm text-slate-300">
            <KeyRound className="mx-auto h-9 w-9 text-slate-500" />
            <p className="mt-3">
              Este link expirou ou já foi utilizado. Solicite um novo e-mail de recuperação.
            </p>
            <Button asChild className={cn(submitClass, "mt-6")}>
              <Link to="/forgot-password">Pedir novo link</Link>
            </Button>
          </div>
        )}

        {phase === "ready" && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="password" className={labelClass}>
                Nova senha
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <Label htmlFor="confirm" className={labelClass}>
                Confirmar senha
              </Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className={inputClass}
                placeholder="Repita a nova senha"
              />
            </div>
            <Button type="submit" className={cn(submitClass, "mt-1")} disabled={phase === "done"}>
              Guardar nova senha
            </Button>
          </form>
        )}

        {phase === "done" && <p className="mt-8 text-center text-sm text-primary">Concluído.</p>}
      </Card>
    </AuthShell>
  );
}
