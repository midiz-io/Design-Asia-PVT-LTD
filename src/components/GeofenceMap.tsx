import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2, Navigation, Layers, Plus } from 'lucide-react';

interface Geofence {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

interface GeofenceMapProps {
  geofences: Geofence[];
  center?: [number, number];
  zoom?: number;
  pitch?: number;
  bearing?: number;
  showControls?: boolean;
  height?: string;
  onGeofenceClick?: (geofence: Geofence) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
}

const GeofenceMap = ({
  geofences,
  center = [0, 0],
  zoom = 2,
  pitch = 45,
  bearing = 0,
  showControls = true,
  height = '600px',
  onGeofenceClick,
  onMapClick,
}: GeofenceMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [is3D, setIs3D] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [addMode, setAddMode] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Calculate center from geofences if available
    const mapCenter = geofences.length > 0
      ? [geofences[0].longitude, geofences[0].latitude]
      : center;

    const mapZoom = geofences.length > 0 ? 12 : zoom;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: mapCenter as [number, number],
      zoom: mapZoom,
      pitch: pitch,
      bearing: bearing,
      antialias: true,
      attributionControl: true,
    });

    // Add navigation controls
    if (showControls) {
      map.current.addControl(new maplibregl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true,
      }), 'top-right');

      // Add geolocate control
      map.current.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
        }),
        'top-right'
      );

      // Add scale control
      map.current.addControl(
        new maplibregl.ScaleControl({
          maxWidth: 80,
          unit: 'metric',
        }),
        'bottom-left'
      );
    }

    // Handle map clicks for adding geofences
    map.current.on('click', (e) => {
      if (addMode && onMapClick) {
        onMapClick(e.lngLat);
        setAddMode(false);
      }
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'geofence-layer', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', 'geofence-layer', () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = addMode ? 'crosshair' : '';
      }
    });

    // Add 3D buildings layer when map loads
    map.current.on('load', () => {
      if (!map.current) return;

      // Add 3D buildings layer
      map.current.addLayer({
        id: '3d-buildings',
        source: 'openmaptiles',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'render_height'],
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'render_min_height'],
          ],
          'fill-extrusion-opacity': 0.6,
        },
      });
    });

    return () => {
      // Cleanup markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update cursor when add mode changes
  useEffect(() => {
    if (map.current) {
      map.current.getCanvas().style.cursor = addMode ? 'crosshair' : '';
    }
  }, [addMode]);

  // Update geofences when they change
  useEffect(() => {
    if (!map.current) return;

    // Ensure style is loaded before manipulating sources/layers to avoid runtime errors
    if (!map.current.isStyleLoaded()) {
      const onLoad = () => {
        // Re-run this effect logic once the style is loaded
        if (map.current) {
          map.current.off('load', onLoad);
        }
        // Trigger a microtask re-run by updating a no-op state or simply returning; the effect will rerun on geofences changes anyway
        // We instead directly proceed to apply layers below by calling the same logic
        applyGeofences();
      };
      map.current.on('load', onLoad);
      return;
    }

    const applyGeofences = () => {
      if (!map.current) return;

      // Remove existing geofence layers and sources
      if (map.current.getLayer('geofence-layer')) {
        map.current.removeLayer('geofence-layer');
      }
      if (map.current.getLayer('geofence-outline')) {
        map.current.removeLayer('geofence-outline');
      }
      if (map.current.getSource('geofences')) {
        map.current.removeSource('geofences');
      }

      // Remove existing markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];

      if (geofences.length === 0) return;

      // Create GeoJSON from geofences
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: geofences.map((geofence) => {
          // Create circle polygon
          const steps = 64;
          const coordinates: number[][] = [];
          const radiusInDegrees = geofence.radius_meters / 111320;

          for (let i = 0; i <= steps; i++) {
            const theta = (i / steps) * (2 * Math.PI);
            const lng = geofence.longitude + radiusInDegrees * Math.cos(theta);
            const lat = geofence.latitude + radiusInDegrees * Math.sin(theta);
            coordinates.push([lng, lat]);
          }

          return {
            type: 'Feature',
            properties: {
              id: geofence.id,
              name: geofence.name,
              description: geofence.description,
              radius: geofence.radius_meters,
              is_active: geofence.is_active,
            },
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates],
            },
          };
        }),
      };

      // Add geofence source and layers
      map.current.addSource('geofences', {
        type: 'geojson',
        data: geojson,
      });

      // Add fill layer
      map.current.addLayer({
        id: 'geofence-layer',
        type: 'fill',
        source: 'geofences',
        paint: {
          'fill-color': [
            'case',
            ['get', 'is_active'],
            '#3b82f6', // blue for active
            '#94a3b8', // gray for inactive
          ],
          'fill-opacity': 0.2,
        },
      });

      // Add outline layer
      map.current.addLayer({
        id: 'geofence-outline',
        type: 'line',
        source: 'geofences',
        paint: {
          'line-color': [
            'case',
            ['get', 'is_active'],
            '#3b82f6', // blue for active
            '#94a3b8', // gray for inactive
          ],
          'line-width': 2,
        },
      });

      // Add markers for geofence centers
      geofences.forEach((geofence) => {
        if (!map.current) return;

        // Create custom marker element
        const el = document.createElement('div');
      el.className = 'geofence-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.transition = 'all 0.3s ease';
      
      const bgColor = geofence.is_active ? '#3b82f6' : '#94a3b8';
      el.style.backgroundColor = bgColor;
      el.style.boxShadow = `0 0 15px ${bgColor}`;
      
      el.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;

        // Add hover effect
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.2)';
          el.style.zIndex = '1000';
        });

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '1';
        });

        // Create popup
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${geofence.name}</h3>
            <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${geofence.description}</p>
            <p style="font-size: 12px; margin-bottom: 2px;">Radius: ${geofence.radius_meters}m</p>
            <p style="font-size: 12px; margin-bottom: 2px;">
              Status: <span style="color: ${geofence.is_active ? '#10b981' : '#94a3b8'};">
                ${geofence.is_active ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        `);

        // Create marker
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([geofence.longitude, geofence.latitude])
          .setPopup(popup)
          .addTo(map.current);

        // Add click handler
        el.addEventListener('click', () => {
          if (onGeofenceClick) {
            onGeofenceClick(geofence);
          }
        });

        markers.current.push(marker);
      });

      // Fit bounds to show all geofences
      if (geofences.length > 0 && map.current) {
        const bounds = new maplibregl.LngLatBounds();
        geofences.forEach((geofence) => {
          bounds.extend([geofence.longitude, geofence.latitude]);
        });
        map.current.fitBounds(bounds, {
          padding: 100,
          maxZoom: 15,
          duration: 1000,
        });
      }
    };

    // Initial apply when style is already loaded
    applyGeofences();
  }, [geofences, onGeofenceClick]);

  // Toggle 3D view
  const toggle3D = () => {
    if (!map.current) return;
    
    if (is3D) {
      map.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000,
      });
    } else {
      map.current.easeTo({
        pitch: 45,
        bearing: -20,
        duration: 1000,
      });
    }
    setIs3D(!is3D);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!mapContainer.current) return;

    if (!isFullscreen) {
      if (mapContainer.current.requestFullscreen) {
        mapContainer.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Fly to geofence
  const flyToGeofence = () => {
    if (!map.current || geofences.length === 0) return;

    const firstGeofence = geofences[0];
    map.current.flyTo({
      center: [firstGeofence.longitude, firstGeofence.latitude],
      zoom: 15,
      pitch: 45,
      bearing: -20,
      duration: 2000,
      essential: true,
    });
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative" style={{ height: isFullscreen ? '100vh' : height }}>
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* Custom controls */}
        {showControls && (
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <Button
              variant="secondary"
              size="icon"
              onClick={toggle3D}
              title={is3D ? 'Switch to 2D' : 'Switch to 3D'}
              className="shadow-lg"
            >
              <Layers className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={flyToGeofence}
              title="Fly to geofence"
              className="shadow-lg"
              disabled={geofences.length === 0}
            >
              <Navigation className="h-4 w-4" />
            </Button>
            
            <Button
              variant={addMode ? "default" : "secondary"}
              size="icon"
              onClick={() => setAddMode(!addMode)}
              title={addMode ? 'Cancel add mode' : 'Add geofence (click on map)'}
              className="shadow-lg"
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="shadow-lg"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Add mode indicator */}
        {addMode && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <Card className="px-4 py-2 shadow-lg bg-primary text-primary-foreground">
              <p className="text-sm font-medium">Click on the map to add a geofence</p>
            </Card>
          </div>
        )}

        {/* Geofence counter */}
        {geofences.length > 0 && (
          <div className="absolute bottom-4 left-4 z-10">
            <Card className="px-3 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">
                  {geofences.filter(g => g.is_active).length} / {geofences.length} Active
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* Attribution */}
        <div className="absolute bottom-4 right-4 z-10">
          <Card className="px-2 py-1 shadow-lg">
            <a
              href="https://openfreemap.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              MidizMap
            </a>
          </Card>
        </div>
      </div>
    </Card>
  );
};

export default GeofenceMap;

