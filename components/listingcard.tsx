// components/ListingCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, I18nManager, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useSupabaseAuth } from '@/context/supabase-provider';
import { useTheme } from '@/context/theme-provider';
import { useLanguage, TranslationKey } from '@/context/language-provider';
import { themeColors, spacing, typography, borderRadius, createShadow } from '@/constants/theme';
import { saveListing, unsaveListing } from '@/lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { imageCache, persistentImageCache, createListingUrl, validateImageUrl } from '@/lib/utils';


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
  image_urls?: string[];
  is_saved_by_user?: boolean;
  latitude?: number;
  longitude?: number;
};

export default function ListingCard({ listing }: { listing: Listing }) {
  // Early return if listing data is invalid
  if (!listing || typeof listing !== 'object') {
    console.warn('Invalid listing data passed to ListingCard:', listing);
    return null;
  }

  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];
  const { t: translate } = useLanguage();
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(listing.is_saved_by_user || false);
  const [isPreloading, setIsPreloading] = useState(false);

  // Validate required fields and provide defaults
  const safeTitle = listing.title || 'Untitled Property';
  const safePrice = listing.price_per_month || 0;
  const safeBedrooms = listing.bedrooms || 0;
  const safeBathrooms = listing.bathrooms || 0;
  const safeSquareFeet = listing.square_feet || 0;
  const safeNeighborhood = listing.neighborhood || '';
  const safeAddress = listing.location_address || '';
  const safePropertyType = listing.property_type || 'apartment';
  const safePreviewImage = validateImageUrl(listing.preview_image);
  const safeNearestUniversity = listing.nearest_university || '';

  const toggleSave = async () => {
    if (!session?.user) {
      // Show login prompt if user is not logged in
      Alert.alert(
        t('loginRequired'),
        t('loginToSaveListings'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('login'), onPress: () => router.push('/(auth)') }
        ]
      );
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

      // Invalidate and refetch both saved listings and main listings to update all views immediately
      await queryClient.invalidateQueries({ queryKey: ['saved-listings'] });
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
    } catch (error: any) {
      // Revert on error
      setIsSaved(currentlySaved);

      // Check if it's a duplicate key error
      if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
        Alert.alert(
          t('alreadySaved'),
          t('listingAlreadyInSaved'),
          [{ text: t('ok'), style: 'default' }]
        );
      } else {
        // Generic error message for other errors
        Alert.alert(
          t('error'),
          t('unableToSaveListing'),
          [{ text: t('ok'), style: 'default' }]
        );
      }

      console.error("Error toggling save:", error.message || error);
    }
  };

  // Background preload feed images for better performance
  useEffect(() => {
    const preloadFeedImage = async () => {
      try {
        // Only preload if image URL is valid
        if (!safePreviewImage) return;
        
        // Only preload if not already cached
        const isCached = await persistentImageCache.isCached(safePreviewImage);
        if (!isCached) {
          // Background caching - don't await to avoid blocking UI
          persistentImageCache.cacheImage(safePreviewImage).catch(error => {
            if (__DEV__) console.warn(`Background caching failed for ${safePreviewImage}:`, error);
          });
        }
      } catch (error) {
        // Ignore background preloading errors
      }
    };

    // Start background preloading after a short delay to prioritize visible content
    const timeoutId = setTimeout(preloadFeedImage, 500);

    return () => clearTimeout(timeoutId);
  }, [safePreviewImage]);

  // Preload images for instant loading on detail page
  const preloadDetailImages = async () => {
    if (!listing.image_urls || listing.image_urls.length === 0 || isPreloading) {
      return;
    }

    setIsPreloading(true);
    try {
      // Only log preload start if there are issues, to reduce console spam

      // Preload all detail images with high priority for instant loading
      await imageCache.preloadListingImages(listing.id, listing.image_urls);

      // Successfully preloaded images (no console spam)
    } catch (error) {
      if (__DEV__) console.warn('ListingCard: Failed to preload images for listing', listing.id, ':', error);
    } finally {
      setIsPreloading(false);
    }
  };

  return (
    <View style={[styles.card, {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      ...createShadow(2)
    }]}>
      <Pressable
        onPressIn={preloadDetailImages} // Start preloading immediately on press
        onPress={() => {
          // Mark that we're navigating from the feed screen to preserve filters
          AsyncStorage.setItem('navigationSource', 'feed').catch(() => {});
          router.push(`/(tabs)/listings/${createListingUrl(listing.title, listing.id)}`);
        }}
      >
        <Image
          source={{ uri: safePreviewImage }}
          style={styles.image}
          contentFit="cover"
        />
        {isPreloading && (
          <View style={styles.preloadingOverlay}>
            <Text style={styles.preloadingText}>Preloading images...</Text>
          </View>
        )}
      </Pressable>
      <View style={[styles.infoContainer, { borderTopColor: colors.border }]}>
        <View style={styles.detailsRow}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => {
              // Mark that we're navigating from the feed screen to preserve filters
              AsyncStorage.setItem('navigationSource', 'feed').catch(() => {});
              router.push(`/(tabs)/listings/${createListingUrl(listing.title, listing.id)}`);
            }}
          >
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {safeTitle}
            </Text>
            <View style={styles.propertyTypeContainer}>
              <Text style={[styles.propertyType, {
                backgroundColor: colors.primary + '20',
                color: colors.primary
              }]}>
                {(() => {
                  if (safePropertyType) {
                    const translated = t(safePropertyType.toLowerCase() as TranslationKey);
                    return translated !== safePropertyType.toLowerCase()
                      ? translated
                      : safePropertyType.charAt(0).toUpperCase() + safePropertyType.slice(1).toLowerCase();
                  }
                  return 'Apartment';
                })()}
              </Text>
            </View>

            <View style={styles.mainDetailsContainer}>
              <View style={styles.detailItem}>
                <Ionicons name="bed" size={16} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {`${safeBedrooms} ${safeBedrooms === 1 ? t('bed') : t('beds')}`}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="water" size={16} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {`${safeBathrooms} ${safeBathrooms === 1 ? t('bath') : t('baths')}`}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="resize" size={16} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  {`${safeSquareFeet} ${translate('sqft')}`}
                </Text>
              </View>
            </View>

            {/* Location */}
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color={colors.textSecondary} />
              <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={2}>
                {`${safeNeighborhood}, ${safeAddress}`}
              </Text>
            </View>

            {/* University Distance */}
            {listing.university_proximity_minutes && (
              <View style={styles.universityContainer}>
                <Ionicons name="school" size={16} color={colors.primary} />
                <Text style={[styles.universityText, { color: colors.textSecondary }]}>
                  {`${listing.university_proximity_minutes} ${translate('minTo')} ${safeNearestUniversity}`}
                </Text>
              </View>
            )}

            {/* Amenities */}
            <View style={styles.amenitiesContainer}>
              {listing.is_furnished && (
                <View style={[styles.amenityItem, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="home" size={14} color={colors.primary} />
                  <Text style={[styles.amenityText, { color: colors.primary }]}>{translate('furnished')}</Text>
                </View>
              )}
              {listing.utilities_included && (
                <View style={[styles.amenityItem, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="flash" size={14} color={colors.primary} />
                  <Text style={[styles.amenityText, { color: colors.primary }]}>{translate('utilitiesIncluded')}</Text>
                </View>
              )}
              {listing.pets_allowed && (
                <View style={[styles.amenityItem, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="paw" size={14} color={colors.primary} />
                  <Text style={[styles.amenityText, { color: colors.primary }]}>{translate('pets')}</Text>
                </View>
              )}
              {listing.laundry_type && listing.laundry_type !== 'none' && (
                <View style={[styles.amenityItem, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="shirt" size={14} color={colors.primary} />
                  <Text style={[styles.amenityText, { color: colors.primary }]}>
                    {listing.laundry_type === 'in-unit' ? translate('inUnitLaundry') : translate('laundry')}
                  </Text>
                </View>
              )}
              {listing.parking_type && listing.parking_type !== 'none' && (
                <View style={[styles.amenityItem, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="car" size={14} color={colors.primary} />
                  <Text style={[styles.amenityText, { color: colors.primary }]}>{translate('parking')}</Text>
                </View>
              )}
            </View>

            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: colors.text }]}>
                {`$${safePrice.toLocaleString()}`}
              </Text>
              <Text style={[styles.priceQualifier, { color: colors.textSecondary }]}>
                {` ${translate('perMonth')}`}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={toggleSave} style={[styles.heartButton, {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            ...createShadow(1)
          }]}>
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
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  image: {
    width: '100%',
    height: 220,
  },
  infoContainer: {
    padding: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  propertyTypeContainer: {
    marginBottom: spacing.md,
  },
  propertyType: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    textTransform: 'capitalize',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  mainDetailsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  universityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  universityText: {
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
  },
  amenityText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  price: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  priceQualifier: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
  },
  heartButton: {
    padding: spacing.sm,
  },
  preloadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  preloadingText: {
    color: '#ffffff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
});