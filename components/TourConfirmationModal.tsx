import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';
import { Calendar } from 'react-native-calendars';
import TourRequestSummaryModal from './TourRequestModal';
import { TourService } from '@/lib/tourService';
import { useSupabaseAuth } from '@/context/supabase-provider';

interface TourConfirmationModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  listingId: string;
  showComingSoon?: boolean;
}

const generateTimeSlots = (period: 'morning' | 'afternoon'): { time: string; display: string; label: string }[] => {
  // Generate 30-minute time slots for morning (9-12) or afternoon (1-5)
  const slots: { time: string; display: string; label: string }[] = [];

  const timeRange = period === 'morning'
    ? { start: 9, end: 12, emoji: '🌅', periodLabel: 'Morning' }
    : { start: 13, end: 17, emoji: '🌞', periodLabel: 'Afternoon' };

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

// Phone number validation function
const validatePhoneNumber = (phoneNumber: string, countryCode: string): { isValid: boolean; error?: string } => {
  // Remove all non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Basic validation - must have at least 7 digits (after country code)
  if (cleanNumber.length < 7) {
    return { isValid: false, error: 'Phone number too short. Please enter a valid phone number.' };
  }

  // Maximum reasonable length
  if (cleanNumber.length > 15) {
    return { isValid: false, error: 'Phone number too long. Please enter a valid phone number.' };
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
        error: `Invalid phone number format for ${countryCode}. Please check and try again.`
      };
    }
  }

  // General validation - must contain only numbers
  if (!/^\d+$/.test(cleanNumber)) {
    return { isValid: false, error: 'Phone number can only contain digits.' };
  }

  // Check for obviously invalid patterns (like all zeros, all same digit, etc.)
  if (/^0+$/.test(cleanNumber) || /^(\d)\1+$/.test(cleanNumber)) {
    return { isValid: false, error: 'Please enter a valid phone number.' };
  }

  return { isValid: true };
};

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
          Alert.alert('Maximum Days', `You can select up to ${maxSlots} different days.`);
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
        Alert.alert('Maximum Slots', `You can select up to ${maxSlots} time preferences total.`);
        return;
      }

      // Check slots per day limit (3 per day)
      const slotsForThisDay = selectedDaySlots.filter((s: {date: string, time: string, priority: number}) => s.date === date).length;
      if (slotsForThisDay >= 3) {
        Alert.alert('Maximum Slots Per Day', `You can select up to 3 time slots per day.`);
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
        setPhoneValidationError(validation.error || 'Invalid phone number');
      }
    }
  };

  const handleCountryCodeChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    // Re-validate phone number with new country code
    if (phoneNumber.trim()) {
      const validation = validatePhoneNumber(phoneNumber, countryCode);
      if (!validation.isValid) {
        setPhoneValidationError(validation.error || 'Invalid phone number');
      } else {
        setPhoneValidationError(null);
      }
    }
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
      Alert.alert('Invalid Phone Number', phoneValidation.error);
      return;
    }

    if (!session?.user?.id) {
      Alert.alert(t('userNotFoundPleaseLogInAgain'));
      return;
    }

    setIsSubmitting(true);

    try {
      const hasExistingRequest = await TourService.hasUserRequestedTourForListing(session.user.id, listingId);
      if (hasExistingRequest) {
        Alert.alert(t('tourRequestAlreadyExists'));
        setIsSubmitting(false);
        return;
      }

      // Group by date for the service
      const groupedByDate: {[key: string]: {time: string, priority: number}[]} = {};
      selectedDaySlots.forEach((slot: {date: string, time: string, priority: number}) => {
        if (!groupedByDate[slot.date]) {
          groupedByDate[slot.date] = [];
        }
        groupedByDate[slot.date].push({time: slot.time, priority: slot.priority});
      });

      await TourService.createTourRequest(listingId, {
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
      setIsSummaryModalVisible(true);

      // Call success callback to update parent state
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      console.error('Error submitting tour request:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      Alert.alert(t('couldNotSubmitTourRequest'), errorMessage);
    } finally {
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
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* STEP 1: Select Dates */}
          <View style={styles.section}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepNumber, { backgroundColor: Object.keys(selectedDates).length > 0 ? colors.primary : colors.border }]}>
                <Text style={[styles.stepNumberText, { color: Object.keys(selectedDates).length > 0 ? 'white' : colors.textMuted }]}>1</Text>
              </View>
              <Text style={[styles.stepTitle, { color: colors.text }]}>📅 Select up to 3 Days</Text>
            </View>
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
                  acc[date] = { selected: true, selectedColor: colors.primary };
                  return acc;
                }, {}),
                [new Date().toISOString().split('T')[0]]: {
                  disabled: true,
                  disableTouchEvent: true,
                  textColor: colors.textMuted
                }
              }}
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.text,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.primary,
                dayTextColor: colors.text,
                textDisabledColor: colors.textMuted,
                arrowColor: colors.primary,
                monthTextColor: colors.text,
              }}
            />
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
            <Text style={[styles.stepTitle, { color: colors.text }]}>📞 {t('contactByPhone')} *</Text>
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
        </ScrollView>
        
        <Pressable
          style={[styles.submitButton, { backgroundColor: isSubmitting ? colors.textMuted : colors.primary }]}
          onPress={handleSubmitTourRequest}
          disabled={isSubmitting}
          android_ripple={{
            color: 'rgba(255,255,255,0.3)',
            borderless: false
          }}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? t('submitting') : t('submitRequest')}
          </Text>
        </Pressable>

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

        <TourRequestSummaryModal
          isVisible={isSummaryModalVisible}
          onClose={() => {
            resetModalState();
            onClose();
          }}
          tourDetails={{
            dates: Object.keys(selectedDates).filter((date: string) => selectedDates[date].selected),
            timeSlots: selectedDaySlots.map((slot: {date: string, time: string, priority: number}) => ({
              time: slot.time,
              priority: slot.priority,
              date: slot.date // Include date information
            })),
            notes,
            phoneNumber,
            countryCode: selectedCountryCode,
          }}
        />
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
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    height: '90%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 24,
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
    minWidth: 85,
    height: 65,
    borderWidth: 1.5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
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
  submitButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
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
    marginBottom: 24,
  },
  notesInput: {
    marginTop: 24, // Increased from 16
  },
  sectionSeparator: {
    height: 24,
    backgroundColor: 'transparent',
  },
});