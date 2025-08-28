import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
  useWindowDimensions,
  ScrollView
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';
import { TourModalProps, TourRequestData, PrioritySlot } from './types/tour';

interface PhoneFormat {
  code: string;
  name: string;
  flag: string;
  format: string;
}

const PHONE_FORMATS: PhoneFormat[] = [
  { code: '+1', name: 'United States', flag: '🇺🇸', format: '+1 (XXX) XXX-XXXX' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧', format: '+44 XXXX XXX XXX' },
  { code: '+86', name: 'China', flag: '🇨🇳', format: '+86 XXX XXXX XXXX' },
  { code: '+33', name: 'France', flag: '🇫🇷', format: '+33 X XX XX XX XX' },
  { code: '+49', name: 'Germany', flag: '🇩🇪', format: '+49 XXX XXX XXXX' },
  { code: '+81', name: 'Japan', flag: '🇯🇵', format: '+81 XX XXXX XXXX' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬', format: '+65 XXXX XXXX' },
  { code: '+91', name: 'India', flag: '🇮🇳', format: '+91 XXXXX XXXXX' },
  { code: '+61', name: 'Australia', flag: '🇦🇺', format: '+61 X XXXX XXXX' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷', format: '+55 XX XXXXX XXXX' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽', format: '+52 XX XXXX XXXX' },
];

export function TourRequestModal({
  visible,
  onClose,
  listingId,
  listingTitle,
  listingAddress,
  userEmail,
  userName,
  userPhone,
  onSubmit,
  isSubmitting = false,
}: TourModalProps) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = useMemo(() => themeColors[theme], [theme]);

  // Form state
  const [selectedDates, setSelectedDates] = useState<{[key: string]: {selected: boolean}}>({});
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [prioritySlots, setPrioritySlots] = useState<PrioritySlot[]>([]);
  const [wantsPhoneContact, setWantsPhoneContact] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('+1 ');
  const [selectedPhoneFormat, setSelectedPhoneFormat] = useState<PhoneFormat>(PHONE_FORMATS[0]);
  const [showPhoneFormatModal, setShowPhoneFormatModal] = useState(false);
  const [wantsToAddNotes, setWantsToAddNotes] = useState(false);
  const [notes, setNotes] = useState('');

  // UI state - DateTimePicker removed for web compatibility

  // Pre-fill phone number if available
  useEffect(() => {
    if (userPhone) {
      // Try to detect the country code from the existing phone number
      let detectedFormat = PHONE_FORMATS[0]; // Default to US
      for (const format of PHONE_FORMATS) {
        if (userPhone.startsWith(format.code)) {
          detectedFormat = format;
          break;
        }
      }
      setSelectedPhoneFormat(detectedFormat);
      const cleanNumber = userPhone.replace(new RegExp(`^\\${detectedFormat.code}\\s*`), '');
      setPhoneNumber(`${detectedFormat.code} ${cleanNumber}`);
    }
  }, [userPhone]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedDates({});
      setSelectedTimeSlots([]);
      setPrioritySlots([]);
      setWantsPhoneContact(false);
      setSelectedPhoneFormat(PHONE_FORMATS[0]);
      setShowPhoneFormatModal(false);
      setWantsToAddNotes(false);
      setNotes('');
    }
  }, [visible]);

  // Helper functions for priority management
  const getPriorityRank = (timeSlot: string): number => {
    const priority = prioritySlots.find(p => p.time === timeSlot);
    return priority?.rank || 0;
  };

  const getNextPriorityRank = (): 1 | 2 | 3 | null => {
    const usedRanks = prioritySlots.map(p => p.rank);
    if (!usedRanks.includes(1)) return 1;
    if (!usedRanks.includes(2)) return 2;
    if (!usedRanks.includes(3)) return 3;
    return null;
  };

  const assignPriority = (timeSlot: string) => {
    const existingPriority = prioritySlots.find(p => p.time === timeSlot);
    if (existingPriority) {
      // Remove existing priority
      setPrioritySlots(prev => prev.filter(p => p.time !== timeSlot));
    } else {
      // Assign new priority based on click order (number of selected slots)
      const currentSelectedCount = selectedTimeSlots.length;
      const newRank = Math.min(currentSelectedCount + 1, 3) as 1 | 2 | 3;

      if (prioritySlots.length < 3) {
        setPrioritySlots(prev => [...prev, { time: timeSlot, rank: newRank }].sort((a, b) => a.rank - b.rank));
      }
    }
  };

  const removePriority = (timeSlot: string) => {
    setPrioritySlots(prev => prev.filter(p => p.time !== timeSlot));
  };

  // Memoize display phone number
  const displayPhoneNumber = useMemo(() => {
    return phoneNumber.replace(/^\+1\s*/, '');
  }, [phoneNumber]);



  // Get selected dates as Date objects for compatibility
  const getSelectedDatesAsArray = () => {
    return Object.keys(selectedDates)
      .filter(dateString => selectedDates[dateString].selected)
      .map(dateString => new Date(dateString));
  };

  // Handle calendar day press
  const handleDayPress = (day: any) => {
    const dateString = day.dateString;
    setSelectedDates(prev => {
      const newDates = { ...prev };
      if (newDates[dateString]?.selected) {
        delete newDates[dateString];
      } else {
        newDates[dateString] = { selected: true };
      }
      return newDates;
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    const selectedDatesArray = getSelectedDatesAsArray();

    if (selectedDatesArray.length === 0 || selectedTimeSlots.length === 0) {
      Alert.alert("Please select at least one date and one time slot.");
      return;
    }
    if (wantsPhoneContact && !displayPhoneNumber.trim()) {
      Alert.alert("Please enter your phone number.");
      return;
    }

    // Create preferred times for all selected dates and time combinations
    const preferredTimes: string[] = [];
    selectedDatesArray.forEach(date => {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      selectedTimeSlots.forEach(timeSlot => {
        preferredTimes.push(`${dayName}, ${dateStr} at ${timeSlot}`);
      });
    });

    const cleanPhone = phoneNumber.replace(new RegExp(`^\\${selectedPhoneFormat.code}\\s*`), '').trim();

    // Determine contact method
    let contactMethod: 'email' | 'phone' | 'both' = 'email';
    if (wantsPhoneContact && cleanPhone) {
      contactMethod = 'both';
    } else if (wantsPhoneContact) {
      contactMethod = 'phone';
    }

    const requestData: TourRequestData = {
      user_id: '', // This should be provided by parent
      listing_id: listingId,
      preferred_times: preferredTimes,
      contact_phone: wantsPhoneContact ? `${selectedPhoneFormat.code} ${cleanPhone}` : undefined,
      contact_method: contactMethod,
      selected_dates: selectedDatesArray,
      selected_time_slots: selectedTimeSlots,
      priority_slots: prioritySlots.length > 0 ? prioritySlots : undefined,
      notes: wantsToAddNotes ? notes.trim() : undefined,
    };

    await onSubmit(requestData);
  };

  const timeSlots = [
    "9:00 AM - 12:00 PM",
    "12:00 PM - 3:00 PM",
    "3:00 PM - 6:00 PM",
    "6:00 PM - 9:00 PM"
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <ScrollView
        style={[styles.modalContent, { backgroundColor: colors.surface }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={[styles.modalTitle, { color: colors.text }]}>{t('requestATour')}</Text>
        <Text style={[styles.modalGreeting, { color: colors.text }]}>
          {t('hello')}, {userName || 'there'}!
        </Text>
        <Text style={[styles.modalSubtext, { color: colors.textSecondary }]}>
          {t('selectPreferredTimes').replace('{email}', userEmail || 'your email')}
        </Text>

        <View style={styles.sectionSpacer} />

        {/* Enhanced Date & Time Selection */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>
          {t('selectPreferredTimes').split('.')[0]}
        </Text>

        {/* Date Selection Section */}
        <View style={styles.dateSection}>
          <View style={styles.dateHeader}>
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              {t('chooseAvailableDates')}
            </Text>
          </View>

          {/* Calendar Component - Compact and Responsive */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.calendarScrollContainer}
            contentContainerStyle={styles.calendarContentContainer}
          >
            <View style={[styles.calendarContainer, { width: Math.max(width - 32, 320) }]}>
              <Calendar
                onDayPress={handleDayPress}
                markedDates={selectedDates}
                markingType={'multi-dot'}
                theme={{
                  selectedDayBackgroundColor: colors.primary,
                  todayTextColor: colors.primary,
                  arrowColor: colors.primary,
                  textDayFontFamily: 'System',
                  textMonthFontFamily: 'System',
                  textDayHeaderFontFamily: 'System',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 12,
                  'stylesheet.calendar.main': {
                    container: {
                      paddingLeft: 0,
                      paddingRight: 0,
                      backgroundColor: 'transparent',
                      width: '100%',
                    },
                    monthView: {
                      backgroundColor: 'transparent',
                      width: '100%',
                    },
                  },
                  'stylesheet.calendar.header': {
                    header: {
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingLeft: 5,
                      paddingRight: 5,
                      marginTop: 6,
                      alignItems: 'center',
                      width: '100%',
                    },
                    monthText: {
                      margin: 5,
                      fontSize: 16,
                      fontWeight: '600',
                      textAlign: 'center',
                      backgroundColor: 'transparent',
                      flex: 1,
                    },
                    arrow: {
                      padding: 8,
                    },
                    week: {
                      marginTop: 5,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      width: '100%',
                    },
                  },
                  'stylesheet.day.basic': {
                    base: {
                      width: 28,
                      height: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    text: {
                      fontSize: 14,
                      fontWeight: '400',
                    },
                  },
                  'stylesheet.day.single': {
                    base: {
                      width: 28,
                      height: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    text: {
                      fontSize: 14,
                      fontWeight: '400',
                    },
                  },
                }}
                minDate={new Date().toISOString().split('T')[0]} // Disable past dates
                maxDate={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} // 14-day limit
                enableSwipeMonths={true}
                hideExtraDays={true}
                firstDay={1} // Start week on Monday
                showWeekNumbers={false}
                monthFormat={'MMM yyyy'}
                hideArrows={false}
              />
            </View>
          </ScrollView>

          {/* Selected Dates Display */}
          {Object.keys(selectedDates).length > 0 && (
            <View style={[styles.selectedDatesContainer, { backgroundColor: colors.background }]}>
              <View style={styles.selectedDatesHeader}>
                <Text style={[styles.selectedDatesTitle, { color: colors.text }]}>
                  📅 Selected Dates ({Object.keys(selectedDates).length})
                </Text>
                <Text style={[styles.clearAllText, { color: colors.primary }]}
                      onPress={() => setSelectedDates({})}>
                  Clear All
                </Text>
              </View>
              <View style={styles.selectedDatesList}>
                {Object.keys(selectedDates)
                  .sort() // Sort dates chronologically
                  .map((dateString) => {
                  const date = new Date(dateString);
                  return (
                    <View key={dateString} style={[styles.selectedDateChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                      <Text style={[styles.selectedDateText, { color: colors.primary }]}>
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </Text>
                      <Pressable
                        style={styles.removeDateButton}
                        onPress={() => handleDayPress({ dateString })}
                      >
                        <Ionicons name="close-circle" size={16} color={colors.primary} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.sectionSpacer} />

        {/* Time Slot Selection with Priority Ranking */}
        <View style={styles.timeSection}>
          <View style={styles.timeSectionHeader}>
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              {t('chooseTimePreferences')}
            </Text>
            {prioritySlots.length > 0 && (
              <View style={[styles.priorityBadge, { backgroundColor: '#FFC700' + '20' }]}>
                <Ionicons name="star" size={14} color="#FFC700" />
                <Text style={[styles.priorityBadgeText, { color: '#FFC700' }]}>
                  {prioritySlots.length} Priority{prioritySlots.length > 1 ? 'ies' : 'y'} Set
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.priorityHint, { color: colors.textSecondary }]}>
            Select up to 3 time slots • Priority based on selection order (first = highest priority)
          </Text>
          <View style={styles.timeSlotContainer}>
            {timeSlots.map(time => {
              const isSelected = selectedTimeSlots.includes(time);
              const priorityRank = getPriorityRank(time);
              const priorityColors = {
                1: '#60A5FA', // Light blue for #1 (highest priority)
                2: '#34D399', // Light green for #2
                3: '#F87171', // Light red for #3
              };
              const priorityColor = priorityColors[priorityRank as keyof typeof priorityColors] || colors.primary;

              return (
                <View key={time} style={styles.timeSlotRow}>
                  <Pressable
                    style={[
                      styles.timeChip,
                      { backgroundColor: colors.background },
                      isSelected && priorityRank === 0 && { backgroundColor: colors.primary + '10' },
                      priorityRank > 0 && {
                        borderColor: priorityColor,
                        borderWidth: 2,
                        backgroundColor: priorityColor + '05'
                      },

                    ]}
                    onPress={() => {
                      if (isSelected) {
                        // Remove from selection and priority
                        setSelectedTimeSlots(prev => prev.filter(t => t !== time));
                        removePriority(time);
                      } else {
                        // Add to selection and assign priority based on order
                        if (selectedTimeSlots.length < 3) {
                          setSelectedTimeSlots(prev => [...prev, time]);
                          assignPriority(time);
                        }
                      }
                    }}
                  >
                    <View style={styles.timeChipContent}>
                      <Text style={[
                        styles.timeChipText,
                        { color: colors.text },
                        isSelected && priorityRank === 0 && { color: colors.primary },
                        priorityRank > 0 && { color: priorityColor, fontWeight: '700' }
                      ]}>
                        {time}
                      </Text>
                      {priorityRank > 0 && (
                        <View style={styles.priorityIndicator}>
                          <Ionicons name="star" size={18} color={priorityColor} />
                          <Text style={[styles.priorityNumber, { color: priorityColor }]}>
                            #{priorityRank}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
          {selectedTimeSlots.length >= 3 && (
            <Text style={[styles.selectionLimitText, { color: colors.textSecondary }]}>
              Maximum 3 time slots allowed
            </Text>
          )}
        </View>

        {/* Date Picker Modal - Removed for web compatibility */}

        {/* Enhanced Selected Times Display */}
        {Object.keys(selectedDates).length > 0 && selectedTimeSlots.length > 0 && (
          <View style={[styles.selectedTimeDisplay, { backgroundColor: colors.background }]}>
            <View style={styles.selectedTimeHeader}>
              <Text style={[styles.selectedTimeTitle, { color: colors.text }]}>
                📅 Selected Schedule
              </Text>
              {prioritySlots.length > 0 && (
                <View style={styles.prioritySummary}>
                  <Ionicons name="trophy" size={16} color="#FFD700" />
                  <Text style={[styles.prioritySummaryText, { color: colors.text }]}>
                    {prioritySlots.length} prioritized slot{prioritySlots.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {prioritySlots.length > 0 && (
              <View style={styles.priorityRankingDisplay}>
                <Text style={[styles.priorityRankingTitle, { color: colors.text }]}>
                  🎯 Priority Order
                </Text>
                <View style={styles.priorityRankingList}>
                  {prioritySlots
                    .sort((a, b) => a.rank - b.rank)
                                      .map((priority, index) => {
                    const priorityColors = {
                      1: '#60A5FA',
                      2: '#34D399',
                      3: '#F87171',
                    };
                    const color = priorityColors[priority.rank as keyof typeof priorityColors];

                      return (
                        <View key={priority.time} style={styles.priorityRankingItem}>
                          <View style={[
                            styles.priorityRankBadge,
                            {
                              backgroundColor: color + '15',
                              borderColor: color + '30',
                              shadowColor: color,
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 4,
                              elevation: 2,
                            }
                          ]}>
                            <Text style={[styles.priorityRankNumber, { color }]}>
                              {priority.rank}
                            </Text>
                            <Ionicons name="star" size={14} color={color} />
                          </View>
                          <Text style={[styles.priorityRankTime, { color: colors.text }]}>
                            {priority.time}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              </View>
            )}

            <View style={styles.selectedTimeGrid}>
              {Object.keys(selectedDates)
                .sort() // Sort dates chronologically
                .map((dateString) => {
                const date = new Date(dateString);
                return (
                  <View key={dateString} style={styles.selectedDateRow}>
                    <Text style={[styles.selectedDateLabel, { color: colors.primary }]}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}:
                    </Text>
                    <View style={styles.selectedTimeSlotsRow}>
                      {selectedTimeSlots
                        .sort((a, b) => getPriorityRank(a) - getPriorityRank(b)) // Sort by priority
                        .map((timeSlot, timeIndex) => {
                        const rank = getPriorityRank(timeSlot);
                        const priorityColors = {
                          1: '#60A5FA',
                          2: '#34D399',
                          3: '#F87171',
                        };
                        const priorityColor = priorityColors[rank as keyof typeof priorityColors];

                        return (
                          <View key={timeIndex} style={[
                            styles.selectedTimeSlotChip,
                            {
                              backgroundColor: rank > 0 ? priorityColor + '15' : colors.primary + '10',
                              borderColor: rank > 0 ? priorityColor : colors.primary,
                              borderWidth: 1,
                            }
                          ]}>
                            <Text style={[
                              styles.selectedTimeSlotText,
                              {
                                color: rank > 0 ? priorityColor : colors.primary,
                                fontWeight: rank > 0 ? '600' : '500',
                              }
                            ]}>
                              {timeSlot}
                              {rank > 0 && (
                                <Text style={[styles.priorityChipNumber, { color: priorityColor }]}>
                                  #{rank}
                                </Text>
                              )}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.sectionSpacer} />

        {/* Phone Number Opt-in */}
        <View style={styles.phoneToggleContainer}>
          <View style={styles.phoneLabelContainer}>
            <Text style={[styles.phoneToggleLabel, { color: colors.text }]}>
              {t('preferCallOrText')}
            </Text>
            <Text style={styles.flagEmoji}>🇺🇸</Text>
          </View>
          <Switch
            value={wantsPhoneContact}
            onValueChange={setWantsPhoneContact}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={wantsPhoneContact ? colors.primary : colors.textSecondary}
          />
        </View>
        {wantsPhoneContact && (
          <View style={styles.phoneSection}>
            {/* Phone Format Selector */}
            <Pressable
              style={[styles.phoneFormatSelector, { backgroundColor: colors.background }]}
              onPress={() => setShowPhoneFormatModal(true)}
            >
              <Text style={[styles.phoneFormatText, { color: colors.text }]}>
                {selectedPhoneFormat.flag} {selectedPhoneFormat.name} ({selectedPhoneFormat.code})
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            </Pressable>

            {/* Phone Number Input */}
            <View style={[styles.phoneInputContainer, { backgroundColor: colors.background }]}>
              <Text style={[styles.phonePrefix, { color: colors.textSecondary }]}>
                {selectedPhoneFormat.code}
              </Text>
              <TextInput
                style={[styles.phoneInput, {
                  color: colors.text
                }]}
                placeholder={selectedPhoneFormat.format.replace(selectedPhoneFormat.code, '').replace(/X/g, '0').trim()}
                placeholderTextColor={colors.textSecondary}
                value={phoneNumber.replace(new RegExp(`^\\${selectedPhoneFormat.code}\\s*`), '')}
                onChangeText={(text) => {
                  const cleanText = text.replace(/[^\d\-\s()]/g, '');
                  setPhoneNumber(`${selectedPhoneFormat.code} ${cleanText}`);
                }}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>
          </View>
        )}

        {/* Phone Format Selection Modal */}
        <Modal
          visible={showPhoneFormatModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPhoneFormatModal(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowPhoneFormatModal(false)} />
          <View style={[styles.phoneFormatModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.phoneFormatModalTitle, { color: colors.text }]}>
              {t('selectCountry')}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {PHONE_FORMATS.map((format) => (
                <Pressable
                  key={format.code}
                  style={[
                    styles.phoneFormatOption,
                    { borderBottomColor: colors.border },
                    selectedPhoneFormat.code === format.code && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setSelectedPhoneFormat(format);
                    setPhoneNumber(`${format.code} `);
                    setShowPhoneFormatModal(false);
                  }}
                >
                  <Text style={styles.phoneFormatFlag}>{format.flag}</Text>
                  <View style={styles.phoneFormatDetails}>
                    <Text style={[styles.phoneFormatName, { color: colors.text }]}>
                      {format.name}
                    </Text>
                    <Text style={[styles.phoneFormatCode, { color: colors.textSecondary }]}>
                      {format.code} • {format.format}
                    </Text>
                  </View>
                  {selectedPhoneFormat.code === format.code && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              style={[styles.phoneFormatCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowPhoneFormatModal(false)}
            >
              <Text style={styles.phoneFormatCloseText}>{t('done')}</Text>
            </Pressable>
          </View>
        </Modal>

        <View style={styles.sectionSpacer} />

        {/* Notes/Message Opt-in */}
        <View style={styles.notesToggleContainer}>
          <View style={styles.notesLabelContainer}>
            <Text style={[styles.notesToggleLabel, { color: colors.text }]}>
              {t('addNotesOrRequests')}
            </Text>
            <Text style={styles.notesEmoji}>📝</Text>
          </View>
          <Switch
            value={wantsToAddNotes}
            onValueChange={setWantsToAddNotes}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={wantsToAddNotes ? colors.primary : colors.textSecondary}
          />
        </View>
        {wantsToAddNotes && (
          <View style={[styles.notesInputContainer, { backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.notesInput, {
                color: colors.text
              }]}
              placeholder={t('specialRequestsPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={[styles.notesCharacterCount, { color: colors.textSecondary }]}>
              {notes.length}/500
            </Text>
          </View>
        )}

        <View style={styles.sectionSpacer} />

        {/* Submit Button */}
        <Pressable
          style={[
            styles.requestButton,
            { backgroundColor: colors.primary },
            (isSubmitting) && styles.requestButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <View style={styles.buttonLoader} />
          )}
          <Text style={styles.requestButtonText}>
            {isSubmitting ? t('submitting') : t('submitRequest')}
          </Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
  },
  sectionSpacer: {
    height: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalGreeting: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  modalSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  // Date section styles
  dateSection: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarScrollContainer: {
    marginBottom: 16,
  },
  calendarContentContainer: {
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },


  selectedDatesContainer: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedDatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDatesTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  selectedDatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeDateButton: {
    marginLeft: 6,
    padding: 2,
  },
  // Time section styles
  timeSection: {
    marginBottom: 16,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeSlotContainer: {
    gap: 12,
    marginTop: 8,
  },
  timeChip: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityTimeChip: {
    shadowColor: '#FFC700',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Selected time display styles
  selectedTimeDisplay: {
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  selectedTimeGrid: {
    gap: 8,
  },
  selectedDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  selectedDateLabel: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 100,
  },
  selectedTimeSlotsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedTimeSlotChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginVertical: 2,
  },
  selectedTimeSlotText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Phone input styles
  phoneToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  phoneLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phoneToggleLabel: {
    fontSize: 16,
  },
  flagEmoji: {
    fontSize: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  phonePrefix: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  phoneSection: {
    gap: 12,
  },
  phoneFormatSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  phoneFormatText: {
    fontSize: 16,
    flex: 1,
  },
  phoneFormatModal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  phoneFormatModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  phoneFormatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 12,
  },
  phoneFormatFlag: {
    fontSize: 24,
  },
  phoneFormatDetails: {
    flex: 1,
    gap: 2,
  },
  phoneFormatName: {
    fontSize: 16,
    fontWeight: '600',
  },
  phoneFormatCode: {
    fontSize: 14,
  },
  phoneFormatCloseButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  phoneFormatCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Notes styles
  notesToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  notesLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notesToggleLabel: {
    fontSize: 16,
  },
  notesEmoji: {
    fontSize: 16,
  },
  notesInputContainer: {
    borderRadius: 12,
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  notesInput: {
    fontSize: 16,
    minHeight: 80,
    padding: 0,
  },
  notesCharacterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  // Submit button styles
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
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    borderTopColor: 'transparent',
  },
  // Priority ranking styles
  priorityHint: {
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectionLimitText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Enhanced priority styles
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 12,
  },
  priorityNumber: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Enhanced selected time display styles
  selectedTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedTimeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  prioritySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prioritySummaryText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Priority ranking display
  priorityRankingDisplay: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityRankingTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  priorityRankingList: {
    gap: 8,
  },
  priorityRankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityRankNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityRankTime: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  priorityRankArrow: {
    fontSize: 14,
    fontWeight: '300',
  },

  // Enhanced time chip styles
  priorityChipNumber: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
});
