import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, AlertTriangle, TrendingUp, TrendingDown, ArrowRightLeft, MapPin as MapPinIcon, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';

import { useInventory, InventoryItem, InventoryLocation, StockMovement } from '@/hooks/useInventory';
import { InventorySkeleton } from '@/components/skeletons/InventorySkeleton';

import { usePermissions } from '@/contexts/PermissionContext';
import { useNavigate } from 'react-router-dom';

const Inventory = () => {
  const {
    items,
    locations,
    movements,
    alerts,
    isLoading,
    refetchItems,
    refetchLocations,
    refetchMovements
  } = useInventory();
  const [itemOpen, setItemOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const { user, isAdmin } = useAuth();
  const { hasAccess, canEdit, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !permissionsLoading && !hasAccess('inventory')) {
      Alert.error('Access Denied', 'You do not have permission to access Inventory');
      navigate('/dashboard');
    }
  }, [user, permissionsLoading, hasAccess, navigate]);

  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    unit_price: '',
    reorder_level: '',
  });

  const [locationFormData, setLocationFormData] = useState({
    name: '',
    description: '',
    location_type: 'warehouse',
    address: '',
    capacity: '',
  });

  const [movementFormData, setMovementFormData] = useState({
    item_id: '',
    from_location_id: '',
    to_location_id: '',
    quantity: '',
    movement_type: 'transfer',
    reference_number: '',
    notes: '',
  });

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('inventory_items').insert([
        {
          ...itemFormData,
          unit_price: parseFloat(itemFormData.unit_price),
          reorder_level: parseInt(itemFormData.reorder_level),
        },
      ]);

      if (error) throw error;

      Alert.success('Inventory item created successfully');

      setItemOpen(false);
      setItemFormData({ name: '', description: '', sku: '', category: '', unit_price: '', reorder_level: '' });
      refetchItems();
    } catch (error: any) {
      Alert.error('Error', error.message);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('inventory_locations').insert([
        {
          ...locationFormData,
          capacity: parseInt(locationFormData.capacity),
        },
      ]);

      if (error) throw error;

      Alert.success('Location created successfully');

      setLocationOpen(false);
      setLocationFormData({ name: '', description: '', location_type: 'warehouse', address: '', capacity: '' });
      refetchLocations();
    } catch (error: any) {
      Alert.error('Error', error.message);
    }
  };

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('stock_movements').insert([
        {
          inventory_item_id: movementFormData.item_id,
          from_location_id: movementFormData.from_location_id || null,
          to_location_id: movementFormData.to_location_id || null,
          quantity: parseInt(movementFormData.quantity),
          movement_type: movementFormData.movement_type,
          reference_number: movementFormData.reference_number,
          notes: movementFormData.notes,
          employee_id: user?.id,
        },
      ]);

      if (error) throw error;

      Alert.success('Stock movement recorded successfully');

      setMovementOpen(false);
      setMovementFormData({
        item_id: '',
        from_location_id: '',
        to_location_id: '',
        quantity: '',
        movement_type: 'transfer',
        reference_number: '',
        notes: '',
      });
      refetchMovements();
      refetchItems();
    } catch (error: any) {
      Alert.error('Error', error.message);
    }
  };

  const getTotalStock = (item: InventoryItem) => {
    return item.stock_levels?.reduce((sum, level) => sum + level.current_quantity, 0) || 0;
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return <ArrowRightLeft className="w-4 h-4" />;
      case 'delivery':
        return <TrendingDown className="w-4 h-4" />;
      case 'return':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const totalItems = items.length;
  const lowStockItems = items.filter(item => getTotalStock(item) <= item.reorder_level).length;
  const totalStockValue = items.reduce((sum, item) => sum + (getTotalStock(item) * (item.unit_price || 0)), 0);

  if (isLoading) {
    return <InventorySkeleton />;
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Inventory</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage stock and supplies</p>
          </div>
          {canEdit('inventory') && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Dialog open={itemOpen} onOpenChange={setItemOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:w-full max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Inventory Item</DialogTitle>
                    <DialogDescription>Create a new inventory item</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateItem} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={itemFormData.name}
                        onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={itemFormData.description}
                        onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          value={itemFormData.sku}
                          onChange={(e) => setItemFormData({ ...itemFormData, sku: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          value={itemFormData.category}
                          onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unit_price">Unit Price *</Label>
                        <Input
                          id="unit_price"
                          type="number"
                          step="0.01"
                          value={itemFormData.unit_price}
                          onChange={(e) => setItemFormData({ ...itemFormData, unit_price: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reorder_level">Reorder Level *</Label>
                        <Input
                          id="reorder_level"
                          type="number"
                          value={itemFormData.reorder_level}
                          onChange={(e) => setItemFormData({ ...itemFormData, reorder_level: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      Add Item
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:w-full max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Storage Location</DialogTitle>
                    <DialogDescription>Create a new inventory storage location</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateLocation} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="loc-name">Name *</Label>
                      <Input
                        id="loc-name"
                        value={locationFormData.name}
                        onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loc-description">Description</Label>
                      <Textarea
                        id="loc-description"
                        value={locationFormData.description}
                        onChange={(e) => setLocationFormData({ ...locationFormData, description: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="loc-type">Type *</Label>
                        <Select
                          value={locationFormData.location_type}
                          onValueChange={(value) => setLocationFormData({ ...locationFormData, location_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="warehouse">Warehouse</SelectItem>
                            <SelectItem value="office">Office</SelectItem>
                            <SelectItem value="vehicle">Vehicle</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="capacity">Capacity *</Label>
                        <Input
                          id="capacity"
                          type="number"
                          value={locationFormData.capacity}
                          onChange={(e) => setLocationFormData({ ...locationFormData, capacity: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={locationFormData.address}
                        onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Add Location
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Record Movement
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:w-full max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Stock Movement</DialogTitle>
                    <DialogDescription>Transfer or adjust inventory stock</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateMovement} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="item">Item *</Label>
                      <Select
                        value={movementFormData.item_id}
                        onValueChange={(value) => setMovementFormData({ ...movementFormData, item_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} (Stock: {getTotalStock(item)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="from-location">From Location</Label>
                        <Select
                          value={movementFormData.from_location_id}
                          onValueChange={(value) => setMovementFormData({ ...movementFormData, from_location_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="to-location">To Location</Label>
                        <Select
                          value={movementFormData.to_location_id}
                          onValueChange={(value) => setMovementFormData({ ...movementFormData, to_location_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={movementFormData.quantity}
                          onChange={(e) => setMovementFormData({ ...movementFormData, quantity: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="movement-type">Type *</Label>
                        <Select
                          value={movementFormData.movement_type}
                          onValueChange={(value) => setMovementFormData({ ...movementFormData, movement_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="transfer">Transfer</SelectItem>
                            <SelectItem value="delivery">Delivery</SelectItem>
                            <SelectItem value="return">Return</SelectItem>
                            <SelectItem value="adjustment">Adjustment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reference">Reference Number</Label>
                      <Input
                        id="reference"
                        value={movementFormData.reference_number}
                        onChange={(e) => setMovementFormData({ ...movementFormData, reference_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={movementFormData.notes}
                        onChange={(e) => setMovementFormData({ ...movementFormData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Record Movement
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{totalItems}</div>
                <Package className="w-8 h-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-warning">{lowStockItems}</div>
                <AlertTriangle className="w-8 h-8 text-warning opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-success">LKR {totalStockValue.toFixed(2)}</div>
                <TrendingUp className="w-8 h-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="items" className="w-full">
          <TabsList>
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="locations">Locations ({locations.length})</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts {alerts.length > 0 && <Badge className="ml-2" variant="destructive">{alerts.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            {items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No inventory items found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const totalStock = getTotalStock(item);
                  const isLowStock = totalStock <= item.reorder_level;

                  return (
                    <Card key={item.id} className="hover:shadow-lg transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle>{item.name}</CardTitle>
                            <CardDescription>{item.category}</CardDescription>
                          </div>
                          {isLowStock && (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Low
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Stock:</span>
                          <span className={`font-semibold ${isLowStock ? 'text-destructive' : ''}`}>{totalStock}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Unit Price:</span>
                          <span className="font-semibold">LKR {item.unit_price?.toFixed(2)}</span>
                        </div>
                        {item.sku && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">SKU:</span>
                            <span className="font-mono text-xs">{item.sku}</span>
                          </div>
                        )}
                        <div className="pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setSelectedItem(item)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            {locations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MapPinIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No locations found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {locations.map((location) => (
                  <Card key={location.id}>
                    <CardHeader>
                      <CardTitle>{location.name}</CardTitle>
                      <CardDescription>{location.location_type}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Capacity:</span>
                        <span className="font-semibold">{location.capacity}</span>
                      </div>
                      {location.address && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Address:</span>
                          <p className="text-xs mt-1">{location.address}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            {movements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ArrowRightLeft className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No movements recorded</p>
                </CardContent>
              </Card>
            ) : (
              movements.map((movement) => (
                <Card key={movement.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type)}
                          <CardTitle className="text-lg">{movement.inventory_items?.name}</CardTitle>
                        </div>
                        <CardDescription>
                          {movement.from_location?.name || 'External'} → {movement.to_location?.name || 'External'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {movement.movement_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-semibold">{movement.quantity}</span>
                    </div>
                    {movement.reference_number && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Reference:</span>
                        <span className="font-mono text-xs">{movement.reference_number}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      By: {movement.profiles?.full_name} • {new Date(movement.created_at).toLocaleString()}
                    </div>
                    {movement.notes && (
                      <div className="text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="text-xs mt-1">{movement.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active alerts</p>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert) => (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          {alert.inventory_items?.name}
                        </CardTitle>
                        <CardDescription>{alert.message}</CardDescription>
                      </div>
                      <Badge variant="destructive">{alert.alert_type.replace('_', ' ')}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <TrendingDown className="w-4 h-4 text-destructive" />
                        <span>Current: {alert.current_value}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span>Threshold: {alert.threshold_value}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Item Details Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Item Details</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedItem.name}</h3>
                  <p className="text-muted-foreground">{selectedItem.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="mt-1">{selectedItem.category || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">SKU</Label>
                    <p className="mt-1 font-mono text-sm">{selectedItem.sku || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Unit Price</Label>
                    <p className="mt-1 font-semibold">LKR {selectedItem.unit_price?.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Reorder Level</Label>
                    <p className="mt-1">{selectedItem.reorder_level}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Stock by Location</Label>
                  <div className="mt-2 space-y-2">
                    {selectedItem.stock_levels && selectedItem.stock_levels.length > 0 ? (
                      selectedItem.stock_levels.map((level) => (
                        <div key={level.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                          <span className="text-sm">{level.inventory_locations?.name}</span>
                          <Badge variant="outline">{level.current_quantity} units</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No stock levels recorded</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                  <span className="font-semibold">Total Stock:</span>
                  <span className="text-2xl font-bold">{getTotalStock(selectedItem)} units</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Inventory;
