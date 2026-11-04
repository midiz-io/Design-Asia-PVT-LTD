import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, UserPlus, UserMinus, Search, Loader2 } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  department?: string;
  avatar_url?: string;
}

import { usePermissions } from '@/contexts/PermissionContext';

const TeamManagement = () => {
  const { user, isSupervisor, isAdmin } = useAuth();
  const { hasAccess, canEdit, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!permissionsLoading && !hasAccess('team')) {
      Alert.error('Access Denied', 'You do not have permission to access Team Management');
      navigate('/dashboard');
      return;
    }

    fetchTeamData();
  }, [user, permissionsLoading, hasAccess, navigate]);

  const fetchTeamData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch current team members
      const { data: teamData, error: teamError } = await supabase
        .from('supervisor_employees')
        .select('employee_id')
        .eq('supervisor_id', user?.id);

      if (teamError) throw teamError;

      const memberIds = teamData?.map(m => m.employee_id) || [];

      // 2. Fetch profiles for those members
      if (memberIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', memberIds);

        if (profileError) throw profileError;
        setTeamMembers(profiles || []);
      } else {
        setTeamMembers([]);
      }

      // 3. Fetch all employees for the searchable dropdown
      const { data: allEmployeeRoles, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'employee');

      if (roleError) throw roleError;

      const allEmployeeIds = allEmployeeRoles?.map(r => r.user_id) || [];
      const availableToAssignIds = allEmployeeIds.filter(id => !memberIds.includes(id));

      if (availableToAssignIds.length > 0) {
        const { data: availableProfiles, error: availableError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', availableToAssignIds);

        if (availableError) throw availableError;
        setAvailableEmployees(availableProfiles || []);
      } else {
        setAvailableEmployees([]);
      }

    } catch (error: any) {
      console.error('Error fetching team data:', error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (employeeId: string) => {
    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('supervisor_employees')
        .insert({
          supervisor_id: user?.id,
          employee_id: employeeId
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member added successfully",
      });
      
      setOpen(false);
      fetchTeamData();
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add team member",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    const confirmed = await Alert.confirm(
      'Remove Team Member',
      'Are you sure you want to remove this employee from your team?'
    );
    
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('supervisor_employees')
        .delete()
        .eq('supervisor_id', user?.id)
        .eq('employee_id', employeeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member removed successfully",
      });
      
      fetchTeamData();
    } catch (error: any) {
      console.error('Error removing team member:', error);
      toast({
        title: "Error",
        description: "Failed to remove team member",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">Manage your assigned employees and build your team</p>
          </div>
          
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button className="w-full sm:w-auto">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Team Member
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="end">
              <Command>
                <CommandInput placeholder="Search employees..." />
                <CommandList>
                  <CommandEmpty>No employees found.</CommandEmpty>
                  <CommandGroup>
                    {availableEmployees.map((employee) => (
                      <CommandItem
                        key={employee.id}
                        value={employee.full_name}
                        onSelect={() => handleAddMember(employee.id)}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback className="text-[10px]">
                            {employee.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{employee.full_name}</span>
                          <span className="text-[10px] text-muted-foreground">{employee.department || 'No department'}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.length === 0 ? (
            <Card className="col-span-full py-12">
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                <Users className="w-12 h-12 text-muted-foreground opacity-20" />
                <div className="text-center">
                  <h3 className="font-semibold text-lg">No Team Members Yet</h3>
                  <p className="text-muted-foreground">Start by adding employees to your team using the button above.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            teamMembers.map((member) => (
              <Card key={member.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/10">
                        <AvatarFallback className="bg-primary/5 text-primary">
                          {member.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{member.full_name}</CardTitle>
                        <CardDescription className="text-xs">{member.department || 'Field Operations'}</CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium truncate max-w-[150px]">{member.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      className="w-full text-xs"
                      onClick={() => navigate(`/tasks?employee=${member.id}`)}
                    >
                      View Tasks
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TeamManagement;
