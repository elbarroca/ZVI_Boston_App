import 'react-native-gesture-handler'; // Must be at the very top for Reanimated

import { Slot, useRouter, useSegments } from 'expo-router';
import { SupabaseProvider, useSupabaseAuth } from '@/context/supabase-provider';
import { ThemeProvider } from '@/context/theme-provider';
import { LanguageProvider } from '@/context/language-provider';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Text, Pressable } from 'react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
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


// This is our Gatekeeper component. Its only job is to redirect.
const InitialLayout = () => {
  const { session, isLoading } = useSupabaseAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Set up deep link listener for OAuth callbacks
    const handleDeepLink = ({ url }: { url: string }) => {

      // Check if this is an OAuth callback
      if (url.includes('auth/callback')) {
        // Parse the URL to extract the authorization code
        try {
          const parsedUrl = Linking.parse(url);

          if (parsedUrl.queryParams?.code) {
            // Navigate to the auth callback route with the code as a parameter
            router.replace({
              pathname: '/auth/callback',
              params: { code: parsedUrl.queryParams.code }
            });
          } else if (parsedUrl.queryParams?.access_token) {
            // Handle direct token response
            router.replace({
              pathname: '/auth/callback',
              params: parsedUrl.queryParams
            });
          } else {
            router.replace('/auth/callback');
          }
        } catch (error) {
          console.error('Error parsing deep link URL:', error);
          router.replace('/auth/callback');
        }
      }
    };

    // Add deep link listener
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check initial URL when app starts
    Linking.getInitialURL().then((url) => {
      if (url && url.includes('auth/callback')) {
        try {
          const parsedUrl = Linking.parse(url);

          if (parsedUrl.queryParams?.code) {
            router.replace({
              pathname: '/auth/callback',
              params: { code: parsedUrl.queryParams.code }
            });
          } else if (parsedUrl.queryParams?.access_token) {
            router.replace({
              pathname: '/auth/callback',
              params: parsedUrl.queryParams
            });
          } else {
            router.replace('/auth/callback');
          }
        } catch (error) {
          console.error('Error parsing initial OAuth URL:', error);
          router.replace('/auth/callback');
        }
      }
    }).catch((error) => {
      console.error('Error getting initial URL:', error);
    });

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

    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
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