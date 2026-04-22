import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Softphone } from "@/calls/components/Softphone";
import { TrialBanner } from "@/components/TrialBanner";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { TrialExpiredOverlay } from "@/components/TrialExpiredOverlay";
import { AssistantChat } from "@/components/AssistantChat";
import { useWorkspaceAccess } from "@/hooks/useWorkspaceAccess";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const access = useWorkspaceAccess();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth/login" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <PaymentTestModeBanner />
          <TrialBanner />
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-xl">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <LanguageToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
        <Softphone />
        <AssistantChat />
        {access.blocked && <TrialExpiredOverlay reason={access.reason} />}
      </div>
    </SidebarProvider>
  );
}