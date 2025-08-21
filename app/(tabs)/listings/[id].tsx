// app/(tabs)/listings/[id].tsx
import { ScrollView, Text, ActivityIndicator, StyleSheet, View, Image } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getListingById } from '@/lib/api';

export default function ListingDetailScreen() {
  // Get the 'id' from the URL, e.g., /listings/abc-123
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListingById(id!),
    enabled: !!id, // Only run query if id is available
  });

  if (isLoading) {
    return <ActivityIndicator size="large" style={styles.center} />;
  }

  if (isError || !listing) {
    return <Text style={styles.center}>Listing not found.</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: listing.title }} />

      {/* Basic Image Viewer */}
      <Image source={{ uri: listing.image_urls[0] }} style={styles.image} />

      <View style={styles.content}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>${listing.price_per_month.toLocaleString()}/mo</Text>
        <Text style={styles.address}>{listing.location_address}</Text>

        <View style={styles.statsContainer}>
          <Text>{listing.bedrooms} Beds</Text>
          <Text>·</Text>
          <Text>{listing.bathrooms} Baths</Text>
          {listing.square_feet && <>
            <Text>·</Text>
            <Text>{listing.square_feet} sqft</Text>
          </>}
        </View>

        <Text style={styles.description}>{listing.description}</Text>

        {/* V1: Add "Request a Tour" button here */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 250 },
  content: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontFamily: 'Inter-Bold' },
  price: { fontSize: 22, fontFamily: 'Inter-SemiBold', color: '#00A896' },
  address: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#6B7280' },
  statsContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  description: { fontSize: 16, fontFamily: 'Inter-Regular', lineHeight: 24, marginTop: 10 },
});
