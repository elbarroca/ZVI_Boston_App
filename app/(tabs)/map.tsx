// FILE: app/(tabs)/map.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import ListingsMapView from '@/components/ListingsMapView';
import { Stack } from 'expo-router';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <ListingsMapView />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
