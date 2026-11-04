import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, CheckCircle2, Clock, LogOut, MessageSquare, AlertTriangle, ShieldAlert, ArrowLeft } from "lucide-react";

interface Profile {
  id: string;
  name: string;
}

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
}

export default function Helpdesk() {
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [issueType, setIssueType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const { toast } = useToast();

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem("helpdesk_profile");
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        localStorage.removeItem("helpdesk_profile");
      }
    }
    setLoadingProfile(false);
  }, []);

  // Fetch tickets & setup realtime subscription when profile is loaded
  useEffect(() => {
    if (!profile) {
      setTickets([]);
      return;
    }

    const fetchTickets = async () => {
      setLoadingTickets(true);
      const { data, error } = await supabase
        .from("helpdesk_tickets" as any)
        .select("*")
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error fetching tickets",
          description: error.message,
          variant: "destructive",
        });
      } else if (data) {
        setTickets(data as Ticket[]);
      }
      setLoadingTickets(false);
    };

    fetchTickets();

    // Subscribe to realtime updates for this profile's tickets
    const channel = supabase
      .channel(`helpdesk-tickets-${profile.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "helpdesk_tickets",
          filter: `profile_id=eq.${profile.id}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setTickets((prev) => [payload.new as Ticket, ...prev]);
            toast({
              title: "Ticket Submitted",
              description: "Your new issue was successfully created.",
            });
          } else if (payload.eventType === "UPDATE") {
            setTickets((prev) =>
              prev.map((t) => (t.id === payload.new.id ? (payload.new as Ticket) : t))
            );
            toast({
              title: "Ticket Updated",
              description: `Ticket status is now: ${payload.new.status}`,
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
  }, [profile, toast]);

  // Handle name submission to access portal
  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    // Find or create profile
    let { data, error } = await supabase
      .from("helpdesk_profiles" as any)
      .select("*")
      .eq("name", name.trim())
      .maybeSingle();

    if (error) {
      toast({
        title: "Access Error",
        description: error.message,
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    if (!data) {
      // Create new profile
      const { data: newProfile, error: createError } = await supabase
        .from("helpdesk_profiles" as any)
        .insert({ name: name.trim() })
        .select()
        .single();

      if (createError) {
        toast({
          title: "Registration Error",
          description: createError.message,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      data = newProfile;
    }

    if (data) {
      const userProfile = data as Profile;
      setProfile(userProfile);
      localStorage.setItem("helpdesk_profile", JSON.stringify(userProfile));
      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${userProfile.name}.`,
      });
    }
    setSubmitting(false);
  };

  // Submit issue ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !issueType || !description.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from("helpdesk_tickets" as any).insert({
      profile_id: profile.id,
      issue_type: issueType,
      description: description.trim(),
      status: "pending",
    });

    if (error) {
      toast({
        title: "Failed to submit ticket",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDescription("");
      setIssueType("");
    }
    setSubmitting(false);
  };

  // Logout/Reset profile
  const handleLogout = () => {
    localStorage.removeItem("helpdesk_profile");
    setProfile(null);
    setName("");
    toast({
      title: "Logged Out",
      description: "You have switched off from the portal.",
    });
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col antialiased">
      {/* Landscape Header Banner */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden border-b border-[#21262d]">
        <img
          src="https://scand.com/wp-content/uploads/2023/02/body_2_Requirements_Preparation.jpg"
          alt="Requirements & Preparation Banner"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-black/50" />
        <div className="absolute top-4 right-4 z-10">
          <Link to="/dashboard">
            <Button className="bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] font-bold text-xs md:text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <div className="absolute bottom-4 left-6 md:left-12">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-[#58a6ff]">
            Helpdesk & Bug Report Portal
          </h1>
          <p className="text-gray-400 text-sm md:text-base mt-1 font-medium">
            Register and report daily, weekly, or monthly system errors & bugs.
          </p>
        </div>
      </div>

      {!profile ? (
        // Login Name Form
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md bg-[#161b22] border-[#30363d] text-white shadow-2xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center font-bold">Access Portal</CardTitle>
              <CardDescription className="text-center text-gray-400">
                Please enter your name to view or submit bug reports.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAccess}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-300 font-semibold">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name (e.g. John Doe)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-[#0d1117] border-[#30363d] text-white placeholder-gray-500 focus:ring-[#58a6ff] focus:border-[#58a6ff]"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={submitting} className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-bold">
                  {submitting ? "Signing in..." : "Enter Portal"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      ) : (
        // Main Portal Workspace
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Header Dashboard Action */}
          <div className="col-span-12 flex flex-col md:flex-row md:items-center justify-between bg-[#161b22] border border-[#30363d] rounded-xl p-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#1f6feb]/20 flex items-center justify-center text-[#58a6ff] font-bold text-lg">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-lg">Welcome, {profile.name}</h2>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="bg-[#21262d] hover:bg-[#30363d] text-red-400 hover:text-red-300 border-[#30363d] font-bold"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Switch User
            </Button>
          </div>

          {/* Left Column: Create ticket */}
          <div className="lg:col-span-5">
            <Card className="bg-[#161b22] border-[#30363d] text-white shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[#58a6ff]" />
                  Report a New Issue
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Fill in the details below to notify our developers.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleSubmitTicket}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="issueType" className="text-gray-300 font-semibold">Issue Category</Label>
                    <Select value={issueType} onValueChange={setIssueType} required>
                      <SelectTrigger className="bg-[#0d1117] border-[#30363d] text-white">
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                        <SelectItem value="Bug">System Bug / Glitch</SelectItem>
                        <SelectItem value="Login Failure">Login / Authentication Failure</SelectItem>
                        <SelectItem value="Error">General System Error</SelectItem>
                        <SelectItem value="Other">Other Issues</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300 font-semibold">Detailed Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Explain what went wrong, including steps to reproduce if possible."
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      className="bg-[#0d1117] border-[#30363d] text-white placeholder-gray-500 focus:ring-[#58a6ff] focus:border-[#58a6ff]"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={submitting} className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-bold">
                    {submitting ? "Submitting..." : "Report Issue"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Right Column: Ticket history list */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5 text-[#58a6ff]" />
              Your Ticket History
            </h3>

            {loadingTickets ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-3 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-4 bg-[#30363d] rounded w-24" />
                      <div className="h-4 bg-[#30363d] rounded w-16" />
                    </div>
                    <div className="h-4 bg-[#30363d] rounded w-full" />
                    <div className="h-4 bg-[#30363d] rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <Card className="bg-[#161b22] border-[#30363d] text-white py-12 text-center">
                <CardContent className="space-y-3">
                  <AlertCircle className="h-12 w-12 text-gray-500 mx-auto" />
                  <p className="text-lg font-medium text-gray-300">No reported issues found</p>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto">
                    If you encounter any bugs, errors, or login issues, report them using the form on the left.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="bg-[#161b22] border-[#30363d] text-white shadow-md hover:border-[#444c56] transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-xs text-gray-400 font-mono">ID: {ticket.id.slice(0, 8)}...</span>
                          <h4 className="font-bold text-lg text-white flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#58a6ff]" />
                            {ticket.issue_type}
                          </h4>
                        </div>
                        <Badge
                          className={
                            ticket.status === "resolved"
                              ? "bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30"
                              : "bg-[#d29922]/20 text-[#d29922] border border-[#d29922]/30"
                          }
                        >
                          {ticket.status === "resolved" ? "Resolved" : "Pending"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-4">
                      <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {ticket.description}
                      </p>

                      {/* Developer Estimation Section */}
                      {ticket.estimated_duration && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#58a6ff] bg-[#1f6feb]/10 px-3 py-2 rounded-lg border border-[#1f6feb]/20 w-fit">
                          <Clock className="h-4 w-4" />
                          <span>Fix Estimated Duration: {ticket.estimated_duration}</span>
                        </div>
                      )}

                      {/* Admin Reply Box */}
                      {ticket.admin_reply ? (
                        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#58a6ff]">
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Developer Reply:</span>
                            {ticket.status === "resolved" && (
                              <span className="flex items-center gap-1 text-[#3fb950] ml-auto">
                                <CheckCircle2 className="h-3 w-3" />
                                Sorted Out
                              </span>
                            )}
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {ticket.admin_reply}
                          </p>
                        </div>
                      ) : (
                        ticket.status === "pending" && (
                          <div className="flex items-center gap-2 text-xs text-gray-400 italic bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-lg">
                            <AlertTriangle className="h-3.5 w-3.5 text-[#d29922]" />
                            <span>Pending review from developer team...</span>
                          </div>
                        )
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 pb-3 border-t border-[#30363d]/50 flex justify-between items-center text-xs text-gray-400">
                      <span>Reported on: {new Date(ticket.created_at).toLocaleString()}</span>
                      <span>Last updated: {new Date(ticket.updated_at).toLocaleTimeString()}</span>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
