import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="max-w-md rounded-xl border border-white/10 bg-card/80 p-10 text-center shadow-2xl ring-1 ring-primary/10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">HeraFlow</p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-foreground">404</h1>
        <p className="mt-2 text-sm font-medium text-slate-400">Esta rota não existe no Command Center.</p>
        <Button asChild className="mt-8 w-full">
          <Link to="/dashboard">Voltar ao dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
