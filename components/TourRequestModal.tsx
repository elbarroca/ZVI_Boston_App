import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';

interface TourRequestSummaryModalProps {
  isVisible: boolean;
  onClose: () => void;
  tourDetails: {
    dates: string[];
    timeSlots: { time: string; priority: number; date: string }[];
    notes: string;
    phoneNumber: string;
    countryCode: string;
  };
}

export default function TourRequestSummaryModal({ isVisible, onClose, tourDetails }: TourRequestSummaryModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];

  // Group time slots by date for better organization and determine date priorities
  const groupedSlotsByDate: { [date: string]: { time: string; priority: number }[] } = {};
  const datePriorities: { date: string; minPriority: number }[] = [];

  // Initialize empty arrays for all dates and prepare for priority mapping
  tourDetails.dates.forEach(date => {
    groupedSlotsByDate[date] = [];
    datePriorities.push({ date, minPriority: Infinity }); // Initialize with a very high priority
  });

  // Group slots by their actual date and update minPriority for each date
  tourDetails.timeSlots.forEach(slot => {
    if (groupedSlotsByDate[slot.date]) {
      groupedSlotsByDate[slot.date].push({ time: slot.time, priority: slot.priority });

      // Update the minimum priority for this date
      const dateEntry = datePriorities.find(dp => dp.date === slot.date);
      if (dateEntry) {
        dateEntry.minPriority = Math.min(dateEntry.minPriority, slot.priority);
      }
    } else {
      // Fallback: if date not found, add to first available date (should not happen with proper data)
      const firstDate = tourDetails.dates[0];
      if (firstDate) {
        groupedSlotsByDate[firstDate].push({ time: slot.time, priority: slot.priority });
        const dateEntry = datePriorities.find(dp => dp.date === firstDate);
        if (dateEntry) {
          dateEntry.minPriority = Math.min(dateEntry.minPriority, slot.priority);
        }
      }
    }
  });

  // Sort dates based on their minimum priority
  const sortedDates = datePriorities.sort((a, b) => a.minPriority - b.minPriority).map(dp => dp.date);

  // Format date for better display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      hardwareAccelerated={true}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#10B981" />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Tour Request Confirmed!</Text>
          </View>
          <Pressable onPress={() => {
            onClose();
          }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.confirmationMessage, { color: colors.textSecondary }]}>
            🎉 Your tour request has been successfully submitted! We'll contact you soon to confirm the best available time.
          </Text>

          <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>📅 Your Selected Schedule</Text>

            {sortedDates.map(date => (
              <View key={date} style={[styles.dateBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.dateHeader}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(date)}</Text>
                </View>

                <View style={styles.timeSlotsContainer}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Preferred Times:</Text>
                  <View style={styles.timeSlotsList}>
                    {tourDetails.timeSlots
                      .filter(slot => slot.date === date) // Filter slots for the current date
                      .sort((a, b) => a.priority - b.priority) // Sort by global priority
                      .map((slot, index) => {
                        const isTopChoice = slot.priority === 1; // Check against global priority
                        return (
                          <View key={index} style={[styles.timeSlotItem, {
                            backgroundColor: isTopChoice ? '#FEF3C7' : colors.background,
                            borderColor: isTopChoice ? '#F59E0B' : colors.border
                          }]}>
                            <View style={styles.priorityIndicator}>
                              {isTopChoice && <Ionicons name="star" size={12} color="#F59E0B" />}
                              <Text style={[styles.priorityNumber, {
                                color: isTopChoice ? '#F59E0B' : colors.textMuted
                              }]}>
                                {slot.priority}
                              </Text>
                            </View>
                            <Text style={[styles.timeSlotText, {
                              color: isTopChoice ? colors.text : colors.textSecondary,
                              fontWeight: isTopChoice ? '600' : '400'
                            }]}>
                              {slot.time}
                            </Text>
                          </View>
                        );
                      })}
                  </View>
                </View>
              </View>
            ))}

            {tourDetails.notes.length > 0 && (
              <View style={styles.summaryBlock}>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>📝 {t('yourNotes')}:</Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{tourDetails.notes}</Text>
              </View>
            )}

            {tourDetails.phoneNumber.length > 0 && (
              <View style={styles.summaryBlock}>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>📞 {t('phoneNumber')}:</Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{tourDetails.countryCode} {tourDetails.phoneNumber}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              We'll review your preferences and contact you within 24 hours to confirm the best available time slot.
            </Text>
          </View>
        </ScrollView>

        <Pressable style={[styles.okButton, { backgroundColor: colors.primary }]} onPress={() => {
          onClose();
        }}>
          <Text style={styles.okButtonText}>Got it, thanks!</Text>
        </Pressable>
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
    maxHeight: '85%', // Adjusted for summary to take less space than main modal
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
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
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
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  priorityNumber: {
    fontSize: 12,
    fontWeight: 'bold',
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
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
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
});
