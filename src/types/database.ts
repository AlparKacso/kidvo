export type UserRole    = 'parent' | 'provider' | 'both' | 'admin'
export type ParentPlan  = 'free' | 'pro'
export type ProviderPlan = 'free' | 'featured'
export type ListingStatus = 'draft' | 'pending' | 'active' | 'paused'
export type ListingType   = 'activity' | 'event'
export type RequestStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'
export type ReviewStatus  = 'pending' | 'approved' | 'rejected'
export type EventDraftStatus = 'new' | 'approved' | 'rejected'
export type WaitlistStatus   = 'waiting' | 'offered' | 'enrolled' | 'removed'
export type RosterSource      = 'kidvo' | 'trial' | 'offline'
export type RosterStatus      = 'offered' | 'enrolled'
export type OfferPhase        = 'pending' | 'accepted' | 'declined' | 'expired'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id:         string
          email:      string
          full_name:  string
          phone:      string | null
          city:       string
          role:       UserRole
          plan:       ParentPlan
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      children: {
        Row: {
          id:           string
          user_id:      string
          name:         string
          birth_year:   number
          school_grade: string | null
          area_id:      string | null
          interests:    string[]
          created_at:   string
        }
        Insert: Omit<Database['public']['Tables']['children']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['children']['Insert']>
      }
      child_interests: {
        Row: {
          child_id:    string
          category_id: string
          created_at:  string
        }
        Insert: Omit<Database['public']['Tables']['child_interests']['Row'], 'created_at'>
        Update: never
      }
      categories: {
        Row: {
          id:           string
          name:         string
          slug:         string
          accent_color: string
          sort_order:   number
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      areas: {
        Row: {
          id:   string
          name: string
          slug: string
        }
        Insert: Omit<Database['public']['Tables']['areas']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['areas']['Insert']>
      }
      providers: {
        Row: {
          id:            string
          user_id:       string
          display_name:  string
          bio:           string | null
          contact_email: string
          contact_phone: string | null
          plan:          ProviderPlan
          verified:      boolean
          listed_since:  string
        }
        Insert: Omit<Database['public']['Tables']['providers']['Row'], 'id' | 'listed_since'>
        Update: Partial<Database['public']['Tables']['providers']['Insert']>
      }
      listings: {
        Row: {
          id:              string
          provider_id:     string
          category_id:     string | null
          area_id:         string | null
          title:           string
          description:     string | null
          age_min:         number | null
          age_max:         number | null
          source:          string
          series_id:       string | null
          fingerprint:     string | null
          price_monthly:   number
          spots_total:     number | null
          spots_available: number | null
          address:         string | null
          language:        string
          includes:        string[] | null
          trial_available:        boolean
          trial_disabled_reason:  string | null
          featured:               boolean
          status:           ListingStatus
          type:             ListingType
          event_start_at:   string | null
          event_end_at:     string | null
          event_url:        string | null
          venue_name:       string | null
          price_label:      string | null
          organizer_name:   string | null
          cover_image_url:  string | null
          maps_url:         string | null
          created_at:       string
          updated_at:       string
        }
        Insert: Omit<Database['public']['Tables']['listings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['listings']['Insert']>
      }
      listing_schedules: {
        Row: {
          id:          string
          listing_id:  string
          day_of_week: number
          time_start:  string
          time_end:    string
          group_label: string | null
        }
        Insert: Omit<Database['public']['Tables']['listing_schedules']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['listing_schedules']['Insert']>
      }
      saves: {
        Row: {
          id:         string
          user_id:    string
          listing_id: string
          child_id:   string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['saves']['Row'], 'id' | 'created_at'>
        Update: never
      }
      trial_requests: {
        Row: {
          id:            string
          user_id:       string
          listing_id:    string
          child_id:      string | null
          preferred_day: number | null
          message:       string | null
          status:        RequestStatus
          created_at:    string
          responded_at:  string | null
        }
        Insert: Omit<Database['public']['Tables']['trial_requests']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['trial_requests']['Insert']>
      }
      reviews: {
        Row: {
          id:          string
          user_id:     string
          listing_id:  string
          provider_id: string
          rating:      number
          comment:     string | null
          status:      ReviewStatus
          created_at:  string
        }
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at'>
        Update: { rating?: number; comment?: string | null; status?: ReviewStatus }
      }
      event_drafts: {
        Row: {
          id:                    string
          source:                string
          fingerprint:           string | null
          external_id:           string | null
          dedup_hash:            string
          raw_payload:           unknown | null
          title:                 string | null
          description:           string | null
          event_start_at:        string | null
          event_end_at:          string | null
          event_url:             string | null
          venue_name:            string | null
          price_label:           string | null
          organizer_name:        string | null
          cover_image_url:       string | null
          suggested_category_id: string | null
          suggested_area_id:     string | null
          status:                EventDraftStatus
          promoted_listing_id:   string | null
          created_at:            string
          updated_at:            string
        }
        Insert: Omit<Database['public']['Tables']['event_drafts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['event_drafts']['Insert']>
      }
      classes: {
        Row: {
          id:          string
          provider_id: string
          listing_id:  string | null
          name:        string
          category_id: string | null
          area_id:     string | null
          age_min:     number | null
          age_max:     number | null
          capacity:    number | null
          days:        number[]
          time_start:  string | null
          time_end:    string | null
          language:    string | null
          created_at:  string
          updated_at:  string
        }
        Insert: Omit<Database['public']['Tables']['classes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['classes']['Insert']>
      }
      waitlist_entries: {
        Row: {
          id:             string
          listing_id:     string
          user_id:        string
          child_id:       string | null
          child_name:     string
          child_age:      number | null
          preferred_days: number[]
          note:           string | null
          contact_name:   string | null
          contact_phone:  string | null
          contact_email:  string | null
          status:         WaitlistStatus
          created_at:     string
        }
        Insert: Omit<Database['public']['Tables']['waitlist_entries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['waitlist_entries']['Insert']>
      }
      roster_members: {
        Row: {
          id:                string
          class_id:          string
          source:            RosterSource
          status:            RosterStatus
          waitlist_entry_id: string | null
          trial_request_id:  string | null
          child_id:          string | null
          child_name:        string
          child_age:         number | null
          contact_name:      string | null
          contact_phone:     string | null
          contact_email:     string | null
          note:              string | null
          created_at:        string
          updated_at:        string
        }
        Insert: Omit<Database['public']['Tables']['roster_members']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['roster_members']['Insert']>
      }
      offers: {
        Row: {
          id:                string
          waitlist_entry_id: string
          roster_member_id:  string | null
          class_id:          string
          token:             string
          phase:             OfferPhase
          expires_at:        string | null
          created_at:        string
          responded_at:      string | null
        }
        Insert: Omit<Database['public']['Tables']['offers']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['offers']['Insert']>
      }
    }
  }
}

// Convenience types for joined queries
export type Listing = Database['public']['Tables']['listings']['Row']
export type ListingSchedule = Database['public']['Tables']['listing_schedules']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type Area = Database['public']['Tables']['areas']['Row']
export type Provider = Database['public']['Tables']['providers']['Row']
export type Child = Database['public']['Tables']['children']['Row']
export type EventDraft = Database['public']['Tables']['event_drafts']['Row']
export type Class = Database['public']['Tables']['classes']['Row']
export type WaitlistEntry = Database['public']['Tables']['waitlist_entries']['Row']
export type RosterMember = Database['public']['Tables']['roster_members']['Row']
export type Offer = Database['public']['Tables']['offers']['Row']

export type ListingWithRelations = Listing & {
  category:  Category
  area:      Area
  provider:  Provider
  schedules: ListingSchedule[]
}
