import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Inbox,
  Users,
  KanbanSquare,
  Megaphone,
  Headphones,
  Workflow,
  BarChart3,
  Settings,
  Sparkles,
  ChevronsUpDown,
  LogOut,
  Brain,
  BookOpen,
  MessageCircle,
  Phone,
  CreditCard,
  Heart,
  Wallet as WalletIcon,
  Plug,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar() {
  const { state } = useSidebar();
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const { workspaces, current, setCurrent } = useWorkspace();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const main = [
    { to: "/app/dashboard", icon: LayoutDashboard, label: t("nav.dashboard") },
    { to: "/app/inbox", icon: Inbox, label: t("nav.inbox") },
  ];
  const ai = [
    { to: "/app/ai", icon: MessageCircle, label: t("nav.ai.chat") },
    { to: "/app/ai/knowledge", icon: BookOpen, label: t("nav.ai.knowledge") },
    { to: "/app/ai/brand-voice", icon: Brain, label: t("nav.ai.brand") },
  ];
  const crm = [
    { to: "/app/crm/contacts", icon: Users, label: t("nav.contacts") },
    { to: "/app/crm/pipeline", icon: KanbanSquare, label: t("nav.pipeline") },
  ];
  const growth = [
    { to: "/app/campaigns", icon: Megaphone, label: t("nav.campaigns") },
    { to: "/app/helpdesk", icon: Headphones, label: t("nav.helpdesk") },
    { to: "/app/automation", icon: Workflow, label: t("nav.automation") },
    { to: "/app/analytics", icon: BarChart3, label: t("nav.analytics") },
  ];
  const calls = [
    { to: "/app/calls", icon: Phone, label: t("nav.calls") },
  ];
  const system = [
    { to: "/app/settings", icon: Settings, label: t("nav.settings") },
    { to: "/app/settings/integrations", icon: Plug, label: "Integrime" },
    { to: "/app/settings/billing", icon: CreditCard, label: "Faturimi" },
    { to: "/app/settings/wallet", icon: WalletIcon, label: "Wallet" },
    { to: "/app/donate", icon: Heart, label: "Mbështet" },
  ];

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(to + "/");

  const renderItem = (item: { to: string; icon: typeof Inbox; label: string }) => (
    <SidebarMenuItem key={item.to}>
      <SidebarMenuButton asChild isActive={isActive(item.to)} tooltip={item.label}>
        <Link to={item.to}>
          <item.icon className="h-4 w-4" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-sidebar-foreground">
                      {current?.name ?? "Muslimi Digital"}
                    </div>
                    <div className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                      {current?.plan ?? "free"} plan
                    </div>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/60" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>{t("common.workspace")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {workspaces.map((w) => (
              <DropdownMenuItem key={w.id} onClick={() => setCurrent(w.id)} className={w.id === current?.id ? "bg-accent" : ""}>
                <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                {w.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{main.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("nav.ai")}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{ai.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("nav.crm")}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{crm.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>{t("nav.callcenter")}</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{calls.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Growth</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{growth.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>System</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{system.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 p-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/80">{user?.email}</div>
              <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground" aria-label={t("common.signout")}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}