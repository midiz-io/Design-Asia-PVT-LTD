import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, Clock, Inbox, MessageSquare, AlertTriangle, ShieldCheck, Play, Bell, ArrowLeft } from "lucide-react";

interface Ticket {
  id: string;
  profile_id: string;
  issue_type: string;
  description: string;
  status: string;
  admin_reply: string | null;
  estimated_duration: string | null;
  created_at: string;
  updated_at: string;
  helpdesk_profiles?: {
    name: string;
  };
}

export default function HelpdeskAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminReply, setAdminReply] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [resolveStatus, setResolveStatus] = useState("pending");
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const profilesMapRef = useRef(profilesMap);
  useEffect(() => {
    profilesMapRef.current = profilesMap;
  }, [profilesMap]);

  // Synthesize a beautiful dual-tone "ting tiling" notification sound
  const playBellSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // First tone (ting) - B5 (987.77 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(987.77, ctx.currentTime);
      gain1.gain.setValueAtTime(0.25, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.3);

      // Second tone (tiling) - E6 (1318.51 Hz) - slightly delayed
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1318.51, ctx.currentTime);
        gain2.gain.setValueAtTime(0.25, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.5);
      }, 120);
    } catch (e) {
      console.warn("Failed to play bell sound:", e);
    }
  };

  // Fetch all profiles to build name mapping
  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("helpdesk_profiles" as any)
      .select("id, name");

    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p: any) => {
        map[p.id] = p.name;
      });
      setProfilesMap(map);
    }
  };

  // Fetch all tickets
  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("helpdesk_tickets" as any)
      .select(`
        *,
        helpdesk_profiles (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching complaints",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setTickets(data as Ticket[]);
    }
    setLoading(false);
  };

  // Initialize data and real-time subscription
  useEffect(() => {
    fetchProfiles().then(() => {
      fetchTickets();
    });

    // Real-time subscription to ticket changes
    const channel = supabase
      .channel("helpdesk-admin-channel")
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "helpdesk_tickets",
        },
        async (payload: any) => {
          if (payload.eventType === "INSERT") {
            const newTicket = payload.new as Ticket;
            
            // Check if profile is in map, fetch if not
            let submitterName = profilesMapRef.current[newTicket.profile_id] || "Unknown User";
            if (!profilesMapRef.current[newTicket.profile_id]) {
              const { data: profData } = await supabase
                .from("helpdesk_profiles" as any)
                .select("name")
                .eq("id", newTicket.profile_id)
                .maybeSingle();
              if (profData) {
                submitterName = profData.name;
                setProfilesMap((prev) => ({ ...prev, [newTicket.profile_id]: profData.name }));
              }
            }

            // Append joined profile details
            newTicket.helpdesk_profiles = { name: submitterName };

            setTickets((prev) => [newTicket, ...prev]);
            
            // Play notification bell sound and show alert toast
            playBellSound();
            toast({
              title: "🔔 New Issue Reported",
              description: `${submitterName} reported a new ${newTicket.issue_type}.`,
            });

          } else if (payload.eventType === "UPDATE") {
            const updatedTicket = payload.new as Ticket;
            
            setTickets((prev) =>
              prev.map((t) => {
                if (t.id === updatedTicket.id) {
                  // Keep existing profile information
                  return { ...t, ...updatedTicket };
                }
                return t;
              })
            );
            toast({
              title: "Ticket Action Updated",
              description: `Ticket status resolved/updated.`,
            });
          } else if (payload.eventType === "DELETE") {
            setTickets((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Compute metrics
  const totalCount = tickets.length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;
  const pendingCount = totalCount - resolvedCount;

  // Open Reply Modal
  const openReplyModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setAdminReply(ticket.admin_reply || "");
    setEstimatedDuration(ticket.estimated_duration || "");
    setResolveStatus(ticket.status);
    setDialogOpen(true);
  };

  // Submit developer resolution reply
  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setSubmitting(true);
    const { error } = await supabase
      .from("helpdesk_tickets" as any)
      .update({
        admin_reply: adminReply.trim() || null,
        estimated_duration: estimatedDuration.trim() || null,
        status: resolveStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedTicket.id);

    if (error) {
      toast({
        title: "Failed to update ticket",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDialogOpen(false);
      setSelectedTicket(null);
      toast({
        title: "Ticket Updated",
        description: "Your response has been saved and synced to the client in real-time.",
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6 md:p-10 antialiased flex flex-col">
      <div className="max-w-7xl w-full mx-auto space-y-8 flex-1">
        {/* Header Ribbon */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#21262d] pb-6 gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-[#58a6ff]" />
              Helpdesk Developer Control Center
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Monitor incoming complaints and report issue resolutions in real-time.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard">
              <Button className="bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <Button
              onClick={playBellSound}
              variant="outline"
              className="bg-[#21262d] hover:bg-[#30363d] text-gray-300 border-[#30363d] font-bold"
            >
              <Bell className="h-4 w-4 mr-2" />
              Test Bell
            </Button>
            <Button
              onClick={fetchTickets}
              className="bg-[#21262d] hover:bg-[#30363d] text-white border-[#30363d] font-bold"
            >
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Metrics Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#161b22] border-[#30363d] text-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-sm font-semibold text-gray-400">Total Reports</span>
              <Inbox className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold">{totalCount}</div>
              <p className="text-xs text-gray-500 mt-1">Complaints reported since launch</p>
            </CardContent>
          </Card>

          <Card className="bg-[#161b22] border-[#30363d] text-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-sm font-semibold text-gray-400">Pending Review</span>
              <AlertTriangle className="h-5 w-5 text-[#d29922]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-[#d29922]">{pendingCount}</div>
              <p className="text-xs text-gray-500 mt-1">Awaiting developer resolution</p>
            </CardContent>
          </Card>

          <Card className="bg-[#161b22] border-[#30363d] text-white shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-sm font-semibold text-gray-400">Sorted Out / Resolved</span>
              <CheckCircle2 className="h-5 w-5 text-[#3fb950]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-[#3fb950]">{resolvedCount}</div>
              <p className="text-xs text-gray-500 mt-1">Successfully solved and closed issues</p>
            </CardContent>
          </Card>
        </div>

        {/* Complaints Table */}
        <Card className="bg-[#161b22] border-[#30363d] text-white shadow-lg">
          <CardHeader>
            <CardTitle>Bug Reports & Support Tickets</CardTitle>
            <CardDescription className="text-gray-400">
              Listen to realtime issues. When a user submits an issue, a sound alert will trigger automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mx-auto mb-4"></div>
                Loading complaints database...
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <AlertCircle className="h-10 w-10 text-gray-500 mx-auto" />
                <p className="font-semibold text-lg">No active support requests</p>
                <p className="text-sm text-gray-500">Realtime channels are active. Waiting for issues...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#0d1117] border-b border-[#30363d]">
                    <TableRow className="hover:bg-transparent border-[#30363d]">
                      <TableHead className="text-gray-300 font-bold">Submitter</TableHead>
                      <TableHead className="text-gray-300 font-bold">Category</TableHead>
                      <TableHead className="text-gray-300 font-bold max-w-xs">Description</TableHead>
                      <TableHead className="text-gray-300 font-bold">Status</TableHead>
                      <TableHead className="text-gray-300 font-bold">Est. Duration</TableHead>
                      <TableHead className="text-gray-300 font-bold">Reported Time</TableHead>
                      <TableHead className="text-gray-300 font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id} className="border-[#30363d] hover:bg-[#1f242c]/50 transition-colors">
                        <TableCell className="font-bold text-white">
                          {ticket.helpdesk_profiles?.name || "Unknown User"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-[#0d1117] border-[#30363d] text-[#58a6ff] font-semibold">
                            {ticket.issue_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={ticket.description}>
                          {ticket.description}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              ticket.status === "resolved"
                                ? "bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30"
                                : "bg-[#d29922]/20 text-[#d29922] border border-[#d29922]/30"
                            }
                          >
                            {ticket.status === "resolved" ? "Resolved" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-[#58a6ff]">
                          {ticket.estimated_duration ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ticket.estimated_duration}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-normal">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-gray-400">
                          {new Date(ticket.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openReplyModal(ticket)}
                            className="bg-[#1f6feb] hover:bg-[#388bfd] text-white font-bold"
                          >
                            <MessageSquare className="h-3.5 w-3.5 mr-1" />
                            Resolve / Reply
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reply / Resolution Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#161b22] border-[#30363d] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#58a6ff]" />
              Ticket Resolution Panel
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Update ticket resolution details. Changes sync instantly to the user's dashboard.
            </DialogDescription>
          </DialogHeader>

          {selectedTicket && (
            <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-xl text-xs space-y-1 mb-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Submitter:</span>
                <span className="font-bold text-white">{selectedTicket.helpdesk_profiles?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Category:</span>
                <span className="font-bold text-[#58a6ff]">{selectedTicket.issue_type}</span>
              </div>
              <div className="pt-2 border-t border-[#30363d]/50">
                <span className="text-gray-400 block mb-1">Issue Description:</span>
                <p className="text-gray-300 font-medium whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {selectedTicket.description}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleResolve}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="reply" className="text-gray-300 font-semibold">Admin / Developer Reply</Label>
                <Textarea
                  id="reply"
                  placeholder="Explain the solution or next steps for the user..."
                  rows={4}
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  className="bg-[#0d1117] border-[#30363d] text-white placeholder-gray-500 focus:ring-[#58a6ff] focus:border-[#58a6ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-gray-300 font-semibold">Estimated Fix Time</Label>
                  <Input
                    id="duration"
                    placeholder="e.g. 2 hours, 3 days"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    className="bg-[#0d1117] border-[#30363d] text-white placeholder-gray-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-gray-300 font-semibold">Ticket Status</Label>
                  <select
                    id="status"
                    value={resolveStatus}
                    onChange={(e) => setResolveStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="pending" className="bg-[#161b22]">Pending review</option>
                    <option value="resolved" className="bg-[#161b22]">Resolved / Sorted out</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="bg-[#21262d] hover:bg-[#30363d] border-[#30363d] text-gray-300 font-bold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#238636] hover:bg-[#2ea043] text-white font-bold">
                {submitting ? "Saving..." : "Save Resolution"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
