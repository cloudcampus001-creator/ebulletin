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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          id: string
          is_current: boolean
          label: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_current?: boolean
          label: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_current?: boolean
          label?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string | null
          class_teacher_id: string | null
          created_at: string
          id: string
          level: string
          marksheet_token: string
          name: string
          school_id: string
          stream: string | null
        }
        Insert: {
          academic_year_id?: string | null
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          level: string
          marksheet_token?: string
          name: string
          school_id: string
          stream?: string | null
        }
        Update: {
          academic_year_id?: string | null
          class_teacher_id?: string | null
          created_at?: string
          id?: string
          level?: string
          marksheet_token?: string
          name?: string
          school_id?: string
          stream?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      conduct_attendance: {
        Row: {
          absences_justified: number
          absences_unjustified: number
          conduct: string | null
          days_absent: number | null
          days_present: number | null
          id: string
          school_id: string
          sequence_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          absences_justified?: number
          absences_unjustified?: number
          conduct?: string | null
          days_absent?: number | null
          days_present?: number | null
          id?: string
          school_id: string
          sequence_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          absences_justified?: number
          absences_unjustified?: number
          conduct?: string | null
          days_absent?: number | null
          days_present?: number | null
          id?: string
          school_id?: string
          sequence_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conduct_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conduct_attendance_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conduct_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          entered_by_teacher_id: string | null
          id: string
          mark: number | null
          remark: string | null
          school_id: string
          sequence_id: string
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          entered_by_teacher_id?: string | null
          id?: string
          mark?: number | null
          remark?: string | null
          school_id: string
          sequence_id: string
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          entered_by_teacher_id?: string | null
          id?: string
          mark?: number | null
          remark?: string | null
          school_id?: string
          sequence_id?: string
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_entered_by_teacher_id_fkey"
            columns: ["entered_by_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
      remarks: {
        Row: {
          class_teacher_remark: string | null
          council_decision: string | null
          id: string
          principal_remark: string | null
          school_id: string
          sequence_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          class_teacher_remark?: string | null
          council_decision?: string | null
          id?: string
          principal_remark?: string | null
          school_id: string
          sequence_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          class_teacher_remark?: string | null
          council_decision?: string | null
          id?: string
          principal_remark?: string | null
          school_id?: string
          sequence_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "remarks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remarks_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remarks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["school_role"]
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["school_role"]
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["school_role"]
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          grade_bands: Json
          id: string
          language_default: string
          logo_url: string | null
          motto: string | null
          name: string
          subsystem: Database["public"]["Enums"]["subsystem"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          grade_bands?: Json
          id?: string
          language_default?: string
          logo_url?: string | null
          motto?: string | null
          name: string
          subsystem: Database["public"]["Enums"]["subsystem"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          grade_bands?: Json
          id?: string
          language_default?: string
          logo_url?: string | null
          motto?: string | null
          name?: string
          subsystem?: Database["public"]["Enums"]["subsystem"]
          updated_at?: string
        }
        Relationships: []
      }
      sequences: {
        Row: {
          academic_year_id: string
          created_at: string
          id: string
          index: number
          name: string
          school_id: string
          status: Database["public"]["Enums"]["sequence_status"]
          term_id: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          id?: string
          index: number
          name: string
          school_id: string
          status?: Database["public"]["Enums"]["sequence_status"]
          term_id: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          id?: string
          index?: number
          name?: string
          school_id?: string
          status?: Database["public"]["Enums"]["sequence_status"]
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequences_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_id: string
          created_at: string
          date_of_birth: string | null
          first_name: string
          id: string
          last_name: string
          matricule: string | null
          school_id: string
          sex: Database["public"]["Enums"]["student_sex"] | null
        }
        Insert: {
          class_id: string
          created_at?: string
          date_of_birth?: string | null
          first_name: string
          id?: string
          last_name: string
          matricule?: string | null
          school_id: string
          sex?: Database["public"]["Enums"]["student_sex"] | null
        }
        Update: {
          class_id?: string
          created_at?: string
          date_of_birth?: string | null
          first_name?: string
          id?: string
          last_name?: string
          matricule?: string | null
          school_id?: string
          sex?: Database["public"]["Enums"]["student_sex"] | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string
          coefficient: number
          created_at: string
          display_order: number
          id: string
          name: string
          school_id: string
        }
        Insert: {
          class_id: string
          coefficient?: number
          created_at?: string
          display_order?: number
          id?: string
          name: string
          school_id: string
        }
        Update: {
          class_id?: string
          coefficient?: number
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_login_limits: {
        Row: {
          failures: number
          first_at: string
          locked_until: string | null
          login_code: string
          school_id: string
        }
        Insert: {
          failures?: number
          first_at?: string
          locked_until?: string | null
          login_code: string
          school_id: string
        }
        Update: {
          failures?: number
          first_at?: string
          locked_until?: string | null
          login_code?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_login_limits_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          login_code: string
          password_hash: string
          school_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name: string
          id?: string
          login_code: string
          password_hash: string
          school_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          login_code?: string
          password_hash?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          academic_year_id: string
          id: string
          index: number
          name: string
          school_id: string
        }
        Insert: {
          academic_year_id: string
          id?: string
          index: number
          name: string
          school_id: string
        }
        Update: {
          academic_year_id?: string
          id?: string
          index?: number
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_school_role: {
        Args: {
          _roles: Database["public"]["Enums"]["school_role"][]
          _school_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_school_member: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      record_teacher_login_failure: {
        Args: { p_login_code: string; p_school_id: string }
        Returns: undefined
      }
    }
    Enums: {
      school_role: "admin" | "principal" | "class_teacher" | "subject_teacher"
      sequence_status: "open" | "closed"
      student_sex: "M" | "F"
      subsystem: "FR" | "EN"
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
      school_role: ["admin", "principal", "class_teacher", "subject_teacher"],
      sequence_status: ["open", "closed"],
      student_sex: ["M", "F"],
      subsystem: ["FR", "EN"],
    },
  },
} as const
