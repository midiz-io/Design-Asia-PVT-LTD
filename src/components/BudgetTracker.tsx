import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Target, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BudgetData {
  category_id: string;
  category_name: string;
  budget_limit: number;
  current_spent: number;
  monthly_limit: number;
  reset_date: string;
  transactions_count: number;
  last_transaction_date?: string;
}

interface BudgetTrackerProps {
  employeeId?: string;
  showAllCategories?: boolean;
  period?: 'monthly' | 'quarterly' | 'yearly';
}

const BudgetTracker = ({ 
  employeeId, 
  showAllCategories = false, 
  period = 'monthly' 
}: BudgetTrackerProps) => {
  const [budgetData, setBudgetData] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    totalBudget: 0,
    totalSpent: 0,
    remainingBudget: 0,
    utilizationRate: 0,
  });
  const { user, isAdmin, isManager } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchBudgetData();
  }, [employeeId, showAllCategories, period]);

  const fetchBudgetData = async () => {
    try {
      const targetUserId = employeeId || user?.id;
      if (!targetUserId) return;

      // Get categories
      const { data: categories } = await supabase
        .from('petty_cash_categories')
        .select('*')
        .eq('is_active', true);

      if (!categories) return;

      // Get budget data for each category
      const budgetPromises = categories.map(async (category) => {
        // Get budget limits
        const { data: budget } = await supabase
          .from('petty_cash_budgets')
          .select('*')
          .eq('employee_id', targetUserId)
          .eq('category_id', category.id)
          .single();

        // Get spending data
        const { data: transactions } = await supabase
          .from('petty_cash_transactions')
          .select('amount, created_at')
          .eq('employee_id', targetUserId)
          .eq('category_id', category.id)
          .eq('status', 'approved');

        const currentSpent = transactions?.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0) || 0;
        const transactionsCount = transactions?.length || 0;
        const lastTransaction = transactions?.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          category_id: category.id,
          category_name: category.name,
          budget_limit: budget?.monthly_limit || category.budget_limit || 0,
          current_spent: currentSpent,
          monthly_limit: budget?.monthly_limit || category.budget_limit || 0,
          reset_date: budget?.reset_date || new Date().toISOString(),
          transactions_count: transactionsCount,
          last_transaction_date: lastTransaction?.created_at,
        };
      });

      const budgetResults = await Promise.all(budgetPromises);
      setBudgetData(budgetResults);

      // Calculate overall stats
      const totalBudget = budgetResults.reduce((sum, b) => sum + b.budget_limit, 0);
      const totalSpent = budgetResults.reduce((sum, b) => sum + b.current_spent, 0);
      const remainingBudget = totalBudget - totalSpent;
      const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      setOverallStats({
        totalBudget,
        totalSpent,
        remainingBudget,
        utilizationRate,
      });

    } catch (error) {
      console.error('Error fetching budget data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load budget data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 100) return 'destructive';
    if (utilization >= 80) return 'default';
    if (utilization >= 60) return 'secondary';
    return 'default';
  };

  const getUtilizationIcon = (utilization: number) => {
    if (utilization >= 100) return <AlertTriangle className="w-4 h-4 text-destructive" />;
    if (utilization >= 80) return <TrendingUp className="w-4 h-4 text-destructive" />;
    if (utilization >= 60) return <TrendingUp className="w-4 h-4 text-default" />;
    return <TrendingDown className="w-4 h-4 text-success" />;
  };

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Budget Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Budget Overview
          </CardTitle>
          <CardDescription>
            {period.charAt(0).toUpperCase() + period.slice(1)} budget utilization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(overallStats.totalBudget)}</div>
              <div className="text-sm text-muted-foreground">Total Budget</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{formatCurrency(overallStats.totalSpent)}</div>
              <div className="text-sm text-muted-foreground">Total Spent</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${overallStats.remainingBudget >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(overallStats.remainingBudget)}
              </div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{overallStats.utilizationRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Utilization</div>
            </div>
          </div>
          
          <div className="mt-4">
            <Progress 
              value={Math.min(overallStats.utilizationRate, 100)} 
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category-wise Budget Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetData.map((budget) => {
          const utilization = budget.budget_limit > 0 ? (budget.current_spent / budget.budget_limit) * 100 : 0;
          const isOverBudget = budget.current_spent > budget.budget_limit;
          
          return (
            <Card key={budget.category_id} className={isOverBudget ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{budget.category_name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getUtilizationIcon(utilization)}
                    <Badge variant={getUtilizationColor(utilization)}>
                      {utilization.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Budget vs Spent */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Budget</span>
                    <span className="font-medium">{formatCurrency(budget.budget_limit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Spent</span>
                    <span className={`font-medium ${isOverBudget ? 'text-destructive' : ''}`}>
                      {formatCurrency(budget.current_spent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining</span>
                    <span className={`font-medium ${budget.budget_limit - budget.current_spent >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(budget.budget_limit - budget.current_spent)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <Progress 
                    value={Math.min(utilization, 100)} 
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="pt-2 border-t space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Transactions</span>
                    <span>{budget.transactions_count}</span>
                  </div>
                  {budget.last_transaction_date && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last Transaction</span>
                      <span>{formatDate(budget.last_transaction_date)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Reset Date</span>
                    <span>{formatDate(budget.reset_date)}</span>
                  </div>
                </div>

                {/* Over Budget Warning */}
                {isOverBudget && (
                  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Over budget by {formatCurrency(budget.current_spent - budget.budget_limit)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Budget Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Budget Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {budgetData.filter(b => b.current_spent > b.budget_limit).length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">Over Budget Categories</span>
                </div>
                <p className="text-sm text-destructive mt-1">
                  {budgetData.filter(b => b.current_spent > b.budget_limit).length} categories are over budget
                </p>
              </div>
            )}

            {budgetData.filter(b => (b.current_spent / b.budget_limit) >= 0.8 && b.current_spent <= b.budget_limit).length > 0 && (
              <div className="p-3 bg-default/10 border border-default/20 rounded">
                <div className="flex items-center gap-2 text-default">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">Near Budget Limit</span>
                </div>
                <p className="text-sm text-default mt-1">
                  {budgetData.filter(b => (b.current_spent / b.budget_limit) >= 0.8 && b.current_spent <= b.budget_limit).length} categories are at 80% or higher utilization
                </p>
              </div>
            )}

            {overallStats.utilizationRate < 50 && (
              <div className="p-3 bg-success/10 border border-success/20 rounded">
                <div className="flex items-center gap-2 text-success">
                  <TrendingDown className="w-4 h-4" />
                  <span className="font-medium">Good Budget Control</span>
                </div>
                <p className="text-sm text-success mt-1">
                  Overall budget utilization is below 50%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetTracker;
