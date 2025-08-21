// app/(auth)/index.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useGoogleSignIn, signInWithEmail, signUpWithEmail } from '@/lib/auth'; // Centralize auth functions

// You can download a Google logo SVG and put it in your assets folder
// For now, let's use a placeholder URI
const GOOGLE_ICON_URI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbD1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMTcuNiA5LjJsLS4xLTEuOEg5djMuNGg0LjhDMTMuNiAxMiAxMyAxMyAxMiAxMy42djIuNmgzLjFjMS44LTEuNyAyLjgtNCAyLjgtNi40eiIgZmlsbD0iIzQyODVGNCIgZmlsbD1ydWxlPSJub256ZXJvIi8+PHBhdGggZD0iTTkgMThjMi40IDAgNC41LS44IDYtMi4xbC0zLjEtMi42Yy0uOC41LTEuOC45LTMgLjktMi4yIDAtNC0xLjUtNC43LTMuNUgxbDIuMSA0LjZjMS4yIDIuOCA0LjEgNC44IDcuMSA0Ljh6IiBmaWxsPSIjMzRBODUzIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNNCAxMC43YzAtLjYgMC0xLjEuMS0xLjZoLTNWN2MtLjQgMS0uNiAyLS42IDN2LjVjMCAxIC4yIDIgLjYgMyAwIC4xIDIuMi0xLjYgMi4yLTEuNnoiIGZpbGw9IiNGQkJDMDQiIGZpbGwtcnVsZT0ibm9uemVybyIvPjxwYXRoIGQ9Ik05IDMuNmMxLjMgMCAyLjMtLjUgMy0xLjRsMi43LTIuN0MxMy41LjYgMTEuNSAwIDkgMGMzIDAgNS44IDIgNy4xIDQuOGwtMy4yIDIuNmMtLjctMi0yLjUtMy41LTQuOC0zLjV6IiBmaWxsPSIjRUE0MzM1IiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNMCAwaDE4djE4SDB6Ii8+PC9nPjwvc3ZnPg==';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const { signInWithGoogle } = useGoogleSignIn();

  const handleEmailAuth = async () => {
    const action = isSignUp ? signUpWithEmail : signInWithEmail;
    const { error } = await action(email, password);
    if (error) {
      Alert.alert(error.message);
    } else if (isSignUp) {
      Alert.alert("Success!", "Please check your email for confirmation.");
    } else {
      // For sign-in, explicitly navigate to tabs after successful auth
      console.log('Email sign-in successful, navigating to tabs...');
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>ZVI</Text>
        <Text style={styles.subHeader}>
          {isSignUp ? 'Create your account to get started.' : 'Welcome back. Find your place.'}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Pressable
          style={({ pressed, hovered }) => [
            styles.button,
            styles.googleButton,
            (hovered) && styles.googleButtonHovered,
            pressed && styles.buttonPressed,
          ]}
          onPress={async () => {
            console.log('Starting Google sign-in...');
            const result = await signInWithGoogle();
            if (result) {
              console.log('Google sign-in initiated, session will be handled by layout...');
              // For OAuth, don't navigate explicitly - let the layout handle it
              // The session will be detected from URL parameters
            }
          }}
        >
          <Image source={{ uri: GOOGLE_ICON_URI }} style={styles.icon} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        <Text style={styles.orText}>or</Text>

        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        <Pressable
          style={({ pressed, hovered }) => [
            styles.button,
            styles.emailButton,
            (hovered) && styles.emailButtonHovered,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleEmailAuth}
        >
          <Text style={styles.emailButtonText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
        </Pressable>

        <Pressable onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.footerText}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text style={styles.linkText}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  headerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  formContainer: { flex: 1, justifyContent: 'flex-start', alignItems: 'center', width: '100%' },
  header: { fontSize: 48, fontWeight: 'bold', color: '#1A1A1A' },
  subHeader: { fontSize: 18, color: '#6B7280', marginTop: 8, maxWidth: 250, textAlign: 'center' },
  input: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, width: '100%', borderWidth: 1, borderColor: '#E5E7EB' },
  button: { flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '100%', transitionDuration: '300ms' },
  buttonPressed: { opacity: 0.8 },
  googleButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  googleButtonHovered: { backgroundColor: '#F9FAFB' },
  googleButtonText: { color: '#374151', fontSize: 16, fontWeight: '600', marginLeft: 12 },
  emailButton: { backgroundColor: '#00A896' },
  emailButtonHovered: { backgroundColor: '#008778' },
  emailButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  icon: { width: 18, height: 18 },
  orText: { color: '#6B7280', textAlign: 'center', marginVertical: 24 },
  footerText: { marginTop: 24, textAlign: 'center', color: '#6B7280' },
  linkText: { color: '#00A896', fontWeight: '600' },
});
