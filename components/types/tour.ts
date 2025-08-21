export interface PhoneFormat {
  code: string;
  name: string;
  flag: string;
  format: string;
}

export interface TourRequestData {
  user_id: string;
  listing_id: string;
  preferred_times: string[];
  contact_phone?: string;
  contact_method: 'email' | 'phone' | 'both';
  selected_dates: Date[];
  selected_time_slots: string[];
  notes?: string;
}

export interface TourConfirmationData {
  dates: Date[];
  timeSlots: string[];
  contactMethod: 'email' | 'phone' | 'both';
  phoneNumber?: string;
  notes?: string;
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
