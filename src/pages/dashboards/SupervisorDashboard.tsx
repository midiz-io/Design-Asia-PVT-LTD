import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Navigation,
  Activity,
  TrendingUp,
  Eye,
  FileText,
  Target,
  Send,
  CheckSquare,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useSupervisorStats } from '@/hooks/useDashboardStats';
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskTimer } from '@/components/TaskTimer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';
import { TaskExtensionRequestDialog } from '@/components/TaskExtensionRequestDialog';

interface SupervisorStats {
  fieldTeam: number;
  activeLocations: number;
  completedTasks: number;
  pendingTasks: number;
  locationUpdates: number;
  fieldExpenses: number;
  geofenceAlerts: number;
  unreadMessages: number;
  overdueTasks: number;
  incompleteTasks: number;
}

interface FieldMember {
  id: string;
  full_name: string;
  email: string;
  department: string;
  last_location?: string;
  last_update?: string;
  battery_level?: number;
  active_tasks: number;
}

interface LocationAlert {
  id: string;
  type: 'breach' | 'low_battery' | 'inactive';
  message: string;
  employee_name: string;
  timestamp: string;
}

const SupervisorDashboard = () => {
  const { user, isSupervisor, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [overdueDialogOpen, setOverdueDialogOpen] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [totalDialogOpen, setTotalDialogOpen] = useState(false);
  const [completedDialogOpen, setCompletedDialogOpen] = useState(false);
  const [extensionDialogOpen, setExtensionDialogOpen] = useState(false);
  const [extensionInitialType, setExtensionInitialType] = useState<'overdue' | 'incomplete'>('overdue');

  const { data, isLoading: dataLoading } = useSupervisorStats(user?.id);
  const stats = data?.stats || {
    fieldTeam: 0,
    activeLocations: 0,
    completedTasks: 0,
    pendingTasks: 0,
    locationUpdates: 0,
    fieldExpenses: 0,
    geofenceAlerts: 0,
    unreadMessages: 0,
    overdueTasks: 0,
    incompleteTasks: 0,
  };
  const fieldMembers = data?.fieldMembers || [];
  const locationAlerts = data?.locationAlerts || [];
  const overdueTasksList = (data as any)?.overdueTasksList || [];
  const incompleteTasksList = (data as any)?.incompleteTasksList || [];
  const totalTasksList = (data as any)?.totalTasksList || [];
  const completedTasksList = (data as any)?.completedTasksList || [];

  useEffect(() => {
    if (loading) return; // auth still resolving — don't fire prematurely
    if (!isSupervisor && user) {
      Alert.error('Access Denied', 'You do not have permission to access this page');
      navigate('/dashboard');
    }
  }, [isSupervisor, loading, navigate, user]);

  const getBatteryColor = (level?: number) => {
    if (!level) return 'secondary';
    if (level < 20) return 'destructive';
    if (level < 50) return 'default';
    return 'default';
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'breach': return 'destructive';
      case 'low_battery': return 'default';
      case 'inactive': return 'secondary';
      default: return 'default';
    }
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
        <DashboardSkeleton role="supervisor" />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Supervisor Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Field operations and team monitoring</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => navigate('/locations')} variant="outline" className="w-full sm:w-auto">
              <MapPin className="w-4 h-4 mr-2" />
              View Locations
            </Button>
            <Button onClick={() => navigate('/reports')} variant="outline" className="w-full sm:w-auto">
              <TrendingUp className="w-4 h-4 mr-2" />
              Field Reports
            </Button>
          </div>
        </div>

        {/* My Team Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">My Team</CardTitle>
                <CardDescription>Members currently assigned to you by Admin</CardDescription>
              </div>
              <Users className="w-5 h-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {fieldMembers.length === 0 ? (
                  <div className="col-span-full py-10 text-center border-2 border-dashed rounded-xl">
                    <p className="text-muted-foreground">No team members assigned yet.</p>
                  </div>
                ) : (
                  fieldMembers.map((member) => (
                    <div key={member.id} className="p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] px-1.5">
                              {member.active_tasks} Active Tasks
                            </Badge>
                            {member.battery_level !== undefined && (
                              <Badge variant={member.battery_level < 20 ? 'destructive' : 'outline'} className="text-[10px] px-1.5">
                                {member.battery_level}% Bat
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-dashed flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">
                          {member.last_update ? `Last seen: ${new Date(member.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'No location data'}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => navigate(`/locations?userId=${member.id}`)}>
                          Track
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => navigate('/tasks')} className="w-full justify-start" variant="outline">
                <CheckSquare className="w-4 h-4 mr-2" />
                Task Overview
              </Button>
              <Button onClick={() => navigate('/chat')} className="w-full justify-start" variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Team Chat
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Field Team</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.fieldTeam}</div>
              <p className="text-xs text-muted-foreground">
                Active field members
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
                    Total active workspace
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
                      <p className="text-muted-foreground">Great! No active team tasks.</p>
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
            role="supervisor"
            onStatusChange={handleUpdateStatus}
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLocations}</div>
              <p className="text-xs text-muted-foreground">
                Team members with GPS
              </p>
            </CardContent>
          </Card>

          <Dialog open={totalDialogOpen} onOpenChange={setTotalDialogOpen}>
            <DialogTrigger asChild>
              <Card className="hover:shadow-lg transition-all cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Field Tasks</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completedTasks}</div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>{stats.pendingTasks} pending</span>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  All Field Tasks
                </DialogTitle>
                <DialogDescription>
                  Complete overview of all tasks assigned to your field team.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 mt-4 pr-2 overflow-y-auto custom-scrollbar min-h-[300px]">
                <div className="space-y-4">
                  {totalTasksList.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No field tasks found.</p>
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
              <CardTitle className="text-sm font-medium">Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.geofenceAlerts}</div>
              <p className="text-xs text-muted-foreground">
                Location & battery alerts
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Field Team Status */}
          <Card>
            <CardHeader>
              <CardTitle>Field Team Status</CardTitle>
              <CardDescription>Real-time location and activity tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fieldMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No field team members found</p>
                  </div>
                ) : (
                  fieldMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <h4 className="font-medium">{member.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{member.department}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">{member.active_tasks} active tasks</span>
                          {member.battery_level && (
                            <>
                              <span className="text-sm text-muted-foreground">•</span>
                              <Badge variant={getBatteryColor(member.battery_level)}>
                                {member.battery_level}% battery
                              </Badge>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Last update: {member.last_update ?
                            new Date(member.last_update).toLocaleString() :
                            'Never'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={member.last_update &&
                          new Date(member.last_update).getTime() > Date.now() - 2 * 60 * 60 * 1000 ?
                          'default' : 'secondary'}>
                          {member.last_update &&
                            new Date(member.last_update).getTime() > Date.now() - 2 * 60 * 60 * 1000 ?
                            'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Location Alerts</CardTitle>
              <CardDescription>Geofence and safety alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locationAlerts.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                    <p className="text-muted-foreground">No alerts</p>
                    <p className="text-sm text-muted-foreground">All team members are safe</p>
                  </div>
                ) : (
                  locationAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getAlertColor(alert.type)}>
                            {alert.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <h4 className="font-medium">{alert.message}</h4>
                        <p className="text-sm text-muted-foreground">
                          {alert.employee_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/locations')}
                      >
                        <Eye className="w-4 h-4 mr-2" />
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
            <CardTitle>Field Operations</CardTitle>
            <CardDescription>Quick access to field management tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/locations')}
              >
                <MapPin className="w-6 h-6" />
                <span>Track Locations</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/tasks')}
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>Field Tasks</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/geofences')}
              >
                <Navigation className="w-6 h-6" />
                <span>Geofences</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2"
                onClick={() => navigate('/reports')}
              >
                <Activity className="w-6 h-6" />
                <span>Field Reports</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SupervisorDashboard;
