// context/supabase-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';
import { Session } from '@supabase/supabase-js';

// Define the context shape
type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
};

// Create the context
const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
});

// Export a custom hook for easy access
export const useSupabaseAuth = () => useContext(AuthContext);

// The provider component itself
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('SupabaseProvider: Initializing...');

    // 1. Check for an initial session
    const loadInitialSession = async () => {
      try {
        console.log('SupabaseProvider: Starting session load...');

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session loading timeout')), 10000); // 10 second timeout
        });

        const sessionPromise = supabase.auth.getSession();
        console.log('SupabaseProvider: Created session promise');

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        console.log('SupabaseProvider: Promise race completed');

        if (error) {
          console.error('SupabaseProvider: Error getting initial session:', error);
          console.error('SupabaseProvider: Error details:', JSON.stringify(error, null, 2));
          setIsLoading(false);
          return;
        }

        console.log('SupabaseProvider: Session loaded successfully, hasSession:', !!session);
        setSession(session);
        setIsLoading(false);
      } catch (error) {
        console.error('SupabaseProvider: Exception getting initial session:', error);
        console.error('SupabaseProvider: Exception details:', JSON.stringify(error, null, 2));
        // Even if there's an error, we should stop loading
        setIsLoading(false);
      }
    };

    loadInitialSession();

    // 2. Listen for any future changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        // Make sure loading is false when auth state changes
        setIsLoading(false);
      }
    );

    // 3. Clean up the subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  const value = {
    session,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
