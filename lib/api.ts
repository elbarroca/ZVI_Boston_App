// lib/api.ts
import { supabase } from '@/config/supabase';
import { validateImageUrl } from '@/lib/utils';
const __DEV__ = process.env.NODE_ENV === 'development';

// Fetch all active listings for the main feed with saved status and filters
export const getListings = async (filters?: {
  minPrice?: string;
  maxPrice?: string;
  beds?: string;
  laundry?: string;
  parking?: boolean;
  pets_allowed?: boolean;
  is_furnished?: boolean;
  utilities_included?: boolean;
  broker_fee_required?: boolean;
}) => {

  let query = supabase
    .from('listings')
    .select(`
      *,
      saved_listings(user_id)
    `) // Also fetch saved status
    .eq('is_active', true);

  // Dynamically build the query based on the filters provided
  if (filters && typeof filters === 'object') {
    if (__DEV__) {
      console.log('=== Building Query Filters ===');
      console.log('Available filters:', Object.keys(filters));
    }

    // Price filters
    if (filters?.minPrice) {
      const minPriceInt = parseInt(filters.minPrice, 10);
      if (__DEV__) console.log('Applying minPrice filter:', minPriceInt);
      query = query.gte('price_per_month', minPriceInt);
    }
    if (filters?.maxPrice) {
      const maxPriceInt = parseInt(filters.maxPrice, 10);
      if (__DEV__) console.log('Applying maxPrice filter:', maxPriceInt);
      query = query.lte('price_per_month', maxPriceInt);
    }

    // Bedroom filters
    if (filters?.beds) {
      if (filters.beds === '4+') {
        query = query.gte('bedrooms', 4);
      } else {
        query = query.eq('bedrooms', parseInt(filters.beds, 10));
      }
    }

    // Laundry filter
    if (filters?.laundry && filters.laundry !== '') {
      query = query.eq('laundry_type', filters.laundry);
    }

    // Parking filter
    if (filters?.parking) {
      query = query.neq('parking_type', 'none');
    }

    // Boolean filters
    if (filters?.pets_allowed !== undefined) {
      query = query.eq('pets_allowed', filters.pets_allowed);
    }
    if (filters?.is_furnished !== undefined) {
      query = query.eq('is_furnished', filters.is_furnished);
    }
    if (filters?.utilities_included !== undefined) {
      query = query.eq('utilities_included', filters.utilities_included);
    }
    if (filters?.broker_fee_required !== undefined) {
      query = query.eq('broker_fee_required', filters.broker_fee_required);
    }

    if (__DEV__) {
      console.log('=== Filter Building Complete ===');
      console.log('All filters processed');
      console.log('========================');
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  // Only log errors to reduce console spam
  if (__DEV__ && error) {
    console.warn('API Query Error:', error);
  }

  if (error) {
    throw new Error(error.message);
  }

  // Get current user for saved status
  const { data: { user } } = await supabase.auth.getUser();

  // Sanitize the data for the UI, providing a fallback preview image
  return data.map(listing => ({
    ...listing,
    preview_image: validateImageUrl(listing.image_urls?.[0]),
    is_saved_by_user: listing.saved_listings.some((save: any) => save.user_id === user?.id),
    // Ensure all fields have default values for the enhanced UI
    square_feet: listing.square_feet || 0,
    property_type: listing.property_type || 'apartment',
    university_proximity_minutes: listing.university_proximity_minutes || 0,
    nearest_university: listing.nearest_university || '',
    laundry_type: listing.laundry_type || 'none',
    parking_type: listing.parking_type || 'none',
    is_furnished: listing.is_furnished || false,
    utilities_included: listing.utilities_included || false,
    pets_allowed: listing.pets_allowed || false,
    // Add mock coordinates for map functionality (replace with real coordinates from database later)
    latitude: listing.latitude || (42.35 + (Math.random() - 0.5) * 0.05), // Boston area with some random variation
    longitude: listing.longitude || (-71.09 + (Math.random() - 0.5) * 0.05),
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

  // Ensure image_urls is always an array
  const result = {
    ...data,
    image_urls: data.image_urls || []
  };

  // Removed verbose debug logging for image URLs to reduce console spam

  return result;
};

// Get listing by slug or ID - tries slug first, then falls back to ID
export const getListingBySlugOrId = async (slugOrId: string) => {
  if (!slugOrId) return null;

  // First try to find by ID (for backward compatibility)
  let { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', slugOrId)
    .single();

  if (__DEV__) {
    console.log('First attempt (by ID):', { data: !!data, error });
  }

  // If found by ID, return it
  if (data && !error) {
    // Ensure image_urls is always an array
    return {
      ...data,
      image_urls: data.image_urls || []
    };
  }

  // If not found by ID, try to find by title slug
  if (__DEV__) {
    console.log('Attempting slug search...');
    console.log('Original slug:', slugOrId);

    // Debug: Let's see what listings contain keywords from our slug
    const debugSlugWords = slugOrId.replace(/-/g, ' ').split(' ').filter(word => word.length > 3);
    console.log('Debug keywords to search:', debugSlugWords);

    if (debugSlugWords.length > 0) {
      const debugQuery = supabase.from('listings').select('title, id').ilike('title', `%${debugSlugWords[0]}%`);
      debugQuery.then(result => {
        console.log(`Debug: Listings containing "${debugSlugWords[0]}":`, result.data?.length || 0);
        if (result.data && result.data.length > 0) {
          result.data.slice(0, 3).forEach(listing => {
            console.log(`  - "${listing.title}" (${listing.id})`);
          });
        }
      });
    }
  }

  // Convert slug to search terms and try multiple approaches
  const searchTerms = slugOrId.replace(/-/g, ' ').split(' ').filter(term => term.length > 2);

  if (__DEV__) {
    console.log('Search terms extracted:', searchTerms);
  }

  // First, try exact title match (most specific)
  let { data: listings, error: slugError } = await supabase
    .from('listings')
    .select('*')
    .eq('title', slugOrId.replace(/-/g, ' '));

  if (__DEV__) {
    console.log('Exact title match result:', { listingsCount: listings?.length, error: slugError });
  }

  // If exact match fails, try case-insensitive title search
  if (!listings || listings.length === 0) {
    if (__DEV__) {
      console.log('Trying case-insensitive title search...');
    }

    const { data: titleListings, error: titleError } = await supabase
      .from('listings')
      .select('*')
      .ilike('title', `%${slugOrId.replace(/-/g, ' ')}%`);

    listings = titleListings;
    slugError = titleError;

    if (__DEV__) {
      console.log('Case-insensitive title search result:', { listingsCount: listings?.length, error: slugError });
    }
  }

  // If still no results, try searching for individual keywords
  if (!listings || listings.length === 0) {
    if (__DEV__) {
      console.log('Trying keyword search...');
    }

    if (searchTerms.length > 0) {
      // Use the most specific search terms first
      const primaryTerm = searchTerms[0];
      const { data: keywordListings, error: keywordError } = await supabase
        .from('listings')
        .select('*')
        .ilike('title', `%${primaryTerm}%`);

      listings = keywordListings;
      slugError = keywordError;

      if (__DEV__) {
        console.log('Keyword search result:', { listingsCount: listings?.length, error: slugError, primaryTerm });
      }
    }
  }

  if (__DEV__) {
    console.log('Final search result:', { listingsCount: listings?.length, error: slugError });
    if (listings && listings.length > 0) {
      console.log('Found listings titles:');
      listings.forEach((listing, index) => {
        console.log(`  ${index + 1}. "${listing.title}" (ID: ${listing.id})`);
      });
    }
  }

  if (slugError) {
    throw new Error(slugError.message);
  }

  // If we found listings, return the first one that matches the slug pattern
  if (listings && listings.length > 0) {
    if (__DEV__) {
      console.log('Found listings, checking for exact slug match...');
    }

    // Try to find exact slug match first
    const exactMatch = listings.find(listing => {
      const listingSlug = listing.title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      return listingSlug === slugOrId;
    });

    if (__DEV__) {
      console.log('Exact match found:', !!exactMatch);
      if (exactMatch) {
        console.log('Exact match ID:', exactMatch.id);
        console.log('Exact match title:', exactMatch.title);
      }
    }

    if (exactMatch) {
      const result = {
        ...exactMatch,
        image_urls: exactMatch.image_urls || []
      };
      if (__DEV__) {
        console.log('Returning exact match result');
      }
      return result;
    }

    // If no exact match, return the first listing as fallback
    if (__DEV__) {
      console.log('No exact match, using first listing as fallback');
      console.log('Fallback listing ID:', listings[0].id);
      console.log('Fallback listing title:', listings[0].title);
    }
    return {
      ...listings[0],
      image_urls: listings[0].image_urls || []
    };
  }

  // If nothing found, throw error
  if (__DEV__) {
    console.log('No listings found, throwing error');
  }
  throw new Error('Listing not found');
};

// Save a listing for a user
export const saveListing = async (userId: string, listingId: string) => {
  const { error } = await supabase
    .from('saved_listings')
    .insert({ user_id: userId, listing_id: listingId });

  if (error) {
    throw new Error(error.message);
  }
};

// Remove a listing from user's saved listings
export const unsaveListing = async (userId: string, listingId: string) => {
  const { error } = await supabase
    .from('saved_listings')
    .delete()
    .match({ user_id: userId, listing_id: listingId });

  if (error) {
    throw new Error(error.message);
  }
};

// Get user's saved listings
export const getSavedListings = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: saved, error: savedError } = await supabase
    .from('saved_listings')
    .select('listing_id')
    .eq('user_id', user.id);

  if (savedError) throw new Error(savedError.message);

  const listingIds = saved.map(s => s.listing_id);

  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .in('id', listingIds);

  if (listingsError) throw new Error(listingsError.message);

  return listings.map(listing => ({
    ...listing,
    preview_image: listing.image_urls?.[0],
    is_saved_by_user: true,
  }));
};

// Create a tour request with enhanced functionality
export const createTourRequest = async (
  userId: string,
  listingId: string,
  options?: {
    notes?: string;
    preferred_times?: string[];
    selected_dates?: Date[];
    selected_time_slots?: string[];
    contact_phone?: string;
    contact_method?: 'email' | 'phone' | 'both';
    preferred_times_summary?: string;
    priority_slot?: string;
  }
) => {
  // Validate required fields
  if (!userId || !listingId) {
    throw new Error('User ID and Listing ID are required');
  }

  // Prepare data for insertion
  // Combine preferred_times_summary with notes if notes exist
  const combinedSummary = options?.notes
    ? `${options.preferred_times_summary || ''}\n\n📝 Notes: ${options.notes}`.trim()
    : options?.preferred_times_summary || null;

  const insertData = {
    user_id: userId,
    listing_id: listingId,
    preferred_times: options?.preferred_times || null,
    selected_dates: options?.selected_dates || null,
    selected_time_slots: options?.selected_time_slots || null,
    contact_phone: options?.contact_phone || null,
    contact_method: options?.contact_method || 'email',
    preferred_times_summary: combinedSummary,
    notes: options?.notes || null,
    priority_slot: options?.priority_slot || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('💾 Saving tour request to database:', insertData);

  const { data, error } = await supabase
    .from('tour_requests')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('❌ Database error creating tour request:', error);
    throw new Error(`Failed to save tour request: ${error.message}`);
  }

  console.log('✅ Tour request saved successfully:', data);
  return data;
};

// Test database connection and tour requests table
export const testTourRequestDatabase = async () => {
  try {
    console.log('🧪 Testing database connection and tour_requests table...');

    // Test basic connection
    const { data: testData, error: connectionError } = await supabase
      .from('tour_requests')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.error('❌ Database connection test failed:', connectionError);
      return { success: false, error: connectionError.message };
    }

    console.log('✅ Database connection successful. Tour requests count:', testData);

    // Test table schema by inserting a test record (then deleting it)
    // Using valid UUID format for testing
    const testUserId = '550e8400-e29b-41d4-a716-446655440000';
    const testListingId = '550e8400-e29b-41d4-a716-446655440001';

    const testRecord = {
      user_id: testUserId,
      listing_id: testListingId,
      selected_dates: [new Date().toISOString()],
      selected_time_slots: ['2:00 PM'],
      contact_method: 'email' as const,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data: insertData, error: insertError } = await supabase
      .from('tour_requests')
      .insert(testRecord)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database schema test failed:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('✅ Database schema test successful:', insertData);

    // Clean up test record
    const { error: deleteError } = await supabase
      .from('tour_requests')
      .delete()
      .eq('user_id', testUserId)
      .eq('listing_id', testListingId);

    if (deleteError) {
      console.warn('⚠️ Failed to clean up test record:', deleteError);
    } else {
      console.log('🧹 Test record cleaned up successfully');
    }

    return { success: true, message: 'Database test completed successfully' };
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Update user profile with phone number
export const updateUserProfile = async (userId: string, updates: { phone_number?: string; full_name?: string }) => {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }
};

// Get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, phone_number')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// Check if user already has an active tour request for a specific listing
export const checkExistingTourRequest = async (userId: string, listingId: string) => {
  const { data, error } = await supabase
    .from('tour_requests')
    .select('id, status, created_at')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .in('status', ['pending', 'confirmed', 'scheduled']) // Only check for active tours
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
    throw new Error(error.message);
  }

  return data || null;
};

// Enhanced tour request creation with double booking prevention
export const createTourRequestWithValidation = async (
  userId: string,
  listingId: string,
  options?: {
    notes?: string;
    preferred_times?: string[];
    selected_dates?: Date[];
    selected_time_slots?: string[];
    contact_phone?: string;
    contact_method?: 'email' | 'phone' | 'both';
    preferred_times_summary?: string;
    priority_slot?: string;
  }
) => {
  // Validate required fields
  if (!userId || !listingId) {
    throw new Error('User ID and Listing ID are required');
  }

  // Check for existing tour requests
  const existingTour = await checkExistingTourRequest(userId, listingId);
  if (existingTour) {
    const tourDate = new Date(existingTour.created_at).toLocaleDateString();
    throw new Error(`You already have a tour request for this property submitted on ${tourDate}. Please wait for a response before requesting another tour.`);
  }

  // If no existing tour, proceed with creation
  return await createTourRequest(userId, listingId, options);
};