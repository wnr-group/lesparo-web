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
      categories: {
        Row: {
          cover_image_path: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_featured: boolean
          is_published: boolean
          legacy_id: number | null
          legacy_url: string | null
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_featured?: boolean
          is_published?: boolean
          legacy_id?: number | null
          legacy_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          cover_image_path?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_featured?: boolean
          is_published?: boolean
          legacy_id?: number | null
          legacy_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_attachments: {
        Row: {
          content_type: string
          created_at: string
          enquiry_id: string
          file_size: number
          id: string
          original_filename: string
          storage_path: string
        }
        Insert: {
          content_type: string
          created_at?: string
          enquiry_id: string
          file_size: number
          id?: string
          original_filename: string
          storage_path: string
        }
        Update: {
          content_type?: string
          created_at?: string
          enquiry_id?: string
          file_size?: number
          id?: string
          original_filename?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_attachments_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "wholesale_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_items: {
        Row: {
          display_order: number
          enquiry_id: string
          id: string
          product_id: string | null
          product_name_snapshot: string
          quantity: number | null
          specifications: string | null
        }
        Insert: {
          display_order?: number
          enquiry_id: string
          id?: string
          product_id?: string | null
          product_name_snapshot: string
          quantity?: number | null
          specifications?: string | null
        }
        Update: {
          display_order?: number
          enquiry_id?: string
          id?: string
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number | null
          specifications?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_items_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "wholesale_enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiry_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_notes: {
        Row: {
          author_id: string | null
          created_at: string
          enquiry_id: string
          id: string
          note: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          enquiry_id: string
          id?: string
          note: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          enquiry_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_notes_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "wholesale_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiry_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          enquiry_id: string
          from_status: Database["public"]["Enums"]["enquiry_status"] | null
          id: number
          to_status: Database["public"]["Enums"]["enquiry_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          enquiry_id: string
          from_status?: Database["public"]["Enums"]["enquiry_status"] | null
          id?: never
          to_status: Database["public"]["Enums"]["enquiry_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          enquiry_id?: string
          from_status?: Database["public"]["Enums"]["enquiry_status"] | null
          id?: never
          to_status?: Database["public"]["Enums"]["enquiry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "enquiry_status_history_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "wholesale_enquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_jobs: {
        Row: {
          attempts: number
          created_at: string
          entity_id: string
          entity_type: string
          external_id: string | null
          id: string
          idempotency_key: string
          last_error: string | null
          max_attempts: number
          next_attempt_at: string
          operation: string
          provider: string
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_id: string
          entity_type: string
          external_id?: string | null
          id?: string
          idempotency_key: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          operation: string
          provider: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_id?: string
          entity_type?: string
          external_id?: string | null
          id?: string
          idempotency_key?: string
          last_error?: string | null
          max_attempts?: number
          next_attempt_at?: string
          operation?: string
          provider?: string
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          display_order: number
          height: number | null
          id: string
          is_primary: boolean
          product_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          alt_text?: string
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          is_primary?: boolean
          product_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          is_primary?: boolean
          product_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          fabric: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          legacy_id: number | null
          legacy_url: string | null
          name: string
          packing: string | null
          price: number | null
          quote_enabled: boolean
          retail_enabled: boolean
          search: unknown
          seo_description: string | null
          seo_title: string | null
          sizes: string[]
          sku: string | null
          slug: string
          specs: Json
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          fabric?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          legacy_id?: number | null
          legacy_url?: string | null
          name: string
          packing?: string | null
          price?: number | null
          quote_enabled?: boolean
          retail_enabled?: boolean
          search?: unknown
          seo_description?: string | null
          seo_title?: string | null
          sizes?: string[]
          sku?: string | null
          slug: string
          specs?: Json
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          fabric?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          legacy_id?: number | null
          legacy_url?: string | null
          name?: string
          packing?: string | null
          price?: number | null
          quote_enabled?: boolean
          retail_enabled?: boolean
          search?: unknown
          seo_description?: string | null
          seo_title?: string | null
          sizes?: string[]
          sku?: string | null
          slug?: string
          specs?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          hits: number
          key: string
          window_start: string
        }
        Insert: {
          hits?: number
          key: string
          window_start: string
        }
        Update: {
          hits?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          data: Json
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          data: Json
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          data?: Json
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: []
      }
      wholesale_enquiries: {
        Row: {
          assigned_to: string | null
          company_name: string | null
          consent_at: string
          country: string | null
          created_at: string
          crm_record_id: string | null
          crm_sync_status: Database["public"]["Enums"]["sync_status"]
          customer_name: string
          email: string
          enquiry_number: string
          follow_up_at: string | null
          follow_up_outcome: string | null
          id: string
          idempotency_key: string
          message: string
          phone: string
          quotation_amount: number | null
          quotation_currency: string | null
          quotation_details: string | null
          quotation_valid_until: string | null
          source: string
          status: Database["public"]["Enums"]["enquiry_status"]
          target_budget: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_name?: string | null
          consent_at: string
          country?: string | null
          created_at?: string
          crm_record_id?: string | null
          crm_sync_status?: Database["public"]["Enums"]["sync_status"]
          customer_name: string
          email: string
          enquiry_number: string
          follow_up_at?: string | null
          follow_up_outcome?: string | null
          id?: string
          idempotency_key: string
          message: string
          phone: string
          quotation_amount?: number | null
          quotation_currency?: string | null
          quotation_details?: string | null
          quotation_valid_until?: string | null
          source?: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          target_budget?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_name?: string | null
          consent_at?: string
          country?: string | null
          created_at?: string
          crm_record_id?: string | null
          crm_sync_status?: Database["public"]["Enums"]["sync_status"]
          customer_name?: string
          email?: string
          enquiry_number?: string
          follow_up_at?: string | null
          follow_up_outcome?: string | null
          id?: string
          idempotency_key?: string
          message?: string
          phone?: string
          quotation_amount?: number | null
          quotation_currency?: string | null
          quotation_details?: string | null
          quotation_valid_until?: string | null
          source?: string
          status?: Database["public"]["Enums"]["enquiry_status"]
          target_budget?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      category_subtree: { Args: { root: string }; Returns: string[] }
      create_wholesale_enquiry: {
        Args: { p: Json; p_jobs?: Json }
        Returns: {
          created: boolean
          enquiry_number: string
          id: string
        }[]
      }
      hit_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      enquiry_status:
        | "new"
        | "under_review"
        | "info_required"
        | "quotation_prepared"
        | "quotation_sent"
        | "accepted"
        | "rejected"
        | "closed"
      job_status: "pending" | "running" | "succeeded" | "failed" | "blocked"
      staff_role: "admin" | "sales"
      sync_status: "not_configured" | "pending" | "synced" | "failed"
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
      enquiry_status: [
        "new",
        "under_review",
        "info_required",
        "quotation_prepared",
        "quotation_sent",
        "accepted",
        "rejected",
        "closed",
      ],
      job_status: ["pending", "running", "succeeded", "failed", "blocked"],
      staff_role: ["admin", "sales"],
      sync_status: ["not_configured", "pending", "synced", "failed"],
    },
  },
} as const

