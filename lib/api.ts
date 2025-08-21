// lib/api.ts
import { supabase } from '@/config/supabase';

// Fetch all active listings for the main feed
export const getListings = async () => {
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, price_per_month, neighborhood, bedrooms, bathrooms, image_urls')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Sanitize the data for the UI, providing a fallback preview image
  return data.map(listing => ({
    ...listing,
    preview_image: listing.image_urls?.[0] || 'https://placehold.co/600x400'
  }));
};

// Fetch a single listing by its ID for the detail page
export const getListingById = async (id: string) => {
  if (!id) return null;

  const { data, error } = await supabase
    .from('listings')
    .select('*') // Get all columns for the detail view
    .eq('id', id)
    .single(); // We expect only one result

  if (error) {
    throw new Error(error.message);
  }
  return data;
};