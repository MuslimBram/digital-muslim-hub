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
      agent_schedules: {
        Row: {
          break_minutes: number | null
          created_at: string
          id: string
          notes: string | null
          queue_ids: string[]
          shift_end: string
          shift_start: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          queue_ids?: string[]
          shift_end: string
          shift_start: string
          user_id: string
          workspace_id: string
        }
        Update: {
          break_minutes?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          queue_ids?: string[]
          shift_end?: string
          shift_start?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      agent_status: {
        Row: {
          current_call_id: string | null
          id: string
          last_heartbeat: string
          reason: string | null
          since: string
          status: Database["public"]["Enums"]["agent_presence"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          current_call_id?: string | null
          id?: string
          last_heartbeat?: string
          reason?: string | null
          since?: string
          status?: Database["public"]["Enums"]["agent_presence"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          current_call_id?: string | null
          id?: string
          last_heartbeat?: string
          reason?: string | null
          since?: string
          status?: Database["public"]["Enums"]["agent_presence"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      ai_assistants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          model: string
          name: string
          system_prompt: string | null
          temperature: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          name?: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          model?: string
          name?: string
          system_prompt?: string | null
          temperature?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_brand_voice: {
        Row: {
          business_name: string | null
          created_at: string
          do_not_use: string | null
          do_use: string | null
          example_content: string | null
          id: string
          industry: string | null
          language: string
          target_audience: string | null
          tone: string
          updated_at: string
          values: string | null
          workspace_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          do_not_use?: string | null
          do_use?: string | null
          example_content?: string | null
          id?: string
          industry?: string | null
          language?: string
          target_audience?: string | null
          tone?: string
          updated_at?: string
          values?: string | null
          workspace_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          do_not_use?: string | null
          do_use?: string | null
          example_content?: string | null
          id?: string
          industry?: string | null
          language?: string
          target_audience?: string | null
          tone?: string
          updated_at?: string
          values?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_brand_voice_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory: {
        Row: {
          business_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          key: string
          scope: Database["public"]["Enums"]["memory_scope"]
          source: string | null
          updated_at: string
          value: string
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          key: string
          scope?: Database["public"]["Enums"]["memory_scope"]
          source?: string | null
          updated_at?: string
          value: string
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          key?: string
          scope?: Database["public"]["Enums"]["memory_scope"]
          source?: string | null
          updated_at?: string
          value?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          citations: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["ai_message_role"]
          tokens_used: number | null
          workspace_id: string
        }
        Insert: {
          citations?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["ai_message_role"]
          tokens_used?: number | null
          workspace_id: string
        }
        Update: {
          citations?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["ai_message_role"]
          tokens_used?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      call_events: {
        Row: {
          actor_user_id: string | null
          at: string
          call_id: string
          event_type: Database["public"]["Enums"]["call_event_type"]
          id: string
          payload: Json
          workspace_id: string
        }
        Insert: {
          actor_user_id?: string | null
          at?: string
          call_id: string
          event_type: Database["public"]["Enums"]["call_event_type"]
          id?: string
          payload?: Json
          workspace_id: string
        }
        Update: {
          actor_user_id?: string | null
          at?: string
          call_id?: string
          event_type?: Database["public"]["Enums"]["call_event_type"]
          id?: string
          payload?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_events_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      call_queues: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_wait_seconds: number
          music_url: string | null
          name: string
          ringing_seconds: number
          sla_seconds: number
          strategy: Database["public"]["Enums"]["queue_strategy"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_wait_seconds?: number
          music_url?: string | null
          name: string
          ringing_seconds?: number
          sla_seconds?: number
          strategy?: Database["public"]["Enums"]["queue_strategy"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_wait_seconds?: number
          music_url?: string | null
          name?: string
          ringing_seconds?: number
          sla_seconds?: number
          strategy?: Database["public"]["Enums"]["queue_strategy"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      call_recordings: {
        Row: {
          call_id: string
          created_at: string
          duration_seconds: number
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          storage_path: string
          transcript: string | null
          transcript_status: string | null
          workspace_id: string
        }
        Insert: {
          call_id: string
          created_at?: string
          duration_seconds?: number
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          transcript?: string | null
          transcript_status?: string | null
          workspace_id: string
        }
        Update: {
          call_id?: string
          created_at?: string
          duration_seconds?: number
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          transcript?: string | null
          transcript_status?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_recordings_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          agent_id: string | null
          answered_at: string | null
          business_id: string | null
          contact_id: string | null
          created_at: string
          direction: Database["public"]["Enums"]["call_direction"]
          disposition: string | null
          duration_seconds: number | null
          ended_at: string | null
          from_number: string
          hold_seconds: number | null
          id: string
          metadata: Json
          notes: string | null
          queue_id: string | null
          recording_id: string | null
          ringing_seconds: number | null
          started_at: string
          status: Database["public"]["Enums"]["call_status"]
          to_number: string
          updated_at: string
          wait_seconds: number | null
          workspace_id: string
        }
        Insert: {
          agent_id?: string | null
          answered_at?: string | null
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["call_direction"]
          disposition?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          from_number: string
          hold_seconds?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          queue_id?: string | null
          recording_id?: string | null
          ringing_seconds?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
          to_number: string
          updated_at?: string
          wait_seconds?: number | null
          workspace_id: string
        }
        Update: {
          agent_id?: string | null
          answered_at?: string | null
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["call_direction"]
          disposition?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          from_number?: string
          hold_seconds?: number | null
          id?: string
          metadata?: Json
          notes?: string | null
          queue_id?: string | null
          recording_id?: string | null
          ringing_seconds?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["call_status"]
          to_number?: string
          updated_at?: string
          wait_seconds?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "call_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          business_id: string | null
          channel_id: string | null
          created_at: string
          created_by: string | null
          delivered_count: number
          failed_count: number
          id: string
          name: string
          scheduled_at: string | null
          sent_count: number
          status: Database["public"]["Enums"]["campaign_status"]
          template_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          channel_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name: string
          scheduled_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          template_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          channel_id?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_count?: number
          status?: Database["public"]["Enums"]["campaign_status"]
          template_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          business_id: string | null
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["channel_type"]
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["channel_type"]
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["channel_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          assigned_to: string | null
          business_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["contact_status"]
          tags: string[] | null
          telegram_username: string | null
          updated_at: string
          whatsapp: string | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[] | null
          telegram_username?: string | null
          updated_at?: string
          whatsapp?: string | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          tags?: string[] | null
          telegram_username?: string | null
          updated_at?: string
          whatsapp?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          assigned_to: string | null
          channel_id: string
          contact_id: string | null
          created_at: string
          id: string
          last_message_at: string
          status: Database["public"]["Enums"]["conversation_status"]
          subject: string | null
          unread_count: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          channel_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          unread_count?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          channel_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          subject?: string | null
          unread_count?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_usage: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["credit_kind"]
          metadata: Json
          usage_date: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["credit_kind"]
          metadata?: Json
          usage_date?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["credit_kind"]
          metadata?: Json
          usage_date?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_usage_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string
          currency: string | null
          expected_close_date: string | null
          id: string
          pipeline_id: string
          position: number
          stage_id: string
          status: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at: string
          value: number | null
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          pipeline_id: string
          position?: number
          stage_id: string
          status?: Database["public"]["Enums"]["deal_status"]
          title: string
          updated_at?: string
          value?: number | null
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string
          currency?: string | null
          expected_close_date?: string | null
          id?: string
          pipeline_id?: string
          position?: number
          stage_id?: string
          status?: Database["public"]["Enums"]["deal_status"]
          title?: string
          updated_at?: string
          value?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dialer_campaigns: {
        Row: {
          business_id: string | null
          completed_calls: number | null
          contact_ids: string[]
          created_at: string
          created_by: string | null
          id: string
          mode: Database["public"]["Enums"]["dialer_mode"]
          name: string
          queue_id: string | null
          script: string | null
          status: Database["public"]["Enums"]["dialer_status"]
          total_calls: number | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          completed_calls?: number | null
          contact_ids?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["dialer_mode"]
          name: string
          queue_id?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["dialer_status"]
          total_calls?: number | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          completed_calls?: number | null
          contact_ids?: string[]
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["dialer_mode"]
          name?: string
          queue_id?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["dialer_status"]
          total_calls?: number | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialer_campaigns_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "call_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          currency: string
          donor_email: string | null
          donor_name: string | null
          donor_user_id: string | null
          id: string
          message: string | null
          metadata: Json
          paypal_capture_id: string | null
          paypal_order_id: string | null
          status: Database["public"]["Enums"]["donation_status"]
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          donor_user_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          status?: Database["public"]["Enums"]["donation_status"]
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          donor_user_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          status?: Database["public"]["Enums"]["donation_status"]
        }
        Relationships: []
      }
      ivr_flows: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          language: string
          name: string
          root_node_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name: string
          root_node_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          name?: string
          root_node_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      ivr_nodes: {
        Row: {
          config: Json
          created_at: string
          flow_id: string
          id: string
          label: string | null
          parent_id: string | null
          position_x: number | null
          position_y: number | null
          type: Database["public"]["Enums"]["ivr_node_type"]
          workspace_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          flow_id: string
          id?: string
          label?: string | null
          parent_id?: string | null
          position_x?: number | null
          position_y?: number | null
          type: Database["public"]["Enums"]["ivr_node_type"]
          workspace_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          flow_id?: string
          id?: string
          label?: string | null
          parent_id?: string | null
          position_x?: number | null
          position_y?: number | null
          type?: Database["public"]["Enums"]["ivr_node_type"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ivr_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "ivr_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ivr_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ivr_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          workspace_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          workspace_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "kb_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_chunks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_documents: {
        Row: {
          chunks_count: number
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          source_type: Database["public"]["Enums"]["kb_source_type"]
          source_url: string | null
          status: Database["public"]["Enums"]["kb_status"]
          storage_path: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          chunks_count?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          source_type: Database["public"]["Enums"]["kb_source_type"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["kb_status"]
          storage_path?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          chunks_count?: number
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          source_type?: Database["public"]["Enums"]["kb_source_type"]
          source_url?: string | null
          status?: Database["public"]["Enums"]["kb_status"]
          storage_path?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at: string
          id: string
          name: string
          variables: string[] | null
          workspace_id: string
        }
        Insert: {
          body: string
          channel_type: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          name: string
          variables?: string[] | null
          workspace_id: string
        }
        Update: {
          body?: string
          channel_type?: Database["public"]["Enums"]["channel_type"]
          created_at?: string
          id?: string
          name?: string
          variables?: string[] | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          body: string | null
          conversation_id: string
          created_at: string
          direction: Database["public"]["Enums"]["message_direction"]
          external_id: string | null
          id: string
          metadata: Json | null
          sender_user_id: string | null
          workspace_id: string
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          conversation_id: string
          created_at?: string
          direction: Database["public"]["Enums"]["message_direction"]
          external_id?: string | null
          id?: string
          metadata?: Json | null
          sender_user_id?: string | null
          workspace_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["message_direction"]
          external_id?: string | null
          id?: string
          metadata?: Json | null
          sender_user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          pipeline_id: string
          position: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          pipeline_id: string
          position?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          workspace_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          workspace_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          daily_image_credits: number
          daily_video_seconds: number
          features: Json
          id: string
          is_active: boolean
          max_ai_replies_daily: number
          max_businesses: number
          max_channels: number
          max_team_members: number
          monthly_price_cents: number
          name: string
          sort_order: number
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          daily_image_credits: number
          daily_video_seconds: number
          features?: Json
          id?: string
          is_active?: boolean
          max_ai_replies_daily: number
          max_businesses: number
          max_channels: number
          max_team_members: number
          monthly_price_cents: number
          name: string
          sort_order?: number
          tier: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          daily_image_credits?: number
          daily_video_seconds?: number
          features?: Json
          id?: string
          is_active?: boolean
          max_ai_replies_daily?: number
          max_businesses?: number
          max_channels?: number
          max_team_members?: number
          monthly_price_cents?: number
          name?: string
          sort_order?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          locale: string
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          security_code_hash: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          security_code_hash?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          security_code_hash?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      queue_members: {
        Row: {
          created_at: string
          id: string
          priority: number
          queue_id: string
          skills: string[]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority?: number
          queue_id: string
          skills?: string[]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: number
          queue_id?: string
          skills?: string[]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_members_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "call_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          commission_rate: number
          created_at: string
          first_payment_at: string | null
          id: string
          is_active: boolean
          referred_user_id: string
          referred_workspace_id: string | null
          referrer_id: string
          signup_at: string
          total_commission_cents: number
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          first_payment_at?: string | null
          id?: string
          is_active?: boolean
          referred_user_id: string
          referred_workspace_id?: string | null
          referrer_id: string
          signup_at?: string
          total_commission_cents?: number
        }
        Update: {
          commission_rate?: number
          created_at?: string
          first_payment_at?: string | null
          id?: string
          is_active?: boolean
          referred_user_id?: string
          referred_workspace_id?: string | null
          referrer_id?: string
          signup_at?: string
          total_commission_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_workspace_id_fkey"
            columns: ["referred_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          blocked_at: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          delete_after: string | null
          id: string
          metadata: Json
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          blocked_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          delete_after?: string | null
          id?: string
          metadata?: Json
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          blocked_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          delete_after?: string | null
          id?: string
          metadata?: Json
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          business_id: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_to?: string | null
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_to?: string | null
          business_id?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      wallet_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          id: string
          metadata: Json
          reference_id: string | null
          tx_type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          tx_type: Database["public"]["Enums"]["wallet_tx_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          tx_type?: Database["public"]["Enums"]["wallet_tx_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cents: number
          created_at: string
          currency: string
          id: string
          total_earned_cents: number
          total_withdrawn_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          total_earned_cents?: number
          total_withdrawn_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          currency?: string
          id?: string
          total_earned_cents?: number
          total_withdrawn_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          steps: Json
          trigger: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          steps?: Json
          trigger: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          steps?: Json
          trigger?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: { _user_id: string }; Returns: string }
      get_image_credit_limit: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: number
      }
      get_image_credits_used_today: {
        Args: { _workspace_id: string }
        Returns: number
      }
      get_video_seconds_used_today: {
        Args: { _workspace_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_unlimited_user: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      match_kb_chunks: {
        Args: {
          match_count?: number
          match_workspace_id: string
          query_embedding: string
          similarity_threshold?: number
        }
        Returns: {
          content: string
          document_id: string
          document_title: string
          id: string
          similarity: number
        }[]
      }
      workspace_role_of: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: Database["public"]["Enums"]["workspace_role"]
      }
    }
    Enums: {
      account_type: "business" | "freelancer" | "ambassador"
      agent_presence:
        | "available"
        | "busy"
        | "away"
        | "offline"
        | "on_call"
        | "wrap_up"
      ai_message_role: "system" | "user" | "assistant" | "tool"
      app_role: "admin" | "business" | "freelancer" | "partner" | "owner"
      billing_cycle: "trial" | "monthly" | "quarterly" | "biannual" | "yearly"
      call_direction: "inbound" | "outbound" | "internal"
      call_event_type:
        | "ringing"
        | "answered"
        | "hold"
        | "unhold"
        | "mute"
        | "unmute"
        | "transfer"
        | "hangup"
        | "recording_start"
        | "recording_stop"
        | "note"
        | "ivr_input"
      call_status:
        | "ringing"
        | "answered"
        | "on_hold"
        | "transferred"
        | "ended"
        | "missed"
        | "voicemail"
        | "failed"
      campaign_status:
        | "draft"
        | "scheduled"
        | "running"
        | "completed"
        | "paused"
      channel_type: "whatsapp" | "telegram" | "email" | "sms" | "webchat"
      contact_status: "lead" | "qualified" | "customer" | "churned"
      conversation_status: "open" | "pending" | "resolved" | "closed"
      credit_kind: "image_gen" | "image_upload" | "video_gen" | "video_upload"
      deal_status: "open" | "won" | "lost"
      dialer_mode: "preview" | "progressive" | "predictive"
      dialer_status: "draft" | "running" | "paused" | "completed"
      donation_status: "pending" | "completed" | "failed" | "refunded"
      ivr_node_type:
        | "menu"
        | "play"
        | "collect"
        | "transfer"
        | "hangup"
        | "queue"
        | "voicemail"
      kb_source_type: "website" | "pdf" | "text" | "social"
      kb_status: "pending" | "processing" | "ready" | "failed"
      memory_scope: "workspace" | "business" | "contact"
      message_direction: "inbound" | "outbound"
      plan_tier: "start" | "growth" | "professional" | "enterprise"
      queue_strategy: "round_robin" | "longest_idle" | "skills_based"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "expired"
        | "blocked"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status: "new" | "open" | "pending" | "resolved" | "closed"
      wallet_tx_type:
        | "referral_commission"
        | "donation_received"
        | "withdrawal"
        | "adjustment"
      workspace_role: "owner" | "admin" | "member" | "viewer"
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
      account_type: ["business", "freelancer", "ambassador"],
      agent_presence: [
        "available",
        "busy",
        "away",
        "offline",
        "on_call",
        "wrap_up",
      ],
      ai_message_role: ["system", "user", "assistant", "tool"],
      app_role: ["admin", "business", "freelancer", "partner", "owner"],
      billing_cycle: ["trial", "monthly", "quarterly", "biannual", "yearly"],
      call_direction: ["inbound", "outbound", "internal"],
      call_event_type: [
        "ringing",
        "answered",
        "hold",
        "unhold",
        "mute",
        "unmute",
        "transfer",
        "hangup",
        "recording_start",
        "recording_stop",
        "note",
        "ivr_input",
      ],
      call_status: [
        "ringing",
        "answered",
        "on_hold",
        "transferred",
        "ended",
        "missed",
        "voicemail",
        "failed",
      ],
      campaign_status: ["draft", "scheduled", "running", "completed", "paused"],
      channel_type: ["whatsapp", "telegram", "email", "sms", "webchat"],
      contact_status: ["lead", "qualified", "customer", "churned"],
      conversation_status: ["open", "pending", "resolved", "closed"],
      credit_kind: ["image_gen", "image_upload", "video_gen", "video_upload"],
      deal_status: ["open", "won", "lost"],
      dialer_mode: ["preview", "progressive", "predictive"],
      dialer_status: ["draft", "running", "paused", "completed"],
      donation_status: ["pending", "completed", "failed", "refunded"],
      ivr_node_type: [
        "menu",
        "play",
        "collect",
        "transfer",
        "hangup",
        "queue",
        "voicemail",
      ],
      kb_source_type: ["website", "pdf", "text", "social"],
      kb_status: ["pending", "processing", "ready", "failed"],
      memory_scope: ["workspace", "business", "contact"],
      message_direction: ["inbound", "outbound"],
      plan_tier: ["start", "growth", "professional", "enterprise"],
      queue_strategy: ["round_robin", "longest_idle", "skills_based"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "expired",
        "blocked",
      ],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: ["new", "open", "pending", "resolved", "closed"],
      wallet_tx_type: [
        "referral_commission",
        "donation_received",
        "withdrawal",
        "adjustment",
      ],
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
