import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, AppRole } from "@/contexts/AuthContext";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: AppRole[];
}) {
  const { user, loading, hasRole, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (profile && !profile.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <h2 className="font-serif text-2xl mb-2">Conta inativa</h2>
          <p className="text-muted-foreground">Fale com um administrador para reativar seu acesso.</p>
        </div>
      </div>
    );
  }
  if (roles && !hasRole(roles)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
