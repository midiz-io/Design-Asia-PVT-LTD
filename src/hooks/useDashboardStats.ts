import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// Types derived from existing dashboards
export interface DashboardStats {
    totalTasks: number;
    completedTasks: number;
    notStartedTasks: number;
    urgentTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    incompleteTasks: number;
    totalExpenses: number;
    pendingExpenses: number;
    lowStockItems: number;
    activeLocations: number;
}

export interface RecentActivity {
    id: string;
    type: 'task' | 'expense' | 'inventory';
    title: string;
    description: string;
    timestamp: string;
    status?: string;
}

export interface TasksByPriority {
    low: number;
    medium: number;
    high: number;
    urgent: number;
}

export interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    department: string;
    task_count: number;
    completion_rate: number;
}

// Admin Stats Hook
export const useAdminStats = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['admin-stats', userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            const [tasksRes, expensesRes, inventoryRes, assigneesRes, profilesRes, rolesRes] = await Promise.all([
                supabase.from('tasks').select('id, title, status, priority, due_date, created_at, created_by'),
                supabase.from('petty_cash_transactions').select('*'),
                supabase.from('inventory_items').select('reorder_level, stock_levels(current_quantity)').eq('is_active', true) as any,
                supabase.from('task_assignees').select('task_id, user_id'),
                supabase.from('profiles').select('id, full_name'),
                supabase.from('user_roles').select('user_id, role')
            ]);

            const tasks = tasksRes.data || [];
            const expenses = expensesRes.data || [];
            const inventory = inventoryRes.data || [];
            const assigneesData = assigneesRes.data || [];
            const profilesData = profilesRes.data || [];
            const rolesData = rolesRes.data || [];

            const taskAssigneesMap = assigneesData.reduce((acc, curr) => {
                const profile = profilesData.find(p => p.id === curr.user_id);
                if (profile) {
                    if (!acc[curr.task_id]) acc[curr.task_id] = [];
                    acc[curr.task_id].push(profile.full_name);
                }
                return acc;
            }, {} as Record<string, string[]>);
            const locations: any[] = [];

            const stats: DashboardStats = {
                totalTasks: tasks.length,
                completedTasks: tasks.filter(t => t.status === 'completed').length,
                notStartedTasks: tasks.filter(t => t.status === 'not_started').length,
                inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
                urgentTasks: tasks.filter(t => t.priority === 'urgent').length,
                overdueTasks: tasks.filter(t =>
                    t.due_date &&
                    new Date(t.due_date) < new Date() &&
                    !['completed', 'cancelled'].includes(t.status)
                ).length,
                incompleteTasks: tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length,
                totalExpenses: expenses.reduce((sum, e) => sum + (parseFloat(e.amount?.toString() || '0') || 0), 0),
                pendingExpenses: expenses.filter(e => e.status === 'pending').length,
                lowStockItems: inventory.filter((item: any) => {
                    const totalStock = item.stock_levels?.reduce((sum: number, level: any) => sum + (level.current_quantity || 0), 0) || 0;
                    return (totalStock as number) <= (item.reorder_level as number);
                }).length,
                activeLocations: new Set(locations.map(l => l.user_id)).size,
            };

            const priorityCounts: TasksByPriority = {
                low: tasks.filter(t => t.priority === 'low').length,
                medium: tasks.filter(t => t.priority === 'medium').length,
                high: tasks.filter(t => t.priority === 'high').length,
                urgent: tasks.filter(t => t.priority === 'urgent').length,
            };

            // Recent activities
            const [recentTasks, recentExpenses] = await Promise.all([
                supabase.from('tasks').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5),
                supabase.from('petty_cash_transactions').select('id, description, status, created_at, amount').order('created_at', { ascending: false }).limit(5),
            ]);

            const activities: RecentActivity[] = [
                ...(recentTasks.data || []).map(t => ({
                    id: t.id,
                    type: 'task' as const,
                    title: t.title,
                    description: `Task ${t.status}`,
                    timestamp: t.created_at,
                    status: t.status,
                })),
                ...(recentExpenses.data || []).map(e => ({
                    id: e.id,
                    type: 'expense' as const,
                    title: `LKR ${e.amount} Expense`,
                    description: e.description || 'No description',
                    timestamp: e.created_at,
                    status: e.status,
                })),
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

            const userRolesMap = rolesData.reduce((acc, curr) => {
                acc[curr.user_id] = curr.role;
                return acc;
            }, {} as Record<string, string>);

            const getCreatorType = (createdBy: string) => {
                const role = userRolesMap[createdBy] || 'employee';
                return role === 'employee' ? 'Self-Created' : 'Supervisor-Created';
            };

            const mapTask = (t: any) => ({
                ...t,
                creator_type: getCreatorType(t.created_by),
                assignees: taskAssigneesMap[t.id] || []
            });

            const overdueTasksList = tasks.filter(t =>
                t.due_date &&
                new Date(t.due_date) < new Date() &&
                !['completed', 'cancelled'].includes(t.status)
            ).map(mapTask);

            const incompleteTasksList = tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).map(mapTask);

            const totalTasksList = tasks.map(mapTask);

            const completedTasksList = tasks.filter(t => t.status === 'completed').map(mapTask);

            const notStartedTasksList = tasks.filter(t => t.status === 'not_started').map(mapTask);

            const urgentTasksList = tasks.filter(t => t.priority === 'urgent').map(mapTask);

            return { stats, priorityCounts, activities, overdueTasksList, incompleteTasksList, totalTasksList, completedTasksList, notStartedTasksList, urgentTasksList };
        },
        enabled: !!userId,
    });

    // Realtime subscription
    useEffect(() => {
        if (!userId) return;
        const channel = supabase.channel('admin-dashboard-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['admin-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'petty_cash_transactions' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['admin-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['admin-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['admin-stats', userId] });
            })
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);

    return query;
};

// Employee Stats Hook
export const useEmployeeStats = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['employee-stats', userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            const [assignedTasksRes, selfCreatedTasksRes, expensesRes, messagesRes, assigneesRes, profilesRes] = await Promise.all([
                supabase.from('task_assignees').select('task_id').eq('user_id', userId),
                supabase.from('tasks').select('id, created_by').eq('created_by', userId),
                supabase.from('petty_cash_transactions').select('*').eq('employee_id', userId),
                supabase.from('chat_messages').select('id').eq('receiver_id', userId).eq('is_read', false),
                supabase.from('task_assignees').select('task_id, user_id'),
                supabase.from('profiles').select('id, full_name')
            ]);

            const taskAssigneesMap = (assigneesRes.data || []).reduce((acc, curr) => {
                const profile = (profilesRes.data || []).find(p => p.id === curr.user_id);
                if (profile) {
                    if (!acc[curr.task_id]) acc[curr.task_id] = [];
                    acc[curr.task_id].push(profile.full_name);
                }
                return acc;
            }, {} as Record<string, string[]>);

            const assignedTaskIds = (assignedTasksRes.data || []).map(t => t.task_id);
            const selfCreatedTaskIds = (selfCreatedTasksRes.data || []).map(t => t.id);
            const taskIds = Array.from(new Set([...assignedTaskIds, ...selfCreatedTaskIds]));
            
            let tasks: any[] = [];
            if (taskIds.length > 0) {
                const { data } = await supabase.from('tasks').select('id, title, status, priority, due_date, created_at, rejected_at, rejection_reason, created_by').in('id', taskIds);
                tasks = (data || []).map(t => ({
                    ...t,
                    creator_type: t.created_by === userId ? 'Self-Created' : 'Supervisor-Created'
                }));
            }

            const expenses = expensesRes.data || [];

            const stats = {
                myTasks: tasks.length,
                completedTasks: tasks.filter(t => t.status === 'completed').length,
                notStartedTasks: tasks.filter(t => t.status === 'not_started').length,
                inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
                urgentTasks: tasks.filter(t => t.priority === 'urgent').length,
                overdueTasks: tasks.filter(t =>
                    t.due_date &&
                    new Date(t.due_date) < new Date() &&
                    !['completed', 'cancelled'].includes(t.status)
                ).length,
                incompleteTasks: tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length,
                rejectedTasks: tasks.filter(t => t.rejected_at !== null && t.status === 'in_progress').length,
                myExpenses: expenses.length,
                pendingExpenses: expenses.filter(e => e.status === 'pending').length,
                unreadMessages: messagesRes.data?.length || 0,
                locationUpdates: 0,
            };

            const recentTasks = tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
            const recentExpenses = expenses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

            const overdueTasksList = tasks.filter(t =>
                t.due_date &&
                new Date(t.due_date) < new Date() &&
                !['completed', 'cancelled'].includes(t.status)
            ).map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const incompleteTasksList = tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const totalTasksList = tasks.map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const completedTasksList = tasks.filter(t => t.status === 'completed').map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const notStartedTasksList = tasks.filter(t => t.status === 'not_started').map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const urgentTasksList = tasks.filter(t => t.priority === 'urgent').map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            return { stats, recentTasks, recentExpenses, overdueTasksList, incompleteTasksList, totalTasksList, completedTasksList, notStartedTasksList, urgentTasksList };
        },
        enabled: !!userId,
    });

    useEffect(() => {
        if (!userId) return;
        const channel = supabase.channel(`employee-dashboard-${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['employee-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees', filter: `user_id=eq.${userId}` }, () => {
                void queryClient.invalidateQueries({ queryKey: ['employee-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'petty_cash_transactions', filter: `employee_id=eq.${userId}` }, () => {
                void queryClient.invalidateQueries({ queryKey: ['employee-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${userId}` }, () => {
                void queryClient.invalidateQueries({ queryKey: ['employee-stats', userId] });
            })
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);

    return query;
};

// Manager Stats Hook
export const useManagerStats = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['manager-stats', userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            const { data: teamRoles } = await supabase.from('user_roles').select('user_id').in('role', ['employee', 'supervisor']);
            const teamUserIds = (teamRoles || []).map(tr => tr.user_id);

            if (teamUserIds.length === 0) {
                return {
                    stats: { teamMembers: 0, activeTasks: 0, completedTasks: 0, pendingApprovals: 0, teamExpenses: 0, pendingExpenses: 0, teamLocations: 0, unreadMessages: 0, overdueTasks: 0, incompleteTasks: 0 },
                    teamMembers: [],
                    pendingApprovals: [],
                    overdueTasksList: [],
                    incompleteTasksList: []
                };
            }

            const [profilesRes, taskAssigneesRes, expensesRes, messagesRes, allAssigneesRes, allProfilesRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, email, department').in('id', teamUserIds),
                supabase.from('task_assignees').select('task_id, user_id').in('user_id', teamUserIds),
                supabase.from('petty_cash_transactions').select('*').in('employee_id', teamUserIds),
                supabase.from('chat_messages').select('id').eq('receiver_id', userId).eq('is_read', false),
                supabase.from('task_assignees').select('task_id, user_id'),
                supabase.from('profiles').select('id, full_name')
            ]);

            const taskAssigneesMap = (allAssigneesRes.data || []).reduce((acc, curr) => {
                const profile = (allProfilesRes.data || []).find(p => p.id === curr.user_id);
                if (profile) {
                    if (!acc[curr.task_id]) acc[curr.task_id] = [];
                    acc[curr.task_id].push(profile.full_name);
                }
                return acc;
            }, {} as Record<string, string[]>);

            const profiles = profilesRes.data || [];
            const taskAssignees = taskAssigneesRes.data || [];
            const teamExpenses = expensesRes.data || [];
            const teamTaskIds = Array.from(new Set(taskAssignees.map(ta => ta.task_id)));

            let teamTasks: any[] = [];
            if (teamTaskIds.length > 0) {
                const { data } = await supabase.from('tasks').select('id, title, status, priority, due_date').in('id', teamTaskIds);
                teamTasks = data || [];
            }

            // Map tasks back to users for team member stats
            const userTaskStats = taskAssignees.reduce((acc, ta) => {
                const task = teamTasks.find(t => t.id === ta.task_id);
                if (!acc[ta.user_id]) acc[ta.user_id] = { total: 0, completed: 0 };
                acc[ta.user_id].total++;
                if (task?.status === 'completed') acc[ta.user_id].completed++;
                return acc;
            }, {} as Record<string, { total: number, completed: number }>);

            const teamMembers: TeamMember[] = profiles.map(p => ({
                ...p,
                task_count: userTaskStats[p.id]?.total || 0,
                completion_rate: userTaskStats[p.id]?.total > 0 ? (userTaskStats[p.id].completed / userTaskStats[p.id].total) * 100 : 0,
            })).sort((a, b) => b.completion_rate - a.completion_rate).slice(0, 5);

            const pendingApprovals = teamExpenses.filter(e => e.status === 'pending').map(e => ({
                id: e.id,
                type: 'expense' as const,
                title: e.description,
                amount: e.amount,
                employee_name: profiles.find(p => p.id === e.employee_id)?.full_name || 'Unknown',
                created_at: e.created_at,
            })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

            const stats = {
                teamMembers: profiles.length,
                activeTasks: teamTasks.filter(t => t.status === 'in_progress' || t.status === 'not_started').length,
                completedTasks: teamTasks.filter(t => t.status === 'completed').length,
                pendingApprovals: pendingApprovals.length,
                teamExpenses: teamExpenses.length,
                pendingExpenses: teamExpenses.filter(e => e.status === 'pending').length,
                teamLocations: 0,
                unreadMessages: messagesRes.data?.length || 0,
                overdueTasks: teamTasks.filter(t =>
                    t.due_date &&
                    new Date(t.due_date) < new Date() &&
                    !['completed', 'cancelled'].includes(t.status)
                ).length,
                incompleteTasks: teamTasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length,
            };

            const overdueTasksList = teamTasks.filter(t =>
                t.due_date &&
                new Date(t.due_date) < new Date() &&
                !['completed', 'cancelled'].includes(t.status)
            ).map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const incompleteTasksList = teamTasks.filter(t => !['completed', 'cancelled'].includes(t.status)).map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const totalTasksList = teamTasks.map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const completedTasksList = teamTasks.filter(t => t.status === 'completed').map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const notStartedTasksList = teamTasks.filter(t => t.status === 'not_started').map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const urgentTasksList = teamTasks.filter(t => t.priority === 'urgent').map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            return { stats, teamMembers, pendingApprovals, overdueTasksList, incompleteTasksList, totalTasksList, completedTasksList, notStartedTasksList, urgentTasksList };
        },
        enabled: !!userId,
    });

    useEffect(() => {
        if (!userId) return;
        const channel = supabase.channel(`manager-dashboard-${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['manager-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['manager-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'petty_cash_transactions' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['manager-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${userId}` }, () => {
                void queryClient.invalidateQueries({ queryKey: ['manager-stats', userId] });
            })
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);

    return query;
};

// Supervisor Stats Hook
export const useSupervisorStats = (userId: string | undefined) => {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['supervisor-stats', userId],
        queryFn: async () => {
            if (!userId) throw new Error("User ID required");

            // Fetch only employees assigned to this supervisor
            const { data: teamAssignments } = await supabase
                .from('supervisor_employees')
                .select('employee_id')
                .eq('supervisor_id', userId);
            
            const teamUserIds = (teamAssignments || []).map(tr => tr.employee_id);

            if (teamUserIds.length === 0) {
                return {
                    stats: { fieldTeam: 0, activeLocations: 0, completedTasks: 0, pendingTasks: 0, locationUpdates: 0, fieldExpenses: 0, geofenceAlerts: 0, unreadMessages: 0, overdueTasks: 0, incompleteTasks: 0 },
                    fieldMembers: [],
                    locationAlerts: [],
                    overdueTasksList: [],
                    incompleteTasksList: []
                };
            }

            const [profilesRes, taskAssigneesRes, messagesRes, allAssigneesRes, allProfilesRes] = await Promise.all([
                supabase.from('profiles').select('id, full_name, email, department').in('id', teamUserIds),
                supabase.from('task_assignees').select('task_id, user_id').in('user_id', teamUserIds),
                supabase.from('chat_messages').select('id').eq('receiver_id', userId).eq('is_read', false),
                supabase.from('task_assignees').select('task_id, user_id'),
                supabase.from('profiles').select('id, full_name')
            ]);

            const taskAssigneesMap = (allAssigneesRes.data || []).reduce((acc, curr) => {
                const profile = (allProfilesRes.data || []).find(p => p.id === curr.user_id);
                if (profile) {
                    if (!acc[curr.task_id]) acc[curr.task_id] = [];
                    acc[curr.task_id].push(profile.full_name);
                }
                return acc;
            }, {} as Record<string, string[]>);

            const profiles = profilesRes.data || [];
            const taskAssignees = taskAssigneesRes.data || [];
            const locations: any[] = [];
            const teamTaskIds = Array.from(new Set(taskAssignees.map(ta => ta.task_id)));

            let teamTasks: any[] = [];
            if (teamTaskIds.length > 0) {
                const { data } = await supabase.from('tasks').select('id, status, due_date, title, priority').in('id', teamTaskIds);
                teamTasks = data || [];
            }

            const userActiveTasks = taskAssignees.reduce((acc, ta) => {
                const task = teamTasks.find(t => t.id === ta.task_id);
                if (!acc[ta.user_id]) acc[ta.user_id] = 0;
                if (task?.status === 'not_started' || task?.status === 'in_progress') acc[ta.user_id]++;
                return acc;
            }, {} as Record<string, number>);

            const fieldMembers = profiles.map(p => {
                const latestLoc = locations.find(l => l.user_id === p.id);
                return {
                    ...p,
                    last_location: latestLoc ? `${latestLoc.latitude.toFixed(4)}, ${latestLoc.longitude.toFixed(4)}` : 'No location data',
                    last_update: latestLoc?.timestamp,
                    battery_level: latestLoc?.battery_level,
                    active_tasks: userActiveTasks[p.id] || 0,
                };
            }).sort((a, b) => {
                if (!a.last_update) return 1;
                if (!b.last_update) return -1;
                return new Date(b.last_update).getTime() - new Date(a.last_update).getTime();
            }).slice(0, 6);

            // Alerts
            const alerts = [
                ...locations.filter(l => (l.battery_level ?? 100) < 20).map(l => ({
                    id: `battery-${l.id}`,
                    type: 'low_battery' as const,
                    message: `Low battery: ${l.battery_level}%`,
                    employee_name: profiles.find(p => p.id === l.user_id)?.full_name || 'Unknown',
                    timestamp: l.timestamp,
                })),
                ...locations.filter(l => new Date(l.timestamp).getTime() < Date.now() - 2 * 60 * 60 * 1000).map(l => ({
                    id: `inactive-${l.user_id}`,
                    type: 'inactive' as const,
                    message: 'No location update in 2+ hours',
                    employee_name: profiles.find(p => p.id === l.user_id)?.full_name || 'Unknown',
                    timestamp: l.timestamp,
                })),
            ].slice(0, 5);

            const stats = {
                fieldTeam: profiles.length,
                activeLocations: new Set(locations.map(l => l.user_id)).size,
                completedTasks: teamTasks.filter(t => t.status === 'completed').length,
                pendingTasks: teamTasks.filter(t => t.status === 'not_started' || t.status === 'in_progress').length,
                locationUpdates: locations.length,
                fieldExpenses: 0,
                geofenceAlerts: alerts.length,
                unreadMessages: messagesRes.data?.length || 0,
                overdueTasks: teamTasks.filter(t =>
                    t.due_date &&
                    new Date(t.due_date) < new Date() &&
                    !['completed', 'cancelled'].includes(t.status)
                ).length,
                incompleteTasks: teamTasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length,
            };

            const overdueTasksList = teamTasks.filter(t =>
                t.due_date &&
                new Date(t.due_date) < new Date() &&
                !['completed', 'cancelled'].includes(t.status)
            ).map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const incompleteTasksList = teamTasks.filter(t => !['completed', 'cancelled'].includes(t.status)).map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const totalTasksList = teamTasks.map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const completedTasksList = teamTasks.filter(t => t.status === 'completed').map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const notStartedTasksList = teamTasks.filter(t => t.status === 'not_started').map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            const urgentTasksList = teamTasks.filter(t => t.priority === 'urgent').map(t => ({
                ...t,
                assignees: taskAssigneesMap[t.id] || []
            }));

            return { stats, fieldMembers, locationAlerts: alerts, overdueTasksList, incompleteTasksList, totalTasksList, completedTasksList, notStartedTasksList, urgentTasksList };
        },
        enabled: !!userId,
    });

    useEffect(() => {
        if (!userId) return;
        const channel = supabase.channel(`supervisor-dashboard-${userId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['supervisor-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => {
                void queryClient.invalidateQueries({ queryKey: ['supervisor-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'supervisor_employees', filter: `supervisor_id=eq.${userId}` }, () => {
                void queryClient.invalidateQueries({ queryKey: ['supervisor-stats', userId] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `receiver_id=eq.${userId}` }, () => {
                void queryClient.invalidateQueries({ queryKey: ['supervisor-stats', userId] });
            })
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);

    return query;
};

