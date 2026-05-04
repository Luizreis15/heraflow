import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Shield,
  Sparkles,
  UserCircle,
} from "lucide-react";

const steps = [
  {
    icon: CheckCircle2,
    title: "Conta confirmada",
    body: "O seu e-mail está validado. A partir daqui usa sempre o mesmo login para aceder ao cockpit.",
  },
  {
    icon: Shield,
    title: "Começa como viewer",
    body: "Por segurança, novos colaboradores entram com leitura ampla. Um administrador promove o papel (operação, comercial, etc.) quando fizer sentido.",
  },
  {
    icon: UserCircle,
    title: "Complete o perfil",
    body: "No separador Conta pode ajustar o nome apresentado e, mais tarde, preferências de trabalho.",
  },
  {
    icon: LayoutDashboard,
    title: "Explore o cockpit",
    body: "Dashboard, tarefas, sprints e diário de bordo estão à sua espera — o mapa da execução da Hera DG.",
  },
];

export default function WelcomeCollaborator() {
  const { user, loading, profile, roles } = useAuth();

  useEffect(() => {
    document.title = "Bem-vindo — Hera DG OS";
  }, []);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <AuthShell eyebrow="Onboarding">
        <Card className="login-glass-card border border-white/[0.12] bg-transparent p-10 text-center text-slate-400">
          A preparar o seu espaço…
        </Card>
      </AuthShell>
    );
  }

  const firstName = profile?.full_name?.trim()?.split(/\s+/)[0] ?? user?.email?.split("@")[0] ?? "Colaborador";

  return (
    <AuthShell eyebrow="Novos colaboradores">
      <div className="space-y-6">
        <Card className="login-glass-card border border-white/[0.12] bg-gradient-to-br from-[hsl(218_44%_10%/0.85)] to-transparent p-8 shadow-none sm:p-10">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/35",
                "bg-primary/15 text-primary",
              )}
            >
              <Sparkles className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Ambiente de integração</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]">
                Olá, {firstName} — bem-vindo à equipa.
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
                Este é o <span className="font-semibold text-slate-200">HeraFlow</span>, o sistema operacional interno
                da Digital Hera. Reserve dois minutos para perceber como vamos trabalhar juntos.
              </p>
            </div>
          </div>

          <ul className="mt-8 space-y-4">
            {steps.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex gap-4 rounded-xl border border-white/[0.07] bg-black/25 px-4 py-4 sm:px-5"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              className="h-12 flex-1 rounded-lg border border-primary/35 bg-gradient-to-b from-sky-400 to-primary text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/25"
            >
              <Link to="/dashboard">
                Entrar no cockpit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Link to="/profile">Ajustar perfil primeiro</Link>
            </Button>
          </div>

          <p className="mt-6 text-center text-[12px] text-slate-500">
            O seu papel atual:{" "}
            <span className="font-semibold text-slate-300">{roles[0] ?? "viewer"}</span>. Dúvidas? Fale com a
            operação ou um administrador no Slack / e-mail interno.
          </p>
        </Card>
      </div>
    </AuthShell>
  );
}
