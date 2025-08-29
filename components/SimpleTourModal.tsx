import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';

interface SimpleTourModalProps {
  visible: boolean;
  onClose: () => void;
  listingTitle: string;
  listingAddress: string;
  userEmail?: string;
  userName?: string;
}

export function SimpleTourModal({
  visible,
  onClose,
  listingTitle,
  listingAddress,
  userEmail,
  userName,
}: SimpleTourModalProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Debug logging
  React.useEffect(() => {
    if (__DEV__ && visible) {
      console.log('🔥 SimpleTourModal RENDERED:', {
        visible,
        platform: Platform.OS,
        screenWidth,
        screenHeight,
        listingTitle
      });
    }
  }, [visible, screenWidth, screenHeight, listingTitle]);

  if (Platform.OS === 'android') {
    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={onClose}
        hardwareAccelerated={true}
      >
        <View style={[styles.androidContainer, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.androidHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.androidTitle, { color: colors.text }]}>
              Request a Tour
            </Text>
            <Pressable
              style={styles.androidCloseButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.androidCloseText, { color: colors.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          {/* Debug Info */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>
                🟢 ANDROID MODAL ACTIVE | {screenWidth}x{screenHeight}
              </Text>
            </View>
          )}

          {/* Content */}
          <ScrollView style={styles.androidContent}>
            <View style={styles.contentPadding}>
              <Text style={[styles.greeting, { color: colors.text }]}>
                Hello, {userName || 'there'}!
              </Text>
              
              <View style={styles.propertyInfo}>
                <Text style={[styles.propertyTitle, { color: colors.text }]}>
                  🏠 {listingTitle}
                </Text>
                <Text style={[styles.propertyAddress, { color: colors.textSecondary }]}>
                  📍 {listingAddress}
                </Text>
                <Text style={[styles.propertyAddress, { color: colors.textSecondary }]}>
                  📧 {userEmail || 'No email provided'}
                </Text>
              </View>

              <View style={styles.placeholderForm}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  Select your preferred times:
                </Text>
                
                <View style={styles.timeSlotContainer}>
                  {['9:00 AM - 12:00 PM', '12:00 PM - 3:00 PM', '3:00 PM - 6:00 PM'].map((slot, index) => (
                    <Pressable
                      key={index}
                      style={[styles.timeSlot, { backgroundColor: colors.background, borderColor: colors.border }]}
                    >
                      <Text style={[styles.timeSlotText, { color: colors.text }]}>
                        {slot}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    console.log('🎯 Submit button pressed!');
                    alert('Tour request would be submitted here');
                  }}
                >
                  <Text style={styles.submitButtonText}>
                    Submit Request
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // iOS Modal
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View style={styles.iosOverlay}>
        <Pressable style={styles.iosBackdrop} onPress={onClose} />
        <View style={styles.iosContainer}>
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>
                🔵 iOS MODAL ACTIVE | {screenWidth}x{screenHeight}
              </Text>
            </View>
          )}
          
          <View style={[styles.iosContent, { backgroundColor: colors.surface }]}>
            <View style={styles.iosHandle} />
            
            <ScrollView style={styles.iosScrollView}>
              <View style={styles.contentPadding}>
                <Text style={[styles.iosTitle, { color: colors.text }]}>
                  Request a Tour
                </Text>
                
                <Text style={[styles.greeting, { color: colors.text }]}>
                  Hello, {userName || 'there'}!
                </Text>
                
                <View style={styles.propertyInfo}>
                  <Text style={[styles.propertyTitle, { color: colors.text }]}>
                    🏠 {listingTitle}
                  </Text>
                  <Text style={[styles.propertyAddress, { color: colors.textSecondary }]}>
                    📍 {listingAddress}
                  </Text>
                </View>

                <Pressable
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    console.log('🎯 iOS Submit button pressed!');
                    alert('Tour request would be submitted here');
                  }}
                >
                  <Text style={styles.submitButtonText}>
                    Submit Request
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
  // Android styles
  androidContainer: {
    flex: 1,
  },
  androidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 50 : 16,
    borderBottomWidth: 1,
    elevation: 2,
  },
  androidTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  androidCloseButton: {
    padding: 8,
  },
  androidCloseText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  androidContent: {
    flex: 1,
  },

  // iOS styles
  iosOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  iosBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iosContainer: {
    justifyContent: 'flex-end',
  },
  iosContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  iosHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ccc',
    alignSelf: 'center',
    marginVertical: 12,
  },
  iosTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  iosScrollView: {
    flex: 1,
  },

  // Shared styles
  contentPadding: {
    padding: 20,
  },
  debugContainer: {
    backgroundColor: 'rgba(0, 255, 0, 0.9)',
    padding: 8,
    margin: 10,
    borderRadius: 4,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  greeting: {
    fontSize: 18,
    marginBottom: 20,
  },
  propertyInfo: {
    marginBottom: 30,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  propertyAddress: {
    fontSize: 14,
    marginBottom: 4,
  },
  placeholderForm: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  timeSlotContainer: {
    gap: 12,
    marginBottom: 30,
  },
  timeSlot: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});