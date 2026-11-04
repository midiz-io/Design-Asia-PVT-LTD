import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, Users, Package, DollarSign, CheckCircle, Clock, FileText, Calendar, DownloadCloud } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import { useReports } from '@/hooks/useReports';
import { ReportsSkeleton } from '@/components/skeletons/ReportsSkeleton';
import { Button } from '@/components/ui/button';
import { generateTeamReportPDF, generateEmployeeReportPDF } from '@/utils/pdfExport';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChatUsers } from '@/hooks/useChat';

import { useEffect } from 'react';
import { usePermissions } from '@/contexts/PermissionContext';
import { useNavigate } from 'react-router-dom';
import Alert from '@/utils/alert';

const Reports = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const { user, isAdmin } = useAuth();
  const { hasAccess, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const { analytics, isLoading } = useReports(timeRange);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const { users } = useChatUsers();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user && !permissionsLoading && !hasAccess('reports')) {
      Alert.error('Access Denied', 'You do not have permission to access Reports');
      navigate('/dashboard');
    }
  }, [user, permissionsLoading, hasAccess, navigate]);

  const handleExportEmployee = async () => {
    if (!selectedEmployeeId) return;
    setIsExporting(true);
    await generateEmployeeReportPDF(selectedEmployeeId, timeRange);
    setIsExporting(false);
    setEmployeeDialogOpen(false);
  };

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Comprehensive insights and performance metrics</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto bg-muted p-1 rounded-md">
                <Button variant="ghost" size="sm" onClick={() => generateTeamReportPDF(analytics, timeRange)}>
                    <DownloadCloud className="w-4 h-4 mr-2" />
                    Team
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEmployeeDialogOpen(true)}>
                    <DownloadCloud className="w-4 h-4 mr-2" />
                    Employee
                </Button>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Task Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold mb-2">{analytics.tasks.completionRate.toFixed(1)}%</div>
              <Progress value={analytics.tasks.completionRate} className="h-1.5 sm:h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {analytics.tasks.completed} of {analytics.tasks.total} completed
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold mb-2">LKR {analytics.expenses.total.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Avg: LKR {analytics.expenses.avgAmount.toFixed(2)} per transaction
              </p>
              <p className="text-xs text-muted-foreground">
                {analytics.expenses.pending} pending approval
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4" />
                Inventory Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold mb-2">LKR {analytics.inventory.totalValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.inventory.totalItems} items tracked
              </p>
              <p className="text-xs text-destructive">
                {analytics.inventory.lowStock} items low on stock
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold mb-2">{analytics.users.active}</div>
              <p className="text-xs text-muted-foreground">
                of {analytics.users.total} total users
              </p>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-full">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Status Breakdown</CardTitle>
                  <CardDescription>Distribution of tasks by status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(analytics.tasks.byStatus).map(([status, count]) => (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{status.replace('_', ' ')}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <Progress value={(count / analytics.tasks.total) * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Tasks by priority level</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(analytics.tasks.byPriority).map(([priority, count]) => (
                    <div key={priority} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{priority}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <Progress value={(count / analytics.tasks.total) * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Task Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                    <div className="text-2xl font-bold">{analytics.tasks.completed}</div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <Clock className="w-8 h-8 text-warning mx-auto mb-2" />
                    <div className="text-2xl font-bold">{analytics.tasks.inProgress}</div>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <div className="text-2xl font-bold">{analytics.tasks.pending}</div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="text-2xl font-bold">{analytics.tasks.total}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
                <CardDescription>Spending breakdown across categories</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.expenses.byCategory.map(({ category, amount }) => (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category}</span>
                      <span className="text-sm font-semibold">LKR {amount.toFixed(2)}</span>
                    </div>
                    <Progress value={(amount / analytics.expenses.total) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-success">LKR {analytics.expenses.approved.toFixed(2)}</div>
                    <TrendingUp className="w-6 h-6 text-success" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-warning">{analytics.expenses.pending}</div>
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rejected</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-destructive">{analytics.expenses.rejected}</div>
                    <TrendingDown className="w-6 h-6 text-destructive" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Overview</CardTitle>
                  <CardDescription>Current stock status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-primary" />
                      <span>Total Items</span>
                    </div>
                    <span className="text-xl font-bold">{analytics.inventory.totalItems}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="w-5 h-5 text-destructive" />
                      <span>Low Stock</span>
                    </div>
                    <span className="text-xl font-bold text-destructive">{analytics.inventory.lowStock}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-success" />
                      <span>Total Value</span>
                    </div>
                    <span className="text-xl font-bold text-success">LKR {analytics.inventory.totalValue.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Metrics</CardTitle>
                  <CardDescription>Recent inventory activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-accent" />
                      <span>Stock Movements</span>
                    </div>
                    <span className="text-xl font-bold">{analytics.inventory.movements}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-warning" />
                      <span>Active Alerts</span>
                    </div>
                    <span className="text-xl font-bold text-warning">{analytics.inventory.alerts}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution by Role</CardTitle>
                <CardDescription>Team composition overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(analytics.users.byRole).map(([role, count]) => (
                  <div key={role} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {role}
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold">{count} users</span>
                    </div>
                    <Progress value={(count / analytics.users.total) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>Recent engagement metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-6">
                    <Users className="w-16 h-16 text-primary mx-auto mb-4" />
                    <div className="text-4xl font-bold mb-2">{analytics.users.active}</div>
                    <p className="text-muted-foreground">Active in last 24 hours</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {((analytics.users.active / analytics.users.total) * 100).toFixed(1)}% activity rate
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Users</CardTitle>
                  <CardDescription>Complete user base</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-6">
                    <Users className="w-16 h-16 text-accent mx-auto mb-4" />
                    <div className="text-4xl font-bold mb-2">{analytics.users.total}</div>
                    <p className="text-muted-foreground">Registered users</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Employee Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Employee</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={!selectedEmployeeId || isExporting} onClick={handleExportEmployee}>
              {isExporting ? 'Generating PDF...' : 'Download PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Reports;

