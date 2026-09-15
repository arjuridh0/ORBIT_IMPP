export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          location: string | null
          start_date: string
          end_date: string | null
          is_tbd: boolean
          group_id: string | null
          color: string | null
          created_by: string | null
          reminder_offset_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          location?: string | null
          start_date: string
          end_date?: string | null
          is_tbd?: boolean
          group_id?: string | null
          color?: string | null
          created_by?: string | null
          reminder_offset_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          location?: string | null
          start_date?: string
          end_date?: string | null
          is_tbd?: boolean
          group_id?: string | null
          color?: string | null
          created_by?: string | null
          reminder_offset_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          role: string
          jabatan: string | null
          divisi: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          role?: string
          jabatan?: string | null
          divisi: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: string
          jabatan?: string | null
          divisi?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      divisi: {
        Row: {
          key: string
          label: string
          color: string
          sort_order: number
        }
        Insert: {
          key: string
          label: string
          color: string
          sort_order?: number
        }
        Update: {
          key?: string
          label?: string
          color?: string
          sort_order?: number
        }
        Relationships: []
      }
      konten: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          id: string
          event_id: string
          sent_at: string
        }
        Insert: {
          id?: string
          event_id: string
          sent_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          id: string
          full_name: string
          divisi: string
          koor_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          divisi: string
          koor_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          divisi?: string
          koor_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'members_koor_id_fkey'
            columns: ['koor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
  }
}

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type MemberRow = Database['public']['Tables']['members']['Row']