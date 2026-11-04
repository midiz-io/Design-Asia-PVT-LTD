import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  MapPin,
  DollarSign,
  Package,
  TrendingUp,
  Users,
  Activity,
  Settings,
  History,
  Target,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { createAdminRole } from '@/utils/adminSetup';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import EmployeeDashboard from './dashboards/EmployeeDashboard';
import ManagerDashboard from './dashboards/ManagerDashboard';
import SupervisorDashboard from './dashboards/SupervisorDashboard';
import { useAdminStats } from '@/hooks/useDashboardStats';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskTimer } from '@/components/TaskTimer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  notStartedTasks: number;
  urgentTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  totalExpenses: number;
  pendingExpenses: number;
  lowStockItems: number;
  activeLocations: number;
  incompleteTasks: number;
}

interface RecentActivity {
  id: string;
  type: 'task' | 'expense' | 'inventory';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

interface TasksByPriority {
  low: number;
  medium: number;
  high: number;
  urgent: number;
}

const Dashboard = () => {
  const { user, loading, isAdmin, isManager, isSupervisor, isEmployee, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overdueDialogOpen, setOverdueDialogOpen] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [totalDialogOpen, setTotalDialogOpen] = useState(false);
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false);
  const [notStartedDialogOpen, setNotStartedDialogOpen] = useState(false);
  const [urgentDialogOpen, setUrgentDialogOpen] = useState(false);
  const [treeExpanded, setTreeExpanded] = useState<Record<string, boolean>>({
    root: true,
    self: true,
    supervisor: true,
    self_completed: false,
    self_in_progress: true,
    self_not_started: false,
    supervisor_completed: false,
    supervisor_in_progress: true,
    supervisor_not_started: false,
  });

  const toggleBranch = (key: string) => {
    setTreeExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const { data, isLoading: dataLoading } = useAdminStats(user?.id);
  const stats = data?.stats || {
    totalTasks: 0,
    completedTasks: 0,
    notStartedTasks: 0,
    urgentTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalExpenses: 0,
    pendingExpenses: 0,
    lowStockItems: 0,
    activeLocations: 1,
    incompleteTasks: 0,
  };
  const incompleteTasksList = (data as any)?.incompleteTasksList || [];
  const tasksByPriority = data?.priorityCounts || {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };
  const recentActivities = data?.activities || [];
  const overdueTasksList = (data as any)?.overdueTasksList || [];
  const totalTasksList = (data as any)?.totalTasksList || [];
  const completedTasksList = (data as any)?.completedTasksList || [];
  const notStartedTasksList = (data as any)?.notStartedTasksList || [];
  const urgentTasksList = (data as any)?.urgentTasksList || [];

  const selfCreatedTasks = totalTasksList.filter((t: any) => t.creator_type === 'Self-Created');
  const supervisorCreatedTasks = totalTasksList.filter((t: any) => t.creator_type === 'Supervisor-Created');

  const getTasksByStatus = (taskList: any[]) => {
    return {
      completed: taskList.filter((t: any) => t.status === 'completed'),
      in_progress: taskList.filter((t: any) => t.status === 'in_progress'),
      not_started: taskList.filter((t: any) => t.status === 'not_started'),
    };
  };

  const selfGrouped = getTasksByStatus(selfCreatedTasks);
  const supervisorGrouped = getTasksByStatus(supervisorCreatedTasks);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      if (isEmployee) {
        navigate('/dashboard/employee');
      } else if (isSupervisor) {
        navigate('/dashboard/supervisor');
      } else if (isManager) {
        navigate('/dashboard/manager');
      }
    }
  }, [user, isManager, isSupervisor, isEmployee, navigate]);

  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'text-success';
      case 'in_progress':
      case 'pending':
        return 'text-warning';
      case 'cancelled':
      case 'rejected':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus as any })
        .eq('id', taskId);

      if (error) throw error;
      toast({
        title: "Status Updated",
        description: `Task marked as ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  };

  if (loading || dataLoading) {
    return (
      <Layout>
        <DashboardSkeleton role="admin" />
      </Layout>
    );
  }

  if (!user) return null;

  // This component now only handles admin dashboard
  // Other roles are redirected to their specific dashboards
  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Overview of your activities and metrics</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Dialog open={totalDialogOpen} onOpenChange={setTotalDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-primary/5 dark:bg-primary/10 border-primary/20">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl sm:text-3xl font-bold">{stats.totalTasks}</div>
                    <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary opacity-50" />
                  </div>
                  <div className="space-y-1">
                    <Progress value={completionRate} className="h-1.5 sm:h-2" />
                    <p className="text-xs text-muted-foreground">{completionRate.toFixed(0)}% completed</p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[800px] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-primary flex items-center gap-2 text-xl font-bold">
                  <Activity className="h-6 w-6 text-primary animate-pulse" />
                  Interactive Tasks Tree Architecture
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Explore tasks hierarchically by creator type, status, and detail. Click branches to expand/collapse.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[400px] pb-6">
                
                {/* ROOT NODE: All Tasks */}
                <div className="relative pl-2">
                  <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                      <Target className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm sm:text-base text-foreground">All Tasks</h3>
                      <p className="text-xs text-muted-foreground">Total system workflow</p>
                    </div>
                    <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {totalTasksList.length} Tasks
                    </Badge>
                  </div>

                  {/* ROOT CHILDREN BRANCHES */}
                  <div className="relative pl-6 ml-6 border-l-2 border-dashed border-primary/20 space-y-6 mt-4">
                    
                    {/* BRANCH 1: Employee Self-Created */}
                    <div className="relative">
                      {/* Horizontal Connector Line */}
                      <div className="absolute -left-[26px] top-6 w-[26px] border-t-2 border-dashed border-primary/20"></div>
                      
                      <button 
                        onClick={() => toggleBranch('self')}
                        className="w-full flex items-center gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-left hover:bg-emerald-100/30 dark:hover:bg-emerald-950/30 transition-all duration-200"
                      >
                        <span className="text-xs text-emerald-600 shrink-0">
                          {treeExpanded.self ? '▼' : '▶'}
                        </span>
                        <div className="bg-emerald-500 text-white p-1 rounded-lg shrink-0">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-400">Self-Created (by Employees)</h4>
                          <p className="text-[10px] text-emerald-700/70 dark:text-emerald-500/70">Tasks initiated by the field staff</p>
                        </div>
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {selfCreatedTasks.length}
                        </Badge>
                      </button>

                      {/* BRANCH 1 CHILDREN: Status Groups */}
                      {treeExpanded.self && (
                        <div className="relative pl-6 ml-4 border-l border-emerald-200/50 dark:border-emerald-800/30 space-y-4 mt-3">
                          
                          {/* Self -> In Progress */}
                          <div className="relative">
                            <div className="absolute -left-[25px] top-4 w-[25px] border-t border-emerald-200/50 dark:border-emerald-800/30"></div>
                            <button
                              onClick={() => toggleBranch('self_in_progress')}
                              className="w-full flex items-center justify-between p-2 bg-sky-50/40 dark:bg-sky-950/10 border border-sky-100/50 dark:border-sky-900/20 rounded-lg text-xs hover:bg-sky-100/20 transition-all"
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] text-sky-600">{treeExpanded.self_in_progress ? '▼' : '▶'}</span>
                                <Clock className="h-3.5 w-3.5 text-sky-500" />
                                <span className="font-bold text-sky-900 dark:text-sky-400">In Progress</span>
                              </span>
                              <Badge className="bg-sky-500 hover:bg-sky-600 text-white text-[10px] px-1.5 py-0.2">{selfGrouped.in_progress.length}</Badge>
                            </button>

                            {treeExpanded.self_in_progress && (
                              <div className="pl-6 ml-3 border-l border-sky-100/50 space-y-2 mt-2">
                                {selfGrouped.in_progress.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground py-1 pl-2">No tasks in progress.</p>
                                ) : (
                                  selfGrouped.in_progress.map((task: any) => (
                                    <div key={task.id} className="relative flex items-center justify-between p-2.5 bg-background border border-muted hover:border-sky-300 dark:hover:border-sky-800 rounded-lg hover:shadow-sm transition-all text-xs group">
                                      <div className="absolute -left-[25px] top-5 w-[25px] border-t border-sky-100/50"></div>
                                      <div className="flex-1 min-w-0 pr-2">
                                        <h5 className="font-bold truncate text-foreground">{task.title}</h5>
                                        {task.due_date && (
                                          <p className="text-[9px] text-muted-foreground mt-0.5">
                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sky-50 dark:hover:bg-sky-950/20 text-sky-600"
                                        onClick={() => {
                                          setTotalDialogOpen(false);
                                          navigate(`/tasks?taskId=${task.id}`);
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Self -> Not Started */}
                          <div className="relative">
                            <div className="absolute -left-[25px] top-4 w-[25px] border-t border-emerald-200/50 dark:border-emerald-800/30"></div>
                            <button
                              onClick={() => toggleBranch('self_not_started')}
                              className="w-full flex items-center justify-between p-2 bg-slate-50/40 dark:bg-slate-900/10 border border-slate-100/50 dark:border-slate-800/20 rounded-lg text-xs hover:bg-slate-100/20 transition-all"
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-600">{treeExpanded.self_not_started ? '▼' : '▶'}</span>
                                <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                                <span className="font-bold text-slate-700 dark:text-slate-400">Not Started</span>
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.2">{selfGrouped.not_started.length}</Badge>
                            </button>

                            {treeExpanded.self_not_started && (
                              <div className="pl-6 ml-3 border-l border-slate-100/50 space-y-2 mt-2">
                                {selfGrouped.not_started.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground py-1 pl-2">No tasks not started.</p>
                                ) : (
                                  selfGrouped.not_started.map((task: any) => (
                                    <div key={task.id} className="relative flex items-center justify-between p-2.5 bg-background border border-muted hover:border-slate-300 dark:hover:border-slate-800 rounded-lg hover:shadow-sm transition-all text-xs group">
                                      <div className="absolute -left-[25px] top-5 w-[25px] border-t border-slate-100/50"></div>
                                      <div className="flex-1 min-w-0 pr-2">
                                        <h5 className="font-bold truncate text-foreground">{task.title}</h5>
                                        {task.due_date && (
                                          <p className="text-[9px] text-muted-foreground mt-0.5">
                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 dark:hover:bg-slate-950/20 text-slate-600"
                                        onClick={() => {
                                          setTotalDialogOpen(false);
                                          navigate(`/tasks?taskId=${task.id}`);
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Self -> Completed */}
                          <div className="relative">
                            <div className="absolute -left-[25px] top-4 w-[25px] border-t border-emerald-200/50 dark:border-emerald-800/30"></div>
                            <button
                              onClick={() => toggleBranch('self_completed')}
                              className="w-full flex items-center justify-between p-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-lg text-xs hover:bg-emerald-100/20 transition-all"
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] text-emerald-600">{treeExpanded.self_completed ? '▼' : '▶'}</span>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="font-bold text-emerald-900 dark:text-emerald-400">Completed</span>
                              </span>
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0.2">{selfGrouped.completed.length}</Badge>
                            </button>

                            {treeExpanded.self_completed && (
                              <div className="pl-6 ml-3 border-l border-emerald-100/50 space-y-2 mt-2">
                                {selfGrouped.completed.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground py-1 pl-2">No completed tasks.</p>
                                ) : (
                                  selfGrouped.completed.map((task: any) => (
                                    <div key={task.id} className="relative flex items-center justify-between p-2.5 bg-background border border-muted hover:border-emerald-300 dark:hover:border-emerald-800 rounded-lg hover:shadow-sm transition-all text-xs group">
                                      <div className="absolute -left-[25px] top-5 w-[25px] border-t border-emerald-100/50"></div>
                                      <div className="flex-1 min-w-0 pr-2">
                                        <h5 className="font-bold truncate text-foreground">{task.title}</h5>
                                        {task.due_date && (
                                          <p className="text-[9px] text-muted-foreground mt-0.5">
                                            Completed: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600"
                                        onClick={() => {
                                          setTotalDialogOpen(false);
                                          navigate(`/tasks?taskId=${task.id}`);
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>

                    {/* BRANCH 2: Supervisor-Created */}
                    <div className="relative">
                      {/* Horizontal Connector Line */}
                      <div className="absolute -left-[26px] top-6 w-[26px] border-t-2 border-dashed border-primary/20"></div>

                      <button 
                        onClick={() => toggleBranch('supervisor')}
                        className="w-full flex items-center gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl text-left hover:bg-amber-100/30 dark:hover:bg-amber-950/30 transition-all duration-200"
                      >
                        <span className="text-xs text-amber-600 shrink-0">
                          {treeExpanded.supervisor ? '▼' : '▶'}
                        </span>
                        <div className="bg-amber-500 text-white p-1 rounded-lg shrink-0">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-400">Supervisor-Created (assigned to Staff)</h4>
                          <p className="text-[10px] text-amber-700/70 dark:text-amber-500/70">Tasks initiated by management or supervisors</p>
                        </div>
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {supervisorCreatedTasks.length}
                        </Badge>
                      </button>

                      {/* BRANCH 2 CHILDREN: Status Groups */}
                      {treeExpanded.supervisor && (
                        <div className="relative pl-6 ml-4 border-l border-amber-200/50 dark:border-amber-800/30 space-y-4 mt-3">
                          
                          {/* Supervisor -> In Progress */}
                          <div className="relative">
                            <div className="absolute -left-[25px] top-4 w-[25px] border-t border-amber-200/50 dark:border-amber-800/30"></div>
                            <button
                              onClick={() => toggleBranch('supervisor_in_progress')}
                              className="w-full flex items-center justify-between p-2 bg-sky-50/40 dark:bg-sky-950/10 border border-sky-100/50 dark:border-sky-900/20 rounded-lg text-xs hover:bg-sky-100/20 transition-all"
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] text-sky-600">{treeExpanded.supervisor_in_progress ? '▼' : '▶'}</span>
                                <Clock className="h-3.5 w-3.5 text-sky-500" />
                                <span className="font-bold text-sky-900 dark:text-sky-400">In Progress</span>
                              </span>
                              <Badge className="bg-sky-500 hover:bg-sky-600 text-white text-[10px] px-1.5 py-0.2">{supervisorGrouped.in_progress.length}</Badge>
                            </button>

                            {treeExpanded.supervisor_in_progress && (
                              <div className="pl-6 ml-3 border-l border-sky-100/50 space-y-2 mt-2">
                                {supervisorGrouped.in_progress.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground py-1 pl-2">No tasks in progress.</p>
                                ) : (
                                  supervisorGrouped.in_progress.map((task: any) => (
                                    <div key={task.id} className="relative flex items-center justify-between p-2.5 bg-background border border-muted hover:border-sky-300 dark:hover:border-sky-800 rounded-lg hover:shadow-sm transition-all text-xs group">
                                      <div className="absolute -left-[25px] top-5 w-[25px] border-t border-sky-100/50"></div>
                                      <div className="flex-1 min-w-0 pr-2">
                                        <h5 className="font-bold truncate text-foreground">{task.title}</h5>
                                        {task.due_date && (
                                          <p className="text-[9px] text-muted-foreground mt-0.5">
                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sky-50 dark:hover:bg-sky-950/20 text-sky-600"
                                        onClick={() => {
                                          setTotalDialogOpen(false);
                                          navigate(`/tasks?taskId=${task.id}`);
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Supervisor -> Not Started */}
                          <div className="relative">
                            <div className="absolute -left-[25px] top-4 w-[25px] border-t border-amber-200/50 dark:border-amber-800/30"></div>
                            <button
                              onClick={() => toggleBranch('supervisor_not_started')}
                              className="w-full flex items-center justify-between p-2 bg-slate-50/40 dark:bg-slate-900/10 border border-slate-100/50 dark:border-slate-800/20 rounded-lg text-xs hover:bg-slate-100/20 transition-all"
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-600">{treeExpanded.supervisor_not_started ? '▼' : '▶'}</span>
                                <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                                <span className="font-bold text-slate-700 dark:text-slate-400">Not Started</span>
                              </span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.2">{supervisorGrouped.not_started.length}</Badge>
                            </button>

                            {treeExpanded.supervisor_not_started && (
                              <div className="pl-6 ml-3 border-l border-slate-100/50 space-y-2 mt-2">
                                {supervisorGrouped.not_started.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground py-1 pl-2">No tasks not started.</p>
                                ) : (
                                  supervisorGrouped.not_started.map((task: any) => (
                                    <div key={task.id} className="relative flex items-center justify-between p-2.5 bg-background border border-muted hover:border-slate-300 dark:hover:border-slate-800 rounded-lg hover:shadow-sm transition-all text-xs group">
                                      <div className="absolute -left-[25px] top-5 w-[25px] border-t border-slate-100/50"></div>
                                      <div className="flex-1 min-w-0 pr-2">
                                        <h5 className="font-bold truncate text-foreground">{task.title}</h5>
                                        {task.due_date && (
                                          <p className="text-[9px] text-muted-foreground mt-0.5">
                                            Due: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 dark:hover:bg-slate-950/20 text-sky-600"
                                        onClick={() => {
                                          setTotalDialogOpen(false);
                                          navigate(`/tasks?taskId=${task.id}`);
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Supervisor -> Completed */}
                          <div className="relative">
                            <div className="absolute -left-[25px] top-4 w-[25px] border-t border-amber-200/50 dark:border-amber-800/30"></div>
                            <button
                              onClick={() => toggleBranch('supervisor_completed')}
                              className="w-full flex items-center justify-between p-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-lg text-xs hover:bg-emerald-100/20 transition-all"
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-[10px] text-emerald-600">{treeExpanded.supervisor_completed ? '▼' : '▶'}</span>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="font-bold text-emerald-900 dark:text-emerald-400">Completed</span>
                              </span>
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0.2">{supervisorGrouped.completed.length}</Badge>
                            </button>

                            {treeExpanded.supervisor_completed && (
                              <div className="pl-6 ml-3 border-l border-emerald-100/50 space-y-2 mt-2">
                                {supervisorGrouped.completed.length === 0 ? (
                                  <p className="text-[10px] text-muted-foreground py-1 pl-2">No completed tasks.</p>
                                ) : (
                                  supervisorGrouped.completed.map((task: any) => (
                                    <div key={task.id} className="relative flex items-center justify-between p-2.5 bg-background border border-muted hover:border-emerald-300 dark:hover:border-emerald-800 rounded-lg hover:shadow-sm transition-all text-xs group">
                                      <div className="absolute -left-[25px] top-5 w-[25px] border-t border-emerald-100/50"></div>
                                      <div className="flex-1 min-w-0 pr-2">
                                        <h5 className="font-bold truncate text-foreground">{task.title}</h5>
                                        {task.due_date && (
                                          <p className="text-[9px] text-muted-foreground mt-0.5">
                                            Completed: {new Date(task.due_date).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600"
                                        onClick={() => {
                                          setTotalDialogOpen(false);
                                          navigate(`/tasks?taskId=${task.id}`);
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={incompleteDialogOpen} onOpenChange={setIncompleteDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-blue-50/50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/50">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-bold text-blue-600">Incomplete Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.incompleteTasks}</div>
                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 opacity-50" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Total active workspace
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-blue-600 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Incomplete Tasks Overview
                </DialogTitle>
                <DialogDescription>
                  In-depth view of all tasks that are currently active and not yet finished.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                <div className="space-y-4">
                  {incompleteTasksList.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">Excellent! All tasks are completed.</p>
                    </div>
                  ) : (
                    incompleteTasksList.map((task: any) => (
                      <div key={task.id} className="p-4 border border-blue-200 rounded-lg bg-blue-50/50 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-blue-900 truncate">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] capitalize font-medium border-blue-200 text-blue-700">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              {task.due_date && (
                                <p className="text-[10px] text-blue-700">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </p>
                              )}
                              {task.assignees && task.assignees.length > 0 && (
                                <p className="text-[10px] text-blue-800 font-bold mt-1 flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  Assigned to: {task.assignees.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant={task.priority === 'urgent' ? 'destructive' : task.priority === 'high' ? 'accent' : 'secondary'} className="shrink-0">{task.priority}</Badge>
                        </div>
                        <TaskTimer
                          taskId={task.id}
                          status={task.status}
                          estimatedHours={task.estimated_hours}
                          spentSeconds={task.spent_seconds}
                          canEdit={true}
                          compact={true}
                          onStatusChange={(newStatus) => handleUpdateStatus(task.id, newStatus)}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2 border-blue-200 text-blue-700 hover:bg-blue-100"
                          onClick={() => {
                            setIncompleteDialogOpen(false);
                            navigate(`/tasks?taskId=${task.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setIncompleteDialogOpen(false);
                    navigate('/tasks?status=incomplete');
                  }}
                >
                  View All in Tasks Page
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={completedDialogOpen} onOpenChange={setCompletedDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-green-50/50 dark:bg-green-900/20 border-green-200/50 dark:border-green-800/50">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium text-success">Completed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl sm:text-3xl font-bold text-success">{stats.completedTasks}</div>
                    <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-success opacity-50" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.inProgressTasks} in progress
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Completed Tasks
                </DialogTitle>
                <DialogDescription>
                  List of all successfully finished tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                <div className="space-y-4">
                  {completedTasksList.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No completed tasks yet.</p>
                    </div>
                  ) : (
                    completedTasksList.map((task: any) => (
                      <div key={task.id} className="p-4 border border-green-200 rounded-lg bg-green-50/50 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-green-900 truncate">{task.title}</h4>
                            <p className="text-[10px] text-green-700">
                              Completed: {new Date(task.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="success" className="shrink-0">Completed</Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2 border-green-200 text-green-700 hover:bg-green-100"
                          onClick={() => {
                            setCompletedDialogOpen(false);
                            navigate(`/tasks?taskId=${task.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={notStartedDialogOpen} onOpenChange={setNotStartedDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-amber-50/50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-800/50">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium text-amber-600">Not Started</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl sm:text-3xl font-bold text-amber-600">{stats.notStartedTasks}</div>
                    <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-amber-500 opacity-50" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting action
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-amber-600 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Tasks Not Started
                </DialogTitle>
                <DialogDescription>
                  Tasks that are pending and haven't been initiated yet.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                <div className="space-y-4">
                  {notStartedTasksList.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No pending tasks.</p>
                    </div>
                  ) : (
                    notStartedTasksList.map((task: any) => (
                      <div key={task.id} className="p-4 border border-amber-200 rounded-lg bg-amber-50/50 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-amber-900 truncate">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {task.due_date && (
                                <p className="text-[10px] text-amber-700">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="warning" className="shrink-0">{task.priority}</Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2 border-amber-200 text-amber-700 hover:bg-amber-100"
                          onClick={() => {
                            setNotStartedDialogOpen(false);
                            navigate(`/tasks?taskId=${task.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={urgentDialogOpen} onOpenChange={setUrgentDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-red-50/50 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/50">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-medium text-destructive">Urgent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl sm:text-3xl font-bold text-destructive">{stats.urgentTasks}</div>
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive opacity-50" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requires immediate attention
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Urgent Tasks
                </DialogTitle>
                <DialogDescription>
                  High-priority tasks that need immediate resolution.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                <div className="space-y-4">
                  {urgentTasksList.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No urgent tasks.</p>
                    </div>
                  ) : (
                    urgentTasksList.map((task: any) => (
                      <div key={task.id} className="p-4 border border-red-200 rounded-lg bg-red-50/50 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-red-900 truncate">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] capitalize font-medium border-red-200 text-red-700">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              {task.due_date && (
                                <p className="text-[10px] text-red-700">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="destructive" className="shrink-0">Urgent</Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2 border-red-200 text-red-700 hover:bg-red-100"
                          onClick={() => {
                            setUrgentDialogOpen(false);
                            navigate(`/tasks?taskId=${task.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={overdueDialogOpen} onOpenChange={setOverdueDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-red-50/50 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/50">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-xs sm:text-sm font-bold text-destructive">OverDue Tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl sm:text-3xl font-bold text-destructive">{stats.overdueTasks}</div>
                    <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive opacity-50" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Critical attention required
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Overdue Tasks Overview
                </DialogTitle>
                <DialogDescription>
                  Manage and expedite tasks that have missed their deadlines.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                <div className="space-y-4">
                  {overdueTasksList.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">No overdue tasks in the system.</p>
                    </div>
                  ) : (
                    overdueTasksList.map((task: any) => (
                      <div key={task.id} className="p-4 border border-red-200 rounded-lg bg-red-50/50 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-red-900 truncate">{task.title}</h4>
                            <p className="text-xs text-red-700">
                              Due: {new Date(task.due_date).toLocaleString()}
                            </p>
                            {task.assignees && task.assignees.length > 0 && (
                              <p className="text-[10px] text-red-800 font-bold mt-1 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Assigned to: {task.assignees.join(', ')}
                              </p>
                            )}
                          </div>
                          <Badge variant="destructive" className="shrink-0">{task.priority}</Badge>
                        </div>
                        <TaskTimer
                          taskId={task.id}
                          status={task.status}
                          estimatedHours={task.estimated_hours}
                          spentSeconds={task.spent_seconds}
                          canEdit={true}
                          compact={true}
                          onStatusChange={(newStatus) => handleUpdateStatus(task.id, newStatus)}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2 border-red-200 text-red-700 hover:bg-red-100"
                          onClick={() => {
                            setOverdueDialogOpen(false);
                            navigate(`/tasks?taskId=${task.id}`);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Task Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Task Priority Distribution</CardTitle>
              <CardDescription>Breakdown of tasks by priority level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Urgent</span>
                    <span className="text-sm text-muted-foreground">{tasksByPriority.urgent}</span>
                  </div>
                  <Progress value={(tasksByPriority.urgent / stats.totalTasks) * 100} variant="destructive" className="h-2 bg-destructive/20" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">High</span>
                    <span className="text-sm text-muted-foreground">{tasksByPriority.high}</span>
                  </div>
                  <Progress value={(tasksByPriority.high / stats.totalTasks) * 100} variant="accent" className="h-2 bg-accent/20" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Medium</span>
                    <span className="text-sm text-muted-foreground">{tasksByPriority.medium}</span>
                  </div>
                  <Progress value={(tasksByPriority.medium / stats.totalTasks) * 100} variant="warning" className="h-2 bg-warning/20" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Low</span>
                    <span className="text-sm text-muted-foreground">{tasksByPriority.low}</span>
                  </div>
                  <Progress value={(tasksByPriority.low / stats.totalTasks) * 100} variant="info" className="h-2 bg-cyan-500/20" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Completed</span>
                    <span className="text-sm text-muted-foreground">{stats.completedTasks}</span>
                  </div>
                  <Progress value={(stats.completedTasks / stats.totalTasks) * 100} variant="success" className="h-2 bg-success/20" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Overview */}
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Quick stats across all modules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Total Expenses</p>
                    <p className="text-sm text-muted-foreground">{stats.pendingExpenses} pending</p>
                  </div>
                </div>
                <p className="text-lg font-bold">LKR {stats.totalExpenses.toFixed(2)}</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">Low Stock Items</p>
                    <p className="text-sm text-muted-foreground">Needs reordering</p>
                  </div>
                </div>
                <p className="text-lg font-bold">{stats.lowStockItems}</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">Active Locations</p>
                    <p className="text-sm text-muted-foreground">Last 24 hours</p>
                  </div>
                </div>
                <p className="text-lg font-bold">{stats.activeLocations}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest updates across the system</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent activities</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {activity.type === 'task' ? (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      ) : activity.type === 'expense' ? (
                        <DollarSign className="w-4 h-4 text-primary" />
                      ) : (
                        <Package className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {activity.status && (
                      <Badge variant="outline" className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/tasks')}>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>View and manage tasks</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/locations')}>
            <CardHeader>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-2">
                <MapPin className="w-6 h-6 text-accent" />
              </div>
              <CardTitle>Locations</CardTitle>
              <CardDescription>Track locations</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/petty-cash')}>
            <CardHeader>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center mb-2">
                <DollarSign className="w-6 h-6 text-warning" />
              </div>
              <CardTitle>Petty Cash</CardTitle>
              <CardDescription>Manage expenses</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/inventory')}>
            <CardHeader>
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-2">
                <Package className="w-6 h-6 text-success" />
              </div>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>Track stock</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
