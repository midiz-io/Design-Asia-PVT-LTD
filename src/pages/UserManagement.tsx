import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, UserPlus, Edit, Trash2, Mail, Phone, Building, KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';
import { useUserManagement, UserProfile } from '@/hooks/useUserManagement';
import { UserManagementSkeleton } from '@/components/skeletons/UserManagementSkeleton';

const UserManagement = () => {
  const {
    users,
    roleStats,
    userAccountStatus,
    isLoading,
    updateUser,
    addUser,
    deleteUser,
    disableUser,
    enableUser,
    changeUserPassword,
  } = useUserManagement();

  const { user, isAdmin, loading: authLoading } = useAuth();
  const { canEdit, hasAccess, checkAccessAndNavigate, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    if (user && !authLoading && !permissionsLoading && !hasAccess('users')) {
      Alert.error('Access Denied', 'You do not have permission to access User Management');
      navigate('/dashboard');
    }
  }, [user, authLoading, permissionsLoading, hasAccess, navigate]);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    department: '',
    role: 'employee',
  });

  const [newUserFormData, setNewUserFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    role: 'employee',
  });

  const handleChangePasswordClick = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setNewPassword('');
    setChangePasswordOpen(true);
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      if (newPassword.length < 6) Alert.error('Error', 'Password must be at least 6 characters');
      return;
    }
    await changeUserPassword.mutateAsync({ userId: selectedUser.id, newPassword: newPassword });
    setChangePasswordOpen(false);
  };

  const handleEditUser = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setFormData({
      full_name: userProfile.full_name,
      phone: userProfile.phone || '',
      department: userProfile.department || '',
      role: userProfile.user_roles?.[0]?.role || 'employee',
    });
    setEditOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    await updateUser.mutateAsync({
      userId: selectedUser.id,
      formData,
      currentRole: selectedUser.user_roles?.[0]?.role || 'employee',
    });
    setEditOpen(false);
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      Alert.error('Error', 'You cannot delete your own account');
      return;
    }
    const confirmed = await Alert.confirm(
      'Delete User',
      'This will permanently delete the user and all their data. This action cannot be undone. Are you sure?'
    );
    if (!confirmed) return;
    deleteUser.mutate(userId);
  };

  const handleDisableUser = async (userId: string, userName: string) => {
    const confirmed = await Alert.confirm(
      'Ban User Account',
      `Are you sure you want to ban ${userName}'s account? They will not be able to access the system until an admin unbans it.`
    );
    if (!confirmed) return;
    disableUser.mutate(userId);
  };

  const handleEnableUser = async (userId: string, userName: string) => {
    const confirmed = await Alert.confirm(
      'Unban User Account',
      `Are you sure you want to unban ${userName}'s account? They will be able to access the system again.`
    );
    if (!confirmed) return;
    enableUser.mutate(userId);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await addUser.mutateAsync(newUserFormData);
    setNewUserFormData({ full_name: '', email: '', password: '', phone: '', department: '', role: 'employee' });
    setAddUserOpen(false);
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'success';
      case 'supervisor': return 'warning';
      default: return 'outline';
    }
  };

  const getUserRole = (u: UserProfile) => u.user_roles?.[0]?.role || 'employee';

  const filteredUsers = useMemo(() =>
    users.filter(u => roleFilter === 'all' || getUserRole(u) === roleFilter),
    [users, roleFilter]
  );

  const totalUsers = users.length;

  if (authLoading || permissionsLoading || isLoading) {
    return <UserManagementSkeleton />;
  }

  // Check for access permission - redirect if no access
  if (!hasAccess('users')) {
    return null;
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage users, roles, and permissions</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
              <DialogTrigger asChild>
                <Button disabled={!canEdit('users')} className="w-full sm:w-auto">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new user account with role assignment
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={newUserFormData.full_name}
                      onChange={(e) => setNewUserFormData({ ...newUserFormData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserFormData.email}
                      onChange={(e) => setNewUserFormData({ ...newUserFormData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserFormData.password}
                      onChange={(e) => setNewUserFormData({ ...newUserFormData, password: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newUserFormData.phone}
                      onChange={(e) => setNewUserFormData({ ...newUserFormData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={newUserFormData.department}
                      onChange={(e) => setNewUserFormData({ ...newUserFormData, department: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={newUserFormData.role}
                      onValueChange={(value) => setNewUserFormData({ ...newUserFormData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddUserOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Create User</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{totalUsers}</div>
                <Users className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{roleStats.admin}</div>
                <Shield className="w-8 h-8 text-destructive opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-accent">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Managers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{roleStats.manager}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Supervisors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{roleStats.supervisor}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{roleStats.employee}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter by Role</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Users List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((userProfile) => {
              const role = getUserRole(userProfile);

              return (
                <Card key={userProfile.id} className="hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                            {userProfile.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{userProfile.full_name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getRoleBadgeVariant(role)}>
                              {role}
                            </Badge>
                            {userAccountStatus[userProfile.id]?.isDisabled && (
                              <Badge variant="destructive" className="text-xs">
                                Banned
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground truncate">{userProfile.email}</span>
                      </div>
                      {userProfile.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{userProfile.phone}</span>
                        </div>
                      )}
                      {userProfile.department && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{userProfile.department}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Joined: {new Date(userProfile.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      {canEdit('users') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEditUser(userProfile)}
                        >
                          <Edit className="w-3 h-3 mr-2" />
                          Edit
                        </Button>
                      )}
                      {canEdit('users') && userProfile.id !== user?.id && (
                        <>
                          {/* Ban/Unban Button (Admin Only) */}
                          {isAdmin && (
                            userAccountStatus[userProfile.id]?.isDisabled ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                                onClick={() => handleEnableUser(userProfile.id, userProfile.full_name)}
                              >
                                <Shield className="w-3 h-3 mr-2" />
                                Unban
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                onClick={() => handleDisableUser(userProfile.id, userProfile.full_name)}
                              >
                                <Shield className="w-3 h-3 mr-2" />
                                Ban
                              </Button>
                            )
                          )}

                          {/* Change Password Button (Admin Only) */}
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleChangePasswordClick(userProfile)}
                            >
                              <KeyRound className="w-3 h-3 mr-2" />
                              Password
                            </Button>
                          )}

                          {/* Delete Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteUser(userProfile.id)}
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </Button>
                        </>
                      )}
                      {userProfile.id === user?.id && (
                        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Current User
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Edit User Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information and role</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                Update User
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedUser?.full_name}. They will be able to use it immediately.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password *</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full">
                Reset Password
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default UserManagement;

