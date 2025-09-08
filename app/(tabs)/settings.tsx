import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, Alert, ScrollView, Switch, TouchableOpacity, Modal } from 'react-native';
import { useSupabaseAuth } from '@/context/supabase-provider';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { supabase } from '@/config/supabase';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, LANGUAGES, TranslationKey } from '@/context/language-provider';
import { Stack, useRouter } from 'expo-router';

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
  return data || [];
};

export default function SettingsScreen() {
  const { session } = useSupabaseAuth();
  const { theme, toggleTheme } = useTheme();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const colors = themeColors[theme];
  const router = useRouter();
  const [showLanguageModal, setShowLanguageModal] = React.useState(false);

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
      Alert.alert("Error signing out", error.message);
    }
  };

  const handleHelp = () => {
    Alert.alert("Help & Support", "Contact us at support@yourapp.com for assistance.");
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

                {/* Property Information Card */}
                {tour.listings && (
                  <View style={[styles.propertyCard, { backgroundColor: colors.background }]}>
                    <View style={styles.propertyHeader}>
                      <Text style={[styles.tourPropertyTitle, { color: colors.text }]}>
                        {tour.listings.title}
                      </Text>
                      <Text style={[styles.propertyPrice, { color: colors.primary }]}>
                        ${tour.listings.price_per_month?.toLocaleString()}/mo
                      </Text>
                    </View>

                    <Text style={[styles.tourAddress, { color: colors.textSecondary }]}>
                      📍 {tour.listings.location_address}
                    </Text>

                    <View style={styles.propertyDetails}>
                      <Text style={[styles.propertyDetail, { color: colors.textMuted }]}>
                        🏠 {tour.listings.property_type} • {tour.listings.bedrooms} bed • {tour.listings.bathrooms} bath
                      </Text>
                      {tour.listings.university_proximity_minutes && (
                        <Text style={[styles.propertyDetail, { color: colors.textMuted }]}>
                          🎓 {tour.listings.university_proximity_minutes} min walk to {tour.listings.nearest_university}
                        </Text>
                      )}
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
        <Pressable style={styles.modalBackdrop} onPress={() => setShowLanguageModal(false)} />
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
            <Text style={styles.languageCloseText}>{t('done')}</Text>
          </Pressable>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '70%',
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
    height: 100,
  },
});
