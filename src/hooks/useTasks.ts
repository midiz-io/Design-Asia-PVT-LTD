import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useTasks = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: tasks, isLoading, error } = useQuery({
        queryKey: ['tasks'],
        queryFn: async () => {
            // 1. Fetch tasks with jobs relation
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select(`
          *,
          jobs (
            id,
            job_number,
            customer_name,
            category
          )
        `)
                .order('created_at', { ascending: false });

            if (tasksError) throw tasksError;
            if (!tasksData || tasksData.length === 0) return [];

            const taskIds = tasksData.map(t => t.id);
            const userIds = new Set<string>(tasksData.map(t => t.created_by).filter(Boolean));

            // 2. Fetch related data in parallel
            const [
                timeSummaryResult,
                assigneesResult,
                attachmentsResult
            ] = await Promise.all([
                // @ts-ignore - view is not typed
                (supabase as any)
                    .from('v_task_time_summary')
                    .select('task_id, spent_seconds')
                    .in('task_id', taskIds),
                supabase
                    .from('task_assignees')
                    .select('task_id, user_id'),
                supabase
                    .from('task_attachments')
                    .select('*')
                    .in('task_id', taskIds)
                    .order('created_at', { ascending: false })
            ]);

            if (timeSummaryResult.error) throw timeSummaryResult.error;
            if (assigneesResult.error) throw assigneesResult.error;
            if (attachmentsResult.error) throw attachmentsResult.error;

            // 3. Fetch profiles for all creators and assignees
            const assigneesData = assigneesResult.data || [];
            assigneesData.forEach(a => userIds.add(a.user_id));

            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone')
                .in('id', Array.from(userIds));

            if (profilesError) throw profilesError;

            // 4. Stitch everything together
            return tasksData.map(task => {
                const jobData = (task as any).jobs;
                return {
                    ...task,
                    spent_seconds: (timeSummaryResult.data as any[])?.find(ts => ts.task_id === task.id)?.spent_seconds ?? null,
                    profiles: profilesData?.find(p => p.id === task.created_by),
                    jobs: (Array.isArray(jobData) ? jobData[0] : jobData) || null,
                    task_assignees: assigneesData
                        .filter(a => a.task_id === task.id)
                        .map(assignee => ({
                            ...assignee,
                            profiles: profilesData?.find(p => p.id === assignee.user_id)
                        })),
                    task_attachments: attachmentsResult.data?.filter(a => a.task_id === task.id) || []
                };
            });
        },
    });

    // Setup real-time listeners
    useEffect(() => {
        if (!user) return;

        const channels = [
            supabase
                .channel('tasks-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
                    void queryClient.invalidateQueries({
                        predicate: (query) =>
                            typeof query.queryKey[0] === 'string' && query.queryKey[0].endsWith('-stats')
                    });
                }),
            supabase
                .channel('task-assignees-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => {
                    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
                    void queryClient.invalidateQueries({
                        predicate: (query) =>
                            typeof query.queryKey[0] === 'string' && query.queryKey[0].endsWith('-stats')
                    });
                }),
            supabase
                .channel('task-time-entries-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'task_time_entries', filter: `user_id=eq.${user.id}` }, () => {
                    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
                    void queryClient.invalidateQueries({
                        predicate: (query) =>
                            typeof query.queryKey[0] === 'string' && query.queryKey[0].endsWith('-stats')
                    });
                }),
            supabase
                .channel('task-attachments-realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'task_attachments' }, () => {
                    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
                    void queryClient.invalidateQueries({
                        predicate: (query) =>
                            typeof query.queryKey[0] === 'string' && query.queryKey[0].endsWith('-stats')
                    });
                })
        ];

        channels.forEach(channel => channel.subscribe());

        return () => {
            channels.forEach(channel => void supabase.removeChannel(channel));
        };
    }, [queryClient, user]);

    return {
        tasks,
        isLoading,
        error,
    };
};
