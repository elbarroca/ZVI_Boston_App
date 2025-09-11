import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, Platform, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';
import { Calendar } from 'react-native-calendars';
import TourRequestSummaryModal from './TourRequestModal';
import { TourService } from '@/lib/tourService';
import { useSupabaseAuth } from '@/context/supabase-provider';
import { supabase } from '@/config/supabase';
import { getListings, ensureUserProfile } from '@/lib/api';
import Filters, { FilterState } from './Filters';
import { Listing } from './listingcard';

interface TourConfirmationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  listingId: string;
  showComingSoon?: boolean;
}



export default function TourConfirmationModal({ isVisible, onClose, onSuccess, listingId, showComingSoon }: TourConfirmationModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { session } = useSupabaseAuth();
  const colors = themeColors[theme as keyof typeof themeColors];

  const [selectedDaySlots, setSelectedDaySlots] = useState<{date: string, time: string, priority: number}[]>([]);
  const [maxSlots] = useState(3); // Allow up to 3 day-time combinations
  const [selectedDates, setSelectedDates] = useState<{[key: string]: {selected: boolean}}>({});
  const [selectedPeriods, setSelectedPeriods] = useState<{[key: string]: 'morning' | 'afternoon'}>({});
  const [notes, setNotes] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1');
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneValidationError, setPhoneValidationError] = useState<string | null>(null);

  const generateTimeSlots = (period: 'morning' | 'afternoon'): { time: string; display: string; label: string }[] => {
    // Generate 30-minute time slots for morning (9-12) or afternoon (1-5)
    const slots: { time: string; display: string; label: string }[] = [];

    const timeRange = period === 'morning'
      ? { start: 9, end: 12, emoji: '🌅', periodLabel: t('morning') }
      : { start: 13, end: 17, emoji: '🌞', periodLabel: t('afternoon') };

    // Time slot emojis for visual appeal
    const timeEmojis: { [key: string]: string } = {
      '09:00': '🌅', '09:30': '☕',
      '10:00': '🌤️', '10:30': '📖',
      '11:00': '🌞', '11:30': '🍎',
      '12:00': '🍽️', '12:30': '🏃',
      '13:00': '🌞', '13:30': '📚',
      '14:00': '🕐', '14:30': '🎯',
      '15:00': '🌆', '15:30': '🍵',
      '16:00': '🌇', '16:30': '🎭',
      '17:00': '🌃', '17:30': '🎪'
    };

    for (let hour = timeRange.start; hour <= timeRange.end; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const h = hour.toString().padStart(2, '0');
        const m = minute === 0 ? '00' : '30';
        const timeLabel = `${h}:${m}`;
        const timeKey = `${h}:${m}`;
        const emoji = timeEmojis[timeKey] || '🕐';
        // Display consistent 24-hour format like "09:00", "13:30"
        const cleanTimeDisplay = `${h}:${m}`;

        slots.push({
          time: timeLabel,
          display: `${emoji} ${cleanTimeDisplay}`,
          label: timeRange.periodLabel
        });
      }
    }

    return slots;
  };

  const validatePhoneNumber = (phoneNumber: string, countryCode: string): { isValid: boolean; error?: string } => {
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');

    // Basic validation - must have at least 7 digits (after country code)
    if (cleanNumber.length < 7) {
      return { isValid: false, error: t('phoneTooShort') };
    }

    // Maximum reasonable length
    if (cleanNumber.length > 15) {
      return { isValid: false, error: t('phoneTooLong') };
    }

    // Country-specific validation patterns
    const countryPatterns: { [key: string]: RegExp } = {
      '+1': /^\d{10}$/,        // US/Canada: 10 digits
      '+33': /^\d{9}$/,        // France: 9 digits
      '+49': /^\d{10,11}$/,    // Germany: 10-11 digits
      '+44': /^\d{10,11}$/,    // UK: 10-11 digits
      '+55': /^\d{10,11}$/,    // Brazil: 10-11 digits
      '+86': /^\d{11}$/,       // China: 11 digits
      '+91': /^\d{10}$/,       // India: 10 digits
      '+972': /^\d{9,10}$/,    // Israel: 9-10 digits
    };

    // If we have a specific pattern for this country code, use it
    if (countryPatterns[countryCode]) {
      const countryPattern = countryPatterns[countryCode];
      if (!countryPattern.test(cleanNumber)) {
        return {
          isValid: false,
          error: `invalidPhoneNumberFallback format for ${countryCode}. Please check and try again.`
        };
      }
    }

    // General validation - must contain only numbers
    if (!/^\d+$/.test(cleanNumber)) {
      return { isValid: false, error: t('phoneDigitsOnly') };
    }

    // Check for obviously invalid patterns (like all zeros, all same digit, etc.)
    if (/^0+$/.test(cleanNumber) || /^(\d)\1+$/.test(cleanNumber)) {
      return { isValid: false, error: t('enterValidPhone') };
    }

    return { isValid: true };
  };

  // Multiple listing selection state
  const [showMultipleListings, setShowMultipleListings] = useState(false);
  const [availableListings, setAvailableListings] = useState<Listing[]>([]);
  const [selectedAdditionalListings, setSelectedAdditionalListings] = useState<string[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [alreadyRequestedListingIds, setAlreadyRequestedListingIds] = useState<string[]>([]);

  // Search and filter state for multiple listings
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [listingFilters, setListingFilters] = useState<FilterState>({
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

  // Debug logging
  console.log('TourConfirmationModal render - isVisible:', isVisible, 'isSummaryModalVisible:', isSummaryModalVisible);

  // Filtered and sorted listings for multiple selection
  const filteredListings = useMemo(() => {
    if (!showMultipleListings || availableListings.length === 0) return [];

    // Available listings are already filtered to exclude current listing and already requested ones
    // Double-check filtering to ensure no already requested listings slip through
    let filtered = availableListings.filter(listing => 
      listing.id !== listingId && !alreadyRequestedListingIds.includes(listing.id)
    );

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(query) ||
        listing.neighborhood.toLowerCase().includes(query) ||
        listing.location_address?.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (listingFilters.minPrice) {
      const minPrice = parseInt(listingFilters.minPrice);
      filtered = filtered.filter(listing => listing.price_per_month >= minPrice);
    }
    if (listingFilters.maxPrice) {
      const maxPrice = parseInt(listingFilters.maxPrice);
      filtered = filtered.filter(listing => listing.price_per_month <= maxPrice);
    }
    if (listingFilters.beds && listingFilters.beds !== '') {
      if (listingFilters.beds === '4+') {
        filtered = filtered.filter(listing => listing.bedrooms >= 4);
      } else {
        const beds = parseInt(listingFilters.beds);
        filtered = filtered.filter(listing => listing.bedrooms === beds);
      }
    }
    if (listingFilters.laundry && listingFilters.laundry !== '') {
      filtered = filtered.filter(listing => listing.laundry_type === listingFilters.laundry);
    }
    if (listingFilters.parking === true) {
      filtered = filtered.filter(listing => listing.parking_type !== 'none');
    }
    if (listingFilters.pets_allowed !== undefined) {
      filtered = filtered.filter(listing => listing.pets_allowed === listingFilters.pets_allowed);
    }
    if (listingFilters.is_furnished !== undefined) {
      filtered = filtered.filter(listing => listing.is_furnished === listingFilters.is_furnished);
    }
    if (listingFilters.utilities_included !== undefined) {
      filtered = filtered.filter(listing => listing.utilities_included === listingFilters.utilities_included);
    }
    if (listingFilters.broker_fee_required !== undefined) {
      filtered = filtered.filter(listing => listing.broker_fee_required === listingFilters.broker_fee_required);
    }
    if (listingFilters.neighborhood && listingFilters.neighborhood !== '') {
      const neighborhoods = listingFilters.neighborhood.split(',').map(n => n.trim().toLowerCase());
      filtered = filtered.filter(listing =>
        neighborhoods.some(neigh => listing.neighborhood.toLowerCase().includes(neigh))
      );
    }

    // Sort: saved listings first, then by creation date
    return filtered.sort((a, b) => {
      // Saved listings first
      if (a.is_saved_by_user && !b.is_saved_by_user) return -1;
      if (!a.is_saved_by_user && b.is_saved_by_user) return 1;

      // Then by creation date (newest first)
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [availableListings, listingId, showMultipleListings, searchQuery, listingFilters]);

  // Fetch available listings when multiple listing selection is enabled
  useEffect(() => {
    const fetchAvailableListings = async () => {
      if (showMultipleListings) {
        setIsLoadingListings(true);
        try {
          const listings = await getListings();

          let requestedIds: string[] = [];
          if (session?.user?.id) {
            requestedIds = await TourService.getAlreadyRequestedListingIds(session.user.id);
            setAlreadyRequestedListingIds(requestedIds);
            
            // Debug logging for filtering
            console.log('Total listings fetched:', listings.length);
            console.log('Already requested listing IDs:', requestedIds);
            console.log('Current listing ID (to exclude):', listingId);
          }

          const filteredListings = listings.filter(listing =>
            listing.id !== listingId && !requestedIds.includes(listing.id)
          );
          
          console.log('Filtered listings count:', filteredListings.length);
          setAvailableListings(filteredListings);
        } catch (error) {
          console.error('Error fetching listings:', error);
          Alert.alert(t('error'), t('failedToLoadListings'));
        } finally {
          setIsLoadingListings(false);
        }
      }
    };

    fetchAvailableListings();
  }, [showMultipleListings, listingId, session?.user?.id]);

  // Time slots will be generated dynamically based on selected period

  const countryCodes = [
    { code: '+1', flag: '🇺🇸' },
    { code: '+33', flag: '🇫🇷' }, // France
    { code: '+49', flag: '🇩🇪' }, // Germany
    { code: '+44', flag: '🇬🇧' }, // UK
    { code: '+55', flag: '🇧🇷' }, // Brazil
    { code: '+86', flag: '🇨🇳' }, // China
    { code: '+91', flag: '🇮🇳' }, // India
    { code: '+972', flag: '🇮🇱' }, // Israel
  ];

  const handleDayPress = (day: { dateString: string }) => {
    const dateString = day.dateString;
    setSelectedDates((prev: {[key: string]: {selected: boolean}}) => {
      const newDates = { ...prev };
      if (newDates[dateString]?.selected) {
        // Deselect date and remove all slots for this date
        delete newDates[dateString];
        setSelectedDaySlots((prevSlots: {date: string, time: string, priority: number}[]) =>
          prevSlots.filter((slot: {date: string, time: string, priority: number}) => slot.date !== dateString)
            .map((slot: {date: string, time: string, priority: number}, index: number) => ({ ...slot, priority: index + 1 }))
        );
        // Reset period for this date
        setSelectedPeriods((prevPeriods: {[key: string]: 'morning' | 'afternoon'}) => {
          const newPeriods = { ...prevPeriods };
          delete newPeriods[dateString];
          return newPeriods;
        });
      } else {
        // Select date if under limit
        const selectedDatesCount = Object.keys(newDates).length;
        if (selectedDatesCount < maxSlots) {
          newDates[dateString] = { selected: true };
          // Default to morning for new dates
          setSelectedPeriods((prevPeriods: {[key: string]: 'morning' | 'afternoon'}) => ({
            ...prevPeriods,
            [dateString]: 'morning'
          }));
        } else {
          Alert.alert(t('maximumDays'), t('maximumDaysMessage').replace('{maxSlots}', maxSlots.toString()));
        }
      }
      return newDates;
    });
  };

  const handlePeriodToggle = (date: string, period: 'morning' | 'afternoon') => {
    setSelectedPeriods((prev: {[key: string]: 'morning' | 'afternoon'}) => ({
      ...prev,
      [date]: period
    }));
    // Clear any selected time slots for this date when switching periods
    setSelectedDaySlots((prevSlots: {date: string, time: string, priority: number}[]) =>
      prevSlots.filter((slot: {date: string, time: string, priority: number}) => slot.date !== date)
        .map((slot: {date: string, time: string, priority: number}, index: number) => ({ ...slot, priority: index + 1 }))
    );
  };

  const handleTimeSlotPress = (date: string, slot: { time: string; display: string; label: string }) => {
    const existingIndex = selectedDaySlots.findIndex((s: {date: string, time: string, priority: number}) => s.date === date && s.time === slot.time);

    if (existingIndex >= 0) {
      // Remove the slot and reorder priorities
      const newSlots = selectedDaySlots
        .filter((s: {date: string, time: string, priority: number}) => !(s.date === date && s.time === slot.time))
        .map((s: {date: string, time: string, priority: number}, index: number) => ({ ...s, priority: index + 1 }));
      setSelectedDaySlots(newSlots);
    } else {
      // Check total slots limit
      if (selectedDaySlots.length >= maxSlots) {
        Alert.alert(t('maximumSlots'), t('maximumSlotsMessage').replace('{maxSlots}', maxSlots.toString()));
        return;
      }

      // Check slots per day limit (3 per day)
      const slotsForThisDay = selectedDaySlots.filter((s: {date: string, time: string, priority: number}) => s.date === date).length;
      if (slotsForThisDay >= 3) {
        Alert.alert(t('maximumSlotsPerDay'), t('maximumSlotsPerDayMessage'));
        return;
      }

      // Add new slot with proper priority
      const newSlots = [...selectedDaySlots, { date, time: slot.time, priority: selectedDaySlots.length + 1 }];
      setSelectedDaySlots(newSlots);
    }
  };

  const getSlotPriority = (date: string, slot: string): number | null => {
    const found = selectedDaySlots.find((s: {date: string, time: string, priority: number}) => s.date === date && s.time === slot);
    return found ? found.priority : null;
  };

  const handlePriorityChange = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= selectedDaySlots.length) return;

    const clickedSlot = selectedDaySlots[targetIndex];
    if (clickedSlot.priority === 1) return; // Already top priority

    // Move clicked slot to the beginning and shift others down
    const reorderedSlots = [
      clickedSlot, // This becomes priority 1
      ...selectedDaySlots.filter((_, index) => index !== targetIndex) // All others
    ];

    // Re-assign priorities sequentially
    const updatedSlots = reorderedSlots.map((slot, index) => ({
      ...slot,
      priority: index + 1
    }));

    setSelectedDaySlots(updatedSlots);
  };

  const handleResetPriorities = () => {
    // Reset to original order (by creation time)
    const resetSlots = selectedDaySlots
      .sort((a, b) => a.priority - b.priority)
      .map((slot, index) => ({ ...slot, priority: index + 1 }));
    setSelectedDaySlots(resetSlots);
  };

  const handlePhoneNumberChange = (text: string) => {
    setPhoneNumber(text);

    // Clear previous validation error when user starts typing
    if (phoneValidationError) {
      setPhoneValidationError(null);
    }

    // Validate in real-time if user has entered something
    if (text.trim()) {
      const validation = validatePhoneNumber(text, selectedCountryCode);
      if (!validation.isValid) {
        setPhoneValidationError(validation.error || 'invalidPhoneNumberFallback');
      }
    }
  };

  const handleCountryCodeChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    // Re-validate phone number with new country code
    if (phoneNumber.trim()) {
      const validation = validatePhoneNumber(phoneNumber, countryCode);
      if (!validation.isValid) {
        setPhoneValidationError(validation.error || 'invalidPhoneNumberFallback');
      } else {
        setPhoneValidationError(null);
      }
    }
  };

  const handleAdditionalListingToggle = (listingId: string) => {
    // Double-check that this listing hasn't already been requested
    if (alreadyRequestedListingIds.includes(listingId)) {
      Alert.alert(t('listingAlreadyRequested'), t('listingAlreadyRequestedMessage'));
      return;
    }

    setSelectedAdditionalListings(prev => {
      if (prev.includes(listingId)) {
        // Remove the listing
        return prev.filter(id => id !== listingId);
      } else {
        // Add the listing (max 4 additional listings to keep it manageable)
        if (prev.length >= 4) {
          Alert.alert(t('maximumReached'), t('maximumReachedMessage'));
          return prev;
        }
        return [...prev, listingId];
      }
    });
  };

  const resetModalState = () => {
    setSelectedDaySlots([]);
    setSelectedDates({});
    setSelectedPeriods({});
    setNotes('');
    setPhoneNumber('');
    setSelectedCountryCode('+1');
    setIsCountryPickerVisible(false);
    setPhoneValidationError(null);
    setIsSummaryModalVisible(false);
    setIsSubmitting(false);
    // Reset multiple listing state
    setShowMultipleListings(false);
    setSelectedAdditionalListings([]);
    setAlreadyRequestedListingIds([]);
    // Don't reset availableListings to avoid refetching
  };

  const submitTourRequest = async () => {
    console.log('🔍 Starting tour request submission...');
    console.log('📋 Full session object:', session);
    console.log('📋 Session user ID:', session?.user?.id);
    console.log('🏠 Main listing ID:', listingId);
    console.log('📋 Additional listings:', selectedAdditionalListings);

    // Check if Supabase is properly configured
    console.log('🔍 Checking Supabase configuration...');
    if (!supabase) {
      console.error('❌ Supabase client not available');
      throw new Error(t('databaseConnectionNotAvailable'));
    }

    if (!session?.user?.id) {
      console.error('❌ No user session available');
      throw new Error(t('userSessionNotAvailable'));
    }

    // Combine original listing with selected additional listings
    const allListingIds = [listingId, ...selectedAdditionalListings];
    console.log('📋 All listing IDs to validate:', allListingIds);

    // First, validate that all listings exist in the database
    try {
      console.log('🔍 Validating listings...');
      const { data: existingListings, error: listingError } = await supabase
        .from('listings')
        .select('id')
        .in('id', allListingIds);

      if (listingError) {
        console.error('❌ Error validating listings:', listingError);
        throw new Error(`Failed to validate listings: ${listingError.message}`);
      }

      console.log('✅ Listings query result:', existingListings);

      if (!existingListings || existingListings.length === 0) {
        console.error('❌ No listings found in database');
        throw new Error(t('noValidListingsFound'));
      }

      const foundListingIds = existingListings.map(l => l.id);
      console.log('📋 Found listing IDs:', foundListingIds);

      const missingListingIds = allListingIds.filter(id => !foundListingIds.includes(id));

      if (missingListingIds.length > 0) {
        console.error('❌ Missing listings:', missingListingIds);
        throw new Error(`Some listings do not exist in the database: ${missingListingIds.join(', ')}`);
      }

      console.log('✅ All listings validated successfully');

      // Validate that the user exists in profiles table
      console.log('🔍 Validating user...');
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('❌ Error validating user:', userError);
        throw new Error(`Failed to validate user: ${userError.message}`);
      }

      console.log('✅ User query result:', userProfile);

      // Ensure user profile exists (create if missing)
      if (!userProfile) {
        console.log('🔧 User profile not found, creating one...');
        try {
          await ensureUserProfile(session.user);
          console.log('✅ User profile created successfully');
        } catch (createError) {
          console.error('❌ Failed to create user profile:', createError);
          throw new Error(t('unableToCreateUserProfile'));
        }
      } else {
        console.log('✅ User profile exists');
      }

      console.log('✅ User validated successfully');

      // Check that additional listings don't include the main listing (constraint violation)
      if (selectedAdditionalListings.includes(listingId)) {
        console.error('❌ Main listing found in additional listings');
        throw new Error(t('cannotAddMainPropertyToAdditional'));
      }

      console.log('✅ All validations passed');

    } catch (validationError) {
      console.error('❌ Validation error in submitTourRequest:', validationError);
      console.error('❌ Validation error message:', (validationError as Error).message);
      console.error('❌ Validation error stack:', (validationError as Error).stack);
      throw validationError;
    }

    // Group by date for the service
    const groupedByDate: {[key: string]: {time: string, priority: number}[]} = {};
    selectedDaySlots.forEach((slot: {date: string, time: string, priority: number}) => {
      if (!groupedByDate[slot.date]) {
        groupedByDate[slot.date] = [];
      }
      groupedByDate[slot.date].push({time: slot.time, priority: slot.priority});
    });

    // Debug logging
    console.log('Submitting tour request with:', {
      allListingIds,
      selectedAdditionalListings,
      mainListingId: listingId,
      selectedDaySlots,
      userId: session.user.id
    });

    await TourService.createTourRequest(allListingIds, {
      dates: Object.keys(groupedByDate),
      timeSlots: selectedDaySlots.map((slot: {date: string, time: string, priority: number}) => ({
        time: slot.time,
        priority: slot.priority,
        date: slot.date // Include date information
      })),
      notes,
      phoneNumber,
      countryCode: selectedCountryCode,
    }, session.user.id);

    // Successfully submitted - show summary modal
    console.log('Tour request submitted successfully, showing summary modal');
    console.log('Setting isSummaryModalVisible to true');
    setIsSummaryModalVisible(true);
    console.log('isSummaryModalVisible should now be true');

    // Don't call success callback immediately - let user see the summary first
    // The success callback will be called when they close the summary modal
  };

  const submitTourRequestAnyway = async () => {
    try {
      console.log('🚀 Proceeding with tour request despite conflicts...');
      await submitTourRequest();
    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Error in submitTourRequestAnyway:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error stack:', err.stack);
      const errorMessage = err.message || 'unknownErrorOccurred';
      Alert.alert(t('couldNotSubmitTourRequest'), errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitTourRequest = async () => {
    if (selectedDaySlots.length === 0) {
      Alert.alert(t('selectDateTime'));
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert(t('enterPhoneNumber'));
      return;
    }

    // Validate phone number format
    const phoneValidation = validatePhoneNumber(phoneNumber, selectedCountryCode);
    if (!phoneValidation.isValid) {
      Alert.alert(t('invalidPhoneNumber'), phoneValidation.error);
      return;
    }

    if (!session?.user?.id) {
      Alert.alert(t('userNotFoundPleaseLogInAgain'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for existing tour request for any of the selected listings
      const allListingIds = [listingId, ...selectedAdditionalListings];
      const hasExistingRequest = await TourService.hasUserRequestedTourForListings(session.user.id, allListingIds);
      if (hasExistingRequest) {
        Alert.alert(t('tourRequestAlreadyExists'), t('tourRequestAlreadyExistsMessage'));
        setIsSubmitting(false);
        return;
      }

      // Check for time slot conflicts with other pending/confirmed tours
      const conflictCheck = await TourService.checkTimeSlotConflicts(
        session.user.id,
        selectedDaySlots.map(slot => ({ time: slot.time, date: slot.date }))
      );

      if (conflictCheck.hasConflicts) {
        const conflictMessage = `You already have a tour scheduled at the same time:\n\n${
          conflictCheck.conflictingSlots.map(slot =>
            `• ${slot.date} at ${slot.time}`
          ).join('\n')
        }\n\nWould you like to proceed anyway, or adjust your time slots?`;

        Alert.alert(
          t('timeConflictDetected'),
          conflictMessage,
          [
            {
              text: t('adjustTimes'),
              style: 'default',
              onPress: () => setIsSubmitting(false)
            },
            {
              text: t('proceedAnyway'),
              style: 'destructive',
              onPress: () => submitTourRequestAnyway()
            }
          ]
        );
        return;
      }

      await submitTourRequest();
    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ Error in handleSubmitTourRequest:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error stack:', err.stack);
      const errorMessage = err.message || 'unknownErrorOccurred';
      Alert.alert(t('couldNotSubmitTourRequest'), errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={() => {
        resetModalState();
        onClose();
      }}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      hardwareAccelerated={true}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => {
          resetModalState();
          onClose();
        }}
      />
      <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
        {!isSummaryModalVisible && (
          <>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => {
                  resetModalState();
                  onClose();
                }}
                style={styles.backButton}
                android_ripple={{ color: colors.primary + '20', borderless: true }}
              >
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
              </Pressable>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="calendar-outline" size={24} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('selectTourDateTime')}</Text>
              </View>
              <Pressable onPress={() => {
                resetModalState();
                onClose();
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
        
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* STEP 1: Select Dates */}
          <View style={styles.section}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, { backgroundColor: Object.keys(selectedDates).length > 0 ? colors.primary : colors.border }]}>
                <Text style={[styles.stepNumberText, { color: Object.keys(selectedDates).length > 0 ? 'white' : colors.textMuted }]}>1</Text>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>📅 Select up to 3 Days</Text>
            </View>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={16} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Choose dates that work for you. We'll confirm availability within 24 hours and add confirmed tours to your calendar.
              </Text>
            </View>
            <View style={[styles.calendarContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Calendar
                minDate={(() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return tomorrow.toISOString().split('T')[0];
                })()}
                maxDate={(() => {
                  const maxDate = new Date();
                  maxDate.setDate(maxDate.getDate() + 30);
                  return maxDate.toISOString().split('T')[0];
                })()}
                onDayPress={handleDayPress}
                markedDates={{
                  ...selectedDates,
                  ...Object.keys(selectedDates).reduce((acc: {[key: string]: any}, date: string) => {
                    acc[date] = {
                      selected: true,
                      selectedColor: colors.primary,
                      selectedTextColor: '#ffffff',
                      marked: true,
                      dotColor: colors.primary
                    };
                    return acc;
                  }, {}),
                  [new Date().toISOString().split('T')[0]]: {
                    disabled: true,
                    disableTouchEvent: true,
                    textColor: colors.textMuted,
                    today: true
                  }
                }}
                theme={{
                  backgroundColor: colors.surface,
                  calendarBackground: colors.surface,
                  textSectionTitleColor: colors.text,
                  textSectionTitleDisabledColor: colors.textMuted,
                  selectedDayBackgroundColor: colors.primary,
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: colors.primary,
                  dayTextColor: colors.text,
                  textDisabledColor: colors.textMuted,
                  dotColor: colors.primary,
                  selectedDotColor: '#ffffff',
                  arrowColor: colors.primary,
                  disabledArrowColor: colors.textMuted,
                  monthTextColor: colors.text,
                  indicatorColor: colors.primary,
                  textDayFontFamily: 'System',
                  textMonthFontFamily: 'System',
                  textDayHeaderFontFamily: 'System',
                  textDayFontWeight: '500' as any,
                  textMonthFontWeight: 'bold' as any,
                  textDayHeaderFontWeight: '500' as any,
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14
                }}
                style={styles.calendar}
                enableSwipeMonths={true}
              />

              {/* Selected Dates Summary */}
              {Object.keys(selectedDates).length > 0 && (
                <View style={styles.selectedDatesSummary}>
                  <Text style={[styles.selectedDatesTitle, { color: colors.text }]}>
                    📅 Selected Dates ({Object.keys(selectedDates).length}/{maxSlots})
                  </Text>
                  <View style={styles.selectedDatesList}>
                    {Object.keys(selectedDates).map(date => (
                      <View key={date} style={[styles.selectedDateChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                        <Text style={[styles.selectedDateText, { color: colors.primary }]}>
                          {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Text>
                        <Pressable
                          onPress={() => handleDayPress({ dateString: date })}
                          style={styles.removeDateButton}
                        >
                          <Ionicons name="close-circle" size={16} color={colors.primary} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* STEP 2: Select Time Slots for Selected Days */}
          {Object.keys(selectedDates).length > 0 && (
            <View style={[styles.section, styles.timeSlotSection]}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: selectedDaySlots.length > 0 ? colors.primary : colors.border }]}>
                  <Text style={[styles.stepNumberText, { color: selectedDaySlots.length > 0 ? 'white' : colors.textMuted }]}>2</Text>
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>⏰ Choose Times for Each Day</Text>
              </View>
              <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                Choose morning or afternoon for each day, then select your preferred time slots. We'll contact you to confirm availability.
              </Text>
              <View style={styles.rulesBox}>
                <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                <Text style={[styles.rulesText, { color: colors.textSecondary }]}>
                  <Text style={{ fontWeight: '600' }}>Tour Rules:</Text> You can select up to 3 time slots per day, maximum 3 days total.
                  Priority ranking helps us know your top choices. We'll confirm within 24 hours.
                </Text>
              </View>

                            {Object.keys(selectedDates).map(date => {
                const selectedPeriod = selectedPeriods[date] || 'morning';
                const currentTimeSlots = generateTimeSlots(selectedPeriod);

                return (
                  <View key={date} style={styles.dayTimeSection}>
                    <Text style={[styles.dayTitle, { color: colors.text }]}>📅 {date}</Text>

                    {/* Morning/Afternoon Toggle */}
                    <View style={styles.periodToggleContainer}>
                      <Pressable
                        style={[
                          styles.periodToggle,
                          selectedPeriod === 'morning' && { backgroundColor: colors.primary }
                        ]}
                        onPress={() => handlePeriodToggle(date, 'morning')}
                      >
                        <Text style={[
                          styles.periodToggleText,
                          { color: selectedPeriod === 'morning' ? 'white' : colors.text }
                        ]}>
                          🌅 Morning
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.periodToggle,
                          selectedPeriod === 'afternoon' && { backgroundColor: colors.primary }
                        ]}
                        onPress={() => handlePeriodToggle(date, 'afternoon')}
                      >
                        <Text style={[
                          styles.periodToggleText,
                          { color: selectedPeriod === 'afternoon' ? 'white' : colors.text }
                        ]}>
                          🌞 Afternoon
                        </Text>
                      </Pressable>
                    </View>

                    {/* Time Slots Grid */}
                    <View style={styles.timeSlotsGrid}>
                      {currentTimeSlots.map((slot) => {
                        const isSelected = selectedDaySlots.some(s => s.date === date && s.time === slot.time);
                        const slotsForThisDay = selectedDaySlots.filter(s => s.date === date).length;
                        const canSelectMore = slotsForThisDay < 3 || isSelected;

                        return (
                          <Pressable
                            key={slot.time}
                            style={[
                              styles.timeSlotCard,
                              { backgroundColor: colors.surface, borderColor: colors.border },
                              isSelected && {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                              },
                              !canSelectMore && {
                                opacity: 0.5,
                              }
                            ]}
                            onPress={() => handleTimeSlotPress(date, slot)}
                            android_ripple={{
                              color: colors.primary + '30',
                              borderless: false,
                              radius: 60
                            }}
                            disabled={!canSelectMore}
                          >
                            <Text style={[
                              styles.timeSlotCardText,
                              { color: isSelected ? 'white' : colors.text },
                              isSelected && { fontWeight: '600' }
                            ]}>
                              {slot.display}
                            </Text>
                            {isSelected && (
                              <View style={styles.priorityBadge}>
                                <Text style={styles.priorityText}>
                                  {selectedDaySlots.find(s => s.date === date && s.time === slot.time)?.priority || ''}
                                </Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {/* Your Preferences - Show after all date selections */}
              {selectedDaySlots.length > 0 && (
                <View style={[styles.selectedSummary, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                  <View style={styles.summaryHeader}>
                    <View style={styles.summaryIcon}>
                      <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={styles.summaryTitleContainer}>
                      <Text style={[styles.summaryTitle, { color: colors.text }]}>🎯 Your Tour Preferences</Text>
                      <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>Tap any preference to make it your top choice • Reset to reorder</Text>
                    </View>
                    <View style={[styles.summaryCountBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.summaryCount}>{selectedDaySlots.length}</Text>
                    </View>
                  </View>

                  <View style={styles.preferencesList}>
                    {selectedDaySlots
                      .sort((a: {date: string, time: string, priority: number}, b: {date: string, time: string, priority: number}) => a.priority - b.priority)
                      .map((slot: {date: string, time: string, priority: number}, index: number) => {
                        // Format date for better display
                        const date = new Date(slot.time);
                        const timeDisplay = slot.time; // Already in 24-hour format

                        return (
                          <Pressable
                            key={`${slot.date}-${slot.time}`}
                            style={[styles.preferenceItem, {
                              backgroundColor: index === 0 ? '#FEF3C7' : colors.background
                            }]}
                            onPress={() => handlePriorityChange(index)}
                            android_ripple={{ color: colors.primary + '20' }}
                          >
                            <View style={styles.preferenceLeft}>
                              <View style={[styles.priorityIndicator, {
                                backgroundColor: index === 0 ? '#F59E0B' : colors.textMuted
                              }]}>
                                <Text style={styles.priorityNumber}>{slot.priority}</Text>
                              </View>
                              <View style={styles.preferenceContent}>
                                <Text style={[styles.preferenceDate, { color: colors.text }]}>{slot.date}</Text>
                                <Text style={[styles.preferenceTime, { color: index === 0 ? colors.text : colors.textSecondary }]}>
                                  🕐 {timeDisplay}
                                </Text>
                              </View>
                            </View>
                            {index === 0 && (
                              <View style={styles.topChoiceBadge}>
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text style={styles.topChoiceText}>Top Choice</Text>
                              </View>
                            )}
                            {index > 0 && (
                              <View style={styles.clickHint}>
                                <Ionicons name="swap-vertical" size={16} color={colors.textMuted} />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                  </View>

                  {selectedDaySlots.length > 1 && (
                    <View style={styles.resetButtonContainer}>
                      <Pressable
                        style={[styles.resetButton, { borderColor: colors.border }]}
                        onPress={handleResetPriorities}
                        android_ripple={{ color: colors.textMuted + '20' }}
                      >
                        <Ionicons name="refresh" size={16} color={colors.textSecondary} />
                        <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>Reset Order</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Separator between time slots and contact section */}
          <View style={styles.sectionSeparator} />

          <View style={[styles.section, styles.phoneSection]}>
            <Text style={[styles.stepTitle, { color: colors.text, marginBottom: 16 }]}>📞 {t('contactByPhone')} *</Text>
            <View style={styles.responseInfoBox}>
              <Ionicons name="time" size={16} color={colors.primary} />
              <Text style={[styles.responseInfoText, { color: colors.textSecondary }]}>
                We'll respond within 24 hours to confirm your tour times. Confirmed tours will be automatically added to your calendar.
              </Text>
            </View>
            <View style={styles.phoneInputContainer}>
              <Pressable style={[styles.countryCodePicker, {
                borderColor: phoneValidationError ? colors.error || '#ef4444' : colors.border,
                backgroundColor: colors.background
              }]} onPress={() => setIsCountryPickerVisible(true)}>
                <Text style={[styles.countryCodeText, { color: colors.text }]}>{countryCodes.find(c => c.code === selectedCountryCode)?.flag || '❓'}</Text>
                <Text style={[styles.countryCodeText, { color: colors.text }]}>{selectedCountryCode}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>
              <TextInput
                style={[styles.textInput, styles.phoneNumberInput, {
                  borderColor: phoneValidationError ? colors.error || '#ef4444' : colors.border,
                  color: colors.text
                }]}
                placeholder={t('phoneNumberPlaceholder')}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={handlePhoneNumberChange}
                maxLength={15}
              />
            </View>
            {phoneValidationError && (
              <Text style={[styles.validationError, { color: colors.error || '#ef4444' }]}>
                {phoneValidationError}
              </Text>
            )}
          </View>

          <View style={[styles.section, styles.notesSection]}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>📝 {t('addNotes')} (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput, { borderColor: colors.border, color: colors.text, height: 100 }]}
              placeholder={t('notesPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Multiple Listing Selection Section */}
          <View style={[styles.section, styles.multipleListingSection]}>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🏠 Property Selection</Text>
            </View>
            

            <View style={styles.tourOptionsContainer}>
              <Text style={[styles.tourOptionsTitle, { color: colors.text }]}>Choose Your Tour Type</Text>
              <View style={styles.multipleListingToggle}>
                <Pressable
                  style={[
                    styles.toggleButton,
                    styles.singlePropertyToggle,
                    !showMultipleListings && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      shadowColor: colors.primary,
                      shadowOpacity: 0.3,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 4,
                      elevation: 4
                    }
                  ]}
                  onPress={() => {
                    setShowMultipleListings(false);
                    setSelectedAdditionalListings([]);
                  }}
                  android_ripple={{ color: colors.primary + '30' }}
                >
                  <View style={styles.toggleButtonContent}>
                    <Text style={[styles.toggleEmoji, { color: !showMultipleListings ? 'white' : colors.primary }]}>
                      🏠
                    </Text>
                    <View style={styles.toggleTextContainer}>
                      <Text style={[
                        styles.toggleButtonTitle,
                        { color: !showMultipleListings ? 'white' : colors.text }
                      ]}>
                        Single Property
                      </Text>
                      <Text style={[
                        styles.toggleButtonSubtitle,
                        { color: !showMultipleListings ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                      ]}>
                        Focus on one perfect home
                      </Text>
                    </View>
                  </View>
                  {!showMultipleListings && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={[
                    styles.toggleButton,
                    styles.multiplePropertyToggle,
                    showMultipleListings && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                      shadowColor: colors.primary,
                      shadowOpacity: 0.3,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 4,
                      elevation: 4
                    }
                  ]}
                  onPress={() => setShowMultipleListings(true)}
                  android_ripple={{ color: colors.primary + '30' }}
                >
                  <View style={styles.toggleButtonContent}>
                    <Text style={[styles.toggleEmoji, { color: showMultipleListings ? 'white' : colors.primary }]}>
                      🏘️
                    </Text>
                    <View style={styles.toggleTextContainer}>
                      <Text style={[
                        styles.toggleButtonTitle,
                        { color: showMultipleListings ? 'white' : colors.text }
                      ]}>
                        Multiple Properties
                      </Text>
                      <Text style={[
                        styles.toggleButtonSubtitle,
                        { color: showMultipleListings ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                      ]}>
                        Compare & explore options
                      </Text>
                    </View>
                  </View>
                  {showMultipleListings && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                    </View>
                  )}
                </Pressable>
              </View>
            </View>

            {showMultipleListings && (
              <View style={styles.listingSelectionContainer}>
                {isLoadingListings ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                      Finding great properties for you...
                    </Text>
                  </View>
                ) : filteredListings.length > 0 ? (
                  <>
                    <View style={styles.selectionHeader}>
                      <View style={styles.selectionHeaderContent}>
                        <View style={styles.selectionIconContainer}>
                          <Text style={styles.selectionIcon}>🏢</Text>
                        </View>
                        <View style={styles.selectionTextContainer}>
                          <Text style={[styles.selectionTitle, { color: colors.text }]}>
                            Choose Additional Properties
                          </Text>
                          <Text style={[styles.selectionDescription, { color: colors.textSecondary }]}>
                            Select up to 4 more homes to explore
                          </Text>
                        </View>
                      </View>
                      <View style={[styles.selectionCounter, { backgroundColor: colors.primary }]}>
                        <Text style={styles.selectionCounterText}>
                          {selectedAdditionalListings.length}/4
                        </Text>
                      </View>
                    </View>

                    {/* Search and Filter Controls */}
                    <View style={[styles.searchFilterContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
                        <Ionicons name="search" size={20} color={colors.primary} />
                        <TextInput
                          style={[styles.searchInput, { color: colors.text }]}
                          placeholder={t('searchByNameLocation')}
                          placeholderTextColor={colors.textMuted}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                          <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                          </Pressable>
                        )}
                      </View>
                      <Pressable
                        style={[styles.filterButton, {
                          backgroundColor: Object.values(listingFilters).some(value => value !== '' && value !== undefined && value !== null) ? colors.primary : colors.surface,
                          borderColor: Object.values(listingFilters).some(value => value !== '' && value !== undefined && value !== null) ? colors.primary : colors.border,
                          shadowColor: Object.values(listingFilters).some(value => value !== '' && value !== undefined && value !== null) ? colors.primary : '#000',
                        }]}
                        onPress={() => setShowFilters(true)}
                        android_ripple={{ color: colors.primary + '30' }}
                      >
                        <Ionicons
                          name="options"
                          size={18}
                          color={Object.values(listingFilters).some(value => value !== '' && value !== undefined && value !== null) ? '#FFFFFF' : colors.primary}
                        />
                        <Text style={[styles.filterButtonText, {
                          color: Object.values(listingFilters).some(value => value !== '' && value !== undefined && value !== null) ? '#FFFFFF' : colors.primary,
                        }]}>
                          Filter
                        </Text>
                        {Object.values(listingFilters).some(value => value !== '' && value !== undefined && value !== null) && (
                          <View style={[styles.filterActiveDot, { backgroundColor: '#FFFFFF' }]} />
                        )}
                      </Pressable>
                    </View>

                    {/* Results count and info */}
                    <View style={styles.resultsContainer}>
                      <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
                        Showing {filteredListings.length} listings
                        {availableListings.length !== filteredListings.length && ` (filtered from ${availableListings.length})`}
                      </Text>
                      {alreadyRequestedListingIds.length > 0 && (
                        <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <Ionicons name="information-circle" size={16} color={colors.primary} />
                          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            {alreadyRequestedListingIds.length} listings hidden - you already have tour requests for them
                          </Text>
                        </View>
                      )}
                    </View>

                    <FlatList
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      data={filteredListings.slice(0, 50)} // Allow more results with filtering
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => {
                        const isSelected = selectedAdditionalListings.includes(item.id);
                        return (
                          <Pressable
                            style={[
                              styles.listingCard,
                              { backgroundColor: colors.surface, borderColor: colors.border },
                              isSelected && { borderColor: colors.primary, borderWidth: 2 }
                            ]}
                            onPress={() => handleAdditionalListingToggle(item.id)}
                          >
                            <View style={styles.listingImageContainer}>
                              {item.image_urls && item.image_urls[0] ? (
                                <Image
                                  source={{ uri: item.image_urls[0] }}
                                  style={styles.listingImage}
                                  contentFit="cover"
                                />
                              ) : (
                                <View style={styles.listingImagePlaceholder}>
                                  <Ionicons name="image" size={24} color={colors.textMuted} />
                                </View>
                              )}

                              {/* Saved listing indicator */}
                              {item.is_saved_by_user && (
                                <View style={styles.savedIndicator}>
                                  <Ionicons name="heart" size={16} color="#ef4444" />
                                </View>
                              )}
                            </View>
                            <View style={styles.listingInfo}>
                              <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={2}>
                                {item.title}
                              </Text>
                              <Text style={[styles.listingPrice, { color: colors.primary }]}>
                                ${item.price_per_month}/month
                              </Text>
                              <Text style={[styles.listingDetails, { color: colors.textSecondary }]}>
                                {item.bedrooms} bed • {item.bathrooms} bath • {item.neighborhood}
                              </Text>
                            </View>
                            {isSelected && (
                              <View style={[styles.selectionIndicator, { backgroundColor: colors.primary }]}>
                                <Ionicons name="checkmark" size={16} color="white" />
                              </View>
                            )}
                          </Pressable>
                        );
                      }}
                      contentContainerStyle={styles.listingsList}
                    />
                  </>
                ) : (
                  <View style={styles.noListingsContainer}>
                    <Text style={styles.noListingsEmoji}>🏠</Text>
                    <Text style={[styles.noListingsTitle, { color: colors.text }]}>
                      No More Properties Available
                    </Text>
                    <Text style={[styles.noListingsText, { color: colors.textSecondary }]}>
                      Great news! You've already requested tours for all available properties.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
          </ScrollView>

          {/* Fixed Submit Button */}
          <View style={styles.submitButtonContainer}>
            <Pressable
              style={[styles.submitButton, {
                backgroundColor: isSubmitting ? colors.textMuted : colors.primary,
                opacity: isSubmitting ? 0.7 : 1
              }]}
              onPress={handleSubmitTourRequest}
              disabled={isSubmitting}
              android_ripple={{
                color: 'rgba(255,255,255,0.3)',
                borderless: false
              }}
            >
              {isSubmitting ? (
                <View style={styles.submitButtonContent}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.submitButtonText}>
                    {t('submitting')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>
                  {t('submitRequest')}
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={isCountryPickerVisible}
          onRequestClose={() => setIsCountryPickerVisible(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setIsCountryPickerVisible(false)} />
          <View style={[styles.countryPickerModalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('selectCountryCode')}</Text>
              <Pressable onPress={() => setIsCountryPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView>
              {countryCodes.map((country, index) => (
                <Pressable
                  key={index}
                  style={[styles.countryOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    handleCountryCodeChange(country.code);
                    setIsCountryPickerVisible(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={[styles.countryName, { color: colors.text }]}>{country.code}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {isSummaryModalVisible && (
          <TourRequestSummaryModal
            isVisible={isSummaryModalVisible}
            onClose={() => {
              setIsSummaryModalVisible(false);
              resetModalState();
              // Call success callback to update parent state
              if (onSuccess) {
                onSuccess();
              }
              onClose();
            }}
            tourDetails={{
              listingIds: [listingId, ...selectedAdditionalListings], // Pass all listing IDs
              dates: selectedDaySlots.reduce((dates: string[], slot) => {
                if (!dates.includes(slot.date)) dates.push(slot.date);
                return dates;
              }, []).sort(), // Sort dates in chronological order
              timeSlots: selectedDaySlots.map((slot: {date: string, time: string, priority: number}) => ({
                time: slot.time,
                priority: slot.priority,
                date: slot.date
              })),
              notes,
              phoneNumber,
              countryCode: selectedCountryCode,
            }}
          />
        )}

        {/* Filter Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showFilters}
          onRequestClose={() => setShowFilters(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFilters(false)} />
          <View style={[styles.filterModalContent, { backgroundColor: colors.surface }]}>
            {/* Filter Modal Header */}
            <View style={styles.filterModalHeader}>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowFilters(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
              <Text style={[styles.filterModalTitle, { color: colors.text }]}>
                Filter Listings
              </Text>
              <Pressable
                style={[styles.filterResetButton, { borderColor: colors.primary }]}
                onPress={() => setListingFilters({
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
                })}
              >
                <Text style={[styles.filterResetButtonText, { color: colors.primary }]}>
                  Reset
                </Text>
              </Pressable>
            </View>

            {/* Filters Component */}
            <Filters
              filters={listingFilters}
              onFiltersChange={setListingFilters}
              onApply={() => setShowFilters(false)}
              onReset={() => setListingFilters({
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
              })}
              isMapView={false}
              showNeighborhoods={true}
            />
          </View>
        </Modal>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    height: '95%',
    maxHeight: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  timeSlotSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24, // Increased from 16
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  selectedSummary: {
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  summarySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  summaryTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  summaryCountBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  preferencesList: {
    gap: 12,
  },
  preferenceItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  priorityNumber: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preferenceTime: {
    fontSize: 14,
    fontWeight: '500',
  },
  topChoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 4,
  },
  topChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  clickHint: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
  },
  timeSlotCard: {
    width: '30%',
    minWidth: 90,
    height: 70,
    borderWidth: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  timeSlotCardText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  priorityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  priorityText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: 'white',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  countryCodePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  countryCodeText: {
    fontSize: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  phoneNumberInput: {
    flex: 1,
  },
  validationError: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },
  submitButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  countryPickerModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 12,
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    fontSize: 18,
  },
  dayTimeSection: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  periodToggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  periodToggle: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 32,
  },
  phoneSection: {
    marginBottom: 40,
  },
  notesInput: {
    marginTop: 24, // Increased from 16
  },
  sectionSeparator: {
    height: 24,
    backgroundColor: 'transparent',
  },
  summaryContent: {
    flex: 1,
  },
  confirmationMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  summaryBlock: {
    marginBottom: 15,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 2,
  },
  dateBlock: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeSlotsContainer: {
    gap: 8,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  timeSlotsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  timeSlotText: {
    fontSize: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  okButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  okButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for improved UX
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    color: '#64748B',
  },
  rulesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  rulesText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    color: '#92400E',
  },
  responseInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  responseInfoText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    color: '#065F46',
  },
  // Multiple listing selection styles
  multipleListingSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  multipleListingToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  // Tour Options Styles
  tourOptionsContainer: {
    marginBottom: 24,
  },
  tourOptionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  toggleButton: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  singlePropertyToggle: {
    marginRight: 8,
  },
  multiplePropertyToggle: {
    marginLeft: 8,
  },
  toggleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleEmoji: {
    fontSize: 28,
    textAlign: 'center',
    minWidth: 32,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleButtonTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  toggleButtonSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  listingSelectionContainer: {
    marginTop: 16,
  },
  // Selection header styles
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  selectionCounter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCounterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  selectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionIcon: {
    fontSize: 20,
  },
  selectionTextContainer: {
    flex: 1,
  },
  selectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  listingsList: {
    paddingHorizontal: 4,
    gap: 12,
  },
  listingCard: {
    width: 180,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  listingImageContainer: {
    height: 100,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  listingInfo: {
    padding: 16,
    backgroundColor: 'white',
  },
  listingTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 16,
  },
  listingPrice: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  listingDetails: {
    fontSize: 10,
    lineHeight: 14,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noListingsContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 16,
    marginTop: 16,
  },
  noListingsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  noListingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noListingsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Search and Filter Styles
  searchFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  savedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Filter Modal Styles
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
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  filterResetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterResetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  // Enhanced Calendar Styles
  calendarContainer: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  calendar: {
    borderRadius: 12,
    padding: 8,
  },
  selectedDatesSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  selectedDatesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedDatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeDateButton: {
    padding: 2,
  },
  // Section title styles
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },

  scrollContent: {
    paddingBottom: 120, // Extra space for the submit button
  },
});