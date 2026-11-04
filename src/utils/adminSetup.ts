import { supabase } from '@/integrations/supabase/client';

export const createAdminRole = async (userId: string) => {
  try {
    console.log('Creating admin role for user:', userId);
    
    // Check if user already has a role
    const { data: existingRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (existingRoles && existingRoles.length > 0) {
      console.log('User already has roles:', existingRoles);
      return { success: true, message: 'User already has roles' };
    }
    
    // Create admin role
    const { error } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role: 'admin' }]);
    
    if (error) {
      console.error('Error creating admin role:', error);
      return { success: false, error };
    }
    
    console.log('Admin role created successfully');
    return { success: true, message: 'Admin role created successfully' };
  } catch (error) {
    console.error('Error in createAdminRole:', error);
    return { success: false, error };
  }
};

export const checkUserRoles = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    console.log('User roles check result:', { data, error });
    return { data, error };
  } catch (error) {
    console.error('Error checking user roles:', error);
    return { data: null, error };
  }
};
