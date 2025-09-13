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

// Apple Sign-In function with enhanced iOS experience
export const signInWithApple = async () => {
  try {
    console.log('🍎 Starting Apple Sign In process...');

    // Check if Apple authentication is available (iOS only)
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Apple Sign In is not available on this device. Make sure you\'re running on iOS.');
    }

    console.log('✅ Apple Sign In available, requesting credentials...');

    // Request Apple authentication with optimized iOS experience
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('No identity token received from Apple. Please try again.');
    }

    console.log('✅ Apple credentials received, signing in with Supabase...');

    // Sign in with Supabase using the Apple token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      console.error('❌ Supabase Apple auth error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }

    console.log('✅ Supabase authentication successful');

    // Enhanced user profile update with better error handling
    if (credential.email && data.user) {
      try {
        const updateData: any = { email: credential.email };

        // Build full name from Apple credential
        if (credential.fullName) {
          const givenName = credential.fullName.givenName || '';
          const familyName = credential.fullName.familyName || '';
          const fullName = `${givenName} ${familyName}`.trim();

          if (fullName) {
            updateData.data = { full_name: fullName };
          }
        }

        const { error: updateError } = await supabase.auth.updateUser(updateData);

        if (updateError) {
          console.warn('⚠️ Could not update user profile with Apple data:', updateError);
          // Don't throw here - profile update is not critical for sign-in success
        } else {
          console.log('✅ User profile updated with Apple data');
        }
      } catch (profileError) {
        console.warn('⚠️ Profile update failed, but authentication succeeded:', profileError);
      }
    }

    console.log('🎉 Apple Sign In complete, navigating to main app...');

    // Navigate to main app on successful authentication
    router.replace('/(tabs)');

    return {
      success: true,
      user: data.user,
      session: data.session,
      isNewUser: !data.user?.last_sign_in_at // Rough indication of new user
    };

  } catch (error: any) {
    console.error('❌ Apple Sign In error:', error);

    // Handle specific Apple authentication errors with better messaging
    if (error.code === 'ERR_REQUEST_CANCELED') {
      console.log('👤 User cancelled Apple Sign In');
      return null;
    }

    if (error.code === 'ERR_APPLE_AUTHENTICATION') {
      Alert.alert(
        'Apple Sign In Failed',
        'Unable to authenticate with Apple. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return null;
    }

    if (error.code === 'ERR_INVALID_RESPONSE') {
      Alert.alert(
        'Authentication Error',
        'Received an invalid response from Apple. Please try again.',
        [{ text: 'OK' }]
      );
      return null;
    }

    // Generic error handling
    const errorMessage = error.message || 'An unexpected error occurred during Apple Sign In.';
    Alert.alert('Apple Sign In Error', errorMessage);

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