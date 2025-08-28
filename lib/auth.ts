// lib/auth.ts
import { supabase } from '@/config/supabase';
import * as Google from 'expo-auth-session/providers/google'; // Use the specific Google provider
import * as WebBrowser from 'expo-web-browser';
import { Platform, Alert } from 'react-native';
import React from 'react';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleSignIn = () => {
  // Use the simpler, more reliable useAuthRequest for native
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  });

  // This useEffect handles the response from Google
  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      supabase.auth.signInWithIdToken({
        provider: 'google',
        token: id_token,
      });
    }
  }, [response]);

  const signInWithGoogle = async (): Promise<boolean> => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const result = await promptAsync();
      // On native, promptAsync returns an object with type 'success' or 'cancel'
      // We consider it a success if the type is 'success', and the useEffect above handles the actual Supabase sign-in.
      return result?.type === 'success';
    } else {
      // For web, signInWithOAuth directly navigates, so we don't get a direct return value here.
      // The session will be detected from URL parameters in the layout.
      // We can assume that if it doesn't throw an error, it initiated successfully.
      try {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`,
          },
        });
        return true; // Indicate that the OAuth flow was initiated
      } catch (error) {
        console.error("Error initiating Google OAuth on web:", error);
        return false;
      }
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