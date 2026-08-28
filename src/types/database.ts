export type BookingStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'information_required'
  | 'alternative_dates_proposed'
  | 'accepted_awaiting_deposit'
  | 'deposit_processing'
  | 'confirmed'
  | 'declined'
  | 'expired'
  | 'cancelled'
  | 'checked_in'
  | 'checked_out'
  | 'no_show';

export type PaymentType = 'deposit' | 'balance' | 'refund';
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';
export type StatusActor = 'guest' | 'admin' | 'system';

export type Booking = {
  id: string;
  reference: string | null;
  guest_name: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string;
  guest_phone: string | null;
  guest_country: string | null;
  check_in: string; // ISO date (YYYY-MM-DD)
  check_out: string;
  nights: number;
  guests_count: number;
  adults_count: number | null;
  children_count: number | null;
  estimated_arrival_time: string | null;
  message: string | null;
  booking_purpose: string | null;
  status: BookingStatus;

  accommodation_subtotal: number | null;
  cleaning_fee_amount: number;
  service_fee_amount: number;
  discount_amount: number;
  security_deposit_amount: number;
  nightly_rate_breakdown: unknown | null;
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
  terms_agreed_at: string | null;
  cancellation_policy_agreed_at: string | null;
  communication_consent_at: string | null;

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
  idempotency_key: string | null;
  admin_note: string | null;
  recorded_by: string | null;
  proof_of_payment_url: string | null;
  refunded_amount: number;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentEvent = {
  id: string;
  booking_id: string | null;
  payment_id: string | null;
  event_type: string;
  provider: string | null;
  actor: StatusActor;
  actor_id: string | null;
  note: string | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
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
      payment_events: {
        Row: PaymentEvent;
        Insert: Partial<PaymentEvent> & Pick<PaymentEvent, 'event_type'>;
        Update: Partial<PaymentEvent>;
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
