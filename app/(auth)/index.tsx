// app/(auth)/index.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoogleSignIn, signInWithEmail, signUpWithEmail } from '@/lib/auth'; // Centralize auth functions

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Google logo - using local asset for better reliability
const GOOGLE_ICON_URI = require('../../assets/google-logo.svg');

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleIconError, setGoogleIconError] = useState(false);
  const router = useRouter();

  const { signInWithGoogle } = useGoogleSignIn();

  const handleEmailAuth = async () => {
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>ZVI</Text>
        <Text style={styles.subHeader}>
          {isSignUp ? 'Create your account to get started.' : 'Welcome back. Find your place.'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Pressable
          style={({ pressed, hovered }) => [
            styles.button,
            styles.googleButton,
            (hovered) && styles.googleButtonHovered,
            pressed && styles.buttonPressed,
          ]}
          onPress={async () => {
            console.log('Starting Google sign-in...');
            const result = await signInWithGoogle();
            if (result) {
              console.log('Google sign-in initiated, session will be handled by layout...');
              // For OAuth, don't navigate explicitly - let the layout handle it
              // The session will be detected from URL parameters
            }
          }}
        >
          {!googleIconError ? (
            <Image
              source={GOOGLE_ICON_URI}
              style={styles.icon}
              onError={() => {
                console.log('Google icon failed to load, using fallback');
                setGoogleIconError(true);
              }}
            />
          ) : (
            <Text style={[styles.icon, styles.fallbackIcon]}>G</Text>
          )}
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        <Text style={styles.orText}>or</Text>

        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <Pressable
          style={({ pressed, hovered }) => [
            styles.button,
            styles.emailButton,
            (hovered) && styles.emailButtonHovered,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleEmailAuth}
        >
          <Text style={styles.emailButtonText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
        </Pressable>

        <Pressable onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.footerText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.linkText}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? Math.max(32, screenWidth * 0.05) : 24,
    paddingVertical: Platform.OS === 'web' ? Math.max(32, screenHeight * 0.05) : 24,
    backgroundColor: '#FFFFFF',
    minHeight: screenHeight,
    width: '100%'
  },
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 60 : 40,
    width: '100%',
    maxWidth: 400
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
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
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginBottom: 8,
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
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  emailButton: {
    backgroundColor: '#00A896',
    borderWidth: 0,
    marginTop: 8,
    shadowColor: '#00A896',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6
  },
  emailButtonHovered: {
    backgroundColor: '#008778',
    shadowOpacity: 0.3
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 17 : 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center'
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
    marginVertical: Platform.OS === 'web' ? 32 : 24,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '500',
    letterSpacing: 1
  },
  footerText: {
    marginTop: Platform.OS === 'web' ? 40 : 32,
    textAlign: 'center',
    color: '#64748B',
    fontSize: Platform.OS === 'web' ? 16 : 15,
    lineHeight: Platform.OS === 'web' ? 24 : 22
  },
  linkText: {
    color: '#00A896',
    fontWeight: '700',
    textDecorationLine: 'underline'
  }
});
