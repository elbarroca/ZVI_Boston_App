// components/ListingsMapView.tsx
import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getListings } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/context/language-provider';

// Define university locations as per the feedback
const universityPins = [
  { id: 'bu', title: 'Boston University', lat: 42.3505, lng: -71.1054 },
  { id: 'neu', title: 'Northeastern University', lat: 42.3398, lng: -71.0892 },
  { id: 'harvard', title: 'Harvard University', lat: 42.3770, lng: -71.1167 },
  { id: 'mit', title: 'Massachusetts Institute of Technology', lat: 42.3601, lng: -71.0942 },
  { id: 'tufts', title: 'Tufts University', lat: 42.4075, lng: -71.1198 },
  { id: 'bc', title: 'Boston College', lat: 42.3355, lng: -71.1685 },
  { id: 'berklee', title: 'Berklee College of Music', lat: 42.3466, lng: -71.0888 },
  { id: 'emerson', title: 'Emerson College', lat: 42.3521, lng: -71.0657 },
  { id: 'suffolk', title: 'Suffolk University', lat: 42.3588, lng: -71.0617 },
  { id: 'mgh', title: 'Massachusetts General Hospital', lat: 42.3632, lng: -71.0687 },
];

// Define main Boston attractions - simplified and focused
const attractionPins = [
  { id: 'fenway-park', title: 'Fenway Park', lat: 42.3467, lng: -71.0972, type: 'sports', icon: 'baseball' },
  { id: 'td-garden', title: 'TD Garden', lat: 42.3662, lng: -71.0621, type: 'sports', icon: 'basketball' },
  { id: 'bsc-gym', title: 'Boston Sports Club', lat: 42.3489, lng: -71.0868, type: 'fitness', icon: 'fitness' },
  { id: 'equinox-back-bay', title: 'Equinox Back Bay', lat: 42.3467, lng: -71.0820, type: 'fitness', icon: 'barbell' },
  { id: 'boston-common', title: 'Boston Common', lat: 42.3551, lng: -71.0657, type: 'park', icon: 'leaf' },
  { id: 'charles-river', title: 'Charles River', lat: 42.3601, lng: -71.0822, type: 'park', icon: 'water' },
  { id: 'quincy-market', title: 'Quincy Market', lat: 42.3601, lng: -71.0549, type: 'food', icon: 'restaurant' },
  { id: 'newbury-street', title: 'Newbury Street', lat: 42.3489, lng: -71.0868, type: 'shopping', icon: 'storefront' },
  { id: 'house-of-blues', title: 'House of Blues', lat: 42.3467, lng: -71.0972, type: 'nightlife', icon: 'musical-notes' },
  { id: 'lansdowne-street', title: 'Lansdowne Street Clubs', lat: 42.3465, lng: -71.0975, type: 'nightlife', icon: 'wine' }
];

// Get marker color based on attraction type - simplified colors
function getAttractionColor(type: string) {
  switch (type) {
    case 'sports': return '#FF4500'; // Orange
    case 'fitness': return '#60a5fa'; // Light Blue  
    case 'park': return '#3b82f6'; // Blue
    case 'food': return '#FF6347'; // Tomato
    case 'shopping': return '#9932CC'; // Purple
    case 'nightlife': return '#FF1493'; // Deep Pink
    default: return '#1570ef';
  }
}

// Boston Area Map Component with Google Maps - Small Icons
function BostonAreaMap({ listings, router }: { listings: any[], router: any }) {
  const { t } = useLanguage();

  // Boston city center as default region
  const bostonRegion = {
    latitude: 42.3601,
    longitude: -71.0589,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  return (
    <View style={styles.mapContainer}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={bostonRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        mapType="standard"
      >
        {/* University Markers - Small */}
        {universityPins.map(pin => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            title={pin.title}
            description="University"
          >
            <View style={styles.universityMarker}>
              <Ionicons name="school" size={12} color="#fff" />
            </View>
          </Marker>
        ))}
        
        {/* Attraction Markers - Small */}
        {attractionPins.map(pin => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            title={pin.title}
            description={pin.type.charAt(0).toUpperCase() + pin.type.slice(1)}
          >
            <View style={[styles.attractionMarker, { backgroundColor: getAttractionColor(pin.type) }]}>
              <Ionicons name={pin.icon as any} size={10} color="#fff" />
            </View>
          </Marker>
        ))}
        
        {/* Listing Markers - Small */}
        {listings
          .filter(listing => listing.latitude && listing.longitude)
          .map(listing => (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: parseFloat(listing.latitude),
                longitude: parseFloat(listing.longitude)
              }}
              title={listing.title}
              description={`$${listing.price_per_month}/month`}
              onPress={() => router.push(`/(tabs)/listings/${listing.id}`)}
              onCalloutPress={() => router.push(`/(tabs)/listings/${listing.id}`)}
            >
              <View style={styles.listingMarker}>
                <Ionicons name="home" size={10} color="#fff" />
              </View>
            </Marker>
          ))}
      </MapView>
      
      {/* Small Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>{t('universities')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>{t('housing')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#1570ef' }]} />
          <Text style={styles.legendText}>{t('attractions')}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ListingsMapView({ hideHeader = false }: { hideHeader?: boolean }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [showOverlay, setShowOverlay] = useState(!hideHeader);

  const toggleOverlay = () => setShowOverlay(prev => !prev);

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings-map-data'],
    queryFn: () => getListings(),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>{t('loadingBostonAreaGuide')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Failed to load listings data.</Text>
        <Text style={styles.errorSubtext}>
          Please check your internet connection and try again.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!hideHeader && showOverlay && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🗺️ {t('bostonStudentGuide')}</Text>
          <Text style={styles.headerSubtitle}>
            {t('discoverUniversitiesHousingAttractions')}
          </Text>
        </View>
      )}
      {!hideHeader && (
        <Pressable style={styles.toggleButton} onPress={toggleOverlay}>
          <Ionicons
            name={showOverlay ? "eye-off-outline" : "eye-outline"}
            size={24}
            color="#3B82F6"
          />
        </Pressable>
      )}
      <BostonAreaMap listings={listings || []} router={router} />
      {!hideHeader && showOverlay && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>{t('universities')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>{t('housing')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1570ef' }]} />
            <Text style={styles.legendText}>{t('attractions')}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // Header styles
  header: {
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#87CEEB', // SkyBlue, a more vibrant and appealing color
    borderBottomLeftRadius: 30, // Slightly larger radius for a modern look
    borderBottomRightRadius: 30, // Slightly larger radius
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 }, // More pronounced shadow
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000080', // Navy Blue for strong contrast
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.8,
    textShadowColor: 'rgba(255, 255, 255, 0.4)', // Softer text shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },

  headerSubtitle: {
    fontSize: 14,
    color: '#191970', // Midnight Blue for good readability
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.9,
  },

  // Loading and error states
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },

  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500',
  },

  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },

  errorSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  categoryBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    marginHorizontal: 0,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  universityMarker: {
    backgroundColor: '#3B82F6',
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
  },
  attractionMarker: {
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
  },
  listingMarker: {
    backgroundColor: '#EF4444',
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
  },
  legend: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  legendText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  toggleButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 2,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});
