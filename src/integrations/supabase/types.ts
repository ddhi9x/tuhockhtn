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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      exercises: {
        Row: {
          chapter_name: string
          correct_answer: number
          created_at: string
          difficulty_level: string
          explanation: string | null
          grade: number
          id: string
          is_ai_generated: boolean
          lesson_id: string
          lesson_name: string
          options: Json
          question: string
          updated_at: string
        }
        Insert: {
          chapter_name: string
          correct_answer?: number
          created_at?: string
          difficulty_level?: string
          explanation?: string | null
          grade: number
          id?: string
          is_ai_generated?: boolean
          lesson_id: string
          lesson_name: string
          options?: Json
          question: string
          updated_at?: string
        }
        Update: {
          chapter_name?: string
          correct_answer?: number
          created_at?: string
          difficulty_level?: string
          explanation?: string | null
          grade?: number
          id?: string
          is_ai_generated?: boolean
          lesson_id?: string
          lesson_name?: string
          options?: Json
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_simulations: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          grade: number
          id: string
          is_active: boolean | null
          lesson_id: string
          lesson_name: string
          sim_type: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          grade: number
          id?: string
          is_active?: boolean | null
          lesson_id: string
          lesson_name: string
          sim_type: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          grade?: number
          id?: string
          is_active?: boolean | null
          lesson_id?: string
          lesson_name?: string
          sim_type?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_theory: {
        Row: {
          chapter_name: string | null
          content: string | null
          created_at: string
          grade: number
          id: string
          illustrations: Json | null
          key_points: Json | null
          lesson_id: string
          lesson_name: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          chapter_name?: string | null
          content?: string | null
          created_at?: string
          grade: number
          id?: string
          illustrations?: Json | null
          key_points?: Json | null
          lesson_id: string
          lesson_name: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          chapter_name?: string | null
          content?: string | null
          created_at?: string
          grade?: number
          id?: string
          illustrations?: Json | null
          key_points?: Json | null
          lesson_id?: string
          lesson_name?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lesson_videos: {
        Row: {
          chapter_name: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          grade: number
          id: string
          is_active: boolean | null
          lesson_id: string
          lesson_name: string
          sort_order: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          chapter_name: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          grade: number
          id?: string
          is_active?: boolean | null
          lesson_id: string
          lesson_name: string
          sort_order?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          chapter_name?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          grade?: number
          id?: string
          is_active?: boolean | null
          lesson_id?: string
          lesson_name?: string
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          grade: number | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          grade?: number | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          grade?: number | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
