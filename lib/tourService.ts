import { supabase } from '@/config/supabase';
import { Session } from '@supabase/supabase-js';

export interface TourRequestData {
  user_id: string;
  listing_id: string;
  additional_listing_ids?: string[] | any; // Can be string[] from frontend or any from database
  selected_dates: string[];
  selected_time_slots: { time: string; priority: number; date: string }[];
  contact_phone?: string;
  contact_method: 'email' | 'phone' | 'both';
  notes?: string;
  preferred_times_summary?: string;
  priority_slot?: string;
}

export interface TourRequest extends TourRequestData {
  id: number;
  created_at: string;
  status: 'pending' | 'confirmed' | 'contacted' | 'completed' | 'cancelled';
  updated_at?: string;
  status_message?: string;
  additional_listing_ids?: string[];
}

export class TourService {
  /**
   * Helper function to convert string array to jsonb for database
   */
  private static arrayToJsonb(arr: string[]): any {
    console.log('🔄 Converting array to JSONB:', arr);
    const result = JSON.parse(JSON.stringify(arr));
    console.log('🔄 JSONB result:', result);
    return result;
  }

  /**
   * Helper function to convert jsonb to string array for frontend
   */
  private static jsonbToArray(jsonb: any): string[] {
    if (!jsonb) return [];
    if (Array.isArray(jsonb)) return jsonb;
    if (typeof jsonb === 'string') {
      try {
        const parsed = JSON.parse(jsonb);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Create a new tour request
   */
  static async createTourRequest(
    listingIds: string[], // Array of listing IDs
    tourData: {
      dates: string[];
      timeSlots: { time: string; priority: number; date: string }[];
      notes?: string;
      phoneNumber?: string;
      countryCode?: string;
    },
    userId: string
  ): Promise<TourRequest> {
    console.log('🏁 Starting createTourRequest method');
    console.log('📋 Input parameters:', {
      listingIds,
      tourData,
      userId
    });

    try {
      if (listingIds.length === 0) {
        console.error('❌ No listing IDs provided');
        throw new Error('At least one listing ID is required');
      }

      // Use the first listing as the main listing_id
      const mainListingId = listingIds[0];
      console.log('🏠 Main listing ID:', mainListingId);

      // Validate UUID format for main listing ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(mainListingId)) {
        console.error('❌ Invalid UUID format for main listing ID:', mainListingId);
        throw new Error('Invalid listing ID format');
      }

      // Validate UUID format for user ID
      if (!uuidRegex.test(userId)) {
        console.error('❌ Invalid UUID format for user ID:', userId);
        throw new Error('Invalid user ID format');
      }

      console.log('✅ UUID formats validated');

      // Store additional listings in the additional_listing_ids field
      const additionalListingIds = listingIds.length > 1 ? listingIds.slice(1) : [];
      console.log('📋 Additional listing IDs:', additionalListingIds);

      // Validate UUID format for additional listing IDs
      for (const id of additionalListingIds) {
        if (!uuidRegex.test(id)) {
          console.error('❌ Invalid UUID format for additional listing ID:', id);
          throw new Error('Invalid additional listing ID format');
        }
      }

      console.log('✅ All UUID formats validated');

      // Determine contact method
      const contactMethod = tourData.phoneNumber ? 'both' : 'email';
      const contactPhone = tourData.phoneNumber ? `${tourData.countryCode}${tourData.phoneNumber}` : null;

      // Create preferred times summary with dates
      const preferredTimesSummary = tourData.timeSlots
        .sort((a, b) => a.priority - b.priority)
        .map(slot => `${slot.priority}. ${slot.date} at ${slot.time}`)
        .join(', ');

      // Find the highest priority slot (including date info)
      const prioritySlot = tourData.timeSlots.length > 0
        ? tourData.timeSlots.sort((a, b) => a.priority - b.priority)[0].time
        : null;

      const tourRequestData = {
        user_id: userId,
        listing_id: mainListingId,
        additional_listing_ids: this.arrayToJsonb(additionalListingIds),
        selected_dates: tourData.dates,
        selected_time_slots: tourData.timeSlots,
        contact_phone: contactPhone || undefined,
        contact_method: contactMethod,
        notes: tourData.notes || undefined,
        preferred_times_summary: preferredTimesSummary,
        priority_slot: prioritySlot || undefined,
      };

      console.log('📤 Data to insert into tour_requests:', JSON.stringify(tourRequestData, null, 2));

      const { data, error } = await supabase
        .from('tour_requests')
        .insert([tourRequestData])
        .select()
        .single();

      console.log('📥 Database response:', { data, error });

      if (error) {
        console.error('❌ Error creating tour request:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);

        // Handle specific foreign key constraint errors
        if (error.code === '23503') { // Foreign key violation
          console.error('🔗 Foreign key constraint violation detected');
          if (error.message.includes('listing_id')) {
            console.error('🏠 Listing ID foreign key violation');
            throw new Error('The selected property no longer exists. Please refresh the page and try again.');
          } else if (error.message.includes('user_id')) {
            console.error('👤 User ID foreign key violation');
            throw new Error('Your account information is invalid. Please try logging out and logging back in.');
          }
          console.error('❓ Unknown foreign key violation:', error.message);
        }

        // Handle duplicate key errors
        if (error.code === '23505') { // Unique violation
          console.error('🔄 Unique constraint violation detected');
          throw new Error('You have already requested a tour for this property.');
        }

        throw new Error(`Failed to create tour request: ${error.message}`);
      }

      console.log('✅ Tour request created successfully:', data);

      return data as TourRequest;
    } catch (error) {
      console.error('❌ Error in createTourRequest method:', error);
      console.error('❌ Error type:', typeof error);
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * Get tour requests for a user
   */
  static async getUserTourRequests(userId: string): Promise<TourRequest[]> {
    try {
      const { data, error } = await supabase
        .from('tour_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user tour requests:', error);
        throw new Error(`Failed to fetch tour requests: ${error.message}`);
      }

      // Convert jsonb additional_listing_ids back to arrays for frontend
      return (data || []).map(request => ({
        ...request,
        additional_listing_ids: this.jsonbToArray(request.additional_listing_ids)
      })) as TourRequest[];
    } catch (error) {
      console.error('Error in getUserTourRequests:', error);
      throw error;
    }
  }

  /**
   * Get a specific tour request by ID
   */
  static async getTourRequest(tourRequestId: number): Promise<TourRequest | null> {
    try {
      const { data, error } = await supabase
        .from('tour_requests')
        .select('*')
        .eq('id', tourRequestId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching tour request:', error);
        throw new Error(`Failed to fetch tour request: ${error.message}`);
      }

      // Convert jsonb additional_listing_ids back to array for frontend
      return {
        ...data,
        additional_listing_ids: this.jsonbToArray(data.additional_listing_ids)
      } as TourRequest;
    } catch (error) {
      console.error('Error in getTourRequest:', error);
      throw error;
    }
  }

  /**
   * Update tour request status
   */
  static async updateTourRequestStatus(
    tourRequestId: number,
    status: TourRequest['status'],
    statusMessage?: string
  ): Promise<TourRequest> {
    try {
      const updateData: Partial<TourRequest> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (statusMessage) {
        updateData.status_message = statusMessage;
      }

      const { data, error } = await supabase
        .from('tour_requests')
        .update(updateData)
        .eq('id', tourRequestId)
        .select()
        .single();

      if (error) {
        console.error('Error updating tour request status:', error);
        throw new Error(`Failed to update tour request status: ${error.message}`);
      }

      return data as TourRequest;
    } catch (error) {
      console.error('Error in updateTourRequestStatus:', error);
      throw error;
    }
  }

  /**
   * Delete a tour request
   */
  static async deleteTourRequest(tourRequestId: number, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tour_requests')
        .delete()
        .eq('id', tourRequestId)
        .eq('user_id', userId); // Ensure user can only delete their own requests

      if (error) {
        console.error('Error deleting tour request:', error);
        throw new Error(`Failed to delete tour request: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteTourRequest:', error);
      throw error;
    }
  }

  /**
   * Check if a user has already requested a tour for a specific listing
   */
  static async hasUserRequestedTourForListing(userId: string, listingId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('tour_requests')
        .select('id')
        .eq('user_id', userId)
        .eq('listing_id', listingId); // Use single listing_id field

      if (error) {
        console.error('Error checking existing tour request:', error);
        throw new Error(`Failed to check existing tour request: ${error.message}`);
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error in hasUserRequestedTourForListing:', error);
      throw error;
    }
  }

  /**
   * Check if a user has already requested tours for any of the provided listing IDs
   */
  static async hasUserRequestedTourForListings(userId: string, listingIds: string[]): Promise<boolean> {
    try {
      // Get all tour requests for this user
      const { data: userTours, error } = await supabase
        .from('tour_requests')
        .select('id, listing_id, additional_listing_ids')
        .eq('user_id', userId);

      if (error) {
        console.error('Error checking existing tour requests:', error);
        throw new Error(`Failed to check existing tour requests: ${error.message}`);
      }

      if (!userTours || userTours.length === 0) {
        return false;
      }

      // Check if any of the provided listing IDs are already in existing tour requests
      for (const tour of userTours) {
        const allTourListingIds = [tour.listing_id, ...(tour.additional_listing_ids || [])];
        if (listingIds.some(listingId => allTourListingIds.includes(listingId))) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error in hasUserRequestedTourForListings:', error);
      throw error;
    }
  }

  /**
   * Get tour requests for a specific listing (for property owners/admins)
   */
  static async getListingTourRequests(listingId: string): Promise<TourRequest[]> {
    try {
      // First, try to get requests where this listing is the main listing
      const { data: mainRequests, error: mainError } = await supabase
        .from('tour_requests')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .eq('listing_id', listingId);

      if (mainError) {
        console.error('Error fetching main listing tour requests:', mainError);
        throw new Error(`Failed to fetch main listing tour requests: ${mainError.message}`);
      }

      // Get additional requests by manually filtering tour_requests table
      const { data: additionalData, error: additionalError } = await supabase
        .from('tour_requests')
        .select(`
          *,
          profiles:user_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .not('additional_listing_ids', 'is', null);

      let additionalRequests: any[] = [];
      if (!additionalError && additionalData) {
        // Filter manually to find requests that contain this listing ID
        additionalRequests = additionalData.filter(request =>
          request.additional_listing_ids &&
          this.jsonbToArray(request.additional_listing_ids).includes(listingId) &&
          request.listing_id !== listingId // Avoid duplicates
        );
      }

      // Combine results and remove duplicates
      const allRequests = [...(mainRequests || [])];

      // Add additional requests that aren't already in the main requests
      if (additionalRequests && additionalRequests.length > 0) {
        const mainRequestIds = new Set(allRequests.map(r => r.id));
        for (const req of additionalRequests) {
          if (!mainRequestIds.has(req.id)) {
            allRequests.push(req);
          }
        }
      }

      // Convert jsonb additional_listing_ids back to arrays for frontend and sort by creation date (newest first)
      return allRequests.map(request => ({
        ...request,
        additional_listing_ids: this.jsonbToArray(request.additional_listing_ids)
      })).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error in getListingTourRequests:', error);
      throw error;
    }
  }

  /**
   * Get all listing IDs that a user has already requested tours for
   * This helps filter out already requested listings from multiple selection
   */
  static async getAlreadyRequestedListingIds(userId: string): Promise<string[]> {
    try {
      // Get all tour requests for this user
      const { data: userTours, error } = await supabase
        .from('tour_requests')
        .select('id, listing_id, additional_listing_ids')
        .eq('user_id', userId)
        .in('status', ['pending', 'confirmed', 'contacted']); // Include active statuses

      if (error) {
        console.error('Error getting already requested listing IDs:', error);
        return [];
      }

      if (!userTours || userTours.length === 0) {
        return [];
      }

      const requestedListingIds = new Set<string>();

      // Collect all listing IDs from existing tour requests
      for (const tour of userTours) {
        requestedListingIds.add(tour.listing_id);
        const additionalIds = this.jsonbToArray(tour.additional_listing_ids);
        additionalIds.forEach(id => requestedListingIds.add(id));
      }

      return Array.from(requestedListingIds);
    } catch (error) {
      console.error('Error in getAlreadyRequestedListingIds:', error);
      return [];
    }
  }

  /**
   * Check for potential time slot conflicts for a user on specific dates
   * This helps prevent double-booking tours on the same day/time
   */
  static async checkTimeSlotConflicts(
    userId: string,
    requestedTimeSlots: { time: string; date: string }[],
    excludeTourRequestId?: number
  ): Promise<{
    hasConflicts: boolean;
    conflictingSlots: { date: string; time: string; existingTourId: number }[];
  }> {
    try {
      // Get all active tour requests for this user
      let query = supabase
        .from('tour_requests')
        .select('id, selected_time_slots, selected_dates')
        .eq('user_id', userId)
        .in('status', ['pending', 'confirmed']);

      if (excludeTourRequestId) {
        query = query.neq('id', excludeTourRequestId);
      }

      const { data: existingTours, error } = await query;

      if (error) {
        console.error('Error fetching existing tours for conflict check:', error);
        throw new Error(`Failed to check time conflicts: ${error.message}`);
      }

      const conflictingSlots: { date: string; time: string; existingTourId: number }[] = [];

      // Check each requested time slot against existing tours
      for (const requestedSlot of requestedTimeSlots) {
        for (const existingTour of existingTours || []) {
          // Check if the requested date exists in the existing tour dates
          if (existingTour.selected_dates.includes(requestedSlot.date)) {
            // Check if the requested time slot conflicts with any existing time slot
            const existingTimeSlots = existingTour.selected_time_slots || [];
            const hasTimeConflict = existingTimeSlots.some((existingSlot: { time: string; date: string }) =>
              existingSlot.date === requestedSlot.date &&
              existingSlot.time === requestedSlot.time
            );

            if (hasTimeConflict) {
              conflictingSlots.push({
                date: requestedSlot.date,
                time: requestedSlot.time,
                existingTourId: existingTour.id
              });
            }
          }
        }
      }

      return {
        hasConflicts: conflictingSlots.length > 0,
        conflictingSlots
      };
    } catch (error) {
      console.error('Error in checkTimeSlotConflicts:', error);
      throw error;
    }
  }

  /**
   * Get pending tour requests that need response within 24 hours
   * This helps with the response system mentioned in briefing
   */
  static async getPendingToursNeedingResponse(hoursThreshold: number = 24): Promise<TourRequest[]> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);

      const { data, error } = await supabase
        .from('tour_requests')
        .select('*')
        .eq('status', 'pending')
        .lt('created_at', thresholdDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending tours needing response:', error);
        throw new Error(`Failed to fetch pending tours: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPendingToursNeedingResponse:', error);
      throw error;
    }
  }

  /**
   * Mark a tour request as needing urgent response
   * This can be used to flag tours that are approaching the 24-hour deadline
   */
  static async markTourAsNeedingResponse(tourRequestId: number): Promise<TourRequest> {
    try {
      const { data, error } = await supabase
        .from('tour_requests')
        .update({
          status_message: 'Urgent: Response needed within 24 hours',
          updated_at: new Date().toISOString()
        })
        .eq('id', tourRequestId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        console.error('Error marking tour as needing response:', error);
        throw new Error(`Failed to mark tour as needing response: ${error.message}`);
      }

      return data as TourRequest;
    } catch (error) {
      console.error('Error in markTourAsNeedingResponse:', error);
      throw error;
    }
  }
}
