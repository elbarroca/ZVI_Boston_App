// lib/auth.ts
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/config/supabase';
import { Alert, Linking } from 'react-native';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Configure Google Sign-In (call this once, typically in your app startup)
export const configureGoogleSignIn = () => {
  // Warm up the browser for faster OAuth
  WebBrowser.warmUpAsync();

  // Configure deep linking for OAuth redirects
  Linking.addEventListener('url', (event) => {
    // Handle OAuth callback deep links
    if (event.url.includes('/auth/callback')) {
      // The router will handle navigation to the callback screen
    }
  });
};

// Get the appropriate redirect URI for the current platform
const getRedirectUri = () => {
  if (Platform.OS === 'web') {
    return `${window.location.origin}/auth/callback`;
  }

  // For mobile, always use the custom scheme - this works for both dev and prod
  // In development, Expo will handle the routing from the browser back to the app
  return 'com.zentro.studenthousing://auth/callback';
};

// This function will be called from your Auth screen
export const signInWithGoogle = async () => {
  try {
    const redirectUri = getRedirectUri();

    // Use Supabase's built-in OAuth method which handles PKCE properly
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw error;
    }

    // For mobile, we need to handle the browser redirect
    if (Platform.OS !== 'web') {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url!,
        redirectUri,
        {
          showInRecents: true,
        }
      );

      if (result.type === 'success') {
        // Extract authorization code and navigate to callback screen
        if (result.url && result.url.includes('auth/callback')) {
          const urlObj = new URL(result.url);
          const code = urlObj.searchParams.get('code');

          if (code) {
            // Navigate directly to callback screen for Expo Go
            setTimeout(() => {
              router.replace({
                pathname: '/auth/callback',
                params: { code: code }
              });
            }, 500);
          }
        }

        return { success: true, url: result.url };
      } else {
        return null;
      }
    }

    return data;
  } catch (error: any) {
    if (error.message?.includes('cancelled') || error.message?.includes('dismissed')) {
      // User cancelled the login flow
    } else {
      Alert.alert('Sign-In Error', error.message || 'An unexpected error occurred. Please try again.');
    }
    return null;
  }
};

// Apple Sign-In function
export const signInWithApple = async () => {
  try {
    // Check if Apple authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple authentication is not available on this device');
    }

    // Request Apple authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Sign in with Supabase using the Apple token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
    });

    if (error) {
      throw error;
    }

    // If we have user data from Apple but no email in Supabase, update the profile
    if (credential.email && data.user && !data.user.email) {
      const { error: updateError } = await supabase.auth.updateUser({
        email: credential.email,
        data: {
          full_name: credential.fullName ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : null,
        }
      });

      if (updateError) {
        console.warn('Error updating user profile with Apple data:', updateError);
      }
    }

    // Navigate to main app on successful authentication
    router.replace('/(tabs)');
    
    return { success: true, user: data.user, session: data.session };
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      // User cancelled the Apple Sign-In flow
      return null;
    } else {
      Alert.alert('Apple Sign-In Error', error.message || 'An unexpected error occurred. Please try again.');
      return null;
    }
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