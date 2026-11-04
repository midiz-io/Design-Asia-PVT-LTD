import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsData {
    tasks: {
        total: number;
        completed: number;
        pending: number;
        inProgress: number;
        byPriority: { [key: string]: number };
        byStatus: { [key: string]: number };
        completionRate: number;
    };
    expenses: {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        byCategory: Array<{ category: string; amount: number }>;
        avgAmount: number;
    };
    inventory: {
        totalItems: number;
        lowStock: number;
        totalValue: number;
        movements: number;
        alerts: number;
    };
    users: {
        total: number;
        active: number;
        byRole: { [key: string]: number };
    };
}

const getTimeThreshold = (timeRange: string): Date => {
    const now = new Date();
    switch (timeRange) {
        case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        default: return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
};

export const useReports = (timeRange: string) => {
    const timeThreshold = useMemo(() => getTimeThreshold(timeRange), [timeRange]);

    const { data: analytics, isLoading } = useQuery<AnalyticsData>({
        queryKey: ['reports_analytics', timeRange],
        queryFn: async () => {
            const timeISOString = timeThreshold.toISOString();

            // Fire ALL 6 sub-queries in parallel in a single Promise.all call
            const [
                tasksResult,
                transactionsResult,
                inventoryItemsResult,
                inventoryMovementsResult,
                inventoryAlertsResult,
                profilesResult,
                userRolesResult,
            ] = await Promise.all([
                supabase.from('tasks').select('*').gte('created_at', timeISOString),
                supabase
                    .from('petty_cash_transactions')
                    .select('*, petty_cash_categories (name)')
                    .gte('created_at', timeISOString),
                supabase
                    .from('inventory_items')
                    .select('*, stock_levels (current_quantity)')
                    .eq('is_active', true),
                supabase.from('stock_movements').select('id'),
                supabase.from('inventory_alerts').select('id').eq('is_resolved', false),
                supabase.from('profiles').select('*'),
                supabase.from('user_roles').select('user_id, role'),
            ]);

            // ── Task Analytics ────────────────────────────────────
            const tasks = tasksResult.data || [];
            const byPriority: { [key: string]: number } = {};
            const byStatus: { [key: string]: number } = {};
            tasks.forEach((task) => {
                byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
                byStatus[task.status] = (byStatus[task.status] || 0) + 1;
            });
            const completedCount = tasks.filter((t) => t.status === 'completed').length;
            const totalTasks = tasks.length;

            // ── Expense Analytics ─────────────────────────────────
            const transactions = (transactionsResult.data || []) as any[];
            const categoryMap = new Map<string, number>();
            let totalExpenseAmount = 0;
            transactions.forEach((tx) => {
                const amount = parseFloat(tx.amount.toString());
                totalExpenseAmount += amount;
                const catName = tx.petty_cash_categories?.name || 'Uncategorized';
                categoryMap.set(catName, (categoryMap.get(catName) || 0) + amount);
            });

            // ── Inventory Analytics ───────────────────────────────
            const items = (inventoryItemsResult.data || []) as any[];
            const lowStock = items.filter((item) => {
                const totalStock = item.stock_levels?.reduce((sum: number, l: any) => sum + l.current_quantity, 0) || 0;
                return totalStock <= item.reorder_level;
            }).length;
            const totalValue = items.reduce((sum: number, item: any) => {
                const stock = item.stock_levels?.reduce((s: number, l: any) => s + l.current_quantity, 0) || 0;
                return sum + stock * (item.unit_price || 0);
            }, 0);

            // ── User Analytics ────────────────────────────────────
            const userRoles = userRolesResult.data || [];
            const byRole: { [key: string]: number } = {};
            userRoles.forEach((ur: any) => {
                byRole[ur.role] = (byRole[ur.role] || 0) + 1;
            });
            const activeUsers = 0; // Removed location-based active users count

            return {
                tasks: {
                    total: totalTasks,
                    completed: completedCount,
                    pending: tasks.filter((t) => t.status === 'pending').length,
                    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
                    byPriority,
                    byStatus,
                    completionRate: totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0,
                },
                expenses: {
                    total: totalExpenseAmount,
                    approved: transactions
                        .filter((t) => t.status === 'approved')
                        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
                    pending: transactions.filter((t) => t.status === 'pending').length,
                    rejected: transactions.filter((t) => t.status === 'rejected').length,
                    byCategory: Array.from(categoryMap.entries()).map(([category, amount]) => ({ category, amount })),
                    avgAmount: transactions.length ? totalExpenseAmount / transactions.length : 0,
                },
                inventory: {
                    totalItems: items.length,
                    lowStock,
                    totalValue,
                    movements: inventoryMovementsResult.data?.length || 0,
                    alerts: inventoryAlertsResult.data?.length || 0,
                },
                users: {
                    total: profilesResult.data?.length || 0,
                    active: activeUsers,
                    byRole,
                },
            };
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes — analytics don't need to be real-time
    });

    const defaultAnalytics: AnalyticsData = {
        tasks: { total: 0, completed: 0, pending: 0, inProgress: 0, byPriority: {}, byStatus: {}, completionRate: 0 },
        expenses: { total: 0, approved: 0, pending: 0, rejected: 0, byCategory: [], avgAmount: 0 },
        inventory: { totalItems: 0, lowStock: 0, totalValue: 0, movements: 0, alerts: 0 },
        users: { total: 0, active: 0, byRole: {} },
    };

    return {
        analytics: analytics ?? defaultAnalytics,
        isLoading,
    };
};
