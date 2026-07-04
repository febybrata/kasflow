// ============================================================
// Supabase Database Types
// ============================================================
// Additive type definitions for tables used in TikTok sync routes.
// Mirrors `supabase-schema.sql`. Purely type-level — does not
// affect runtime behavior. When the official generated types
// become available, replace this file with the auto-generated
// output from `supabase gen types typescript`.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      marketplace_connections: {
        Row: {
          id: string;
          company_id: string;
          platform: string;
          shop_id: string | null;
          shop_name: string | null;
          display_name: string | null;
          shop_cipher: string | null;
          region: string | null;
          seller_type: string | null;
          access_token: string | null;
          refresh_token: string | null;
          token_expires_at: string | null;
          refresh_token_expires_at: string | null;
          last_sync_at: string | null;
          sync_start_date: string | null;
          status: string;
          config: Json | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          company_id: string;
          platform?: string;
          shop_id?: string | null;
          shop_name?: string | null;
          display_name?: string | null;
          shop_cipher?: string | null;
          region?: string | null;
          seller_type?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          refresh_token_expires_at?: string | null;
          last_sync_at?: string | null;
          sync_start_date?: string | null;
          status?: string;
          config?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          platform?: string;
          shop_id?: string | null;
          shop_name?: string | null;
          display_name?: string | null;
          shop_cipher?: string | null;
          region?: string | null;
          seller_type?: string | null;
          access_token?: string | null;
          refresh_token?: string | null;
          token_expires_at?: string | null;
          refresh_token_expires_at?: string | null;
          last_sync_at?: string | null;
          sync_start_date?: string | null;
          status?: string;
          config?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      marketplace_account_mapping: {
        Row: {
          id: string;
          connection_id: string;
          company_id: string;
          mapping_type: string;
          kasflow_account_id: string | null;
          kasflow_cash_account_id: string | null;
          kasflow_category_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          connection_id: string;
          company_id: string;
          mapping_type: string;
          kasflow_account_id?: string | null;
          kasflow_cash_account_id?: string | null;
          kasflow_category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          company_id?: string;
          mapping_type?: string;
          kasflow_account_id?: string | null;
          kasflow_cash_account_id?: string | null;
          kasflow_category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      account_categories: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          type: string;
          account_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          name: string;
          type: string;
          account_id: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          type?: string;
          account_id?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cash_accounts: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          type: string;
          account_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          name: string;
          type: string;
          account_id: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          type?: string;
          account_id?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      marketplace_sync_logs: {
        Row: {
          id: string;
          connection_id: string;
          company_id: string;
          sync_type: string;
          status: string;
          records_fetched: number | null;
          records_created: number | null;
          records_updated: number | null;
          records_skipped: number | null;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          connection_id: string;
          company_id: string;
          sync_type: string;
          status?: string;
          records_fetched?: number | null;
          records_created?: number | null;
          records_updated?: number | null;
          records_skipped?: number | null;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          company_id?: string;
          sync_type?: string;
          status?: string;
          records_fetched?: number | null;
          records_created?: number | null;
          records_updated?: number | null;
          records_skipped?: number | null;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      marketplace_statements: {
        Row: {
          id: string;
          connection_id: string;
          company_id: string;
          platform_statement_id: string;
          statement_time: string | null;
          currency: string | null;
          settlement_amount: number | null;
          revenue_amount: number | null;
          fee_amount: number | null;
          adjustment_amount: number | null;
          net_sales_amount: number | null;
          shipping_cost_amount: number | null;
          payment_status: string | null;
          payment_id: string | null;
          payment_time: string | null;
          reconciled: boolean | null;
          kasflow_income_txn_id: string | null;
          kasflow_expense_txn_id: string | null;
          kasflow_transfer_txn_id: string | null;
          order_count: number | null;
          approval_status: string | null;
          approved_by: string | null;
          approved_at: string | null;
          rejected_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          connection_id: string;
          company_id: string;
          platform_statement_id: string;
          statement_time?: string | null;
          currency?: string | null;
          settlement_amount?: number | null;
          revenue_amount?: number | null;
          fee_amount?: number | null;
          adjustment_amount?: number | null;
          net_sales_amount?: number | null;
          shipping_cost_amount?: number | null;
          payment_status?: string | null;
          payment_id?: string | null;
          payment_time?: string | null;
          reconciled?: boolean | null;
          kasflow_income_txn_id?: string | null;
          kasflow_expense_txn_id?: string | null;
          kasflow_transfer_txn_id?: string | null;
          order_count?: number | null;
          approval_status?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          company_id?: string;
          platform_statement_id?: string;
          statement_time?: string | null;
          currency?: string | null;
          settlement_amount?: number | null;
          revenue_amount?: number | null;
          fee_amount?: number | null;
          adjustment_amount?: number | null;
          net_sales_amount?: number | null;
          shipping_cost_amount?: number | null;
          payment_status?: string | null;
          payment_id?: string | null;
          payment_time?: string | null;
          reconciled?: boolean | null;
          kasflow_income_txn_id?: string | null;
          kasflow_expense_txn_id?: string | null;
          kasflow_transfer_txn_id?: string | null;
          order_count?: number | null;
          approval_status?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      marketplace_orders: {
        Row: {
          id: string;
          connection_id: string;
          company_id: string;
          platform_order_id: string;
          platform_status: string | null;
          order_create_time: string | null;
          order_update_time: string | null;
          currency: string | null;
          subtotal: number | null;
          shipping_fee: number | null;
          seller_discount: number | null;
          platform_discount: number | null;
          total_amount: number | null;
          settlement_status: string | null;
          statement_id: string | null;
          settlement_amount: number | null;
          revenue_amount: number | null;
          fee_amount: number | null;
          adjustment_amount: number | null;
          shipping_cost_amount: number | null;
          sync_status: string;
          kasflow_transaction_id: string | null;
          kasflow_journal_id: string | null;
          synced_at: string | null;
          raw_data: Json | null;
          cancellation_initiator: string | null;
          shipping_provider: string | null;
          buyer_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          connection_id: string;
          company_id: string;
          platform_order_id: string;
          platform_status?: string | null;
          order_create_time?: string | null;
          order_update_time?: string | null;
          currency?: string | null;
          subtotal?: number | null;
          shipping_fee?: number | null;
          seller_discount?: number | null;
          platform_discount?: number | null;
          total_amount?: number | null;
          settlement_status?: string | null;
          statement_id?: string | null;
          settlement_amount?: number | null;
          revenue_amount?: number | null;
          fee_amount?: number | null;
          adjustment_amount?: number | null;
          shipping_cost_amount?: number | null;
          sync_status?: string;
          kasflow_transaction_id?: string | null;
          kasflow_journal_id?: string | null;
          synced_at?: string | null;
          raw_data?: Json | null;
          cancellation_initiator?: string | null;
          shipping_provider?: string | null;
          buyer_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          company_id?: string;
          platform_order_id?: string;
          platform_status?: string | null;
          order_create_time?: string | null;
          order_update_time?: string | null;
          currency?: string | null;
          subtotal?: number | null;
          shipping_fee?: number | null;
          seller_discount?: number | null;
          platform_discount?: number | null;
          total_amount?: number | null;
          settlement_status?: string | null;
          statement_id?: string | null;
          settlement_amount?: number | null;
          revenue_amount?: number | null;
          fee_amount?: number | null;
          adjustment_amount?: number | null;
          shipping_cost_amount?: number | null;
          sync_status?: string;
          kasflow_transaction_id?: string | null;
          kasflow_journal_id?: string | null;
          synced_at?: string | null;
          raw_data?: Json | null;
          cancellation_initiator?: string | null;
          shipping_provider?: string | null;
          buyer_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
