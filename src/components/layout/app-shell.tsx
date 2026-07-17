import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  MessageSquare,
  FileText,
  Settings,
  LogOut,
  Zap,
  Search,
  FileBarChart,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { store, useStore } from "@/lib/store";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Prospectar", url: "/prospect", icon: Search },
  { title: "Auditoria", url: "/audit", icon: FileBarChart },
  { title: "Leads", url: "/leads", icon: Users },
  { title: "Campanhas", url: "/campaigns", icon: Megaphone },
  { title: "Templates", url: "/templates", icon: FileText },
  { title: "Mensagens", url: "/messages", icon: MessageSquare },
  { title: "Configurações", url: "/settings", icon: Settings },
];

function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const session = useStore((s) => s.session);
  const wppConnected = useStore((s) => s.wpp_connected);
  const navigate = useNavigate();

  const initials = (session?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Nexus360</span>
            <span className="text-xs text-muted-foreground">CRM WhatsApp</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>WhatsApp</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 group-data-[collapsible=icon]:hidden">
              <Badge variant={wppConnected ? "default" : "secondary"} className="w-full justify-center">
                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${wppConnected ? "bg-emerald-400" : "bg-rose-400"}`} />
                {wppConnected ? "Conectado" : "Desconectado"}
              </Badge>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">{session?.name}</span>
            <span className="truncate text-xs text-muted-foreground">{session?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 group-data-[collapsible=icon]:hidden"
            onClick={async () => {
              const { supabase } = await import("@/integrations/supabase/client");
              await supabase.auth.signOut();
              store.signOut();
              navigate({ to: "/signin" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  const session = useStore((s) => s.session);
  const navigate = useNavigate();

  useEffect(() => {
    store.init();
  }, []);

  useEffect(() => {
    if (!session) {
      const t = setTimeout(() => {
        if (!store.get().session) navigate({ to: "/signin" });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [session, navigate]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b bg-background/60 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="flex flex-1 items-center justify-between gap-3">
              <h1 className="text-base font-semibold tracking-tight">{title}</h1>
              <div className="flex items-center gap-2">{actions}</div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
