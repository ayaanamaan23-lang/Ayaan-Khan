import * as React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AlertsPage from "@/pages/AlertsPage";
import ReportsPage from "@/pages/ReportsPage";
import ActivityPage from "@/pages/ActivityPage";
import ProfilePage from "@/pages/ProfilePage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import AdminPage from "@/pages/AdminPage";
import BottomNav from "@/components/BottomNav";
import NotFound from "@/pages/not-found";
import { FirebaseProvider, useFirebase } from "@/components/FirebaseProvider";
import LoginPage from "@/pages/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useFirebase();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full" style={{ background: "#0d0d12" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/40 font-semibold tracking-wide">Connecting securely...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <>{children}</>;
}

function AppShell() {
  return (
    <div className="flex flex-col h-full max-w-md mx-auto relative overflow-hidden" style={{ background: "#0d0d12" }}>
      <div className="flex-1 overflow-hidden">
        <Switch>
          <Route path="/"             component={AlertsPage}      />
          <Route path="/leaderboard"  component={LeaderboardPage} />
          <Route path="/activity"     component={ActivityPage}    />
          <Route path="/profile"      component={ProfilePage}     />
          <Route path="/reports"      component={ReportsPage}     />
          <Route path="/admin"        component={AdminPage}       />
          <Route                      component={NotFound}        />
        </Switch>
      </div>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FirebaseProvider>
          <AuthGate>
            <WouterRouter base={(import.meta as any).env.BASE_URL.replace(/\/$/, "")}>
              <AppShell />
            </WouterRouter>
          </AuthGate>
        </FirebaseProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

