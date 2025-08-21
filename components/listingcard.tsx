// components/listings/ListingCard.tsx
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { colors } from '@/constants/colors'; // Assuming colors are in constants

// Define the type for the listing prop for strong type safety
export type Listing = {
  id: string;
  title: string;
  price_per_month: number;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  preview_image: string;
};

export default function ListingCard({ listing }: { listing: Listing }) {
  return (
    // Use Link to handle navigation. The `href` matches our file structure.
    <Link href={`/(tabs)/listings/${listing.id}`} asChild>
      <Pressable style={styles.card}>
        <Image source={{ uri: listing.preview_image }} style={styles.image} />
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>{listing.title}</Text>
          <Text style={styles.price}>${listing.price_per_month.toLocaleString()}/mo</Text>
          <Text style={styles.details}>
            {listing.bedrooms} Bed · {listing.bathrooms} Bath · {listing.neighborhood}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

// Gen Z-inspired styling: clean, rounded, with a pop of color
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: 200,
  },
  infoContainer: {
    padding: 16,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold', // Assuming you'll add Inter font
    color: '#1A1A1A',
  },
  price: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#00A896', // Our vibrant teal
  },
  details: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});