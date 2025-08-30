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
    timeSlots: { time: string; priority: number }[];
    notes: string;
    phoneNumber: string;
    countryCode: string;
  };
}

export default function TourRequestSummaryModal({ isVisible, onClose, tourDetails }: TourRequestSummaryModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];

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
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('tourRequestSubmitted')}</Text>
          </View>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.confirmationMessage, { color: colors.textSecondary }]}>
            {t('requestReceived')}
          </Text>

          <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>{t('yourSelectedSchedule')}:</Text>

            {tourDetails.dates.length > 0 && (
              <View style={styles.summaryBlock}>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>🗓️ {t('selectedDates')}:</Text>
                {tourDetails.dates.map(date => (
                  <Text key={date} style={[styles.summaryText, { color: colors.textSecondary }]}>{date}</Text>
                ))}
              </View>
            )}

            {tourDetails.timeSlots.length > 0 && (
              <View style={styles.summaryBlock}>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>⏰ {t('chooseTimePreferences')}:</Text>
                {tourDetails.timeSlots.sort((a, b) => a.priority - b.priority).map((slot, index) => (
                  <Text key={index} style={[styles.summaryText, { color: colors.textSecondary }]}>{slot.priority}. {slot.time}</Text>
                ))}
              </View>
            )}

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
        </ScrollView>

        <Pressable style={[styles.okButton, { backgroundColor: colors.primary }]} onPress={onClose}>
          <Text style={styles.okButtonText}>{t('gotIt')}</Text>
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
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
