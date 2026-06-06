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
import MaintenanceScreen from "@/components/MaintenanceScreen";

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
  const [maintenance, setMaintenance] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  const checkMaintenance = React.useCallback(() => {
    setChecking(true);
    fetch("/api/maintenance")
      .then((res) => res.json())
      .then((data) => {
        setMaintenance(!!data.maintenance);
      })
      .catch((err) => console.error("Error fetching maintenance status:", err))
      .finally(() => {
        setChecking(false);
      });
  }, []);

  React.useEffect(() => {
    if (user) {
      checkMaintenance();
    } else {
      setChecking(false);
    }
  }, [user, checkMaintenance]);

  if (loading || (checking && user)) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full" style={{ background: "#0d0d12" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-white/40 font-semibold tracking-wide flex items-center gap-2">
            Loading security layer...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = user.email === "ayaanamaan23@gmail.com";
  
  if (maintenance && !isAdmin) {
    return <MaintenanceScreen onCheckStatus={checkMaintenance} isChecking={checking} />;
  }

  return (
    <>
      {maintenance && isAdmin && (
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-4 py-2 text-center text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center justify-center gap-2 z-50">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <span>Maintenance Mode Active (Regular users locked out)</span>
        </div>
      )}
      {children}
    </>
  );
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

