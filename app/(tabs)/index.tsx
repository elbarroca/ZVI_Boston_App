// app/(tabs)/index.tsx
import { View, FlatList, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query'; // Assuming this is installed or you can add it
import { getListings } from '@/lib/api';
import ListingCard from '@/components/listingcard';
import { Stack } from 'expo-router';

export default function FeedScreen() {
  // Use TanStack Query to fetch, cache, and manage server state
  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings'],
    queryFn: getListings,
  });

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.center} />;
  }

  if (isError) {
    return <Text style={styles.center}>Failed to fetch listings. Please try again.</Text>;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Find Your Place' }} />
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7', // Light gray background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  separator: {
    height: 16,
  },
});
