import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export interface CalendarEvent {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  timeZone?: string;
}

export class CalendarService {
  private static calendarId: string | null = null;

  /**
   * Request calendar permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  /**
   * Get or create a calendar for ZVI app events
   */
  static async getOrCreateCalendar(): Promise<string | null> {
    try {
      if (this.calendarId) {
        return this.calendarId;
      }

      // Get all calendars
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

      // Look for existing ZVI calendar
      const existingCalendar = calendars.find(cal =>
        cal.title === 'ZVI Property Tours' && cal.source.name === 'ZVI App'
      );

      if (existingCalendar) {
        this.calendarId = existingCalendar.id;
        return this.calendarId;
      }

      // Create new calendar if it doesn't exist
      const defaultCalendarSource = calendars.find(cal => cal.source.name === 'Default');

      if (!defaultCalendarSource) {
        console.warn('No default calendar source found');
        return null;
      }

      const newCalendarId = await Calendar.createCalendarAsync({
        title: 'ZVI Property Tours',
        color: '#1570ef',
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: defaultCalendarSource.source.id,
        source: defaultCalendarSource.source,
        name: 'ZVI App',
        ownerAccount: 'ZVI',
        accessLevel: Calendar.CalendarAccessLevel.OWNER,
      });

      this.calendarId = newCalendarId;
      return newCalendarId;
    } catch (error) {
      console.error('Error getting/creating calendar:', error);
      return null;
    }
  }

  /**
   * Add a tour event to the calendar
   */
  static async addTourEvent(event: CalendarEvent): Promise<string | null> {
    try {
      const calendarId = await this.getOrCreateCalendar();
      if (!calendarId) {
        throw new Error('Could not access calendar');
      }

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        notes: event.notes,
        timeZone: event.timeZone || 'America/New_York',
        alarms: [{
          relativeOffset: -60, // 1 hour before
          method: Calendar.AlarmMethod.ALERT
        }],
      });

      return eventId;
    } catch (error) {
      console.error('Error adding tour event to calendar:', error);
      return null;
    }
  }

  /**
   * Update an existing calendar event
   */
  static async updateTourEvent(eventId: string, event: Partial<CalendarEvent>): Promise<boolean> {
    try {
      await Calendar.updateEventAsync(eventId, {
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        notes: event.notes,
        timeZone: event.timeZone,
      });
      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  }

  /**
   * Delete a calendar event
   */
  static async deleteTourEvent(eventId: string): Promise<boolean> {
    try {
      await Calendar.deleteEventAsync(eventId);
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }

  /**
   * Create calendar event data from tour request
   */
  static createTourEventData(
    listingAddress: string,
    tourDate: string,
    tourTime: string,
    contactPhone?: string,
    notes?: string
  ): CalendarEvent {
    const startDate = new Date(`${tourDate}T${tourTime}`);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

    return {
      title: `🏠 ZVI Property Tour - ${listingAddress}`,
      startDate,
      endDate,
      location: listingAddress,
      notes: `Property tour scheduled with ZVI\n\n${notes || ''}\n\nContact: ${contactPhone || 'Contact info will be provided'}`,
      timeZone: 'America/New_York',
    };
  }
}
