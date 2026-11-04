import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, DollarSign, CheckCircle, XCircle, Clock, Upload, Settings, TrendingUp, FileText } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import ApprovalWorkflow from '@/components/ApprovalWorkflow';
import BudgetTracker from '@/components/BudgetTracker';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Layout from '@/components/Layout';
import AlertService from '@/utils/alert';
import { usePettyCash } from '@/hooks/usePettyCash';
import { PettyCashSkeleton } from '@/components/skeletons/PettyCashSkeleton';
import { useQueryClient } from '@tanstack/react-query';

interface IOUSettlement {
  id: string;
  iou_request_id: string;
  employee_id: string;
  actual_expense_amount: number;
  cash_returned: number;
  additional_payment: number;
  receipt_url: string | null;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

import { usePermissions } from '@/contexts/PermissionContext';
import { useNavigate } from 'react-router-dom';

const PettyCash = () => {
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showBudgetTracker, setShowBudgetTracker] = useState(false);
  const [iouDialogOpen, setIOUDialogOpen] = useState(false);
  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [selectedIOU, setSelectedIOU] = useState<any | null>(null);

  const { user, isAdmin } = useAuth();
  const { hasAccess, canEdit, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && !permissionsLoading && !hasAccess('petty_cash')) {
      AlertService.error('Access Denied', 'You do not have permission to access Petty Cash');
      navigate('/dashboard');
    }
  }, [user, permissionsLoading, hasAccess, navigate]);

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category_id: '',
    receipt_url: '',
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    budget_limit: '',
  });

  const [iouFormData, setIOUFormData] = useState({
    requested_amount: '',
    category_id: '',
    purpose: '',
  });

  const [settlementFormData, setSettlementFormData] = useState({
    actual_expense_amount: '',
    cash_returned: '',
    additional_payment: '',
    description: '',
    receipt_url: '',
  });

  const {
    categories,
    transactions,
    iouRequests,
    iouSettlements,
    categorySpending,
    totalApproved,
    totalPending,
    isLoading
  } = usePettyCash();



  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user?.id) {
        const { default: AlertSvc } = await import('@/utils/alert');
        AlertSvc.error('Error', 'You must be signed in to create a transaction.');
        return;
      }
      const { error } = await supabase.from('petty_cash_transactions').insert([
        {
          ...formData,
          amount: parseFloat(formData.amount),
          employee_id: user.id,
        },
      ]);

      if (error) throw error;

      const { default: AlertSvc } = await import('@/utils/alert');
      AlertSvc.success('Transaction submitted for approval');

      setTransactionOpen(false);
      setFormData({ amount: '', description: '', category_id: '', receipt_url: '' });
      void queryClient.invalidateQueries({ queryKey: ['petty_cash_transactions'] });
    } catch (error: any) {
      const { default: AlertSvc } = await import('@/utils/alert');
      AlertSvc.error('Error', error.message);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('petty_cash_categories').insert([
        {
          ...categoryFormData,
          budget_limit: parseFloat(categoryFormData.budget_limit),
        },
      ]);

      if (error) throw error;

      const { default: AlertSvc } = await import('@/utils/alert');
      AlertSvc.success('Category created successfully');

      setCategoryOpen(false);
      setCategoryFormData({ name: '', description: '', budget_limit: '' });
      void queryClient.invalidateQueries({ queryKey: ['petty_cash_categories'] });
    } catch (error: any) {
      const { default: AlertSvc } = await import('@/utils/alert');
      AlertSvc.error('Error', error.message);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const confirmed = await AlertService.confirm(
        `${status === 'approved' ? 'Approve' : 'Reject'} transaction?`,
        status === 'approved' ? 'This will mark the transaction as approved.' : 'This will mark the transaction as rejected.'
      );
      if (!confirmed) return;
      if (!user?.id) {
        toast({
          title: 'Error',
          description: 'You must be signed in to update status.',
          variant: 'destructive',
        });
        return;
      }
      const { error } = await supabase
        .from('petty_cash_transactions')
        .update({
          status,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      const { default: AlertSvc } = await import('@/utils/alert');
      AlertSvc.toast(`Transaction ${status}`);

      void queryClient.invalidateQueries({ queryKey: ['petty_cash_transactions'] });
    } catch (error: any) {
      const { default: AlertSvc } = await import('@/utils/alert');
      AlertSvc.error('Error', error.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return <PettyCashSkeleton />;
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Petty Cash</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage expense transactions and budgets</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowBudgetTracker(!showBudgetTracker)}
              className="w-full sm:w-auto"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Budget Tracker
            </Button>
            <Dialog open={transactionOpen} onOpenChange={setTransactionOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  New Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full max-w-md">
                <DialogHeader>
                  <DialogTitle>Submit Expense</DialogTitle>
                  <DialogDescription>Submit a new petty cash expense</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateTransaction} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name} (Budget: LKR {cat.budget_limit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receipt">Receipt (Optional)</Label>
                    <FileUpload
                      onUploadComplete={(fileUrl, fileName) => {
                        setFormData({ ...formData, receipt_url: fileUrl });
                      }}
                      accept="image/*,.pdf"
                      maxSize={5}
                      className="w-full"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Submit Transaction
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            {isAdmin && (
              <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Settings className="w-4 h-4 mr-2" />
                    New Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:w-full max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Category</DialogTitle>
                    <DialogDescription>Create a new petty cash category</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name">Name *</Label>
                      <Input
                        id="cat-name"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-description">Description</Label>
                      <Textarea
                        id="cat-description"
                        value={categoryFormData.description}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget Limit *</Label>
                      <Input
                        id="budget"
                        type="number"
                        step="0.01"
                        value={categoryFormData.budget_limit}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, budget_limit: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Create Category
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-success">LKR {totalApproved.toFixed(2)}</div>
                <CheckCircle className="w-8 h-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-warning">LKR {totalPending.toFixed(2)}</div>
                <Clock className="w-8 h-8 text-warning opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {transactions.filter(t => t.status === 'pending').length} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{categories.length}</div>
                <TrendingUp className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Tracking */}
        {categorySpending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Budget Tracking by Category</CardTitle>
              <CardDescription>Current spending vs budget limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categorySpending.map((item) => {
                const percentage = item.limit > 0 ? (item.spent / item.limit) * 100 : 0;
                const isOverBudget = percentage > 100;
                const isNearLimit = percentage > 80 && percentage <= 100;

                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.category}</span>
                      <div className="text-right">
                        <span className={`font-semibold ${isOverBudget ? 'text-destructive' : isNearLimit ? 'text-warning' : ''}`}>
                          LKR {item.spent.toFixed(2)}
                        </span>
                        <span className="text-muted-foreground"> / LKR {item.limit.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress
                        value={Math.min(percentage, 100)}
                        className={`h-2 ${isOverBudget ? 'bg-destructive/20' : isNearLimit ? 'bg-warning/20' : ''}`}
                      />
                      {isOverBudget && (
                        <Badge variant="destructive" className="absolute -top-1 right-0 text-xs">
                          Over Budget
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% of budget used
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Main Tabs: Transactions vs IOU System */}
        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="transactions" className="flex-1 min-w-[100px]">Expenses</TabsTrigger>
            <TabsTrigger value="iou" className="flex-1 min-w-[100px]">IOU System</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            {/* Transactions List */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="flex w-full overflow-x-auto">
                <TabsTrigger value="all" className="flex-1 min-w-[80px]">All Transactions</TabsTrigger>
                <TabsTrigger value="pending" className="flex-1 min-w-[70px]">Pending</TabsTrigger>
                <TabsTrigger value="approved" className="flex-1 min-w-[80px]">Approved</TabsTrigger>
                <TabsTrigger value="rejected" className="flex-1 min-w-[70px]">Rejected</TabsTrigger>
              </TabsList>

              {['all', 'pending', 'approved', 'rejected'].map((status) => (
                <TabsContent key={status} value={status} className="space-y-4">
                  {transactions
                    .filter(t => status === 'all' || t.status === status)
                    .map((transaction) => (
                      <Card key={transaction.id}>
                        <CardHeader>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CardTitle className="text-xl sm:text-2xl">LKR {transaction.amount.toFixed(2)}</CardTitle>
                                <Badge variant="outline">{transaction.petty_cash_categories?.name}</Badge>
                              </div>
                              <CardDescription className="line-clamp-2">{transaction.description}</CardDescription>
                              <p className="text-sm text-muted-foreground">
                                By: {transaction.profiles?.full_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusIcon(transaction.status)}
                              <Badge variant={getStatusVariant(transaction.status)}>{transaction.status}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        {isAdmin && transaction.status === 'pending' && (
                          <CardContent>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateStatus(transaction.id, 'approved')}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleUpdateStatus(transaction.id, 'rejected')}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  {transactions.filter(t => status === 'all' || t.status === status).length === 0 && (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No {status !== 'all' ? status : ''} transactions found</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          <TabsContent value="iou">
            <div className="space-y-6">
              {/* IOU Documentation */}
              <Card>
                <CardHeader>
                  <CardTitle>IOU Workflow</CardTitle>
                  <CardDescription>Request petty cash advances and settle with bills</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-semibold mb-2">Scenario 1: Expense Less Than IOU</h4>
                      <p className="text-muted-foreground">
                        Request IOU of LKR 1,000, make purchase of LKR 990, then submit bill (LKR 990) + cash return (LKR 10) to settle.
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-semibold mb-2">Scenario 2: Expense Higher Than IOU</h4>
                      <p className="text-muted-foreground">
                        Request IOU of LKR 1,000, spend LKR 1,010, then submit bills (LKR 1,010) and request balance (LKR 10) from petty cash to settle.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Request IOU Button */}
              {!isAdmin && (
                <div className="flex gap-2">
                  <Dialog open={iouDialogOpen} onOpenChange={setIOUDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Request IOU
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request IOU</DialogTitle>
                        <DialogDescription>Request a petty cash advance</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        // TODO: Implement IOU request submission
                        AlertService.toast('IOU Request functionality coming soon', 'info');
                        setIOUDialogOpen(false);
                      }} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Requested Amount (LKR)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={iouFormData.requested_amount}
                            onChange={(e) => setIOUFormData({ ...iouFormData, requested_amount: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={iouFormData.category_id} onValueChange={(v) => setIOUFormData({ ...iouFormData, category_id: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Purpose</Label>
                          <Textarea
                            value={iouFormData.purpose}
                            onChange={(e) => setIOUFormData({ ...iouFormData, purpose: e.target.value })}
                            rows={3}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full">Submit Request</Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* IOU Requests List */}
              <Card>
                <CardHeader>
                  <CardTitle>My IOU Requests</CardTitle>
                  <CardDescription>Track your petty cash advances</CardDescription>
                </CardHeader>
                <CardContent>
                  {iouRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No IOU requests found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {iouRequests.map(iou => (
                        <Card key={iou.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">LKR {iou.requested_amount.toFixed(2)}</p>
                                <Badge variant={iou.status === 'approved' ? 'default' : iou.status === 'rejected' ? 'destructive' : 'secondary'}>
                                  {iou.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{iou.purpose}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(iou.requested_at).toLocaleString()}
                              </p>
                            </div>
                            {iou.status === 'issued' && (
                              <Button size="sm" onClick={() => {
                                setSelectedIOU(iou);
                                setSettlementDialogOpen(true);
                              }}>
                                Settle IOU
                              </Button>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Settlement Dialog */}
              <Dialog open={settlementDialogOpen} onOpenChange={setSettlementDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Settle IOU</DialogTitle>
                    <DialogDescription>Submit bills and cash to settle your IOU</DialogDescription>
                  </DialogHeader>
                  {selectedIOU && (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-semibold">IOU Details</p>
                        <p className="text-xs text-muted-foreground">
                          Requested: LKR {selectedIOU.requested_amount.toFixed(2)}
                        </p>
                      </div>
                      <Alert>
                        <AlertTitle>Settlement in Progress</AlertTitle>
                        <AlertDescription>This feature allows you to submit actual bills and cash difference to settle your IOU. Form submission coming soon.</AlertDescription>
                      </Alert>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </TabsContent>
        </Tabs>

        {/* Budget Tracker */}
        {showBudgetTracker && (
          <div className="mt-6">
            <BudgetTracker employeeId={isAdmin ? undefined : user?.id} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PettyCash;
