export type UserRole    = 'parent' | 'provider' | 'both' | 'admin'
export type ParentPlan  = 'free' | 'pro'
export type ProviderPlan = 'free' | 'featured'
export type ListingStatus = 'draft' | 'pending' | 'active' | 'paused'
export type RequestStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'

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
          category_id:     string
          area_id:         string
          title:           string
          description:     string | null
          age_min:         number
          age_max:         number
          price_monthly:   number
          spots_total:     number | null
          spots_available: number | null
          address:         string | null
          language:        string
          includes:        string[] | null
          trial_available: boolean
          featured:        boolean
          status:          ListingStatus
          created_at:      string
          updated_at:      string
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

export type ListingWithRelations = Listing & {
  category:  Category
  area:      Area
  provider:  Provider
  schedules: ListingSchedule[]
}
