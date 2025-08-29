// lib/auth.ts
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '@/config/supabase';
import { Alert } from 'react-native';

// Configure Google Sign-In (call this once, typically in your app startup)
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
    // Add offlineAccess: true if you need a serverAuthCode for backend access
  });
};

// This function will be called from your Auth screen
export const signInWithGoogle = async () => {
  try {
    console.log('--- Starting NEW Google Sign-In with @react-native-google-signin ---');

    // 1. Check if the user has Google Play Services installed
    await GoogleSignin.hasPlayServices();
    console.log('--- Google Play Services available ---');

    // 2. Start the native sign-in flow
    const userInfo = await GoogleSignin.signIn();
    console.log('--- Native Google Sign-In completed ---');

    // 3. Check if we got user info and extract idToken
    if (userInfo && userInfo.data && userInfo.data.idToken) {
      console.log('--- Got ID token, signing in with Supabase ---');

      // 4. Use the idToken to sign in with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });

      if (error) {
        console.error('--- Supabase sign-in error:', error);
        throw error;
      }

      console.log('--- Supabase sign-in successful ---');
      return data;
    } else {
      console.error('--- No ID token returned from Google ---');
      throw new Error('Google Sign-In failed: No ID token returned.');
    }
  } catch (error: any) {
    console.error('--- Google Sign-In Error:', error.code, error.message);

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('--- User cancelled the login flow ---');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      console.log('--- Sign in is in progress already ---');
      Alert.alert('Sign-In In Progress', 'Please wait for the current sign-in to complete.');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      Alert.alert('Error', 'Google Play Services not available or outdated.');
    } else {
      // Some other error happened
      Alert.alert('Sign-In Error', 'An unexpected error occurred. Please try again.');
    }
    return null;
  }
};

// Email/Password authentication functions
export const signInWithEmail = (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUpWithEmail = (email: string, password: string) => {
  return supabase.auth.signUp({ email, password });
};

export const signOut = () => {
  return supabase.auth.signOut();
};