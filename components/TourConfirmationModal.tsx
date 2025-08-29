import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';
import { TourConfirmationModalProps } from './types/tour';

export function TourConfirmationModal({
  visible,
  onClose,
  data,
  listingTitle,
  listingAddress,
  userEmail,
}: TourConfirmationModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];

  // If modal is not visible, don't render anything
  if (!visible) {
    return null;
  }

  // If no data is provided when visible, show a fallback
  if (!data) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={onClose}>
            <View style={[styles.confirmationModalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.confirmationHeader}>
                <Text style={[styles.confirmationTitle, { color: colors.text }]}>
                  Tour Request Submitted
                </Text>
                <Pressable style={styles.confirmationCloseButton} onPress={onClose}>
                  <Text style={styles.confirmationCloseText}>✕</Text>
                </Pressable>
              </View>
              <Text style={[styles.confirmationSubtitle, { color: colors.textSecondary }]}>
                Your tour request has been submitted successfully!
              </Text>
              <Pressable
                style={[styles.confirmationButton, { backgroundColor: colors.primary }]}
                onPress={onClose}
              >
                <Text style={styles.confirmationButtonText}>Okay</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={onClose}
        >
          <View style={styles.modalContentContainer}>
            <View style={[styles.confirmationModalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.confirmationHeader}>
                <Text style={[styles.confirmationTitle, { color: colors.text }]}>
                  {t('tourRequestSubmitted')}
                </Text>
                <Pressable
                  style={styles.confirmationCloseButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.confirmationCloseText}>✕</Text>
                </Pressable>
              </View>

              <Text style={[styles.confirmationSubtitle, { color: colors.textSecondary }]}>
                {t('thankYouMessage')}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.confirmationDetails}>
                  <Text style={[styles.confirmationSectionTitle, { color: colors.text }]}>
                    {t('yourSelectedSchedule')}
                  </Text>

                  {data.prioritySlot && (
                    <View style={styles.priorityConfirmation}>
                      <Ionicons name="star" size={16} color="#FFC700" />
                      <Text style={[styles.priorityConfirmationText, { color: colors.text }]}>
                        <Text style={{ fontWeight: '600' }}>Top Choice:</Text> {data.prioritySlot}
                      </Text>
                    </View>
                  )}

                  <View style={styles.confirmationSchedule}>
                    {data.dates.map((date, dateIndex) => (
                      <View key={dateIndex} style={styles.confirmationDateRow}>
                        <Text style={[styles.confirmationDateLabel, { color: colors.primary }]}>
                          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                        <View style={styles.confirmationTimeSlotsRow}>
                          {data.timeSlots.map((timeSlot, timeIndex) => (
                            <View key={timeIndex} style={[
                              styles.confirmationTimeSlotChip,
                              {
                                backgroundColor: data.prioritySlot === timeSlot ? '#FFC700' + '30' : colors.primary + '15',
                                borderColor: data.prioritySlot === timeSlot ? '#FFC700' : 'transparent',
                                borderWidth: data.prioritySlot === timeSlot ? 1 : 0,
                              }
                            ]}>
                              <Text style={[
                                styles.confirmationTimeSlotText,
                                {
                                  color: data.prioritySlot === timeSlot ? '#FFC700' : colors.primary,
                                  fontWeight: data.prioritySlot === timeSlot ? '600' : '500',
                                }
                              ]}>
                                {timeSlot}
                                {data.prioritySlot === timeSlot && ' ⭐'}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>

                  <View style={[styles.confirmationSeparator, { backgroundColor: colors.border }]} />

                  <Text style={[styles.confirmationSectionTitle, { color: colors.text }]}>
                    {t('contactInformation')}
                  </Text>

                  <View style={styles.confirmationContactInfo}>
                    <Text style={[styles.confirmationContactText, { color: colors.textSecondary }]}>
                      {t('email')} {userEmail}
                    </Text>
                    {data.contactMethod === 'both' && data.phoneNumber && (
                      <Text style={[styles.confirmationContactText, { color: colors.textSecondary }]}>
                        {t('phone')} {data.phoneNumber}
                      </Text>
                    )}
                    {data.contactMethod === 'phone' && data.phoneNumber && (
                      <Text style={[styles.confirmationContactText, { color: colors.textSecondary }]}>
                        {t('phone')} {data.phoneNumber}
                      </Text>
                    )}
                    <Text style={[styles.confirmationContactMethod, { color: colors.success }]}>
                      {t('weWillContactBy')} {data.contactMethod === 'both' ? t('phoneAndEmail') :
                                           data.contactMethod === 'phone' ? 'phone' : 'email'}
                    </Text>
                  </View>

                                <View style={[styles.confirmationSeparator, { backgroundColor: colors.border }]} />

                    {data.notes && (
                      <>
                        <Text style={[styles.confirmationSectionTitle, { color: colors.text }]}>
                          {t('yourNotesAndRequests')}
                        </Text>
                        <Text style={[styles.confirmationNotes, {
                          color: colors.textSecondary,
                          backgroundColor: colors.background
                        }]}>
                          {data.notes}
                        </Text>
                        <View style={[styles.confirmationSeparator, { backgroundColor: colors.border }]} />
                      </>
                    )}

                    {/* Display notes from preferred_times_summary if no separate notes field */}
                    {!data.notes && (
                      <>
                        <Text style={[styles.confirmationSectionTitle, { color: colors.text }]}>
                          {t('additionalInformation')}
                        </Text>
                        <Text style={[styles.confirmationNotes, {
                          color: colors.textSecondary,
                          backgroundColor: colors.background
                        }]}>
                          {t('notesStoredMessage')}
                        </Text>
                        <View style={[styles.confirmationSeparator, { backgroundColor: colors.border }]} />
                      </>
                    )}

                    <Text style={[styles.confirmationProperty, { color: colors.text }]}>
                      {t('property')} {listingTitle}
                    </Text>
                    <Text style={[styles.confirmationAddress, { color: colors.textSecondary }]}>
                      {t('location')} {listingAddress}
                    </Text>
                </View>
              </ScrollView>

              <Pressable
                style={[styles.confirmationButton, { backgroundColor: colors.primary }]}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.confirmationButtonText}>{t('perfect')}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  confirmationModalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 20,
    maxHeight: '80%',
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
  confirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  confirmationCloseButton: {
    padding: 8,
  },
  confirmationCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  confirmationSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmationDetails: {
    gap: 16,
  },
  confirmationSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  confirmationSchedule: {
    gap: 12,
  },
  confirmationDateRow: {
    gap: 8,
  },
  confirmationDateLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationTimeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  confirmationTimeSlotChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  confirmationTimeSlotText: {
    fontSize: 12,
    fontWeight: '500',
  },
  confirmationSeparator: {
    height: 1,
    marginVertical: 8,
  },
  confirmationContactInfo: {
    gap: 4,
  },
  confirmationContactText: {
    fontSize: 14,
  },
  confirmationContactMethod: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  confirmationProperty: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmationAddress: {
    fontSize: 13,
  },
  confirmationNotes: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  confirmationButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  priorityConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC70020',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  priorityConfirmationText: {
    fontSize: 14,
    marginLeft: 6,
  },
});
