import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { GlobalNewButton } from "./GlobalNewButton";

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <header className="glass-panel sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-foreground/90 hover:bg-primary/10 hover:text-primary" />
            </div>
            <GlobalNewButton />
          </header>
          <main className="relative flex-1 overflow-auto p-6 md:p-8">
            <div className="pointer-events-none absolute inset-0 subtle-grid-bg opacity-[0.35]" aria-hidden />
            <div className="relative z-10 min-h-0">{children ?? <Outlet />}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
