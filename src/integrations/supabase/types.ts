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
      companies: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_paused: boolean
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_paused?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_paused?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_branding: {
        Row: {
          accent_color: string | null
          company_id: string
          created_at: string
          font_body: string | null
          font_heading: string | null
          id: string
          primary_color: string | null
          sidebar_color: string | null
          theme_mode: string
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          accent_color?: string | null
          company_id: string
          created_at?: string
          font_body?: string | null
          font_heading?: string | null
          id?: string
          primary_color?: string | null
          sidebar_color?: string | null
          theme_mode?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          accent_color?: string | null
          company_id?: string
          created_at?: string
          font_body?: string | null
          font_heading?: string | null
          id?: string
          primary_color?: string | null
          sidebar_color?: string | null
          theme_mode?: string
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_branding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_staff: {
        Row: {
          access_permissions: string[] | null
          company_id: string
          created_at: string
          department: string[]
          full_name: string
          id: string
          is_active: boolean
          password_hash: string | null
          phone: string | null
          role: string
          staff_code: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_permissions?: string[] | null
          company_id: string
          created_at?: string
          department?: string[]
          full_name: string
          id?: string
          is_active?: boolean
          password_hash?: string | null
          phone?: string | null
          role?: string
          staff_code: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_permissions?: string[] | null
          company_id?: string
          created_at?: string
          department?: string[]
          full_name?: string
          id?: string
          is_active?: boolean
          password_hash?: string | null
          phone?: string | null
          role?: string
          staff_code?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_staff_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_management_settings: {
        Row: {
          company_id: string
          enabled: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          enabled?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_management_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          address: string | null
          company_id: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_profiles_company_id_staff_id_fkey"
            columns: ["company_id", "staff_id"]
            isOneToOne: true
            referencedRelation: "company_staff"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      staff_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          notes: string | null
          pay_period_end: string
          pay_period_start: string
          payment_date: string
          payment_method: string
          recorded_by: string | null
          reference: string | null
          staff_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          pay_period_end: string
          pay_period_start: string
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          staff_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          pay_period_end?: string
          pay_period_start?: string
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_payments_company_id_staff_id_fkey"
            columns: ["company_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "company_staff"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      staff_leave_requests: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          leave_type: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          review_note: string | null
          staff_id: string
          start_date: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          leave_type: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_note?: string | null
          staff_id: string
          start_date: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          review_note?: string | null
          staff_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_leave_requests_company_id_staff_id_fkey"
            columns: ["company_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "company_staff"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          clocked_in_at: string
          clocked_out_at: string | null
          company_id: string
          id: string
          notes: string | null
          staff_id: string
        }
        Insert: {
          clocked_in_at?: string
          clocked_out_at?: string | null
          company_id: string
          id?: string
          notes?: string | null
          staff_id: string
        }
        Update: {
          clocked_in_at?: string
          clocked_out_at?: string | null
          company_id?: string
          id?: string
          notes?: string | null
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_company_id_staff_id_fkey"
            columns: ["company_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "company_staff"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          notes: string | null
          staff_id: string
          starts_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          staff_id: string
          starts_at: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          staff_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_company_id_staff_id_fkey"
            columns: ["company_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "company_staff"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      staff_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          company_id: string
          created_at: string
          effective_date: string
          id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          staff_id: string
          status: string
        }
        Insert: {
          adjustment_type: string
          amount: number
          company_id: string
          created_at?: string
          effective_date?: string
          id?: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id: string
          status?: string
        }
        Update: {
          adjustment_type?: string
          amount?: number
          company_id?: string
          created_at?: string
          effective_date?: string
          id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_adjustments_company_id_staff_id_fkey"
            columns: ["company_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "company_staff"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      staff_documents: {
        Row: {
          company_id: string
          created_at: string
          document_type: string
          file_name: string
          id: string
          staff_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type?: string
          file_name: string
          id?: string
          staff_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          id?: string
          staff_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_documents_company_id_staff_id_fkey"
            columns: ["company_id", "staff_id"]
            isOneToOne: false
            referencedRelation: "company_staff"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          budget_monthly: number | null
          company_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          budget_monthly?: number | null
          company_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          budget_monthly?: number | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: string | null
          staff_code: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address?: string | null
          staff_code: string
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: string | null
          staff_code?: string
        }
        Relationships: []
      }
      inventory_restock_entries: {
        Row: {
          company_id: string
          created_at: string
          id: string
          item_name: string
          menu_item_id: string | null
          quantity: number
          restocked_by: string
          stock_date: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          item_name: string
          menu_item_id?: string | null
          quantity: number
          restocked_by?: string
          stock_date?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          item_name?: string
          menu_item_id?: string | null
          quantity?: number
          restocked_by?: string
          stock_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_restock_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_restock_entries_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_balances: {
        Row: {
          company_id: string
          id: string
          initial_quantity: number
          item_name: string
          menu_item_id: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          company_id: string
          id?: string
          initial_quantity?: number
          item_name: string
          menu_item_id?: string | null
          quantity?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          id?: string
          initial_quantity?: number
          item_name?: string
          menu_item_id?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_balances_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_period_adjustments: {
        Row: {
          company_id: string
          id: string
          initial_quantity: number
          item_key: string
          item_name: string
          period_end: string
          period_start: string
          restocked_adjustment: number
        }
        Insert: {
          company_id: string
          id?: string
          initial_quantity: number
          item_key: string
          item_name: string
          period_end: string
          period_start: string
          restocked_adjustment?: number
        }
        Update: {
          company_id?: string
          id?: string
          initial_quantity?: number
          item_key?: string
          item_name?: string
          period_end?: string
          period_start?: string
          restocked_adjustment?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_period_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      housekeeping_tasks: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          instructions: string | null
          room_label: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name: string
          company_id: string
          created_at?: string
          created_by?: string
          id?: string
          instructions?: string | null
          room_label: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          instructions?: string | null
          room_label?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "housekeeping_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "company_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "housekeeping_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          department: string | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: string | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: string | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          name: string
          notes: string | null
          order_id: string
          quantity: number
          status: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name: string
          notes?: string | null
          order_id: string
          quantity?: number
          status?: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          status?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_number: number
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          ready_at: string | null
          served_by_name: string | null
          served_by_user_id: string | null
          status: string
          subtotal: number
          table_number: string | null
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          ready_at?: string | null
          served_by_name?: string | null
          served_by_user_id?: string | null
          status?: string
          subtotal?: number
          table_number?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          ready_at?: string | null
          served_by_name?: string | null
          served_by_user_id?: string | null
          status?: string
          subtotal?: number
          table_number?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_company_id: string | null
          full_name: string | null
          id: string
          is_approved: boolean
          is_super_admin: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_company_id?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          is_super_admin?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_company_id?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          is_super_admin?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_company_id_fkey"
            columns: ["current_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          id: string
          payment_method: string
          reference_id: string | null
          reference_type: string | null
          sale_date: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          id?: string
          payment_method?: string
          reference_id?: string | null
          reference_type?: string | null
          sale_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          id?: string
          payment_method?: string
          reference_id?: string | null
          reference_type?: string | null
          sale_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          company_id: string
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      accept_invitation: { Args: { _token: string }; Returns: string }
      staff_clock_in: { Args: { _staff_id: string }; Returns: string }
      staff_clock_out: { Args: { _attendance_id: string }; Returns: string }
      create_restaurant_order: {
        Args: {
          _company_id: string
          _items: Json
          _notes: string
          _table_number: string
        }
        Returns: {
          id: string
          order_number: number
        }[]
      }
      get_company_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          logo_url: string
          name: string
          slug: string
        }[]
      }
      get_company_role: {
        Args: { _company_id: string; _user_id: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member_raw: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      list_housekeeping_cleaners: {
        Args: { _company_id: string }
        Returns: {
          full_name: string
          staff_id: string
        }[]
      }
      list_company_staff: {
        Args: { _company_id: string }
        Returns: {
          company_id: string
          created_at: string
          department: string[]
          full_name: string
          id: string
          is_active: boolean
          phone: string
          role: string
          updated_at: string
          user_id: string
        }[]
      }
      lookup_staff_by_code: {
        Args: { _company_slug: string | null; _staff_code: string }
        Returns: {
          company_id: string
          company_name: string
          department: string
          full_name: string
          is_active: boolean
          role: string
          staff_id: string
        }[]
      }
      role_rank: { Args: { _role: string }; Returns: number }
      set_housekeeping_task_status: {
        Args: { _status: string; _task_id: string }
        Returns: undefined
      }
      set_staff_password: {
        Args: { _password: string; _staff_id: string }
        Returns: undefined
      }
      staff_has_permission: {
        Args: {
          _company_id: string
          _permission: string
          _user_id: string
        }
        Returns: boolean
      }
      is_housekeeping_cleaner: {
        Args: { _company_id: string; _staff_id: string }
        Returns: boolean
      }
      is_housekeeping_task_assignee: {
        Args: { _company_id: string; _staff_id: string; _user_id: string }
        Returns: boolean
      }
      staff_has_password: { Args: { _staff_id: string }; Returns: boolean }
      verify_staff_password: {
        Args: { _password: string; _staff_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
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
    Enums: {
      app_role: ["admin", "manager", "staff"],
    },
  },
} as const
