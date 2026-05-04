/** URL pública do app (links em emails de confirmação / recovery). `VITE_APP_URL` na Vercel; em dev cai no `window.location.origin`. */
/** Host do projecto Supabase a partir de `VITE_SUPABASE_URL` (para diagnóstico no login). */
export function getSupabaseHostFromEnv(): string | null {
  const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).host;
  } catch {
    return null;
  }
}

export function getPublicAppUrl(): string {
  const raw = import.meta.env.VITE_APP_URL as string | undefined;
  const trimmed = raw?.trim().replace(/\/$/, "");
  if (trimmed) return trimmed;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
