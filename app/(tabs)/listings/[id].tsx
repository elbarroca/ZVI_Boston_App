// app/(tabs)/listings/[id].tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScrollView, Text, ActivityIndicator, StyleSheet, View, Image, Pressable, Alert, useWindowDimensions, I18nManager } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getListingById, saveListing, unsaveListing, createTourRequest, createTourRequestWithValidation, getUserProfile, updateUserProfile, checkExistingTourRequest } from '@/lib/api';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage, TranslationKey } from '@/context/language-provider';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/config/supabase';
import { User } from '@supabase/supabase-js';
import ImageCarousel from '@/components/ImageCarousel';
import { TourRequestModal } from '@/components/TourRequestModal';
import { TourConfirmationModal } from '@/components/TourConfirmationModal';
import { TourRequestData, TourConfirmationData } from '@/components/types/tour';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { t } = useLanguage();
  const colors = useMemo(() => themeColors[theme], [theme]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const hasCheckedSavedStatus = useRef(false);

  // Tour modal state
  const [isModalVisible, setModalVisible] = useState(false);

  const queryClient = useQueryClient();

  // Debug: Track renders (only once)
  const hasLogged = useRef(false);
  if (__DEV__ && !hasLogged.current) {
    hasLogged.current = true;
    console.log('=== ListingDetailScreen First Mount ===');
    console.log('ID:', id);
    console.log('Theme:', theme);
    console.log('========================');
  }

  const { data: listing, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListingById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

  // Get current user for profile data
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getCurrentUser();
  }, []);

  // Fetch user profile data
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => getUserProfile(user!.id),
    enabled: !!user,
  });

  // Check for existing tour requests
  const { data: existingTour } = useQuery({
    queryKey: ['existing-tour', user?.id, id],
    queryFn: () => checkExistingTourRequest(user!.id, id!),
    enabled: !!user && !!id,
  });



  // State for confirmation modal
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [submittedTourData, setSubmittedTourData] = useState<TourConfirmationData | null>(null);



  // Profile update mutation - ONLY updates the profile
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { phone_number?: string; updated_at: Date }) => {
      if (!user) throw new Error('User not found');
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate the profile query to refetch the new phone number
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      }
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      Alert.alert(t('couldNotSavePhoneNumber'));
    }
  });

  // Pre-validation check before submitting
  const handleSubmitTourRequest = async (requestData: TourRequestData) => {
    if (!user) {
      Alert.alert(t('error'), t('userNotFoundPleaseLogInAgain'));
      return;
    }

    // Add user_id to the request data
    const completeRequestData = {
      ...requestData,
      user_id: user.id,
    };

    // First, check if user already has an active tour request
    try {
      const existingTour = await checkExistingTourRequest(user.id, id!);
      if (existingTour) {
        const tourDate = new Date(existingTour.created_at).toLocaleDateString();
        Alert.alert(
          t('tourRequestExists'),
          `You already have a tour request for this property submitted on ${tourDate}. Please wait for a response before requesting another tour.`,
          [{ text: t('ok') }]
        );
        return;
      }
    } catch (error) {
      console.error('Error checking existing tours:', error);
      // Continue with submission if check fails
    }

    // First, update the profile if phone number is provided and different
    if (completeRequestData.contact_phone && completeRequestData.contact_phone !== profile?.phone_number) {
      try {
        await updateProfileMutation.mutateAsync({
          phone_number: completeRequestData.contact_phone,
          updated_at: new Date()
        });
      } catch (error) {
        // Error is already handled in the mutation's onError callback
        return;
      }
    }

    // Then, create the tour request using the original function without validation
    createTourRequestMutation.mutate(completeRequestData);
  };

  // Tour request creation mutation - ONLY creates the tour request (no validation)
  const createTourRequestMutation = useMutation({
    mutationFn: async (requestData: TourRequestData) => {
      // Create preferred times summary
      const preferredTimesSummary = `Selected ${requestData.selected_dates.length} date${requestData.selected_dates.length > 1 ? 's' : ''} with ${requestData.selected_time_slots.length} time slot${requestData.selected_time_slots.length > 1 ? 's' : ''}`;

      // Insert the tour request with detailed data using the original function
      await createTourRequest(requestData.user_id, requestData.listing_id, {
        preferred_times: requestData.preferred_times,
        selected_dates: requestData.selected_dates,
        selected_time_slots: requestData.selected_time_slots,
        contact_phone: requestData.contact_phone,
        contact_method: requestData.contact_method,
        preferred_times_summary: preferredTimesSummary,
        notes: requestData.notes
      });

      // Return the data for confirmation modal
      return {
        dates: requestData.selected_dates,
        timeSlots: requestData.selected_time_slots,
        contactMethod: requestData.contact_method,
        phoneNumber: requestData.contact_phone,
        notes: requestData.notes
      };
    },
    onSuccess: (data) => {
      console.log('🎉 Tour request successful:', data);
      console.log('📊 Tour request created successfully');
      setModalVisible(false);

      // Invalidate and refetch tour requests query to update the settings page immediately
      queryClient.invalidateQueries({ queryKey: ['tour-requests', user?.id] });

      // Also invalidate the existing tour query to update the UI state
      queryClient.invalidateQueries({ queryKey: ['existing-tour', user?.id, id] });

      // Show confirmation modal with submitted data (including notes)
      setSubmittedTourData(data);
      // Add small delay to ensure smooth modal transition
      setTimeout(() => {
        setShowConfirmationModal(true);
        console.log('✅ Confirmation modal should now be visible:', {
          showConfirmationModal: true,
          submittedTourData: data
        });
      }, 100);
    },
    onError: (error) => {
      console.error('Tour request error:', error);
      Alert.alert(t('couldNotSubmitTourRequest'), error.message);
    }
  });

  // Memoize image URLs to prevent unnecessary carousel re-renders
  const imageUrls = useMemo(() => {
    const urls = listing?.image_urls || [];
    if (__DEV__ && urls.length > 0) {
      console.log('Memoized image URLs count:', urls.length);
    }
    return urls;
  }, [listing?.image_urls]); // Only depend on image URLs

  // Reset saved status and check flag when ID changes
  useEffect(() => {
    setIsSaved(false);
    hasCheckedSavedStatus.current = false;
  }, [id]);

  // Check saved status when listing loads
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!id || !listing?.id || hasCheckedSavedStatus.current) return;

      hasCheckedSavedStatus.current = true; // Mark as checked

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('saved_listings')
          .select('id')
          .eq('user_id', user.id)
          .eq('listing_id', id)
          .single();

        if (data && !error) {
          setIsSaved(true);
        } else {
          setIsSaved(false);
        }
      } catch (error) {
        console.log('Error checking saved status:', error);
        setIsSaved(false);
      }
    };

    checkSavedStatus();
  }, [id, listing?.id]); // This will only run when id or listing.id changes

  const handleToggleSave = async () => {
    if (!id || !listing) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert(t('pleaseSignInToSaveListings'));
      return;
    }

    setIsSaveLoading(true);
    const currentlySaved = isSaved;
    setIsSaved(!currentlySaved); // Optimistic update

    try {
      if (currentlySaved) {
        await unsaveListing(user.id, id);
      } else {
        await saveListing(user.id, id);
      }

      // Invalidate and refetch saved listings query to update the saved page immediately
      queryClient.invalidateQueries({ queryKey: ['saved-listings'] });

      // Also invalidate the main listings query to update any saved status in the feed
      queryClient.invalidateQueries({ queryKey: ['listings'] });

    } catch (error) {
      // Revert on error
      setIsSaved(currentlySaved);
      Alert.alert(t('couldNotUpdateSavedStatus'));
      console.error("Error toggling save:", error);
    } finally {
      setIsSaveLoading(false);
    }
  };

  const handleRequestTour = () => {
    if (!user) {
      Alert.alert(t('pleaseSignInToRequestTour'));
      return;
    }

    // Check if user already has an active tour request
    if (existingTour) {
      const tourDate = new Date(existingTour.created_at).toLocaleDateString();
      Alert.alert(
        t('tourRequestExists'),
        `You already have a tour request for this property submitted on ${tourDate}. Please wait for a response before requesting another tour.`,
        [{ text: t('ok') }]
      );
      return;
    }

    setModalVisible(true);
  };

  // Helper function to translate amenity values
  const getTranslatedAmenityValue = (amenityType: string, value: string): string => {
    if (!value || value === 'none') {
      // Create a mapping for "no" translations
      const noTranslations: Record<string, TranslationKey> = {
        'laundry': 'noLaundry',
        'parking': 'noParking',
        'broker_fee_required': 'noBrokerFee'
      };

      const capitalizedType = amenityType.charAt(0).toUpperCase() + amenityType.slice(1);
      const noKey = `no${capitalizedType}` as keyof typeof noTranslations;
      const translationKey = noTranslations[noKey] || noTranslations[amenityType];

      if (translationKey) {
        return t(translationKey);
      }

      return t('none');
    }

    // Handle laundry types
    if (amenityType === 'laundry') {
      switch (value) {
        case 'in-unit': return t('inUnitLaundry');
        case 'on-site': return t('onSiteLaundry');
        case 'none': return t('noLaundry');
        default: return t('laundry');
      }
    }

    // Handle parking types
    if (amenityType === 'parking') {
      switch (value) {
        case 'garage': return t('garageParking');
        case 'street': return t('streetParking');
        case 'none': return t('noParking');
        default: return t('parking');
      }
    }

    // Handle broker fee
    if (amenityType === 'broker_fee_required' && value === 'false') {
      return t('noBrokerFee');
    }

    // Default fallback with type-safe translation
    const safeTranslations: Record<string, TranslationKey> = {
      'laundry': 'laundry',
      'parking': 'parking',
      'furnished': 'furnished',
      'pets_allowed': 'petsAllowed',
      'utilities_included': 'utilitiesIncluded',
      'broker_fee_required': 'noBrokerFee'
    };

    const safeKey = safeTranslations[amenityType];
    return safeKey ? t(safeKey) : amenityType;
  };





  // Handle case where no ID is provided
  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('invalidListingId')}</Text>
        <Text style={styles.errorSubtext}>{t('noListingIdProvided')}</Text>
      </View>
    );
  }

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.center} />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('errorLoadingListing')}</Text>
        <Text style={styles.errorSubtext}>{error.message}</Text>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{t('listingNotFound')}</Text>
        <Text style={styles.errorSubtext}>{t('theListingYouAreLookingForDoesNotExist')}</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: '', headerTransparent: true, headerTintColor: colors.text }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.carouselContainer}>
          <ImageCarousel imageUrls={imageUrls} />
          <Pressable
            onPress={handleToggleSave}
            disabled={isSaveLoading}
            style={[styles.heartButton, { backgroundColor: colors.shadow }]}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={32}
              color={colors.text}
              style={styles.heartIcon}
            />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>{listing.title}</Text>
            <View style={styles.propertyTypeContainer}>
              <Text style={[styles.propertyTypeBadge, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
                {t(listing.property_type?.toLowerCase() as any) || listing.property_type}
              </Text>
            </View>
            <Text style={[styles.address, { color: colors.textSecondary }]}>{listing.location_address}</Text>
          </View>

          {/* Proximity Highlight */}
          {listing.university_proximity_minutes && listing.nearest_university && (
            <View style={styles.proximityChip}>
              <Ionicons name="school-outline" size={16} color={colors.success} />
              <Text style={[styles.proximityText, { color: colors.success }]}>
                {listing.university_proximity_minutes}-minute walk to {listing.nearest_university}
              </Text>
            </View>
          )}

          {/* Key Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('price')}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>${listing.price_per_month.toLocaleString()}/mo</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('beds')}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{listing.bedrooms}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('baths')}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{listing.bathrooms}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{t('lease')}</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{listing.lease_duration_months} {t('months')}</Text>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Description */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('aboutThisPlace')}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{listing.description}</Text>

          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Amenities */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('whatThisPlaceOffers')}</Text>
          <View style={styles.amenitiesContainer}>
            <AmenityItem icon="shirt-outline" text={getTranslatedAmenityValue('laundry', listing.laundry_type)} colors={colors} />
            <AmenityItem icon="car-sport-outline" text={getTranslatedAmenityValue('parking', listing.parking_type)} colors={colors} />
            {listing.pets_allowed && <AmenityItem icon="paw-outline" text={t('petsAllowed')} colors={colors} />}
            {listing.is_furnished && <AmenityItem icon="bed-outline" text={t('furnished')} colors={colors} />}
            {listing.utilities_included && <AmenityItem icon="flash-outline" text={t('utilitiesIncluded')} colors={colors} />}
          </View>
        </View>
      </ScrollView>

      {/* Tour Request Modal */}
      <TourRequestModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        listingId={id!}
        listingTitle={listing?.title || ''}
        listingAddress={listing?.location_address || ''}
        userEmail={user?.email}
        userName={profile?.full_name}
        userPhone={profile?.phone_number}
        onSubmit={handleSubmitTourRequest}
        isSubmitting={createTourRequestMutation.isPending || updateProfileMutation.isPending}
      />

      {/* Confirmation Modal */}
      <TourConfirmationModal
        visible={showConfirmationModal}
        onClose={() => {
          setShowConfirmationModal(false);
          setSubmittedTourData(null);
        }}
        data={submittedTourData}
        listingTitle={listing?.title || ''}
        listingAddress={listing?.location_address || ''}
        userEmail={user?.email}
      />

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable
          style={[
            styles.requestButton,
            { backgroundColor: existingTour ? colors.textMuted : colors.primary }
          ]}
          onPress={handleRequestTour}
          disabled={!!existingTour}
        >
          <Text style={styles.requestButtonText}>
            🏠 {existingTour ? t('tourAlreadyRequested') : t('requestTour')}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

// Helper component to be placed inside the Detail Screen file
const AmenityItem = ({ icon, text, colors }: { icon: any; text: string; colors: any }) => (
  <View style={styles.amenityItem}>
    <Ionicons name={icon} size={24} color={colors.textSecondary} />
    <Text style={[styles.amenityText, { color: colors.text }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  carouselContainer: {
    position: 'relative',
  },
  heartButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    borderRadius: 50,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  heartIcon: {
    // Additional styling for heart icon if needed
  },
  content: {
    padding: 20,
  },
  titleContainer: {
    marginBottom: 16,
  },
  propertyTypeContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  propertyTypeBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
  },
  proximityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  proximityText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 6,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailItem: {
    width: '48%',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  amenitiesContainer: {
    // Container for amenities
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  amenityText: {
    fontSize: 16,
    marginLeft: 12,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  requestButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  requestButtonDisabled: {
    opacity: 0.7,
  },
  requestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLoader: {
    marginRight: 8,
  },

});

