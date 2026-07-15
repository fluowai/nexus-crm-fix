export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      campaigns: {
        Row: {
          city: string | null
          created_at: string
          daily_send_limit: number
          google_query: string | null
          id: string
          name: string
          owner_id: string
          send_window_end: string
          send_window_start: string
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          daily_send_limit?: number
          google_query?: string | null
          id?: string
          name: string
          owner_id: string
          send_window_end?: string
          send_window_start?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          daily_send_limit?: number
          google_query?: string | null
          id?: string
          name?: string
          owner_id?: string
          send_window_end?: string
          send_window_start?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          campaign_id: string | null
          category: string | null
          created_at: string
          has_whatsapp: boolean | null
          id: string
          last_contacted_at: string | null
          name: string
          next_action_at: string | null
          notes: string | null
          owner_id: string
          phone_e164: string | null
          phone_raw: string | null
          place_id: string | null
          rating: number | null
          stage: Database["public"]["Enums"]["lead_stage"]
          updated_at: string
          website: string | null
          whatsapp_checked_at: string | null
        }
        Insert: {
          address?: string | null
          campaign_id?: string | null
          category?: string | null
          created_at?: string
          has_whatsapp?: boolean | null
          id?: string
          last_contacted_at?: string | null
          name: string
          next_action_at?: string | null
          notes?: string | null
          owner_id: string
          phone_e164?: string | null
          phone_raw?: string | null
          place_id?: string | null
          rating?: number | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
          website?: string | null
          whatsapp_checked_at?: string | null
        }
        Update: {
          address?: string | null
          campaign_id?: string | null
          category?: string | null
          created_at?: string
          has_whatsapp?: boolean | null
          id?: string
          last_contacted_at?: string | null
          name?: string
          next_action_at?: string | null
          notes?: string | null
          owner_id?: string
          phone_e164?: string | null
          phone_raw?: string | null
          place_id?: string | null
          rating?: number | null
          stage?: Database["public"]["Enums"]["lead_stage"]
          updated_at?: string
          website?: string | null
          whatsapp_checked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          campaign_id: string | null
          created_at: string
          delay_days: number
          id: string
          name: string
          owner_id: string
          sequence_order: number
          updated_at: string
        }
        Insert: {
          body: string
          campaign_id?: string | null
          created_at?: string
          delay_days?: number
          id?: string
          name: string
          owner_id: string
          sequence_order?: number
          updated_at?: string
        }
        Update: {
          body?: string
          campaign_id?: string | null
          created_at?: string
          delay_days?: number
          id?: string
          name?: string
          owner_id?: string
          sequence_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          error: string | null
          id: string
          lead_id: string
          owner_id: string
          scheduled_for: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          template_id: string | null
          wpp_message_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          error?: string | null
          id?: string
          lead_id: string
          owner_id: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          wpp_message_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          error?: string | null
          id?: string
          lead_id?: string
          owner_id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          wpp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
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
    Enums: {
      campaign_status: "draft" | "active" | "paused" | "archived"
      lead_stage:
        | "novo"
        | "validado"
        | "contatado"
        | "respondeu"
        | "qualificado"
        | "fechado"
        | "perdido"
      message_direction: "outbound" | "inbound"
      message_status: "queued" | "sent" | "delivered" | "read" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      campaign_status: ["draft", "active", "paused", "archived"],
      lead_stage: [
        "novo",
        "validado",
        "contatado",
        "respondeu",
        "qualificado",
        "fechado",
        "perdido",
      ],
      message_direction: ["outbound", "inbound"],
      message_status: ["queued", "sent", "delivered", "read", "failed"],
    },
  },
} as const
