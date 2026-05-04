/** Mensagens em PT para erros comuns do Supabase Auth no login. */
export function formatAuthLoginError(err: { message: string; code?: string; status?: number }): string {
  const raw = (err.message ?? "").trim();
  const lower = raw.toLowerCase();
  const code = (err.code ?? "").toLowerCase();

  if (
    code === "email_not_confirmed" ||
    lower.includes("email not confirmed") ||
    lower.includes("email address not confirmed")
  ) {
    return "Este e-mail ainda não foi confirmado. Abra o link no e-mail de convite ou peça a um administrador para marcar o utilizador como confirmado no Supabase (Authentication → Users).";
  }

  if (
    code === "invalid_credentials" ||
    lower.includes("invalid login credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "E-mail ou senha não coincidem com este projeto — ou a conta não está confirmada. Confirme no Supabase que o utilizador existe neste projecto (mesmo URL que em VITE_SUPABASE_URL na Vercel) e que está «Confirmed». Experimente também uma janela anónima para descartar sessão antiga.";
  }

  return raw || "Não foi possível iniciar sessão.";
}
