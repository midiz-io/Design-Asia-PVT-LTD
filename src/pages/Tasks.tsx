import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import React from 'react';
import { useDebounce } from 'use-debounce';
import { Virtuoso } from 'react-virtuoso';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTimer } from '@/contexts/TimerContext';
import { TaskTimer } from '@/components/TaskTimer';
import { Plus, CheckCircle, Clock, AlertCircle, CheckSquare, Users, Filter, Eye, Edit, Trash2, MapPin, FileCheck, File, X, Camera, TrendingUp, Award, Target, Link2, ChevronDown, Search, ArrowLeft, Mic, Send, MessageSquare, Image } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import FileUpload from '@/components/FileUpload';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';
import CameraCapture from '@/components/CameraCapture';
import ProofUploadDialog from '@/components/ProofUploadDialog';
import { downloadTasksInvoiceSvg } from '@/utils/svgInvoice';
import { downloadTasksInvoicePngPortrait, downloadTasksInvoicePngLandscape } from '@/utils/pngInvoice';
import { sendTaskAssignmentNotification, sendTaskApprovalRequestNotification, sendTaskCommentNotification, sendEmployeeSelfTaskNotification, sendSupervisorTaskCompletionNotification, sendTaskClarificationRequestNotification, uploadImageToGeekHirusha } from '@/utils/whatsapp';
import { useTasks } from '@/hooks/useTasks';
import { TasksSkeleton } from '@/components/skeletons/TasksSkeleton';
import { useQueryClient } from '@tanstack/react-query';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
}

interface Job {
  id: string;
  job_number: string;
  customer_name: string;
  category: string;
}

interface Geofence {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  location_required: boolean;
  requires_proof: boolean;
  proof_url: string | null;
  proof_photo_url: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  estimated_hours?: number | null;
  spent_seconds?: number | null;
  task_identification_code?: string | null;
  job_id?: string | null;
  geofence_id?: string | null;
  created_by: string;
  task_assignees?: Array<{
    user_id: string;
    profiles: Profile;
  }>;
  task_attachments?: Array<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    uploaded_by: string;
    created_at: string;
  }>;
  profiles?: Profile;
  jobs?: Job;
}

interface TaskComment {
  id: string;
  message: string;
  sender_id: string;
  receiver_id: string | null;
  created_at: string;
}

interface SearchableSelectOption {
  value: string;
  label: React.ReactNode;
  searchString: string;
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

const SearchableSelect = React.memo(({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found."
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-9 sm:h-10 text-xs sm:text-sm w-full justify-between text-left font-normal border border-input bg-background hover:bg-accent hover:text-accent-foreground"
        >
          <span className="truncate font-medium text-foreground">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options
                .filter((opt) => {
                  if (!search) return true;
                  return opt.searchString.toLowerCase().includes(search.toLowerCase());
                })
                .map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="cursor-pointer text-xs sm:text-sm font-medium text-foreground"
                  >
                    {opt.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

const MemoizedKanbanCard = React.memo(({ task, renderCard }: { task: any, renderCard: (task: any) => JSX.Element }) => {
  return renderCard(task);
}, (prevProps, nextProps) => {
  return prevProps.task.id === nextProps.task.id && prevProps.task.status === nextProps.task.status && prevProps.task.priority === nextProps.task.priority && prevProps.task.updated_at === nextProps.task.updated_at;
});

const Tasks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlStatus = searchParams.get('status');

  const { tasks = [], isLoading: tasksLoading } = useTasks();
  const queryClient = useQueryClient();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [adminContacts, setAdminContacts] = useState<Profile[]>([]);
  const [commentsByTask, setCommentsByTask] = useState<Record<string, TaskComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoadingTasks, setCommentLoadingTasks] = useState<Record<string, boolean>>({});
  const [commentSubmittingTaskId, setCommentSubmittingTaskId] = useState<string | null>(null);
  const [activeCommentTaskId, setActiveCommentTaskId] = useState<string | null>(null);
  const [mentionState, setMentionState] = useState<{
    taskId: string;
    query: string;
    start: number;
    end: number;
  } | null>(null);
  const commentInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [jobs, setJobs] = useState<Job[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [userSupervisor, setUserSupervisor] = useState<Profile | null>(null);
  
  // Clarification state
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyRecipientId, setClarifyRecipientId] = useState<string>('');
  const [clarifyType, setClarifyType] = useState<'text' | 'image' | 'voice'>('text');
  const [clarifyMessage, setClarifyMessage] = useState('');
  
  // Clarification Image
  const [clarifyImageFile, setClarifyImageFile] = useState<File | null>(null);
  const [clarifyImagePreview, setClarifyImagePreview] = useState<string | null>(null);
  
  // Clarification Voice Note
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioIntervalRef = useRef<any>(null);
  
  const [clarifySubmitting, setClarifySubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [taskPerformanceId, setTaskPerformanceId] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const commentScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { user, isAdmin, isSupervisor, userRole, getDashboardRoute } = useAuth();
  const { hasAccess, canEdit, checkAccessAndNavigate, loading: permissionsLoading } = usePermissions();
  const { isTimerRunning, getFormattedTime } = useTimer();
  const canCommentOnTasks = canEdit('tasks') || isAdmin;

  const activeEmployeeFilter = useMemo(() => {
    if (!isAdmin && !isSupervisor) {
      return user?.id || 'all';
    }
    return employeeFilter;
  }, [isAdmin, isSupervisor, user?.id, employeeFilter]);

  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Statuses', searchString: 'All Statuses' },
    { value: 'overdue', label: 'Overdue', searchString: 'Overdue' },
    { value: 'incomplete', label: 'In Complete', searchString: 'In Complete incomplete' },
    { value: 'not_started', label: 'Not Started', searchString: 'Not Started' },
    { value: 'in_progress', label: 'In Progress', searchString: 'In Progress' },
    { value: 'pending_approval', label: 'Pending Approval', searchString: 'Pending Approval' },
    { value: 'completed', label: 'Completed', searchString: 'Completed' },
    { value: 'rejected', label: 'Rejected', searchString: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled', searchString: 'Cancelled' },
  ], []);

  const priorityOptions = useMemo(() => [
    { value: 'all', label: 'All Priorities', searchString: 'All Priorities' },
    { value: 'low', label: 'Low', searchString: 'Low' },
    { value: 'medium', label: 'Medium', searchString: 'Medium' },
    { value: 'high', label: 'High', searchString: 'High' },
    { value: 'urgent', label: 'Urgent', searchString: 'Urgent' },
  ], []);

  const employeeOptions = useMemo(() => [
    { value: 'all', label: 'All Employees', searchString: 'All Employees' },
    ...employees.map(emp => ({
      value: emp.id,
      label: emp.full_name || emp.email,
      searchString: `${emp.full_name || ''} ${emp.email || ''}`
    }))
  ], [employees]);

  const jobOptions = useMemo(() => [
    { value: 'all', label: 'All Jobs', searchString: 'All Jobs' },
    { value: 'none', label: 'No Job Assigned', searchString: 'No Job Assigned' },
    ...jobs.map(job => ({
      value: job.id,
      label: <span className="truncate block max-w-[200px]">{job.job_number} - {job.customer_name}</span>,
      searchString: `${job.job_number} ${job.customer_name}`
    }))
  ], [jobs]);

  const creatorOptions = useMemo(() => [
    { value: 'all', label: 'All Creators', searchString: 'All Creators' },
    ...employees.map(emp => ({
      value: emp.id,
      label: emp.full_name || emp.email,
      searchString: `${emp.full_name || ''} ${emp.email || ''}`
    }))
  ], [employees]);

  const daysOptions = useMemo(() => [
    { value: 'all', label: 'All Time', searchString: 'All Time' },
    { value: 'today', label: 'Today', searchString: 'Today' },
    { value: 'yesterday', label: 'Yesterday', searchString: 'Yesterday' },
    { value: 'last_7_days', label: 'Last 7 Days', searchString: 'Last 7 Days 7' },
    { value: 'last_30_days', label: 'Last 30 Days', searchString: 'Last 30 Days 30' },
    { value: 'this_week', label: 'This Week', searchString: 'This Week' },
    { value: 'this_month', label: 'This Month', searchString: 'This Month' },
    { value: 'last_month', label: 'Last Month', searchString: 'Last Month' },
    { value: 'this_year', label: 'This Year', searchString: 'This Year' },
  ], []);

  const taskInsightOptions = useMemo(() => [
    { value: 'all', label: 'All Tasks', searchString: 'All Tasks' },
    ...tasks.map(t => ({
      value: t.id,
      label: <span className="truncate block max-w-[250px]">{t.title}</span>,
      searchString: t.title
    }))
  ], [tasks]);

  const getCurrentUserName = () =>
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'System';

  const getTaskAssigneeIds = (task?: Task | null) =>
    task?.task_assignees?.map((assignee) => assignee.user_id).filter(Boolean) ?? [];

  const formatStatusLabel = (status: string) =>
    status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  // Helper function to convert UTC date to local datetime-local format
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to format date for display (preserves the local time that was set)
  const formatDateForDisplay = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return '';
    // Return formatted date string in local timezone
    return date.toLocaleString();
  };

  // Helper function to convert datetime-local string to ISO string for database storage
  const convertDateForDatabase = (dateString: string | null): string | null => {
    if (!dateString) return null;
    // datetime-local format is "YYYY-MM-DDTHH:mm"
    // Create a Date object (interprets as local time)
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return null;
    // Return ISO string (in UTC) for database storage
    return date.toISOString();
  };

  const getTaskUrl = (taskId: string) => `/tasks?taskId=${taskId}`;

  const getTaskLink = (taskId: string) => {
    const relativeUrl = getTaskUrl(taskId);
    return `https://designasiaetm.site${relativeUrl}`;
  };

  const handleOpenTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
    if (!commentsByTask[task.id]) {
      fetchTaskComments(task.id);
    }

    const currentTaskParam = searchParams.get('taskId');
    if (currentTaskParam === task.id) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set('taskId', task.id);
    setSearchParams(params, { replace: true });
  };

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailsOpen(open);

    if (!open) {
      setSelectedTask(null);
      if (searchParams.get('taskId')) {
        const params = new URLSearchParams(searchParams);
        params.delete('taskId');
        setSearchParams(params, { replace: true });
      }
    }
  };

  const handleCopyTaskLink = async (taskId: string) => {
    const link = getTaskLink(taskId);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        // Removed toast - clipboard copy is self-evident
        return;
      }

      throw new Error('Clipboard API is not available');
    } catch (error) {
      console.error('Failed to copy task link', error);
      // Removed toast - error is logged to console
    }
  };

  const getProfileById = (userId?: string | null) => {
    if (!userId) return undefined;
    return employees.find((profile) => profile.id === userId) || adminContacts.find((profile) => profile.id === userId);
  };

  const getMentionSuggestions = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    const pool = employees;
    if (!normalizedQuery) return pool.slice(0, 10);

    return pool
      .filter((profile) => {
        const nameMatch = profile.full_name?.toLowerCase().includes(normalizedQuery);
        const emailMatch = profile.email?.toLowerCase().includes(normalizedQuery);
        return nameMatch || emailMatch;
      })
      .slice(0, 10);
  };

  const formatCommentTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  const extractMentionedProfiles = (text: string): Profile[] => {
    const mentionRegex = /@([A-Za-z0-9_.\-\s]+)/g;
    const matches = Array.from(text.matchAll(mentionRegex));
    const seen = new Set<string>();
    const found: Profile[] = [];

    matches.forEach((match) => {
      const mention = match[1]?.trim();
      if (!mention) return;
      const lowerMention = mention.toLowerCase();
      const profile =
        employees.find((emp) => emp.full_name?.toLowerCase() === lowerMention) ||
        employees.find((emp) => emp.email?.toLowerCase() === lowerMention) ||
        employees.find((emp) => emp.email?.split('@')[0]?.toLowerCase() === lowerMention);
      if (profile && !seen.has(profile.id)) {
        seen.add(profile.id);
        found.push(profile);
      }
    });

    return found;
  };

  const fetchTaskComments = async (taskId: string) => {
    if (!taskId) return;
    setCommentLoadingTasks((prev) => ({ ...prev, [taskId]: true }));
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, message, sender_id, receiver_id, created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCommentsByTask((prev) => ({ ...prev, [taskId]: (data as TaskComment[]) || [] }));

      // Auto-scroll to bottom after loading comments
      setTimeout(() => {
        handleScrollToBottom(taskId);
      }, 100);
    } catch (error) {
      console.error('Error fetching comments:', error);
      // Removed toast - comments will show empty state on error
    } finally {
      setCommentLoadingTasks((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleToggleCommentBox = (taskId: string) => {
    setActiveCommentTaskId((prev) => (prev === taskId ? null : taskId));
    if (!commentsByTask[taskId]) {
      fetchTaskComments(taskId);
    }
  };

  const updateMentionState = (taskId: string, value: string, cursorPosition: number) => {
    const beforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = beforeCursor.match(/@([\w\s.\-]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1] || '';
      setMentionState({
        taskId,
        query,
        start: cursorPosition - mentionMatch[0].length,
        end: cursorPosition,
      });
    } else if (mentionState?.taskId === taskId) {
      setMentionState(null);
    }
  };

  const handleCommentInputChange = (taskId: string, value: string, cursorPosition?: number) => {
    setCommentInputs((prev) => ({ ...prev, [taskId]: value }));
    const position = typeof cursorPosition === 'number' ? cursorPosition : value.length;
    updateMentionState(taskId, value, position);
  };

  const handleCommentInputCursorUpdate = (taskId: string) => {
    const ref = commentInputRefs.current[taskId];
    if (!ref) return;
    const value = ref.value;
    const cursorPosition = ref.selectionStart ?? value.length;
    updateMentionState(taskId, value, cursorPosition);
  };

  const handleMentionSelect = (taskId: string, profile: Profile) => {
    const ref = commentInputRefs.current[taskId];
    const value = commentInputs[taskId] || '';
    const mention = `@${profile.full_name}`;

    if (!mentionState || mentionState.taskId !== taskId) {
      const nextValue = `${value}${mention} `;
      setCommentInputs((prev) => ({ ...prev, [taskId]: nextValue }));
      requestAnimationFrame(() => {
        ref?.focus();
        if (ref) {
          const pos = nextValue.length;
          ref.setSelectionRange(pos, pos);
        }
      });
      return;
    }

    const nextValue =
      value.slice(0, mentionState.start) + `${mention} ` + value.slice(mentionState.end);

    setCommentInputs((prev) => ({ ...prev, [taskId]: nextValue }));
    setMentionState(null);

    requestAnimationFrame(() => {
      if (ref) {
        const cursor = mentionState.start + mention.length + 1;
        ref.focus();
        ref.setSelectionRange(cursor, cursor);
      }
    });
  };

  const sendCommentWhatsAppNotifications = async (task: Task, commentText: string, mentionProfiles: Profile[]) => {
    try {
      const commenterName = getCurrentUserName();
      const taskLink = getTaskLink(task.id);
      const mentionIds = new Set(mentionProfiles.map((profile) => profile.id));
      const recipients = new Map<
        string,
        {
          profile: Profile;
          isMention: boolean;
        }
      >();

      const addRecipient = (profile?: Profile | null, forceMention = false) => {
        if (!profile || !profile.phone) return;
        if (profile.id === user?.id) return;
        const isMention = forceMention || mentionIds.has(profile.id);
        const existing = recipients.get(profile.phone);
        if (!existing) {
          recipients.set(profile.phone, { profile, isMention });
        } else if (isMention && !existing.isMention) {
          recipients.set(profile.phone, { profile: existing.profile, isMention: true });
        }
      };

      adminContacts.forEach((contact) => addRecipient(contact));
      task.task_assignees?.forEach((assignee) => addRecipient(assignee.profiles));
      mentionProfiles.forEach((profile) => addRecipient(profile, true));

      if (recipients.size === 0) return;

      await Promise.allSettled(
        Array.from(recipients.values()).map(({ profile, isMention }) =>
          sendTaskCommentNotification({
            recipientName: profile.full_name,
            recipientPhone: profile.phone!,
            commenterName,
            taskTitle: task.title,
            comment: commentText,
            taskLink,
            isMention,
          })
        )
      );
    } catch (error) {
      console.error('Failed to send WhatsApp comment notifications', error);
    }
  };

  const handleSubmitComment = async (task: Task) => {
    if (!task || !user?.id) return;
    const content = commentInputs[task.id]?.trim();
    if (!content) return;

    if (!canCommentOnTasks) {
      // Removed toast - permission denied is handled by UI state
      return;
    }

    setCommentSubmittingTaskId(task.id);
    try {
      const mentionedProfiles = extractMentionedProfiles(content);
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([
          {
            message: content,
            sender_id: user.id,
            receiver_id: null,
            task_id: task.id,
          },
        ])
        .select('id, message, sender_id, receiver_id, created_at')
        .single();

      if (error) throw error;

      setCommentsByTask((prev) => ({
        ...prev,
        [task.id]: [...(prev[task.id] || []), data as TaskComment],
      }));
      setCommentInputs((prev) => ({ ...prev, [task.id]: '' }));

      // Auto-scroll to bottom after adding comment
      setTimeout(() => {
        handleScrollToBottom(task.id);
      }, 100);

      // Removed toast - comment appears immediately in UI

      await sendCommentWhatsAppNotifications(task, content, mentionedProfiles);
    } catch (error: any) {
      console.error('Error adding comment:', error);
      // Removed toast - error is logged, user can retry
    } finally {
      setCommentSubmittingTaskId(null);
    }
  };

  const notifyAdminsWithProof = async ({
    taskId,
    taskTitle,
    taskDescription,
    priority,
    dueDate,
    proofUrl,
    submittedBy,
  }: {
    taskId: string;
    taskTitle: string;
    taskDescription?: string | null;
    priority?: string;
    dueDate?: string | null;
    proofUrl: string;
    submittedBy: string;
  }) => {
    if (!proofUrl) return;

    const contactsWithPhone = adminContacts.filter((contact) => contact.phone);

    if (contactsWithPhone.length === 0) {
      console.warn('No admin contacts with phone numbers configured for WhatsApp notifications.');
      return;
    }

    const readableDueDate = dueDate ? formatDateForDisplay(dueDate) : undefined;
    const taskLink = getTaskLink(taskId);

    await Promise.allSettled(
      contactsWithPhone.map((contact) =>
        sendTaskApprovalRequestNotification({
          adminName: contact.full_name,
          adminPhone: contact.phone!,
          taskTitle,
          taskDescription: taskDescription || '',
          employeeName: submittedBy,
          dueDate: readableDueDate,
          priority,
          taskLink,
          proofUrl,
        })
      )
    );
  };

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: string;
    location_required: boolean;
    requires_proof: boolean;
    assignee_ids: string[];
    job_id?: string | null;
    geofence_id?: string | null;
    task_identification_code: string;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    location_required: false,
    requires_proof: false,
    assignee_ids: [],
    job_id: null,
    geofence_id: null,
    task_identification_code: '',
  });

  const [attachedFiles, setAttachedFiles] = useState<Array<{
    fileUrl: string;
    fileName: string;
    fileType: string;
  }>>([]);

  const [showCamera, setShowCamera] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [geofenceSearch, setGeofenceSearch] = useState('');
  const [geofenceOpen, setGeofenceOpen] = useState(false);
  const [editGeofenceOpen, setEditGeofenceOpen] = useState(false);

  const jobIdParam = searchParams.get('jobId');

  useEffect(() => {
    // Wait for permissions to load before checking access
    if (permissionsLoading) {
      return;
    }

    if (!checkAccessAndNavigate('tasks')) {
      return;
    }
    // Run daily carry-over (server-side guarded)
    supabase.rpc('carry_over_incomplete_tasks')
      .then((res) => {
        if (res.error) {
          console.warn('Carry-over RPC error:', res.error.message);
        } else {
          const updated = Array.isArray(res.data) && res.data[0]?.updated_count;
          if (updated && updated > 0) {
            console.log(`Carried over ${updated} tasks to today`);
          }
        }
      })
      .catch((e) => console.warn('Carry-over RPC failed:', e));

    fetchEmployees();
    fetchJobs();
    fetchGeofences();
    fetchAdminContacts();
    fetchUserSupervisor();
    if (jobIdParam) {
      setCreateOpen(true);
      setFormData((prev) => ({ ...prev, job_id: jobIdParam }));
    }
  }, [checkAccessAndNavigate, permissionsLoading, jobIdParam, user?.id]);

  useEffect(() => {
    const taskIdFromUrl = searchParams.get('taskId');

    if (!taskIdFromUrl) {
      if (detailsOpen) {
        setDetailsOpen(false);
        setSelectedTask(null);
      }
      return;
    }

    // Prevent re-fetching if we already have this task selected
    if (selectedTask?.id === taskIdFromUrl && detailsOpen) {
      return;
    }

    if (!tasks.length) {
      return;
    }

    const matchingTask = tasks.find((task) => task.id === taskIdFromUrl);
    if (matchingTask) {
      setSelectedTask(matchingTask);
      setDetailsOpen(true);
      if (!commentsByTask[matchingTask.id]) {
        fetchTaskComments(matchingTask.id);
      }
      return;
    }

    // Removed toast - task not found is handled by URL cleanup

    const params = new URLSearchParams(searchParams);
    params.delete('taskId');
    setSearchParams(params, { replace: true });
  }, [searchParams, tasks, setSearchParams]);

  // Realtime comments subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks-comments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newComment = payload.new as any;
          const oldComment = payload.old as any;
          const taskId = newComment?.task_id || oldComment?.task_id;
          
          if (taskId) {
            void fetchTaskComments(taskId);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmployees = async () => {
    const cacheKey = `tasks-employees-${user?.id}-${isSupervisor && !isAdmin}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setEmployees(JSON.parse(cached));
    }
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .order('full_name');

      // If user is supervisor and not admin, only show their team members
      if (isSupervisor && !isAdmin) {
        const { data: teamData } = await supabase
          .from('supervisor_employees')
          .select('employee_id')
          .eq('supervisor_id', user?.id);
        
        const teamIds = teamData?.map(m => m.employee_id) || [];
        if (teamIds.length > 0) {
          query = query.in('id', teamIds);
        } else {
          // If no team members, show empty list
          setEmployees([]);
          sessionStorage.setItem(cacheKey, JSON.stringify([]));
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      const result = data || [];
      setEmployees(result);
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchJobs = async () => {
    const cacheKey = 'tasks-jobs';
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setJobs(JSON.parse(cached));
    }
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_number, customer_name, category')
        .order('job_number');

      if (error) throw error;
      const result = data || [];
      setJobs(result);
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
    }
  };

  const fetchGeofences = async () => {
    const cacheKey = 'tasks-geofences';
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setGeofences(JSON.parse(cached));
    }
    try {
      const { data, error } = await supabase
        .from('geofences')
        .select('id, name, description, latitude, longitude, radius_meters, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      const result = data || [];
      setGeofences(result);
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (error: any) {
      console.error('Error fetching geofences:', error);
    }
  };

  const fetchAdminContacts = async () => {
    const cacheKey = 'tasks-admin-contacts';
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setAdminContacts(JSON.parse(cached));
    }
    try {
      const { data: adminRoleData, error: adminRoleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoleError) throw adminRoleError;

      const adminIds = adminRoleData?.map((role) => role.user_id).filter(Boolean) || [];

      if (adminIds.length === 0) {
        setAdminContacts([]);
        sessionStorage.setItem(cacheKey, JSON.stringify([]));
        return;
      }

      const { data: adminProfiles, error: adminProfilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', adminIds);

      if (adminProfilesError) throw adminProfilesError;

      const result = adminProfiles || [];
      setAdminContacts(result);
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (error) {
      console.error('Error fetching admin contacts:', error);
    }
  };

  const fetchUserSupervisor = async () => {
    if (!user?.id) return;
    const cacheKey = `tasks-user-supervisor-${user.id}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed) {
        setUserSupervisor(parsed as Profile);
        setClarifyRecipientId(parsed.id);
      }
    }
    try {
      const { data, error } = await supabase
        .from('supervisor_employees')
        .select(`
          supervisor_id,
          profiles:supervisor_id (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq('employee_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data && data.profiles) {
        const profile = (data as any).profiles;
        setUserSupervisor(profile as Profile);
        setClarifyRecipientId(profile.id);
        sessionStorage.setItem(cacheKey, JSON.stringify(profile));
      } else {
        sessionStorage.setItem(cacheKey, JSON.stringify(null));
      }
    } catch (error) {
      console.error('Error fetching supervisor:', error);
    }
  };

  const compressImageFile = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas 2d context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      setAudioBlob(null);
      setAudioUrl(null);
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      audioIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      const { default: Alert } = await import('@/utils/alert');
      Alert.error('Microphone Error', 'Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
  };

  const handleSubmitClarification = async (task: Task) => {
    const { default: Alert } = await import('@/utils/alert');

    // Automatically build the list of all recipients (Supervisor + all Admins)
    const recipients: Profile[] = [];
    if (userSupervisor) {
      recipients.push(userSupervisor);
    }
    
    adminContacts.forEach(admin => {
      // Avoid duplicate profiles
      if (!recipients.some(r => r.id === admin.id)) {
        recipients.push(admin);
      }
    });

    if (recipients.length === 0) {
      Alert.error('Error', 'No supervisor or administrator contacts found.');
      return;
    }

    if (!clarifyMessage.trim() && clarifyType === 'text') {
      Alert.error('Error', 'Please enter your question');
      return;
    }

    setClarifySubmitting(true);
    try {
      let finalMediaUrl: string | null = null;
      
      const senderName = getCurrentUserName();
      const taskLink = getTaskLink(task.id);

      if (clarifyType === 'image' && clarifyImageFile) {
        // Compress image first
        const compressedBlob = await compressImageFile(clarifyImageFile);
        
        // Upload to GeekHirusha
        const uploadedUrl = await uploadImageToGeekHirusha(compressedBlob);
        if (!uploadedUrl) {
          throw new Error('Failed to upload image. Please try again.');
        }
        finalMediaUrl = uploadedUrl;
      }

      const chatMessagesToInsert = [];

      // Construct records for each recipient
      for (const recipient of recipients) {
        if (!recipient.phone) continue;

        const internalMsgPrefix = clarifyType === 'image' 
          ? `[🖼️ Image Clarification Request]` 
          : `[❓ Clarification Request]`;

        const internalMessage = `${internalMsgPrefix} directed to ${recipient.full_name}:\n${clarifyMessage || 'Please review attached file.'}`;

        chatMessagesToInsert.push({
          message: internalMessage,
          sender_id: user?.id,
          receiver_id: recipient.id,
          task_id: task.id,
        });
      }

      // Bulk insert internal chat records (very fast, database updates in real-time)
      if (chatMessagesToInsert.length > 0) {
        const { data: chatData, error: chatError } = await supabase
          .from('chat_messages')
          .insert(chatMessagesToInsert)
          .select('id, message, sender_id, receiver_id, created_at');

        if (chatError) throw chatError;

        // Update the comments state locally
        if (chatData) {
          setCommentsByTask(prev => ({
            ...prev,
            [task.id]: [...(prev[task.id] || []), ...(chatData as TaskComment[])]
          }));
        }
      }

      // Fire WhatsApp notifications concurrently in the background (completely non-blocking!)
      recipients.forEach(recipient => {
        if (!recipient.phone) return;
        
        sendTaskClarificationRequestNotification({
          senderName,
          recipientName: recipient.full_name,
          recipientPhone: recipient.phone,
          taskTitle: task.title,
          taskCode: task.task_identification_code,
          type: clarifyType as 'text' | 'image',
          message: clarifyMessage || 'See attached file.',
          mediaUrl: finalMediaUrl,
          taskLink,
        }).catch(err => {
          console.error(`Background WhatsApp notification failed for ${recipient.full_name}:`, err);
        });
      });

      // Show success toast immediately for real-time responsiveness
      Alert.success('Clarification request sent successfully via WhatsApp!', undefined, 2000);
      
      // Reset form states instantly
      setClarifyMessage('');
      setClarifyImageFile(null);
      setClarifyImagePreview(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setClarifyOpen(false);
    } catch (error: any) {
      console.error('Clarification submit error:', error);
      Alert.error('Error', error.message || 'Failed to send clarification request.');
    } finally {
      setClarifySubmitting(false);
    }
  };



  const handleFileUpload = (fileUrl: string, fileName: string) => {
    const fileType = fileName.split('.').pop()?.toLowerCase() || 'unknown';
    setAttachedFiles(prev => [...prev, { fileUrl, fileName, fileType }]);
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([
          {
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            due_date: convertDateForDatabase(formData.due_date),
            location_required: formData.location_required,
            requires_proof: formData.requires_proof,
            created_by: user?.id,
            status: 'not_started',
            job_id: formData.job_id || null,
            geofence_id: formData.geofence_id || null,
            task_identification_code: formData.task_identification_code || null,
          },
        ])
        .select()
        .single();

      if (taskError) throw taskError;

      // Assign employees to task
      if (formData.assignee_ids.length > 0 && taskData) {
        const assignments = formData.assignee_ids.map((userId) => ({
          task_id: taskData.id,
          user_id: userId,
        }));

        const { error: assignError } = await supabase
          .from('task_assignees')
          .insert(assignments);

        if (assignError) throw assignError;
      }

      // Upload attached files
      if (attachedFiles.length > 0 && taskData) {
        const attachments = attachedFiles.map((file) => ({
          task_id: taskData.id,
          file_name: file.fileName,
          file_url: file.fileUrl,
          file_type: file.fileType,
          uploaded_by: user?.id,
        }));

        const { error: attachmentError } = await supabase
          .from('task_attachments')
          .insert(attachments);

        if (attachmentError) throw attachmentError;
      }

      const { default: Alert } = await import('@/utils/alert');
      Alert.success('Task created successfully');

      const creatorName = getCurrentUserName();
      const assignedIds = formData.assignee_ids;

      // If an employee (non-admin) creates a task, specifically notify all admins
      if (!isAdmin && adminContacts.length > 0) {
        // Send WhatsApp notification to all admins
        for (const admin of adminContacts) {
          if (admin.phone) {
            try {
              await sendEmployeeSelfTaskNotification({
                adminPhone: admin.phone,
                adminName: admin.full_name,
                employeeName: creatorName,
                taskTitle: taskData.title,
                taskDescription: taskData.description || undefined,
                priority: taskData.priority,
                taskLink: getTaskLink(taskData.id),
                createdAt: new Date().toISOString(),
                latitude: 0,
                longitude: 0,
                locationName: 'Task created by employee',
              });
            } catch (error) {
              console.error(`Failed to send WhatsApp notification to admin ${admin.full_name}:`, error);
            }
          }
        }
      }

      if (assignedIds.length > 0) {
        // Send WhatsApp notifications to assigned employees
        const assignedEmployees = employees.filter(emp => assignedIds.includes(emp.id));
        for (const employee of assignedEmployees) {
          if (employee.phone) {
            try {
              await sendTaskAssignmentNotification(
                employee.full_name,
                employee.phone,
                taskData.title,
                taskData.description || '',
                taskData.due_date ? new Date(taskData.due_date).toLocaleDateString() : undefined,
                taskData.priority,
                getTaskLink(taskData.id)
              );
            } catch (error) {
              console.error(`Failed to send WhatsApp to ${employee.full_name}:`, error);
            }
          }
        }
      }

      // If employee created a self-assigned task, try to capture and save location
      const isSelfAssigned = !isAdmin && user?.id && formData.assignee_ids.includes(user.id);

      if (isSelfAssigned && 'geolocation' in navigator) {
        console.log('Self-assigned task detected, attempting to capture location...');
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            });
          });

          const { latitude, longitude } = position.coords;

          // Save location to the task record
          const { error: locationError } = await supabase
            .from('tasks')
            .update({
              creation_latitude: latitude,
              creation_longitude: longitude,
            })
            .eq('id', taskData.id);

          if (locationError) {
            console.error('Failed to save task creation location:', locationError);
          } else {
            console.log('Task creation location saved successfully');
          }
        } catch (geoError) {
          console.error('Failed to get location for task creation:', geoError);
        }
      }

      setCreateOpen(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        location_required: false,
        requires_proof: false,
        assignee_ids: [],
        job_id: null,
        geofence_id: null,
        task_identification_code: '',
      });
      setAttachedFiles([]);
      setGeofenceOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      const { default: Alert } = await import('@/utils/alert');
      Alert.error('Error', error.message);
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority as 'low' | 'medium' | 'high' | 'urgent',
      due_date: formatDateForInput(task.due_date),
      location_required: task.location_required || false,
      requires_proof: task.requires_proof || false,
      assignee_ids: task.task_assignees?.map(a => a.user_id) || [],
      job_id: task.job_id || null,
      geofence_id: task.geofence_id || null,
      task_identification_code: task.task_identification_code || '',
    });
    setEditOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !user?.id) return;

    try {
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          due_date: convertDateForDatabase(formData.due_date),
          location_required: formData.location_required,
          requires_proof: formData.requires_proof,
          geofence_id: formData.geofence_id || null,
          task_identification_code: formData.task_identification_code || null,
        })
        .eq('id', selectedTask.id);

      if (taskError) throw taskError;

      // Update assignees
      if (formData.assignee_ids.length >= 0) {
        // Delete existing assignments
        await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', selectedTask.id);

        // Add new assignments
        if (formData.assignee_ids.length > 0) {
          const assignments = formData.assignee_ids.map((userId) => ({
            task_id: selectedTask.id,
            user_id: userId,
          }));

          const { error: assignError } = await supabase
            .from('task_assignees')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }

      const { default: Alert } = await import('@/utils/alert');
      Alert.success('Task updated successfully');

      setEditOpen(false);
      setSelectedTask(null);
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      const { default: Alert } = await import('@/utils/alert');
      Alert.error('Error', error.message);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: 'not_started' | 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', taskId);

      if (error) throw error;

      // Removed toast - status change is visible in UI immediately
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      const { default: Alert } = await import('@/utils/alert');
      Alert.error('Error', error.message);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    setCurrentTaskId(taskId);
    setShowCamera(true);
  };

  const compressImageBlob = (blob: Blob, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas 2d context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (resultBlob) => {
              if (resultBlob) {
                resolve(resultBlob);
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoCapture = async (imageBlob: Blob) => {
    if (!currentTaskId) return;

    try {
      console.log('Compressing captured photo...');
      const compressedBlob = await compressImageBlob(imageBlob);

      console.log('Uploading photo proof to external GeekHirusha API...');
      const externalUrl = await uploadImageToGeekHirusha(compressedBlob);

      if (externalUrl) {
        console.log('Proof photo uploaded to GeekHirusha:', externalUrl);
        await updateTaskWithProof(externalUrl);
      } else {
        console.warn('GeekHirusha upload failed for proof photo, falling back to Supabase storage');
        // Fallback to Supabase Storage
        const fileName = `proof_${currentTaskId}_${Date.now()}.jpg`;
        const filePath = `proofs/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, compressedBlob, {
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath);

        await updateTaskWithProof(publicUrl);
      }
    } catch (error: any) {
      console.error('Error uploading proof photo:', error);
      Alert.error('Error', 'Failed to upload photo proof. Please try again.');
    } finally {
      setShowCamera(false);
      setCurrentTaskId(null);
    }
  };

  const handleProofFileUpload = async (fileUrl: string, fileName: string) => {
    if (!currentTaskId) return;

    try {
      // Update task status to pending approval with file proof
      await updateTaskWithProof(fileUrl);
    } catch (error: any) {
      console.error('Error uploading proof file:', error);
      Alert.error('Error', 'Failed to upload proof file. Please try again.');
    } finally {
      setShowCamera(false);
      setCurrentTaskId(null);
    }
  };

  const updateTaskWithProof = async (proofUrl: string) => {
    if (!currentTaskId) return;

    const completedTask = tasks.find(t => t.id === currentTaskId);

    // Update task status to pending approval with proof
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        status: 'pending_approval',
        proof_photo_url: proofUrl,
        completed_at: new Date().toISOString()
      })
      .eq('id', currentTaskId);

    if (updateError) throw updateError;

    Alert.success('Task completed! Proof uploaded. Waiting for admin approval.');

    if (proofUrl) {
      await notifyAdminsWithProof({
        taskId: currentTaskId,
        taskTitle: completedTask?.title || currentTaskId,
        taskDescription: completedTask?.description,
        priority: completedTask?.priority,
        dueDate: completedTask?.due_date,
        proofUrl: proofUrl,
        submittedBy: getCurrentUserName(),
      });

      // Also notify Supervisor if applicable
      try {
        const { data: supervisorTeam, error: supervisorError } = await supabase
          .from('supervisor_employees')
          .select(`
            supervisor_id,
            profiles:supervisor_id (
              full_name,
              phone
            )
          `)
          .eq('employee_id', user?.id)
          .single();

        if (supervisorTeam && !supervisorError) {
          const supervisor = (supervisorTeam as any).profiles;
          if (supervisor && supervisor.phone) {
            await sendSupervisorTaskCompletionNotification({
              supervisorName: supervisor.full_name,
              supervisorPhone: supervisor.phone,
              employeeName: getCurrentUserName(),
              taskTitle: completedTask?.title || currentTaskId,
              taskDescription: completedTask?.description || undefined,
              taskLink: getTaskLink(currentTaskId),
              proofUrl: proofUrl,
            });
          }
        }
      } catch (err) {
        console.error('Error notifying supervisor:', err);
      }
    }

    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleApproveTask = async (taskId: string) => {
    const confirmed = await Alert.confirm(
      'Approve Task',
      'Are you sure you want to approve this task?'
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      Alert.success('Task approved successfully');

      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      Alert.error('Error', error.message);
    }
  };

  const handleRejectTask = async (taskId: string) => {
    const reason = await Alert.prompt(
      'Reject Task',
      'Please provide a reason for rejection:',
      'Type your rejection reason here...',
      'Reject Task'
    );
    if (!reason) return;

    try {
      // Get the task details including assignees
      const { data: taskData, error: taskFetchError } = await supabase
        .from('tasks')
        .select('*, task_assignees(user_id)')
        .eq('id', taskId)
        .single();

      if (taskFetchError) throw taskFetchError;

      if (!taskData) {
        Alert.error('Error', 'Task not found');
        return;
      }

      // Get assigned employee IDs
      const assignedEmployeeIds = taskData.task_assignees?.map((ta: any) => ta.user_id) || [];

      // If no employees are assigned, get the employee who completed it (from completed_at)
      // For pending_approval tasks, the assigned employees are who should redo it
      let employeeIdsToReassign = assignedEmployeeIds;

      // If no assignees found, we might need to get from task history or created_by
      // For now, we'll use the assigned employees
      if (employeeIdsToReassign.length === 0) {
        // Fallback: if task was created by someone, assign to them
        if (taskData.created_by) {
          employeeIdsToReassign = [taskData.created_by];
        } else {
          Alert.error('Error', 'No employees assigned to this task. Cannot re-assign.');
          return;
        }
      }

      // Update task: set status to 'in_progress', clear proof photo, keep rejection info
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: 'in_progress',
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          proof_photo_url: null, // Clear proof photo so employee can re-submit
          completed_at: null, // Clear completed timestamp
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Ensure the task is assigned to the employees (in case assignments were removed)
      if (employeeIdsToReassign.length > 0) {
        // First, check if assignments exist
        const { data: existingAssignments } = await supabase
          .from('task_assignees')
          .select('user_id')
          .eq('task_id', taskId);

        const existingUserIds = existingAssignments?.map(a => a.user_id) || [];
        const missingAssignments = employeeIdsToReassign.filter(
          (id: string) => !existingUserIds.includes(id)
        );

        // Add any missing assignments
        if (missingAssignments.length > 0) {
          const newAssignments = missingAssignments.map((userId: string) => ({
            task_id: taskId,
            user_id: userId,
          }));

          const { error: assignError } = await supabase
            .from('task_assignees')
            .insert(newAssignments);

          if (assignError) {
            console.error('Error re-assigning task:', assignError);
            // Continue anyway as the main rejection is done
          }
        }
      }

      const { default: Alert } = await import('@/utils/alert');
      Alert.success('Task rejected and re-assigned to employee(s) for revision');
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      const { default: Alert } = await import('@/utils/alert');
      Alert.error('Error', error.message);
    }
  };

  // Admin override: mark proof-required task as completed at any time
  const handleAdminForceComplete = async (taskId: string) => {
    const confirmed = await Alert.confirm(
      'Mark task as completed?',
      'This will immediately mark the task as completed, even if proof is missing. Continue?'
    );
    if (!confirmed) return;

    try {
      const task = tasks.find((t) => t.id === taskId);

      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          // Clear rejection info when force-completing
          rejected_by: null,
          rejected_at: null,
          rejection_reason: null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;

      Alert.success('Task marked as completed by admin');

      // Navigate user to the completed section
      setStatusFilter('completed');
      setViewMode('kanban');

      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      Alert.error('Error', error.message || 'Failed to complete task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await Alert.confirm('Delete task?', 'This action cannot be undone.');
    if (!confirmed) return;

    try {
      const taskToDelete = tasks.find((task) => task.id === taskId);
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);

      if (error) throw error;

      const { default: Alert } = await import('@/utils/alert');
      Alert.success('Task deleted successfully');

      setDetailsOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } catch (error: any) {
      const { default: Alert } = await import('@/utils/alert');
      Alert.error('Error', error.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not_started':
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'pending_approval':
        return <Camera className="w-4 h-4 text-blue-500" />;
      case 'rejected':
        return <X className="w-4 h-4 text-destructive" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'not_started':
        return 'outline';
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending_approval':
        return 'outline';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityVariant = (priority: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'accent' | 'warning' | 'info' => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'accent';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const toggleAssignee = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter((id) => id !== userId)
        : [...prev.assignee_ids, userId],
    }));
  };

  const handleScrollToBottom = (taskId: string) => {
    const scrollContainer = commentScrollRefs.current[taskId];
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Helper function to check if task date matches the days filter
  const matchesDaysFilter = (taskCreatedAt: string | null, filter: string): boolean => {
    if (!taskCreatedAt || filter === 'all') return true;

    const taskDate = new Date(taskCreatedAt);
    const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'today':
        return taskDateOnly.getTime() === today.getTime();

      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return taskDateOnly.getTime() === yesterday.getTime();
      }

      case 'last_7_days': {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return taskDateOnly >= sevenDaysAgo;
      }

      case 'last_30_days': {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return taskDateOnly >= thirtyDaysAgo;
      }

      case 'this_week': {
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        return taskDateOnly >= startOfWeek;
      }

      case 'this_month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return taskDateOnly >= startOfMonth;
      }

      case 'last_month': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return taskDateOnly >= startOfLastMonth && taskDateOnly <= endOfLastMonth;
      }

      case 'this_year': {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return taskDateOnly >= startOfYear;
      }

      default:
        return true;
    }
  };

  const kanbanColumns = useMemo(
    () => [
      { key: 'not_started', title: 'Not Started', accent: 'bg-slate-100/50 border-slate-200' },
      { key: 'in_progress', title: 'On Progress', accent: 'bg-amber-50 border-amber-100' },
      { key: 'pending_approval', title: 'In Review', accent: 'bg-indigo-50 border-indigo-100' },
      { key: 'completed', title: 'Completed', accent: 'bg-emerald-50 border-emerald-100' },
      { key: 'rejected', title: 'Rejected', accent: 'bg-rose-50 border-rose-100' },
      { key: 'cancelled', title: 'Cancelled', accent: 'bg-gray-50 border-gray-100' },
    ],
    []
  );

  // Memoized filtered tasks for performance
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'overdue') {
          const isOverdue = task.due_date &&
            new Date(task.due_date) < new Date() &&
            !['completed', 'cancelled'].includes(task.status);
          if (!isOverdue) return false;
        } else if (statusFilter === 'incomplete') {
          const isIncomplete = !['completed', 'cancelled'].includes(task.status);
          if (!isIncomplete) return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (activeEmployeeFilter !== 'all') {
        const hasEmployee = task.task_assignees?.some(
          assignee => assignee.user_id === activeEmployeeFilter || assignee.profiles?.id === activeEmployeeFilter
        ) || task.created_by === activeEmployeeFilter;
        if (!hasEmployee) return false;
      }
      if (jobFilter !== 'all') {
        if (jobFilter === 'none') {
          if (task.job_id !== null) return false;
        } else {
          if (task.job_id !== jobFilter) return false;
        }
      }
      if (creatorFilter !== 'all' && task.created_by !== creatorFilter) return false;

      // Days filter
      if (daysFilter !== 'all' && !matchesDaysFilter(task.created_at, daysFilter)) return false;

      // Search filter
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        const matchesTitle = task.title?.toLowerCase().includes(query);
        const matchesDescription = task.description?.toLowerCase().includes(query);
        const matchesTaskCode = task.task_identification_code?.toLowerCase().includes(query);
        const matchesAssignee = task.task_assignees?.some(
          assignee => assignee.profiles?.full_name?.toLowerCase().includes(query) ||
            assignee.profiles?.email?.toLowerCase().includes(query)
        );
        const matchesJob = task.jobs?.job_number?.toLowerCase().includes(query) ||
          task.jobs?.customer_name?.toLowerCase().includes(query);

        if (!matchesTitle && !matchesDescription && !matchesTaskCode && !matchesAssignee && !matchesJob) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, statusFilter, priorityFilter, activeEmployeeFilter, jobFilter, creatorFilter, daysFilter, debouncedSearchQuery]);

  // Memoized paginated tasks
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTasks.slice(startIndex, endIndex);
  }, [filteredTasks, currentPage, pageSize]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    kanbanColumns.forEach((col) => {
      grouped[col.key] = [];
    });

    filteredTasks.forEach((task) => {
      const key = kanbanColumns.find((col) => col.key === task.status)?.key || 'other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });

    return grouped;
  }, [filteredTasks, kanbanColumns]);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredTasks.length / pageSize);
  }, [filteredTasks.length, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, activeEmployeeFilter, jobFilter, creatorFilter, daysFilter, debouncedSearchQuery]);

  const handleMentionKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>, taskId: string) => {
    if (event.key === 'Escape' && mentionState?.taskId === taskId) {
      setMentionState(null);
      event.stopPropagation();
    }
  };

  const renderCommentBox = (task: Task, context: 'card' | 'dialog' = 'card') => {
    const isCollapsible = context === 'card';
    const isOpen = !isCollapsible || activeCommentTaskId === task.id;
    const comments = commentsByTask[task.id] || [];
    const isLoading = commentLoadingTasks[task.id];
    const inputValue = commentInputs[task.id] || '';
    const mentionSuggestions =
      mentionState?.taskId === task.id ? getMentionSuggestions(mentionState.query) : [];

    return (
      <div className={context === 'card' ? 'mt-4 border-t pt-4' : 'mt-6'}>
        <div className="flex items-center justify-between gap-2">
          <Label className="text-muted-foreground">Comment Box</Label>
          {isCollapsible && (
            <Button size="sm" variant="ghost" onClick={() => handleToggleCommentBox(task.id)}>
              {isOpen ? 'Hide' : 'Open'}
            </Button>
          )}
        </div>
        {isCollapsible && !isOpen ? (
          <p className="mt-1 text-xs text-muted-foreground">Exchange ideas with your team. Open the box to view and add comments.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="relative">
              <div
                ref={(el) => {
                  commentScrollRefs.current[task.id] = el;
                }}
                className="max-h-56 overflow-y-auto space-y-2 pr-1 scroll-smooth"
              >
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
                ) : (
                  comments.map((comment) => {
                    const author = getProfileById(comment.sender_id);
                    return (
                      <div key={comment.id} className="rounded-md border bg-muted/60 p-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{author?.full_name || 'Unknown user'}</span>
                          <span>{formatCommentTimestamp(comment.created_at)}</span>
                        </div>
                        <p className="mt-1 text-sm whitespace-pre-line">{comment.message}</p>
                      </div>
                    );
                  })
                )}
              </div>
              {comments.length > 3 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute bottom-2 right-2 h-7 w-7 p-0 rounded-full shadow-md bg-background/90 backdrop-blur-sm hover:bg-background z-10"
                  onClick={() => handleScrollToBottom(task.id)}
                  title="Scroll to bottom"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              )}
            </div>
            {canCommentOnTasks && (
              <>
                <Textarea
                  ref={(el) => {
                    commentInputRefs.current[task.id] = el;
                  }}
                  value={inputValue}
                  onChange={(e) =>
                    handleCommentInputChange(task.id, e.target.value, e.target.selectionStart ?? undefined)
                  }
                  onClick={() => handleCommentInputCursorUpdate(task.id)}
                  onKeyUp={(e) => {
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                      handleCommentInputCursorUpdate(task.id);
                    }
                  }}
                  onKeyDown={(e) => handleMentionKeyDown(e, task.id)}
                  placeholder="Share an update... Use @name to notify someone via WhatsApp."
                  rows={3}
                />
                {mentionState?.taskId === task.id && (
                  <div className="rounded-md border bg-background shadow-sm text-sm">
                    {mentionSuggestions.length === 0 ? (
                      <p className="px-3 py-2 text-muted-foreground">No matching users</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto">
                        {mentionSuggestions.map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted/70 focus:bg-muted/70 focus:outline-none"
                            onClick={() => handleMentionSelect(task.id, profile)}
                          >
                            <div className="font-medium text-foreground">{profile.full_name}</div>
                            <div className="text-xs text-muted-foreground">{profile.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Use @name to send a direct WhatsApp mention.</span>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitComment(task)}
                    disabled={!inputValue.trim() || commentSubmittingTaskId === task.id}
                  >
                    {commentSubmittingTaskId === task.id ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderKanbanCard = useCallback((task: Task) => (
    <Card key={task.id} className="kanban-card hover:shadow-sm transition-all duration-200 ease-in-out border-muted">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">{task.title}</CardTitle>
            <CardDescription className="text-xs line-clamp-2">{task.description}</CardDescription>
            {task.due_date && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Due: {formatDateForDisplay(task.due_date)}</span>
              </div>
            )}
            {task.task_assignees && task.task_assignees.length > 0 && (
              <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
                <Users className="w-3 h-3 mt-0.5" />
                <span className="line-clamp-2">
                  {task.task_assignees.map((a) => a.profiles?.full_name || 'Unknown').join(', ')}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant={getPriorityVariant(task.priority)} className="text-[11px]">
              {task.priority}
            </Badge>
            <Badge variant={getStatusVariant(task.status)} className="text-[11px]">
              {formatStatusLabel(task.status)}
            </Badge>
            {task.due_date && new Date(task.due_date) < new Date() && !['completed', 'cancelled'].includes(task.status) && (
              <Badge variant="destructive" className="text-[11px] animate-pulse">
                Overdue
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <TaskTimer
          taskId={task.id}
          estimatedHours={task.estimated_hours}
          spentSeconds={task.spent_seconds}
          status={task.status}
          canEdit={canEdit('tasks')}
          onStatusChange={(newStatus) => handleUpdateStatus(task.id, newStatus as any)}
          allowManualCompletion={!task.requires_proof}
          compact
        />
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => handleOpenTaskDetails(task)}>
            <Eye className="w-3 h-3 mr-1" />
            Details
          </Button>
          {canEdit('tasks') && (
            <Button size="sm" variant="outline" className="text-xs" onClick={() => handleEditTask(task)}>
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs" onClick={() => handleCopyTaskLink(task.id)}>
            <Link2 className="w-3 h-3 mr-1" />
            Copy Link
          </Button>
          {isAdmin && task.requires_proof && task.status !== 'completed' && (
            <Button
              size="sm"
              variant="success"
              className="text-xs"
              onClick={() => handleAdminForceComplete(task.id)}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Admin Complete
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive text-xs"
              onClick={() => handleDeleteTask(task.id)}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          )}
          {(isAdmin || isSupervisor) && task.status === 'pending_approval' && (
            <>
              <Button size="sm" variant="success" className="text-xs" onClick={() => handleApproveTask(task.id)}>
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="destructive" className="text-xs" onClick={() => handleRejectTask(task.id)}>
                <X className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </>
          )}
          {canEdit('tasks') && task.requires_proof && task.status === 'in_progress' && (
            <Button size="sm" className="text-xs" onClick={() => handleCompleteTask(task.id)}>
              <Camera className="w-3 h-3 mr-1" />
              Proof
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  ), [canEdit, isAdmin, handleOpenTaskDetails, handleEditTask, handleCopyTaskLink, handleAdminForceComplete, handleDeleteTask, handleApproveTask, handleRejectTask, handleCompleteTask, handleUpdateStatus]);

  // Removed blocking loading spinner - page loads immediately
  // Only wait for permissions, but show page structure immediately
  if (permissionsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 smooth-scroll">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Tasks</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage and track your tasks</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as 'list' | 'kanban')}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-2 w-full sm:w-[220px]">
                <TabsTrigger value="list">List</TabsTrigger>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
              </TabsList>
            </Tabs>
            {canEdit('tasks') && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>Add a new task and assign to employees</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="task_identification_code">Task Identification Code</Label>
                      <Input
                        id="task_identification_code"
                        placeholder="Enter task identification code (e.g., TASK-001, PROJ-2024-001)"
                        value={formData.task_identification_code}
                        onChange={(e) => setFormData({ ...formData, task_identification_code: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Optional: Enter a custom identification code for easier task tracking. If left empty, a code will be auto-generated.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) =>
                            setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' | 'urgent' })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="due_date">Due Date</Label>
                        <Input
                          id="due_date"
                          type="datetime-local"
                          value={formData.due_date}
                          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="location_required"
                          checked={formData.location_required}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              location_required: checked as boolean,
                              geofence_id: checked ? formData.geofence_id : null
                            });
                          }}
                        />
                        <Label htmlFor="location_required" className="cursor-pointer">
                          Location Required
                        </Label>
                      </div>
                      {formData.location_required && (
                        <div className="space-y-2">
                          <Label>Select Geofence</Label>
                          <Popover open={geofenceOpen} onOpenChange={setGeofenceOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={geofenceOpen}
                                className="w-full justify-between"
                              >
                                {formData.geofence_id
                                  ? geofences.find((g) => g.id === formData.geofence_id)?.name || 'Select geofence...'
                                  : 'Select geofence...'}
                                <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Search geofences..."
                                  value={geofenceSearch}
                                  onValueChange={setGeofenceSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>No geofences found.</CommandEmpty>
                                  <CommandGroup>
                                    {geofences
                                      .filter((geofence) => {
                                        if (!geofenceSearch) return true;
                                        const searchLower = geofenceSearch.toLowerCase();
                                        return (
                                          geofence.name.toLowerCase().includes(searchLower) ||
                                          (geofence.description?.toLowerCase().includes(searchLower) ?? false)
                                        );
                                      })
                                      .map((geofence) => (
                                        <CommandItem
                                          key={geofence.id}
                                          value={`${geofence.name} ${geofence.description || ''}`}
                                          onSelect={() => {
                                            setFormData({ ...formData, geofence_id: geofence.id });
                                            setGeofenceOpen(false);
                                            setGeofenceSearch('');
                                          }}
                                        >
                                          <MapPin className="mr-2 h-4 w-4" />
                                          <div className="flex flex-col">
                                            <span>{geofence.name}</span>
                                            {geofence.description && (
                                              <span className="text-xs text-muted-foreground">{geofence.description}</span>
                                            )}
                                          </div>
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {formData.geofence_id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setFormData({ ...formData, geofence_id: null })}
                              className="w-full"
                            >
                              Clear Selection
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requires_proof"
                          checked={formData.requires_proof}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, requires_proof: checked as boolean })
                          }
                        />
                        <Label htmlFor="requires_proof" className="cursor-pointer">
                          Requires Proof/Photo
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign To Employees (multiple)</Label>
                      <Input
                        placeholder="Search employees..."
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                      />
                      <ScrollArea className="h-48 border rounded-md p-4">
                        <div className="space-y-2">
                          {employees
                            .filter((e) => e.full_name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                            .map((employee) => (
                              <div key={employee.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`employee-${employee.id}`}
                                  checked={formData.assignee_ids.includes(employee.id)}
                                  onCheckedChange={() => toggleAssignee(employee.id)}
                                />
                                <Label htmlFor={`employee-${employee.id}`} className="cursor-pointer font-normal">
                                  {employee.full_name} ({employee.email})
                                </Label>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                      {formData.assignee_ids.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Selected: {formData.assignee_ids.length} employee{formData.assignee_ids.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    {/* File Upload Section */}
                    <div className="space-y-2">
                      <Label>Attach Documents (Optional)</Label>
                      <FileUpload
                        onUploadComplete={handleFileUpload}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                        maxSize={10}
                        className="w-full"
                      />

                      {/* Display attached files */}
                      {attachedFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Attached Files</Label>
                          <div className="space-y-1">
                            {attachedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                <div className="flex items-center space-x-2">
                                  <File className="w-4 h-4" />
                                  <span className="text-sm">{file.fileName}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {file.fileType.toUpperCase()}
                                  </Badge>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachedFile(index)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full">
                      Create Task
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {/* Edit Task Dialog */}
            {canEdit('tasks') && (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                  <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                    <DialogDescription>Update task details</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdateTask} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Title *</Label>
                      <Input
                        id="edit-title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_task_identification_code">Task Identification Code</Label>
                      <Input
                        id="edit_task_identification_code"
                        placeholder="Enter task identification code (e.g., TASK-001, PROJ-2024-001)"
                        value={formData.task_identification_code}
                        onChange={(e) => setFormData({ ...formData, task_identification_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <Textarea
                        id="edit-description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-priority">Priority</Label>
                        <Select
                          value={formData.priority}
                          onValueChange={(value) =>
                            setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' | 'urgent' })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-due_date">Due Date</Label>
                        <Input
                          id="edit-due_date"
                          type="datetime-local"
                          value={formData.due_date}
                          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="edit_location_required"
                          checked={formData.location_required}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              location_required: checked as boolean,
                              geofence_id: checked ? formData.geofence_id : null
                            });
                          }}
                        />
                        <Label htmlFor="edit_location_required" className="cursor-pointer">
                          Location Required
                        </Label>
                      </div>
                      {formData.location_required && (
                        <div className="space-y-2">
                          <Label>Select Geofence</Label>
                          <Popover open={editGeofenceOpen} onOpenChange={setEditGeofenceOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={editGeofenceOpen}
                                className="w-full justify-between"
                              >
                                {formData.geofence_id
                                  ? geofences.find((g) => g.id === formData.geofence_id)?.name || 'Select geofence...'
                                  : 'Select geofence...'}
                                <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Search geofences..."
                                  value={geofenceSearch}
                                  onValueChange={setGeofenceSearch}
                                />
                                <CommandList>
                                  <CommandEmpty>No geofences found.</CommandEmpty>
                                  <CommandGroup>
                                    {geofences
                                      .filter((geofence) => {
                                        if (!geofenceSearch) return true;
                                        const searchLower = geofenceSearch.toLowerCase();
                                        return (
                                          geofence.name.toLowerCase().includes(searchLower) ||
                                          (geofence.description?.toLowerCase().includes(searchLower) ?? false)
                                        );
                                      })
                                      .map((geofence) => (
                                        <CommandItem
                                          key={geofence.id}
                                          value={`${geofence.name} ${geofence.description || ''}`}
                                          onSelect={() => {
                                            setFormData({ ...formData, geofence_id: geofence.id });
                                            setEditGeofenceOpen(false);
                                            setGeofenceSearch('');
                                          }}
                                        >
                                          <MapPin className="mr-2 h-4 w-4" />
                                          <div className="flex flex-col">
                                            <span>{geofence.name}</span>
                                            {geofence.description && (
                                              <span className="text-xs text-muted-foreground">{geofence.description}</span>
                                            )}
                                          </div>
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {formData.geofence_id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setFormData({ ...formData, geofence_id: null })}
                              className="w-full"
                            >
                              Clear Selection
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="edit_requires_proof"
                          checked={formData.requires_proof}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, requires_proof: checked as boolean })
                          }
                        />
                        <Label htmlFor="edit_requires_proof" className="cursor-pointer">
                          Requires Proof/Photo
                        </Label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign To Employees (multiple)</Label>
                      <Input
                        placeholder="Search employees..."
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                      />
                      <ScrollArea className="h-48 border rounded-md p-4">
                        <div className="space-y-2">
                          {employees
                            .filter((e) => e.full_name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                            .map((employee) => (
                              <div key={employee.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`edit-employee-${employee.id}`}
                                  checked={formData.assignee_ids.includes(employee.id)}
                                  onCheckedChange={() => toggleAssignee(employee.id)}
                                />
                                <Label htmlFor={`edit-employee-${employee.id}`} className="cursor-pointer font-normal">
                                  {employee.full_name} ({employee.email})
                                </Label>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                      {formData.assignee_ids.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Selected: {formData.assignee_ids.length} employee{formData.assignee_ids.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setEditOpen(false);
                        setEditGeofenceOpen(false);
                        setGeofenceSearch('');
                      }}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        Update Task
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 sm:w-5 sm:h-5" />
              <Input
                type="text"
                placeholder="Search tasks by title, description, task code, assignee, or job..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm sm:text-base"
              />
              {searchQuery && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4",
              (isAdmin || isSupervisor) ? "2xl:grid-cols-7" : "2xl:grid-cols-6"
            )}>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="status-filter" className="text-xs sm:text-sm">Status</Label>
                <SearchableSelect
                  id="status-filter"
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  options={statusOptions}
                  placeholder="All Statuses"
                  searchPlaceholder="Search status..."
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="priority-filter" className="text-xs sm:text-sm">Priority</Label>
                <SearchableSelect
                  id="priority-filter"
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                  options={priorityOptions}
                  placeholder="All Priorities"
                  searchPlaceholder="Search priority..."
                />
              </div>
              {(isAdmin || isSupervisor) && (
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="employee-filter" className="text-xs sm:text-sm">Employee</Label>
                  <SearchableSelect
                    id="employee-filter"
                    value={employeeFilter}
                    onValueChange={setEmployeeFilter}
                    options={employeeOptions}
                    placeholder="All Employees"
                    searchPlaceholder="Search employee..."
                  />
                </div>
              )}
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="job-filter" className="text-xs sm:text-sm">Job</Label>
                <SearchableSelect
                  id="job-filter"
                  value={jobFilter}
                  onValueChange={setJobFilter}
                  options={jobOptions}
                  placeholder="All Jobs"
                  searchPlaceholder="Search job..."
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="creator-filter" className="text-xs sm:text-sm">Created By</Label>
                <SearchableSelect
                  id="creator-filter"
                  value={creatorFilter}
                  onValueChange={setCreatorFilter}
                  options={creatorOptions}
                  placeholder="All Creators"
                  searchPlaceholder="Search creator..."
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="days-filter" className="text-xs sm:text-sm">Days</Label>
                <SearchableSelect
                  id="days-filter"
                  value={daysFilter}
                  onValueChange={setDaysFilter}
                  options={daysOptions}
                  placeholder="All Time"
                  searchPlaceholder="Search time..."
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="task-performance-filter" className="text-xs sm:text-sm">Task Insight</Label>
                <SearchableSelect
                  id="task-performance-filter"
                  value={taskPerformanceId}
                  onValueChange={setTaskPerformanceId}
                  options={taskInsightOptions}
                  placeholder="All Tasks"
                  searchPlaceholder="Search task..."
                />
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Pick a task to view task-wise performance analytics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Performance Analytics */}
        {activeEmployeeFilter !== 'all' && (() => {
          const selectedEmployee = employees.find(e => e.id === activeEmployeeFilter);
          if (!selectedEmployee) return null;

          const employeeTasks = tasks.filter(task =>
            task.task_assignees?.some(assignee => assignee.user_id === activeEmployeeFilter) ||
            task.created_by === activeEmployeeFilter
          );

          const completedTasks = employeeTasks.filter(t => t.status === 'completed');
          const inProgressTasks = employeeTasks.filter(t => t.status === 'in_progress');
          const notStartedTasks = employeeTasks.filter(t => t.status === 'not_started');
          const rejectedTasks = employeeTasks.filter(t => t.status === 'rejected');

          // Calculate average completion time
          const completedWithDates = completedTasks.filter(t => t.created_at && t.due_date);
          const avgCompletionTime = completedWithDates.length > 0
            ? completedWithDates.reduce((sum, task) => {
              const created = new Date(task.created_at).getTime();
              const due = new Date(task.due_date).getTime();
              return sum + (due - created);
            }, 0) / completedWithDates.length / (1000 * 60 * 60 * 24) // Convert to days
            : 0;

          // Calculate on-time completion rate
          const onTimeCompleted = completedTasks.filter(t => {
            if (!t.due_date) return true;
            const dueDate = new Date(t.due_date);
            const completedDate = new Date(t.created_at); // Approximate, should use actual completion date
            return completedDate <= dueDate;
          }).length;
          const onTimeRate = completedTasks.length > 0 ? (onTimeCompleted / completedTasks.length * 100) : 0;

          // Performance rating calculation
          const completionRate = employeeTasks.length > 0 ? (completedTasks.length / employeeTasks.length * 100) : 0;
          let performanceRating = 'Needs Improvement';
          let ratingColor = 'text-orange-600';
          if (completionRate >= 90 && onTimeRate >= 90) {
            performanceRating = 'Excellent';
            ratingColor = 'text-green-600';
          } else if (completionRate >= 70 && onTimeRate >= 70) {
            performanceRating = 'Good';
            ratingColor = 'text-blue-600';
          } else if (completionRate >= 50) {
            performanceRating = 'Average';
            ratingColor = 'text-yellow-600';
          }

          // Chart data
          const statusChartData = [
            { name: 'Completed', value: completedTasks.length, color: '#10b981' },
            { name: 'In Progress', value: inProgressTasks.length, color: '#3b82f6' },
            { name: 'Not Started', value: notStartedTasks.length, color: '#64748b' },
            { name: 'Rejected', value: rejectedTasks.length, color: '#ef4444' },
          ].filter(item => item.value > 0);

          const priorityData = [
            { priority: 'Urgent', count: employeeTasks.filter(t => t.priority === 'urgent').length },
            { priority: 'High', count: employeeTasks.filter(t => t.priority === 'high').length },
            { priority: 'Medium', count: employeeTasks.filter(t => t.priority === 'medium').length },
            { priority: 'Low', count: employeeTasks.filter(t => t.priority === 'low').length },
          ];

          // Time tracking data
          const totalSpentHours = (employeeTasks.reduce((sum, t) => sum + (t.spent_seconds || 0), 0) / 3600).toFixed(1);
          const totalEstimatedHours = (employeeTasks.reduce((sum, t) => sum + ((t.estimated_hours || 0)), 0)).toFixed(1);
          const efficiency = parseFloat(totalEstimatedHours) > 0
            ? ((parseFloat(totalEstimatedHours) / parseFloat(totalSpentHours)) * 100).toFixed(0)
            : '0';

          return (
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Award className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                      <span className="truncate">Employee Performance: {selectedEmployee.full_name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Detailed performance metrics and analytics</CardDescription>
                  </div>
                  <Badge variant="outline" className={`text-sm sm:text-lg font-bold ${ratingColor} shrink-0`}>
                    {performanceRating}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                    <Card>
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="text-center space-y-1 sm:space-y-2">
                          <Target className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-green-600" />
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold">{completedTasks.length}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Tasks Completed</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="text-center space-y-1 sm:space-y-2">
                          <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-blue-600" />
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold">{avgCompletionTime.toFixed(1)}</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Avg. Days to Complete</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="text-center space-y-1 sm:space-y-2">
                          <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-purple-600" />
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold">{onTimeRate.toFixed(0)}%</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">On-Time Completion</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-4 sm:pt-6">
                        <div className="text-center space-y-1 sm:space-y-2">
                          <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-orange-600" />
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold">{efficiency}%</div>
                          <div className="text-xs sm:text-sm text-muted-foreground">Time Efficiency</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Total Tasks</div>
                      <div className="text-2xl font-bold">{employeeTasks.length}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Completion Rate</div>
                      <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
                      <Progress value={completionRate} className="mt-2" />
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Time Tracked</div>
                      <div className="text-2xl font-bold">{totalSpentHours}h / {totalEstimatedHours}h</div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Status Distribution Pie Chart */}
                    {statusChartData.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2 sm:pb-4">
                          <CardTitle className="text-sm sm:text-base">Task Status Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[200px] sm:h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={statusChartData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={60}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {statusChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Priority Distribution Bar Chart */}
                    <Card>
                      <CardHeader className="pb-2 sm:pb-4">
                        <CardTitle className="text-sm sm:text-base">Tasks by Priority</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px] sm:h-[250px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priorityData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="priority" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Bar dataKey="count" fill="#3b82f6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Performance Summary */}
                  <Card className="bg-muted/50">
                    <CardHeader>
                      <CardTitle className="text-base">Performance Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">{selectedEmployee.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Tasks Assigned:</span>
                          <span className="font-medium">{employeeTasks.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="font-medium text-green-600">{completedTasks.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">In Progress:</span>
                          <span className="font-medium text-blue-600">{inProgressTasks.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Not Started:</span>
                          <span className="font-medium text-slate-600">{notStartedTasks.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rejected:</span>
                          <span className="font-medium text-red-600">{rejectedTasks.length}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-muted-foreground">Overall Rating:</span>
                          <span className={`font-bold ${ratingColor}`}>{performanceRating}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Task Performance Analytics */}
        {taskPerformanceId !== 'all' && (() => {
          const selectedTaskPerf = tasks.find((task) => task.id === taskPerformanceId);
          if (!selectedTaskPerf) return null;

          const assignees = selectedTaskPerf.task_assignees || [];
          const attachmentsCount = selectedTaskPerf.task_attachments?.length ?? 0;
          const estimatedHours = selectedTaskPerf.estimated_hours || 0;
          const spentHours = ((selectedTaskPerf.spent_seconds || 0) / 3600);
          const progressByStatus: Record<string, number> = {
            pending: 10,
            in_progress: 55,
            pending_approval: 80,
            completed: 100,
            rejected: 15,
            cancelled: 0,
          };
          const completionValue = progressByStatus[selectedTaskPerf.status] ?? 0;
          const timeChartData = [
            { name: 'Estimated', hours: parseFloat(estimatedHours.toFixed(1)) },
            { name: 'Actual', hours: parseFloat(spentHours.toFixed(1)) },
          ];
          const proofStatus = selectedTaskPerf.requires_proof
            ? selectedTaskPerf.proof_photo_url
              ? 'Proof submitted'
              : 'Awaiting proof'
            : 'No proof required';
          const dueDateStatus = selectedTaskPerf.due_date
            ? new Date(selectedTaskPerf.due_date) < new Date()
              ? 'Past due'
              : 'On schedule'
            : 'No due date';

          return (
            <Card className="border border-primary/20">
              <CardHeader className="pb-3 sm:pb-6">
                <div className="flex flex-col gap-2 sm:gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Target className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                      <span className="truncate">Task Performance: {selectedTaskPerf.title}</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">Deep dive into this task&apos;s execution metrics</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2 shrink-0">
                    <Badge variant={getStatusVariant(selectedTaskPerf.status)} className="text-xs">
                      {formatStatusLabel(selectedTaskPerf.status)}
                    </Badge>
                    <Badge variant={getPriorityVariant(selectedTaskPerf.priority)} className="text-xs">
                      {selectedTaskPerf.priority}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Key stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                    <Card>
                      <CardContent className="pt-4 sm:pt-6 text-center space-y-1.5 sm:space-y-2">
                        <Progress value={completionValue} className="h-1.5 sm:h-2" />
                        <div className="text-xs sm:text-sm text-muted-foreground">Completion Progress</div>
                        <div className="text-xl sm:text-2xl font-bold">{completionValue}%</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 sm:pt-6 text-center space-y-1.5 sm:space-y-2">
                        <Clock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-blue-600" />
                        <div className="text-xl sm:text-2xl font-bold">{spentHours.toFixed(1)}h</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          <span className="hidden sm:inline">Time tracked of </span>{estimatedHours.toFixed(1)}h<span className="hidden sm:inline"> estimate</span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 sm:pt-6 text-center space-y-1.5 sm:space-y-2">
                        <Users className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-violet-600" />
                        <div className="text-xl sm:text-2xl font-bold">{assignees.length || '—'}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Assignees</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 sm:pt-6 text-center space-y-1.5 sm:space-y-2">
                        <File className="w-6 h-6 sm:w-8 sm:h-8 mx-auto text-amber-600" />
                        <div className="text-xl sm:text-2xl font-bold">{attachmentsCount}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">Attachments</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 rounded-lg border bg-muted/40">
                      <div className="text-xs sm:text-sm text-muted-foreground mb-1">Due Date Status</div>
                      <div className="text-lg font-semibold">{dueDateStatus}</div>
                      {selectedTaskPerf.due_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Due {formatDateForDisplay(selectedTaskPerf.due_date)}
                        </p>
                      )}
                    </div>
                    <div className="p-3 sm:p-4 rounded-lg border bg-muted/40">
                      <div className="text-xs sm:text-sm text-muted-foreground mb-1">Proof Status</div>
                      <div className="text-base sm:text-lg font-semibold">
                        {proofStatus}
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-lg border bg-muted/40">
                      <div className="text-xs sm:text-sm text-muted-foreground mb-1">Created</div>
                      <div className="text-base sm:text-lg font-semibold">
                        {selectedTaskPerf.created_at ? formatDateForDisplay(selectedTaskPerf.created_at) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Charts / details */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <Card>
                      <CardHeader className="pb-2 sm:pb-4">
                        <CardTitle className="text-sm sm:text-base">Time Utilization</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[200px] sm:h-[240px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={timeChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Bar dataKey="hours" fill="#8b5cf6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="space-y-3 sm:space-y-4">
                      <div className="p-3 sm:p-4 border rounded-lg">
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2">Assignees</div>
                        {assignees.length === 0 ? (
                          <p className="text-xs sm:text-sm text-muted-foreground">No assignees yet.</p>
                        ) : (
                          <ul className="space-y-2 text-xs sm:text-sm">
                            {assignees.map((assignee) => (
                              <li key={assignee.user_id} className="flex flex-col">
                                <span className="font-medium">
                                  {assignee.profiles?.full_name || assignee.user_id}
                                </span>
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  {assignee.profiles?.email}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="p-3 sm:p-4 border rounded-lg">
                        <div className="text-xs sm:text-sm text-muted-foreground mb-1">Task Link</div>
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm w-full sm:w-auto" onClick={() => handleCopyTaskLink(selectedTaskPerf.id)}>
                          <Link2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          Copy link
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Tasks List */}
        <div className="grid gap-4">
          {/* Progress Summary */}
          {/* Progress Summary */}
          {filteredTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Progress Summary</CardTitle>
                <CardDescription>Overview of tasks by status and priority</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const total = filteredTasks.length;
                  const completed = filteredTasks.filter(t => t.status === 'completed').length;
                  const inProgress = filteredTasks.filter(t => t.status === 'in_progress').length;
                  const pendingApproval = filteredTasks.filter(t => t.status === 'pending_approval').length;
                  const pending = filteredTasks.filter(t => t.status === 'pending').length;
                  const rejected = filteredTasks.filter(t => t.status === 'rejected').length;
                  const overdue = filteredTasks.filter(t =>
                    t.due_date &&
                    new Date(t.due_date) < new Date() &&
                    !['completed', 'cancelled'].includes(t.status)
                  ).length;

                  const pct = Math.round((completed / total) * 100);

                  const byPriority = {
                    urgent: filteredTasks.filter(t => t.priority === 'urgent').length,
                    high: filteredTasks.filter(t => t.priority === 'high').length,
                    medium: filteredTasks.filter(t => t.priority === 'medium').length,
                    low: filteredTasks.filter(t => t.priority === 'low').length,
                  } as const;

                  return (
                    <div className="space-y-4">
                       <div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2 sm:gap-0 text-xs sm:text-sm">
                          <span>Overall Completion</span>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-muted-foreground">{pct}%</span>
                            <div className="flex gap-1 sm:gap-2 flex-wrap">
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                                const weekAgo = new Date();
                                weekAgo.setDate(weekAgo.getDate() - 7);
                                const rows = filteredTasks
                                  .filter(t => new Date(t.created_at) >= weekAgo)
                                  .map(t => ({
                                    id: t.id,
                                    title: t.title,
                                    status: t.status,
                                    priority: t.priority,
                                    created_at: new Date(t.created_at).toLocaleString(),
                                    due_date: t.due_date ? new Date(t.due_date).toLocaleString() : '',
                                    completed_at: (t as any).completed_at ? new Date((t as any).completed_at).toLocaleString() : '',
                                  }));
                                downloadTasksInvoicePngPortrait(`weekly_tasks_portrait_${new Date().toISOString().slice(0, 10)}`, rows, {
                                  title: 'Weekly Tasks Invoice',
                                  quality: 0.95,
                                  scale: 2
                                });
                              }}>
                                <span className="hidden sm:inline">Export Invoice (Portrait PNG)</span>
                                <span className="sm:hidden">Portrait</span>
                              </Button>

                              <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                                const weekAgo = new Date();
                                weekAgo.setDate(weekAgo.getDate() - 7);
                                const rows = filteredTasks
                                  .filter(t => new Date(t.created_at) >= weekAgo)
                                  .map(t => ({
                                    id: t.id,
                                    title: t.title,
                                    status: t.status,
                                    priority: t.priority,
                                    created_at: new Date(t.created_at).toLocaleString(),
                                    due_date: t.due_date ? new Date(t.due_date).toLocaleString() : '',
                                    completed_at: (t as any).completed_at ? new Date((t as any).completed_at).toLocaleString() : '',
                                  }));
                                downloadTasksInvoicePngLandscape(`weekly_tasks_landscape_${new Date().toISOString().slice(0, 10)}`, rows, {
                                  title: 'Weekly Tasks Invoice',
                                  quality: 0.95,
                                  scale: 2
                                });
                              }}>
                                <span className="hidden sm:inline">Export Invoice (Landscape PNG)</span>
                                <span className="sm:hidden">Landscape</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Progress value={pct} className="h-2" />
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
                          <div className="truncate">Completed: {completed}</div>
                          <div className="truncate">In progress: {inProgress}</div>
                          <div className="truncate">Not started: {pending}</div>
                          <div className="truncate text-destructive font-semibold">Overdue: {overdue}</div>
                          <div className="truncate">Pending approval: {pendingApproval}</div>
                          <div className="truncate">Rejected: {rejected}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                        <div className="p-2 sm:p-3 rounded-md border bg-card">
                          <div className="text-[10px] sm:text-xs text-muted-foreground">Urgent</div>
                          <div className="text-base sm:text-lg font-semibold">{byPriority.urgent}</div>
                        </div>
                        <div className="p-2 sm:p-3 rounded-md border bg-card">
                          <div className="text-[10px] sm:text-xs text-muted-foreground">High</div>
                          <div className="text-base sm:text-lg font-semibold">{byPriority.high}</div>
                        </div>
                        <div className="p-2 sm:p-3 rounded-md border bg-card">
                          <div className="text-[10px] sm:text-xs text-muted-foreground">Medium</div>
                          <div className="text-base sm:text-lg font-semibold">{byPriority.medium}</div>
                        </div>
                        <div className="p-2 sm:p-3 rounded-md border bg-card">
                          <div className="text-[10px] sm:text-xs text-muted-foreground">Low</div>
                          <div className="text-base sm:text-lg font-semibold">{byPriority.low}</div>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-muted-foreground">
                        {(() => {
                          const totalSpent = filteredTasks.reduce((s, t) => s + (t.spent_seconds || 0), 0);
                          const totalEst = filteredTasks.reduce((s, t) => s + ((t.estimated_hours || 0) * 3600), 0);

                          const toReadable = (seconds: number): string => {
                            const totalHours = Math.floor(seconds / 3600);
                            const days = Math.floor(totalHours / 24);
                            const hours = totalHours % 24;

                            if (days <= 0) {
                              return `${totalHours} h`;
                            }

                            if (hours === 0) {
                              return `${days} days`;
                            }

                            return `${days} days ${hours} h`;
                          };

                          return (
                            <div className="flex gap-4 flex-wrap">
                              <span>Actual time tracked: {toReadable(totalSpent)}</span>
                              <span>Estimated time: {toReadable(totalEst)}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
          {viewMode === 'kanban' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {kanbanColumns.map((column) => {
                const columnTasks = tasksByStatus[column.key] || [];
                return (
                  <Card key={column.key} className={`kanban-column ${column.accent} border`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{column.title}</CardTitle>
                        <Badge variant="secondary">{columnTasks.length}</Badge>
                      </div>
                      <Progress value={filteredTasks.length ? (columnTasks.length / filteredTasks.length) * 100 : 0} />
                    </CardHeader>
                    <CardContent className="space-y-3 pr-2 smooth-scroll" style={{ height: '70vh' }}>
                      {columnTasks.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4 border rounded-md bg-white/40">
                          No tasks
                        </div>
                      ) : (
                        <Virtuoso
                          style={{ height: '100%' }}
                          data={columnTasks}
                          itemContent={(index, task) => (
                            <MemoizedKanbanCard task={task} renderCard={renderKanbanCard} />
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckSquare className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tasks found</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {paginatedTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
                        <div className="flex items-start sm:items-center gap-2 flex-wrap">
                          <CardTitle className="text-base sm:text-lg break-words">{task.title}</CardTitle>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {task.task_identification_code && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs font-mono shrink-0">
                                {task.task_identification_code}
                              </Badge>
                            )}
                            {task.location_required && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                                <MapPin className="w-3 h-3 mr-1" />
                                Location
                              </Badge>
                            )}
                            {task.requires_proof && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                                <FileCheck className="w-3 h-3 mr-1" />
                                Proof
                              </Badge>
                            )}
                            {task.task_attachments && task.task_attachments.length > 0 && (
                              <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                                <File className="w-3 h-3 mr-1" />
                                {task.task_attachments.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription className="text-xs sm:text-sm line-clamp-2">{task.description}</CardDescription>
                        {task.task_assignees && task.task_assignees.length > 0 && (
                          <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 mt-0.5 shrink-0" />
                            <span className="break-words">
                              Assigned to: {task.task_assignees.map((a) => a.profiles?.full_name || 'Unknown').join(', ')}
                            </span>
                          </div>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {formatDateForDisplay(task.due_date)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                        <Badge variant={getPriorityVariant(task.priority)} className="text-xs">{task.priority}</Badge>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(task.status)}
                          <Badge variant={getStatusVariant(task.status)} className="text-xs whitespace-nowrap">{task.status.replace('_', ' ')}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {/* Task Timer with Actions */}
                      <TaskTimer
                        taskId={task.id}
                        estimatedHours={task.estimated_hours}
                        spentSeconds={task.spent_seconds}
                        status={task.status}
                        canEdit={canEdit('tasks')}
                        onStatusChange={(newStatus) => handleUpdateStatus(task.id, newStatus as any)}
                        allowManualCompletion={!task.requires_proof}
                        compact={true}
                      />

                      {/* Complete with Photo Button - Only show for tasks requiring proof */}
                      {canEdit('tasks') && task.requires_proof && task.status === 'in_progress' && (
                        <Button size="sm" className="text-xs sm:text-sm" onClick={() => handleCompleteTask(task.id)}>
                          <Camera className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Complete with Photo</span>
                          <span className="sm:hidden">Photo</span>
                        </Button>
                      )}

                      {/* Admin Force Complete Button - for proof-required tasks */}
                      {isAdmin && task.requires_proof && task.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="success"
                          className="text-xs sm:text-sm"
                          onClick={() => handleAdminForceComplete(task.id)}
                        >
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Admin Complete</span>
                          <span className="sm:hidden">Complete</span>
                        </Button>
                      )}

                      {/* Admin Approval Buttons - Only show for pending_approval tasks */}
                      {(isAdmin || isSupervisor) && task.status === 'pending_approval' && (
                        <>
                          <Button size="sm" variant="success" className="text-xs sm:text-sm" onClick={() => handleApproveTask(task.id)}>
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs sm:text-sm" onClick={() => handleRejectTask(task.id)}>
                            <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Reject
                          </Button>
                        </>
                      )}

                      {/* Edit Button - Only for admins/managers */}
                      {canEdit('tasks') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs sm:text-sm"
                          onClick={() => handleEditTask(task)}
                        >
                          <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
                        </Button>
                      )}

                      {/* Details Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs sm:text-sm"
                        onClick={() => handleOpenTaskDetails(task)}
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Details</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs sm:text-sm"
                        onClick={() => handleCopyTaskLink(task.id)}
                      >
                        <Link2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Copy Link</span>
                        <span className="sm:hidden">Link</span>
                      </Button>

                      {/* Delete Button - Only for admins */}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive text-xs sm:text-sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                  {renderCommentBox(task)}
                </Card>
              ))}

              {/* Pagination Controls */}
              {filteredTasks.length > 0 && (
                <div className="mt-6 space-y-4">
                  {/* Page Size Selector and Info */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="page-size" className="text-sm text-muted-foreground">
                        Items per page:
                      </Label>
                      <Select
                        value={pageSize.toString()}
                        onValueChange={(value) => {
                          setPageSize(Number(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger id="page-size" className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredTasks.length)} of {filteredTasks.length} tasks
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) {
                                setCurrentPage(currentPage - 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setCurrentPage(page);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        })}

                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) {
                                setCurrentPage(currentPage + 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Task Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={handleDetailsOpenChange}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full" key={selectedTask?.id || 'task-details-content'}>
            <DialogHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 px-2 hover:bg-muted"
                    onClick={() => navigate(getDashboardRoute(userRole))}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-xs font-medium">Back</span>
                  </Button>
                  <DialogTitle className="text-lg sm:text-xl">Task Details</DialogTitle>
                </div>
                {selectedTask && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs sm:text-sm w-full sm:w-auto"
                    onClick={() => handleCopyTaskLink(selectedTask.id)}
                  >
                    <Link2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Copy Link
                  </Button>
                )}
              </div>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
                  <p className="text-muted-foreground mt-1">{selectedTask.description}</p>
                  {selectedTask.task_identification_code && (
                    <div className="mt-2">
                      <Label className="text-muted-foreground">Task ID</Label>
                      <p className="mt-1 font-mono text-sm bg-muted px-2 py-1 rounded inline-block">
                        {selectedTask.task_identification_code}
                      </p>
                    </div>
                  )}
                </div>

                {/* Task Timer */}
                <TaskTimer
                  taskId={selectedTask.id}
                  estimatedHours={selectedTask.estimated_hours}
                  spentSeconds={selectedTask.spent_seconds}
                  status={selectedTask.status}
                  canEdit={canEdit('tasks')}
                  onStatusChange={(newStatus) => {
                    handleUpdateStatus(selectedTask.id, newStatus as any);
                    setSelectedTask({ ...selectedTask, status: newStatus });
                  }}
                  allowManualCompletion={!selectedTask.requires_proof}
                  compact={false}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedTask.status)}
                      <Badge variant={getStatusVariant(selectedTask.status)}>
                        {selectedTask.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Priority</Label>
                    <div className="mt-1">
                      <Badge variant={getPriorityVariant(selectedTask.priority)}>{selectedTask.priority}</Badge>
                    </div>
                  </div>
                </div>
                {selectedTask.due_date && (
                  <div>
                    <Label className="text-muted-foreground">Due Date</Label>
                    <p className="mt-1">{formatDateForDisplay(selectedTask.due_date)}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Created By</Label>
                  <p className="mt-1">{selectedTask.profiles?.full_name || 'Unknown'}</p>
                </div>
                {selectedTask.task_assignees && selectedTask.task_assignees.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Assigned To</Label>
                    <div className="mt-1 space-y-1">
                      {selectedTask.task_assignees.map((assignee, index) => (
                        <p key={index}>{assignee.profiles?.full_name || 'Unknown'} ({assignee.profiles?.email || 'No email'})</p>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p className="mt-1">{new Date(selectedTask.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {selectedTask.location_required && (
                    <Badge variant="outline">
                      <MapPin className="w-3 h-3 mr-1" />
                      Location Required
                    </Badge>
                  )}
                  {selectedTask.requires_proof && (
                    <Badge variant="outline">
                      <FileCheck className="w-3 h-3 mr-1" />
                      Proof Required
                    </Badge>
                  )}
                </div>

                {/* Task Attachments */}
                {selectedTask.task_attachments && selectedTask.task_attachments.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Attached Files</Label>
                    <div className="mt-2 space-y-2">
                      {selectedTask.task_attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                          <div className="flex items-center space-x-3">
                            <File className="w-4 h-4" />
                            <div>
                              <p className="text-sm font-medium">{attachment.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {attachment.file_type.toUpperCase()} • {new Date(attachment.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(attachment.file_url, '_blank')}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = attachment.file_url;
                                link.download = attachment.file_name;
                                link.click();
                              }}
                            >
                              <File className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Photo Proof */}
                {selectedTask.proof_photo_url && (
                  <div>
                    <Label className="text-muted-foreground">Photo Proof</Label>
                    <div className="mt-2">
                      <img
                        src={selectedTask.proof_photo_url}
                        alt="Task completion proof"
                        className="w-full max-w-md h-auto rounded-md border"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Captured on: {selectedTask.completed_at ? new Date(selectedTask.completed_at).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Approval/Rejection Info */}
                {selectedTask.approved_at && (
                  <div>
                    <Label className="text-muted-foreground">Approval Info</Label>
                    <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        ✅ Approved on {new Date(selectedTask.approved_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {selectedTask.rejected_at && (
                  <div>
                    <Label className="text-muted-foreground">Rejection Info</Label>
                    <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">
                        ❌ Rejected on {new Date(selectedTask.rejected_at).toLocaleString()}
                      </p>
                      {selectedTask.rejection_reason && (
                        <p className="text-sm text-red-700 mt-1">
                          <strong>Reason:</strong> {selectedTask.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Task Clarification Center */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Task Clarification Center
                    </Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setClarifyOpen(!clarifyOpen)}
                    >
                      {clarifyOpen ? 'Close Request Panel' : 'Need Clarification?'}
                    </Button>
                  </div>

                  {clarifyOpen && (
                    <Card className="mt-3 p-4 bg-muted/45 border-2 border-primary/20 shadow-sm transition-all duration-200">
                      <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-sm font-bold">Ask Supervisor or Admin via WhatsApp</CardTitle>
                        <CardDescription className="text-xs">
                          Your request will be sent directly to their WhatsApp number as an instant notification.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 space-y-3">
                        {/* Recipient Display (Auto-selected) */}
                         <div className="space-y-1.5 bg-background p-3 rounded-md border border-input">
                           <Label className="text-xs font-semibold text-muted-foreground">Recipients (Automatically Notified)</Label>
                           <div className="flex flex-wrap gap-2 mt-1">
                             {userSupervisor ? (
                               <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                 ⭐ {userSupervisor.full_name} (Supervisor)
                               </span>
                             ) : (
                               <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-800 border border-red-200">
                                 ⚠️ No Supervisor Assigned
                               </span>
                             )}
                             {adminContacts.length > 0 ? (
                               adminContacts.map(admin => (
                                 <span key={admin.id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200">
                                   👤 {admin.full_name} (Admin)
                                 </span>
                               ))
                             ) : (
                               <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-800 border border-red-200">
                                 ⚠️ No Admins Found
                               </span>
                             )}
                           </div>
                           <p className="text-[10px] text-muted-foreground mt-1">
                             Clarification requests are sent instantly to all the above contacts.
                           </p>
                         </div>

                        {/* Clarification Type Select */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Type of Clarification</Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant={clarifyType === 'text' ? 'default' : 'outline'}
                              size="sm"
                              className="text-xs py-1 h-8"
                              onClick={() => {
                                clarifyType !== 'text' && setClarifyType('text');
                              }}
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1" />
                              Text Message
                            </Button>
                            <Button
                              type="button"
                              variant={clarifyType === 'image' ? 'default' : 'outline'}
                              size="sm"
                              className="text-xs py-1 h-8"
                              onClick={() => {
                                clarifyType !== 'image' && setClarifyType('image');
                              }}
                            >
                              <Image className="w-3.5 h-3.5 mr-1" />
                              Image Sharing
                            </Button>
                          </div>
                        </div>

                        {/* Type specific inputs */}
                        {clarifyType === 'text' && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Clarification Question</Label>
                            <Textarea
                              placeholder="Enter your question here... What part of the task description is not clear?"
                              value={clarifyMessage}
                              onChange={(e) => setClarifyMessage(e.target.value)}
                              rows={3}
                              className="bg-background text-sm resize-none"
                            />
                          </div>
                        )}

                        {clarifyType === 'image' && (
                          <div className="space-y-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Message/Context (Optional)</Label>
                              <Textarea
                                placeholder="Explain what part of the image/wireframe is unclear..."
                                value={clarifyMessage}
                                onChange={(e) => setClarifyMessage(e.target.value)}
                                rows={2}
                                className="bg-background text-sm resize-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold">Select Image</Label>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  className="text-xs h-9 bg-background cursor-pointer"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setClarifyImageFile(file);
                                      const reader = new FileReader();
                                      reader.onload = () => setClarifyImagePreview(reader.result as string);
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </div>
                              {clarifyImagePreview && (
                                <div className="mt-2 relative inline-block border rounded bg-background p-1">
                                  <img 
                                    src={clarifyImagePreview} 
                                    alt="Preview" 
                                    className="max-h-32 rounded object-cover" 
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full"
                                    onClick={() => {
                                      setClarifyImageFile(null);
                                      setClarifyImagePreview(null);
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Submit Button */}
                        <Button
                          type="button"
                          className="w-full h-10 mt-2 font-bold shadow-md hover:shadow-lg transition-all"
                          disabled={
                            clarifySubmitting ||
                            (clarifyType === 'text' && !clarifyMessage.trim()) ||
                            (clarifyType === 'image' && !clarifyImageFile)
                          }
                          onClick={() => handleSubmitClarification(selectedTask)}
                        >
                          {clarifySubmitting ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              Uploading and sending...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Send className="w-4 h-4" />
                              Send Clarification Request
                            </span>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {renderCommentBox(selectedTask, 'dialog')}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Proof Upload Dialog */}
        <ProofUploadDialog
          isOpen={showCamera}
          onCapture={handlePhotoCapture}
          onFileUpload={handleProofFileUpload}
          onClose={() => {
            setShowCamera(false);
            setCurrentTaskId(null);
          }}
        />
      </div>
    </Layout>
  );
};

export default Tasks;
