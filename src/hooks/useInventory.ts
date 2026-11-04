import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    sku: string;
    category: string;
    unit_price: number;
    reorder_level: number;
    stock_levels: Array<{
        id: string;
        current_quantity: number;
        location_id: string;
        inventory_locations: {
            name: string;
        };
    }>;
}

export interface InventoryLocation {
    id: string;
    name: string;
    description: string;
    location_type: string;
    address: string;
    capacity: number;
    is_active: boolean;
}

export interface StockMovement {
    id: string;
    quantity: number;
    movement_type: string;
    reference_number: string;
    notes: string;
    created_at: string;
    inventory_items: {
        name: string;
    };
    from_location: {
        name: string;
    } | null;
    to_location: {
        name: string;
    } | null;
    profiles: {
        full_name: string;
    };
}

export interface Alert {
    id: string;
    alert_type: string;
    message: string;
    current_value: number;
    threshold_value: number;
    created_at: string;
    inventory_items: {
        name: string;
    };
}

export const useInventoryItems = () => {
    return useQuery({
        queryKey: ['inventory_items'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_items')
                .select(`
                    *,
                    stock_levels (
                        id,
                        current_quantity,
                        location_id,
                        inventory_locations (name)
                    )
                `)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return (data || []) as unknown as InventoryItem[];
        }
    });
};

export const useInventoryLocations = () => {
    return useQuery({
        queryKey: ['inventory_locations'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_locations')
                .select('*')
                .eq('is_active', true)
                .order('name');
            if (error) throw error;
            return (data || []) as any[] as InventoryLocation[];
        }
    });
};

export const useStockMovements = () => {
    return useQuery({
        queryKey: ['stock_movements'],
        queryFn: async () => {
            const { data: movementsData, error: movementsError } = await supabase
                .from('stock_movements')
                .select(`
                    id,
                    quantity,
                    movement_type,
                    reference_number,
                    notes,
                    created_at,
                    inventory_item_id,
                    from_location_id,
                    to_location_id,
                    employee_id
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (movementsError) throw movementsError;

            // Resolve Relationships manually
            const itemIds = [...new Set(movementsData?.map(m => m.inventory_item_id).filter(Boolean) || [])];
            const { data: itemsData } = await supabase
                .from('inventory_items')
                .select('id, name')
                .in('id', itemIds);

            const locationIds = [...new Set([
                ...movementsData?.map(m => m.from_location_id).filter(Boolean) || [],
                ...movementsData?.map(m => m.to_location_id).filter(Boolean) || []
            ])];
            const { data: locationsData } = await supabase
                .from('inventory_locations')
                .select('id, name')
                .in('id', locationIds);

            const employeeIds = [...new Set(movementsData?.map(m => m.employee_id).filter(Boolean) || [])];
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', employeeIds);

            return (movementsData?.map(movement => ({
                ...movement,
                inventory_items: itemsData?.find(i => i.id === movement.inventory_item_id) || { name: 'Unknown Item' },
                from_location: locationsData?.find(l => l.id === movement.from_location_id) || null,
                to_location: locationsData?.find(l => l.id === movement.to_location_id) || null,
                profiles: profilesData?.find(p => p.id === movement.employee_id) || { full_name: 'Unknown User' }
            })) || []) as any[] as StockMovement[];
        }
    });
};

export const useInventoryAlerts = () => {
    return useQuery({
        queryKey: ['inventory_alerts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_alerts')
                .select(`
                    *,
                    inventory_items (name)
                `)
                .eq('is_resolved', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []) as any[] as Alert[];
        }
    });
}

export const useInventory = () => {
    const { data: items = [], isLoading: isItemsLoading, refetch: refetchItems } = useInventoryItems();
    const { data: locations = [], isLoading: isLocationsLoading, refetch: refetchLocations } = useInventoryLocations();
    const { data: movements = [], isLoading: isMovementsLoading, refetch: refetchMovements } = useStockMovements();
    const { data: alerts = [], isLoading: isAlertsLoading, refetch: refetchAlerts } = useInventoryAlerts();

    const isLoading = isItemsLoading || isLocationsLoading || isMovementsLoading || isAlertsLoading;

    return {
        items,
        locations,
        movements,
        alerts,
        isLoading,
        refetchItems,
        refetchLocations,
        refetchMovements,
        refetchAlerts
    };
};
