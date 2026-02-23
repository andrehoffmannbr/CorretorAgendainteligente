export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          name: string
          email: string
          role: 'OWNER' | 'COLLABORATOR'
          avatar_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          name: string
          email: string
          role?: 'OWNER' | 'COLLABORATOR'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          email?: string
          role?: 'OWNER' | 'COLLABORATOR'
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plan_type: string
          status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
          trial_ends_at: string | null
          current_period_ends_at: string | null
          canceled_at: string | null
          mercado_pago_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plan_type?: string
          status?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
          trial_ends_at?: string | null
          current_period_ends_at?: string | null
          canceled_at?: string | null
          mercado_pago_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          plan_type?: string
          status?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
          trial_ends_at?: string | null
          current_period_ends_at?: string | null
          canceled_at?: string | null
          mercado_pago_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          tenant_id: string
          created_by: string
          title: string | null
          description: string | null
          transaction_type: 'SALE' | 'RENT'
          property_type: 'APARTMENT' | 'HOUSE'
          status: 'ACTIVE' | 'SOLD' | 'RENTED' | 'INACTIVE'
          bedrooms: number
          bathrooms: number | null
          area_m2: number | null
          price: number
          city: string
          city_normalized: string
          neighborhood: string | null
          neighborhood_normalized: string | null
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          created_by: string
          title?: string | null
          description?: string | null
          transaction_type: 'SALE' | 'RENT'
          property_type: 'APARTMENT' | 'HOUSE'
          status?: 'ACTIVE' | 'SOLD' | 'RENTED' | 'INACTIVE'
          bedrooms: number
          bathrooms?: number | null
          area_m2?: number | null
          price: number
          city: string
          city_normalized?: string
          neighborhood?: string | null
          neighborhood_normalized?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          created_by?: string
          title?: string | null
          description?: string | null
          transaction_type?: 'SALE' | 'RENT'
          property_type?: 'APARTMENT' | 'HOUSE'
          status?: 'ACTIVE' | 'SOLD' | 'RENTED' | 'INACTIVE'
          bedrooms?: number
          bathrooms?: number | null
          area_m2?: number | null
          price?: number
          city?: string
          city_normalized?: string
          neighborhood?: string | null
          neighborhood_normalized?: string | null
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          tenant_id: string
          created_by: string
          name: string
          phone: string
          phone_normalized: string
          email: string | null
          notes: string | null
          desired_transaction_type: 'SALE' | 'RENT' | 'BOTH'
          desired_property_type: 'APARTMENT' | 'HOUSE' | null
          desired_bedrooms_min: number | null
          desired_bedrooms_max: number | null
          desired_price_min: number | null
          desired_price_max: number | null
          city: string | null
          city_normalized: string | null
          neighborhood: string | null
          neighborhood_normalized: string | null
          stage_id: string
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          created_by: string
          name: string
          phone: string
          phone_normalized?: string
          email?: string | null
          notes?: string | null
          desired_transaction_type?: 'SALE' | 'RENT' | 'BOTH'
          desired_property_type?: 'APARTMENT' | 'HOUSE' | null
          desired_bedrooms_min?: number | null
          desired_bedrooms_max?: number | null
          desired_price_min?: number | null
          desired_price_max?: number | null
          city?: string | null
          city_normalized?: string | null
          neighborhood?: string | null
          neighborhood_normalized?: string | null
          stage_id: string
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          created_by?: string
          name?: string
          phone?: string
          phone_normalized?: string
          email?: string | null
          notes?: string | null
          desired_transaction_type?: 'SALE' | 'RENT' | 'BOTH'
          desired_property_type?: 'APARTMENT' | 'HOUSE' | null
          desired_bedrooms_min?: number | null
          desired_bedrooms_max?: number | null
          desired_price_min?: number | null
          desired_price_max?: number | null
          city?: string | null
          city_normalized?: string | null
          neighborhood?: string | null
          neighborhood_normalized?: string | null
          stage_id?: string
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_stages: {
        Row: {
          id: string
          tenant_id: string
          name: string
          position: number
          is_final: boolean
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          position: number
          is_final?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          position?: number
          is_final?: boolean
          created_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          action: string
          table_name: string
          record_id: string
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          action: string
          table_name: string
          record_id: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          action?: string
          table_name?: string
          record_id?: string
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      property_client_matches: {
        Row: {
          client_id: string
          client_name: string
          property_id: string
          property_title: string | null
          tenant_id: string
        }
      }
      dashboard_stats: {
        Row: {
          tenant_id: string
          total_clients: number
          total_properties: number
          active_properties: number
          total_matches: number
        }
      }
      recent_matches: {
        Row: {
          client_id: string
          client_name: string
          property_id: string
          property_title: string | null
          property_price: number
          property_city: string
          tenant_id: string
        }
      }
      clients_by_stage: {
        Row: {
          stage_id: string
          stage_name: string
          stage_position: number
          is_final: boolean
          client_count: number
          tenant_id: string
        }
      }
    }
    Functions: {
      get_current_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      check_subscription_status: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: 'OWNER' | 'COLLABORATOR'
      subscription_status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
      transaction_type: 'SALE' | 'RENT'
      client_transaction_type: 'SALE' | 'RENT' | 'BOTH'
      property_type: 'APARTMENT' | 'HOUSE'
      property_status: 'ACTIVE' | 'SOLD' | 'RENTED' | 'INACTIVE'
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
