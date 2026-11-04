import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit, Trash2, Clock, CheckCircle2, AlertTriangle, PlayCircle, Filter, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { useJobs } from '@/hooks/useJobs';
import { JobsSkeleton } from '@/components/skeletons/JobsSkeleton';
import Alert from '@/utils/alert';
import { useQueryClient } from '@tanstack/react-query';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';

interface JobForm {
  category: 'DA' | 'TB' | 'AI';
  customer_name: string;
  job_number: string;
  contact_no: string;
  sales_person: string;
  job_description: string;
  start_date: string;
  completion_date: string;
  contractor_name: string;
  note: string;
  status: 'Started' | 'In Progress' | 'Completed';
  labor_cost: string;
  job_date: string;
  quotation_value: string;
  invoice_no: string;
  invoice_amount: string;
  advance: string;
  payment_details: string;
  progress_percentage: string;
}

interface LaborRow {
  id: string;
  item_date: string;
  description: string;
  quantity: string;
  amount: string;
}

interface MaterialRow {
  id: string;
  item_date: string;
  description: string;
  quantity: string;
  rate: string;
}

import { usePermissions } from '@/contexts/PermissionContext';

const Jobs = () => {
  const { user, isAdmin } = useAuth();
  const { hasAccess, canEdit, loading: permissionsLoading } = usePermissions();
  const isFinanceUser = user?.email === 'nayomifinance@designasia.biz' || user?.user_metadata?.full_name?.toLowerCase().includes('sujeewa');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { jobs = [], isLoading: jobsLoading } = useJobs();
  const [saving, setSaving] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isQsUnlocked, setIsQsUnlocked] = useState(false);
  const [qsUnlockCode, setQsUnlockCode] = useState('');
  const navigate = useNavigate();

  const handleQsUnlock = (e: React.KeyboardEvent<HTMLInputElement> | { key: string; preventDefault: () => void }) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (qsUnlockCode === 'QS26') {
        setIsQsUnlocked(true);
        setQsUnlockCode('');
        toast({ title: 'Unlocked', description: 'Quotation value field is now unlocked.' });
      } else {
        toast({ title: 'Invalid Code', description: 'The code you entered is incorrect.', variant: 'destructive' });
      }
    }
  };

  useEffect(() => {
    if (user && !permissionsLoading && !hasAccess('jobs')) {
      Alert.error('Access Denied', 'You do not have permission to access Jobs');
      navigate('/dashboard');
    }
  }, [user, permissionsLoading, hasAccess, navigate]);
  const [form, setForm] = useState<JobForm>({
    category: 'DA',
    customer_name: '',
    job_number: '',
    contact_no: '',
    sales_person: '',
    job_description: '',
    start_date: '',
    completion_date: '',
    contractor_name: '',
    note: '',
    status: 'Started',
    labor_cost: '',
    job_date: '',
    quotation_value: '',
    invoice_no: '',
    invoice_amount: '',
    advance: '',
    payment_details: '',
    progress_percentage: '',
  });
  const [editForm, setEditForm] = useState<JobForm>({
    category: 'DA',
    customer_name: '',
    job_number: '',
    contact_no: '',
    sales_person: '',
    job_description: '',
    start_date: '',
    completion_date: '',
    contractor_name: '',
    note: '',
    status: 'Started',
    labor_cost: '',
    job_date: '',
    quotation_value: '',
    invoice_no: '',
    invoice_amount: '',
    advance: '',
    payment_details: '',
    progress_percentage: '',
  });
  const [materials, setMaterials] = useState<MaterialRow[]>([
    { id: crypto.randomUUID(), item_date: '', description: '', quantity: '', rate: '' },
  ]);
  const [labor, setLabor] = useState<LaborRow[]>([
    { id: crypto.randomUUID(), item_date: '', description: '', quantity: '', amount: '' },
  ]);

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = (job: any) => {
    if (job.status === 'Completed' || !job.completion_date) return false;
    const completionDate = new Date(job.completion_date);
    return completionDate < today;
  };

  const startedCount = jobs.filter((j: any) => (j.status || 'Started') === 'Started').length;
  const inProgressCount = jobs.filter((j: any) => j.status === 'In Progress').length;
  const completedCount = jobs.filter((j: any) => j.status === 'Completed').length;
  const overdueCount = jobs.filter((j: any) => isOverdue(j)).length;

  const filteredJobs = statusFilter 
    ? statusFilter === 'Overdue' 
      ? jobs.filter((j: any) => isOverdue(j))
      : jobs.filter((j: any) => (j.status || 'Started') === statusFilter)
    : jobs;

  const renderStatusBadge = (job: any) => {
    if (isOverdue(job)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    const status = job.status || 'Started';
    switch (status) {
      case 'Completed': return <Badge className="bg-green-500 hover:bg-green-600 text-white">Completed</Badge>;
      case 'In Progress': return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">In Progress {job.progress_percentage ? `(${job.progress_percentage}%)` : ''}</Badge>;
      default: return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Started</Badge>;
    }
  };


  const addMaterial = () => {
    setMaterials(prev => [...prev, { id: crypto.randomUUID(), item_date: '', description: '', quantity: '', rate: '' }]);
  };

  const removeMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const updateMaterial = (id: string, field: keyof MaterialRow, value: string) => {
    setMaterials(prev => prev.map(m => (m.id === id ? { ...m, [field]: value } as MaterialRow : m)));
  };

  const addLabor = () => {
    setLabor(prev => [...prev, { id: crypto.randomUUID(), item_date: '', description: '', quantity: '', amount: '' }]);
  };

  const removeLabor = (id: string) => {
    setLabor(prev => prev.filter(m => m.id !== id));
  };

  const updateLabor = (id: string, field: keyof LaborRow, value: string) => {
    setLabor(prev => prev.map(m => (m.id === id ? { ...m, [field]: value } as LaborRow : m)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !canEdit('jobs')) {
      Alert.error('Error', 'You are not authorized to create jobs.');
      return;
    }
    if (!form.customer_name || !form.job_number) {
      Alert.error('Validation', 'Job Description and Job number are required.');
      return;
    }

    setSaving(true);
    try {
      const { data: job, error: jobError } = await supabase
        .from('jobs' as any)
        .insert([
          {
            category: form.category,
            customer_name: form.customer_name,
            job_number: form.job_number,
            contact_no: form.contact_no || null,
            sales_person: form.sales_person || null,
            job_description: form.job_description || null,
            start_date: form.start_date || null,
            completion_date: form.completion_date || null,
            contractor_name: form.contractor_name || null,
            note: form.note || null,
            status: form.status,
            job_date: form.job_date || null,
            quotation_value: form.quotation_value ? parseFloat(form.quotation_value) : null,
            invoice_no: form.invoice_no || null,
            invoice_amount: form.invoice_amount ? parseFloat(form.invoice_amount) : null,
            advance: form.advance ? parseFloat(form.advance) : null,
            payment_details: form.payment_details || null,
            progress_percentage: form.progress_percentage ? parseInt(form.progress_percentage) : 0,
            created_by: user.id,
          },
        ])
        .select('id')
        .single();

      if (jobError) throw jobError;

      Alert.success('Job created.');
      // Reset form
      setForm({
        category: 'DA',
        customer_name: '',
        job_number: '',
        contact_no: '',
        sales_person: '',
        job_description: '',
        start_date: '',
        completion_date: '',
        contractor_name: '',
        note: '',
        status: 'Started',
        labor_cost: '',
        job_date: '',
        quotation_value: '',
        invoice_no: '',
        invoice_amount: '',
        advance: '',
        payment_details: '',
        progress_percentage: '',
      });
      setMaterials([{ id: crypto.randomUUID(), item_date: '', description: '', quantity: '', rate: '' }]);
      setLabor([{ id: crypto.randomUUID(), item_date: '', description: '', quantity: '', amount: '' }]);
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error: any) {
      Alert.error('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (job: any) => {
    setEditingJob(job);
    setEditForm({
      category: job.category || 'DA',
      customer_name: job.customer_name || '',
      job_number: job.job_number || '',
      contact_no: job.contact_no || '',
      sales_person: job.sales_person || '',
      job_description: job.job_description || '',
      start_date: job.start_date || '',
      completion_date: job.completion_date || '',
      contractor_name: job.contractor_name || '',
      note: job.note || '',
      status: job.status || 'Started',
      labor_cost: job.labor_cost?.toString() || '',
      job_date: job.job_date || '',
      quotation_value: job.quotation_value?.toString() || '',
      invoice_no: job.invoice_no || '',
      invoice_amount: job.invoice_amount?.toString() || '',
      advance: job.advance?.toString() || '',
      payment_details: job.payment_details || '',
      progress_percentage: job.progress_percentage?.toString() || '',
    });
    
    if (job.job_materials && job.job_materials.length > 0) {
      setMaterials(job.job_materials.map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        item_date: m.item_date || '',
        description: m.description || '',
        quantity: m.quantity?.toString() || '',
        rate: m.rate?.toString() || ''
      })));
    } else {
      setMaterials([{ id: crypto.randomUUID(), item_date: '', description: '', quantity: '', rate: '' }]);
    }
    
    if (job.job_labor && job.job_labor.length > 0) {
      setLabor(job.job_labor.map((m: any) => ({
        id: m.id || crypto.randomUUID(),
        item_date: m.item_date || '',
        description: m.description || '',
        quantity: m.quantity?.toString() || '',
        amount: m.amount?.toString() || ''
      })));
    } else {
      setLabor([{ id: crypto.randomUUID(), item_date: '', description: '', quantity: '', amount: '' }]);
    }
    setEditDialogOpen(true);
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const isAssigned = editingJob?.tasks?.some((t: any) => t.task_assignees?.some((ta: any) => ta.user_id === user?.id));
    if (!user?.id || (!canEdit('jobs') && !isAssigned) || !editingJob) {
      Alert.error('Error', 'You are not authorized.');
      return;
    }

    setSaving(true);
    try {
      if (canEdit('jobs')) {
        const { error } = await supabase
          .from('jobs' as any)
          .update({
            category: editForm.category,
            customer_name: editForm.customer_name,
            job_number: editForm.job_number,
            contact_no: editForm.contact_no || null,
            sales_person: editForm.sales_person || null,
            job_description: editForm.job_description || null,
            start_date: editForm.start_date || null,
            completion_date: editForm.completion_date || null,
            contractor_name: editForm.contractor_name || null,
            note: editForm.note || null,
            status: editForm.status,
            job_date: editForm.job_date || null,
            quotation_value: editForm.quotation_value ? parseFloat(editForm.quotation_value) : null,
            invoice_no: editForm.invoice_no || null,
            invoice_amount: editForm.invoice_amount ? parseFloat(editForm.invoice_amount) : null,
            advance: editForm.advance ? parseFloat(editForm.advance) : null,
            payment_details: editForm.payment_details || null,
            progress_percentage: editForm.progress_percentage ? parseInt(editForm.progress_percentage) : 0,
          })
          .eq('id', editingJob.id);

        if (error) throw error;
      }

      // Handle materials
      await supabase.from('job_materials' as any).delete().eq('job_id', editingJob.id);
      
      const materialRows = materials
        .filter(m => m.description || m.quantity || m.rate)
        .map(m => ({
          job_id: editingJob.id,
          item_date: m.item_date || null,
          description: m.description || null,
          quantity: m.quantity ? parseFloat(m.quantity) : 0,
          rate: m.rate ? parseFloat(m.rate) : 0,
        }));

      if (materialRows.length > 0) {
        const { error: matError } = await supabase.from('job_materials' as any).insert(materialRows);
        if (matError) throw matError;
      }

      // Handle labor
      await supabase.from('job_labor' as any).delete().eq('job_id', editingJob.id);
      
      const laborRows = labor
        .filter(m => m.description || m.quantity || m.amount)
        .map(m => ({
          job_id: editingJob.id,
          item_date: m.item_date || null,
          description: m.description || null,
          quantity: m.quantity ? parseFloat(m.quantity) : 0,
          amount: m.amount ? parseFloat(m.amount) : 0,
        }));

      if (laborRows.length > 0) {
        const { error: labError } = await supabase.from('job_labor' as any).insert(laborRows);
        if (labError) throw labError;
      }

      Alert.success('Job updated.');
      setEditDialogOpen(false);
      setEditingJob(null);
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error: any) {
      Alert.error('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!canEdit('jobs')) {
      Alert.error('Error', 'You are not authorized to delete jobs.');
      return;
    }

    const confirmed = await Alert.confirm(
      'Delete Job?',
      'Are you sure you want to delete this job? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('jobs' as any)
        .delete()
        .eq('id', jobId);

      if (error) throw error;

      Alert.success('Job deleted.');
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error: any) {
      Alert.error('Error', error.message);
    }
  };

  if (jobsLoading) {
    return (
      <Layout>
        <JobsSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Jobs</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Create a job and automatically generate a task.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-colors hover:bg-slate-50 ${statusFilter === null ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(null)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Started (All Jobs)</CardTitle>
              <Filter className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobs.length}</div>
            </CardContent>
          </Card>
          
          <Card 
            className={`cursor-pointer transition-colors hover:bg-slate-50 ${statusFilter === 'In Progress' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'In Progress' ? null : 'In Progress')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressCount}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors hover:bg-slate-50 ${statusFilter === 'Completed' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Completed' ? null : 'Completed')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors hover:bg-slate-50 ${statusFilter === 'Overdue' ? 'ring-2 ring-destructive' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'Overdue' ? null : 'Overdue')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job Card</CardTitle>
            <CardDescription>Fill in details matching your paper Job Card.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Main Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as JobForm['category'] })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DA">Design Asia (DA)</SelectItem>
                      <SelectItem value="TB">Top Bass (TB)</SelectItem>
                      <SelectItem value="AI">Alusion (AI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Job Number</Label>
                  <Input value={form.job_number} onChange={(e) => setForm({ ...form, job_number: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Job Contact Number</Label>
                  <Input value={form.contact_no} onChange={(e) => setForm({ ...form, contact_no: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Sales Person</Label>
                  <Input value={form.sales_person} onChange={(e) => setForm({ ...form, sales_person: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Job Description</Label>
                  <Textarea rows={2} value={form.job_description} onChange={(e) => setForm({ ...form, job_description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.job_date} onChange={(e) => setForm({ ...form, job_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Completion Date</Label>
                  <Input type="date" value={form.completion_date} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Quotation Value</Label>
                    {!isQsUnlocked && !isFinanceUser && (
                      <div className="flex items-center gap-2">
                        <Input 
                          type="password" 
                          placeholder="Code" 
                          className="h-6 w-20 text-xs px-2"
                          value={qsUnlockCode}
                          onChange={e => setQsUnlockCode(e.target.value)}
                          onKeyDown={handleQsUnlock}
                        />
                        <Button type="button" size="sm" variant="secondary" className="h-6 px-2 text-xs" onClick={() => handleQsUnlock({ key: 'Enter', preventDefault: () => {} } as any)}>Unlock</Button>
                      </div>
                    )}
                  </div>
                  <Input type="number" step="0.01" value={form.quotation_value} onChange={(e) => setForm({ ...form, quotation_value: e.target.value })} disabled={!isQsUnlocked && !isFinanceUser} />
                </div>
                <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-sm text-slate-700">Finance Department</h3>
                    {(form.invoice_no || form.invoice_amount || form.advance) ? (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white">Up to dated</Badge>
                    ) : (
                      !isFinanceUser && <Badge variant="outline" className="text-muted-foreground">Locked</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice No</Label>
                      <Input value={form.invoice_no} onChange={(e) => setForm({ ...form, invoice_no: e.target.value })} disabled={!isFinanceUser} />
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Amount</Label>
                      <Input type="number" step="0.01" value={form.invoice_amount} onChange={(e) => setForm({ ...form, invoice_amount: e.target.value })} disabled={!isFinanceUser} />
                    </div>
                    <div className="space-y-2">
                      <Label>Advance</Label>
                      <Input type="number" step="0.01" value={form.advance} onChange={(e) => setForm({ ...form, advance: e.target.value })} disabled={!isFinanceUser} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as JobForm['status'] })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Started">Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.status === 'In Progress' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Progress Percentage (%)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      placeholder="Enter progress percentage" 
                      value={form.progress_percentage} 
                      onChange={(e) => setForm({ ...form, progress_percentage: e.target.value })} 
                    />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label>Contractor Name / Worker</Label>
                  <Input value={form.contractor_name} onChange={(e) => setForm({ ...form, contractor_name: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Payment Details</Label>
                  <Input value={form.payment_details} onChange={(e) => setForm({ ...form, payment_details: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Note / Remarks</Label>
                  <Textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
              </div>

              <Button type="submit" disabled={saving || !canEdit('jobs')} className="w-full">{saving ? 'Saving...' : 'Create Job'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
            <CardDescription>Select a job when creating a task.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredJobs.length === 0 ? (
              <p className="text-muted-foreground">No jobs found.</p>
            ) : (
              (filteredJobs as any[]).map((j) => {
                const materialCost = (j.job_materials || []).reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);
                const laborCost = (j.job_labor || []).reduce((sum: number, m: any) => sum + Number(m.total_amount || 0), 0);

                return (
                <div key={j.id} className="p-4 border rounded-lg flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-lg">{j.job_number} • {j.customer_name}</p>
                        {renderStatusBadge(j)}
                      </div>
                      <p className="text-sm text-muted-foreground">{j.category} • {j.sales_person || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {j.invoice_no && (
                        <Button variant="outline" size="sm" onClick={() => generateInvoicePDF(j, 'open')} title="Quick View Invoice">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                      {(canEdit('jobs') || (j.tasks?.some((t: any) => t.task_assignees?.some((ta: any) => ta.user_id === user?.id)))) && (
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(j)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {canEdit('jobs') && (
                        <Button variant="outline" size="sm" onClick={() => handleDeleteJob(j.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button onClick={() => navigate(`/tasks?jobId=${j.id}`)} className="flex-1 sm:flex-initial">Create Task</Button>
                    </div>
                  </div>
                  
                  {(() => {
                    const currentStatus = editingJob && editingJob.id === j.id ? editForm.status : j.status;
                    const currentProgress = editingJob && editingJob.id === j.id ? editForm.progress_percentage : j.progress_percentage;
                    
                    if (currentStatus === 'In Progress') {
                      return (
                        <div className="bg-orange-500/10 rounded-md p-4 border border-orange-500/20 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black text-orange-600 dark:text-orange-500">{currentProgress || 0}%</span>
                          <span className="text-sm font-bold text-orange-600/80 dark:text-orange-500/80 uppercase tracking-widest mt-1">Completed</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Cost Breakdown</p>
                    <p className="text-sm font-semibold">Materials: Rs. {materialCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-sm font-semibold">Labour: Rs. {laborCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-lg font-bold text-primary mt-1">Total: Rs. {(materialCost + laborCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              )})
            )}
          </CardContent>
        </Card>

        {/* Edit Job Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Job</DialogTitle>
              <DialogDescription>Update job details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateJob} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Main Category</Label>
                  <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v as JobForm['category'] })} disabled={!isAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DA">Design Asia (DA)</SelectItem>
                      <SelectItem value="TB">Top Bass (TB)</SelectItem>
                      <SelectItem value="AI">Alusion (AI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Job Number</Label>
                  <Input value={editForm.job_number} onChange={(e) => setEditForm({ ...editForm, job_number: e.target.value })} required disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input value={editForm.customer_name} onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} required disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Job Contact Number</Label>
                  <Input value={editForm.contact_no} onChange={(e) => setEditForm({ ...editForm, contact_no: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Sales Person</Label>
                  <Input value={editForm.sales_person} onChange={(e) => setEditForm({ ...editForm, sales_person: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Job Description</Label>
                  <Textarea rows={2} value={editForm.job_description} onChange={(e) => setEditForm({ ...editForm, job_description: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={editForm.job_date} onChange={(e) => setEditForm({ ...editForm, job_date: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Completion Date</Label>
                  <Input type="date" value={editForm.completion_date} onChange={(e) => setEditForm({ ...editForm, completion_date: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Quotation Value</Label>
                    {!isQsUnlocked && !isFinanceUser && (
                      <div className="flex items-center gap-2">
                        <Input 
                          type="password" 
                          placeholder="Code" 
                          className="h-6 w-20 text-xs px-2"
                          value={qsUnlockCode}
                          onChange={e => setQsUnlockCode(e.target.value)}
                          onKeyDown={handleQsUnlock}
                        />
                        <Button type="button" size="sm" variant="secondary" className="h-6 px-2 text-xs" onClick={() => handleQsUnlock({ key: 'Enter', preventDefault: () => {} } as any)}>Unlock</Button>
                      </div>
                    )}
                  </div>
                  <Input type="number" step="0.01" value={editForm.quotation_value} onChange={(e) => setEditForm({ ...editForm, quotation_value: e.target.value })} disabled={!isQsUnlocked && !isFinanceUser && !isAdmin} />
                </div>
                <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-sm text-slate-700">Finance Department</h3>
                    {(editForm.invoice_no || editForm.invoice_amount || editForm.advance) ? (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white">Up to dated</Badge>
                    ) : (
                      !isFinanceUser && <Badge variant="outline" className="text-muted-foreground">Locked</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice No</Label>
                      <Input value={editForm.invoice_no} onChange={(e) => setEditForm({ ...editForm, invoice_no: e.target.value })} disabled={!isFinanceUser} />
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Amount</Label>
                      <Input type="number" step="0.01" value={editForm.invoice_amount} onChange={(e) => setEditForm({ ...editForm, invoice_amount: e.target.value })} disabled={!isFinanceUser} />
                    </div>
                    <div className="space-y-2">
                      <Label>Advance</Label>
                      <Input type="number" step="0.01" value={editForm.advance} onChange={(e) => setEditForm({ ...editForm, advance: e.target.value })} disabled={!isFinanceUser} />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contractor Name</Label>
                  <Input value={editForm.contractor_name} onChange={(e) => setEditForm({ ...editForm, contractor_name: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as JobForm['status'] })} disabled={!isAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Started">Started</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editForm.status === 'In Progress' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Progress Percentage (%)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      placeholder="Enter progress percentage" 
                      value={editForm.progress_percentage} 
                      onChange={(e) => setEditForm({ ...editForm, progress_percentage: e.target.value })} 
                      disabled={!isAdmin} 
                    />
                  </div>
                )}
                <div className="space-y-2 md:col-span-2">
                  <Label>Payment Details</Label>
                  <Input value={editForm.payment_details} onChange={(e) => setEditForm({ ...editForm, payment_details: e.target.value })} disabled={!isAdmin} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Note / Remarks</Label>
                  <Textarea rows={3} value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} disabled={!isAdmin} />
                </div>
              </div>

              <div className="space-y-4 mt-4 border-t pt-4">
                {/* Materials Section */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="font-semibold">Materials Issued</h3>
                    <Button type="button" variant="outline" onClick={addMaterial} className="w-full sm:w-auto">Add Row</Button>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2 px-1">
                    <div className="w-36 flex-shrink-0">Date</div>
                    <div className="flex-1">Description</div>
                    <div className="w-24 flex-shrink-0">Qty</div>
                    <div className="w-28 flex-shrink-0">Rate</div>
                    <div className="w-20 flex-shrink-0 text-center">Action</div>
                  </div>
                  {materials.map((m) => (
                    <div key={m.id} className="flex flex-col sm:flex-row gap-2 p-3 sm:p-0 border sm:border-0 rounded-md sm:rounded-none items-start sm:items-center bg-slate-50 sm:bg-transparent">
                      <Input type="date" className="w-full sm:w-36 flex-shrink-0" value={m.item_date} onChange={(e) => updateMaterial(m.id, 'item_date', e.target.value)} />
                      <Input className="w-full sm:flex-1" value={m.description} onChange={(e) => updateMaterial(m.id, 'description', e.target.value)} placeholder="Description" />
                      <Input type="number" step="0.01" className="w-full sm:w-24 flex-shrink-0" value={m.quantity} onChange={(e) => updateMaterial(m.id, 'quantity', e.target.value)} placeholder="Qty" />
                      <Input type="number" step="0.01" className="w-full sm:w-28 flex-shrink-0" value={m.rate} onChange={(e) => updateMaterial(m.id, 'rate', e.target.value)} placeholder="Rate" />
                      <Button type="button" variant="ghost" onClick={() => removeMaterial(m.id)} className="w-full sm:w-20 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">Remove</Button>
                    </div>
                  ))}
                </div>
                
                <hr className="my-6" />

                {/* Labor Section */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="font-semibold">Labour Cost</h3>
                    <Button type="button" variant="outline" onClick={addLabor} className="w-full sm:w-auto">Add Row</Button>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2 px-1">
                    <div className="w-36 flex-shrink-0">Date</div>
                    <div className="flex-1">Description (Skills)</div>
                    <div className="w-24 flex-shrink-0">Qty</div>
                    <div className="w-28 flex-shrink-0">Amount</div>
                    <div className="w-20 flex-shrink-0 text-center">Action</div>
                  </div>
                  {labor.map((m) => (
                    <div key={m.id} className="flex flex-col sm:flex-row gap-2 p-3 sm:p-0 border sm:border-0 rounded-md sm:rounded-none items-start sm:items-center bg-slate-50 sm:bg-transparent">
                      <Input type="date" className="w-full sm:w-36 flex-shrink-0" value={m.item_date} onChange={(e) => updateLabor(m.id, 'item_date', e.target.value)} />
                      <Input className="w-full sm:flex-1" value={m.description} onChange={(e) => updateLabor(m.id, 'description', e.target.value)} placeholder="Description (Skills)" />
                      <Input type="number" step="0.01" className="w-full sm:w-24 flex-shrink-0" value={m.quantity} onChange={(e) => updateLabor(m.id, 'quantity', e.target.value)} placeholder="Qty" />
                      <Input type="number" step="0.01" className="w-full sm:w-28 flex-shrink-0" value={m.amount} onChange={(e) => updateLabor(m.id, 'amount', e.target.value)} placeholder="Amount" />
                      <Button type="button" variant="ghost" onClick={() => removeLabor(m.id)} className="w-full sm:w-20 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">Remove</Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Updating...' : 'Update Job'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Jobs;


