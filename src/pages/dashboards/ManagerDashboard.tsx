import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  UserCheck,
  FileText,
  Target,
  Send,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useManagerStats } from '@/hooks/useDashboardStats';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskTimer } from '@/components/TaskTimer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';
import { TaskExtensionRequestDialog } from '@/components/TaskExtensionRequestDialog';

interface ManagerStats {
  teamMembers: number;
  activeTasks: number;
  completedTasks: number;
  pendingApprovals: number;
  teamExpenses: number;
  pendingExpenses: number;
  teamLocations: number;
  unreadMessages: number;
  overdueTasks: number;
  incompleteTasks: number;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  department: string;
  task_count: number;
  completion_rate: number;
}

interface PendingApproval {
  id: string;
  type: 'expense' | 'task';
  title: string;
  amount?: number;
  employee_name: string;
  created_at: string;
}

const ManagerDashboard = () => {
  const { user, isManager, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overdueDialogOpen, setOverdueDialogOpen] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [totalDialogOpen, setTotalDialogOpen] = useState(false);
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false);
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [extensionInitialType, setExtensionInitialType] = useState<'overdue' | 'incomplete'>('overdue');

  const { data, isLoading: dataLoading } = useManagerStats(user?.id);
  const stats = data?.stats || {
    teamMembers: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingApprovals: 0,
    teamExpenses: 0,
    pendingExpenses: 0,
    teamLocations: 0,
    unreadMessages: 0,
    overdueTasks: 0,
    incompleteTasks: 0,
  };
  const teamMembers = data?.teamMembers || [];
  const pendingApprovals = data?.pendingApprovals || [];
  const overdueTasksList = (data as any)?.overdueTasksList || [];
  const incompleteTasksList = (data as any)?.incompleteTasksList || [];
  const totalTasksList = (data as any)?.totalTasksList || [];
  const completedTasksList = (data as any)?.completedTasksList || [];

  useEffect(() => {
    if (loading) return; // auth still resolving — don't fire prematurely
    if (!isManager && user) {
      Alert.error('Access Denied', 'You do not have permission to access this page');
      navigate('/dashboard');
    }
  }, [isManager, loading, navigate, user]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'accent';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'secondary';
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

  if (dataLoading) {
    return (
      <Layout>
        <DashboardSkeleton role="manager" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Manager Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Team oversight and management tools</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => navigate('/reports')} variant="outline" className="w-full sm:w-auto">
              <BarChart3 className="w-4 h-4 mr-2" />
              Team Reports
            </Button>
            <Button onClick={() => navigate('/users')} variant="outline" className="w-full sm:w-auto">
              <Users className="w-4 h-4 mr-2" />
              Manage Team
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teamMembers}</div>
              <p className="text-xs text-muted-foreground">
                Active team members
              </p>
            </CardContent>
          </Card>

          <Dialog open={incompleteDialogOpen} onOpenChange={setIncompleteDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer bg-blue-50/50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-800/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Incomplete Tasks</CardTitle>
                  <Target className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.incompleteTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    Active team progress
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-blue-600 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Incomplete Team Tasks
                </DialogTitle>
                <DialogDescription>
                  In-depth view of all team tasks that are currently active and not yet finished.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                <div className="space-y-4">
                  {incompleteTasksList.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">Excellent! All team tasks are on track.</p>
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
                          <Badge variant={getPriorityColor(task.priority)} className="shrink-0">{task.priority}</Badge>
                        </div>
                        <TaskTimer
                          taskId={task.id}
                          status={task.status}
                          estimatedHours={(task as any).estimated_hours}
                          spentSeconds={(task as any).spent_seconds}
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
                    Critical team attention
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Overdue Team Tasks
                </DialogTitle>
                <DialogDescription>
                  Monitor and take action on delayed team tasks.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                <div className="space-y-4">
                  {overdueTasksList.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <p className="text-muted-foreground">Great! No overdue team tasks.</p>
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
            role="manager"
            onStatusChange={handleUpdateStatus}
          />

          <Dialog open={totalDialogOpen} onOpenChange={setTotalDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeTasks}</div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>{stats.completedTasks} completed</span>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  All Team Tasks
                </DialogTitle>
                <DialogDescription>
                  Complete overview of all tasks assigned to your team.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                <div className="space-y-4">
                  {totalTasksList.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No tasks found for the team.</p>
                    </div>
                  ) : (
                    totalTasksList.map((task: any) => (
                      <div key={task.id} className="p-4 border border-muted rounded-lg hover:bg-muted/30 transition-colors space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] capitalize font-medium">
                                {task.status.replace('_', ' ')}
                              </Badge>
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

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.pendingApprovals}</div>
              <p className="text-xs text-muted-foreground">
                Require your attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teamExpenses}</div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{stats.pendingExpenses} pending</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Top performing team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No team members found</p>
                  </div>
                ) : (
                  teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{member.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{member.department}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{member.task_count} tasks</span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm">{member.completion_rate.toFixed(0)}% completion</span>
                        </div>
                        <Progress value={member.completion_rate} className="w-full" />
                      </div>
                      <Badge variant="outline">
                        {member.completion_rate > 80 ? 'High Performer' :
                          member.completion_rate > 60 ? 'Good' : 'Needs Support'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Items requiring your approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending approvals</p>
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                ) : (
                  pendingApprovals.map((approval) => (
                    <div key={approval.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={approval.type === 'expense' ? 'default' : 'secondary'}>
                            {approval.type}
                          </Badge>
                        </div>
                        <h4 className="font-medium">{approval.title}</h4>
                        {approval.amount && (
                          <p className="text-sm font-medium">LKR {approval.amount}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          By {approval.employee_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(approval.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/petty-cash')}
                      >
                        Review
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
            <CardTitle>Management Tools</CardTitle>
            <CardDescription>Quick access to management functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/tasks')}
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>Assign Tasks</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/petty-cash')}
              >
                <DollarSign className="w-6 h-6" />
                <span>Review Expenses</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/reports')}
              >
                <BarChart3 className="w-6 h-6" />
                <span>Team Reports</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/users')}
              >
                <UserCheck className="w-6 h-6" />
                <span>Manage Team</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default ManagerDashboard;
