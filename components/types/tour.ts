export interface PhoneFormat {
  code: string;
  name: string;
  flag: string;
  format: string;
}

export interface PrioritySlot {
  time: string;
  rank: 1 | 2 | 3; // 1 = highest priority, 3 = lowest priority
}

export interface TourRequestData {
  user_id: string;
  listing_id: string;
  preferred_times: string[];
  contact_phone?: string;
  contact_method: 'email' | 'phone' | 'both';
  selected_dates: Date[];
  selected_time_slots: string[];
  priority_slots?: PrioritySlot[];
  notes?: string;
}

export interface TourConfirmationData {
  dates: Date[];
  timeSlots: string[];
  contactMethod: 'email' | 'phone' | 'both';
  phoneNumber?: string;
  notes?: string;
  prioritySlot?: string;
}

export interface TourModalProps {
  visible: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  listingAddress: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  onSubmit: (data: TourRequestData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface TourConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  data: TourConfirmationData | null;
  listingTitle: string;
  listingAddress: string;
  userEmail?: string;
}
