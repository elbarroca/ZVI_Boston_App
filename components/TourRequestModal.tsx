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
  ScrollView,
  Platform,
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

  // If modal is not visible, don't render anything
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop - separate from content */}
        <Pressable
          style={styles.modalBackdrop}
          onPress={onClose}
        />

        {/* Modal Content - separate from backdrop */}
        <View style={styles.modalContentContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBody}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('requestATour')}</Text>
                <Text style={[styles.modalGreeting, { color: colors.text }]}>
                  Hello! This is a test modal.
                </Text>
                <Text style={[styles.modalSubtext, { color: colors.textSecondary }]}>
                  If you can see this, the modal is working!
                </Text>

                <View style={styles.sectionSpacer} />

                {/* Simple test button */}
                <Pressable
                  style={[
                    styles.requestButton,
                    { backgroundColor: colors.primary },
                    isSubmitting && styles.requestButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.requestButtonText}>
                    {isSubmitting ? 'Submitting...' : 'Test Submit'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Modal overlay styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 20,
    zIndex: 10,
  },
  modalBody: {
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    maxHeight: '85%',
    minHeight: Platform.OS === 'android' ? '70%' : '60%',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
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
});

export default TourRequestModal;