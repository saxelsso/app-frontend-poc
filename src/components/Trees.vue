<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';

interface TreeData {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: {
      treeId: string;
      treeHeight: string;
    };
  }>;
}


const mapContainer = ref<HTMLDivElement>();
const map = ref<any>(null);
const userLocation = ref<{ lat: number; lng: number } | null>(null);
const currentCenter = ref<{ lat: number; lng: number } | null>(null); // Track current map center
const treeData = ref<TreeData | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const mapReady = ref(false);
const loadingTrees = ref(false); // New loading state for tree data updates
let mapboxgl: any = null;
let userLocationMarker: any = null; // Store user location marker reference

// Get user's current position
const getCurrentPosition = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  });
};

// Fetch tree data from the API
const fetchTreeData = async (lat: number, lng: number): Promise<TreeData> => {
  const url = `https://api.finurlig.ai/points?lat=${lat}&lon=${lng}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch tree data: ${response.statusText}`);
  }
  
  return await response.json();
};

// Update tree data for a new location
const updateTreeDataForLocation = async (lat: number, lng: number) => {
  try {
    loadingTrees.value = true;
    
    // Fetch new tree data
    const newTreeData = await fetchTreeData(lat, lng);
    treeData.value = newTreeData;
    
    // Update current center
    currentCenter.value = { lat, lng };
    
    // Remove existing tree layers and sources
    if (map.value && map.value.getLayer('trees-layer')) {
      map.value.removeLayer('trees-layer');
    }
    if (map.value && map.value.getSource('trees')) {
      map.value.removeSource('trees');
    }
    
    // Add new tree data to map
    addTreeDataToMap();
    
  } catch (err) {
    console.error('Error updating tree data:', err);
    error.value = 'Failed to load tree data for this location.';
  } finally {
    loadingTrees.value = false;
  }
};

// Initialize the map
const initMap = async () => {
  try {
    // Wait for the next tick to ensure DOM is ready
    await nextTick();
    
    // Check if the container element exists
    if (!mapContainer.value) {
      console.error('Map container not found, retrying...');
      setTimeout(initMap, 100);
      return;
    }

    // Import Mapbox GL JS dynamically and store reference
    mapboxgl = await import('mapbox-gl');

    // Get Mapbox access token from environment variable
    const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

    if (!mapboxAccessToken) {
      throw new Error('Mapbox access token not found. Please set VITE_MAPBOX_ACCESS_TOKEN in your .env file.');
    }

    // Replace this with your actual Mapbox access token
    mapboxgl.default.accessToken = mapboxAccessToken;

    if (!userLocation.value) return;

    // Set initial current center to user location
    currentCenter.value = { lat: userLocation.value.lat, lng: userLocation.value.lng };

    // Create the map
    map.value = new mapboxgl.default.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [userLocation.value.lng, userLocation.value.lat],
      zoom: 15
    });

    map.value.on('load', () => {
      mapReady.value = true;
      addTreeDataToMap();
      
      // Add click event listener for map clicks (not on tree points)
      map.value.on('click', (e: any) => {
        // Check if click was on a tree layer feature
        const features = map.value.queryRenderedFeatures(e.point, { layers: ['trees-layer'] });
        
        // Only proceed if click was NOT on a tree point
        if (features.length === 0) {
          const { lng, lat } = e.lngLat;
          
          // Re-center map and update tree data
          map.value.flyTo({
            center: [lng, lat],
            zoom: 15,
            duration: 1000
          });
          
          // Update tree data for the new location
          updateTreeDataForLocation(lat, lng);
        }
      });
    });

    map.value.on('error', (e: any) => {
      console.error('Mapbox error:', e);
      error.value = 'Map failed to load. Please check your internet connection and Mapbox token.';
    });

  } catch (err) {
    console.error('Error initializing map:', err);
    error.value = 'Failed to initialize map. Please check your Mapbox configuration.';
  }
};

// Add tree data to the map
const addTreeDataToMap = () => {
  if (!map.value || !treeData.value || !mapReady.value || !mapboxgl) return;

  try {
    // Add source
    map.value.addSource('trees', {
      type: 'geojson',
      data: treeData.value
    });

    // Add layer for tree points
    map.value.addLayer({
      id: 'trees-layer',
      type: 'circle',
      source: 'trees',
      paint: {
        'circle-radius': 8,
        'circle-color': '#4CAF50',
        'circle-stroke-color': '#2E7D32',
        'circle-stroke-width': 2,
        'circle-opacity': 0.8
      }
    });

    // Add user location marker only once (using the imported mapboxgl)
    if (userLocation.value && !userLocationMarker) {
      userLocationMarker = new mapboxgl.default.Marker({ 
        color: '#FF5722',
        scale: 1.2
      })
        .setLngLat([userLocation.value.lng, userLocation.value.lat])
        .setPopup(
          new mapboxgl.default.Popup({ offset: 25 })
            .setHTML('<h3>Your Original Location</h3>')
        )
        .addTo(map.value);
    }

    // Add click event for tree points
    map.value.on('click', 'trees-layer', (e: any) => {
      if (e.features && e.features[0]) {
        const properties = e.features[0].properties;
        const coordinates = e.features[0].geometry.coordinates.slice();
        
        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.default.Popup()
            .setLngLat(coordinates)
            .setHTML(`
                <div style="font-family: Arial, sans-serif;">
                  <h3 style="margin: 0 0 10px 0; color: #2E7D32;">🌳 Tree Information</h3>
                  <p><strong>Tree ID:</strong> ${properties.treeId || 'N/A'}</p>
                  <p><strong>Height:</strong> ${properties.treeHeight || 'N/A'} m</p>
                </div>
              `)
            .addTo(map.value);

      }
    });

    // Change cursor on hover
    map.value.on('mouseenter', 'trees-layer', () => {
      map.value.getCanvas().style.cursor = 'pointer';
    });

    map.value.on('mouseleave', 'trees-layer', () => {
      map.value.getCanvas().style.cursor = '';
    });

    // Fit map to show all trees
    if (treeData.value.features && treeData.value.features.length > 0) {
      const bounds = new mapboxgl.default.LngLatBounds();
      
      // Add current center to bounds
      if (currentCenter.value) {
        bounds.extend([currentCenter.value.lng, currentCenter.value.lat]);
      }
      
      // Add all tree coordinates to bounds
      treeData.value.features.forEach((feature: any) => {
        bounds.extend(feature.geometry.coordinates);
      });
      
      map.value.fitBounds(bounds, {
        padding: 50,
        maxZoom: 17
      });
    }

  } catch (err) {
    console.error('Error adding tree data to map:', err);
    error.value = 'Failed to load tree data on map.';
  }
};

// Watch for when data is loaded and map container is available
watch([loading, error], async ([newLoading, newError]) => {
  if (!newLoading && !newError && userLocation.value && treeData.value) {
    // Data is loaded, now initialize the map
    await nextTick();
    await initMap();
  }
});

onMounted(async () => {
  try {
    loading.value = true;
    
    // Get user location
    userLocation.value = await getCurrentPosition();
    
    // Fetch tree data
    treeData.value = await fetchTreeData(userLocation.value.lat, userLocation.value.lng);
    
  } catch (err) {
    console.error('Error:', err);
    error.value = err instanceof Error ? err.message : 'An unknown error occurred';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="trees-container">
    <v-card>
      <v-card-title>
        <v-icon class="mr-2">mdi-tree</v-icon>
        Trees Near You
      </v-card-title>
      
      <v-card-text>
        <div v-if="loading" class="text-center py-4">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-2">Loading tree data...</p>
        </div>
        
        <div v-else-if="error" class="text-center py-4">
          <v-alert type="error" class="mb-4">
            {{ error }}
          </v-alert>
          <p>Please enable location services and try again.</p>
          <v-btn @click="location.reload()" color="primary" class="mt-2">
            Retry
          </v-btn>
        </div>
        
        <div v-else>
          <div v-if="!mapReady" class="text-center py-4">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="mt-2">Initializing map...</p>
          </div>
          
          <!-- Loading indicator for tree data updates -->
          <div v-if="loadingTrees" class="loading-overlay">
            <v-progress-circular indeterminate color="primary" size="24"></v-progress-circular>
            <span class="ml-2">Loading trees...</span>
          </div>
          
          <div 
            ref="mapContainer" 
            class="map-container"
            style="width: 100%; height: 500px;"
            :style="{ visibility: mapReady ? 'visible' : 'hidden' }"
          ></div>
          
          <div class="mt-4">
            <v-alert type="info" variant="outlined" class="mb-3">
              Click anywhere on the map to search for trees at that location
            </v-alert>
            
            <v-chip-group>
              <v-chip color="success" variant="outlined">
                <v-icon start>mdi-tree</v-icon>
                {{ treeData?.features?.length || 0 }} trees found
              </v-chip>
              <v-chip color="primary" variant="outlined" v-if="currentCenter">
                <v-icon start>mdi-map-marker</v-icon>
                Current: {{ currentCenter.lat.toFixed(4) }}, {{ currentCenter.lng.toFixed(4) }}
              </v-chip>
              <v-chip color="warning" variant="outlined" v-if="userLocation">
                <v-icon start>mdi-crosshairs-gps</v-icon>
                Original: {{ userLocation.lat.toFixed(4) }}, {{ userLocation.lng.toFixed(4) }}
              </v-chip>
              <v-chip color="info" variant="outlined" v-if="treeData?.features?.length">
                <v-icon start>mdi-map-search</v-icon>
                200m radius
              </v-chip>
            </v-chip-group>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.trees-container {
  max-width: 100%;
  margin: 0 auto;
}

.map-container {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  background-color: #f5f5f5;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>