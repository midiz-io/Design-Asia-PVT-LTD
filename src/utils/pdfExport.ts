import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { AnalyticsData } from '@/hooks/useReports';
import { format } from 'date-fns';
import Alert from './alert';

export const generateTeamReportPDF = (analytics: AnalyticsData, timeRangeStr: string) => {
    const doc = new jsPDF();
    const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const title = 'TaskVision Enterprise - Team Report';

    doc.setFontSize(20);
    doc.text(title, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${dateStr}`, 14, 30);
    doc.text(`Time Range: Last ${timeRangeStr.replace('d', ' Days')}`, 14, 36);

    // Tasks Summary Table
    autoTable(doc, {
        startY: 45,
        head: [['Task Metrics', 'Count']],
        body: [
            ['Total Tasks', analytics.tasks.total.toString()],
            ['Completed', analytics.tasks.completed.toString()],
            ['In Progress', analytics.tasks.inProgress.toString()],
            ['Pending', analytics.tasks.pending.toString()],
            ['Completion Rate', `${analytics.tasks.completionRate.toFixed(1)}%`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [250, 128, 114] }, // Brand primary color
    });

    // Expenses Summary Table
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Expense Metrics', 'Amount (LKR) / Count']],
        body: [
            ['Total Expenses', `LKR ${analytics.expenses.total.toFixed(2)}`],
            ['Approved', `LKR ${analytics.expenses.approved.toFixed(2)}`],
            ['Pending (Count)', analytics.expenses.pending.toString()],
            ['Rejected (Count)', analytics.expenses.rejected.toString()],
            ['Average Transaction', `LKR ${analytics.expenses.avgAmount.toFixed(2)}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [250, 128, 114] },
    });

    // Inventory & Users Summary Table
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Metric', 'Value']],
        body: [
            ['Total Inventory Items', analytics.inventory.totalItems.toString()],
            ['Low Stock Items', analytics.inventory.lowStock.toString()],
            ['Total Inventory Value', `LKR ${analytics.inventory.totalValue.toFixed(2)}`],
            ['Total Registered Users', analytics.users.total.toString()],
            ['Active Users (24h)', analytics.users.active.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [250, 128, 114] },
    });

    doc.save(`TaskVision_TeamReport_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateEmployeeReportPDF = async (
    employeeId: string,
    timeRangeStr: string
) => {
    try {
        // Fetch employee details
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', employeeId).single();
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', employeeId).single();
        
        if (!profileData) {
            Alert.error('Error', 'Employee not found');
            return;
        }

        const employeeData = {
            fullName: profileData.full_name,
            email: profileData.email,
            role: roleData?.role || 'Unknown'
        };

        const now = new Date();
        let days = 30;
        if (timeRangeStr === '7d') days = 7;
        if (timeRangeStr === '90d') days = 90;
        const timeThreshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

        // Fetch Employee Tasks
        const { data: tasks } = await supabase
            .from('tasks')
            .select('*')
            .eq('assigned_to', employeeId)
            .gte('created_at', timeThreshold);

        const employeeTasks = tasks || [];
        const totalTasks = employeeTasks.length;
        const completedTasks = employeeTasks.filter(t => t.status === 'completed').length;
        const inProgressTasks = employeeTasks.filter(t => t.status === 'in_progress').length;
        const pendingTasks = employeeTasks.filter(t => t.status === 'pending').length;

        // Fetch Employee Expenses
        const { data: expenses } = await supabase
            .from('petty_cash_transactions')
            .select('*')
            .eq('requested_by', employeeId)
            .gte('created_at', timeThreshold);

        const employeeExpenses = expenses || [];
        const totalExpensesAmount = employeeExpenses.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
        const approvedExpenses = employeeExpenses.filter(tx => tx.status === 'approved').reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0);
        const pendingExpenses = employeeExpenses.filter(tx => tx.status === 'pending').length;
        const rejectedExpenses = employeeExpenses.filter(tx => tx.status === 'rejected').length;

        const employeeAnalytics = {
            totalTasks,
            completedTasks,
            inProgressTasks,
            pendingTasks,
            totalExpenses: totalExpensesAmount,
            approvedExpenses,
            pendingExpenses,
            rejectedExpenses
        };

        const doc = new jsPDF();
        const dateStr = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const title = 'TaskVision Enterprise - Employee Report';

        doc.setFontSize(20);
        doc.text(title, 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${dateStr}`, 14, 30);
        doc.text(`Time Range: Last ${days} Days`, 14, 36);
        
        // Employee Info
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Employee Name: ${employeeData.fullName}`, 14, 46);
        doc.text(`Email: ${employeeData.email}`, 14, 52);
        doc.text(`Role: ${employeeData.role}`, 14, 58);

        let currentY = 65;

        // Tasks Table
        autoTable(doc, {
            startY: currentY,
            head: [['Task Metric', 'Count']],
            body: [
                ['Total Assigned Tasks', employeeAnalytics.totalTasks.toString()],
                ['Completed', employeeAnalytics.completedTasks.toString()],
                ['In Progress', employeeAnalytics.inProgressTasks.toString()],
                ['Pending', employeeAnalytics.pendingTasks.toString()],
            ],
            theme: 'striped',
            headStyles: { fillColor: [250, 128, 114] },
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 10;

        // Expenses Table
        autoTable(doc, {
            startY: currentY,
            head: [['Expense Metric', 'Amount / Count']],
            body: [
                ['Total Submitted Expenses', `LKR ${employeeAnalytics.totalExpenses.toFixed(2)}`],
                ['Approved', `LKR ${employeeAnalytics.approvedExpenses.toFixed(2)}`],
                ['Pending Count', employeeAnalytics.pendingExpenses.toString()],
                ['Rejected Count', employeeAnalytics.rejectedExpenses.toString()],
            ],
            theme: 'striped',
            headStyles: { fillColor: [250, 128, 114] },
        });

        doc.save(`TaskVision_EmployeeReport_${employeeData.fullName.replace(/\s+/g, '')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
        Alert.success('Success', 'Employee report downloaded successfully');
    } catch (e) {
        console.error(e);
        Alert.error('Error', 'Failed to generate report');
    }
};
