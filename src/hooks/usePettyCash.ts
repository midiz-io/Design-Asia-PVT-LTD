import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo } from 'react';

export interface Category {
    id: string;
    name: string;
    description: string;
    budget_limit: number;
    is_active: boolean;
}

export interface Transaction {
    id: string;
    amount: number;
    description: string;
    status: string;
    created_at: string;
    receipt_url: string | null;
    employee_id: string;
    category_id: string;
    petty_cash_categories?: {
        name: string;
        budget_limit: number;
    };
    profiles?: {
        full_name: string;
    };
}

export interface IOURequest {
    id: string;
    employee_id: string;
    requested_amount: number;
    category_id: string;
    purpose: string;
    status: 'pending' | 'approved' | 'rejected' | 'issued';
    requested_at: string;
    profiles?: {
        full_name: string;
    };
}

export interface IOUSettlement {
    id: string;
    iou_request_id: string;
    employee_id: string;
    actual_expense_amount: number;
    cash_returned: number;
    additional_payment: number;
    receipt_url: string | null;
    description: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface CategorySpending {
    category: string;
    spent: number;
    limit: number;
}

export const usePettyCash = () => {
    const { user, isAdmin } = useAuth();
    const queryClient = useQueryClient();

    // 1. Fetch Categories
    const { data: categories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ['petty_cash_categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('petty_cash_categories')
                .select('*')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            return data as Category[];
        }
    });

    // 2. Fetch Transactions with Profiles & Categories
    const { data: transactionsArray = [], isLoading: transactionsLoading } = useQuery({
        queryKey: ['petty_cash_transactions', isAdmin, user?.id],
        enabled: !!user?.id || isAdmin,
        queryFn: async () => {
            let query = supabase
                .from('petty_cash_transactions')
                .select(`
          id, amount, description, status, created_at, receipt_url, employee_id, category_id
        `)
                .order('created_at', { ascending: false });

            if (!isAdmin && user?.id) {
                query = query.eq('employee_id', user.id);
            }

            const { data: transactionsData, error } = await query;
            if (error) throw error;
            if (!transactionsData?.length) return [];

            const categoryIds = [...new Set(transactionsData.map(t => t.category_id).filter(Boolean))];
            const employeeIds = [...new Set(transactionsData.map(t => t.employee_id).filter(Boolean))];

            const [categoriesRes, profilesRes] = await Promise.all([
                supabase.from('petty_cash_categories').select('id, name, budget_limit').in('id', categoryIds),
                supabase.from('profiles').select('id, full_name').in('id', employeeIds)
            ]);

            if (categoriesRes.error) throw categoriesRes.error;
            if (profilesRes.error) throw profilesRes.error;

            // Type assertion needed because supabase select doesn't infer perfectly
            return transactionsData.map((t) => ({
                ...t,
                petty_cash_categories: categoriesRes.data?.find(c => c.id === t.category_id),
                profiles: profilesRes.data?.find(p => p.id === t.employee_id)
            })) as unknown as Transaction[];
        }
    });

    // 3. Fetch IOU Requests
    const { data: iouRequests = [], isLoading: iouRequestsLoading } = useQuery({
        queryKey: ['petty_cash_iou_requests', isAdmin, user?.id],
        enabled: !!user?.id || isAdmin,
        queryFn: async () => {
            let query = supabase
                .from('petty_cash_iou_requests')
                .select('*')
                .order('requested_at', { ascending: false });

            if (!isAdmin && user?.id) {
                query = query.eq('employee_id', user.id);
            }

            const { data: iouData, error } = await query;
            if (error) throw error;
            if (!iouData?.length) return [];

            const employeeIds = [...new Set(iouData.map((i: any) => i.employee_id).filter(Boolean))];

            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', employeeIds);

            if (profilesError) throw profilesError;

            return iouData.map(iou => ({
                ...iou,
                profiles: profilesData?.find(p => p.id === iou.employee_id)
            })) as unknown as IOURequest[];
        }
    });

    // 4. Fetch IOU Settlements
    const { data: iouSettlements = [], isLoading: iouSettlementsLoading } = useQuery({
        queryKey: ['petty_cash_iou_settlements', isAdmin, user?.id],
        enabled: !!user?.id || isAdmin,
        queryFn: async () => {
            let query = supabase
                .from('petty_cash_iou_settlements')
                .select('*')
                .order('created_at', { ascending: false });

            if (!isAdmin && user?.id) {
                query = query.eq('employee_id', user.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as IOUSettlement[];
        }
    });

    // Calculate stats in memory so they only recompute when data changes
    const { categorySpending, totalApproved, totalPending } = useMemo(() => {
        let tApproved = 0;
        let tPending = 0;
        const spendingMap = new Map<string, { spent: number; limit: number }>();

        categories.forEach(cat => {
            spendingMap.set(cat.name, { spent: 0, limit: cat.budget_limit });
        });

        transactionsArray.forEach(t => {
            const amount = Number(t.amount) || 0;

            if (t.status === 'approved') {
                tApproved += amount;
                const catName = t.petty_cash_categories?.name;
                if (catName && spendingMap.has(catName)) {
                    const current = spendingMap.get(catName)!;
                    current.spent += amount;
                }
            } else if (t.status === 'pending') {
                tPending += amount;
            }
        });

        const spendingArray: CategorySpending[] = Array.from(spendingMap.entries()).map(([key, value]) => ({
            category: key,
            spent: value.spent,
            limit: value.limit,
        }));

        return { categorySpending: spendingArray, totalApproved: tApproved, totalPending: tPending };
    }, [categories, transactionsArray]);


    // Realtime Subscriptions
    useEffect(() => {
        if (!user) return;

        // Build filter based on admin vs regular user
        // Admins need everything, users just their own
        const userFilter = !isAdmin ? `employee_id=eq.${user.id}` : undefined;

        const channels = [
            supabase.channel('petty_cash_categories_rt').on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'petty_cash_categories' },
                () => queryClient.invalidateQueries({ queryKey: ['petty_cash_categories'] })
            ),
            supabase.channel('petty_cash_transactions_rt').on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'petty_cash_transactions', filter: userFilter },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['petty_cash_transactions'] });
                    queryClient.invalidateQueries({
                        predicate: (query) =>
                            typeof query.queryKey[0] === 'string' && query.queryKey[0].endsWith('-stats')
                    });
                }
            ),
            supabase.channel('petty_cash_iou_requests_rt').on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'petty_cash_iou_requests', filter: userFilter },
                () => queryClient.invalidateQueries({ queryKey: ['petty_cash_iou_requests'] })
            ),
            supabase.channel('petty_cash_iou_settlements_rt').on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'petty_cash_iou_settlements', filter: userFilter },
                () => queryClient.invalidateQueries({ queryKey: ['petty_cash_iou_settlements'] })
            )
        ];

        channels.forEach(channel => channel.subscribe());

        return () => {
            channels.forEach(channel => void supabase.removeChannel(channel));
        };
    }, [user, isAdmin, queryClient]);

    const isLoading = categoriesLoading || transactionsLoading || iouRequestsLoading || iouSettlementsLoading;

    return {
        categories,
        transactions: transactionsArray,
        iouRequests,
        iouSettlements,
        categorySpending,
        totalApproved,
        totalPending,
        isLoading
    };
};
