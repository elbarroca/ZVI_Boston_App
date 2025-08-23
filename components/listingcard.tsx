// components/ListingCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Pressable, I18nManager } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useSupabaseAuth } from '@/context/supabase-provider';
import { useTheme } from '@/context/theme-provider';
import { useLanguage, TranslationKey } from '@/context/language-provider';
import { themeColors, spacing, typography, borderRadius, createShadow } from '@/constants/theme';
import { saveListing, unsaveListing } from '@/lib/api';
import { imageCache, persistentImageCache, createListingUrl } from '@/lib/utils';
import { LazyImage } from '@/components/ImageCarousel';

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
};

export default function ListingCard({ listing }: { listing: Listing }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];
  const { t: translate } = useLanguage();
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [isSaved, setIsSaved] = useState(listing.is_saved_by_user || false);
  const [isPreloading, setIsPreloading] = useState(false);

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

      // Invalidate and refetch both saved listings and main listings to update all views immediately
      await queryClient.invalidateQueries({ queryKey: ['saved-listings'] });
      await queryClient.invalidateQueries({ queryKey: ['listings'] });
    } catch (error) {
      // Revert on error
      setIsSaved(currentlySaved);
      console.error("Error toggling save:", error);
    }
  };

  // Background preload feed images for better performance
  useEffect(() => {
    const preloadFeedImage = async () => {
      try {
        // Only preload if not already cached
        const isCached = await persistentImageCache.isCached(listing.preview_image);
        if (!isCached) {
          // Background caching - don't await to avoid blocking UI
          persistentImageCache.cacheImage(listing.preview_image).catch(error => {
            if (__DEV__) console.warn(`Background caching failed for ${listing.preview_image}:`, error);
          });
        }
      } catch (error) {
        // Ignore background preloading errors
      }
    };

    // Start background preloading after a short delay to prioritize visible content
    const timeoutId = setTimeout(preloadFeedImage, 500);

    return () => clearTimeout(timeoutId);
  }, [listing.preview_image]);

  // Preload images for instant loading on detail page
  const preloadDetailImages = async () => {
    if (!listing.image_urls || listing.image_urls.length === 0 || isPreloading) {
      return;
    }

    setIsPreloading(true);
    try {
      if (__DEV__) console.log(`ListingCard: Preloading images for listing ${listing.id}`);

      // Preload all detail images with high priority for instant loading
      await imageCache.preloadListingImages(listing.id, listing.image_urls);

      if (__DEV__) console.log(`ListingCard: Successfully preloaded ${listing.image_urls.length} images for listing ${listing.id}`);
    } catch (error) {
      if (__DEV__) console.warn(`ListingCard: Failed to preload images for listing ${listing.id}:`, error);
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
      <Link href={`/(tabs)/listings/${createListingUrl(listing.title, listing.id)}`} asChild>
        <Pressable
          onPressIn={preloadDetailImages} // Start preloading immediately on press
          onPress={() => {
            if (__DEV__) console.log(`ListingCard: Navigating to detail page for listing ${listing.id} with slug ${createListingUrl(listing.title, listing.id)}`);
          }}
        >
          <LazyImage
            source={{ uri: listing.preview_image }}
            style={styles.image}
            resizeMode="cover"
            threshold={0.2} // Start loading when 20% of image is visible
            priority="high" // Main feed images should load immediately
          />
          {isPreloading && (
            <View style={styles.preloadingOverlay}>
              <Text style={styles.preloadingText}>Preloading images...</Text>
            </View>
          )}
        </Pressable>
      </Link>
      <View style={[styles.infoContainer, { borderTopColor: colors.border }]}>
        <View style={styles.detailsRow}>
                        <Link href={`/(tabs)/listings/${createListingUrl(listing.title, listing.id)}`} asChild>
                <Pressable style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{listing.title}</Text>

              {/* Property Type Badge */}
              <View style={styles.propertyTypeContainer}>
                <Text style={[styles.propertyType, {
                  backgroundColor: colors.primary + '20',
                  color: colors.primary
                }]}>
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
              <Text style={[styles.price, { color: colors.text }]}>
                ${listing.price_per_month.toLocaleString()}
                <Text style={[styles.priceQualifier, { color: colors.textSecondary }]}>{translate('perMonth')}</Text>
              </Text>
            </Pressable>
          </Link>
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