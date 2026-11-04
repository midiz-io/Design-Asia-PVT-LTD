import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo } from 'react';
import Alert from '@/utils/alert';
import { sendNewUserCredentials } from '@/utils/whatsapp';

export interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    department: string | null;
    created_at: string;
    user_roles: Array<{ role: string }>;
}

export interface RoleStats {
    admin: number;
    manager: number;
    supervisor: number;
    employee: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const normalizeBoolean = (value: any): boolean | undefined => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lc = value.toLowerCase();
        if (['true', 't', '1', 'yes'].includes(lc)) return true;
        if (['false', 'f', '0', 'no'].includes(lc)) return false;
    }
    if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
    }
    return undefined;
};

const resolveIsDisabled = (rawStatus: any): boolean => {
    let isDisabled = normalizeBoolean(rawStatus.is_disabled);
    if (isDisabled === undefined) isDisabled = normalizeBoolean(rawStatus.disabled);
    if (isDisabled === undefined) isDisabled = normalizeBoolean(rawStatus.is_banned);
    if (isDisabled === undefined) {
        const isActive = normalizeBoolean(rawStatus.is_active);
        if (isActive !== undefined) isDisabled = !isActive;
    }
    if (isDisabled === undefined) {
        const isEnabled = normalizeBoolean(rawStatus.is_enabled ?? rawStatus.enabled);
        if (isEnabled !== undefined) isDisabled = !isEnabled;
    }
    return isDisabled ?? false;
};

// ─── Main Hook ───────────────────────────────────────────────────────────────

export const useUserManagement = () => {
    const queryClient = useQueryClient();

    // 1. Fetch Users + Roles in parallel (2 queries instead of N+1)
    const { data: rawData, isLoading: isUsersLoading } = useQuery({
        queryKey: ['user_management'],
        queryFn: async () => {
            const [profilesResult, rolesResult] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('user_roles').select('user_id, role'),
            ]);

            if (profilesResult.error) throw profilesResult.error;
            if (rolesResult.error) throw rolesResult.error;

            const profiles = profilesResult.data || [];
            const roles = rolesResult.data || [];

            const users: UserProfile[] = profiles.map(profile => ({
                ...profile,
                user_roles: roles.filter(r => r.user_id === profile.id),
            }));

            return { users, roles };
        },
        staleTime: 30_000, // cache for 30s — user lists don't change every second
    });

    const users = rawData?.users ?? [];
    const allRoles = rawData?.roles ?? [];

    // 2. Compute role stats from already-fetched roles data (no extra query!)
    const roleStats: RoleStats = useMemo(() => {
        const stats: RoleStats = { admin: 0, manager: 0, supervisor: 0, employee: 0 };
        allRoles.forEach((r: any) => {
            if (Object.prototype.hasOwnProperty.call(stats, r.role)) {
                stats[r.role as keyof RoleStats]++;
            }
        });
        return stats;
    }, [allRoles]);

    // 3. Fetch account statuses in ONE batched parallel call (fixes N+1 loop)
    const { data: userAccountStatus = {}, isLoading: isStatusLoading } = useQuery({
        queryKey: ['user_account_status', users.map(u => u.id)],
        queryFn: async () => {
            if (!users.length) return {};

            // Fire ALL rpc calls in parallel instead of a sequential for-loop
            const results = await Promise.all(
                users.map(u =>
                    (supabase as any)
                        .rpc('get_user_account_status', { user_id_param: u.id })
                        .then(({ data, error }: any) => ({ userId: u.id, data, error }))
                )
            );

            const statusMap: Record<string, any> = {};
            for (const { userId, data, error } of results) {
                if (!error && data && data.length > 0) {
                    const rawStatus = data[0] || {};
                    statusMap[userId] = { ...rawStatus, isDisabled: resolveIsDisabled(rawStatus) };
                } else {
                    statusMap[userId] = { isDisabled: false };
                }
            }
            return statusMap;
        },
        enabled: users.length > 0,
        staleTime: 30_000,
    });

    const isLoading = isUsersLoading;

    // 4. Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel('public:profiles_and_roles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
                queryClient.invalidateQueries({ queryKey: ['user_management'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
                queryClient.invalidateQueries({ queryKey: ['user_management'] });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);

    // 5. Update user mutation
    const updateUser = useMutation({
        mutationFn: async ({
            userId,
            formData,
            currentRole,
        }: {
            userId: string;
            formData: { full_name: string; phone: string; department: string; role: string };
            currentRole: string;
        }) => {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone || null,
                    department: formData.department || null,
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            if (currentRole !== formData.role) {
                await supabase.from('user_roles').delete().eq('user_id', userId);
                const { error: roleError } = await (supabase as any)
                    .from('user_roles')
                    .insert({ user_id: userId, role: formData.role });
                if (roleError) throw roleError;
            }
        },
        onSuccess: () => {
            Alert.success('User updated successfully');
            queryClient.invalidateQueries({ queryKey: ['user_management'] });
        },
        onError: (error: any) => {
            Alert.error('Error', error.message);
        },
    });

    // 6. Add user mutation
    const addUser = useMutation({
        mutationFn: async (newUserFormData: {
            full_name: string;
            email: string;
            password: string;
            phone: string;
            department: string;
            role: string;
        }) => {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: newUserFormData.email,
                password: newUserFormData.password,
                options: { data: { full_name: newUserFormData.full_name } },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('User creation failed - no user returned');

            await new Promise(resolve => setTimeout(resolve, 1000));

            const { error: profileError } = await (supabase as any).rpc('create_user_profile', {
                user_id_param: authData.user.id,
                full_name_param: newUserFormData.full_name,
                email_param: newUserFormData.email,
                phone_param: newUserFormData.phone || null,
                department_param: newUserFormData.department || null,
            });
            if (profileError) throw profileError;

            const { error: roleError } = await (supabase as any).rpc('assign_user_role', {
                user_id_param: authData.user.id,
                role_param: newUserFormData.role,
            });
            if (roleError) throw roleError;

            if (newUserFormData.phone) {
                try {
                    await sendNewUserCredentials(
                        newUserFormData.full_name,
                        newUserFormData.phone,
                        newUserFormData.email,
                        newUserFormData.password,
                        newUserFormData.role
                    );
                } catch (e) {
                    console.error('Failed to send WhatsApp credentials:', e);
                }
            }
        },
        onSuccess: () => {
            Alert.success('User created successfully');
            queryClient.invalidateQueries({ queryKey: ['user_management'] });
        },
        onError: (error: any) => {
            Alert.error('Error', error.message || 'Failed to create user');
        },
    });

    // 7. Delete user mutation
    const deleteUser = useMutation({
        mutationFn: async (userId: string) => {
            const { data: deleteResult, error: deleteError } = await (supabase as any).rpc(
                'delete_user_completely',
                { user_id_param: userId }
            );
            if (deleteError) throw deleteError;
            const result = deleteResult as { success: boolean; deleted_count: number; message?: string };
            if (!result.success) throw new Error(result.message || 'Failed to delete user');

            const { error: authError } = await supabase.auth.admin.deleteUser(userId);
            if (authError) console.warn('Error deleting auth user:', authError);

            return result;
        },
        onSuccess: (deleteResult) => {
            Alert.success(`User deleted successfully. ${deleteResult.deleted_count} records removed.`);
            queryClient.invalidateQueries({ queryKey: ['user_management'] });
        },
        onError: (error: any) => {
            Alert.error('Error', error.message || 'Failed to delete user');
        },
    });

    // 8. Disable user mutation
    const disableUser = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await (supabase as any).rpc('admin_disable_user', { user_id_param: userId });
            if (error) throw error;
        },
        onSuccess: (_, userId) => {
            Alert.success('Success', 'User account has been disabled successfully');
            queryClient.setQueryData(
                ['user_account_status', users.map(u => u.id)],
                (prev: Record<string, any> = {}) => ({
                    ...prev,
                    [userId]: { ...(prev[userId] || {}), isDisabled: true },
                })
            );
        },
        onError: (error: any) => {
            Alert.error('Error', error.message || 'Failed to disable user account');
        },
    });

    // 9. Enable user mutation
    const enableUser = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await (supabase as any).rpc('admin_enable_user', { user_id_param: userId });
            if (error) throw error;
        },
        onSuccess: (_, userId) => {
            Alert.success('Success', 'User account has been enabled successfully');
            queryClient.setQueryData(
                ['user_account_status', users.map(u => u.id)],
                (prev: Record<string, any> = {}) => ({
                    ...prev,
                    [userId]: { ...(prev[userId] || {}), isDisabled: false },
                })
            );
        },
        onError: (error: any) => {
            Alert.error('Error', error.message || 'Failed to enable user account');
        },
    });

    // 10. Change User Password mutation (Admin only)
    const changeUserPassword = useMutation({
        mutationFn: async ({ userId, newPassword }: { userId: string, newPassword: string }) => {
            const { error } = await (supabase as any).rpc('admin_update_user_password', {
                target_user_id_param: userId,
                new_password_param: newPassword
            });
            if (error) throw error;
        },
        onSuccess: () => {
            Alert.success('Success', 'User password has been successfully reset.');
        },
        onError: (error: any) => {
            Alert.error('Error', error.message || 'Failed to change user password');
        },
    });

    return {
        users,
        roleStats,
        userAccountStatus,
        isLoading,
        isStatusLoading,
        updateUser,
        addUser,
        deleteUser,
        disableUser,
        enableUser,
        changeUserPassword,
    };
};
