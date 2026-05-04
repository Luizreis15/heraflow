/** Fallback se a rota `/` for acedida sem redirect (dev); produção redireciona para `/dashboard`. */
export default function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="rounded-xl border border-white/10 bg-card/80 px-8 py-10 shadow-xl ring-1 ring-primary/10">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">HeraFlow</p>
        <p className="mt-2 text-lg font-semibold tracking-tight text-foreground">Command Center</p>
        <p className="mt-3 max-w-sm text-sm text-slate-400">A aplicação redireciona para o dashboard quando autenticado.</p>
      </div>
    </div>
  );
}
