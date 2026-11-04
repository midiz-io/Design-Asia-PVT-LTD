import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search, 
  UserPlus, 
  UserMinus, 
  ShieldCheck, 
  UserCircle,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Alert from '@/utils/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

import { usePermissions } from '@/contexts/PermissionContext';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role?: string;
}

const AdminTeamManagement = () => {
  const { user, isAdmin } = useAuth();
  const { hasAccess, canEdit, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const [supervisors, setSupervisors] = useState<Profile[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [currentTeamIds, setCurrentTeamIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && !permissionsLoading && !hasAccess('team')) {
      Alert.error('Access Denied', 'You do not have permission to access Team Management');
      navigate('/dashboard');
    }
  }, [user, permissionsLoading, hasAccess, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSupervisorId) {
      fetchCurrentTeam(selectedSupervisorId);
    } else {
      setCurrentTeamIds([]);
    }
  }, [selectedSupervisorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // 2. Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, department');

      if (profilesError) throw profilesError;

      // 3. Merge data and filter by role
      const supervisorsList: Profile[] = [];
      const employeesList: Profile[] = [];

      rolesData.forEach(roleEntry => {
        const profile = profilesData.find(p => p.id === roleEntry.user_id);
        if (profile) {
          const userData: Profile = {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            role: roleEntry.role
          };

          if (roleEntry.role === 'supervisor') {
            supervisorsList.push(userData);
          } else if (roleEntry.role === 'employee') {
            employeesList.push(userData);
          }
        }
      });

      setSupervisors(supervisorsList);
      setEmployees(employeesList);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      Alert.error('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentTeam = async (supervisorId: string) => {
    try {
      const { data, error } = await supabase
        .from('supervisor_employees')
        .select('employee_id')
        .eq('supervisor_id', supervisorId);

      if (error) throw error;
      setCurrentTeamIds(data.map(item => item.employee_id));
    } catch (error: any) {
      console.error('Error fetching team:', error);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    setCurrentTeamIds(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSaveTeam = async () => {
    if (!selectedSupervisorId) {
      Alert.error('Error', 'Please select a supervisor first');
      return;
    }

    setSaving(true);
    try {
      // 1. Delete existing assignments for this supervisor
      const { error: deleteError } = await supabase
        .from('supervisor_employees')
        .delete()
        .eq('supervisor_id', selectedSupervisorId);

      if (deleteError) throw deleteError;

      // 2. Insert new assignments
      if (currentTeamIds.length > 0) {
        const newAssignments = currentTeamIds.map(empId => ({
          supervisor_id: selectedSupervisorId,
          employee_id: empId
        }));

        const { error: insertError } = await supabase
          .from('supervisor_employees')
          .insert(newAssignments);

        if (insertError) throw insertError;
      }

      Alert.success('Team updated successfully');
    } catch (error: any) {
      console.error('Error saving team:', error);
      Alert.error('Error', 'Failed to save team assignments');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group all assignments for the overview
  const [allTeams, setAllTeams] = useState<Record<string, { supervisor: Profile, members: Profile[] }>>({});
  const [loadingTeams, setLoadingTeams] = useState(false);

  const fetchAllTeams = async () => {
    setLoadingTeams(true);
    try {
      const { data, error } = await supabase
        .from('supervisor_employees')
        .select(`
          supervisor_id,
          employee_id
        `);

      if (error) throw error;

      const teamsMap: Record<string, { supervisor: Profile, members: Profile[] }> = {};
      
      data.forEach(item => {
        const sv = supervisors.find(s => s.id === item.supervisor_id);
        const emp = employees.find(e => e.id === item.employee_id);
        
        if (sv && emp) {
          if (!teamsMap[sv.id]) {
            teamsMap[sv.id] = { supervisor: sv, members: [] };
          }
          teamsMap[sv.id].members.push(emp);
        }
      });
      
      setAllTeams(teamsMap);
    } catch (error) {
      console.error('Error fetching all teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (supervisors.length > 0 && employees.length > 0) {
      fetchAllTeams();
    }
  }, [supervisors, employees]);

  if (permissionsLoading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading team management...</p>
        </div>
      </Layout>
    );
  }

  if (!hasAccess('team')) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to access Team Management.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 max-w-6xl mx-auto pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground">Assign employees to supervisors and monitor team structures.</p>
          </div>
          <Button 
            onClick={async () => {
              await handleSaveTeam();
              fetchAllTeams(); // Refresh overview after save
            }} 
            disabled={saving || !selectedSupervisorId || !canEdit('team')}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Save Team Assignments
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Supervisor Selection */}
          <Card className="lg:col-span-4 shadow-xl border-muted/40 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary" />
                Select Supervisor
              </CardTitle>
              <CardDescription>Choose a supervisor to manage their team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Supervisor</Label>
                <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
                  <SelectTrigger className="w-full h-12 bg-background border-muted/60 focus:ring-primary/20">
                    <SelectValue placeholder="Select a supervisor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map(sv => (
                      <SelectItem key={sv.id} value={sv.id}>
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4 text-muted-foreground" />
                          <span>{sv.full_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSupervisorId && (
                <div className="pt-6 border-t border-dashed mt-4">
                  <div className="flex items-center justify-between text-sm mb-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
                    <span className="font-medium">Current Team Size</span>
                    <Badge className="bg-primary hover:bg-primary/90">{currentTeamIds.length} Members</Badge>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-xl border border-muted-foreground/10">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Select or deselect employees from the list on the right. Changes will be saved to the database when you click the save button.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee Multi-selection */}
          <Card className="lg:col-span-8 shadow-xl border-muted/40 overflow-hidden">
            <CardHeader className="pb-3 bg-muted/5">
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Assign Employees
              </CardTitle>
              <CardDescription>Select employees to assign to the selected supervisor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search employees by name or email..." 
                  className="pl-10 h-12 bg-muted/20 border-transparent focus:bg-background focus:border-primary/40 transition-all rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <ScrollArea className="h-[450px] pr-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-[300px] space-y-4 py-20">
                    <div className="relative">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <Users className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading directory...</p>
                  </div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-20 bg-muted/10 rounded-2xl border-2 border-dashed border-muted-foreground/20">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No employees found matching your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                    {filteredEmployees.map((emp) => {
                      const isSelected = currentTeamIds.includes(emp.id);
                      return (
                        <div 
                          key={emp.id}
                          className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-primary/5 border-primary/30 shadow-md shadow-primary/5' 
                              : 'border-muted bg-card hover:border-primary/20 hover:bg-muted/30'
                          }`}
                          onClick={() => toggleEmployee(emp.id)}
                        >
                          <div className="flex items-center gap-4">
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleEmployee(emp.id)}
                              className="w-5 h-5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 transition-colors'
                              }`}>
                                {emp.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm leading-tight truncate">{emp.full_name}</span>
                                <span className="text-[11px] text-muted-foreground truncate">{emp.email}</span>
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="p-1.5 bg-primary/10 rounded-full text-primary">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Teams Overview / History */}
        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Teams Overview
              </h2>
              <p className="text-sm text-muted-foreground text-slate-500">Current team structures across the organization.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAllTeams} disabled={loadingTeams}>
              {loadingTeams ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Refresh List
            </Button>
          </div>

          {loadingTeams && Object.keys(allTeams).length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-[200px] rounded-3xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : Object.keys(allTeams).length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed border-slate-300">
              <Users className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-muted-foreground">No teams defined yet</h3>
              <p className="text-sm text-muted-foreground">Use the assignment tool above to create your first team.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(allTeams).map((team) => (
                <Card key={team.supervisor.id} className="shadow-lg border-muted hover:shadow-xl transition-all duration-300 rounded-3xl group overflow-hidden">
                  <div className="h-2 bg-primary/80" />
                  <CardHeader className="pb-3 bg-gradient-to-b from-primary/5 to-transparent">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground font-black text-lg">
                          {team.supervisor.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg leading-tight">{team.supervisor.full_name}</CardTitle>
                          <CardDescription className="text-xs">Supervisor</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-white shadow-sm border px-3">
                        {team.members.length} Members
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <ScrollArea className="h-[120px] pr-2">
                      <div className="space-y-2">
                        {team.members.map(member => (
                          <div key={member.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-muted/40 transition-colors">
                            <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold">
                              {member.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{member.full_name}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="mt-4 pt-3 border-t flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground font-mono">ID: {team.supervisor.id.split('-')[0]}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-8 text-primary hover:text-primary hover:bg-primary/5"
                        onClick={() => setSelectedSupervisorId(team.supervisor.id)}
                      >
                        Edit Team
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdminTeamManagement;
