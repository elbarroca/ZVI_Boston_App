// components/ListingCard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, I18nManager } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/config/supabase';
import { useSupabaseAuth } from '@/context/supabase-provider';
import { useTheme } from '@/context/theme-provider';
import { useLanguage, TranslationKey } from '@/context/language-provider';
import { themeColors } from '@/constants/theme';
import { saveListing, unsaveListing } from '@/lib/api';

export type Listing = {
  id: string;
  title: string;
  price_per_month: number;
  neighborhood: string;
  location_address: string;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  property_type: string;
  university_proximity_minutes: number;
  nearest_university: string;
  laundry_type: string;
  parking_type: string;
  is_furnished: boolean;
  utilities_included: boolean;
  pets_allowed: boolean;
  preview_image: string;
  is_saved_by_user?: boolean;
};

export default function ListingCard({ listing }: { listing: Listing }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];
  const { t: translate } = useLanguage();
  const { session } = useSupabaseAuth();
  const [isSaved, setIsSaved] = useState(listing.is_saved_by_user || false);

  const toggleSave = async () => {
    if (!session?.user) {
      // For now, just return if user is not logged in
      // You could show a login prompt here
      return;
    }

    const currentlySaved = isSaved;
    setIsSaved(!currentlySaved); // Optimistic update for instant UI feedback

    try {
      if (currentlySaved) {
        // Unsave the listing
        await unsaveListing(session.user.id, listing.id);
      } else {
        // Save the listing
        await saveListing(session.user.id, listing.id);
      }
    } catch (error) {
      // Revert on error
      setIsSaved(currentlySaved);
      console.error("Error toggling save:", error);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadow }]}>
      <Link href={`/(tabs)/listings/${listing.id}`} asChild>
        <Pressable>
          <Image source={{ uri: listing.preview_image }} style={styles.image} />
        </Pressable>
      </Link>
      <View style={[styles.infoContainer, { borderTopColor: colors.border }]}>
        <View style={styles.detailsRow}>
          <Link href={`/(tabs)/listings/${listing.id}`} asChild>
            <Pressable style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{listing.title}</Text>

              {/* Property Type Badge */}
              <View style={styles.propertyTypeContainer}>
                <Text style={[styles.propertyType, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
                  {t(listing.property_type?.toLowerCase() as TranslationKey) || listing.property_type}
                </Text>
              </View>

              {/* Main Details */}
              <View style={styles.mainDetailsContainer}>
                <View style={styles.detailItem}>
                  <Ionicons name="bed" size={16} color={colors.primary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {listing.bedrooms} {listing.bedrooms === 1 ? t('bed') : t('beds')}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="water" size={16} color={colors.primary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    {listing.bathrooms} {listing.bathrooms === 1 ? t('bath') : t('baths')}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="resize" size={16} color={colors.primary} />
                  <Text style={[styles.detailText, { color: colors.text }]}>{listing.square_feet} {translate('sqft')}</Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={16} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={2}>
                  {listing.neighborhood}, {listing.location_address}
                </Text>
              </View>

              {/* University Distance */}
              {listing.university_proximity_minutes && (
                <View style={styles.universityContainer}>
                  <Ionicons name="school" size={16} color={colors.primary} />
                  <Text style={[styles.universityText, { color: colors.textSecondary }]}>
                    {listing.university_proximity_minutes} {translate('minTo')} {listing.nearest_university}
                  </Text>
                </View>
              )}

              {/* Amenities */}
              <View style={styles.amenitiesContainer}>
                {listing.is_furnished && (
                  <View style={styles.amenityItem}>
                    <Ionicons name="home" size={14} color={colors.primary} />
                    <Text style={[styles.amenityText, { color: colors.primary }]}>{translate('furnished')}</Text>
                  </View>
                )}
                {listing.utilities_included && (
                  <View style={styles.amenityItem}>
                    <Ionicons name="flash" size={14} color={colors.primary} />
                    <Text style={[styles.amenityText, { color: colors.primary }]}>{translate('utilitiesIncluded')}</Text>
                  </View>
                )}
                {listing.pets_allowed && (
                  <View style={styles.amenityItem}>
                    <Ionicons name="paw" size={14} color={colors.primary} />
                    <Text style={[styles.amenityText, { color: colors.primary }]}>{translate('pets')}</Text>
                  </View>
                )}
                {listing.laundry_type && listing.laundry_type !== 'none' && (
                  <View style={styles.amenityItem}>
                    <Ionicons name="shirt" size={14} color={colors.primary} />
                    <Text style={[styles.amenityText, { color: colors.primary }]}>
                      {listing.laundry_type === 'in-unit' ? translate('inUnitLaundry') : translate('laundry')}
                    </Text>
                  </View>
                )}
                {listing.parking_type && listing.parking_type !== 'none' && (
                  <View style={styles.amenityItem}>
                    <Ionicons name="car" size={14} color={colors.primary} />
                    <Text style={[styles.amenityText, { color: colors.primary }]}>{translate('parking')}</Text>
                  </View>
                )}
              </View>

              {/* Price */}
              <Text style={[styles.price, { color: colors.text }]}>
                ${listing.price_per_month.toLocaleString()}
                <Text style={[styles.priceQualifier, { color: colors.textSecondary }]}>{translate('perMonth')}</Text>
              </Text>
            </Pressable>
          </Link>
          <Pressable onPress={toggleSave} style={[styles.heartButton, { backgroundColor: colors.surface }]}>
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={28}
              color={isSaved ? colors.error : colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: 220,
  },
  infoContainer: {
    padding: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  propertyTypeContainer: {
    marginBottom: 12,
  },
  propertyType: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    textTransform: 'capitalize',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  mainDetailsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  universityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  universityText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '500',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  priceQualifier: {
    fontSize: 14,
    fontWeight: 'normal',
  },
  heartButton: {
    padding: 8,
  },
});