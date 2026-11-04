import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export const useJobs = () => {
    const queryClient = useQueryClient();

    const { data: jobs, isLoading, error } = useQuery({
        queryKey: ['jobs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('jobs' as any)
                .select('*, job_materials(amount), job_labor(total_amount), tasks(id, status, task_assignees(user_id))')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
    });

    useEffect(() => {
        const channel = supabase
            .channel('jobs-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'jobs',
                },
                () => {
                    void queryClient.invalidateQueries({ queryKey: ['jobs'] });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'job_materials',
                },
                () => {
                    // This might be relevant if we were showing materials count or something similar directly in the list
                    void queryClient.invalidateQueries({ queryKey: ['jobs'] });
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [queryClient]);

    return {
        jobs,
        isLoading,
        error,
    };
};
