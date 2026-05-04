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
  Hexagon,
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
import { cn } from "@/lib/utils";

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
      <SidebarHeader className="border-b border-sidebar-border/60 px-4 py-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              "border border-primary/50 bg-gradient-to-br from-slate-950 to-slate-900",
              "shadow-[0_0_20px_-4px_hsl(199_89%_48%_/_0.45)]",
            )}
          >
            <Hexagon className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-base font-bold tracking-tight text-sidebar-foreground">
                HeraFlow
              </span>
              <span className="text-[11px] font-medium uppercase tracking-widest text-primary/90">
                Command Center
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/45">
              Navegação
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visible.map((item) => {
                const active = pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        "h-9 transition-all duration-200",
                        "hover:translate-x-1 hover:bg-sidebar-accent/80",
                        "data-[active=true]:translate-x-0 data-[active=true]:border data-[active=true]:border-primary/35",
                        "data-[active=true]:bg-primary/12 data-[active=true]:text-sidebar-accent-foreground",
                        "data-[active=true]:shadow-[inset_0_0_0_1px_hsl(199_89%_48%_/_0.25),0_0_22px_-8px_hsl(199_89%_48%_/_0.35)]",
                      )}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm font-medium",
                          active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/75",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors duration-200",
                            active ? "text-primary" : "text-sidebar-foreground/55",
                          )}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        {!collapsed && profile && (
          <div className="mb-2 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/30 px-3 py-2.5 backdrop-blur-sm">
            <div className="truncate text-xs font-semibold text-sidebar-foreground">{profile.full_name}</div>
            <div className="truncate text-[11px] text-sidebar-foreground/55">{profile.email}</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn(
            "w-full justify-start gap-2 text-sidebar-foreground/80 transition-all duration-200",
            "hover:bg-destructive/10 hover:text-red-300",
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
