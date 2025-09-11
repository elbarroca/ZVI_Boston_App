// components/Filters.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/context/language-provider';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { BOSTON_NEIGHBORHOODS, getNeighborhoodsByCategory } from '@/lib/neighborhoods';

export interface FilterState {
  minPrice: string;
  maxPrice: string;
  beds: string;
  laundry: string;
  parking: boolean | undefined;
  pets_allowed: boolean | undefined;
  is_furnished: boolean | undefined;
  utilities_included: boolean | undefined;
  broker_fee_required: boolean | undefined;
  neighborhood: string;
  nearUniversity: string;
  transportDistance: string;
  showAllNeighborhoods: boolean;
}

interface FiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApply: () => void;
  onReset?: () => void;
  isMapView?: boolean;
  showNeighborhoods?: boolean;
}

const MAJOR_NEIGHBORHOODS = [
  'boston-allston', 'boston-back-bay', 'boston-beacon-hill', 'boston-brighton',
  'boston-charlestown', 'boston-chinatown', 'boston-dorchester', 'boston-fenway',
  'boston-financial-district', 'boston-jamaica-plain', 'boston-kenmore',
  'boston-north-end', 'boston-south-end', 'boston-south-boston'
];

export default function Filters({
  filters,
  onFiltersChange,
  onApply,
  onReset,
  isMapView = false,
  showNeighborhoods = true
}: FiltersProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];

  const displayedNeighborhoods = useMemo(() => {
    if (filters.showAllNeighborhoods) {
      return BOSTON_NEIGHBORHOODS;
    }
    return BOSTON_NEIGHBORHOODS.filter(n => MAJOR_NEIGHBORHOODS.includes(n.id));
  }, [filters.showAllNeighborhoods]);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleNeighborhood = (neighborhoodId: string) => {
    const currentNeighborhoods = filters.neighborhood ? filters.neighborhood.split(',').filter(n => n.trim()) : [];
    const isSelected = currentNeighborhoods.includes(neighborhoodId);

    let newNeighborhoods;
    if (isSelected) {
      newNeighborhoods = currentNeighborhoods.filter(n => n !== neighborhoodId);
    } else {
      newNeighborhoods = [...currentNeighborhoods, neighborhoodId];
    }

    updateFilter('neighborhood', newNeighborhoods.join(', '));
  };

  const isNeighborhoodSelected = (neighborhoodId: string) => {
    const currentNeighborhoods = filters.neighborhood ? filters.neighborhood.split(',').map(n => n.trim()) : [];
    return currentNeighborhoods.includes(neighborhoodId);
  };

  const renderNeighborhoodSection = () => {
    if (!showNeighborhoods) return null;

    return (
      <View style={styles.filterSection}>
        <View style={styles.filterSectionHeader}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t('neighborhood')}</Text>
        </View>

        <View style={styles.neighborhoodContainer}>
          {displayedNeighborhoods.map((neighborhood) => {
            const isSelected = isNeighborhoodSelected(neighborhood.id);
            return (
              <Pressable
                key={neighborhood.id}
                style={[
                  styles.neighborhoodChip,
                  isSelected && styles.neighborhoodChipSelected,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => toggleNeighborhood(neighborhood.id)}
              >
                <Text style={[
                  styles.neighborhoodChipText,
                  isSelected && styles.neighborhoodChipTextSelected,
                  { color: isSelected ? '#FFFFFF' : colors.text }
                ]}>
                  {neighborhood.name.replace('Boston - ', '').replace('Cambridge - ', '').replace('Brookline - ', '')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!filters.showAllNeighborhoods && (
          <Pressable
            style={[styles.showMoreButton, { backgroundColor: colors.primary + '20' }]}
            onPress={() => updateFilter('showAllNeighborhoods', true)}
          >
            <Text style={[styles.showMoreText, { color: colors.primary }]}>
              {t('showAllNeighborhoods')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </Pressable>
        )}

        {filters.showAllNeighborhoods && (
          <Pressable
            style={[styles.showMoreButton, { backgroundColor: colors.primary + '20' }]}
            onPress={() => updateFilter('showAllNeighborhoods', false)}
          >
            <Text style={[styles.showMoreText, { color: colors.primary }]}>
              {t('showMajorNeighborhoods')}
            </Text>
            <Ionicons name="chevron-up" size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Component Header */}
      <View style={styles.componentHeader}>
        <Text style={[styles.componentTitle, { color: colors.text }]}>
          {isMapView ? t('mapFilters') : t('findYourPerfectHome')}
        </Text>
        <Text style={[styles.componentSubtitle, { color: colors.textSecondary }]}>
          {isMapView ? t('filterListingsOnMap') : t('customizeSearchPreferences')}
        </Text>
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
            }]}
            placeholder={t('minPrice')}
            placeholderTextColor={colors.textSecondary}
            value={filters.minPrice}
            onChangeText={(text) => updateFilter('minPrice', text)}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <TextInput
            style={[styles.input, {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }]}
            placeholder={t('maxPrice')}
            placeholderTextColor={colors.textSecondary}
            value={filters.maxPrice}
            onChangeText={(text) => updateFilter('maxPrice', text)}
            keyboardType="decimal-pad"
            returnKeyType="done"
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
            const isSelected = filters.beds === num;
            return (
              <Pressable
                key={num}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => updateFilter('beds', filters.beds === num ? '' : num)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                    { color: isSelected ? '#FFFFFF' : colors.text }
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
            const isSelected = filters.laundry === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => updateFilter('laundry', filters.laundry === value ? '' : value)}
              >
                <Text style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                  { color: isSelected ? '#FFFFFF' : colors.text }
                ]}>
                  {t(key as any)}
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
          {[
            { key: 'parking', value: 'parking' },
            { key: 'petsAllowed', value: 'pets_allowed' },
            { key: 'furnished', value: 'is_furnished' },
            { key: 'utilitiesIncluded', value: 'utilities_included' },
            { key: 'noBrokerFee', value: 'broker_fee_required' }
          ].map(({ key, value }) => {
            const isSelected = filters[value as keyof FilterState] === (value === 'broker_fee_required' ? false : true);
            return (
              <Pressable
                key={value}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => {
                  const currentValue = filters[value as keyof FilterState];
                  const newValue = value === 'broker_fee_required'
                    ? (currentValue === false ? undefined : false)
                    : !currentValue;
                  updateFilter(value as keyof FilterState, newValue);
                }}
              >
                <Text style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                  { color: isSelected ? '#FFFFFF' : colors.text }
                ]}>
                  {t(key as any)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Neighborhoods */}
      {renderNeighborhoodSection()}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {onReset && (
          <Pressable
            style={[styles.resetButton, { borderColor: colors.primary }]}
            onPress={onReset}
          >
            <Ionicons name="refresh" size={18} color={colors.primary} />
            <Text style={[styles.resetButtonText, { color: colors.primary }]}>
              {t('resetAll') || 'Reset All'}
            </Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.applyButton, { backgroundColor: colors.primary }]}
          onPress={onApply}
        >
          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
          <Text style={styles.applyButtonText}>
            {t('applyFilters') || 'Apply Filters'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  componentHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  componentTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  componentSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '400',
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chipSelected: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    fontWeight: '600',
  },
  neighborhoodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  neighborhoodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  neighborhoodChipSelected: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  neighborhoodChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  neighborhoodChipTextSelected: {
    fontWeight: '600',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    flexDirection: 'row',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
