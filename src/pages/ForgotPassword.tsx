import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPublicAppUrl } from "@/lib/site-url";
import { ArrowLeft, Mail } from "lucide-react";

const emailSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
});

const labelClass =
  "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400";
const inputClass =
  "h-11 rounded-lg border-slate-400/22 bg-[hsl(218_44%_9%/0.92)] px-3.5 text-[15px] font-medium text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.045)] transition-all placeholder:text-slate-500/55 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0";
const submitClass =
  "h-11 w-full rounded-lg border border-primary/35 bg-gradient-to-b from-sky-400 to-primary text-[15px] font-semibold tracking-wide text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:from-sky-300 hover:to-sky-500 disabled:hover:translate-y-0";

export default function ForgotPassword() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = "Recuperar senha — Hera DG OS";
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = emailSchema.safeParse({ email: f.get("email") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const redirectTo = `${getPublicAppUrl()}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Se existir uma conta com este e-mail, enviámos um link para redefinir a senha.");
  };

  return (
    <AuthShell eyebrow="Acesso seguro">
      <Card className="login-glass-card border border-white/[0.12] bg-transparent p-8 shadow-none sm:p-10">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-slate-400 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>

        <h2 className="text-[1.65rem] font-bold leading-none tracking-tight text-white">Recuperar senha</h2>
        <p className="mt-2.5 text-[15px] font-medium leading-snug text-slate-400">
          Indique o e-mail da sua conta. Enviaremos um link válido por tempo limitado.
        </p>

        {sent ? (
          <div className="mt-8 rounded-xl border border-primary/25 bg-primary/10 p-5 text-center">
            <Mail className="mx-auto h-10 w-10 text-primary" strokeWidth={1.5} />
            <p className="mt-4 text-sm font-medium leading-relaxed text-slate-200">
              Verifique a caixa de entrada e o spam. O link abre uma página segura para definir uma nova senha.
            </p>
            <Button asChild variant="outline" className="mt-6 border-white/15 bg-white/5 text-white hover:bg-white/10">
              <Link to="/login">Voltar ao login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email" className={labelClass}>
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClass}
                placeholder="nome@empresa.com"
              />
            </div>
            <Button type="submit" className={cn(submitClass, "mt-1")} disabled={busy}>
              {busy ? "A enviar…" : "Enviar link"}
            </Button>
          </form>
        )}
      </Card>
    </AuthShell>
  );
}
