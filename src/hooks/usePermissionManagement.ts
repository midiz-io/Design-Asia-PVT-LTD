import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Alert from '@/utils/alert';
import { ResourceType, PermissionType, UserRole } from '@/contexts/PermissionContext';

export interface PermissionData {
    role: UserRole;
    resource: ResourceType;
    permission: PermissionType;
}

export interface UserPermissionData {
    user_id: string;
    resource: ResourceType;
    permission: PermissionType;
}

export const RESOURCE_LABELS: Record<ResourceType, string> = {
    dashboard: 'Dashboard',
    tasks: 'Tasks',
    jobs: 'Jobs',
    chat: 'Chat',
    petty_cash: 'Petty Cash',
    locations: 'Locations',
    inventory: 'Inventory',
    geofences: 'Geofences',
    users: 'Users',
    reports: 'Reports',
    job_report: 'Job Report',
    permissions: 'Permissions',
    employee_tracking: 'Employee Tracking',
    meet: 'Video Conferencing (MIDIZ)',
    team: 'Team Management',
    index: 'Landing Page',
    invoices: 'Invoices',
};

export const RESOURCE_DESCRIPTIONS: Record<ResourceType, string> = {
    dashboard: 'Main dashboard with analytics and overview',
    tasks: 'Task management and assignment system',
    jobs: 'Job creation and management',
    chat: 'Internal messaging and communication',
    petty_cash: 'Expense tracking and petty cash management',
    locations: 'Location management and tracking',
    inventory: 'Stock and inventory management',
    geofences: 'Geofence creation and monitoring',
    users: 'User account management',
    reports: 'Analytics and reporting tools',
    job_report: 'Detailed job reports and analytics',
    permissions: 'Role and permission configuration',
    employee_tracking: 'Real-time employee location tracking',
    meet: 'Video conferencing and online meetings',
    team: 'Supervisor and employee team assignments',
    index: 'Public landing page and authentication',
    invoices: 'Create, view, and manage invoices',
};

export const PERMISSION_LABELS: Record<PermissionType, { label: string; color: string }> = {
    no_access: { label: 'No Access', color: 'destructive' },
    view_only: { label: 'View Only', color: 'secondary' },
    edit_only: { label: 'Edit Only', color: 'default' },
};

export const ROLE_LABELS: Record<UserRole, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    supervisor: 'Supervisor',
    employee: 'Employee',
};

export const usePermissionManagement = () => {
    const queryClient = useQueryClient();

    // 1. Fetch permissions
    const { data: permissions = [], isLoading: isLoadingPermissions } = useQuery<PermissionData[]>({
        queryKey: ['permissions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('permissions')
                .select('*')
                .order('role, resource' as any);
            if (error) throw error;
            return (data || []) as PermissionData[];
        },
        staleTime: 60_000, // permissions change rarely — cache for 1 minute
    });

    const { data: userPermissions = [], isLoading: isLoadingUP } = useQuery<UserPermissionData[]>({
        queryKey: ['user_permissions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_permissions')
                .select('*');
            if (error) return []; // Ignore error if migration hasn't run yet
            return (data || []) as UserPermissionData[];
        },
        staleTime: 60_000,
    });

    // 2. Helper: get permission for a user/role+resource combo
    const getPermissionForUser = (userId: string, role: UserRole, resource: ResourceType): PermissionType => {
        const userOverride = userPermissions.find(p => p.user_id === userId && p.resource === resource);
        if (userOverride) return userOverride.permission;
        
        const rolePerm = permissions.find((p) => p.role === role && p.resource === resource);
        return rolePerm?.permission || 'no_access';
    };

    // 3. Update permission mutation
    const updateUserPermission = useMutation({
        mutationFn: async ({
            userId,
            resource,
            newPermission,
        }: {
            userId: string;
            role: UserRole;
            resource: ResourceType;
            newPermission: PermissionType;
            savingKey: string;
        }) => {
            const { error } = await (supabase as any).rpc('update_user_permission', {
                target_user_id: userId,
                target_resource: resource,
                new_permission: newPermission,
            });
            if (error) throw error;
            return { userId, resource, newPermission };
        },
        onSuccess: ({ userId, resource, newPermission }, { role, savingKey }) => {
            queryClient.setQueryData<UserPermissionData[]>(['user_permissions'], (prev = []) => {
                const existing = prev.find((p) => p.user_id === userId && p.resource === resource);
                if (existing) {
                    return prev.map((p) =>
                        p.user_id === userId && p.resource === resource ? { ...p, permission: newPermission } : p
                    );
                }
                return [...prev, { user_id: userId, resource, permission: newPermission }];
            });
            Alert.success('Permission Updated', `Updated ${RESOURCE_LABELS[resource]} permission`);
        },
        onError: (error: any) => {
            Alert.error('Error', error.message);
        },
    });

    // 4. Refresh — simply invalidate the cache
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['permissions'] });
        queryClient.invalidateQueries({ queryKey: ['user_permissions'] });
    };

    return {
        permissions,
        userPermissions,
        isLoading: isLoadingPermissions || isLoadingUP,
        getPermissionForUser,
        updateUserPermission,
        refresh,
        isSaving: updateUserPermission.isPending ? (updateUserPermission.variables as any)?.savingKey : null,
    };
};
