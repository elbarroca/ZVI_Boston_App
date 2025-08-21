// lib/auth.ts
import { supabase } from '@/config/supabase';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform, Alert } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// This hook provides a single, cross-platform function for Google Sign-In
export const useGoogleSignIn = () => {
  // --- Native Auth Logic (iOS & Android) ---
  const [request, response, promptAsync] = useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  });

  const signInWithGoogleNative = async () => {
    try {
      const result = await promptAsync();
      if (result.type === 'success') {
        const { id_token } = result.params;
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: id_token,
        });
        if (error) throw error;
        return data;
      }
      return null;
    } catch (error) {
      console.error("Error during native Google Sign-In:", error);
      return null;
    }
  };
  
  // --- Web Auth Logic ---
  const signInWithGoogleWeb = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/(tabs)`, // Redirects back to your app's main screen
        },
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error during web Google Sign-In:", error);
      return null;
    }
  };

  // --- Unified Sign-In Function ---
  const signInWithGoogle = async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return await signInWithGoogleNative();
    } else if (Platform.OS === 'web') {
      return await signInWithGoogleWeb();
    } else {
      Alert.alert("Unsupported Platform");
      return null;
    }
  };

  return { signInWithGoogle };
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