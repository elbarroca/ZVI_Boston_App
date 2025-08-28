// components/ListingsMapView.tsx
import React, { Suspense } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getListings } from '@/lib/api';

// Conditionally import native map components
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  // Native: Use expo-maps
  try {
    const expoMaps = require('expo-maps');
    MapView = expoMaps.default || expoMaps.MapView;
    Marker = expoMaps.Marker;
  } catch (error) {
    console.warn('expo-maps is not available on this platform:', error);
  }
}

// Lazy load web map component
const WebMapComponent = Platform.OS === 'web'
  ? React.lazy(() => import('./WebMapComponent'))
  : null;

// Define university locations as per the feedback
const universityPins = [
  { id: 'bu', title: 'Boston University', lat: 42.3505, lng: -71.1054 },
  { id: 'neu', title: 'Northeastern', lat: 42.3398, lng: -71.0892 },
  { id: 'harvard', title: 'Harvard University', lat: 42.3770, lng: -71.1167 },
];

// Native Map Component
function NativeMapComponent({ listings, router }: { listings: any[], router: any }) {
  if (!MapView || !Marker) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Map components are not available on this device.</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: 42.35,
        longitude: -71.09,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      showsUserLocation={true}
      showsMyLocationButton={true}
    >
      {/* University Markers */}
      {universityPins.map(pin => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.lat, longitude: pin.lng }}
          title={pin.title}
          pinColor="blue"
        />
      ))}

      {/* Listing Markers */}
      {listings
        .filter(listing => listing.latitude && listing.longitude)
        .map(listing => (
          <Marker
            key={listing.id}
            coordinate={{
              latitude: listing.latitude!,
              longitude: listing.longitude!
            }}
            title={listing.title}
            description={`$${listing.price_per_month}/month`}
            pinColor="red"
            onCalloutPress={() => router.push(`/(tabs)/listings/${listing.id}`)}
          />
        ))
      }
    </MapView>
  );
}

export default function ListingsMapView() {
  const router = useRouter();

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings-map-data'],
    queryFn: () => getListings(), // Updated to use new React Query v5 syntax
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load map data.</Text>
      </View>
    );
  }

  // Render appropriate map component based on platform
  if (Platform.OS === 'web') {
    if (!WebMapComponent) {
      return (
        <View style={styles.center}>
          <Text style={styles.errorText}>Web map is not supported on this platform.</Text>
        </View>
      );
    }

    return (
      <Suspense fallback={
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      }>
        <WebMapComponent listings={listings || []} router={router} />
      </Suspense>
    );
  } else {
    return <NativeMapComponent listings={listings || []} router={router} />;
  }
}

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject, // This makes the map fill its container
  },
  leafletMap: {
    height: '100%',
    width: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
});
