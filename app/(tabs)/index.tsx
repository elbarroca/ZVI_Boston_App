// app/(tabs)/index.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, Alert, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { getListings } from '@/lib/api';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage, TranslationKey, LANGUAGES } from '@/context/language-provider';
import ListingCard from '@/components/listingcard';
import { validateImageUrl } from '@/lib/utils';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Filters, { FilterState } from '@/components/Filters';

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function FeedScreen() {
  const { theme } = useTheme();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const colors = themeColors[theme];

  // Track if we've loaded initial filters to prevent unnecessary re-renders
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Debug logging (only in development)
  useEffect(() => {
    if (__DEV__) {
      console.log('FeedScreen language changed to:', currentLanguage.name);
    }
  }, [currentLanguage.name]);

  // Applied filters (used for API calls)
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

  // Draft filters (used for UI inputs)
  const [draftFilters, setDraftFilters] = useState<FilterState>({
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

  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);


  // Filter persistence functions
  const saveFiltersToStorage = async (filters: FilterState) => {
    try {
      await AsyncStorage.setItem('feedFilters', JSON.stringify(filters));
    } catch (error) {
      console.warn('Failed to save filters to storage:', error);
    }
  };

  const loadFiltersFromStorage = async (): Promise<FilterState | null> => {
    try {
      const stored = await AsyncStorage.getItem('feedFilters');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to load filters from storage:', error);
      return null;
    }
  };

  // Debounce the applied filters to prevent excessive API calls
  const debouncedAppliedFilters = useDebounce(appliedFilters, 500);

  // Create a stable query key for React Query
  const queryKey = useMemo(() => {
    // Only include non-empty filters in the query key to prevent unnecessary refetches
    const keyFilters: any = {};
    Object.entries(debouncedAppliedFilters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        keyFilters[key] = value;
      }
    });
    return ['listings', keyFilters];
  }, [debouncedAppliedFilters]);

  // Load filters from storage on component mount
  useEffect(() => {
    const loadFilters = async () => {
      const storedFilters = await loadFiltersFromStorage();
      if (storedFilters) {
        setAppliedFilters(storedFilters);
        setDraftFilters(storedFilters);
      }
      setFiltersInitialized(true);
    };
    loadFilters();
  }, []);

  // Save filters to storage whenever applied filters change (only after initialization)
  useEffect(() => {
    if (!filtersInitialized) return;

    const saveFilters = async () => {
      if (Object.values(appliedFilters).some(value => value !== '' && value !== undefined)) {
        await saveFiltersToStorage(appliedFilters);
      }
    };
    saveFilters();
  }, [appliedFilters, filtersInitialized]);

  // Clear navigation source on component mount (we're now on the feed screen)
  useEffect(() => {
    AsyncStorage.removeItem('navigationSource').catch(() => {});
  }, []);

  // Sync draft filters with applied filters when modal opens
  useEffect(() => {
    if (isFilterModalVisible) {
      setDraftFilters(appliedFilters);
    }
  }, [isFilterModalVisible, appliedFilters]);

  // Pass debounced filters to the query to prevent constant refetching
  const { data: listings, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => getListings(debouncedAppliedFilters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Only refetch when the query key actually changes (not just object reference)
    refetchOnWindowFocus: false,
  });

  // Get active filters for display - memoized to update when filters change
  const activeFilters = useMemo(() => {
    const activeFilters: string[] = [];

    if (appliedFilters.minPrice && appliedFilters.minPrice.trim() !== '') {
      activeFilters.push(`Min: $${appliedFilters.minPrice}`);
    }
    if (appliedFilters.maxPrice && appliedFilters.maxPrice.trim() !== '') {
      activeFilters.push(`Max: $${appliedFilters.maxPrice}`);
    }
    if (appliedFilters.beds && appliedFilters.beds !== '' && appliedFilters.beds !== '0') {
      activeFilters.push(`${appliedFilters.beds === '4+' ? '4+ bedrooms' : appliedFilters.beds + ' bedroom'}`);
    }
    if (appliedFilters.laundry && appliedFilters.laundry !== '') {
      const laundryLabels: { [key: string]: string } = {
        'in-unit': 'In-unit laundry',
        'on-site': 'On-site laundry',
        'none': 'No laundry'
      };
      activeFilters.push(laundryLabels[appliedFilters.laundry]);
    }
    if (appliedFilters.parking === true) {
      activeFilters.push('Parking available');
    }
    if (appliedFilters.pets_allowed === true) {
      activeFilters.push('Pet friendly');
    }
    if (appliedFilters.is_furnished === true) {
      activeFilters.push('Furnished');
    }
    if (appliedFilters.utilities_included === true) {
      activeFilters.push('Utilities included');
    }
    if (appliedFilters.broker_fee_required === false) {
      activeFilters.push('No broker fee');
    }
    if (appliedFilters.neighborhood && appliedFilters.neighborhood.trim()) {
      const neighborhoods = appliedFilters.neighborhood.split(',').map(n => n.trim()).filter(n => n.length > 0);
      if (neighborhoods.length === 1) {
        activeFilters.push(`Neighborhood: ${neighborhoods[0]}`);
      } else if (neighborhoods.length > 1) {
        activeFilters.push(`${neighborhoods.length} neighborhoods selected`);
      }
    }

    return activeFilters;
  }, [appliedFilters]);

  const handleApplyFilters = () => {
    // Apply the draft filters to the applied filters
    setAppliedFilters(draftFilters);
    setFilterModalVisible(false);
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


  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.center} />;
  }

  if (isError) {
    return <Text style={styles.center}>Failed to fetch listings. Please try again.</Text>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Section */}
      <View style={[styles.headerSection, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          🏠 {t('discoverYourHome')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary || '#6B7280' }]}>
          {t('findIdealRental')}
        </Text>
      </View>

      {/* Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.background }]}>
        <View style={styles.filterBarContent}>
          {/* Left side - Filter button */}
          <View style={styles.leftSection}>
            <Pressable
              style={[
                styles.filterButton,
                { backgroundColor: '#1570ef' },
                { alignSelf: 'flex-start' }
              ]}
              onPress={() => setFilterModalVisible(true)}
            >
              <Ionicons name="filter" size={20} color="white" />
              <Text style={styles.filterButtonText}>{t('filters')}</Text>
              {Object.values(appliedFilters).some(value => value !== '' && value !== undefined) && (
                <View style={styles.activeFilterDot} />
              )}
            </Pressable>
          </View>

          {/* Right side - Language Selector */}
          <View style={styles.rightSection}>
            <Pressable
              style={[styles.languageSelector, { backgroundColor: colors.surface }]}
              onPress={() => setLanguageModalVisible(true)}
            >
              <Text style={styles.languageFlag}>{currentLanguage.flag}</Text>
              <Text style={[styles.languageText, { color: colors.textSecondary }]}>
                {currentLanguage.nativeName}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Scrollable Content with Active Filters */}
      <View style={styles.scrollableContent}>
        {/* Active Filters Display - Now inside scrollable area */}
        {activeFilters.length > 0 && (
          <View style={[styles.activeFiltersSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.activeFiltersTitle, { color: colors.primary }]}>
              {t('activeFilters')} ({activeFilters.length})
            </Text>
            <View style={styles.activeFiltersList}>
              {activeFilters.map((filter, index) => (
                <View key={index} style={styles.activeFilterItem}>
                  <View style={[styles.activeFilterBullet, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.activeFilterText, { color: colors.text }]}>
                    {filter}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <FlatList
          data={listings?.filter(listing => {
            // Basic validation
            if (!listing || typeof listing !== 'object' || !listing.id) {
              return false;
            }

            // Validate image URL to prevent console errors
            const validatedImageUrl = validateImageUrl(listing.preview_image);
            if (validatedImageUrl === 'https://placehold.co/600x400' && listing.preview_image) {
              // If we got a placeholder but had an original URL, log it but still show the listing
              if (__DEV__) {
                console.warn('FeedScreen: Invalid image URL for listing:', listing.id, listing.preview_image);
              }
            }

            return true;
          }) || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ListingCard listing={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          ListHeaderComponent={
            activeFilters.length > 0 ? <View style={{ height: 20 }} /> : null
          }
        />
      </View>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isFilterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterModalVisible(false)} />
        <View style={[styles.modalContent, {
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
        }]}>
          {/* Close button at top right */}
          <Pressable
            style={styles.closeButton}
            onPress={() => setFilterModalVisible(false)}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>

          <Filters
            filters={draftFilters}
            onFiltersChange={setDraftFilters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            isMapView={false}
            showNeighborhoods={true}
          />





        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={isLanguageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLanguageModalVisible(false)} />
        <View style={[styles.languageModal, {
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 16,
        }]}>
          <Text style={[styles.languageModalTitle, { color: colors.text }]}>
            {t('selectLanguage')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {LANGUAGES.map((language) => (
              <Pressable
                key={language.code}
                style={[
                  styles.languageOption,
                  { borderBottomColor: colors.border },
                  currentLanguage.code === language.code && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setLanguage(language);
                  setLanguageModalVisible(false);
                }}
              >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <View style={styles.languageDetails}>
                  <Text style={[styles.languageName, { color: colors.text }]}>
                    {language.name}
                  </Text>
                  <Text style={[styles.languageNativeName, { color: colors.textSecondary }]}>
                    {language.nativeName}
                  </Text>
                </View>
                {currentLanguage.code === language.code && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={[styles.languageCloseButton, { backgroundColor: colors.primary }]}
            onPress={() => setLanguageModalVisible(false)}
          >
            <Text style={styles.languageCloseText}>{t('done')}</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F7F7' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollableContent: { flex: 1 },
    listContent: { padding: 16 },
    headerSection: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB'
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 6,
    },
    headerSubtitle: {
      fontSize: 16,
      textAlign: 'center',
      opacity: 0.8,
    },
    filterBar: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    filterBarContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 25,
      gap: 8,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    filterButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    activeFilterDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'white',
      marginLeft: 4,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
      padding: 16,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '80%',
      // iOS-style modal shadows
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 16,
      // Theme-aware styling
      borderWidth: 0.5,
      borderTopWidth: 0,
      borderColor: 'rgba(0,0,0,0.1)',
    },
    languageSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14, // Slightly less padding to fit in line
      paddingVertical: 8,
      borderRadius: 25, // More rounded, pill-shaped
      gap: 6,
      elevation: 4, // Android shadow
      shadowColor: '#000', // iOS shadow
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    languageFlag: {
      fontSize: 18, // Slightly larger flag
    },
    languageText: {
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'left',
    },
    languageModal: {
      margin: 20,
      borderRadius: 24,
      padding: 20,
      maxHeight: '70%',
      // iOS-style modal appearance
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 12,
      // Theme-aware colors will be applied inline
    },
    languageModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
    },
    languageOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      gap: 12,
    },
    languageDetails: {
      flex: 1,
      gap: 2,
    },
    languageName: {
      fontSize: 16,
      fontWeight: '600',
    },
    languageNativeName: {
      fontSize: 14,
    },
    languageCloseButton: {
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
    },
    languageCloseText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 1,
      padding: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    activeFiltersSection: {
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    activeFiltersTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 10,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    activeFiltersList: {
      gap: 8,
    },
    activeFilterItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    activeFilterBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    activeFilterText: {
      fontSize: 14,
      flex: 1,
      lineHeight: 18,
      fontWeight: '500',
    },
});
