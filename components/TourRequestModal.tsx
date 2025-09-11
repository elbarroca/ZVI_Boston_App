import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';
// import { CalendarService } from '@/lib/calendarService';
import { getListingById } from '@/lib/api';

interface TourRequestSummaryModalProps {
  isVisible: boolean;
  onClose: () => void;
  tourDetails: {
    listingIds: string[]; // Changed from single listing to multiple
    dates: string[];
    timeSlots: { time: string; priority: number; date: string }[];
    notes: string;
    phoneNumber: string;
    countryCode: string;
  };
}

// Helper function to format time from 24-hour to 12-hour format
const formatTimeTo12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert 0 to 12 for midnight
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export default function TourRequestSummaryModal({ isVisible, onClose, tourDetails }: TourRequestSummaryModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];
  // const [calendarEventsAdded, setCalendarEventsAdded] = useState<Set<string>>(new Set());
  const [listingsData, setListingsData] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  // Debug logging
  console.log('TourRequestSummaryModal render - isVisible:', isVisible, 'tourDetails:', tourDetails);

  // Fetch listing data when modal is visible and listing IDs change
  useEffect(() => {
    const fetchListingsData = async () => {
      if (isVisible && tourDetails.listingIds && tourDetails.listingIds.length > 0) {
        setIsLoadingListings(true);
        try {
          const listingsPromises = tourDetails.listingIds.map(id => getListingById(id));
          const listings = await Promise.all(listingsPromises);
          setListingsData(listings.filter(listing => listing !== null));
        } catch (error) {
          console.error('Error fetching listings data:', error);
          setListingsData([]);
        } finally {
          setIsLoadingListings(false);
        }
      }
    };

    fetchListingsData();
  }, [isVisible, tourDetails.listingIds]);

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
      animationType="fade"
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('tourRequestConfirmed')}</Text>
          </View>
          <Pressable onPress={() => {
            onClose();
          }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentContainer}>
            <Text style={[styles.confirmationMessage, { color: colors.textSecondary }]}>
              {t('tourRequestSuccessMessage')}
            </Text>
          <View style={styles.nextStepsBox}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={[styles.nextStepsText, { color: colors.text }]}>
              <Text style={{ fontWeight: '600' }}>{t('whatHappensNext')}</Text>{"\n"}
              • {t('whatHappensNext1')}{"\n"}
              • {t('whatHappensNext2')}{"\n"}
              • {t('whatHappensNext3')}
            </Text>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.background }]}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>{t('yourSelectedSchedule')}</Text>

            {/* Display selected listings */}
            {listingsData.length > 0 && (
              <View style={styles.listingsSummary}>
                <View style={styles.listingsSummaryHeader}>
                  <Ionicons name="home" size={20} color={colors.primary} />
                  <Text style={[styles.summaryLabel, { color: colors.text }]}>
                    {t('selectedProperties')} ({listingsData.length})
                  </Text>
                </View>
                {isLoadingListings ? (
                  <View style={styles.loadingState}>
                    <Ionicons name="hourglass" size={20} color={colors.textSecondary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('loadingPropertyDetails')}</Text>
                  </View>
                ) : (
                  <View style={styles.listingsList}>
                    {listingsData.map((listing, index) => (
                      <View key={listing?.id || index} style={[
                        styles.listingSummaryItem,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        index === 0 && { borderColor: colors.primary, borderWidth: 2 } // Highlight main listing
                      ]}>
                        <View style={styles.listingHeader}>
                          <View style={styles.listingNumberBadge}>
                            <Text style={[styles.listingNumber, { color: index === 0 ? colors.primary : colors.textSecondary }]}>
                              {index + 1}
                            </Text>
                          </View>
                          {index === 0 && (
                            <View style={[styles.mainListingTag, { backgroundColor: colors.primary }]}>
                              <Text style={styles.mainListingTagText}>{t('mainTour')}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.listingSummaryTitle, { color: colors.text }]}>
                          {listing?.title || t('property')}
                        </Text>
                        <View style={styles.listingDetailsRow}>
                          <Text style={[styles.listingSummaryDetails, { color: colors.textSecondary }]}>
                            💰 ${listing?.price_per_month || t('priceNotAvailable')}{t('pricePerMonth')}
                          </Text>
                          <Text style={[styles.listingSummaryDetails, { color: colors.textSecondary }]}>
                            🛏️ {listing?.bedrooms || 0} {t('bed')} • {listing?.bathrooms || 0} {t('bath')}
                          </Text>
                        </View>
                        <Text style={[styles.listingSummaryLocation, { color: colors.textMuted }]}>
                          📍 {listing?.neighborhood || t('locationNotAvailable')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {sortedDates.map(date => (
              <View key={date} style={[styles.dateBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.dateHeader}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(date)}</Text>
                </View>

                <View style={styles.timeSlotsContainer}>
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>{t('preferredTimes')}</Text>
                  <View style={styles.timeSlotsList}>
                    {tourDetails.timeSlots
                      .filter(slot => slot.date === date) // Filter slots for the current date
                      .sort((a, b) => a.priority - b.priority) // Sort by global priority
                      .map((slot, index) => {
                        const isTopChoice = slot.priority === 1; // Check against global priority
                        
                        // Add time emoji based on the time
                        const getTimeEmoji = (time: string) => {
                          const hour = parseInt(time.split(':')[0]);
                          if (hour < 10) return '🌅';
                          if (hour < 12) return '☕';
                          if (hour < 14) return '🍽️';
                          if (hour < 16) return '🌞';
                          if (hour < 18) return '🌆';
                          return '🌇';
                        };

                        return (
                          <View key={index} style={[styles.timeSlotItem, {
                            backgroundColor: isTopChoice ? '#FEF3C7' : colors.background,
                            borderColor: isTopChoice ? '#F59E0B' : colors.border
                          }]}>
                            <View style={[styles.priorityIndicator, {
                              backgroundColor: isTopChoice ? '#F59E0B' : colors.border,
                            }]}>
                              {isTopChoice ? (
                                <Ionicons name="star" size={12} color="white" />
                              ) : (
                                <Text style={[styles.priorityNumber, {
                                  color: colors.textSecondary
                                }]}>
                                  {slot.priority}
                                </Text>
                              )}
                            </View>
                            
                            <Text style={[styles.timeSlotText, {
                              color: isTopChoice ? colors.text : colors.textSecondary,
                              fontWeight: isTopChoice ? '600' : '400',
                            }]}>
                              {getTimeEmoji(slot.time)} {formatTimeTo12Hour(slot.time)}
                            </Text>
                            {!isTopChoice && (
                              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                            )}
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
              {t('reviewPreferencesMessage')}
            </Text>
          </View>
          </View>
        </ScrollView>

        {/* Fixed OK Button */}
        <View style={styles.okButtonContainer}>
          <Pressable style={[styles.okButton, { backgroundColor: colors.primary }]} onPress={() => {
            onClose();
          }}>
            <Text style={styles.okButtonText}>{t('gotItThanks')}</Text>
          </Pressable>
        </View>
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
    maxHeight: '90%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  priorityNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
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
  scrollContent: {
    paddingBottom: 120, // Extra space for the fixed OK button
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  okButtonContainer: {
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
  okButton: {
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
  okButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for improved UX
  nextStepsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  nextStepsText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    color: '#166534',
  },
  // Calendar integration styles
  timeSlotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2, // Android shadow
  },
  calendarButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  // Multiple listings summary styles
  listingsSummary: {
    marginBottom: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  listingSummaryItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listingSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  listingSummaryDetails: {
    fontSize: 12,
    marginBottom: 2,
  },
  listingSummaryLocation: {
    fontSize: 11,
  },
  // Enhanced Listings Display Styles
  listingsSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  listingsList: {
    gap: 12,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listingNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainListingTag: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mainListingTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  listingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
});
