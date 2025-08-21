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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';
import { TourModalProps, TourRequestData } from './types/tour';

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
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
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
      setSelectedDates([]);
      setSelectedTimeSlots([]);
      setWantsPhoneContact(false);
      setSelectedPhoneFormat(PHONE_FORMATS[0]);
      setShowPhoneFormatModal(false);
      setWantsToAddNotes(false);
      setNotes('');
    }
  }, [visible]);

  // Memoize display phone number
  const displayPhoneNumber = useMemo(() => {
    return phoneNumber.replace(/^\+1\s*/, '');
  }, [phoneNumber]);



  // Remove date
  const removeDate = (dateToRemove: Date) => {
    setSelectedDates(prev => prev.filter(date => date.toDateString() !== dateToRemove.toDateString()));
  };

  // Get next 15 days for quick selection
  const getNext15Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (selectedDates.length === 0 || selectedTimeSlots.length === 0) {
      Alert.alert("Please select at least one date and one time slot.");
      return;
    }
    if (wantsPhoneContact && !displayPhoneNumber.trim()) {
      Alert.alert("Please enter your phone number.");
      return;
    }

    // Create preferred times for all selected dates and time combinations
    const preferredTimes: string[] = [];
    selectedDates.forEach(date => {
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
      selected_dates: selectedDates,
      selected_time_slots: selectedTimeSlots,
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
      <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>{t('requestATour')}</Text>
        <Text style={[styles.modalGreeting, { color: colors.text }]}>
          {t('hello')}, {userName || 'there'}!
        </Text>
        <Text style={[styles.modalSubtext, { color: colors.textSecondary }]}>
          {t('selectPreferredTimes').replace('{email}', userEmail || 'your email')}
        </Text>

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

          {/* Quick Date Selection - Column Layout */}
          <View style={styles.quickDatesGrid}>
            {getNext15Days().map((date, index) => {
              const isSelected = selectedDates.some(selected => selected.toDateString() === date.toDateString());
              return (
                <Pressable
                  key={index}
                  style={[
                    styles.quickDateChip,
                    { backgroundColor: colors.background },
                    isSelected && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => {
                    const dateStr = date.toDateString();
                    const isAlreadySelected = selectedDates.some(d => d.toDateString() === dateStr);

                    if (isAlreadySelected) {
                      setSelectedDates(prev => prev.filter(d => d.toDateString() !== dateStr));
                    } else {
                      setSelectedDates(prev => [...prev, date]);
                    }
                  }}
                >
                  <Text style={[
                    styles.quickDateText,
                    { color: colors.text },
                    isSelected && { color: 'white' }
                  ]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Selected Dates Display */}
          {selectedDates.length > 0 && (
            <View style={styles.selectedDatesContainer}>
              <Text style={[styles.selectedDatesTitle, { color: colors.text }]}>
                {t('selectedDates')} ({selectedDates.length}):
              </Text>
              <View style={styles.selectedDatesList}>
                {selectedDates.map((date, index) => (
                  <View key={index} style={[styles.selectedDateChip, { backgroundColor: colors.primary }]}>
                    <Text style={styles.selectedDateText}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    <Pressable
                      style={styles.removeDateButton}
                      onPress={() => removeDate(date)}
                    >
                      <Text style={styles.removeDateText}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Time Slot Selection - Multi-select (Responsive) */}
        <View style={styles.timeSection}>
          <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
            {t('chooseTimePreferences')}
          </Text>
          <View style={[styles.timeSlotContainer, {
            flexDirection: width > 600 ? 'row' : 'column',
            flexWrap: width > 600 ? 'wrap' : 'nowrap',
          }]}>
            {timeSlots.map(time => {
              const isSelected = selectedTimeSlots.includes(time);
              return (
                <Pressable
                  key={time}
                  style={[
                    styles.timeChip,
                    { backgroundColor: colors.background },
                    isSelected && { backgroundColor: colors.primary },
                    width > 600 ? { width: '48%', marginHorizontal: 4 } : { width: '100%' }
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedTimeSlots(prev => prev.filter(t => t !== time));
                    } else {
                      setSelectedTimeSlots(prev => [...prev, time]);
                    }
                  }}
                >
                  <Text style={[
                    styles.timeChipText,
                    { color: colors.text },
                    isSelected && { color: 'white' }
                  ]}>
                    {time}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Date Picker Modal - Removed for web compatibility */}

        {/* Enhanced Selected Times Display */}
        {selectedDates.length > 0 && selectedTimeSlots.length > 0 && (
          <View style={[styles.selectedTimeDisplay, { backgroundColor: colors.background }]}>
            <Text style={[styles.selectedTimeHeader, { color: colors.text }]}>
              📅 Selected Schedule
            </Text>
            <View style={styles.selectedTimeGrid}>
              {selectedDates.map((date, dateIndex) => (
                <View key={dateIndex} style={styles.selectedDateRow}>
                  <Text style={[styles.selectedDateLabel, { color: colors.primary }]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}:
                  </Text>
                  <View style={styles.selectedTimeSlotsRow}>
                    {selectedTimeSlots.map((timeSlot, timeIndex) => (
                      <View key={timeIndex} style={[styles.selectedTimeSlotChip, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.selectedTimeSlotText, { color: colors.primary }]}>
                          {timeSlot}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

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
      </View>
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
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: 16,
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

  quickDatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  quickDateChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    minWidth: 85,
    alignItems: 'center',
    flex: 1,
    maxWidth: '30%',
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedDatesContainer: {
    marginTop: 8,
  },
  selectedDatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedDatesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
  },
  selectedDateText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  removeDateButton: {
    marginLeft: 8,
    padding: 2,
  },
  removeDateText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Time section styles
  timeSection: {
    marginBottom: 16,
  },
  timeSlotContainer: {
    gap: 12,
  },
  timeChip: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Selected time display styles
  selectedTimeDisplay: {
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  selectedTimeHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
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
    marginTop: 16,
  },
  phoneLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginTop: 16,
  },
  notesLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesToggleLabel: {
    fontSize: 16,
  },
  notesEmoji: {
    fontSize: 16,
  },
  notesInputContainer: {
    borderRadius: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
});
