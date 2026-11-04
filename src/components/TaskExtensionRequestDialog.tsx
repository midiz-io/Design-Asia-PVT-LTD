import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertCircle,
  Target,
  CheckCircle2,
  Send,
  Clock,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { TaskTimer } from '@/components/TaskTimer';
import { cn } from '@/lib/utils';

export interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  estimated_hours?: number;
  spent_seconds?: number;
}

interface TaskExtensionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial type shown; user can still switch inside the dialog */
  initialType?: 'overdue' | 'incomplete';
  overdueTasksList: TaskItem[];
  incompleteTasksList: TaskItem[];
  /** Called after the request is submitted so the parent can reset/close */
  onRequestSent?: () => void;
  role: 'employee' | 'supervisor' | 'manager';
  onStatusChange?: (taskId: string, newStatus: string) => void;
}

type RequestType = 'overdue' | 'incomplete';
type Step = 'select_type' | 'select_tasks' | 'fill_form' | 'success';

const REQUEST_TYPE_CONFIG = {
  overdue: {
    label: 'Overdue Tasks',
    description: 'Tasks that have passed their deadline',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    itemBorder: 'border-red-200',
    itemBg: 'bg-red-50/50',
    titleColor: 'text-red-900',
    dateColor: 'text-red-700',
  },
  incomplete: {
    label: 'Incomplete Tasks',
    description: 'Tasks that are still in progress or not yet started',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    itemBorder: 'border-blue-200',
    itemBg: 'bg-blue-50/50',
    titleColor: 'text-blue-900',
    dateColor: 'text-blue-700',
  },
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'accent';
    case 'medium': return 'warning';
    case 'low': return 'info';
    default: return 'secondary';
  }
};

export function TaskExtensionRequestDialog({
  open,
  onOpenChange,
  initialType = 'overdue',
  overdueTasksList,
  incompleteTasksList,
  onRequestSent,
  role,
  onStatusChange,
}: TaskExtensionRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('select_type');
  const [requestType, setRequestType] = useState<RequestType>(initialType);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const taskList = requestType === 'overdue' ? overdueTasksList : incompleteTasksList;
  const config = REQUEST_TYPE_CONFIG[requestType];

  const handleClose = () => {
    // Reset state when closing
    setStep('select_type');
    setRequestType(initialType);
    setSelectedTaskIds(new Set());
    setReason('');
    setProposedDate('');
    onOpenChange(false);
  };

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (selectedTaskIds.size === 0) {
      toast({ title: 'No tasks selected', description: 'Please select at least one task.', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Reason required', description: 'Please enter a reason for the extension.', variant: 'destructive' });
      return;
    }
    if (!proposedDate) {
      toast({ title: 'Date required', description: 'Please propose a new due date.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const rows = Array.from(selectedTaskIds).map(taskId => ({
        task_id: taskId,
        requester_id: user.id,
        requester_role: role,
        request_type: requestType,
        reason: reason.trim(),
        proposed_due_date: new Date(proposedDate).toISOString(),
      }));

      const { error } = await supabase
        .from('task_extension_requests' as any)
        .insert(rows);

      if (error) throw error;

      setStep('success');
      onRequestSent?.();
    } catch (err: any) {
      console.error('Extension request error:', err);
      toast({
        title: 'Submission Failed',
        description: err?.message || 'Could not submit extension request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTasks = taskList.filter(t => selectedTaskIds.has(t.id));

  // Minimum proposed date is tomorrow
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 16); // datetime-local format
  })();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', step === 'success' ? 'bg-green-100' : config.bgColor)}>
              {step === 'success'
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <config.icon className={cn('h-5 w-5', config.color)} />
              }
            </div>
            <div>
              <DialogTitle className="text-base font-bold leading-tight">
                {step === 'success' ? 'Request Sent!' : 'Request Task Extension'}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {step === 'select_type' && 'Choose which type of tasks to request a time extension for'}
                {step === 'select_tasks' && `Select tasks from your ${requestType} list`}
                {step === 'fill_form' && `Provide details for your extension request to admin`}
                {step === 'success' && 'Your extension request has been submitted to the admin'}
              </DialogDescription>
            </div>
          </div>

          {/* Progress dots */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mt-3">
              {(['select_type', 'select_tasks', 'fill_form'] as Step[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    step === s
                      ? 'bg-primary text-primary-foreground'
                      : ['select_tasks', 'fill_form'].indexOf(step) > ['select_type', 'select_tasks', 'fill_form'].indexOf(s)
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground'
                  )}>
                    {i + 1}
                  </div>
                  {i < 2 && <div className="h-px w-6 bg-muted" />}
                </div>
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                Step {['select_type', 'select_tasks', 'fill_form'].indexOf(step) + 1} of 3
              </span>
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {/* ─── STEP 1: Select Type ─── */}
          {step === 'select_type' && (
            <div className="space-y-3">
              {(['overdue', 'incomplete'] as RequestType[]).map(type => {
                const cfg = REQUEST_TYPE_CONFIG[type];
                const Icon = cfg.icon;
                const count = type === 'overdue' ? overdueTasksList.length : incompleteTasksList.length;
                const isSelected = requestType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setRequestType(type)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md',
                      isSelected
                        ? `${cfg.borderColor} ${cfg.bgColor} shadow-sm`
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2.5 rounded-lg', isSelected ? 'bg-white/70' : 'bg-muted')}>
                          <Icon className={cn('h-5 w-5', isSelected ? cfg.color : 'text-muted-foreground')} />
                        </div>
                        <div>
                          <p className={cn('font-semibold text-sm', isSelected ? cfg.color : 'text-foreground')}>
                            {cfg.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs font-bold', isSelected ? cfg.badgeClass : '')}>
                          {count} {count === 1 ? 'task' : 'tasks'}
                        </Badge>
                        {isSelected && (
                          <div className={cn('w-3 h-3 rounded-full', cfg.color.replace('text-', 'bg-'))} />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ─── STEP 2: Select Tasks ─── */}
          {step === 'select_tasks' && (
            <div className="space-y-3">
              {taskList.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No {requestType} tasks found!</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select one or more tasks to include in your extension request:
                  </p>
                  {taskList.map(task => {
                    const isSelected = selectedTaskIds.has(task.id);
                    return (
                      <div
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className={cn(
                          'p-3.5 border rounded-xl cursor-pointer transition-all hover:shadow-sm',
                          isSelected
                            ? `${config.borderColor} ${config.bgColor}`
                            : 'border-border hover:border-muted-foreground/40',
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`task-${task.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleTask(task.id)}
                            onClick={e => e.stopPropagation()}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <label
                                htmlFor={`task-${task.id}`}
                                className={cn('font-semibold text-sm truncate cursor-pointer', isSelected ? config.titleColor : 'text-foreground')}
                              >
                                {task.title}
                              </label>
                              <Badge variant={getPriorityColor(task.priority)} className="shrink-0 text-[10px]">
                                {task.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={cn('text-[10px] capitalize font-medium', isSelected ? config.badgeClass : '')}>
                                {task.status.replace(/_/g, ' ')}
                              </Badge>
                              {task.due_date && (
                                <span className={cn('text-[10px]', isSelected ? config.dateColor : 'text-muted-foreground')}>
                                  <CalendarDays className="inline h-3 w-3 mr-0.5" />
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ─── STEP 3: Fill Form ─── */}
          {step === 'fill_form' && (
            <div className="space-y-5">
              {/* Selected Tasks Summary */}
              <div className={cn('rounded-xl border p-4', config.bgColor, config.borderColor)}>
                <p className={cn('text-xs font-bold mb-2 uppercase tracking-wide', config.color)}>
                  Selected Tasks ({selectedTasks.length})
                </p>
                <div className="space-y-1.5">
                  {selectedTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0', config.color)} />
                      <span className="text-sm font-medium truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="ext-reason" className="text-sm font-semibold">
                  Reason for Extension <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="ext-reason"
                  placeholder="Explain why you need more time for these tasks..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={4}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">{reason.length}/500 characters</p>
              </div>

              {/* Proposed Due Date */}
              <div className="space-y-2">
                <Label htmlFor="ext-date" className="text-sm font-semibold">
                  Proposed New Due Date &amp; Time <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="ext-date"
                    type="datetime-local"
                    min={tomorrowStr}
                    value={proposedDate}
                    onChange={e => setProposedDate(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a future date and time by which you can complete these tasks.
                </p>
              </div>

              {/* Note to admin */}
              <div className={cn('rounded-xl border p-4 flex items-start gap-3', 'bg-amber-50 border-amber-200')}>
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Your request will be reviewed by the admin. Check the task status once it's reviewed.
                  The task due date will only change upon admin approval.
                </p>
              </div>
            </div>
          )}

          {/* ─── SUCCESS ─── */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-in zoom-in-50 duration-300">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Request Submitted!</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Your extension request for <strong>{selectedTasks.length}</strong> task{selectedTasks.length !== 1 ? 's' : ''} has
                  been sent to the admin. Check the task status for updates once it's reviewed.
                </p>
              </div>
              <div className={cn('rounded-xl border p-4 w-full max-w-sm text-left', config.bgColor, config.borderColor)}>
                <p className="text-xs font-bold mb-2 uppercase tracking-wide text-muted-foreground">Request Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium capitalize">{requestType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasks</span>
                    <span className="font-medium">{selectedTasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proposed Date</span>
                    <span className="font-medium">{proposedDate ? new Date(proposedDate).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-slate-50/60 flex items-center justify-between gap-3">
          {step === 'success' ? (
            <Button onClick={handleClose} className="w-full">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 'select_type') handleClose();
                  else if (step === 'select_tasks') setStep('select_type');
                  else if (step === 'fill_form') setStep('select_tasks');
                }}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                {step === 'select_type' ? 'Cancel' : 'Back'}
              </Button>

              {step === 'fill_form' ? (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !reason.trim() || !proposedDate || selectedTaskIds.size === 0}
                  className="gap-1.5 bg-primary hover:bg-primary/90 font-semibold"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send to Admin
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (step === 'select_type') {
                      setSelectedTaskIds(new Set());
                      setStep('select_tasks');
                    } else if (step === 'select_tasks') {
                      if (selectedTaskIds.size === 0) {
                        toast({ title: 'No tasks selected', description: 'Please select at least one task to continue.', variant: 'destructive' });
                        return;
                      }
                      setStep('fill_form');
                    }
                  }}
                  className="gap-1.5"
                  disabled={step === 'select_tasks' && taskList.length === 0}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
