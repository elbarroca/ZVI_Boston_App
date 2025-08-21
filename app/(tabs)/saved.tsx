// app/(tabs)/saved.tsx
import React from 'react';
import { View, FlatList, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import ListingCard from '@/components/listingcard';
import { Stack } from 'expo-router';
import { getSavedListings } from '@/lib/api';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage } from '@/context/language-provider';

export default function SavedScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const colors = themeColors[theme];

  const { data: listings, isLoading } = useQuery({
    queryKey: ['saved-listings'],
    queryFn: getSavedListings,
  });

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.center} />;
  }

  if (!listings || listings.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary || '#6B7280' }]}>
          {t('youHaventSavedAnyPlacesYet')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('saved'),
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
            color: colors.text
          }
        }}
      />
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16 },
    emptyText: { fontSize: 18, textAlign: 'center', marginHorizontal: 32 },
});
