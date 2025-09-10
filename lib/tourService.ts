import { supabase } from '@/config/supabase';
import { Session } from '@supabase/supabase-js';

export interface TourRequestData {
  user_id: string;
  listing_id: string;
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
}

export class TourService {
  /**
   * Create a new tour request
   */
  static async createTourRequest(
    listingId: string,
    tourData: {
      dates: string[];
      timeSlots: { time: string; priority: number; date: string }[];
      notes?: string;
      phoneNumber?: string;
      countryCode?: string;
    },
    userId: string
  ): Promise<TourRequest> {
    try {
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

      const tourRequestData: TourRequestData = {
        user_id: userId,
        listing_id: listingId,
        selected_dates: tourData.dates,
        selected_time_slots: tourData.timeSlots,
        contact_phone: contactPhone || undefined,
        contact_method: contactMethod,
        notes: tourData.notes || undefined,
        preferred_times_summary: preferredTimesSummary,
        priority_slot: prioritySlot || undefined,
      };

      const { data, error } = await supabase
        .from('tour_requests')
        .insert([tourRequestData])
        .select()
        .single();

      if (error) {
        console.error('Error creating tour request:', error);
        throw new Error(`Failed to create tour request: ${error.message}`);
      }

      return data as TourRequest;
    } catch (error) {
      console.error('Error in createTourRequest:', error);
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

      return data as TourRequest[];
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

      return data as TourRequest;
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
        .eq('listing_id', listingId)
        .limit(1);

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
   * Get tour requests for a specific listing (for property owners/admins)
   */
  static async getListingTourRequests(listingId: string): Promise<TourRequest[]> {
    try {
      const { data, error } = await supabase
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
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching listing tour requests:', error);
        throw new Error(`Failed to fetch listing tour requests: ${error.message}`);
      }

      return data as TourRequest[];
    } catch (error) {
      console.error('Error in getListingTourRequests:', error);
      throw error;
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
