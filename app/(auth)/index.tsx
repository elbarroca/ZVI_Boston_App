// app/(auth)/index.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image, Dimensions, Platform, ScrollView, ActivityIndicator, Modal } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, configureGoogleSignIn } from '@/lib/auth';
import GoogleIcon from '@/components/GoogleIcon'; // Import the new GoogleIcon component
import { EmailAuthButton } from '@/components/ui/EmailAuthButton'; // Import the new EmailAuthButton component
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();

  // Configure authentication providers when component mounts
  React.useEffect(() => {
    configureGoogleSignIn();

    // Check if Apple authentication is available (iOS only)
    const checkAppleAuth = async () => {
      if (Platform.OS === 'ios') {
        try {
          const isAvailable = await AppleAuthentication.isAvailableAsync();
          setIsAppleAuthAvailable(isAvailable);
          console.log('🍎 Apple Sign In availability:', isAvailable ? 'Available' : 'Not Available');
        } catch (error) {
          console.warn('⚠️ Error checking Apple auth availability:', error);
          setIsAppleAuthAvailable(false);
        }
      } else {
        setIsAppleAuthAvailable(false);
      }
    };

    checkAppleAuth();
  }, []);

  const handleEmailAuth = async () => {
    if (isEmailLoading) return;

    setIsEmailLoading(true);
    try {
      const action = isSignUp ? signUpWithEmail : signInWithEmail;
      const { error } = await action(email, password);
      if (error) {
        Alert.alert(error.message);
      } else if (isSignUp) {
        setShowConfirmModal(true);
      } else {
        // For sign-in, explicitly navigate to tabs after successful auth
        console.log('Email sign-in successful, navigating to tabs...');
        router.replace('/(tabs)');
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.headerContainer}>
        <Text style={styles.header}>zentro</Text>
        <Text style={styles.subHeader}>
          {isSignUp ? 'Create your account to get started.' : 'Welcome back. Find your place.'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Social Links Section */}
        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>Continue with Social Links</Text>

          <View style={styles.socialIconsContainer}>
            {/* Google Sign-In Button */}
            <View style={styles.socialButtonWrapper}>
              <Pressable
                style={({ pressed, hovered }) => [
                  styles.socialIconButton,
                  styles.googleIconButton,
                  (hovered) && styles.googleIconButtonHovered,
                  pressed && styles.iconButtonPressed,
                  isGoogleLoading && styles.iconButtonDisabled,
                ]}
                onPress={async () => {
                  if (isGoogleLoading) return;

                  setIsGoogleLoading(true);
                  try {
                    console.log('--- TAPPED GOOGLE SIGN IN BUTTON ---');
                    console.log('--- Starting OAuth flow ---');
                    const data = await signInWithGoogle();
                    if (data) {
                      console.log('--- OAuth initiated successfully ---');
                      console.log('--- Waiting for redirect back to app ---');
                    } else {
                      console.log('--- OAuth initiation failed ---');
                    }
                  } finally {
                    setIsGoogleLoading(false);
                  }
                }}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color="#374151" />
                ) : (
                  <GoogleIcon width={24} height={24} />
                )}
              </Pressable>
              <Text style={styles.socialButtonLabel}>Google</Text>
            </View>

            {/* Apple Sign-In Button - Only show on iOS if available */}
            {Platform.OS === 'ios' && (
              <View style={styles.socialButtonWrapper}>
                <Pressable
                  style={({ pressed, hovered }) => [
                    styles.socialIconButton,
                    styles.appleIconButton,
                    (hovered) && styles.appleIconButtonHovered,
                    pressed && styles.iconButtonPressed,
                    isAppleLoading && styles.iconButtonDisabled,
                  ]}
                  onPress={async () => {
                    if (isAppleLoading) return;

                    console.log('🍎 Apple Sign In button pressed');
                    setIsAppleLoading(true);

                    try {
                      const result = await signInWithApple();

                      if (result?.success) {
                        console.log('✅ Apple Sign In successful');
                        // Navigation is handled in the auth function
                      } else if (result === null) {
                        console.log('👤 User cancelled Apple Sign In');
                      } else {
                        console.log('❌ Apple Sign In failed');
                      }
                    } catch (error) {
                      console.error('❌ Apple Sign In error:', error);
                      Alert.alert(
                        'Sign In Failed',
                        'Unable to sign in with Apple. Please try again.',
                        [{ text: 'OK' }]
                      );
                    } finally {
                      setIsAppleLoading(false);
                    }
                  }}
                  disabled={isAppleLoading}
                >
                  {isAppleLoading ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <Ionicons name="logo-apple" size={24} color="#000000" />
                  )}
                </Pressable>
                <Text style={styles.socialButtonLabel}>Apple</Text>
              </View>
            )}
          </View>
        </View>



        <View style={styles.orContainer}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.orLine} />
        </View>

        {/* Email/Password Inputs */}
        <TextInput
          style={[styles.input, { marginBottom: 16 }]} // Added marginBottom
          placeholder="Email"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, { marginBottom: 24 }]} // Increased marginBottom for spacing before button
          placeholder="Password"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <EmailAuthButton
          onPress={handleEmailAuth}
          title={isEmailLoading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
          disabled={isEmailLoading}
          buttonStyle={{
            backgroundColor: 'transparent', // Make background transparent
            marginTop: 24,
            marginBottom: 20,
            shadowColor: 'transparent', // Remove shadow
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
            borderWidth: 0, // Ensure no border
            opacity: isEmailLoading ? 0.7 : 1,
          }}
          textStyle={{
            color: '#1A1A1A', // Black text
            fontSize: Platform.OS === 'web' ? 17 : 16,
            fontWeight: '600', // Slightly less bold for a simpler look
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
          maxWidth={Platform.OS === 'web' ? 420 : screenWidth * 0.85}
        />

        <Pressable onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.footerText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.linkText}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
          </Text>
        </Pressable>
      </View>

      {/* Email Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Text style={styles.checkmarkIcon}>✓</Text>
            </View>

            <Text style={styles.modalTitle}>Check your email</Text>

            <Text style={styles.modalMessage}>
              We've sent a confirmation link to{'\n'}
              <Text style={styles.modalEmail}>{email}</Text>
            </Text>

            <Text style={styles.modalSubMessage}>
              Click the link in the email to verify your account and start exploring Boston housing options for students.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  setIsSignUp(false); // Switch to sign-in mode
                }}
              >
                <Text style={styles.modalButtonText}>Continue to Sign In</Text>
              </Pressable>

              <Pressable
                style={styles.modalSecondaryButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalSecondaryText}>Resend Email</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.modalFooterButton}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text style={styles.modalFooterText}>Didn't receive the email? Check your spam folder</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? Math.max(32, screenWidth * 0.05) : 24,
    paddingVertical: Platform.OS === 'ios' ? Math.max(60, screenHeight * 0.1) : Platform.OS === 'web' ? Math.max(32, screenHeight * 0.05) : 24,
    minHeight: screenHeight,
    width: '100%'
  },
  headerContainer: {
    // Removed flex: 1 to allow formContainer to take more space
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 50 : Platform.OS === 'web' ? 60 : 40,
    marginTop: Platform.OS === 'ios' ? 20 : 0,
    width: '100%',
    maxWidth: 400
  },
  formContainer: {
    flex: 1, // Allow formContainer to expand if needed
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : screenWidth * 0.9,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16
  },
  header: {
    fontSize: Platform.OS === 'web' ? 56 : screenWidth < 400 ? 44 : 52,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -1,
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 64 : screenWidth < 400 ? 48 : 58
  },
  subHeader: {
    fontSize: Platform.OS === 'web' ? 20 : screenWidth < 400 ? 16 : 18,
    color: '#6B7280',
    marginTop: 12,
    maxWidth: 320,
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 28 : screenWidth < 400 ? 22 : 24
  },
  input: {
    backgroundColor: '#F8FAFC',
    padding: Platform.OS === 'web' ? 20 : 18,
    borderRadius: 16,
    fontSize: Platform.OS === 'web' ? 17 : 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    minHeight: Platform.OS === 'web' ? 52 : 48
  },
  button: {
    flexDirection: 'row',
    paddingVertical: Platform.OS === 'web' ? 18 : 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: Platform.OS === 'web' ? 56 : 52,
    maxWidth: Platform.OS === 'web' ? 420 : screenWidth * 0.85
  },
  oauthButtonsContainer: {
    flexDirection: 'column',
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 420 : screenWidth * 0.9,
    marginBottom: 32,
  },
  oauthButton: {
    flexDirection: 'row',
    paddingVertical: Platform.OS === 'web' ? 16 : 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    minHeight: Platform.OS === 'web' ? 48 : 44,
    width: '100%',
    marginBottom: 32,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  socialTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonWrapper: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  socialIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },
  socialButtonLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  googleIconButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E3F2FD',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  googleIconButtonHovered: {
    backgroundColor: '#F8FBFF',
    borderColor: '#BBDEFB',
    shadowOpacity: 0.25,
  },
  appleIconButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  appleIconButtonHovered: {
    backgroundColor: '#F1F3F4',
    borderColor: '#DADCE0',
    shadowOpacity: 0.2,
  },
  iconButtonPressed: {
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0.05,
  },
  iconButtonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.05
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextDisabled: {
    opacity: 0.7,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  googleButtonHovered: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    shadowOpacity: 0.15
  },
  googleButtonText: {
    color: '#374151',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
    marginLeft: 12,
    lineHeight: Platform.OS === 'web' ? 18 : 16,
  },
  oauthButtonText: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
    lineHeight: Platform.OS === 'web' ? 18 : 16,
  },
  appleButton: {
    backgroundColor: '#FFFFFF', // Clean white background like Google
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  appleButtonHovered: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    shadowOpacity: 0.15
  },
  appleButtonText: {
    color: '#000000', // Black text on white background
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
    marginLeft: 12,
    lineHeight: Platform.OS === 'web' ? 18 : 16,
  },
  icon: {
    width: Platform.OS === 'web' ? 22 : 20,
    height: Platform.OS === 'web' ? 22 : 20
  },
  fallbackIcon: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
    fontWeight: '700',
    color: '#4285F4',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 22 : 20
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Platform.OS === 'web' ? 24 : 20,
    width: '100%',
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginHorizontal: 16,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '500',
    letterSpacing: 1
  },
  footerText: {
    marginTop: Platform.OS === 'web' ? 40 : 32, // Ensure consistent spacing
    textAlign: 'center',
    color: '#64748B',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    lineHeight: Platform.OS === 'web' ? 24 : 22,
  },
  linkText: {
    color: '#1570ef',
    fontWeight: '700',
    textDecorationLine: 'underline'
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkmarkIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 22,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  modalMessage: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 24 : 22,
    marginBottom: 12,
  },
  modalEmail: {
    fontWeight: '600',
    color: '#374151',
  },
  modalSubMessage: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: Platform.OS === 'web' ? 22 : 20,
    marginBottom: 32,
  },
  modalActions: {
    width: '100%',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#1570ef',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#1570ef',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalSecondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: '#374151',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  modalFooterButton: {
    paddingVertical: 8,
  },
  modalFooterText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#6B7280',
    textAlign: 'center',
    textDecorationLine: 'underline',
  }
});
