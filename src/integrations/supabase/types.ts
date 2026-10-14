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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      private_sites: {
        Row: {
          created_at: string
          id: string
          kind: string
          lat: number
          lon: number
          name: string
          notes: string
          user_id: string
          volume_m3_day: number
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          lat: number
          lon: number
          name: string
          notes?: string
          user_id?: string
          volume_m3_day?: number
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          lat?: number
          lon?: number
          name?: string
          notes?: string
          user_id?: string
          volume_m3_day?: number
        }
        Relationships: []
      }
      project_alerts: {
        Row: {
          created_at: string
          id: string
          project_id: string | null
          read: boolean
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id?: string | null
          read?: boolean
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string | null
          read?: boolean
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      project_enquiries: {
        Row: {
          created_at: string
          email: string
          help: string
          id: string
          name: string
          opportunity: string
          organisation: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          help: string
          id?: string
          name: string
          opportunity?: string
          organisation: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          help?: string
          id?: string
          name?: string
          opportunity?: string
          organisation?: string
          role?: string
        }
        Relationships: []
      }
      reuse_projects: {
        Row: {
          activity: Json
          assumptions: Json
          blocker: string
          comments: Json
          confidence: string
          created_at: string
          evidence: Json
          id: string
          name: string
          next_action: string
          notes: string
          opportunity: Json
          owner_name: string
          stage: string
          user_id: string
        }
        Insert: {
          activity?: Json
          assumptions?: Json
          blocker?: string
          comments?: Json
          confidence?: string
          created_at?: string
          evidence?: Json
          id?: string
          name: string
          next_action?: string
          notes?: string
          opportunity?: Json
          owner_name?: string
          stage?: string
          user_id?: string
        }
        Update: {
          activity?: Json
          assumptions?: Json
          blocker?: string
          comments?: Json
          confidence?: string
          created_at?: string
          evidence?: Json
          id?: string
          name?: string
          next_action?: string
          notes?: string
          opportunity?: Json
          owner_name?: string
          stage?: string
          user_id?: string
        }
        Relationships: []
      }
      scoring_preferences: {
        Row: {
          distance_weight: number
          stress_weight: number
          updated_at: string
          user_id: string
          volume_weight: number
        }
        Insert: {
          distance_weight?: number
          stress_weight?: number
          updated_at?: string
          user_id?: string
          volume_weight?: number
        }
        Update: {
          distance_weight?: number
          stress_weight?: number
          updated_at?: string
          user_id?: string
          volume_weight?: number
        }
        Relationships: []
      }
      workspace_plans: {
        Row: {
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          full_name: string
          goal: string
          id: string
          name: string
          onboarding: Json
          plan: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          goal?: string
          id?: string
          name: string
          onboarding?: Json
          plan?: string
          role?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          goal?: string
          id?: string
          name?: string
          onboarding?: Json
          plan?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      project_limit: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
