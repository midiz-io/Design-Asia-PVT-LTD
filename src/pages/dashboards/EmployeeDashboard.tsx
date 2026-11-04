import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  DollarSign,
  MessageSquare,
  FileText,
  TrendingUp,
  Target,
  Send,
  Users,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeStats } from '@/hooks/useDashboardStats';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskTimer } from '@/components/TaskTimer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskExtensionRequestDialog } from '@/components/TaskExtensionRequestDialog';

interface EmployeeStats {
  myTasks: number;
  completedTasks: number;
  notStartedTasks: number;
  inProgressTasks: number;
  rejectedTasks: number;
  urgentTasks: number;
  myExpenses: number;
  pendingExpenses: number;
  unreadMessages: number;
  locationUpdates: number;
  overdueTasks: number;
  incompleteTasks: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  created_at: string;
  rejected_at?: string | null;
  rejection_reason?: string | null;
}

interface RecentExpense {
  id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

const EmployeeDashboard = () => {
  const { user, isEmployee, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overdueDialogOpen, setOverdueDialogOpen] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [totalDialogOpen, setTotalDialogOpen] = useState(false);
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false);
  const [notStartedDialogOpen, setNotStartedDialogOpen] = useState(false);
  const [urgentDialogOpen, setUrgentDialogOpen] = useState(false);
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [extensionInitialType, setExtensionInitialType] = useState<'overdue' | 'incomplete'>('overdue');
  const [taskCreatorFilter, setTaskCreatorFilter] = useState<'all' | 'Self-Created' | 'Supervisor-Created'>('all');

  const { data, isLoading: dataLoading } = useEmployeeStats(user?.id);
  const stats = data?.stats || {
    myTasks: 0,
    completedTasks: 0,
    notStartedTasks: 0,
    inProgressTasks: 0,
    rejectedTasks: 0,
    urgentTasks: 0,
    myExpenses: 0,
    pendingExpenses: 0,
    unreadMessages: 0,
    locationUpdates: 0,
    overdueTasks: 0,
    incompleteTasks: 0,
  };
  const recentTasks = data?.recentTasks || [];
  const recentExpenses = data?.recentExpenses || [];
  const overdueTasksList = (data as any)?.overdueTasksList || [];
  const incompleteTasksList = (data as any)?.incompleteTasksList || [];
  const totalTasksList = (data as any)?.totalTasksList || [];
  const completedTasksList = (data as any)?.completedTasksList || [];
  const notStartedTasksList = (data as any)?.notStartedTasksList || [];
  const urgentTasksList = (data as any)?.urgentTasksList || [];

  const filteredTotalTasks = totalTasksList.filter((task: any) => taskCreatorFilter === 'all' || task.creator_type === taskCreatorFilter);
  const filteredIncompleteTasks = incompleteTasksList.filter((task: any) => taskCreatorFilter === 'all' || task.creator_type === taskCreatorFilter);
  const filteredOverdueTasks = overdueTasksList.filter((task: any) => taskCreatorFilter === 'all' || task.creator_type === taskCreatorFilter);
  const filteredUrgentTasks = urgentTasksList.filter((task: any) => taskCreatorFilter === 'all' || task.creator_type === taskCreatorFilter);

  useEffect(() => {
    if (loading) return; // auth still resolving — don't fire prematurely
    if (!isEmployee && user) {
      Alert.error('Access Denied', 'You do not have permission to access this page');
      navigate('/dashboard');
    }
  }, [isEmployee, loading, navigate, user]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'accent';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'default';
      case 'not_started': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'default';
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

  const getExpenseStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'default';
    }
  };

  if (dataLoading) {
    return (
      <Layout>
        <DashboardSkeleton role="employee" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">My Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Welcome back! Here's what's happening with your tasks and activities.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => navigate('/tasks')} variant="outline" className="w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              View All Tasks
            </Button>
            <Button onClick={() => navigate('/petty-cash')} variant="outline" className="w-full sm:w-auto">
              <DollarSign className="w-4 h-4 mr-2" />
              Submit Expense
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Dialog open={totalDialogOpen} onOpenChange={setTotalDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">My Tasks</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xl sm:text-2xl font-bold">{stats.myTasks}</div>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
                    <span>{stats.completedTasks} completed</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{stats.notStartedTasks} not started</span>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  All My Tasks
                </DialogTitle>
                <DialogDescription>
                  Full list of all tasks assigned to you.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                {/* Creator Filter Tabs */}
                <div className="flex gap-2 mb-4 bg-muted p-1 rounded-lg text-xs">
                  <button 
                    onClick={() => setTaskCreatorFilter('all')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    All ({totalTasksList.length})
                  </button>
                  <button 
                    onClick={() => setTaskCreatorFilter('Self-Created')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'Self-Created' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Self-Created ({totalTasksList.filter((t: any) => t.creator_type === 'Self-Created').length})
                  </button>
                  <button 
                    onClick={() => setTaskCreatorFilter('Supervisor-Created')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'Supervisor-Created' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Supervisor-Created ({totalTasksList.filter((t: any) => t.creator_type === 'Supervisor-Created').length})
                  </button>
                </div>

                <div className="space-y-4">
                  {filteredTotalTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No tasks found under this filter.</p>
                    </div>
                  ) : (
                    filteredTotalTasks.map((task: any) => (
                      <div key={task.id} className="p-4 border border-muted rounded-lg hover:bg-muted/30 transition-colors space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] capitalize font-medium">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              {task.creator_type && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-[9px] font-semibold border-none ${
                                    task.creator_type === 'Self-Created' 
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                  }`}
                                >
                                  {task.creator_type}
                                </Badge>
                              )}
                              {task.due_date && (
                                <p className="text-[10px] text-muted-foreground">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant={getPriorityColor(task.priority)} className="shrink-0">{task.priority}</Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => {
                            setTotalDialogOpen(false);
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

          <Dialog open={incompleteDialogOpen} onOpenChange={setIncompleteDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-blue-50/50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-bold text-blue-600">Incomplete Tasks</CardTitle>
                  <Target className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.incompleteTasks}</div>
                  <p className="text-xs text-muted-foreground font-medium">
                    Total active workload
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-blue-600 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  My Incomplete Tasks
                </DialogTitle>
                <DialogDescription>
                  Review and continue your active tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                {/* Creator Filter Tabs */}
                <div className="flex gap-2 mb-4 bg-muted p-1 rounded-lg text-xs">
                  <button 
                    onClick={() => setTaskCreatorFilter('all')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    All ({incompleteTasksList.length})
                  </button>
                  <button 
                    onClick={() => setTaskCreatorFilter('Self-Created')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'Self-Created' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Self-Created ({incompleteTasksList.filter((t: any) => t.creator_type === 'Self-Created').length})
                  </button>
                  <button 
                    onClick={() => setTaskCreatorFilter('Supervisor-Created')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'Supervisor-Created' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Supervisor-Created ({incompleteTasksList.filter((t: any) => t.creator_type === 'Supervisor-Created').length})
                  </button>
                </div>

                <div className="space-y-4">
                  {filteredIncompleteTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No incomplete tasks found.</p>
                    </div>
                  ) : (
                    filteredIncompleteTasks.map((task: any) => (
                      <div key={task.id} className="p-4 border border-blue-200 rounded-lg bg-blue-50/50 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-blue-900 truncate">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] capitalize font-medium border-blue-200 text-blue-700">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              {task.creator_type && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-[9px] font-semibold border-none ${
                                    task.creator_type === 'Self-Created' 
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                  }`}
                                >
                                  {task.creator_type}
                                </Badge>
                              )}
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
                          <Badge variant={getPriorityColor(task.priority)} className="shrink-0">{task.priority}</Badge>
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
              <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="flex-1 font-semibold"
                  onClick={() => {
                    setIncompleteDialogOpen(false);
                    navigate('/tasks?status=incomplete');
                  }}
                >
                  Go to Tasks Page
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 font-semibold gap-2"
                  onClick={() => {
                    setIncompleteDialogOpen(false);
                    setExtensionInitialType('incomplete');
                    setExtensionDialogOpen(true);
                  }}
                  disabled={incompleteTasksList.length === 0}
                >
                  <Send className="h-4 w-4" />
                  Request Extension
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={overdueDialogOpen} onOpenChange={setOverdueDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-red-50/50 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-bold text-red-600">Overdue Tasks</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xl sm:text-2xl font-bold text-red-700">{stats.overdueTasks}</div>
                  <p className="text-xs text-red-600 font-medium whitespace-nowrap">
                    Critical attention required
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Your Overdue Tasks
                </DialogTitle>
                <DialogDescription>
                  Start or complete these tasks immediately to avoid further delays.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                {/* Creator Filter Tabs */}
                <div className="flex gap-2 mb-4 bg-muted p-1 rounded-lg text-xs">
                  <button 
                    onClick={() => setTaskCreatorFilter('all')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    All ({overdueTasksList.length})
                  </button>
                  <button 
                    onClick={() => setTaskCreatorFilter('Self-Created')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'Self-Created' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Self-Created ({overdueTasksList.filter((t: any) => t.creator_type === 'Self-Created').length})
                  </button>
                  <button 
                    onClick={() => setTaskCreatorFilter('Supervisor-Created')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'Supervisor-Created' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Supervisor-Created ({overdueTasksList.filter((t: any) => t.creator_type === 'Supervisor-Created').length})
                  </button>
                </div>

                <div className="space-y-4">
                  {filteredOverdueTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No overdue tasks found.</p>
                    </div>
                  ) : (
                    filteredOverdueTasks.map((task: any) => (
                      <div key={task.id} className="p-4 border border-red-200 rounded-lg bg-red-50/50 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-red-900 truncate">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] capitalize font-medium border-red-200 text-red-700">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              {task.creator_type && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-[9px] font-semibold border-none ${
                                    task.creator_type === 'Self-Created' 
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                  }`}
                                >
                                  {task.creator_type}
                                </Badge>
                              )}
                              <p className="text-[10px] text-red-700">
                                Due: {new Date(task.due_date).toLocaleString()}
                              </p>
                            </div>
                            {task.assignees && task.assignees.length > 0 && (
                              <p className="text-[10px] text-red-800 font-bold mt-1 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Assigned to: {task.assignees.join(', ')}
                              </p>
                            )}
                          </div>
                          <Badge variant={getPriorityColor(task.priority)} className="shrink-0">{task.priority}</Badge>
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
              <div className="mt-4 pt-4 border-t">
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 font-semibold gap-2"
                  onClick={() => {
                    setOverdueDialogOpen(false);
                    setExtensionInitialType('overdue');
                    setExtensionDialogOpen(true);
                  }}
                  disabled={overdueTasksList.length === 0}
                >
                  <Send className="h-4 w-4" />
                  Request Extension from Admin
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Extension Request Wizard */}
          <TaskExtensionRequestDialog
            open={extensionDialogOpen}
            onOpenChange={setExtensionDialogOpen}
            initialType={extensionInitialType}
            overdueTasksList={overdueTasksList}
            incompleteTasksList={incompleteTasksList}
            role="employee"
            onStatusChange={handleUpdateStatus}
          />

          <Dialog open={urgentDialogOpen} onOpenChange={setUrgentDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-red-50/50 dark:bg-red-900/20 border-red-200/50 dark:border-red-800/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-destructive">Urgent Tasks</CardTitle>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xl sm:text-2xl font-bold text-destructive">{stats.urgentTasks}</div>
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
                  Tasks that need your immediate action.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                {/* Creator Filter Tabs */}
                <div className="flex gap-2 mb-4 bg-muted p-1 rounded-lg text-xs">
                  <button 
                    onClick={() => setTaskCreatorFilter('all')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    All ({urgentTasksList.length})
                  </button>
                  <button 
                    onClick={() => setTaskCreatorFilter('Self-Created')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'Self-Created' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Self-Created ({urgentTasksList.filter((t: any) => t.creator_type === 'Self-Created').length})
                  </button>
                  <button 
                    onClick={() => setTaskCreatorFilter('Supervisor-Created')}
                    className={`flex-1 py-1.5 rounded-md font-medium transition-all ${taskCreatorFilter === 'Supervisor-Created' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Supervisor-Created ({urgentTasksList.filter((t: any) => t.creator_type === 'Supervisor-Created').length})
                  </button>
                </div>

                <div className="space-y-4">
                  {filteredUrgentTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No urgent tasks found.</p>
                    </div>
                  ) : (
                    filteredUrgentTasks.map((task: any) => (
                      <div key={task.id} className="p-4 border border-red-200 rounded-lg bg-red-50/50 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-red-900 truncate">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] capitalize font-medium border-red-200 text-red-700">
                                {task.status.replace('_', ' ')}
                              </Badge>
                              {task.creator_type && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-[9px] font-semibold border-none ${
                                    task.creator_type === 'Self-Created' 
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                  }`}
                                >
                                  {task.creator_type}
                                </Badge>
                              )}
                              {task.due_date && (
                                <p className="text-[10px] text-red-700">
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="destructive" className="shrink-0">Urgent</Badge>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">My Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xl sm:text-2xl font-bold">{stats.myExpenses}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">
                <span>{stats.pendingExpenses} pending approval</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Unread Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xl sm:text-2xl font-bold">{stats.unreadMessages}</div>
              <p className="text-xs text-muted-foreground">
                New messages from team
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Tasks</CardTitle>
              <CardDescription>Your latest assigned tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tasks assigned yet</p>
                  </div>
                ) : (
                  recentTasks.map((task) => (
                    <div key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
                      <div className="space-y-2 flex-1">
                        <h4 className="font-medium text-sm sm:text-base">{task.title}</h4>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                          <Badge variant={getStatusColor(task.status)} className="text-xs">
                            {task.status.replace('_', ' ')}
                          </Badge>
                          {task.creator_type && (
                            <Badge 
                              variant="secondary" 
                              className={`text-[10px] font-semibold border-none ${
                                task.creator_type === 'Self-Created' 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                              }`}
                            >
                              {task.creator_type}
                            </Badge>
                          )}
                          {task.rejected_at && (
                            <Badge variant="destructive" className="text-xs">
                              Rejected - Needs Revision
                            </Badge>
                          )}
                        </div>
                        {task.rejection_reason && (
                          <p className="text-xs text-destructive mt-1 italic">
                            Reason: {task.rejection_reason}
                          </p>
                        )}
                        {task.due_date && (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/tasks?taskId=${task.id}`)}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Your latest expense submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExpenses.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No expenses submitted yet</p>
                    <Button
                      className="mt-4"
                      onClick={() => navigate('/petty-cash')}
                    >
                      Submit First Expense
                    </Button>
                  </div>
                ) : (
                  recentExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">LKR {expense.amount}</h4>
                        <p className="text-sm text-muted-foreground">{expense.description}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getExpenseStatusColor(expense.status)}>
                            {expense.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(expense.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/petty-cash')}
                      >
                        View
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/tasks')}
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>View My Tasks</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/petty-cash')}
              >
                <DollarSign className="w-6 h-6" />
                <span>Submit Expense</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/chat')}
              >
                <MessageSquare className="w-6 h-6" />
                <span>Team Chat</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EmployeeDashboard;
