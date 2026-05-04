import { ReactNode } from "react";
import { Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: ReactNode;
  /** Texto curto sob o logo (ex.: "Recuperar senha") */
  eyebrow?: string;
};

export function AuthShell({ children, eyebrow }: AuthShellProps) {
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
                {eyebrow ?? "Command Center"}
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
              Sprints, tarefas, processos, comercial e diário de bordo no mesmo lugar. Cada execução vira ativo. Cada
              aprendizado vira processo.
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
        <div className="relative z-10 w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
