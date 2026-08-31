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
  tax_amount: number;
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
  privacy_policy_agreed_at: string | null;
  communication_consent_at: string | null;
  policy_version: string | null;

  deposit_reminder_sent_at: string | null;
  deposit_deadline_warning_sent_at: string | null;
  balance_reminder_sent_at: string | null;
  pre_arrival_sent_at: string | null;
  check_in_instructions_sent_at: string | null;
  check_out_reminder_sent_at: string | null;
  thank_you_sent_at: string | null;
  review_request_sent_at: string | null;

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

export type ProfileRole = 'admin' | 'staff';

export type Profile = {
  id: string;
  email: string;
  role: ProfileRole;
  created_at: string;
}

export type UnavailableRange = {
  start_date: string;
  end_date: string;
  status: string;
}

export type AdminAuditLogEntry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  record_type: string;
  record_id: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export type LoginAttempt = {
  id: string;
  email: string;
  success: boolean;
  ip: string | null;
  created_at: string;
}

export type Settings = {
  id: true;
  property_name: string;
  currency: string;
  time_zone: string;

  default_nightly_rate: number;
  weekend_nightly_rate: number | null;
  deposit_percentage: number;

  min_nights: number;
  max_nights: number;
  guest_capacity: number;

  lead_time_hours: number;
  same_day_booking_enabled: boolean;
  max_advance_booking_days: number;
  hold_period_hours: number;

  tax_rate_percent: number;
  cleaning_fee: number;
  service_fee: number;
  security_deposit: number;

  payment_deadline_hours: number;
  balance_payment_deadline_days: number;
  cancellation_policy: string;

  admin_notification_email: string;
  check_in_time: string;
  check_out_time: string;

  ga4_measurement_id: string | null;
  gtm_container_id: string | null;
  clarity_project_id: string | null;
  fb_pixel_id: string | null;
  gsc_verification_code: string | null;
  google_business_profile_url: string | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  service_area: string | null;
  default_og_image_url: string | null;

  updated_at: string;
  updated_by: string | null;
}

export type PageSeoOverride = {
  path: string;
  title: string | null;
  description: string | null;
  canonical_path: string | null;
  og_image_url: string | null;
  noindex: boolean;
  updated_at: string;
  updated_by: string | null;
}

export type RedirectStatusCode = 301 | 302 | 307 | 308;

export type Redirect = {
  id: string;
  from_path: string;
  to_path: string;
  status_code: RedirectStatusCode;
  created_at: string;
  created_by: string | null;
}

export type BlogPostStatus = 'draft' | 'scheduled' | 'published';
export type BlogSchemaType = 'BlogPosting' | 'Article' | 'NewsArticle';

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  category: string | null;
  tags: string[];
  status: BlogPostStatus;
  published_at: string | null;
  author_id: string | null;
  author_name: string | null;
  meta_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  social_image_url: string | null;
  schema_type: BlogSchemaType;
  created_at: string;
  updated_at: string;
}

export type AnalyticsEvent = {
  id: string;
  event_type: string;
  booking_id: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type DateRateOverride = {
  id: string;
  start_date: string;
  end_date: string;
  label: string | null;
  nightly_rate: number | null;
  min_nights: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ContentSection = {
  key: string;
  value: unknown;
  updated_at: string;
  updated_by: string | null;
}

export type GuestCommunicationChannel = 'email' | 'phone' | 'whatsapp' | 'sms' | 'in_person' | 'other';

export type GuestCommunication = {
  id: string;
  booking_id: string;
  channel: GuestCommunicationChannel;
  direction: 'outbound' | 'inbound';
  summary: string;
  logged_by: string | null;
  created_at: string;
}

export type EmailLogEntry = {
  id: string;
  email_type: string;
  recipient: string;
  booking_id: string | null;
  booking_reference: string | null;
  status: 'sent' | 'failed';
  provider: string;
  provider_message_id: string | null;
  failure_reason: string | null;
  sent_at: string;
}

export type PrivacyRequestType = 'export' | 'correction' | 'deletion';
export type PrivacyRequestStatus = 'new' | 'in_progress' | 'completed' | 'rejected';

export type PrivacyRequest = {
  id: string;
  request_type: PrivacyRequestType;
  name: string;
  email: string;
  details: string | null;
  status: PrivacyRequestStatus;
  admin_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
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
      admin_audit_log: {
        Row: AdminAuditLogEntry;
        Insert: Partial<AdminAuditLogEntry> & Pick<AdminAuditLogEntry, 'action' | 'record_type'>;
        Update: Partial<AdminAuditLogEntry>;
        Relationships: [];
      };
      login_attempts: {
        Row: LoginAttempt;
        Insert: Partial<LoginAttempt> & Pick<LoginAttempt, 'email' | 'success'>;
        Update: Partial<LoginAttempt>;
        Relationships: [];
      };
      settings: {
        Row: Settings;
        Insert: Partial<Settings>;
        Update: Partial<Settings>;
        Relationships: [];
      };
      date_rate_overrides: {
        Row: DateRateOverride;
        Insert: Partial<DateRateOverride> & Pick<DateRateOverride, 'start_date' | 'end_date'>;
        Update: Partial<DateRateOverride>;
        Relationships: [];
      };
      content_sections: {
        Row: ContentSection;
        Insert: Partial<ContentSection> & Pick<ContentSection, 'key' | 'value'>;
        Update: Partial<ContentSection>;
        Relationships: [];
      };
      guest_communications: {
        Row: GuestCommunication;
        Insert: Partial<GuestCommunication> & Pick<GuestCommunication, 'booking_id' | 'summary'>;
        Update: Partial<GuestCommunication>;
        Relationships: [];
      };
      email_log: {
        Row: EmailLogEntry;
        Insert: Partial<EmailLogEntry> & Pick<EmailLogEntry, 'email_type' | 'recipient' | 'status' | 'provider'>;
        Update: Partial<EmailLogEntry>;
        Relationships: [];
      };
      privacy_requests: {
        Row: PrivacyRequest;
        Insert: Partial<PrivacyRequest> & Pick<PrivacyRequest, 'request_type' | 'name' | 'email'>;
        Update: Partial<PrivacyRequest>;
        Relationships: [];
      };
      page_seo_overrides: {
        Row: PageSeoOverride;
        Insert: Partial<PageSeoOverride> & Pick<PageSeoOverride, 'path'>;
        Update: Partial<PageSeoOverride>;
        Relationships: [];
      };
      redirects: {
        Row: Redirect;
        Insert: Partial<Redirect> & Pick<Redirect, 'from_path' | 'to_path'>;
        Update: Partial<Redirect>;
        Relationships: [];
      };
      blog_posts: {
        Row: BlogPost;
        Insert: Partial<BlogPost> & Pick<BlogPost, 'slug' | 'title'>;
        Update: Partial<BlogPost>;
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEvent;
        Insert: Partial<AnalyticsEvent> & Pick<AnalyticsEvent, 'event_type'>;
        Update: Partial<AnalyticsEvent>;
        Relationships: [];
      };
    };
    Views: {
      public_unavailable_ranges: {
        Row: UnavailableRange;
        Relationships: [];
      };
    };
    Functions: {
      rate_limit_hit: {
        Args: { p_key: string; p_max_count: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
  };
}
