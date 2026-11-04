import React, { useEffect, useState } from 'react';
import { useTimer } from '@/contexts/TimerContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Square, Clock, CheckCircle } from 'lucide-react';

interface TaskTimerProps {
  taskId: string;
  estimatedHours?: number | null;
  spentSeconds?: number | null;
  status: string;
  canEdit: boolean;
  onStatusChange?: (status: string) => void;
  compact?: boolean;
  allowManualCompletion?: boolean;
}

const TaskTimerComponent: React.FC<TaskTimerProps> = ({
  taskId,
  estimatedHours,
  spentSeconds,
  status,
  canEdit,
  onStatusChange,
  compact = false,
  allowManualCompletion = true,
}) => {
  const {
    getTimerState,
    getTotalSeconds,
    getFormattedTime,
    getRemainingTime,
    isTimerRunning,
    startTimer,
    stopTimer,
  } = useTimer();

  const timerState = getTimerState(taskId);
  const isRunning = isTimerRunning(taskId);
  
  // Localized state for smooth counting on active stopwatch
  const [secondsDisplay, setSecondsDisplay] = useState(() => getTotalSeconds(taskId, spentSeconds ?? 0));
  
  useEffect(() => {
    if (!isRunning) {
      setSecondsDisplay(getTotalSeconds(taskId, spentSeconds ?? 0));
      return;
    }
    
    let timeoutId: any;
    
    const tick = () => {
      const totalSecs = getTotalSeconds(taskId, spentSeconds ?? 0);
      setSecondsDisplay(totalSecs);
      
      const lastSynced = timerState?.lastSyncedAt ?? Date.now();
      const elapsedMs = Date.now() - lastSynced;
      const nextTickInMs = 1000 - (elapsedMs % 1000);
      timeoutId = setTimeout(tick, nextTickInMs);
    };
    
    tick();
    
    return () => clearTimeout(timeoutId);
  }, [isRunning, taskId, spentSeconds, timerState?.lastSyncedAt]);

  const totalSeconds = isRunning ? secondsDisplay : getTotalSeconds(taskId, spentSeconds ?? 0);
  
  const formatRemainingTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formattedTime = formatRemainingTime(totalSeconds);
  const remainingTime = getRemainingTime(taskId, estimatedHours, spentSeconds ?? 0);

  const handleStart = async () => {
    await startTimer(taskId, estimatedHours ?? null);
    onStatusChange?.('in_progress');
  };

  const handleStop = async () => {
    await stopTimer(taskId);
  };

  const handleComplete = async () => {
    if (isRunning) {
      await stopTimer(taskId);
    }
    onStatusChange?.('completed');
  };

  const getStatusColor = () => {
    if (isRunning) return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'completed') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (status === 'in_progress') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = () => {
    if (isRunning) return <Play className="h-3 w-3" />;
    if (status === 'completed') return <CheckCircle className="h-3 w-3" />;
    if (status === 'in_progress') return <Square className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (isRunning) return 'Running';
    if (status === 'completed') return 'Completed';
    if (status === 'in_progress') return 'Paused';
    return 'Stopped';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Timer Display */}
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor()} text-xs`}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
          <span className="text-sm font-mono">{formattedTime}</span>
          {remainingTime !== null && (
            <span className="text-xs text-muted-foreground">
              ({remainingTime > 0 ? formatRemainingTime(remainingTime) : 'Overdue'})
            </span>
          )}
        </div>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex gap-1">
            {!isRunning && status !== 'completed' && (
              <Button onClick={handleStart} size="sm" variant="outline" className="h-7 px-2 text-xs">
                <Play className="h-3 w-3 mr-1" />
                {timerState?.baseSeconds ? 'Resume' : 'Start'}
              </Button>
            )}

            {isRunning && (
              <Button onClick={handleStop} size="sm" variant="success" className="h-7 px-2 text-xs">
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
            )}

            {allowManualCompletion && status !== 'completed' && (
              <Button
                onClick={handleComplete}
                size="sm"
                variant="success"
                className="h-7 px-2 text-xs"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold text-primary">
              {formattedTime}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge className={getStatusColor()}>
                {getStatusIcon()}
                <span className="ml-1">{getStatusText()}</span>
              </Badge>
            </div>
          </div>

          {/* Remaining Time */}
          {remainingTime !== null && (
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Estimated Remaining</div>
              <div className={`text-lg font-mono ${remainingTime <= 0 ? 'text-red-500' : 'text-orange-500'}`}>
                {remainingTime > 0 ? formatRemainingTime(remainingTime) : 'Overdue'}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {estimatedHours && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {Math.round((totalSeconds / (estimatedHours * 3600)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.round((totalSeconds / (estimatedHours * 3600)) * 100))}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Control Buttons */}
          {canEdit && (
            <div className="flex gap-2 justify-center">
              {!isRunning && status !== 'completed' && (
                <Button onClick={handleStart} size="sm" className="flex items-center gap-2" variant="outline">
                  <Play className="h-4 w-4" />
                  {timerState?.baseSeconds ? 'Resume Task' : 'Start Task'}
                </Button>
              )}

              {isRunning && (
                <Button onClick={handleStop} size="sm" variant="secondary" className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Stop Task
                </Button>
              )}

              {allowManualCompletion && status !== 'completed' && (
                <Button onClick={handleComplete} size="sm" variant="success" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Mark Complete
                </Button>
              )}
            </div>
          )}

          {/* Time Summary */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div>
              Total Time: {(totalSeconds / 3600).toFixed(1)}h
            </div>
            {estimatedHours && (
              <div>
                Estimated: {estimatedHours}h
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TaskTimer = React.memo(TaskTimerComponent);
