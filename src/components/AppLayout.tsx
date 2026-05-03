import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { GlobalNewButton } from "./GlobalNewButton";

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <GlobalNewButton />
          </header>
          <main className="flex-1 p-6 overflow-auto">{children ?? <Outlet />}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
