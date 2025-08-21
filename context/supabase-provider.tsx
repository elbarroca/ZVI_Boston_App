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
    // 1. Check for an initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('SupabaseProvider: Initial session loaded', !!session);
      setSession(session);
      setIsLoading(false);
    });

    // 2. Listen for any future changes in auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('SupabaseProvider: Auth state changed', _event, !!session);
        setSession(session);
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
