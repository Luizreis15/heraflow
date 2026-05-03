import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  KanbanSquare,
  FileText,
  TrendingUp,
  BookOpen,
  Library,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: null },
  { title: "Sprints", url: "/sprints", icon: Calendar, roles: null },
  { title: "Tarefas", url: "/tasks", icon: KanbanSquare, roles: null },
  { title: "Processos", url: "/processes", icon: FileText, roles: null },
  { title: "Comercial", url: "/commercial", icon: TrendingUp, roles: ["admin", "commercial"] },
  { title: "Diário de Bordo", url: "/diary", icon: BookOpen, roles: null },
  { title: "Biblioteca", url: "/assets", icon: Library, roles: null },
  { title: "Configurações", url: "/settings", icon: Settings, roles: ["admin"] },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { profile, hasRole, signOut } = useAuth();

  const visible = items.filter((i) => !i.roles || hasRole(i.roles as any));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold font-serif">
            H
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-serif text-lg font-semibold">Hera DG</span>
              <span className="text-xs opacity-70">Operating System</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navegação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <NavLink to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && profile && (
          <div className="px-2 pb-2 text-xs">
            <div className="font-medium truncate">{profile.full_name}</div>
            <div className="opacity-70 truncate">{profile.email}</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
