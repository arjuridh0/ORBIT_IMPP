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
        }
        Insert: {
          key: string
          label: string
          color: string
        }
        Update: {
          key?: string
          label?: string
          color?: string
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