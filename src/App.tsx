import "./styles/maplibre.css";
import "./styles/pwa-enhancements.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PermissionProvider } from "./contexts/PermissionContext";
import { TimerProvider } from "./contexts/TimerContext";
import { pwaManager } from "./utils/pwa";
import { useEffect, Suspense, lazy } from "react";
import RootRedirect from "./pages/Root";
import ErrorBoundary from "./components/ErrorBoundary";

// Route-based code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EmployeeDashboard = lazy(() => import("./pages/dashboards/EmployeeDashboard"));
const ManagerDashboard = lazy(() => import("./pages/dashboards/ManagerDashboard"));
const SupervisorDashboard = lazy(() => import("./pages/dashboards/SupervisorDashboard"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Chat = lazy(() => import("./pages/Chat"));
const PettyCash = lazy(() => import("./pages/PettyCash"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Geofences = lazy(() => import("./pages/Geofences"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Reports = lazy(() => import("./pages/Reports"));
const Jobs = lazy(() => import("./pages/Jobs"));
const PermissionManagement = lazy(() => import("./pages/PermissionManagement"));
const AdminTeamManagement = lazy(() => import("./pages/AdminTeamManagement"));
const Helpdesk = lazy(() => import("./pages/Helpdesk"));
const HelpdeskAdmin = lazy(() => import("./pages/HelpdeskAdmin"));
const AdminJobReport = lazy(() => import("./pages/AdminJobReport"));
const Invoices = lazy(() => import("./pages/Invoices"));
// NotFound page removed

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes cache retention
      refetchOnWindowFocus: false, // don't refetch on window focus
      retry: 1, // retry failed queries once
    },
  },
});

const App = () => {
  useEffect(() => {
    // Initialize PWA manager and push notifications (delayed for performance)
    const timer = setTimeout(async () => {
      await pwaManager.init();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <PermissionProvider>
                <TimerProvider>
                    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 text-muted-foreground">Loading...</div>}>
                      <Routes>
                        <Route path="/" element={<RootRedirect />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/dashboard/admin" element={<Dashboard />} />
                        <Route path="/dashboard/manager" element={<ManagerDashboard />} />
                        <Route path="/dashboard/supervisor" element={<SupervisorDashboard />} />
                        <Route path="/dashboard/employee" element={<EmployeeDashboard />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/petty-cash" element={<PettyCash />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/geofences" element={<Geofences />} />
                        <Route path="/jobs" element={<Jobs />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/permissions" element={<PermissionManagement />} />
                        <Route path="/team" element={<AdminTeamManagement />} />
                        <Route path="/helpdesk" element={<Helpdesk />} />
                        <Route path="/helpdesk/admin" element={<HelpdeskAdmin />} />
                        <Route path="/admin-job-report" element={<AdminJobReport />} />
                        <Route path="/invoices" element={<Invoices />} />
                        {/* Catch-all redirect to home */}
                        <Route path="*" element={<RootRedirect />} />
                      </Routes>
                    </Suspense>
                  </TimerProvider>
              </PermissionProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
