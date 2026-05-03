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

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Informe seu nome").max(100),
});

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
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center font-serif font-bold text-xl">H</div>
            <div>
              <div className="font-serif text-xl">Hera DG</div>
              <div className="text-xs opacity-80">Operating System</div>
            </div>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="font-serif text-4xl leading-tight">O cockpit interno da Hera DG.</h1>
          <p className="opacity-80">
            Sprints, tarefas, processos, comercial e diário de bordo no mesmo lugar.
            Cada execução vira ativo. Cada aprendizado vira processo.
          </p>
        </div>
        <div className="text-xs opacity-60">© Digital Hera</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-[var(--shadow-soft)]">
          <h2 className="font-serif text-2xl mb-1">Bem-vindo</h2>
          <p className="text-sm text-muted-foreground mb-6">Acesse o sistema operacional da Hera DG</p>

          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" name="password" type="password" autoComplete="current-password" required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input id="fullName" name="fullName" required />
                </div>
                <div>
                  <Label htmlFor="email-s">E-mail</Label>
                  <Input id="email-s" name="email" type="email" autoComplete="email" required />
                </div>
                <div>
                  <Label htmlFor="password-s">Senha</Label>
                  <Input id="password-s" name="password" type="password" autoComplete="new-password" required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Criando..." : "Criar conta"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Novos usuários começam como <strong>viewer</strong>. Um Admin precisa promover seu acesso.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
