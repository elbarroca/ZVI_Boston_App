// app/auth/callback.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/config/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // For Supabase PKCE flow, we need to handle the authorization code
        const { code, error, error_description } = params;

        if (error) {
          console.error('OAuth error:', error, error_description);
          router.replace('/(auth)');
          return;
        }

        if (code) {
          // Exchange the authorization code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code as string);

          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            router.replace('/(auth)');
            return;
          }

          if (data.session) {
            // Navigate to main app on successful authentication
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)');
          }
          return;
        }

        // Fallback: check if a session was already established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          router.replace('/(auth)');
        } else if (session) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        router.replace('/(auth)');
      }
    };

    handleCallback();
  }, [params, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}