import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Shield, Users, Eye, Edit, X, Save, RotateCcw } from 'lucide-react';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';
import { ResourceType, PermissionType, UserRole } from '@/contexts/PermissionContext';
import { usePermissionManagement, RESOURCE_LABELS, RESOURCE_DESCRIPTIONS, PERMISSION_LABELS, ROLE_LABELS } from '@/hooks/usePermissionManagement';
import { useUserManagement } from '@/hooks/useUserManagement';
import { PermissionManagementSkeleton } from '@/components/skeletons/PermissionManagementSkeleton';


import { usePermissions } from '@/contexts/PermissionContext';

const PermissionManagement = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { hasAccess, canEdit, loading: permissionsLoading } = usePermissions();
  const { users, isLoading: isLoadingUsers } = useUserManagement();
  
  const {
    isLoading: isLoadingPerms,
    getPermissionForUser,
    updateUserPermission,
    refresh,
    isSaving,
  } = usePermissionManagement();
  const navigate = useNavigate();

  const location = useLocation();

  useEffect(() => {
    if (user && location.pathname !== '/auth' && !authLoading && !permissionsLoading && !hasAccess('permissions')) {
      Alert.error('Access Denied', 'You do not have permission to access Permission Management');
      navigate('/dashboard');
    }
  }, [user, location.pathname, authLoading, permissionsLoading, hasAccess, navigate]);

  const PERMISSION_ICONS: Record<string, React.ReactNode> = {
    no_access: <X className="w-4 h-4" />,
    view_only: <Eye className="w-4 h-4" />,
    edit_only: <Edit className="w-4 h-4" />,
  };

  const resources: ResourceType[] = [
    'dashboard', 'jobs', 'tasks', 'team', 'chat', 'petty_cash',
    'inventory', 'geofences', 'users', 'reports', 'job_report', 'invoices', 'permissions'
  ];

  const roles: UserRole[] = ['admin', 'manager', 'supervisor', 'employee'];

  if (authLoading || permissionsLoading || isLoadingPerms || isLoadingUsers) {
    return <PermissionManagementSkeleton />;
  }

  if (!hasAccess('permissions')) {
    return null;
  }

  const usersByRole = (role: UserRole) => {
    return users.filter(u => u.user_roles?.[0]?.role === role);
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Permission Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Configure granular access permissions for specific users across system resources
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={refresh} disabled={isLoadingPerms} className="w-full sm:w-auto">
              <RotateCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="destructive" onClick={async () => {
              const confirmed = await Alert.confirm('Reset Permissions', 'Are you sure you want to reset all permissions to default values? This action cannot be undone.');
              if (!confirmed) return;
              Alert.info('Reset is not yet supported via this interface. Please contact your system administrator.');
            }} disabled={isLoadingPerms || !canEdit('permissions')} className="w-full sm:w-auto">
              Reset to Defaults
            </Button>
          </div>
        </div>

        <Tabs value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            {roles.map(role => (
              <TabsTrigger key={role} value={role}>
                <Users className="w-4 h-4 mr-2" />
                {ROLE_LABELS[role]}
              </TabsTrigger>
            ))}
          </TabsList>

          {roles.map(role => (
            <TabsContent key={role} value={role} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {ROLE_LABELS[role]} Users
                  </CardTitle>
                  <CardDescription>
                    Select a {ROLE_LABELS[role].toLowerCase()} to configure their specific access permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {usersByRole(role).length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No users found for this role.</p>
                    ) : (
                      <Accordion type="single" collapsible className="w-full">
                        {usersByRole(role).map(roleUser => (
                          <AccordionItem key={roleUser.id} value={roleUser.id} className="border rounded-lg mb-2 overflow-hidden bg-white">
                            <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 hover:no-underline">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                  {roleUser.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="font-semibold text-sm">{roleUser.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{roleUser.email || roleUser.phone || 'No contact info'}</p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 py-4 bg-slate-50/50 border-t">
                               <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                  {resources.map(resource => {
                                      const currentPermission = getPermissionForUser(roleUser.id, role, resource);
                                      const isSavingThis = isSaving === `${roleUser.id}-${resource}`;

                                      const containerClasses =
                                        currentPermission === 'no_access'
                                          ? 'p-3 border rounded-lg bg-red-50 border-red-200'
                                          : currentPermission === 'view_only'
                                            ? 'p-3 border rounded-lg bg-amber-50 border-amber-200'
                                            : 'p-3 border rounded-lg bg-primary/5 border-primary/20';

                                      return (
                                        <div key={resource} className={`flex flex-col gap-2 ${containerClasses}`}>
                                            <div className="flex items-start justify-between">
                                              <div>
                                                <h4 className="font-medium text-sm">{RESOURCE_LABELS[resource]}</h4>
                                                <p className="text-xs text-muted-foreground line-clamp-1" title={RESOURCE_DESCRIPTIONS[resource]}>
                                                  {RESOURCE_DESCRIPTIONS[resource]}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="pt-2">
                                              <Select
                                                value={currentPermission}
                                                onValueChange={(value: PermissionType) => updateUserPermission.mutate({ userId: roleUser.id, role, resource, newPermission: value, savingKey: `${roleUser.id}-${resource}` })}
                                                disabled={isSavingThis || !canEdit('permissions')}
                                              >
                                                <SelectTrigger className="h-8 text-xs">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {Object.entries(PERMISSION_LABELS).map(([permission, config]) => (
                                                    <SelectItem key={permission} value={permission} className="text-xs">
                                                      <div className="flex items-center gap-2">
                                                        {PERMISSION_ICONS[permission]}
                                                        {config.label}
                                                      </div>
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                        </div>
                                      );
                                  })}
                               </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Permission Types</CardTitle>
            <CardDescription>Understanding the different permission levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(PERMISSION_LABELS).map(([permission, config]) => (
                <div key={permission} className="flex items-start gap-3 p-4 border rounded-lg">
                  <Badge variant={config.color as any} className="flex items-center gap-1">
                    {PERMISSION_ICONS[permission]}
                    {config.label}
                  </Badge>
                  <div className="flex-1">
                    <h4 className="font-medium">{config.label}</h4>
                    <p className="text-sm text-muted-foreground">
                      {permission === 'no_access' && 'User cannot access this page at all - will see "No Access" message'}
                      {permission === 'view_only' && 'User can view everything but cannot make any changes'}
                      {permission === 'edit_only' && 'User can both view and edit (create, update, delete)'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PermissionManagement;
