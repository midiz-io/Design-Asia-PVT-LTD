import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Alert from '@/utils/alert';

export interface Geofence {
    id: string;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    is_active: boolean;
    created_at: string;
}

export const useGeofences = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const getCurrentUserName = () =>
        user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'System';

    // 1. Fetch Geofences
    const { data: geofences = [], isLoading } = useQuery({
        queryKey: ['geofences'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('geofences')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as Geofence[];
        }
    });

    // 2. Real-time Subscription for updates
    useEffect(() => {
        const channel = supabase
            .channel('public:geofences')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'geofences'
            }, () => {
                queryClient.invalidateQueries({ queryKey: ['geofences'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    // 3. Create Mutation
    const createGeofence = useMutation({
        mutationFn: async (newGeofence: Omit<Geofence, 'id' | 'created_at' | 'is_active'>) => {
            const { data, error } = await supabase
                .from('geofences')
                .insert([
                    {
                        ...newGeofence,
                        created_by: user?.id,
                        is_active: true,
                    },
                ])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: async () => {
            Alert.success('Geofence created successfully');
            queryClient.invalidateQueries({ queryKey: ['geofences'] });
        },
        onError: (error: any) => {
            Alert.error('Error', error.message || 'Failed to create geofence');
        }
    });

    // 4. Toggle Geofence Mutation
    const toggleGeofence = useMutation({
        mutationFn: async ({ id, is_active, name }: { id: string, is_active: boolean, name?: string }) => {
            const { error } = await supabase
                .from('geofences')
                .update({ is_active })
                .eq('id', id);

            if (error) throw error;
            return { id, is_active, name };
        },
        onSuccess: async () => {
            Alert.success('Geofence status updated');
            queryClient.invalidateQueries({ queryKey: ['geofences'] });
        },
        onError: (error: any) => {
            Alert.error('Error', error.message || 'Failed to update geofence');
        }
    });

    return {
        geofences,
        isLoading,
        createGeofence,
        toggleGeofence
    };
};
