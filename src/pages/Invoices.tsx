import React, { useState, useMemo, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, FileText, Download, Plus, MessageSquare, Send, ChevronDown, Check } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useJobs } from '@/hooks/useJobs';
import { usePermissions } from '@/contexts/PermissionContext';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';
import { format } from "date-fns";
import { useAuth } from '@/contexts/AuthContext';
import Alert from '@/utils/alert';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { sendTaskCommentNotification } from '@/utils/whatsapp';

interface SearchableSelectOption {
  value: string;
  label: React.ReactNode;
  searchString: string;
}

interface SearchableSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

const SearchableSelect = ({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found."
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between text-left font-normal border border-input bg-background hover:bg-accent hover:text-accent-foreground"
        >
          <span className="truncate font-medium text-foreground">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[250px] overflow-y-auto">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options
                .filter((opt) => {
                  if (!search) return true;
                  return opt.searchString.toLowerCase().includes(search.toLowerCase());
                })
                .map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.value}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="cursor-pointer font-medium text-foreground"
                  >
                    {opt.label}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const Invoices = () => {
  const { jobs = [], isLoading } = useJobs();
  const [searchTerm, setSearchTerm] = useState('');
  const { hasAccess, loading: permissionsLoading } = usePermissions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatJob, setChatJob] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [mentionState, setMentionState] = useState<{ query: string; start: number; end: number; } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatSearchTerm, setChatSearchTerm] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }
  }, [comments, chatOpen]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email, phone');
      if (data) setProfiles(data);
    };
    fetchProfiles();
  }, []);

  const fetchComments = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles!chat_messages_sender_id_fkey(full_name, avatar_url)')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching comments, maybe job_id column is missing:', error);
      }
      if (data) setComments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const openChat = (job: any) => {
    setChatJob(job);
    setChatOpen(true);
    fetchComments(job.id);
  };

  const getMentionSuggestions = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return profiles.slice(0, 10);
    return profiles.filter(p => p.full_name?.toLowerCase().includes(normalizedQuery) || p.email?.toLowerCase().includes(normalizedQuery)).slice(0, 10);
  };

  const updateMentionState = (value: string, cursorPosition: number) => {
    const beforeCursor = value.slice(0, cursorPosition);
    const mentionMatch = beforeCursor.match(/@([\w\s.\-]*)$/);

    if (mentionMatch) {
      setMentionState({
        query: mentionMatch[1] || '',
        start: cursorPosition - mentionMatch[0].length,
        end: cursorPosition,
      });
    } else {
      setMentionState(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewComment(value);
    updateMentionState(value, e.target.selectionStart ?? value.length);
  };

  const handleInputKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Backspace') {
       updateMentionState(newComment, e.currentTarget.selectionStart ?? newComment.length);
    }
  };

  const handleMentionSelect = (profile: any) => {
    const mention = `@${profile.full_name}`;
    if (!mentionState) return;

    const nextValue = newComment.slice(0, mentionState.start) + `${mention} ` + newComment.slice(mentionState.end);
    setNewComment(nextValue);
    setMentionState(null);
    
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const cursor = mentionState.start + mention.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(cursor, cursor);
      }
    });
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !chatJob) return;
    setIsSendingComment(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        message: newComment,
        sender_id: user?.id,
        job_id: chatJob.id
      });
      if (error) {
        Alert.error('Error', 'Could not save comment. Make sure the database migration for job_id was applied.');
        throw error;
      }
      
      // Parse mentions
      const mentionRegex = /@([A-Za-z0-9_.\-\s]+)/g;
      const matches = Array.from(newComment.matchAll(mentionRegex));
      for (const match of matches) {
        const mentionName = match[1]?.trim().toLowerCase();
        const profile = profiles.find(p => p.full_name?.toLowerCase().includes(mentionName));
        if (profile && profile.phone) {
          await sendTaskCommentNotification({
            recipientName: profile.full_name,
            recipientPhone: profile.phone,
            commenterName: user?.user_metadata?.full_name || 'System',
            taskTitle: `Invoice ${chatJob.invoice_no}`,
            comment: newComment,
            taskLink: window.location.href,
            isMention: true
          });
        }
      }
      
      setNewComment('');
      fetchComments(chatJob.id);
      Alert.success('Success', 'Message successfully sent!');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSendingComment(false);
    }
  };

  useEffect(() => {
    if (user && location.pathname !== '/auth' && !permissionsLoading && !hasAccess('invoices')) {
      Alert.error('Access Denied', 'You do not have permission to access Invoices');
      navigate('/dashboard');
    }
  }, [user, location.pathname, permissionsLoading, hasAccess, navigate]);

  const invoicesData = useMemo(() => {
    return jobs
      .filter((job: any) => job.invoice_no) // Only jobs with invoices
      .map((job: any) => {
        return {
          id: job.id,
          job_number: job.job_number,
          invoice_no: job.invoice_no,
          date: job.job_date ? format(new Date(job.job_date), 'dd/MM/yyyy') : format(new Date(job.created_at), 'dd/MM/yyyy'),
          customer_name: job.customer_name,
          category: job.category,
          amount: job.invoice_amount ? `Rs. ${Number(job.invoice_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Rs. 0.00',
          original_job: job
        };
      })
      .filter((item: any) => 
        item.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.job_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [jobs, searchTerm]);

  const jobsWithoutInvoices = useMemo(() => {
    return jobs.filter((job: any) => !job.invoice_no);
  }, [jobs]);

  const filteredComments = useMemo(() => {
    return comments.filter(c => 
      c.message.toLowerCase().includes(chatSearchTerm.toLowerCase()) || 
      (c.sender?.full_name || '').toLowerCase().includes(chatSearchTerm.toLowerCase())
    );
  }, [comments, chatSearchTerm]);

  const handleCreateInvoice = async () => {
    if (!selectedJobId || !invoiceNo || !invoiceAmount) {
      Alert.error('Missing fields', 'Please select a job, enter an invoice number, and specify the amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('jobs' as any)
        .update({
          invoice_no: invoiceNo,
          invoice_amount: Number(invoiceAmount)
        })
        .eq('id', selectedJobId);

      if (error) throw error;

      Alert.success('Success', 'Invoice created successfully');
      setCreateInvoiceOpen(false);
      setSelectedJobId('');
      setInvoiceNo('');
      setInvoiceAmount('');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      Alert.error('Error', error.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (permissionsLoading) {
    return (
      <Layout>
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!hasAccess('invoices')) return null;

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-xl border border-border/50 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">Invoices</h1>
            <p className="text-muted-foreground mt-1">
              Manage and view system generated invoices.
            </p>
          </div>
          {hasAccess('invoices') && (
            <Button onClick={() => setCreateInvoiceOpen(true)} className="w-full sm:w-auto shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>

        <Card className="border-border/50 shadow-md overflow-hidden rounded-xl">
          <CardHeader className="bg-slate-50/50 border-b border-border/50 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-xl">Invoice Directory</CardTitle>
                <CardDescription>View and download standard PDF invoices.</CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  className="pl-9 bg-white shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100/80 sticky top-0">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold text-slate-700">Date</TableHead>
                    <TableHead className="font-semibold text-slate-700">Invoice No</TableHead>
                    <TableHead className="font-semibold text-slate-700">Job No</TableHead>
                    <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                    <TableHead className="font-semibold text-slate-700">Category</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                          <p>Fetching invoices...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : invoicesData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        No invoices found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoicesData.map((row: any) => (
                      <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-600 whitespace-nowrap">{row.date}</TableCell>
                        <TableCell className="font-bold text-primary whitespace-nowrap">{row.invoice_no}</TableCell>
                        <TableCell className="whitespace-nowrap">{row.job_number}</TableCell>
                        <TableCell className="whitespace-pre-wrap text-sm text-slate-600">{row.customer_name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline">{row.category}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium text-right text-emerald-600">{row.amount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openChat(row.original_job)}>
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Chat
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => generateInvoicePDF(row.original_job, 'open')}>
                              <FileText className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button variant="default" size="sm" onClick={() => generateInvoicePDF(row.original_job, 'save')}>
                              <Download className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>
                Assign an invoice number and amount to an existing job.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="job-select">Select Job</Label>
                <SearchableSelect 
                  id="job-select"
                  value={selectedJobId}
                  onValueChange={setSelectedJobId}
                  options={jobsWithoutInvoices.map((job: any) => ({
                    value: job.id,
                    label: `${job.job_number} - ${job.customer_name}`,
                    searchString: `${job.job_number} ${job.customer_name}`
                  }))}
                  placeholder="Select a job..."
                  searchPlaceholder="Search jobs..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-no">Invoice Number</Label>
                <Input
                  id="invoice-no"
                  placeholder="e.g. INV-001"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-amount">Invoice Amount (Rs.)</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  placeholder="0.00"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateInvoiceOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Chat Dialog */}
        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
          <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
            <DialogHeader>
              <DialogTitle>Invoice Chat: {chatJob?.invoice_no}</DialogTitle>
              <DialogDescription>
                Tag colleagues with @ to send them a WhatsApp notification.
              </DialogDescription>
            </DialogHeader>

            <div className="px-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  className="pl-9 bg-white"
                  value={chatSearchTerm}
                  onChange={(e) => setChatSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 border rounded-md bg-slate-50">
              {filteredComments.length === 0 ? (
                <p className="text-muted-foreground text-center text-sm mt-10">
                  {chatSearchTerm ? "No matching comments found." : "No comments yet."}
                </p>
              ) : (
                filteredComments.map(c => (
                  <div key={c.id} className={`flex flex-col ${c.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2 rounded-lg max-w-[80%] ${c.sender_id === user?.id ? 'bg-primary text-primary-foreground' : 'bg-white border'}`}>
                      <p className="text-xs font-semibold mb-1 opacity-75">{c.sender?.full_name || 'User'}</p>
                      <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <DialogFooter className="mt-4 sm:justify-between items-end relative">
              <div className="flex w-full items-center space-x-2 relative">
                {mentionState && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 rounded-md border bg-background shadow-sm text-sm z-50">
                    {getMentionSuggestions(mentionState.query).length === 0 ? (
                      <p className="px-3 py-2 text-muted-foreground">No matching users</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto">
                        {getMentionSuggestions(mentionState.query).map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted/70 focus:bg-muted/70 focus:outline-none"
                            onClick={() => handleMentionSelect(profile)}
                          >
                            <div className="font-medium text-foreground">{profile.full_name}</div>
                            <div className="text-xs text-muted-foreground">{profile.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <Input
                  ref={inputRef}
                  placeholder="Type a message... Use @ to tag"
                  value={newComment}
                  onChange={handleInputChange}
                  onKeyUp={handleInputKeyUp}
                  onKeyDown={(e) => {
                     if (e.key === 'Escape' && mentionState) {
                       setMentionState(null);
                       e.stopPropagation();
                     } else if (e.key === 'Enter') {
                       handleSendComment();
                     }
                  }}
                />
                <Button size="icon" disabled={isSendingComment || !newComment.trim()} onClick={handleSendComment}>
                  {isSendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Invoices;
