
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "addon_periods": {
                  Row: {
                    "addon_id": number,"details": string,"end_day": string | null,"id": number,"start_day": string
                  }
                  ComputedFields: never
                  Insert: {
                    "addon_id": number,"details"?: string,"end_day"?: string | null,"id"?: never,"start_day": string
                  }
                  Update: {
                    "addon_id"?: number,"details"?: string,"end_day"?: string | null,"id"?: never,"start_day"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "addon_periods_addon_id_fkey"
      columns: ["addon_id"]
isOneToOne: false
      referencedRelation: "addons"
      referencedColumns: ["id"]
    }
                  ]
                },"addons": {
                  Row: {
                    "created_at": string,"id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"name": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"day_marks": {
                  Row: {
                    "created_at": string,"day": string,"kind": Database["public"]['Enums']["day_mark_kind"],"reason": string | null,"resolved_via": Database["public"]['Enums']["resolved_via"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day": string,"kind": Database["public"]['Enums']["day_mark_kind"],"reason"?: string | null,"resolved_via"?: Database["public"]['Enums']["resolved_via"]
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"kind"?: Database["public"]['Enums']["day_mark_kind"],"reason"?: string | null,"resolved_via"?: Database["public"]['Enums']["resolved_via"]
                  }
                  Relationships: [
                    
                  ]
                },"exercise_aliases": {
                  Row: {
                    "alias": string,"exercise_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"exercise_id": number
                  }
                  Update: {
                    "alias"?: string,"exercise_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_aliases_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "archived": boolean,"created_at": string,"id": number,"is_bodyweight": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"is_bodyweight"?: boolean,"name": string
                  }
                  Update: {
                    "archived"?: boolean,"created_at"?: string,"id"?: never,"is_bodyweight"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"photos": {
                  Row: {
                    "day": string,"pose": Database["public"]['Enums']["photo_pose"],"storage_path": string,"taken_at": string,"thumb_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"pose": Database["public"]['Enums']["photo_pose"],"storage_path": string,"taken_at"?: string,"thumb_path": string
                  }
                  Update: {
                    "day"?: string,"pose"?: Database["public"]['Enums']["photo_pose"],"storage_path"?: string,"taken_at"?: string,"thumb_path"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sets": {
                  Row: {
                    "created_at": string,"day": string,"exercise_id": number,"id": number,"load_kg": number,"load_unit": Database["public"]['Enums']["weight_unit"],"load_value": number,"raw_input": string,"reps": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day": string,"exercise_id": number,"id"?: never,"load_kg"?: never,"load_unit": Database["public"]['Enums']["weight_unit"],"load_value": number,"raw_input": string,"reps": number
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"exercise_id"?: number,"id"?: never,"load_kg"?: never,"load_unit"?: Database["public"]['Enums']["weight_unit"],"load_value"?: number,"raw_input"?: string,"reps"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "sets_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "created_at": string,"owner_id": string,"rest_rule": Database["public"]['Enums']["rest_rule"],"rollover_hour": number,"singleton": boolean,"start_date": string,"time_zone": string,"unit": Database["public"]['Enums']["weight_unit"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"owner_id": string,"rest_rule"?: Database["public"]['Enums']["rest_rule"],"rollover_hour"?: number,"singleton"?: boolean,"start_date": string,"time_zone": string,"unit": Database["public"]['Enums']["weight_unit"]
                  }
                  Update: {
                    "created_at"?: string,"owner_id"?: string,"rest_rule"?: Database["public"]['Enums']["rest_rule"],"rollover_hour"?: number,"singleton"?: boolean,"start_date"?: string,"time_zone"?: string,"unit"?: Database["public"]['Enums']["weight_unit"]
                  }
                  Relationships: [
                    
                  ]
                },"weigh_ins": {
                  Row: {
                    "day": string,"flag": Database["public"]['Enums']["weigh_in_flag"] | null,"id": number,"kg": number,"measured_at": string,"source": Database["public"]['Enums']["weigh_in_source"],"unit": Database["public"]['Enums']["weight_unit"],"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"flag"?: Database["public"]['Enums']["weigh_in_flag"] | null,"id"?: never,"kg"?: never,"measured_at"?: string,"source": Database["public"]['Enums']["weigh_in_source"],"unit": Database["public"]['Enums']["weight_unit"],"value": number
                  }
                  Update: {
                    "day"?: string,"flag"?: Database["public"]['Enums']["weigh_in_flag"] | null,"id"?: never,"kg"?: never,"measured_at"?: string,"source"?: Database["public"]['Enums']["weigh_in_source"],"unit"?: Database["public"]['Enums']["weight_unit"],"value"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "trained_days": {
                  Row: {
                    "day": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "merge_exercises":
{ Args: { "source_id": number,"target_id": number }; Returns: undefined
                           },
"start_addon_period":
{ Args: { "new_details": string,"new_start_day": string,"target_addon_id": number }; Returns: undefined
                           },
"to_kg":
{ Args: { "unit": Database["public"]['Enums']["weight_unit"],"value": number }; Returns: number
                           },
"training_day":
{ Args: { "at": string,"rollover_hour": number,"time_zone": string }; Returns: string
                           }
          }
          Enums: {
            "day_mark_kind": "rest"|"skip","photo_pose": "front"|"back","resolved_via": "normal"|"lock","rest_rule": "six_of_seven"|"strict","weigh_in_flag": "duplicate"|"outlier","weigh_in_source": "scale"|"manual","weight_unit": "lb"|"kg"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "day_mark_kind": ["rest", "skip"],"photo_pose": ["front", "back"],"resolved_via": ["normal", "lock"],"rest_rule": ["six_of_seven", "strict"],"weigh_in_flag": ["duplicate", "outlier"],"weigh_in_source": ["scale", "manual"],"weight_unit": ["lb", "kg"]
          }
        }
} as const
