import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, User, DollarSign, FileText, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ApprovalStep {
  id: string;
  role: 'manager' | 'admin' | 'supervisor';
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  comments?: string;
  required: boolean;
}

interface ApprovalWorkflowProps {
  transactionId: string;
  amount: number;
  category: string;
  employeeId: string;
  onStatusChange: (status: string) => void;
  readonly?: boolean;
}

const ApprovalWorkflow = ({ 
  transactionId, 
  amount, 
  category, 
  employeeId, 
  onStatusChange,
  readonly = false 
}: ApprovalWorkflowProps) => {
  const [workflow, setWorkflow] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { user, isAdmin, isManager, isSupervisor } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    initializeWorkflow();
  }, [transactionId, amount]);

  const initializeWorkflow = async () => {
    try {
      // Determine approval workflow based on amount and category
      const steps: ApprovalStep[] = [];

      // Always require manager approval for amounts > $100
      if (amount > 100) {
        steps.push({
          id: 'manager',
          role: 'manager',
          status: 'pending',
          required: true,
        });
      }

      // Require admin approval for amounts > $500
      if (amount > 500) {
        steps.push({
          id: 'admin',
          role: 'admin',
          status: 'pending',
          required: true,
        });
      }

      // Special categories might require supervisor approval
      const supervisorCategories = ['equipment', 'maintenance', 'travel'];
      if (supervisorCategories.includes(category.toLowerCase())) {
        steps.push({
          id: 'supervisor',
          role: 'supervisor',
          status: 'pending',
          required: true,
        });
      }

      // If no steps required, auto-approve
      if (steps.length === 0) {
        steps.push({
          id: 'auto',
          role: 'admin',
          status: 'approved',
          required: false,
        });
      }

      setWorkflow(steps);
    } catch (error) {
      console.error('Error initializing workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const canApprove = (step: ApprovalStep): boolean => {
    if (readonly) return false;
    
    // Check if user has the required role
    const hasRole = (
      (step.role === 'admin' && isAdmin) ||
      (step.role === 'manager' && isManager) ||
      (step.role === 'supervisor' && isSupervisor)
    );

    // Check if this is the current step
    const isCurrentStep = workflow.findIndex(s => s.id === step.id) === 
      workflow.findIndex(s => s.status === 'pending');

    return hasRole && isCurrentStep && step.status === 'pending';
  };

  const handleApproval = async (stepId: string, action: 'approve' | 'reject', comments?: string) => {
    if (!user) return;

    setActionLoading(true);
    try {
      // Update workflow step
      const updatedWorkflow = workflow.map(step => {
        if (step.id === stepId) {
          return {
            ...step,
            status: action,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            comments,
          };
        }
        return step;
      });

      setWorkflow(updatedWorkflow);

      // Determine overall status
      const hasRejection = updatedWorkflow.some(step => step.status === 'rejected');
      const allRequiredApproved = updatedWorkflow
        .filter(step => step.required)
        .every(step => step.status === 'approved');

      let overallStatus = 'pending';
      if (hasRejection) {
        overallStatus = 'rejected';
      } else if (allRequiredApproved) {
        overallStatus = 'approved';
      }

      // Update transaction status
      const { error } = await supabase
        .from('petty_cash_transactions')
        .update({
          status: overallStatus,
          approved_by: overallStatus === 'approved' ? user.id : null,
          approved_at: overallStatus === 'approved' ? new Date().toISOString() : null,
        })
        .eq('id', transactionId);

      if (error) throw error;

      onStatusChange(overallStatus);

      toast({
        title: action === 'approve' ? 'Approved' : 'Rejected',
        description: `Transaction ${action}d successfully`,
      });

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = workflow.filter(step => step.status === 'approved').length;
    return (completedSteps / workflow.length) * 100;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Approval Workflow
        </CardTitle>
        <CardDescription>
          Multi-level approval process for expense transactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{workflow.filter(s => s.status === 'approved').length} / {workflow.length}</span>
          </div>
          <Progress value={getProgressPercentage()} className="w-full" />
        </div>

        {/* Workflow Steps */}
        <div className="space-y-3">
          {workflow.map((step, index) => (
            <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getStepIcon(step.status)}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium capitalize">{step.role} Approval</span>
                    <Badge variant={getStepColor(step.status)}>
                      {step.status}
                    </Badge>
                  </div>
                  {step.approved_by && (
                    <p className="text-sm text-muted-foreground">
                      By {step.approved_by} • {step.approved_at && new Date(step.approved_at).toLocaleDateString()}
                    </p>
                  )}
                  {step.comments && (
                    <p className="text-sm text-muted-foreground mt-1">
                      "{step.comments}"
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {canApprove(step) && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleApproval(step.id, 'approve')}
                    disabled={actionLoading}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleApproval(step.id, 'reject', 'Rejected by approver')}
                    disabled={actionLoading}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Transaction Details */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-medium">LKR {amount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Category</span>
            <span className="font-medium capitalize">{category}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Required Approvals</span>
            <span className="font-medium">{workflow.filter(s => s.required).length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApprovalWorkflow;
