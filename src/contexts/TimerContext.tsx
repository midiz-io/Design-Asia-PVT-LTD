import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TimerState {
  taskId: string;
  runningEntryId: string | null;
  isRunning: boolean;
  baseSeconds: number;
  lastSyncedAt: number;
  estimatedHours: number | null;
  startedBy: string | null;
}

interface TimerContextType {
  getTimerState: (taskId: string) => TimerState | null;
  getTotalSeconds: (taskId: string, fallbackSeconds?: number) => number;
  getFormattedTime: (taskId: string, fallbackSeconds?: number) => string;
  getRemainingTime: (taskId: string, estimatedHours?: number | null, fallbackSeconds?: number) => number | null;
  isTimerRunning: (taskId: string) => boolean;
  startTimer: (taskId: string, estimatedHours?: number | null) => Promise<void>;
  stopTimer: (taskId: string) => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const INITIAL_TIMER_STATE = (taskId: string): TimerState => ({
  taskId,
  runningEntryId: null,
  isRunning: false,
  baseSeconds: 0,
  lastSyncedAt: Date.now(),
  estimatedHours: null,
  startedBy: null,
});

const formatSeconds = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

const computeElapsedSeconds = (startMs: number, endMs: number): number =>
  Math.max(0, Math.floor((endMs - startMs) / 1000));

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [timers, setTimers] = useState<Map<string, TimerState>>(new Map());
  const [spentSecondsMap, setSpentSecondsMap] = useState<Map<string, number>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const updateSpentSeconds = (taskId: string, seconds: number) => {
    setSpentSecondsMap(prev => {
      const next = new Map(prev);
      next.set(taskId, seconds);
      return next;
    });
  };

  const fetchTaskSpentSeconds = async (taskId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('v_task_time_summary')
        .select('spent_seconds')
        .eq('task_id', taskId)
        .single();

      if (error) throw error;

      const seconds = data?.spent_seconds ? Number(data.spent_seconds) : 0;
      updateSpentSeconds(taskId, seconds);
      return seconds;
    } catch (error) {
      console.error('Error fetching task spent seconds:', error);
      const existing = timers.get(taskId);
      if (existing) return existing.baseSeconds;
      return spentSecondsMap.get(taskId) ?? 0;
    }
  };

  const upsertTimer = (taskId: string, updater: (prev: TimerState) => TimerState) => {
    setTimers(prev => {
      const next = new Map(prev);
      const existing = next.get(taskId) || INITIAL_TIMER_STATE(taskId);
      next.set(taskId, updater(existing));
      return next;
    });
  };

  const startTimer = async (taskId: string, estimatedHours?: number | null) => {
    if (!user) return;

    try {
      const existingRunning = timers.get(taskId);
      if (existingRunning?.isRunning && existingRunning.startedBy === user.id) {
        return;
      }

      // 1. Optimistic and instant startup:
      // Get current total from local map first (optimistic/immediate) to bypass network latency
      const fallbackTotal = spentSecondsMap.get(taskId) ?? 0;
      const now = Date.now();
      const startedAt = new Date().toISOString();

      // Update UI IMMEDIATELY to make starting feel instant
      updateSpentSeconds(taskId, fallbackTotal);
      upsertTimer(taskId, prev => ({
        ...prev,
        taskId,
        runningEntryId: `temp-${taskId}-${now}`, // Temporary ID
        isRunning: true,
        baseSeconds: fallbackTotal, // This is the base before the new entry
        lastSyncedAt: now,
        estimatedHours: estimatedHours ?? prev.estimatedHours,
        startedBy: user.id,
      }));

      // Update task status immediately in the background
      await supabase.from('tasks').update({ status: 'in_progress' }).eq('id', taskId);

      // Now fetch latest total from database in the background to ensure it is accurate,
      // but do NOT block the UI.
      const currentTotal = await fetchTaskSpentSeconds(taskId);
      
      // Update with the fetched accurate total, but keep lastSyncedAt as the client-side start time
      updateSpentSeconds(taskId, currentTotal);
      upsertTimer(taskId, prev => {
        // Only update if it is still running and is the same temp timer session
        if (prev.isRunning && prev.runningEntryId === `temp-${taskId}-${now}`) {
          return {
            ...prev,
            baseSeconds: currentTotal,
          };
        }
        return prev;
      });

      // Create time entry in database
      const { data: timeEntry, error } = await supabase
        .from('task_time_entries')
        .insert([
          {
            task_id: taskId,
            user_id: user.id,
            started_at: startedAt,
          },
        ])
        .select()
        .single();

      if (error) {
        // Rollback on error
        setTimers(prev => {
          const next = new Map(prev);
          const current = next.get(taskId);
          if (current && current.runningEntryId === `temp-${taskId}-${now}`) {
            next.delete(taskId);
          }
          return next;
        });
        throw error;
      }

      // Check if the timer has been stopped while we were waiting for the database insert to complete
      let wasStopped = false;
      setTimers(prev => {
        const current = prev.get(taskId);
        const isStillRunning = current?.isRunning && current.runningEntryId === `temp-${taskId}-${now}`;
        if (!isStillRunning) {
          wasStopped = true;
          return prev;
        }
        
        const next = new Map(prev);
        next.set(taskId, {
          ...current,
          runningEntryId: timeEntry.id,
        });
        return next;
      });

      if (wasStopped) {
        // The user stopped the timer while it was starting!
        // We must finalize this newly created entry immediately in the database.
        await supabase
          .from('task_time_entries')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', timeEntry.id);
      }
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const finalizeEntry = async (taskId: string, timer: TimerState | undefined) => {
    if (!timer?.runningEntryId) return;
    try {
      await supabase
        .from('task_time_entries')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', timer.runningEntryId);
    } catch (error) {
      console.error('Error finalizing time entry:', error);
    }
  };

  const stopTimer = async (taskId: string) => {
    const timer = timers.get(taskId);
    if (!timer || !timer.isRunning) return;

    const nowMs = Date.now();
    const immediateTotal = timer.baseSeconds + computeElapsedSeconds(timer.lastSyncedAt, nowMs);

    // Optimistically update UI immediately - stop timer in UI
    updateSpentSeconds(taskId, immediateTotal);
    setTimers(prev => {
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });

    // Finalize entry in database
    if (timer.runningEntryId && !timer.runningEntryId.startsWith('temp-')) {
      await finalizeEntry(taskId, timer);
    }

    // Fetch final base seconds from database and update
    const baseSeconds = await fetchTaskSpentSeconds(taskId);
    updateSpentSeconds(taskId, baseSeconds);
  };

  const getTimerState = (taskId: string): TimerState | null => timers.get(taskId) || null;

  const getTotalSeconds = (taskId: string, fallbackSeconds = 0): number => {
    const timer = timers.get(taskId);
    const mapBase = spentSecondsMap.get(taskId) ?? 0;
    const storedBase = timer?.baseSeconds ?? 0;

    // When a timer is running, rely primarily on the timer state's baseSeconds to avoid
    // double-counting elapsed time that may already be reflected in the summary map.
    if (timer?.isRunning) {
      const baseSeconds = storedBase || mapBase || fallbackSeconds;
      const elapsed = Math.max(0, Math.floor((Date.now() - timer.lastSyncedAt) / 1000));
      return Math.max(0, Math.floor(baseSeconds + elapsed));
    }

    // When not running, use the freshest known total (summary map, timer state, or fallback).
    const baseSeconds = Math.max(mapBase, storedBase, fallbackSeconds);
    return Math.max(0, Math.floor(baseSeconds));
  };

  const getFormattedTime = (taskId: string, fallbackSeconds = 0): string =>
    formatSeconds(getTotalSeconds(taskId, fallbackSeconds));

  const getRemainingTime = (
    taskId: string,
    estimatedHours?: number | null,
    fallbackSeconds = 0
  ): number | null => {
    const estimate = estimatedHours ?? timers.get(taskId)?.estimatedHours;
    if (!estimate) return null;
    const totalSeconds = getTotalSeconds(taskId, fallbackSeconds);
    const estimatedSeconds = estimate * 3600;
    return Math.max(0, estimatedSeconds - totalSeconds);
  };

  const isTimerRunning = (taskId: string): boolean => timers.get(taskId)?.isRunning ?? false;

  useEffect(() => {
    const loadRunningTimers = async () => {
      if (!user) return;

      try {
        // Load ALL running timers (not just current user's) so admins can see all timers
        const { data: runningEntries, error } = await supabase
          .from('task_time_entries')
          .select(
            `
            id,
            task_id,
            user_id,
            ended_at,
            started_at,
            tasks!inner(id, estimated_hours)
          `
            )
          .is('ended_at', null)
          .order('started_at', { ascending: false });

        if (error) {
          console.error('Error loading running timers:', error);
          return;
        }

        const taskIds = Array.from(new Set((runningEntries || []).map(entry => entry.task_id)));
        let summaryMap: Record<string, number> = {};

        if (taskIds.length > 0) {
          const { data: summaries } = await supabase
            .from('v_task_time_summary')
            .select('task_id, spent_seconds')
            .in('task_id', taskIds);

          summaryMap =
            summaries?.reduce<Record<string, number>>((acc, curr) => {
              acc[curr.task_id] = curr.spent_seconds ? Number(curr.spent_seconds) : 0;
              return acc;
            }, {}) ?? {};

          setSpentSecondsMap(prev => {
            const next = new Map(prev);
            Object.entries(summaryMap).forEach(([id, seconds]) => {
              next.set(id, seconds);
            });
            return next;
          });
        }

        // Group by task_id and take the most recent entry per task
        const timersByTask = new Map<string, typeof runningEntries[0]>();
        runningEntries?.forEach(entry => {
          const existing = timersByTask.get(entry.task_id);
          if (!existing || new Date(entry.started_at) > new Date(existing.started_at)) {
            timersByTask.set(entry.task_id, entry);
          }
        });

        setTimers(prev => {
          const next = new Map(prev);
          // Only clear timers that are no longer running
          const currentTaskIds = new Set(timersByTask.keys());
          prev.forEach((timer, taskId) => {
            if (!currentTaskIds.has(taskId)) {
              next.delete(taskId);
            }
          });

          // Add or update running timers
          timersByTask.forEach((entry, taskId) => {
            // Keep the existing timer state if it's already running locally
            // to avoid jitter and skipping seconds caused by clock drift/network latency.
            const existing = prev.get(taskId);
            const isTempMatching = existing?.runningEntryId?.startsWith('temp-') && existing.startedBy === entry.user_id;
            const isRealMatching = existing?.runningEntryId === entry.id;

            if (existing && existing.isRunning && (isRealMatching || isTempMatching)) {
              next.set(taskId, {
                ...existing,
                // Update runningEntryId if it was temporary, so we don't keep it temp forever
                runningEntryId: entry.id,
                estimatedHours: entry.tasks?.estimated_hours ?? existing.estimatedHours,
              });
              return;
            }

            const startedAt = new Date(entry.started_at).getTime();
            const now = Date.now();
            
            // Calculate base seconds: total from summary minus current running session
            const totalFromSummary = summaryMap[taskId] ?? 0;
            const currentSessionElapsed = Math.floor((now - startedAt) / 1000);
            const baseSeconds = Math.max(0, totalFromSummary - currentSessionElapsed);
            
            next.set(taskId, {
              taskId,
              runningEntryId: entry.id,
              isRunning: true,
              baseSeconds,
              lastSyncedAt: startedAt,
              estimatedHours: entry.tasks?.estimated_hours ?? null,
              startedBy: entry.user_id,
            });
          });

          return next;
        });
      } catch (error) {
        console.error('Error loading running timers:', error);
      }
    };

    loadRunningTimers();
    
    // Refresh running timers periodically to ensure sync
    const refreshInterval = setInterval(loadRunningTimers, 5000); // Every 5 seconds
    
    return () => clearInterval(refreshInterval);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime-task-time-entries')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_time_entries' },
        async payload => {
          if (payload.new.ended_at) return;
          const taskId = payload.new.task_id as string;
          const startedAtMs = new Date(payload.new.started_at as string).getTime();
          const userId = payload.new.user_id as string;

          // Skip if this is our own update (already handled optimistically)
          if (userId === user.id) {
            // Just update the entry ID if it was temporary, keeping the client-side start time
            setTimers(prev => {
              const timer = prev.get(taskId);
              if (timer && timer.runningEntryId?.startsWith('temp-')) {
                const next = new Map(prev);
                next.set(taskId, {
                  ...timer,
                  runningEntryId: payload.new.id as string,
                });
                return next;
              }
              return prev;
            });
            return;
          }

          // For other users' timers, fetch latest total and calculate base seconds
          const totalFromSummary = await fetchTaskSpentSeconds(taskId);
          const now = Date.now();
          const currentSessionElapsed = Math.floor((now - startedAtMs) / 1000);
          const baseSeconds = Math.max(0, totalFromSummary - currentSessionElapsed);
          
          updateSpentSeconds(taskId, totalFromSummary);

          setTimers(prev => {
            const next = new Map(prev);
            const existing = next.get(taskId) || INITIAL_TIMER_STATE(taskId);
            next.set(taskId, {
              ...existing,
              taskId,
              runningEntryId: payload.new.id as string,
              isRunning: true,
              baseSeconds,
              lastSyncedAt: startedAtMs,
              startedBy: userId,
            });
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'task_time_entries' },
        async payload => {
          const taskId = payload.new.task_id as string;
          const userId = payload.new.user_id as string;
          const isRunning = !payload.new.ended_at;

          // Skip if this is our own update (already handled optimistically)
          if (userId === user.id && !isRunning) {
            // Timer was stopped by us, already handled
            return;
          }

          if (isRunning) {
            // Check if we already have this timer running locally
            let alreadyRunningAndSynced = false;
            setTimers(prev => {
              const existing = prev.get(taskId);
              const isTempMatching = existing?.runningEntryId?.startsWith('temp-') && existing.startedBy === userId;
              const isRealMatching = existing?.runningEntryId === payload.new.id;

              if (existing && existing.isRunning && (isRealMatching || isTempMatching)) {
                alreadyRunningAndSynced = true;
                const next = new Map(prev);
                next.set(taskId, {
                  ...existing,
                  runningEntryId: payload.new.id as string,
                });
                return next;
              }
              return prev;
            });

            if (alreadyRunningAndSynced) return;

            // Timer resumed or updated from another user
            const startMs = new Date(payload.new.started_at as string).getTime();
            const totalFromSummary = await fetchTaskSpentSeconds(taskId);
            const now = Date.now();
            const currentSessionElapsed = Math.floor((now - startMs) / 1000);
            const baseSeconds = Math.max(0, totalFromSummary - currentSessionElapsed);
            
            updateSpentSeconds(taskId, totalFromSummary);

            setTimers(prev => {
              const next = new Map(prev);
              const existing = next.get(taskId) || INITIAL_TIMER_STATE(taskId);
              next.set(taskId, {
                ...existing,
                taskId,
                runningEntryId: payload.new.id as string,
                isRunning: true,
                baseSeconds,
                lastSyncedAt: startMs,
                startedBy: userId,
              });
              return next;
            });
          } else {
            // Timer stopped - fetch final base seconds
            const baseSeconds = await fetchTaskSpentSeconds(taskId);
            updateSpentSeconds(taskId, baseSeconds);
            
            setTimers(prev => {
              const next = new Map(prev);
              // Only remove if it's not our timer or if it matches the stopped entry
              const timer = next.get(taskId);
              if (timer && (userId === user.id || timer.runningEntryId === payload.new.id)) {
                next.delete(taskId);
              }
              return next;
            });
          }
        }
      );

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    channelRef.current = channel;
    channel.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  return (
    <TimerContext.Provider
      value={{
        getTimerState,
        getTotalSeconds,
        getFormattedTime,
        getRemainingTime,
        isTimerRunning,
        startTimer,
        stopTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
