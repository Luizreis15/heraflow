import type { AppRole } from "@/contexts/AuthContext";

export type PermissionBadge = "full" | "read" | "own" | "none";

export type PermissionRow = {
  area: string;
  admin: PermissionBadge;
  operation: PermissionBadge;
  editor_support: PermissionBadge;
  commercial: PermissionBadge;
  viewer: PermissionBadge;
};

/** Matriz estática alinhada às rotas e RLS atuais (MVP). */
export const ADMIN_PERMISSIONS_MATRIX: PermissionRow[] = [
  { area: "Dashboard", admin: "full", operation: "read", editor_support: "read", commercial: "read", viewer: "read" },
  { area: "Sprints", admin: "full", operation: "full", editor_support: "read", commercial: "read", viewer: "read" },
  { area: "Tarefas", admin: "full", operation: "full", editor_support: "own", commercial: "own", viewer: "read" },
  { area: "Processos", admin: "full", operation: "full", editor_support: "read", commercial: "read", viewer: "read" },
  { area: "Comercial", admin: "full", operation: "read", editor_support: "read", commercial: "full", viewer: "read" },
  { area: "Diário", admin: "full", operation: "read", editor_support: "read", commercial: "read", viewer: "read" },
  { area: "Biblioteca", admin: "full", operation: "full", editor_support: "read", commercial: "own", viewer: "read" },
  { area: "Configurações", admin: "full", operation: "none", editor_support: "none", commercial: "none", viewer: "none" },
  { area: "Perfil", admin: "full", operation: "own", editor_support: "own", commercial: "own", viewer: "own" },
];

export const PERMISSION_BADGE_LABEL: Record<PermissionBadge, string> = {
  full: "Acesso total",
  read: "Leitura",
  own: "Próprio / atribuído",
  none: "Sem acesso",
};

export function permissionCell(row: PermissionRow, role: AppRole): PermissionBadge {
  switch (role) {
    case "admin":
      return row.admin;
    case "operation":
      return row.operation;
    case "editor_support":
      return row.editor_support;
    case "commercial":
      return row.commercial;
    case "viewer":
      return row.viewer;
    default:
      return "none";
  }
}
