// FILE: app/(tabs)/map.tsx
import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import ListingsMapView from '@/components/ListingsMapView';
import { Stack } from 'expo-router';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';

export default function MapScreen() {
  const { theme } = useTheme();
  const colors = themeColors[theme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.mapWrapper, { backgroundColor: colors.background }]}>
        <ListingsMapView />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
  },
});
