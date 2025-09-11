// app/(auth)/index.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image, Dimensions, Platform, ScrollView, ActivityIndicator } from 'react-native';
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
  const router = useRouter();

  // Configure authentication providers when component mounts
  React.useEffect(() => {
    configureGoogleSignIn();
    
    // Check if Apple authentication is available (iOS only)
    const checkAppleAuth = async () => {
      if (Platform.OS === 'ios') {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setIsAppleAuthAvailable(isAvailable);
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
        Alert.alert("Success!", "Please check your email for confirmation.");
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
        {/* Google Sign-In Button */}
        <Pressable
          style={({ pressed, hovered }) => [
            styles.button,
            styles.googleButton,
            (hovered) && styles.googleButtonHovered,
            pressed && styles.buttonPressed,
            isGoogleLoading && styles.buttonDisabled,
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color="#374151" style={{ marginRight: 12 }} />
            ) : (
              <GoogleIcon width={Platform.OS === 'web' ? 22 : 20} height={Platform.OS === 'web' ? 22 : 20} />
            )}
            <Text style={[styles.googleButtonText, isGoogleLoading && styles.buttonTextDisabled]}>
              {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </View>
        </Pressable>

        {/* Apple Sign-In Button - Only show on iOS if available */}
        {isAppleAuthAvailable && (
          <Pressable
            style={({ pressed, hovered }) => [
              styles.button,
              styles.appleButton,
              (hovered) && styles.appleButtonHovered,
              pressed && styles.buttonPressed,
              isAppleLoading && styles.buttonDisabled,
            ]}
            onPress={async () => {
              if (isAppleLoading) return;

              setIsAppleLoading(true);
              try {
                await signInWithApple();
              } finally {
                setIsAppleLoading(false);
              }
            }}
            disabled={isAppleLoading}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isAppleLoading ? (
                <ActivityIndicator size="small" color="#000000" style={{ marginRight: 12 }} />
              ) : (
                <Ionicons name="logo-apple" size={Platform.OS === 'web' ? 22 : 20} color="#000000" />
              )}
              <Text style={[styles.appleButtonText, isAppleLoading && styles.buttonTextDisabled]}>
                {isAppleLoading ? 'Signing in...' : 'Continue with Apple'}
              </Text>
            </View>
          </Pressable>
        )}

        <Text style={styles.orText}>or</Text>

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
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3
  },
  googleButtonHovered: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    shadowOpacity: 0.15
  },
  googleButtonText: {
    color: '#374151',
    fontSize: Platform.OS === 'web' ? 17 : 16,
    fontWeight: '600',
    marginLeft: 12,
    // Ensure the text is vertically centered with the icon
    lineHeight: Platform.OS === 'web' ? 22 : 20,
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginTop: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3
  },
  appleButtonHovered: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    shadowOpacity: 0.15
  },
  appleButtonText: {
    color: '#374151',
    fontSize: Platform.OS === 'web' ? 17 : 16,
    fontWeight: '600',
    marginLeft: 12,
    lineHeight: Platform.OS === 'web' ? 22 : 20,
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
  orText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: Platform.OS === 'web' ? 36 : 28,
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
  }
});
