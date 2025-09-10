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

interface FilterState {
  minPrice: string;
  maxPrice: string;
  beds: string;
  laundry: string;
  parking: boolean | undefined;
  pets_allowed: boolean | undefined;
  is_furnished: boolean | undefined;
  utilities_included: boolean | undefined;
  broker_fee_required: boolean | undefined;
}

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


  // Debug logging
  useEffect(() => {
    console.log('FeedScreen language changed to:', currentLanguage.name);
  }, [currentLanguage]);

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
    broker_fee_required: undefined
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
    broker_fee_required: undefined
  });

  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isLanguageModalVisible, setLanguageModalVisible] = useState(false);

  // Animation values for chip interactions
  const chipScaleAnim = React.useRef(new Animated.Value(1)).current;

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

  // Removed verbose filter logging to reduce console spam

  // Load filters from storage on component mount
  useEffect(() => {
    const loadFilters = async () => {
      const storedFilters = await loadFiltersFromStorage();
      if (storedFilters) {
        setAppliedFilters(storedFilters);
        setDraftFilters(storedFilters);
      }
    };
    loadFilters();
  }, []);

  // Save filters to storage whenever applied filters change
  useEffect(() => {
    if (Object.values(appliedFilters).some(value => value !== '' && value !== undefined)) {
      saveFiltersToStorage(appliedFilters);
    }
  }, [appliedFilters]);

  // Clear navigation source on component mount (we're now on the feed screen)
  useEffect(() => {
    AsyncStorage.removeItem('navigationSource').catch(() => {});
  }, []);

  // Pass debounced filters to the query to prevent constant refetching
  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings', debouncedAppliedFilters],
    queryFn: () => getListings(debouncedAppliedFilters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleApplyFilters = () => {
    // Apply the draft filters to the applied filters
    setAppliedFilters(draftFilters);
    setFilterModalVisible(false);
  };

  const getActiveFilters = () => {
    const activeFilters: string[] = [];
    if (appliedFilters.minPrice || appliedFilters.maxPrice) {
      activeFilters.push(`$${appliedFilters.minPrice || '0'}-$${appliedFilters.maxPrice || '∞'}`);
    }
    if (appliedFilters.beds) {
      activeFilters.push(`${appliedFilters.beds} ${appliedFilters.beds === '4+' ? t('beds') : t('bed')}`);
    }
    if (appliedFilters.laundry) {
      activeFilters.push(`${t('laundry')}: ${appliedFilters.laundry === 'in-unit' ? t('inUnit') : appliedFilters.laundry === 'on-site' ? t('onSite') : t('none')}`);
    }
    if (appliedFilters.parking) activeFilters.push(t('parking'));
    if (appliedFilters.pets_allowed) activeFilters.push(t('petsAllowed'));
    if (appliedFilters.is_furnished) activeFilters.push(t('furnished'));
    if (appliedFilters.utilities_included) activeFilters.push(t('utilitiesIncluded'));
    if (appliedFilters.broker_fee_required === false) activeFilters.push(t('noBrokerFee'));
    return activeFilters;
  };

  const removeFilter = (filterText: string) => {
    const newAppliedFilters = { ...appliedFilters };
    const newDraftFilters = { ...draftFilters };

    if (filterText.includes('$')) {
      newAppliedFilters.minPrice = '';
      newAppliedFilters.maxPrice = '';
      newDraftFilters.minPrice = '';
      newDraftFilters.maxPrice = '';
    } else if (filterText.includes(t('bed')) || filterText.includes(t('beds'))) {
      newAppliedFilters.beds = '';
      newDraftFilters.beds = '';
    } else if (filterText.includes(t('laundry'))) {
      newAppliedFilters.laundry = '';
      newDraftFilters.laundry = '';
    } else if (filterText === t('parking')) {
      newAppliedFilters.parking = undefined;
      newDraftFilters.parking = undefined;
    } else if (filterText === t('petsAllowed')) {
      newAppliedFilters.pets_allowed = undefined;
      newDraftFilters.pets_allowed = undefined;
    } else if (filterText === t('furnished')) {
      newAppliedFilters.is_furnished = undefined;
      newDraftFilters.is_furnished = undefined;
    } else if (filterText === t('utilitiesIncluded')) {
      newAppliedFilters.utilities_included = undefined;
      newDraftFilters.utilities_included = undefined;
    } else if (filterText === t('noBrokerFee')) {
      newAppliedFilters.broker_fee_required = undefined;
      newDraftFilters.broker_fee_required = undefined;
    }

    setAppliedFilters(newAppliedFilters);
    setDraftFilters(newDraftFilters);
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
                { alignSelf: 'flex-start' } // Ensure button only takes content width
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

      {/* Applied Filters Summary */}
      {Object.values(appliedFilters).some(value => value !== '' && value !== undefined) && (
        <View style={[styles.appliedFiltersSummary, { backgroundColor: colors.surface }]}>
          <View style={styles.filterIndicators}>
            {getActiveFilters().map((filter, index) => (
              <View key={index} style={styles.filterIndicator}>
                <View style={[styles.bulletPoint, { backgroundColor: colors.primary }]} />
                <Text style={[styles.filterIndicatorText, { color: colors.textSecondary }]}>{filter}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Scrollable Content */}
      <View style={styles.scrollableContent}>
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
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Ionicons name="filter" size={24} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('filterListings')}</Text>
            </View>
            <Pressable onPress={() => {
              const resetFilters = {
                minPrice: '',
                maxPrice: '',
                beds: '',
                laundry: '',
                parking: undefined,
                pets_allowed: undefined,
                is_furnished: undefined,
                utilities_included: undefined,
                broker_fee_required: undefined
              };
              setDraftFilters(resetFilters);
              setAppliedFilters(resetFilters);
              // Clear stored filters as well
              AsyncStorage.removeItem('feedFilters').catch(() => {});
            }}>
              <Text style={[styles.resetText, { color: colors.primary }]}>{t('resetAll')}</Text>
            </Pressable>
          </View>

          {/* Price Range */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <Ionicons name="cash" size={18} color={colors.primary} />
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t('priceRange')}</Text>
            </View>
            <View style={styles.priceInputContainer}>
              <TextInput
                style={[styles.input, {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                }]}
                placeholder={t('minPrice')}
                placeholderTextColor={colors.textSecondary}
                value={draftFilters.minPrice}
                onChangeText={(text) => setDraftFilters(f => ({ ...f, minPrice: text }))}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectTextOnFocus={true}
                editable={true}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                }]}
                placeholder={t('maxPrice')}
                placeholderTextColor={colors.textSecondary}
                value={draftFilters.maxPrice}
                onChangeText={(text) => setDraftFilters(f => ({ ...f, maxPrice: text }))}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectTextOnFocus={true}
                editable={true}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Bedrooms */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <Ionicons name="bed" size={18} color={colors.primary} />
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t('bedrooms')}</Text>
            </View>
            <View style={styles.chipContainer}>
              {['1', '2', '3', '4+'].map(num => {
                const isSelected = draftFilters.beds === num;
                return (
                  <Pressable
                    key={num}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                      {
                        backgroundColor: isSelected ? '#1570ef' : colors.surface,
                        borderColor: isSelected ? '#1570ef' : colors.border,
                        shadowColor: isSelected ? '#1570ef' : colors.shadow,
                      }
                    ]}
                    onPress={() => setDraftFilters(f => ({ ...f, beds: f.beds === num ? '' : num }))}
                    android_ripple={{ color: '#1570ef30', borderless: false }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                        {
                          color: isSelected ? '#FFFFFF' : colors.text
                        }
                      ]}
                    >
                      {num} {num !== '4+' ? t('bed') : t('beds')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>



          {/* Laundry Options */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <Ionicons name="shirt" size={18} color={colors.primary} />
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t('laundry')}</Text>
            </View>
            <View style={styles.chipContainer}>
              {[
                { value: 'in-unit', key: 'inUnit' },
                { value: 'on-site', key: 'onSite' },
                { value: 'none', key: 'none' }
              ].map(({ value, key }) => {
                const isSelected = draftFilters.laundry === value;
                return (
                  <Pressable
                    key={value}
                    style={[styles.chip, isSelected && styles.chipSelected, {
                      backgroundColor: isSelected ? '#1570ef' : colors.surface,
                      borderColor: isSelected ? '#1570ef' : colors.border,
                      shadowColor: isSelected ? '#1570ef' : colors.shadow,
                    }]}
                    onPress={() => setDraftFilters(f => ({ ...f, laundry: f.laundry === value ? '' : value }))}
                    android_ripple={{ color: '#1570ef30', borderless: false }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected, {
                      color: isSelected ? '#FFFFFF' : colors.text
                    }]}>
                      {t(key as TranslationKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Amenities */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t('mustHaves')}</Text>
            </View>
            <View style={styles.chipContainer}>
              <Pressable
                style={[styles.chip, draftFilters.parking && styles.chipSelected, {
                  backgroundColor: draftFilters.parking ? '#1570ef' : colors.surface,
                  borderColor: draftFilters.parking ? '#1570ef' : colors.border,
                  shadowColor: draftFilters.parking ? '#1570ef' : colors.shadow,
                }]}
                onPress={() => setDraftFilters(f => ({ ...f, parking: !f.parking }))}
                android_ripple={{ color: '#1570ef30', borderless: false }}
              >
                <Text style={[styles.chipText, draftFilters.parking && styles.chipTextSelected, {
                  color: draftFilters.parking ? '#FFFFFF' : colors.text,
                  fontWeight: draftFilters.parking ? '700' : '500',
                  fontSize: draftFilters.parking ? 15 : 14,
                }]}>
                  {t('parking')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, draftFilters.pets_allowed && styles.chipSelected, {
                  backgroundColor: draftFilters.pets_allowed ? '#1570ef' : colors.surface,
                  borderColor: draftFilters.pets_allowed ? '#1570ef' : colors.border,
                  shadowColor: draftFilters.pets_allowed ? '#1570ef' : colors.shadow,
                }]}
                onPress={() => setDraftFilters(f => ({ ...f, pets_allowed: !f.pets_allowed }))}
                android_ripple={{ color: '#1570ef30', borderless: false }}
              >
                <Text style={[styles.chipText, draftFilters.pets_allowed && styles.chipTextSelected, {
                  color: draftFilters.pets_allowed ? '#FFFFFF' : colors.text,
                  fontWeight: draftFilters.pets_allowed ? '700' : '500',
                  fontSize: draftFilters.pets_allowed ? 15 : 14,
                }]}>
                  {t('petsAllowed')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, draftFilters.is_furnished && styles.chipSelected, {
                  backgroundColor: draftFilters.is_furnished ? '#1570ef' : colors.surface,
                  borderColor: draftFilters.is_furnished ? '#1570ef' : colors.border,
                  shadowColor: draftFilters.is_furnished ? '#1570ef' : colors.shadow,
                }]}
                onPress={() => setDraftFilters(f => ({ ...f, is_furnished: !f.is_furnished }))}
                android_ripple={{ color: '#1570ef30', borderless: false }}
              >
                <Text style={[styles.chipText, draftFilters.is_furnished && styles.chipTextSelected, {
                  color: draftFilters.is_furnished ? '#FFFFFF' : colors.text,
                  fontWeight: draftFilters.is_furnished ? '700' : '500',
                  fontSize: draftFilters.is_furnished ? 15 : 14,
                }]}>
                  {t('furnished')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, draftFilters.utilities_included && styles.chipSelected, {
                  backgroundColor: draftFilters.utilities_included ? '#1570ef' : colors.surface,
                  borderColor: draftFilters.utilities_included ? '#1570ef' : colors.border,
                  shadowColor: draftFilters.utilities_included ? '#1570ef' : colors.shadow,
                }]}
                onPress={() => setDraftFilters(f => ({ ...f, utilities_included: !f.utilities_included }))}
                android_ripple={{ color: '#1570ef30', borderless: false }}
              >
                <Text style={[styles.chipText, draftFilters.utilities_included && styles.chipTextSelected, {
                  color: draftFilters.utilities_included ? '#FFFFFF' : colors.text,
                  fontWeight: draftFilters.utilities_included ? '700' : '500',
                  fontSize: draftFilters.utilities_included ? 15 : 14,
                }]}>
                  {t('utilitiesIncluded')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, draftFilters.broker_fee_required === false && styles.chipSelected, {
                  backgroundColor: draftFilters.broker_fee_required === false ? '#1570ef' : colors.surface,
                  borderColor: draftFilters.broker_fee_required === false ? '#1570ef' : colors.border,
                  shadowColor: draftFilters.broker_fee_required === false ? '#1570ef' : colors.shadow,
                }]}
                onPress={() => setDraftFilters(f => ({ ...f, broker_fee_required: f.broker_fee_required === false ? undefined : false }))}
                android_ripple={{ color: '#1570ef30', borderless: false }}
              >
                <Text style={[styles.chipText, draftFilters.broker_fee_required === false && styles.chipTextSelected, {
                  color: draftFilters.broker_fee_required === false ? '#FFFFFF' : colors.text,
                  fontWeight: draftFilters.broker_fee_required === false ? '700' : '500',
                  fontSize: draftFilters.broker_fee_required === false ? 15 : 14,
                }]}>
                  {t('noBrokerFee')}
                </Text>
              </Pressable>
            </View>
          </View>





          <Pressable style={[styles.applyButton, {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          }]} onPress={handleApplyFilters}>
            <Ionicons name="checkmark" size={18} color="white" />
            <Text style={styles.applyButtonText}>{t('applyFilters')}</Text>
          </Pressable>
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
                  console.log('Setting language to:', language.name);
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
      justifyContent: 'space-between', // Distribute items with space between them
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start', // Ensure button only takes content width
      // marginLeft: 'auto', // Removed as justifyContent: 'space-between' handles spacing
    },
    filterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 25, // More rounded, pill-shaped
      gap: 8,
      elevation: 4, // Android shadow
      shadowColor: '#000', // iOS shadow
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
    activeFiltersScroll: {
      flex: 1,
      flexGrow: 1, // Ensure it takes up available space
    },
    activeFilterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 24,
      marginRight: 10,
      gap: 8,
      // Enhanced iOS-style shadows
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
      // Subtle border for definition
      borderWidth: 0.5,
      // Make it feel premium
      minHeight: 36,
      justifyContent: 'center',
    },
    activeFilterText: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.25,
      // Add subtle text shadow for iOS
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0, height: 0.5 },
      textShadowRadius: 1,
    },
    removeFilterButton: {
      width: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
      // Enhanced button styling
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      // Add subtle blur effect for iOS
      backdropFilter: 'blur(8px)',
    },
    modalContent: {
      padding: 16,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
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
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modalTitle: { fontSize: 24, fontWeight: 'bold' },
    resetText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
    filterSection: { marginBottom: 24, paddingVertical: 8 },
    filterSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    filterSectionTitle: { fontSize: 16, fontWeight: '600' },
    priceInputContainer: { flexDirection: 'row', gap: 12 },
    inputContainer: { marginBottom: 16 },
    input: {
      flex: 1,
      padding: 16,
      borderRadius: 12,
      fontSize: 16,
      // Theme-aware styling
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
      // Enhanced visual appeal
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 24,
      borderWidth: 1,
      // Modern styling
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      // Smooth transitions
      transform: [{ scale: 1 }],
    },
    chipSelected: {
      // Enhanced selected state with consistent blue styling
      borderColor: '#1570ef',
      borderWidth: 2,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '500',
      letterSpacing: 0.1,
    },
    chipTextSelected: {
      color: 'white',
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    applyButton: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 24,
      flexDirection: 'row',
      gap: 8,
      // Modern button styling
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 0,
    },
    applyButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.5,
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
    appliedFiltersSummary: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      marginHorizontal: 0,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    filterIndicators: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    filterIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    bulletPoint: {
      width: 6,
      height: 6,
      borderRadius: 3,
      // Color will be set inline based on theme
    },
    filterIndicatorText: {
      fontSize: 14,
      fontWeight: '500',
      letterSpacing: 0.25,
    },
});
