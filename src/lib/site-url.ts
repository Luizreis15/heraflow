/** URL pública do app (links em emails de confirmação / recovery). `VITE_APP_URL` na Vercel; em dev cai no `window.location.origin`. */
export function getPublicAppUrl(): string {
  const raw = import.meta.env.VITE_APP_URL as string | undefined;
  const trimmed = raw?.trim().replace(/\/$/, "");
  if (trimmed) return trimmed;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
