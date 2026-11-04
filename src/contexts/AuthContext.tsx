import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface UserRole {
  role: 'admin' | 'manager' | 'supervisor' | 'employee';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isSupervisor: boolean;
  isEmployee: boolean;
  userRole: string | null;
  userRoles: UserRole[];
  getDashboardRoute: (userRole: string | null) => string;
  prefetchDashboard: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const navigate = useNavigate();

  // Role cache to avoid redundant fetching
  const rolePromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    // Try to restore user role from localStorage for faster initial render
    const savedRole = localStorage.getItem('taskvision_user_role');
    if (savedRole) {
      setUserRole(savedRole);
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        const newUser = session?.user ?? null;
        setUser(newUser);

        if (newUser) {
          // Only check role if it's a new user or we don't have it
          if (event === 'SIGNED_IN' || !userRole) {
            checkUserRole(newUser.id, newUser.email);
          }
        } else {
          setUserRole(null);
          setUserRoles([]);
          localStorage.removeItem('taskvision_user_role');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await checkUserRole(currentUser.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Dashboard prefetching logic
  const prefetchDashboard = useCallback((role: string) => {
    switch (role) {
      case 'admin': import('@/pages/Dashboard'); break;
      case 'manager': import('@/pages/dashboards/ManagerDashboard'); break;
      case 'supervisor': import('@/pages/dashboards/SupervisorDashboard'); break;
      case 'employee': import('@/pages/dashboards/EmployeeDashboard'); break;
    }
  }, []);

  const checkUserRole = useCallback(async (userId: string, email?: string): Promise<string | null> => {
    // If we're already fetching for this user, return that promise
    if (rolePromiseRef.current) return rolePromiseRef.current;

    setRoleLoading(true);
    const fetchRole = (async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);

        if (!error && data && data.length > 0) {
          const roles = data as UserRole[];
          setUserRoles(roles);

          const rolesList = roles.map(r => r.role);
          let primaryRole: string | null = null;

          if (rolesList.includes('admin')) primaryRole = 'admin';
          else if (rolesList.includes('manager')) primaryRole = 'manager';
          else if (rolesList.includes('supervisor')) primaryRole = 'supervisor';
          else if (rolesList.includes('employee')) primaryRole = 'employee';

          if (primaryRole) {
            setUserRole(primaryRole);
            localStorage.setItem('taskvision_user_role', primaryRole);

            // Save email/role mapping for future optimistic navigation
            if (email) {
              const roleMap = JSON.parse(localStorage.getItem('taskvision_role_hints') || '{}');
              roleMap[email.toLowerCase()] = primaryRole;
              localStorage.setItem('taskvision_role_hints', JSON.stringify(roleMap));
            }
          }
          return primaryRole;
        } else {
          const { count } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true });

          if (count === 0) {
            const { error: insertError } = await supabase
              .from('user_roles')
              .insert([{ user_id: userId, role: 'admin' }]);

            if (!insertError) {
              setUserRole('admin');
              setUserRoles([{ role: 'admin' }]);
              localStorage.setItem('taskvision_user_role', 'admin');
              return 'admin';
            }
          }
          return null;
        }
      } catch (error) {
        console.error('Error in checkUserRole:', error);
        return null;
      } finally {
        rolePromiseRef.current = null;
        setRoleLoading(false);
      }
    })();

    rolePromiseRef.current = fetchRole;
    return fetchRole;
  }, []);

  const getDashboardRoute = useCallback((role: string | null): string => {
    switch (role) {
      case 'admin': return '/dashboard/admin';
      case 'manager': return '/dashboard/manager';
      case 'supervisor': return '/dashboard/supervisor';
      case 'employee': return '/dashboard/employee';
      default: return '/dashboard';
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Optimistic: Look for role hint to pre-fetch dashboard
    const roleHints = JSON.parse(localStorage.getItem('taskvision_role_hints') || '{}');
    const hintedRole = roleHints[email.toLowerCase()];
    if (hintedRole) {
      prefetchDashboard(hintedRole);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // If we have a hint, we can navigate even before the full role check completes
      if (hintedRole) {
        navigate(getDashboardRoute(hintedRole), { replace: true });
        // Check actual role in background to confirm/correct
        checkUserRole(data.user.id, email);
      } else {
        const role = await checkUserRole(data.user.id, email);
        navigate(getDashboardRoute(role), { replace: true });
      }
    }

    return { error };
  }, [navigate, getDashboardRoute, prefetchDashboard, checkUserRole]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    // Optimistic UI updates
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserRoles([]);
    localStorage.removeItem('taskvision_user_role');
    navigate('/auth', { replace: true });

    // Background execution
    supabase.auth.signOut().catch(console.error);
  }, [navigate]);


  // Derived role flags
  const isAdmin = useMemo(() => userRole === 'admin', [userRole]);
  const isManager = useMemo(() => userRole === 'manager', [userRole]);
  const isSupervisor = useMemo(() => userRole === 'supervisor', [userRole]);
  const isEmployee = useMemo(() => userRole === 'employee', [userRole]);

  // Memoize the context value to avoid unnecessary re-renders of the entire app tree
  const contextValue = useMemo(() => ({
    user,
    session,
    loading: loading || roleLoading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    isManager,
    isSupervisor,
    isEmployee,
    userRole,
    userRoles,
    getDashboardRoute,
    prefetchDashboard,
  }), [
    user, session, loading, roleLoading, isAdmin, isManager,
    isSupervisor, isEmployee, userRole, userRoles, prefetchDashboard, signIn, signUp, signOut, getDashboardRoute
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
