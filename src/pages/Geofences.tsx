import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Circle, Navigation } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Layout from '@/components/Layout';
import Alert from '@/utils/alert';
import { useGeofences } from '@/hooks/useGeofences';
import { GeofencesSkeleton } from '@/components/skeletons/GeofencesSkeleton';

import { usePermissions } from '@/contexts/PermissionContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Geofences = () => {
  const { geofences, isLoading, createGeofence, toggleGeofence } = useGeofences();
  const { user } = useAuth();
  const { hasAccess, canEdit, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (user && !permissionsLoading && !hasAccess('geofences')) {
      Alert.error('Access Denied', 'You do not have permission to access Geofences');
      navigate('/dashboard');
    }
  }, [user, permissionsLoading, hasAccess, navigate]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    radius_meters: '100',
  });



  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      Alert.error('Error', 'Geolocation is not supported by this browser.');
      return;
    }

    setGettingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;

      setFormData(prev => ({
        ...prev,
        latitude: latitude.toString(),
        longitude: longitude.toString()
      }));

      Alert.success('Location Found', `Current location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    } catch (error: any) {
      let errorMessage = 'Failed to get current location.';

      if (error.code === 1) {
        errorMessage = 'Location access denied. Please allow location access and try again.';
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable. Please check your connection and try again.';
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out. Please try again.';
      }

      Alert.error('Location Error', errorMessage);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    await createGeofence.mutateAsync({
      name: formData.name,
      description: formData.description,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radius_meters: parseInt(formData.radius_meters),
    });
    setOpen(false);
    setFormData({ name: '', description: '', latitude: '', longitude: '', radius_meters: '100' });
  };

  const handleToggleGeofence = (id: string, currentStatus: boolean, name?: string) => {
    toggleGeofence.mutate({ id, is_active: !currentStatus, name });
  };

  if (isLoading) {
    return <GeofencesSkeleton />;
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Geofences</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage location boundaries</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canEdit('geofences')} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Geofence
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Geofence</DialogTitle>
                <DialogDescription>
                  Define a new geofence boundary
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGeofence} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="flex items-center gap-2"
                  >
                    <Navigation className={`w-4 h-4 ${gettingLocation ? 'animate-spin' : ''}`} />
                    {gettingLocation ? 'Getting Location...' : 'Use Current Location'}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="radius">Radius (meters)</Label>
                  <Input
                    id="radius"
                    type="number"
                    value={formData.radius_meters}
                    onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">Create Geofence</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold">Geofence List</h2>
            <p className="text-sm text-muted-foreground">
              Review every boundary in a concise list view.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {geofences.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <MapPin className="w-12 h-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No geofences found. Use the button above to create your first geofence.
                  </p>
                </CardContent>
              </Card>
            ) : (
              geofences.map((geofence) => (
                <Card key={geofence.id}>
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base sm:text-lg">{geofence.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {geofence.description || 'No description provided.'}
                        </CardDescription>
                      </div>
                      <Badge variant={geofence.is_active ? 'default' : 'secondary'}>
                        {geofence.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {geofence.latitude.toFixed(6)}, {geofence.longitude.toFixed(6)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Circle className="w-4 h-4" />
                      <span>Radius: {geofence.radius_meters}m</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleGeofence(geofence.id, geofence.is_active, geofence.name)}
                        className="w-full sm:w-auto"
                      >
                        {geofence.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <a
                        href={`https://www.google.com/maps?q=${geofence.latitude},${geofence.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto"
                      >
                        <Button size="sm" variant="ghost" className="w-full sm:w-auto">
                          View on Map
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Geofences;
