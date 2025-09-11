// components/ListingsMapView.tsx
import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Pressable, Modal, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getListings } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/context/language-provider';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import Filters, { FilterState } from './Filters';
import { BOSTON_NEIGHBORHOODS } from '@/lib/neighborhoods';

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
const BostonAreaMap = React.memo(({
  listings,
  router,
  showUniversities = true,
  showAttractions = true,
  showListings = true,
  appliedFilters
}: {
  listings: any[],
  router: any,
  showUniversities?: boolean,
  showAttractions?: boolean,
  showListings?: boolean,
  appliedFilters?: FilterState
}) => {
  const { t } = useLanguage();

  // Filter listings based on applied filters - optimized with early returns
  const filteredListings = useMemo(() => {
    if (!appliedFilters || !showListings || !listings?.length) return [];

    const hasFilters = Object.values(appliedFilters).some(value =>
      value !== '' && value !== undefined && value !== null
    );

    if (!hasFilters) return listings.filter(listing =>
      listing.latitude && listing.longitude
    );

    return listings.filter(listing => {
      // Skip listings without coordinates
      if (!listing.latitude || !listing.longitude) return false;

      // Price filter
      const price = parseFloat(listing.price_per_month);
      if (appliedFilters.minPrice && price < parseFloat(appliedFilters.minPrice)) return false;
      if (appliedFilters.maxPrice && price > parseFloat(appliedFilters.maxPrice)) return false;

      // Bedrooms filter
      if (appliedFilters.beds && listing.bedrooms !== parseInt(appliedFilters.beds)) return false;

      // Laundry filter
      if (appliedFilters.laundry) {
        const hasLaundryInUnit = listing.laundry_in_unit;
        const hasLaundryOnSite = listing.laundry_on_site;
        if (appliedFilters.laundry === 'in-unit' && !hasLaundryInUnit) return false;
        if (appliedFilters.laundry === 'on-site' && !hasLaundryOnSite) return false;
        if (appliedFilters.laundry === 'none' && (hasLaundryInUnit || hasLaundryOnSite)) return false;
      }

      // Amenities filters - use early returns for performance
      if (appliedFilters.parking && !listing.parking) return false;
      if (appliedFilters.pets_allowed && !listing.pets_allowed) return false;
      if (appliedFilters.is_furnished && !listing.is_furnished) return false;
      if (appliedFilters.utilities_included && !listing.utilities_included) return false;
      if (appliedFilters.broker_fee_required === false && listing.broker_fee_required) return false;

      // Neighborhood filter - optimized
      if (appliedFilters.neighborhood) {
        const selectedNeighborhoods = appliedFilters.neighborhood.split(',').map(n => n.trim());
        const listingNeighborhood = listing.neighborhood?.toLowerCase();
        if (!listingNeighborhood) return false;

        const matchesNeighborhood = selectedNeighborhoods.some(selected => {
          const neighborhoodObj = BOSTON_NEIGHBORHOODS.find(n =>
            n.name.toLowerCase().includes(selected.toLowerCase()) ||
            n.id.toLowerCase().includes(selected.toLowerCase())
          );
          return neighborhoodObj && listingNeighborhood.includes(
            neighborhoodObj.name.toLowerCase().replace('boston - ', '')
          );
        });
        if (!matchesNeighborhood) return false;
      }

      return true;
    });
  }, [listings, appliedFilters, showListings]);

  // Boston city center as default region
  const bostonRegion = {
    latitude: 42.3601,
    longitude: -71.0589,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  // Memoize markers to prevent unnecessary re-renders
  const universityMarkers = useMemo(() =>
    showUniversities ? universityPins.map(pin => (
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
    )) : [], [showUniversities]);

  const attractionMarkers = useMemo(() =>
    showAttractions ? attractionPins.map(pin => (
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
    )) : [], [showAttractions]);

  const listingMarkers = useMemo(() =>
    filteredListings.map(listing => (
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
    )), [filteredListings, router]);

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
        {universityMarkers}
        {attractionMarkers}
        {listingMarkers}
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
});

const ListingsMapView = React.memo(function ListingsMapView({ hideHeader = false }: { hideHeader?: boolean }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { theme: themeMode } = useTheme();
  const colors = themeColors[themeMode];
  const [showOverlay, setShowOverlay] = useState(!hideHeader);

  // Filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    minPrice: '',
    maxPrice: '',
    beds: '',
    laundry: '',
    parking: undefined,
    pets_allowed: undefined,
    is_furnished: undefined,
    utilities_included: undefined,
    broker_fee_required: undefined,
    neighborhood: '',
    nearUniversity: '',
    transportDistance: '',
    showAllNeighborhoods: false
  });
  const [draftFilters, setDraftFilters] = useState<FilterState>(appliedFilters);

  // Visibility toggles
  const [visibilitySettings, setVisibilitySettings] = useState({
    showUniversities: true,
    showAttractions: true,
    showListings: true
  });

  const toggleOverlay = () => setShowOverlay(prev => !prev);

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings-map-data'],
    queryFn: () => getListings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Filter handlers
  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    const resetFilters: FilterState = {
      minPrice: '',
      maxPrice: '',
      beds: '',
      laundry: '',
      parking: undefined,
      pets_allowed: undefined,
      is_furnished: undefined,
      utilities_included: undefined,
      broker_fee_required: undefined,
      neighborhood: '',
      nearUniversity: '',
      transportDistance: '',
      showAllNeighborhoods: false
    };
    setDraftFilters(resetFilters);
    setAppliedFilters(resetFilters);
  };

  const toggleVisibility = (key: keyof typeof visibilitySettings) => {
    setVisibilitySettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Sync draft filters with applied filters when filter modal opens
  React.useEffect(() => {
    if (showFilterModal) {
      setDraftFilters(appliedFilters);
    }
  }, [showFilterModal, appliedFilters]);

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

      {/* Filter and Visibility Buttons */}
      <View style={styles.controlButtons}>
        <Pressable
          style={[styles.controlButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable
          style={[styles.controlButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => setShowVisibilityModal(true)}
        >
          <Ionicons name="layers" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <BostonAreaMap
        listings={listings ?? []}
        router={router}
        showUniversities={visibilitySettings.showUniversities}
        showAttractions={visibilitySettings.showAttractions}
        showListings={visibilitySettings.showListings}
        appliedFilters={appliedFilters}
      />
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

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFilterModal}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowFilterModal(false)} />
        <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Filter Map
            </Text>
            <Pressable
              style={[styles.minimalCloseButton, { backgroundColor: 'transparent' }]}
              onPress={() => setShowFilterModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Filters
            filters={draftFilters}
            onFiltersChange={setDraftFilters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            isMapView={true}
            showNeighborhoods={true}
          />
        </View>
      </Modal>

      {/* Visibility Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showVisibilityModal}
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowVisibilityModal(false)} />
        <View style={[styles.visibilityModalContent, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Map Layers
            </Text>
            <Pressable
              style={[styles.minimalCloseButton, { backgroundColor: 'transparent' }]}
              onPress={() => setShowVisibilityModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.visibilityOptions}>
            <Pressable
              style={styles.visibilityOption}
              onPress={() => toggleVisibility('showUniversities')}
            >
              <View style={[styles.visibilityIndicator, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.visibilityText, { color: colors.text }]}>
                {t('universities') || 'Universities'}
              </Text>
              <Ionicons
                name={visibilitySettings.showUniversities ? "checkbox" : "square-outline"}
                size={24}
                color={visibilitySettings.showUniversities ? colors.primary : colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={styles.visibilityOption}
              onPress={() => toggleVisibility('showAttractions')}
            >
              <View style={[styles.visibilityIndicator, { backgroundColor: '#1570ef' }]} />
              <Text style={[styles.visibilityText, { color: colors.text }]}>
                {t('attractions') || 'Attractions'}
              </Text>
              <Ionicons
                name={visibilitySettings.showAttractions ? "checkbox" : "square-outline"}
                size={24}
                color={visibilitySettings.showAttractions ? colors.primary : colors.textSecondary}
              />
            </Pressable>

            <Pressable
              style={styles.visibilityOption}
              onPress={() => toggleVisibility('showListings')}
            >
              <View style={[styles.visibilityIndicator, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.visibilityText, { color: colors.text }]}>
                {t('housing') || 'Housing'}
              </Text>
              <Ionicons
                name={visibilitySettings.showListings ? "checkbox" : "square-outline"}
                size={24}
                color={visibilitySettings.showListings ? colors.primary : colors.textSecondary}
              />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
});

export default ListingsMapView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  controlButtons: {
    position: 'absolute',
    top: 110,
    right: 20,
    zIndex: 2,
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  filterModalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  visibilityModalContent: {
    margin: 20,
    borderRadius: 24,
    padding: 20,
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  minimalCloseButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityOptions: {
    gap: 16,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  visibilityIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  visibilityText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
