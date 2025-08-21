import { Slot, useRouter, useSegments } from 'expo-router';
import { SupabaseProvider, useSupabaseAuth } from '@/context/supabase-provider';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';

const queryClient = new QueryClient();

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    console.log('Layout: useEffect triggered', { isLoading, session: !!session, segments });

    // Handle OAuth callback when component mounts or segments change
    handleOAuthCallback();

    // 1. Wait until the session is loaded.
    if (isLoading) {
      console.log('Layout: Still loading session...');
      return;
    }

    // 2. Determine if the user is currently in the main app (tabs) group.
    const inTabsGroup = segments[0] === '(tabs)';
    console.log('Layout: Current segment:', segments[0], 'inTabsGroup:', inTabsGroup);

    // 3. Perform the redirect logic.
    if (session && !inTabsGroup) {
      // User is logged in but is not in the main app area.
      // This happens right after a successful login.
      // Redirect them to the main feed screen.
      console.log('Layout: User authenticated, redirecting to tabs...');
      router.replace('/(tabs)');
    } else if (!session) {
      // User is not logged in.
      // Force them to the authentication screen.
      // This will also handle logout.
      console.log('Layout: No session, redirecting to auth...');
      router.replace('/(auth)');
    } else {
      console.log('Layout: User is authenticated and in tabs, no redirect needed');
    }
  }, [session, isLoading, segments, router]);

  // While checking for a session, show a loading spinner.
  // This prevents a screen flash.
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Once the logic is handled, show the screen that the router has decided on.
  return <Slot />;
};

export default function RootLayout() {
  return (
    <SupabaseProvider>
      <QueryClientProvider client={queryClient}>
        <InitialLayout />
      </QueryClientProvider>
    </SupabaseProvider>
  );
}