export type BookingStatus =
  | 'pending_review'
  | 'info_requested'
  | 'dates_proposed'
  | 'accepted'
  | 'deposit_paid'
  | 'confirmed'
  | 'balance_paid'
  | 'declined'
  | 'expired'
  | 'cancelled';

export type PaymentType = 'deposit' | 'balance';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type StatusActor = 'guest' | 'admin' | 'system';

export type Booking = {
  id: string;
  reference: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  check_in: string; // ISO date (YYYY-MM-DD)
  check_out: string;
  nights: number;
  guests_count: number;
  adults_count: number | null;
  children_count: number | null;
  message: string | null;
  status: BookingStatus;

  total_amount: number;
  deposit_amount: number;
  balance_amount: number;
  currency: string;

  deposit_paid_at: string | null;
  balance_paid_at: string | null;
  balance_marked_paid_by: string | null;

  admin_notes: string | null;
  decline_reason: string | null;
  info_request_message: string | null;
  proposed_check_in: string | null;
  proposed_check_out: string | null;

  hold_expires_at: string | null;
  payment_token: string | null;
  policy_agreed_at: string | null;

  created_at: string;
  updated_at: string;
}

export type BlockedDateRange = {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export type BookingStatusHistoryEntry = {
  id: string;
  booking_id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  actor: StatusActor;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

export type Payment = {
  id: string;
  booking_id: string;
  type: PaymentType;
  provider: string;
  provider_reference: string | null;
  amount: number;
  status: PaymentStatus;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type Profile = {
  id: string;
  email: string;
  role: 'admin';
  created_at: string;
}

export type UnavailableRange = {
  start_date: string;
  end_date: string;
  status: string;
}

/** Minimal typed shape for the Supabase generated Database type. */
export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: Booking;
        Insert: Partial<Booking> &
          Pick<Booking, 'guest_name' | 'guest_email' | 'check_in' | 'check_out'>;
        Update: Partial<Booking>;
        Relationships: [];
      };
      blocked_dates: {
        Row: BlockedDateRange;
        Insert: Partial<BlockedDateRange> & Pick<BlockedDateRange, 'start_date' | 'end_date'>;
        Update: Partial<BlockedDateRange>;
        Relationships: [];
      };
      booking_status_history: {
        Row: BookingStatusHistoryEntry;
        Insert: Partial<BookingStatusHistoryEntry> &
          Pick<BookingStatusHistoryEntry, 'booking_id' | 'to_status' | 'actor'>;
        Update: Partial<BookingStatusHistoryEntry>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment> & Pick<Payment, 'booking_id' | 'type' | 'provider' | 'amount'>;
        Update: Partial<Payment>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, 'id' | 'email'>;
        Update: Partial<Profile>;
        Relationships: [];
      };
    };
    Views: {
      public_unavailable_ranges: {
        Row: UnavailableRange;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
  };
}
