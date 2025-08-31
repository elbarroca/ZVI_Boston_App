// app/(tabs)/index.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, ActivityIndicator, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getListings } from '@/lib/api';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage, TranslationKey, LANGUAGES } from '@/context/language-provider';
import ListingCard from '@/components/listingcard';
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

  // Debounce the applied filters to prevent excessive API calls
  const debouncedAppliedFilters = useDebounce(appliedFilters, 500);

  // Debug: Log when debounced filters change
  useEffect(() => {
    if (__DEV__) {
      console.log('=== Debounced Filters Changed ===');
      console.log('Applied filters:', appliedFilters);
      console.log('Debounced filters:', debouncedAppliedFilters);
      console.log('Are they equal?', JSON.stringify(appliedFilters) === JSON.stringify(debouncedAppliedFilters));
      console.log('========================');
    }
  }, [appliedFilters, debouncedAppliedFilters]);

  // Pass debounced filters to the query to prevent constant refetching
  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings', debouncedAppliedFilters],
    queryFn: () => {
      if (__DEV__) {
        console.log('=== useQuery calling getListings ===');
        console.log('Debounced filters being sent:', debouncedAppliedFilters);
        console.log('========================');
      }
      return getListings(debouncedAppliedFilters);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleApplyFilters = () => {
    if (__DEV__) {
      console.log('=== Applying Filters ===');
      console.log('Draft filters:', draftFilters);
      console.log('Applied filters before:', appliedFilters);
    }

    // Apply the draft filters to the applied filters
    setAppliedFilters(draftFilters);
    setFilterModalVisible(false);

    if (__DEV__) {
      console.log('Applied filters after:', draftFilters);
      console.log('========================');
    }
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
      <Stack.Screen
        options={{
          title: t('findYourPlace'),
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text
          },
          headerTitleAlign: 'center',
        }}
      />

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
                { backgroundColor: colors.primary },
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

          {/* Middle section - Active filters (expands to fill space) */}
          {Object.values(appliedFilters).some(value => value !== '' && value !== undefined) && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
              {getActiveFilters().map((filter, index) => (
                <View key={index} style={[styles.activeFilterChip, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.activeFilterText, { color: colors.primary }]}>{filter}</Text>
                  <Pressable
                    onPress={() => removeFilter(filter)}
                    style={styles.removeFilterButton}
                  >
                    <Ionicons name="close" size={12} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

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

      {/* Scrollable Content */}
      <View style={styles.scrollableContent}>
        <FlatList
          data={listings}
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
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
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
              <TextInput style={styles.input} placeholder={t('minPrice')} value={draftFilters.minPrice} onChangeText={(text) => setDraftFilters(f => ({ ...f, minPrice: text }))} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder={t('maxPrice')} value={draftFilters.maxPrice} onChangeText={(text) => setDraftFilters(f => ({ ...f, maxPrice: text }))} keyboardType="numeric" />
            </View>
          </View>

          {/* Bedrooms */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <Ionicons name="bed" size={18} color={colors.primary} />
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t('bedrooms')}</Text>
            </View>
            <View style={styles.chipContainer}>
              {['1', '2', '3', '4+'].map(num => (
                              <Pressable key={num} style={[styles.chip, draftFilters.beds === num && styles.chipSelected]} onPress={() => setDraftFilters(f => ({ ...f, beds: f.beds === num ? '' : num }))}>
                <Text style={[styles.chipText, draftFilters.beds === num && styles.chipTextSelected]}>
                  {num} {num !== '4+' ? t('bed') : t('beds')}
                </Text>
              </Pressable>
              ))}
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
              ].map(({ value, key }) => (
                <Pressable key={value} style={[styles.chip, draftFilters.laundry === value && styles.chipSelected]} onPress={() => setDraftFilters(f => ({ ...f, laundry: f.laundry === value ? '' : value }))}>
                  <Text style={[styles.chipText, draftFilters.laundry === value && styles.chipTextSelected]}>
                    {t(key as TranslationKey)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Amenities */}
          <View style={styles.filterSection}>
            <View style={styles.filterSectionHeader}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t('mustHaves')}</Text>
            </View>
            <View style={styles.chipContainer}>
              <Pressable style={[styles.chip, draftFilters.parking && styles.chipSelected]} onPress={() => setDraftFilters(f => ({ ...f, parking: !f.parking }))}>
                <Text style={[styles.chipText, draftFilters.parking && styles.chipTextSelected]}>
                  {t('parking')}
                </Text>
              </Pressable>
              <Pressable style={[styles.chip, draftFilters.pets_allowed && styles.chipSelected]} onPress={() => setDraftFilters(f => ({ ...f, pets_allowed: !f.pets_allowed }))}>
                <Text style={[styles.chipText, draftFilters.pets_allowed && styles.chipTextSelected]}>
                  {t('petsAllowed')}
                </Text>
              </Pressable>
              <Pressable style={[styles.chip, draftFilters.is_furnished && styles.chipSelected]} onPress={() => setDraftFilters(f => ({ ...f, is_furnished: !f.is_furnished }))}>
                <Text style={[styles.chipText, draftFilters.is_furnished && styles.chipTextSelected]}>
                  {t('furnished')}
                </Text>
              </Pressable>
              <Pressable style={[styles.chip, draftFilters.utilities_included && styles.chipSelected]} onPress={() => setDraftFilters(f => ({ ...f, utilities_included: !f.utilities_included }))}>
                <Text style={[styles.chipText, draftFilters.utilities_included && styles.chipTextSelected]}>
                  {t('utilitiesIncluded')}
                </Text>
              </Pressable>
              <Pressable style={[styles.chip, draftFilters.broker_fee_required === false && styles.chipSelected]} onPress={() => setDraftFilters(f => ({ ...f, broker_fee_required: f.broker_fee_required === false ? undefined : false }))}>
                <Text style={[styles.chipText, draftFilters.broker_fee_required === false && styles.chipTextSelected]}>
                  {t('noBrokerFee')}
                </Text>
              </Pressable>
            </View>
          </View>





          <Pressable style={[styles.applyButton, { backgroundColor: colors.primary }]} onPress={handleApplyFilters}>
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
        <View style={[styles.languageModal, { backgroundColor: colors.surface }]}>
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
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 8,
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
      // gap: 8, // Removed to ensure proper spacing with justifyContent: 'space-between'
      // flex: 1, // Removed to allow content to dictate width, while children manage their own flex
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
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 6,
      gap: 3,
    },
    activeFilterText: {
      fontSize: 11,
      fontWeight: '500',
    },
    removeFilterButton: {
      padding: 2,
    },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: 'white', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, position: 'absolute', bottom: 0, left: 0, right: 0 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modalTitle: { fontSize: 24, fontWeight: 'bold' },
    resetText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
    filterSection: { marginBottom: 24, paddingVertical: 8 },
    filterSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    filterSectionTitle: { fontSize: 16, fontWeight: '600' },
    priceInputContainer: { flexDirection: 'row', gap: 12 },
    inputContainer: { marginBottom: 16 },
    input: { flex: 1, backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, fontSize: 16 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    chip: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
    chipSelected: { backgroundColor: '#00A896' },
    chipText: { fontSize: 13, color: '#374151' },
    chipTextSelected: { color: 'white', fontWeight: '600' },
    applyButton: { backgroundColor: '#00A896', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', marginTop: 24, flexDirection: 'row', gap: 8 },
    applyButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
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
      backgroundColor: 'white',
      margin: 20,
      borderRadius: 20,
      padding: 20,
      maxHeight: '70%',
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
});
