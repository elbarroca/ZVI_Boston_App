import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, Alert, ScrollView, Switch, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSupabaseAuth } from '@/context/supabase-provider';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { supabase } from '@/config/supabase';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, LANGUAGES, TranslationKey } from '@/context/language-provider';
import { Stack, useRouter } from 'expo-router';
import { deleteUserAccount, checkAccountDeletionEligibility } from '@/lib/api';
import { Listing } from '@/components/listingcard';

// A simple function to get the current user's profile
const getProfile = async (userId: string) => {
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw new Error(error.message);
  return data;
};

// Function to get tour requests for the current user with detailed listing info
const getTourRequests = async (userId: string) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('tour_requests')
    .select(`
      *,
      listings(
        id,
        title,
        location_address,
        price_per_month,
        bedrooms,
        bathrooms,
        property_type,
        image_urls,
        university_proximity_minutes,
        nearest_university,
        is_active
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);

  // For each tour request, fetch additional listings if they exist
  const tourRequestsWithAllListings = await Promise.all(
    (data || []).map(async (tour) => {
      const allListingIds = [tour.listing_id];

      // Add additional listing IDs if they exist
      if (tour.additional_listing_ids && Array.isArray(tour.additional_listing_ids)) {
        allListingIds.push(...tour.additional_listing_ids);
      }

      // Fetch all listings for this tour request
      const { data: allListings, error: listingsError } = await supabase
        .from('listings')
        .select('id, title, location_address, price_per_month, bedrooms, bathrooms, property_type, image_urls, university_proximity_minutes, nearest_university, is_active')
        .in('id', allListingIds);

      if (listingsError) {
        console.error('Error fetching additional listings:', listingsError);
        return tour; // Return original tour data if additional listings fail to load
      }

      return {
        ...tour,
        all_listings: allListings || []
      };
    })
  );

  return tourRequestsWithAllListings;
};

export default function SettingsScreen() {
  const { session } = useSupabaseAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const colors = themeColors[theme];
  const router = useRouter();
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteStep, setDeleteStep] = React.useState<'confirmation' | 'password' | 'processing'>('confirmation');

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: () => getProfile(session?.user?.id || ''),
    enabled: !!session?.user?.id,
  });

  const { data: tourRequests } = useQuery({
    queryKey: ['tour-requests', session?.user?.id],
    queryFn: () => getTourRequests(session?.user?.id || ''),
    enabled: !!session?.user?.id,
  });

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert(t('errorSigningOut'), error.message);
    }
  };

  const handleHelp = () => {
    Alert.alert(t('helpSupport'), t('contactSupportMessage'));
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.id) return;
    
    setShowDeleteModal(true);
    setDeleteStep('confirmation');
  };

  const proceedToPasswordStep = async () => {
    if (!session?.user?.id) return;

    try {
      const eligibility = await checkAccountDeletionEligibility(session.user.id);
      
      if (!eligibility.canDelete) {
        Alert.alert(t('cannotDeleteAccount'), eligibility.warnings.join('\n'));
        setShowDeleteModal(false);
        return;
      }

      // Show warnings if any
      if (eligibility.warnings.length > 0) {
        Alert.alert(
          t('accountDeletionWarning'),
          eligibility.warnings.join('\n') + '\n\nAre you sure you want to continue?',
          [
            { text: t('cancel'), style: 'cancel', onPress: () => setShowDeleteModal(false) },
            { text: t('continue'), style: 'destructive', onPress: () => {
              // Check if user signed in with email (needs password) or OAuth
              const isEmailUser = session?.user?.email && !session?.user?.app_metadata?.provider;
              if (isEmailUser) {
                setDeleteStep('password');
              } else {
                confirmDelete();
              }
            }}
          ]
        );
      } else {
        // Check if user signed in with email (needs password) or OAuth
        const isEmailUser = session?.user?.email && !session?.user?.app_metadata?.provider;
        if (isEmailUser) {
          setDeleteStep('password');
        } else {
          confirmDelete();
        }
      }
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('unableToCheckAccountStatus'));
      setShowDeleteModal(false);
    }
  };

  const confirmDelete = async () => {
    if (!session?.user?.id) return;

    setIsDeleting(true);
    setDeleteStep('processing');

    try {
      // For email users, we need the password. For OAuth users, we don't.
      const isEmailUser = session?.user?.email && !session?.user?.app_metadata?.provider;
      const password = isEmailUser ? deletePassword : undefined;

      await deleteUserAccount(session.user.id, password);
      
      // Success - user will be signed out automatically by the API
      Alert.alert(
        t('accountDeleted'),
        t('accountDeletedMessage'),
        [{ text: 'OK', onPress: () => {
          setShowDeleteModal(false);
          setDeletePassword('');
          setDeleteStep('confirmation');
          router.replace('/(auth)');
        }}]
      );
    } catch (error: any) {
      Alert.alert(t('error'), error.message || t('failedToDeleteAccount'));
      setDeleteStep(deletePassword ? 'password' : 'confirmation');
    } finally {
      setIsDeleting(false);
    }
  };

  const SettingItem = ({ icon, title, onPress, rightComponent }: {
    icon: string;
    title: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity style={[styles.settingItem, { borderBottomColor: colors.border }]} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t('settings'),
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              android_ripple={{ color: colors.primary + '20', borderless: true }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          )
        }}
      />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Top spacing for avatar */}
        <View style={styles.topSpacing} />
        {/* Profile Section */}
      <View style={[styles.profileSection, {
        backgroundColor: colors.surface,
        shadowColor: colors.shadow
      }]}>
        {profile && (
          <>
            <Image source={{ uri: profile.avatar_url || 'https://placehold.co/100' }} style={styles.avatar} />
            <Text style={[styles.name, { color: colors.text }]}>{profile.full_name}</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{profile.email}</Text>

          </>
        )}
        {!profile && (
          <View style={styles.guestProfile}>
            <Ionicons name="person-circle-outline" size={80} color={colors.textMuted} />
            <Text style={[styles.guestText, { color: colors.textSecondary }]}>Sign in to access your profile</Text>
          </View>
        )}
      </View>

      {/* Settings */}
      <View style={styles.settingsContainer}>
        {/* Theme Toggle */}
        <View style={[styles.section, {
          backgroundColor: colors.surface,
          shadowColor: colors.shadow
        }]}>
          <SettingItem
            icon="moon-outline"
            title={t('darkMode')}
            rightComponent={
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={'white'}
              />
            }
          />
        </View>

        {/* Language Selector */}
        <View style={[styles.section, {
          backgroundColor: colors.surface,
          shadowColor: colors.shadow
        }]}>
          <Pressable
            style={styles.settingItem}
            onPress={() => setShowLanguageModal(true)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={24} color={colors.primary} />
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                {t('language')}
              </Text>
            </View>
            <View style={styles.languageRight}>
              <Text style={styles.languageFlag}>{currentLanguage.flag}</Text>
              <Text style={[styles.languageText, { color: colors.textSecondary }]}>
                {currentLanguage.nativeName}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Pressable>
        </View>

        {/* Account */}
        <View style={[styles.section, {
          backgroundColor: colors.surface,
          shadowColor: colors.shadow
        }]}>
          <SettingItem
            icon="help-circle-outline"
            title={t('helpSupport')}
            onPress={handleHelp}
            rightComponent={<Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
          />
          
          {session?.user && (
            <SettingItem
              icon="trash-outline"
              title="Delete Account"
              onPress={handleDeleteAccount}
              rightComponent={<Ionicons name="chevron-forward" size={20} color={colors.error} />}
            />
          )}
        </View>

        {/* Tour History */}
        {tourRequests && tourRequests.length > 0 && (
          <View style={[styles.section, {
            backgroundColor: colors.surface,
            shadowColor: colors.shadow
          }]}>
            <View style={styles.tourHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🏠 {t('tourRequests')} ({tourRequests.length})
              </Text>
              <Text style={[styles.tourSubtitle, { color: colors.textSecondary }]}>
                Your recent property tour requests
              </Text>
            </View>
            {tourRequests.map((tour, index) => (
              <View key={tour.id} style={[styles.tourRequestItem, { borderBottomColor: colors.border }]}>
                {/* Status Badge and Date */}
                <View style={styles.tourTopRow}>
                  <View style={[styles.statusBadge, {
                    backgroundColor: tour.status === 'pending' ? colors.warning + '20' :
                                   tour.status === 'confirmed' ? colors.success + '20' :
                                   tour.status === 'scheduled' ? colors.primary + '20' :
                                   tour.status === 'completed' ? colors.success + '20' : colors.textMuted + '20'
                  }]}>
                    <Text style={[styles.statusText, {
                      color: tour.status === 'pending' ? colors.warning :
                             tour.status === 'confirmed' ? colors.success :
                             tour.status === 'scheduled' ? colors.primary :
                             tour.status === 'completed' ? colors.success : colors.textMuted
                    }]}>
                      {(tour.status || 'pending').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.tourDate, { color: colors.textSecondary }]}>
                    {new Date(tour.created_at).toLocaleDateString(currentLanguage.code, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>

                {/* Property Information Cards - Multiple Listings */}
                {tour.all_listings && tour.all_listings.length > 0 && (
                  <View style={styles.multiplePropertiesContainer}>
                    <Text style={[styles.propertiesCount, { color: colors.textSecondary }]}>
                      📋 {tour.all_listings.length} {tour.all_listings.length === 1 ? 'Property' : 'Properties'}
                    </Text>
                    <View style={styles.propertiesList}>
                      {tour.all_listings.map((listing: Listing, listingIndex: number) => (
                        <View key={listing.id} style={[
                          styles.propertyCard,
                          { backgroundColor: colors.background },
                          listingIndex === 0 && { borderColor: colors.primary, borderWidth: 2 } // Highlight main listing
                        ]}>
                          <View style={styles.propertyHeader}>
                            <View style={styles.propertyTitleRow}>
                              {listingIndex === 0 && (
                                <View style={[styles.mainListingBadge, { backgroundColor: colors.primary }]}>
                                  <Text style={styles.mainListingBadgeText}>Main</Text>
                                </View>
                              )}
                              <Text style={[styles.tourPropertyTitle, { color: colors.text }]}>
                                {listing.title}
                              </Text>
                            </View>
                            <Text style={[styles.propertyPrice, { color: colors.primary }]}>
                              ${listing.price_per_month?.toLocaleString()}/mo
                            </Text>
                          </View>

                          <Text style={[styles.tourAddress, { color: colors.textSecondary }]}>
                            📍 {listing.location_address}
                          </Text>

                          <View style={styles.propertyDetails}>
                            <Text style={[styles.propertyDetail, { color: colors.textMuted }]}>
                              🏠 {listing.property_type} • {listing.bedrooms} bed • {listing.bathrooms} bath
                            </Text>
                            {listing.university_proximity_minutes && (
                              <Text style={[styles.propertyDetail, { color: colors.textMuted }]}>
                                🎓 {listing.university_proximity_minutes} min walk to {listing.nearest_university}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Tour Request Details */}
                <View style={styles.tourDetailsSection}>
                  <Text style={[styles.sectionLabel, { color: colors.text }]}>
                    📋 Tour Details
                  </Text>

                  {tour.preferred_times_summary && (
                    <Text style={[styles.tourSummary, { color: colors.textSecondary }]}>
                      ⏰ {tour.preferred_times_summary}
                    </Text>
                  )}

                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactMethod, { color: colors.primary }]}>
                      📞 Contact: {tour.contact_method === 'both' ? 'Phone & Email' :
                                 tour.contact_method === 'phone' ? 'Phone Only' : 'Email Only'}
                    </Text>
                    {tour.contact_phone && (
                      <Text style={[styles.contactPhone, { color: colors.textSecondary }]}>
                        📱 {tour.contact_phone}
                      </Text>
                    )}
                  </View>

                  {tour.notes && (
                    <View style={styles.notesSection}>
                      <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
                        📝 Your Notes:
                      </Text>
                      <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                        {tour.notes}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Request Information */}
                <View style={styles.requestInfo}>
                  <Text style={[styles.requestId, { color: colors.textMuted }]}>
                    Request ID: {String(tour.id).substring(0, 8)}...
                  </Text>
                  <Text style={[styles.requestTime, { color: colors.textMuted }]}>
                    Submitted: {new Date(tour.created_at).toLocaleString(currentLanguage.code)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={[styles.modalOverlay, {
          backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)'
        }]}>
          <Pressable
            style={[styles.modalBackdrop, {
              backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)'
            }]}
            onPress={() => setShowLanguageModal(false)}
          />
          <View style={[styles.languageModal, { backgroundColor: colors.surface }]}>
          <Text style={[styles.languageModalTitle, { color: colors.text }]}>
            {t('selectLanguage')}
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {LANGUAGES.map((language) => (
              <Pressable
                key={language.code}
                style={[
                  styles.languageOption,
                  { borderBottomColor: colors.border },
                  currentLanguage.code === language.code && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setLanguage(language);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={styles.languageFlag}>{language.flag}</Text>
                <View style={styles.languageDetails}>
                  <Text style={[styles.languageName, { color: colors.text }]}>
                    {language.name}
                  </Text>
                  <Text style={[styles.languageNativeName, { color: colors.textSecondary }]}>
                    {language.nativeName}
                  </Text>
                </View>
                {currentLanguage.code === language.code && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={[styles.languageCloseButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowLanguageModal(false)}
          >
            <Text style={[styles.languageCloseText, { color: 'white' }]}>{t('done')}</Text>
          </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setDeletePassword('');
            setDeleteStep('confirmation');
          }
        }}
      >
        <View style={[styles.modalOverlay, {
          backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)'
        }]}>
          <Pressable
            style={[styles.modalBackdrop, {
              backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)'
            }]}
            onPress={() => {
              if (!isDeleting) {
                setShowDeleteModal(false);
                setDeletePassword('');
                setDeleteStep('confirmation');
              }
            }}
          />
          <View style={[styles.deleteModal, { backgroundColor: colors.surface }]}>
          {deleteStep === 'confirmation' && (
            <>
              <View style={[styles.deleteModalHeader, { borderBottomColor: colors.border }]}>
                <Ionicons name="warning" size={48} color={colors.error} />
                <Text style={[styles.deleteModalTitle, { color: colors.text }]}>
                  Delete Account
                </Text>
                <Text style={[styles.deleteModalSubtitle, { color: colors.textSecondary }]}>
                  This action cannot be undone. All your data will be permanently deleted.
                </Text>
              </View>

              <View style={[styles.deleteModalWarnings, { backgroundColor: colors.error + '10', borderLeftColor: colors.error, borderColor: colors.error + '20' }]}>
                <Text style={[styles.warningText, { color: colors.error }]}>
                  • All saved listings will be removed
                </Text>
                <Text style={[styles.warningText, { color: colors.error }]}>
                  • Tour requests will be cancelled
                </Text>
                <Text style={[styles.warningText, { color: colors.error }]}>
                  • Profile information will be deleted
                </Text>
                <Text style={[styles.warningText, { color: colors.error }]}>
                  • This action is irreversible
                </Text>
              </View>

              <View style={styles.deleteModalButtons}>
                <Pressable
                  style={[styles.deleteModalButton, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteStep('confirmation');
                  }}
                >
                  <Text style={[styles.deleteModalButtonText, { color: colors.text }]}>cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.deleteModalButton, { backgroundColor: colors.error }]}
                  onPress={proceedToPasswordStep}
                >
                  <Text style={[styles.deleteModalButtonText, { color: 'white' }]}>continue</Text>
                </Pressable>
              </View>
            </>
          )}

          {deleteStep === 'password' && (
            <>
              <View style={[styles.deleteModalHeader, { borderBottomColor: colors.border }]}>
                <Ionicons name="lock-closed" size={48} color={colors.error} />
                <Text style={[styles.deleteModalTitle, { color: colors.text }]}>
                  Confirm Password
                </Text>
                <Text style={[styles.deleteModalSubtitle, { color: colors.textSecondary }]}>
                  Please enter your password to confirm account deletion.
                </Text>
              </View>
              
              <TextInput
                style={[styles.passwordInput, {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                autoFocus
              />

              <View style={styles.deleteModalButtons}>
                <Pressable
                  style={[styles.deleteModalButton, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                  onPress={() => setDeleteStep('confirmation')}
                >
                  <Text style={[styles.deleteModalButtonText, { color: colors.text }]}>Back</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.deleteModalButton,
                    {
                      backgroundColor: deletePassword.length > 0 ? colors.error : colors.textMuted,
                      opacity: deletePassword.length > 0 ? 1 : 0.5
                    }
                  ]}
                  onPress={confirmDelete}
                  disabled={deletePassword.length === 0}
                >
                  <Text style={[styles.deleteModalButtonText, { color: 'white' }]}>Delete Account</Text>
                </Pressable>
              </View>
            </>
          )}

          {deleteStep === 'processing' && (
            <View style={styles.deleteProcessingContainer}>
              <ActivityIndicator size="large" color={colors.error} />
              <Text style={[styles.deleteProcessingText, { color: colors.text }]}>
                Deleting your account...
              </Text>
              <Text style={[styles.deleteProcessingSubtext, { color: colors.textSecondary }]}>
                Please wait while we remove all your data.
              </Text>
            </View>
          )}
          </View>
        </View>
      </Modal>

      {/* Sign Out Button */}
      <View style={styles.signOutSection}>
        <Pressable
          style={[styles.signOutButton, {
            backgroundColor: colors.errorLight,
            borderColor: colors.error
          }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={[styles.signOutButtonText, { color: colors.error }]}>{t('signOut')}</Text>
        </Pressable>
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    margin: 16,
    marginTop: 24,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#00A896',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    marginBottom: 16,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  guestProfile: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  guestText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  settingsContainer: {
    marginHorizontal: 16,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  signOutSection: {
    margin: 16,
    marginBottom: 32,
  },
  signOutButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tourRequestItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tourRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  tourPropertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  tourDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  tourAddress: {
    fontSize: 14,
    marginBottom: 2,
  },
  tourPhone: {
    fontSize: 14,
    marginBottom: 2,
  },
  tourContactMethod: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  tourSummary: {
    fontSize: 13,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  tourHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  tourSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  multiplePropertiesContainer: {
    marginTop: 12,
  },
  propertiesCount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  propertiesList: {
    gap: 8,
  },
  propertyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  mainListingBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mainListingBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tourPropertyInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tourContactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  tourId: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  tourStatus: {
    fontSize: 11,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tourTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  propertyCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  propertyPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  propertyDetails: {
    marginTop: 8,
    gap: 4,
  },
  propertyDetail: {
    fontSize: 12,
    lineHeight: 16,
  },
  tourDetailsSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactInfo: {
    gap: 4,
  },
  contactMethod: {
    fontSize: 13,
    fontWeight: '500',
  },
  contactPhone: {
    fontSize: 13,
  },
  notesSection: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  requestInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 4,
  },
  requestId: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  requestTime: {
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  languageRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageFlag: {
    fontSize: 20,
  },
  languageText: {
    fontSize: 16,
  },
  languageModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 2,
  },
  languageModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 12,
  },
  languageDetails: {
    flex: 1,
    gap: 2,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
  },
  languageNativeName: {
    fontSize: 14,
    textAlign: 'left',
  },
  languageCloseButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  languageCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  topSpacing: {
    height: 0,
  },
  deleteModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 2,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  deleteModalTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  deleteModalSubtitle: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  deleteModalWarnings: {
    marginBottom: 28,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderLeftWidth: 5,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
    fontWeight: '500',
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  deleteModalButton: {
    flex: 1,
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
  deleteModalButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  passwordInput: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 17,
    marginBottom: 28,
    backgroundColor: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deleteProcessingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  deleteProcessingText: {
    fontSize: 19,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  deleteProcessingSubtext: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
});
