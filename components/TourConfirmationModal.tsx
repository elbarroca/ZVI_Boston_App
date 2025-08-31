import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
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
  listingId: string;
  showComingSoon?: boolean; // New prop to control content
}

export default function TourConfirmationModal({ isVisible, onClose, listingId, showComingSoon }: TourConfirmationModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { session } = useSupabaseAuth();
  const colors = themeColors[theme];

  const [selectedDates, setSelectedDates] = useState<{[key: string]: {selected: boolean}}>({});
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [prioritySlots, setPrioritySlots] = useState<{time: string, priority: number}[]>([]);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [notes, setNotes] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1'); // Default to US
  const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const countryCodes = [
    { code: '+1', flag: '🇺🇸' }, // US
    { code: '+49', flag: '🇩🇪' }, // Germany
    { code: '+86', flag: '🇨🇳' }, // China
    { code: '+91', flag: '🇮🇳' }, // India
    { code: '+44', flag: '🇬🇧' }, // UK
    { code: '+55', flag: '🇧🇷' }, // Brazil
    { code: '+972', flag: '🇮🇱' }, // Israel
  ];

  const getEnabledDates = () => {
    const dates: {[key: string]: {selected: boolean, disabled?: boolean, disableTouchEvent?: boolean}} = {};
    const today = new Date();
    for (let i = 0; i < 15; i++) { // Today + 14 days
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      dates[dateString] = { selected: false, disabled: false };
    }
    return dates;
  };

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

  const timeSlots = [
    "9:00 AM - 12:00 PM",
    "12:00 PM - 3:00 PM", 
    "3:00 PM - 6:00 PM",
    "6:00 PM - 9:00 PM"
  ];

  const handleTimeSlotPress = (timeSlot: string) => {
    if (selectedTimeSlots.includes(timeSlot)) {
      // Remove time slot
      setSelectedTimeSlots(prev => prev.filter(slot => slot !== timeSlot));
      setPrioritySlots(prev => prev.filter(slot => slot.time !== timeSlot).map((slot, index) => ({ ...slot, priority: index + 1 })));
    } else {
      // Add time slot if less than 3 are selected
      if (selectedTimeSlots.length < 3) {
        setSelectedTimeSlots(prev => [...prev, timeSlot]);
        setPrioritySlots(prev => [...prev, { time: timeSlot, priority: prev.length + 1 }]);
      } else {
        alert(t('maxTimeSlotsAlert'));
      }
    }
  };

  const getTimeSlotPriority = (timeSlot: string): number | null => {
    const slot = prioritySlots.find(s => s.time === timeSlot);
    return slot ? slot.priority : null;
  };

  const handleSubmitTourRequest = async () => {
    const selectedDatesArray = Object.keys(selectedDates).filter(date => selectedDates[date].selected);

    if (selectedDatesArray.length === 0) {
      alert(t('selectDateTime'));
      return;
    }

    if (selectedTimeSlots.length === 0) {
      alert(t('selectDateTime'));
      return;
    }

    if (showPhoneInput && !phoneNumber.trim()) {
      alert(t('enterPhoneNumber'));
      return;
    }

    if (!session?.user?.id) {
      alert(t('userNotFoundPleaseLogInAgain'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if user has already requested a tour for this listing
      const hasExistingRequest = await TourService.hasUserRequestedTourForListing(session.user.id, listingId);

      if (hasExistingRequest) {
        alert(t('tourRequestAlreadyExists'));
        return;
      }

      // Save tour request to database
      await TourService.createTourRequest(listingId, {
        dates: selectedDatesArray,
        timeSlots: prioritySlots,
        notes: showNotesInput ? notes : '',
        phoneNumber: showPhoneInput ? phoneNumber : '',
        countryCode: showPhoneInput ? selectedCountryCode : '',
      }, session.user.id);

      // All checks passed, show summary modal
      setIsSummaryModalVisible(true);
    } catch (error) {
      console.error('Error submitting tour request:', error);
      alert(t('couldNotSubmitTourRequest'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            {showComingSoon ? (
              <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            ) : (
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
            )}
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {showComingSoon ? "Feature Coming Soon" : t('selectTourDateTime')}
            </Text>
          </View>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {showComingSoon ? (
          <View style={styles.comingSoonContainer}>
            <Ionicons name="code-working" size={60} color={colors.primary} style={styles.comingSoonIcon} />
            <Text style={[styles.comingSoonText, { color: colors.text }]}>
              We are actively working on implementing this feature. Please check back soon!
            </Text>
            <Pressable
              style={[styles.comingSoonButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={styles.comingSoonButtonText}>Got It</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🗓️ {t('availableDates')}</Text>
              <Calendar
                minDate={(() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return tomorrow.toISOString().split('T')[0];
                })()}
                maxDate={(() => {
                  const maxDate = new Date();
                  maxDate.setDate(maxDate.getDate() + 15);
                  return maxDate.toISOString().split('T')[0];
                })()}
                onDayPress={handleDayPress}
                markedDates={selectedDates}
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
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: 'bold'
                }}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>⏰ {t('availableTimeSlots')}</Text>
              <View style={styles.timeSlotsContainer}>
                {timeSlots.map((slot, index) => {
                  const isSelected = selectedTimeSlots.includes(slot);
                  const priority = getTimeSlotPriority(slot);
                  return (
                    <Pressable
                      key={index}
                      style={[
                        styles.timeSlotButton,
                        { borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => handleTimeSlotPress(slot)}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        { color: isSelected ? 'white' : colors.text }
                      ]}>
                        {slot}
                      </Text>
                      {priority && (
                        <View style={[styles.priorityBadge, { backgroundColor: isSelected ? 'white' : colors.primary }]}>
                          <Text style={[styles.priorityText, { color: isSelected ? colors.primary : 'white' }]}>{priority}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>✨ {t('selectedTourDetails')}</Text>
              {Object.keys(selectedDates).length === 0 && selectedTimeSlots.length === 0 ? (
                <Text style={{ color: colors.textSecondary }}>{t('noDatesSelected')}</Text>
              ) : (
                <View style={styles.selectedDetailsCard}>
                  {Object.keys(selectedDates).length > 0 && (
                    <View style={styles.selectedDetailsBlock}>
                      <Text style={[styles.selectedDetailsLabel, { color: colors.text }]}>🗓️ Dates:</Text>
                      {Object.keys(selectedDates).map(date => (
                        <Text key={date} style={[styles.selectedDetailsText, { color: colors.textSecondary }]}>{date}</Text>
                      ))}
                    </View>
                  )}
                  {selectedTimeSlots.length > 0 && (
                    <View style={styles.selectedDetailsBlock}>
                      <Text style={[styles.selectedDetailsLabel, { color: colors.text }]}>⏰ Time Slots:</Text>
                      {prioritySlots.sort((a,b) => a.priority - b.priority).map((slot, index) => (
                        <Text key={index} style={[styles.selectedDetailsText, { color: colors.textSecondary }]}>
                          {slot.priority}. {slot.time}
                        </Text>
                      ))}
                    </View>
                  )}
                  {showNotesInput && notes.length > 0 && (
                    <View style={styles.selectedDetailsBlock}>
                      <Text style={[styles.selectedDetailsLabel, { color: colors.text }]}>📝 Your Notes:</Text>
                      <Text style={[styles.selectedDetailsText, { color: colors.textSecondary }]}>{notes}</Text>
                    </View>
                  )}
                  {showPhoneInput && phoneNumber.length > 0 && (
                    <View style={styles.selectedDetailsBlock}>
                      <Text style={[styles.selectedDetailsLabel, { color: colors.text }]}>📞 Contact Number:</Text>
                      <Text style={[styles.selectedDetailsText, { color: colors.textSecondary }]}>{selectedCountryCode} {phoneNumber}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Pressable style={styles.toggleRow} onPress={() => setShowNotesInput(!showNotesInput)}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>📝 {t('addNotes')}</Text>
                <Ionicons name={showNotesInput ? 'chevron-up' : 'chevron-down'} size={24} color={colors.textSecondary} />
              </Pressable>
              {showNotesInput && (
                <TextInput
                  style={[styles.textInput, { borderColor: colors.border, color: colors.text }]} 
                  placeholder={t('notesPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  value={notes}
                  onChangeText={setNotes}
                />
              )}
            </View>

            <View style={styles.section}>
              <Pressable style={styles.toggleRow} onPress={() => setShowPhoneInput(!showPhoneInput)}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>📞 {t('contactByPhone')}</Text>
                <Ionicons name={showPhoneInput ? 'chevron-up' : 'chevron-down'} size={24} color={colors.textSecondary} />
              </Pressable>
              {showPhoneInput && (
                <View style={styles.phoneInputContainer}>
                  <Pressable style={[styles.countryCodePicker, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setIsCountryPickerVisible(true)}>
                    <Text style={[styles.countryCodeText, { color: colors.text }]}>{countryCodes.find(c => c.code === selectedCountryCode)?.flag || '❓'}</Text>
                    <Text style={[styles.countryCodeText, { color: colors.text }]}>{selectedCountryCode}</Text>
                    <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                  </Pressable>
                  <TextInput
                    style={[styles.textInput, styles.phoneNumberInput, { borderColor: colors.border, color: colors.text }]} 
                    placeholder={t('phoneNumberPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
              )}
            </View>

          </ScrollView>
        )}

        {!showComingSoon && (
          <Pressable
            style={[styles.submitButton, { backgroundColor: isSubmitting ? colors.textMuted : colors.primary }]}
            onPress={handleSubmitTourRequest}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? t('submitting') : t('submitRequest')}
            </Text>
          </Pressable>
        )}

        {/* Country Code Picker Modal */}
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
                  style={[
                    styles.countryOption,
                    { borderBottomColor: colors.border },
                    selectedCountryCode === country.code && { backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    setSelectedCountryCode(country.code);
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

        {/* Tour Request Summary Modal */}
        <TourRequestSummaryModal
          isVisible={isSummaryModalVisible}
          onClose={() => {
            setIsSummaryModalVisible(false);
            onClose(); // Close the main tour confirmation modal after summary is viewed
          }}
          tourDetails={{
            dates: Object.keys(selectedDates).filter(date => selectedDates[date].selected),
            timeSlots: prioritySlots,
            notes: showNotesInput ? notes : '',
            phoneNumber: showPhoneInput ? phoneNumber : '',
            countryCode: showPhoneInput ? selectedCountryCode : '',
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
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  timeSlotsContainer: {
    gap: 10,
  },
  timeSlotButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderWidth: 2,
    borderRadius: 10,
    minHeight: 60,
  },
  timeSlotText: {
    fontSize: 18,
    fontWeight: '500',
  },
  priorityBadge: {
    borderRadius: 20,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedDetailsBlock: {
    marginTop: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee', // Light border for separation
  },
  selectedDetailsLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  selectedDetailsText: {
    fontSize: 14,
    marginBottom: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countryCodePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8, // Increased gap for the chevron icon
    backgroundColor: '#f0f0f0',
  },
  countryCodeText: {
    fontSize: 16,
  },
  phoneNumberInput: {
    flex: 1,
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
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
    height: '70%',
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
  selectedDetailsCard: {
    backgroundColor: '#f8f8f8',
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
  // New styles for the coming soon message
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  comingSoonIcon: {
    marginBottom: 20,
  },
  comingSoonText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  comingSoonButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minWidth: 150,
  },
  comingSoonButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
