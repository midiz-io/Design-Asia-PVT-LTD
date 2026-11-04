import React, { ReactNode, useMemo } from 'react';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  CheckSquare,
  MapPin,
  MessageSquare,
  DollarSign,
  Package,
  Shield,
  LogOut,
  Menu,
  Users,
  BarChart3 as BarChartIcon,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { signOut, user, isAdmin, isManager, isSupervisor, isEmployee } = useAuth();
  const { canEdit, hasAccess } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const getDashboardRoute = () => {
    if (isAdmin) return '/dashboard/admin';
    if (isManager) return '/dashboard/manager';
    if (isSupervisor) return '/dashboard/supervisor';
    if (isEmployee) return '/dashboard/employee';
    return '/dashboard';
  };

  const navItems = useMemo(() => {
    const allItems: Array<{ path: string; icon: React.ElementType; label: string; resource: Parameters<typeof hasAccess>[0] | null }> = [
      { path: getDashboardRoute(), icon: LayoutDashboard, label: 'Dashboard', resource: 'dashboard' },
      { path: '/jobs', icon: FileText, label: 'Jobs', resource: 'jobs' },
      { path: '/tasks', icon: CheckSquare, label: 'Tasks', resource: 'tasks' },
      { path: '/team', icon: Users, label: 'Team Management', resource: 'team' },
      { path: '/chat', icon: MessageSquare, label: 'Chat', resource: 'chat' },
      { path: '/petty-cash', icon: DollarSign, label: 'Petty Cash', resource: 'petty_cash' },
      { path: '/inventory', icon: Package, label: 'Inventory', resource: 'inventory' },
      { path: '/geofences', icon: Shield, label: 'Geofences', resource: 'geofences' },
      { path: '/users', icon: Users, label: 'Users', resource: 'users' },
      { path: '/reports', icon: BarChartIcon, label: 'Reports', resource: 'reports' },
      { path: '/admin-job-report', icon: FileText, label: 'Job Report', resource: 'job_report' },
      { path: '/invoices', icon: FileText, label: 'Invoices', resource: 'invoices' },
      { path: '/permissions', icon: Settings, label: 'Permissions', resource: 'permissions' },
    ];

    return allItems.filter(item => {
      if (item.resource === 'dashboard' || item.resource === null) return true;
      return hasAccess(item.resource);
    });
  }, [isAdmin, isManager, isSupervisor, isEmployee, hasAccess]);

  const prefetchRoute = (path: string) => {
    switch (path) {
      case '/dashboard/admin':
      case '/dashboard': import('@/pages/Dashboard'); break;
      case '/dashboard/manager': import('@/pages/dashboards/ManagerDashboard'); break;
      case '/dashboard/supervisor': import('@/pages/dashboards/SupervisorDashboard'); break;
      case '/dashboard/employee': import('@/pages/dashboards/EmployeeDashboard'); break;
      case '/jobs': import('@/pages/Jobs'); break;
      case '/tasks': import('@/pages/Tasks'); break;
      case '/team': import('@/pages/AdminTeamManagement'); break;
      case '/chat': import('@/pages/Chat'); break;
      case '/petty-cash': import('@/pages/PettyCash'); break;
      case '/inventory': import('@/pages/Inventory'); break;
      case '/geofences': import('@/pages/Geofences'); break;
      case '/users': import('@/pages/UserManagement'); break;
      case '/reports': import('@/pages/Reports'); break;
      case '/admin-job-report': import('@/pages/AdminJobReport'); break;
      case '/invoices': import('@/pages/Invoices'); break;
      case '/permissions': import('@/pages/PermissionManagement'); break;
    }
  };


  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const renderNavContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full overflow-y-auto relative">
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'} p-3 sm:p-4 border-b relative`}>
        <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-xl flex-shrink-0">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h2 className="font-bold text-sm sm:text-base truncate">TaskVision</h2>
            <p className="text-xs text-muted-foreground truncate">Enterprise Management</p>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 sm:p-4 space-y-1 sm:space-y-2 overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full h-9 sm:h-10 text-sm ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
                title={collapsed ? item.label : undefined}
                onMouseEnter={() => prefetchRoute(item.path)}
              >
                <Icon className={`w-4 h-4 shrink-0 ${collapsed ? '' : 'mr-2 sm:mr-3'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 sm:p-4 border-t space-y-2 sm:space-y-3">
        <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10 shrink-0">
            <AvatarFallback className="text-xs sm:text-sm">{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">{user?.email}</p>
              {(isAdmin || isManager || isSupervisor || isEmployee) && (
                <Badge variant={isAdmin ? 'destructive' : isManager ? 'success' : isSupervisor ? 'warning' : 'default'} className="text-xs mt-1">
                  {isAdmin ? 'Admin' : isManager ? 'Manager' : isSupervisor ? 'Supervisor' : 'Employee'}
                </Badge>
              )}
            </div>
          )}
        </div>
        <Button onClick={handleSignOut} variant="outline" className={`w-full h-9 sm:h-10 text-sm ${collapsed ? 'px-0 justify-center' : ''}`} title={collapsed ? "Sign Out" : undefined}>
          <LogOut className={`w-4 h-4 shrink-0 ${collapsed ? '' : 'mr-2'}`} />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r bg-card h-screen flex-shrink-0 transition-all duration-300 relative ${isCollapsed ? 'w-[5rem]' : 'w-64'}`}
      >
        <Button 
          variant="outline" 
          size="icon"
          className="absolute -right-3 top-6 h-6 w-6 rounded-full z-10 bg-background shadow-md border-border text-muted-foreground hover:text-foreground"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {renderNavContent(isCollapsed)}
      </aside>

      {/* Floating PWA Install prompt (appears when available) */}
      <div id="pwa-install-anchor" className="hidden md:block pwa-floating"></div>

      {/* Mobile Header — fixed, accounts for iOS notch */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b flex items-center justify-between px-3 sm:px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)', paddingBottom: '0.75rem' }}>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-gradient-primary rounded-lg flex-shrink-0">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm sm:text-base">TaskVision</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 sm:w-80">
              {renderNavContent(false)}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content — accounts for mobile header height + safe area */}
      <main
        className="flex-1 overflow-x-hidden overflow-y-auto md:pt-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.75rem)' }}
      >
        <div
          className="container mx-auto p-3 sm:p-4 md:p-6 max-w-full animate-fade-in"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {(() => {
            const path = location.pathname;
            const toResource = () => {
              if (path.startsWith('/dashboard')) return 'dashboard' as const;
              if (path.startsWith('/tasks')) return 'tasks' as const;
              if (path.startsWith('/jobs')) return 'jobs' as const;
              if (path.startsWith('/team')) return 'team' as const;
              if (path.startsWith('/chat')) return 'chat' as const;
              if (path.startsWith('/petty-cash')) return 'petty_cash' as const;
              if (path.startsWith('/locations')) return 'locations' as const;
              if (path.startsWith('/inventory')) return 'inventory' as const;
              if (path.startsWith('/geofences')) return 'geofences' as const;
              if (path.startsWith('/users')) return 'users' as const;
              if (path.startsWith('/reports')) return 'reports' as const;
              if (path.startsWith('/admin-job-report')) return 'reports' as const;
              if (path.startsWith('/invoices')) return 'invoices' as const;
              if (path.startsWith('/permissions')) return 'permissions' as const;
              return null;
            };

            const res = toResource();
            const isViewOnlyBanner = res && hasAccess(res) && !canEdit(res);

            return (
              <>
                {isViewOnlyBanner && (
                  <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 sm:px-4 sm:py-3 text-amber-900 flex items-center gap-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="font-medium">View Only</span>
                    <span className="text-amber-800 hidden sm:inline">You can browse this page but cannot make changes.</span>
                  </div>
                )}
                {children}
              </>
            );
          })()}
        </div>
      </main>
    </div>
  );

};

export default Layout;
