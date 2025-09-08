// FILE: app/(tabs)/map.tsx
import React from 'react';
import { View, StyleSheet, StatusBar, Pressable } from 'react-native';
import ListingsMapView from '@/components/ListingsMapView';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function MapScreen() {
  const { theme } = useTheme();
  const colors = themeColors[theme];
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Map',
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
              android_ripple={{ color: colors.primary + '20', borderless: true }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          )
        }}
      />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.mapWrapper, { backgroundColor: colors.background }]}>
          <ListingsMapView hideHeader={true} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
});
