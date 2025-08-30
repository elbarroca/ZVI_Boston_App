import 'react-native-gesture-handler'; // Must be at the very top for Reanimated

import { Slot, useRouter, useSegments } from 'expo-router';
import { SupabaseProvider, useSupabaseAuth } from '@/context/supabase-provider';
import { ThemeProvider } from '@/context/theme-provider';
import { LanguageProvider } from '@/context/language-provider';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text, Pressable } from 'react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
// --- 1. IMPORT THE COMPONENT ---
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const queryClient = new QueryClient();

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreen: {
    flex: 1,
  }
});

// Function to handle OAuth URL parameters
const handleOAuthCallback = async () => {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      console.log('OAuth callback detected, extracting tokens from URL...');

      try {
        // Parse the hash parameters manually
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresAt = hashParams.get('expires_at');

        if (accessToken && refreshToken) {
          console.log('Setting session from extracted tokens...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
          } else if (data.session) {
            console.log('Session successfully established from OAuth tokens');
            // Clean up the URL
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          }
        } else {
          console.log('No valid tokens found in URL');
        }
      } catch (error) {
        console.error('Error handling OAuth callback:', error);
      }
    }
  }
};

// This is our Gatekeeper component. Its only job is to redirect.
const InitialLayout = () => {
  const { session, isLoading } = useSupabaseAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Handle OAuth callback when component mounts or segments change
    handleOAuthCallback();

    // 1. Wait until the session is loaded.
    if (isLoading) {
      return;
    }

    // 2. Determine if the user is currently in the main app (tabs) group.
    const inTabsGroup = segments[0] === '(tabs)';

    // 3. Perform the redirect logic.
    if (session && !inTabsGroup) {
      // User is logged in but is not in the main app area.
      // This happens right after a successful login.
      // Redirect them to the main feed screen.
      router.replace('/(tabs)');
    } else if (!session) {
      // User is not logged in.
      // Force them to the authentication screen.
      // This will also handle logout.
      router.replace('/(auth)');
    }
  }, [session, isLoading, segments, router]);

  // While checking for a session, show a loading spinner.
  // This prevents a screen flash.
  // Add a timeout to prevent infinite loading (fallback after 15 seconds)
  const [showFallback, setShowFallback] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setShowFallback(true);
      }, 15000); // 15 seconds

      return () => clearTimeout(timer);
    } else {
      setShowFallback(false);
      setRetryCount(0);
    }
  }, [isLoading]);

  const handleRetry = () => {
    console.log('User clicked retry, reloading session...');
    setRetryCount(prev => prev + 1);
    setShowFallback(false);
    // Force a re-render by triggering the useEffect in SupabaseProvider
    window.location.reload();
  };

  if (isLoading && !showFallback) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Show fallback screen with retry option
  if (showFallback) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: 'white', marginBottom: 20, textAlign: 'center' }}>
          App is taking longer than usual to load.{'\n'}
          This might be due to network issues or emulator performance.
        </Text>
        <Pressable
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
          onPress={handleRetry}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            Retry ({retryCount}/3)
          </Text>
        </Pressable>
        {retryCount >= 3 && (
          <Text style={{ color: 'red', marginTop: 20, textAlign: 'center' }}>
            If the app still won't load, try restarting the emulator or checking your internet connection.
          </Text>
        )}
      </View>
    );
  }

  // Once the logic is handled, show the screen that the router has decided on.
  return <Slot />;
};

export default function RootLayout() {
  return (
    // --- 2. WRAP YOUR ENTIRE APP ---
    <GestureHandlerRootView style={styles.fullScreen}>
      <LanguageProvider>
        <ThemeProvider>
          <SupabaseProvider>
            <QueryClientProvider client={queryClient}>
              <InitialLayout />
            </QueryClientProvider>
          </SupabaseProvider>
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}