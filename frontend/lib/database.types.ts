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
      access_grants: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          module: Database["public"]["Enums"]["module_type"]
          note: string | null
          tenant_id: string
          user_id: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          module: Database["public"]["Enums"]["module_type"]
          note?: string | null
          tenant_id: string
          user_id: string
          valid_from?: string
          valid_until: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          module?: Database["public"]["Enums"]["module_type"]
          note?: string | null
          tenant_id?: string
          user_id?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      arbeitspapiere: {
        Row: {
          created_at: string
          created_by: string | null
          ergebnis: string | null
          ersteller_person_id: string | null
          erstellt_am: string | null
          handlung: string | null
          id: string
          inhalt: string | null
          nummer: string | null
          quelle: string | null
          review_am: string | null
          review_kommentar: string | null
          review_status: string
          reviewer_person_id: string | null
          schritt_id: string
          stichprobe: Json
          tenant_id: string
          titel: string
          typ: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ergebnis?: string | null
          ersteller_person_id?: string | null
          erstellt_am?: string | null
          handlung?: string | null
          id?: string
          inhalt?: string | null
          nummer?: string | null
          quelle?: string | null
          review_am?: string | null
          review_kommentar?: string | null
          review_status?: string
          reviewer_person_id?: string | null
          schritt_id: string
          stichprobe?: Json
          tenant_id: string
          titel: string
          typ?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ergebnis?: string | null
          ersteller_person_id?: string | null
          erstellt_am?: string | null
          handlung?: string | null
          id?: string
          inhalt?: string | null
          nummer?: string | null
          quelle?: string | null
          review_am?: string | null
          review_kommentar?: string | null
          review_status?: string
          reviewer_person_id?: string | null
          schritt_id?: string
          stichprobe?: Json
          tenant_id?: string
          titel?: string
          typ?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "arbeitspapiere_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbeitspapiere_ersteller_person_id_fkey"
            columns: ["ersteller_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbeitspapiere_reviewer_person_id_fkey"
            columns: ["reviewer_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbeitspapiere_schritt_id_fkey"
            columns: ["schritt_id"]
            isOneToOne: false
            referencedRelation: "pruefungsschritte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arbeitspapiere_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_handshakes: {
        Row: {
          confirmed_at: string | null
          decision_at: string | null
          decision_by: string | null
          decision_note: string | null
          dispute_reason: string | null
          disputed_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          module: Database["public"]["Enums"]["module_type"]
          proposed_at: string
          proposed_by: string
          status: Database["public"]["Enums"]["handshake_status"]
          target_person_id: string
          tenant_id: string
        }
        Insert: {
          confirmed_at?: string | null
          decision_at?: string | null
          decision_by?: string | null
          decision_note?: string | null
          dispute_reason?: string | null
          disputed_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          module: Database["public"]["Enums"]["module_type"]
          proposed_at?: string
          proposed_by: string
          status?: Database["public"]["Enums"]["handshake_status"]
          target_person_id: string
          tenant_id: string
        }
        Update: {
          confirmed_at?: string | null
          decision_at?: string | null
          decision_by?: string | null
          decision_note?: string | null
          dispute_reason?: string | null
          disputed_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          module?: Database["public"]["Enums"]["module_type"]
          proposed_at?: string
          proposed_by?: string
          status?: Database["public"]["Enums"]["handshake_status"]
          target_person_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_handshakes_decision_by_fkey"
            columns: ["decision_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_handshakes_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_handshakes_target_person_id_fkey"
            columns: ["target_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_handshakes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          module: Database["public"]["Enums"]["module_type"] | null
          new_value: Json | null
          occurred_at: string
          old_value: Json | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          module?: Database["public"]["Enums"]["module_type"] | null
          new_value?: Json | null
          occurred_at?: string
          old_value?: Json | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          module?: Database["public"]["Enums"]["module_type"] | null
          new_value?: Json | null
          occurred_at?: string
          old_value?: Json | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_plans: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: Json
          created_at: string
          created_by: string
          id: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          tenant_id: string
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          created_by: string
          id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id: string
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_plans_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auslagerung_vertragscheckliste: {
        Row: {
          auslagerung_id: string
          begruendung: string | null
          geprueft_am: string | null
          geprueft_von: string | null
          id: string
          punkt_code: string
          status: string
          tenant_id: string
        }
        Insert: {
          auslagerung_id: string
          begruendung?: string | null
          geprueft_am?: string | null
          geprueft_von?: string | null
          id?: string
          punkt_code: string
          status?: string
          tenant_id: string
        }
        Update: {
          auslagerung_id?: string
          begruendung?: string | null
          geprueft_am?: string | null
          geprueft_von?: string | null
          id?: string
          punkt_code?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auslagerung_vertragscheckliste_auslagerung_id_fkey"
            columns: ["auslagerung_id"]
            isOneToOne: false
            referencedRelation: "auslagerungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auslagerung_vertragscheckliste_geprueft_von_fkey"
            columns: ["geprueft_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auslagerung_vertragscheckliste_punkt_code_fkey"
            columns: ["punkt_code"]
            isOneToOne: false
            referencedRelation: "vertragscheckliste_katalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "auslagerung_vertragscheckliste_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      auslagerungen: {
        Row: {
          anbieter: string | null
          bezeichnung: string
          created_at: string
          created_by: string
          eingestuft_am: string | null
          eingestuft_von: string | null
          exit_strategie: Json
          id: string
          kategorie: string | null
          risikokriterien: Json
          status: string
          tenant_id: string
          vertragseigner_person_id: string | null
          wesentlichkeit: string | null
          wesentlichkeit_begruendung: string | null
        }
        Insert: {
          anbieter?: string | null
          bezeichnung: string
          created_at?: string
          created_by: string
          eingestuft_am?: string | null
          eingestuft_von?: string | null
          exit_strategie?: Json
          id?: string
          kategorie?: string | null
          risikokriterien?: Json
          status?: string
          tenant_id: string
          vertragseigner_person_id?: string | null
          wesentlichkeit?: string | null
          wesentlichkeit_begruendung?: string | null
        }
        Update: {
          anbieter?: string | null
          bezeichnung?: string
          created_at?: string
          created_by?: string
          eingestuft_am?: string | null
          eingestuft_von?: string | null
          exit_strategie?: Json
          id?: string
          kategorie?: string | null
          risikokriterien?: Json
          status?: string
          tenant_id?: string
          vertragseigner_person_id?: string | null
          wesentlichkeit?: string | null
          wesentlichkeit_begruendung?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auslagerungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auslagerungen_eingestuft_von_fkey"
            columns: ["eingestuft_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auslagerungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auslagerungen_vertragseigner_person_id_fkey"
            columns: ["vertragseigner_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      beauftragtenfunktionen: {
        Row: {
          anzeige_aufsicht: string | null
          bestellt_am: string | null
          created_at: string
          created_by: string | null
          funktion: string
          id: string
          inhaber_person_id: string | null
          rechtsgrundlage: string | null
          stellvertretung_person_id: string | null
          tenant_id: string
        }
        Insert: {
          anzeige_aufsicht?: string | null
          bestellt_am?: string | null
          created_at?: string
          created_by?: string | null
          funktion: string
          id?: string
          inhaber_person_id?: string | null
          rechtsgrundlage?: string | null
          stellvertretung_person_id?: string | null
          tenant_id: string
        }
        Update: {
          anzeige_aufsicht?: string | null
          bestellt_am?: string | null
          created_at?: string
          created_by?: string | null
          funktion?: string
          id?: string
          inhaber_person_id?: string | null
          rechtsgrundlage?: string | null
          stellvertretung_person_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beauftragtenfunktionen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beauftragtenfunktionen_inhaber_person_id_fkey"
            columns: ["inhaber_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beauftragtenfunktionen_stellvertretung_person_id_fkey"
            columns: ["stellvertretung_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beauftragtenfunktionen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      beratung_schulung: {
        Row: {
          adressat: string | null
          created_at: string
          created_by: string | null
          datum: string
          format: string | null
          id: string
          nachweis_id: string | null
          nachweis_text: string | null
          tenant_id: string
          thema: string
        }
        Insert: {
          adressat?: string | null
          created_at?: string
          created_by?: string | null
          datum: string
          format?: string | null
          id?: string
          nachweis_id?: string | null
          nachweis_text?: string | null
          tenant_id: string
          thema: string
        }
        Update: {
          adressat?: string | null
          created_at?: string
          created_by?: string | null
          datum?: string
          format?: string | null
          id?: string
          nachweis_id?: string | null
          nachweis_text?: string | null
          tenant_id?: string
          thema?: string
        }
        Relationships: [
          {
            foreignKeyName: "beratung_schulung_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beratung_schulung_nachweis_id_fkey"
            columns: ["nachweis_id"]
            isOneToOne: false
            referencedRelation: "nachweise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beratung_schulung_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_ratings: {
        Row: {
          begruendung: string | null
          created_at: string
          erfasst_am: string
          erfasst_von: string | null
          id: string
          periode: string
          rating: string
          tenant_id: string
        }
        Insert: {
          begruendung?: string | null
          created_at?: string
          erfasst_am?: string
          erfasst_von?: string | null
          id?: string
          periode: string
          rating: string
          tenant_id: string
        }
        Update: {
          begruendung?: string | null
          created_at?: string
          erfasst_am?: string
          erfasst_von?: string | null
          id?: string
          periode?: string
          rating?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_ratings_erfasst_von_fkey"
            columns: ["erfasst_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_ratings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      drafts: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string | null
          entity_type: string
          id: string
          module: Database["public"]["Enums"]["module_type"]
          payload: Json
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["draft_status"]
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_id?: string | null
          entity_type: string
          id?: string
          module: Database["public"]["Enums"]["module_type"]
          payload: Json
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["draft_status"]
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          module?: Database["public"]["Enums"]["module_type"]
          payload?: Json
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["draft_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ereignisse: {
        Row: {
          ausloeser: string
          beteiligung: string | null
          created_at: string
          created_by: string | null
          datum: string
          gegenstand: string | null
          id: string
          tenant_id: string
          votum: string | null
        }
        Insert: {
          ausloeser: string
          beteiligung?: string | null
          created_at?: string
          created_by?: string | null
          datum: string
          gegenstand?: string | null
          id?: string
          tenant_id: string
          votum?: string | null
        }
        Update: {
          ausloeser?: string
          beteiligung?: string | null
          created_at?: string
          created_by?: string | null
          datum?: string
          gegenstand?: string | null
          id?: string
          tenant_id?: string
          votum?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ereignisse_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ereignisse_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      erleichterungen: {
        Row: {
          aktenzeichen: string | null
          begruendung: string | null
          created_at: string
          created_by: string | null
          formal_erleichtert: boolean
          gegenstand: string
          gewaehrt_am: string | null
          gewaehrt_durch: string | null
          id: string
          materiell_erfuellt: boolean
          rechtsgrundlage: string | null
          reichweite: string | null
          tenant_id: string
          ueberpruefung: string | null
        }
        Insert: {
          aktenzeichen?: string | null
          begruendung?: string | null
          created_at?: string
          created_by?: string | null
          formal_erleichtert?: boolean
          gegenstand: string
          gewaehrt_am?: string | null
          gewaehrt_durch?: string | null
          id?: string
          materiell_erfuellt?: boolean
          rechtsgrundlage?: string | null
          reichweite?: string | null
          tenant_id: string
          ueberpruefung?: string | null
        }
        Update: {
          aktenzeichen?: string | null
          begruendung?: string | null
          created_at?: string
          created_by?: string | null
          formal_erleichtert?: boolean
          gegenstand?: string
          gewaehrt_am?: string | null
          gewaehrt_durch?: string | null
          id?: string
          materiell_erfuellt?: boolean
          rechtsgrundlage?: string | null
          reichweite?: string | null
          tenant_id?: string
          ueberpruefung?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erleichterungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erleichterungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feststellungen: {
        Row: {
          akzeptiertes_risiko_entscheider: string | null
          akzeptiertes_risiko_ueberpruefung: string | null
          beschreibung: string | null
          created_at: string
          created_by: string
          fachbereich_erledigt_am: string | null
          fachbereich_erledigt_von: string | null
          frist: string | null
          geschlossen_am: string | null
          geschlossen_von: string | null
          id: string
          massnahme: string | null
          norm_id: string | null
          quelle: string | null
          schweregrad: string | null
          status: string
          tenant_id: string
          titel: string
          verantwortlich_person_id: string | null
          wirksamkeit_bestaetigt_am: string | null
          wirksamkeit_bestaetigt_von: string | null
        }
        Insert: {
          akzeptiertes_risiko_entscheider?: string | null
          akzeptiertes_risiko_ueberpruefung?: string | null
          beschreibung?: string | null
          created_at?: string
          created_by: string
          fachbereich_erledigt_am?: string | null
          fachbereich_erledigt_von?: string | null
          frist?: string | null
          geschlossen_am?: string | null
          geschlossen_von?: string | null
          id?: string
          massnahme?: string | null
          norm_id?: string | null
          quelle?: string | null
          schweregrad?: string | null
          status?: string
          tenant_id: string
          titel: string
          verantwortlich_person_id?: string | null
          wirksamkeit_bestaetigt_am?: string | null
          wirksamkeit_bestaetigt_von?: string | null
        }
        Update: {
          akzeptiertes_risiko_entscheider?: string | null
          akzeptiertes_risiko_ueberpruefung?: string | null
          beschreibung?: string | null
          created_at?: string
          created_by?: string
          fachbereich_erledigt_am?: string | null
          fachbereich_erledigt_von?: string | null
          frist?: string | null
          geschlossen_am?: string | null
          geschlossen_von?: string | null
          id?: string
          massnahme?: string | null
          norm_id?: string | null
          quelle?: string | null
          schweregrad?: string | null
          status?: string
          tenant_id?: string
          titel?: string
          verantwortlich_person_id?: string | null
          wirksamkeit_bestaetigt_am?: string | null
          wirksamkeit_bestaetigt_von?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feststellungen_akzeptiertes_risiko_entscheider_fkey"
            columns: ["akzeptiertes_risiko_entscheider"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feststellungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feststellungen_fachbereich_erledigt_von_fkey"
            columns: ["fachbereich_erledigt_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feststellungen_geschlossen_von_fkey"
            columns: ["geschlossen_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feststellungen_norm_id_fkey"
            columns: ["norm_id"]
            isOneToOne: false
            referencedRelation: "normen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feststellungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feststellungen_verantwortlich_person_id_fkey"
            columns: ["verantwortlich_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feststellungen_wirksamkeit_bestaetigt_von_fkey"
            columns: ["wirksamkeit_bestaetigt_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      funktionswechsel: {
        Row: {
          anzeige_aufsicht: string | null
          beschluss: string | null
          bisher_text: string | null
          created_at: string
          created_by: string | null
          datum: string
          funktion_id: string | null
          id: string
          neu_person_id: string | null
          tenant_id: string
        }
        Insert: {
          anzeige_aufsicht?: string | null
          beschluss?: string | null
          bisher_text?: string | null
          created_at?: string
          created_by?: string | null
          datum: string
          funktion_id?: string | null
          id?: string
          neu_person_id?: string | null
          tenant_id: string
        }
        Update: {
          anzeige_aufsicht?: string | null
          beschluss?: string | null
          bisher_text?: string | null
          created_at?: string
          created_by?: string | null
          datum?: string
          funktion_id?: string | null
          id?: string
          neu_person_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funktionswechsel_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funktionswechsel_funktion_id_fkey"
            columns: ["funktion_id"]
            isOneToOne: false
            referencedRelation: "beauftragtenfunktionen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funktionswechsel_neu_person_id_fkey"
            columns: ["neu_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funktionswechsel_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      governance_settings: {
        Row: {
          interessenkonflikt_massnahmen: string | null
          kombination_rationale: string | null
          ressourcenausstattung: string | null
          sonderfall_kleines_institut: boolean
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          interessenkonflikt_massnahmen?: string | null
          kombination_rationale?: string | null
          ressourcenausstattung?: string | null
          sonderfall_kleines_institut?: boolean
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          interessenkonflikt_massnahmen?: string | null
          kombination_rationale?: string | null
          ressourcenausstattung?: string | null
          sonderfall_kleines_institut?: boolean
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "governance_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      gremien_zulieferungen: {
        Row: {
          bezeichnung: string
          created_at: string
          created_by: string | null
          grundlage: string | null
          id: string
          letzter_eingang: string | null
          tenant_id: string
          turnus: string | null
          typ: string
        }
        Insert: {
          bezeichnung: string
          created_at?: string
          created_by?: string | null
          grundlage?: string | null
          id?: string
          letzter_eingang?: string | null
          tenant_id: string
          turnus?: string | null
          typ: string
        }
        Update: {
          bezeichnung?: string
          created_at?: string
          created_by?: string | null
          grundlage?: string | null
          id?: string
          letzter_eingang?: string | null
          tenant_id?: string
          turnus?: string | null
          typ?: string
        }
        Relationships: [
          {
            foreignKeyName: "gremien_zulieferungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gremien_zulieferungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      institutsgroessenklasse: {
        Row: {
          begruendung: string | null
          bestaetigt_am: string | null
          bestaetigt_von: string | null
          groessenklasse: string
          tenant_id: string
          vorgeschlagen_am: string
          vorgeschlagen_von: string
        }
        Insert: {
          begruendung?: string | null
          bestaetigt_am?: string | null
          bestaetigt_von?: string | null
          groessenklasse: string
          tenant_id: string
          vorgeschlagen_am?: string
          vorgeschlagen_von: string
        }
        Update: {
          begruendung?: string | null
          bestaetigt_am?: string | null
          bestaetigt_von?: string | null
          groessenklasse?: string
          tenant_id?: string
          vorgeschlagen_am?: string
          vorgeschlagen_von?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutsgroessenklasse_bestaetigt_von_fkey"
            columns: ["bestaetigt_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutsgroessenklasse_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutsgroessenklasse_vorgeschlagen_von_fkey"
            columns: ["vorgeschlagen_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      kontrollen: {
        Row: {
          autor_person_id: string | null
          created_at: string
          created_by: string | null
          freigegeben_am: string | null
          freigegeben_von_person_id: string | null
          id: string
          letzte_durchfuehrung: string | null
          naechste_faelligkeit: string | null
          norm_id: string | null
          prozess: string | null
          tenant_id: string
          turnus: string | null
          verantwortlich_person_id: string | null
          verfahren: string
          wirksamkeit: string
        }
        Insert: {
          autor_person_id?: string | null
          created_at?: string
          created_by?: string | null
          freigegeben_am?: string | null
          freigegeben_von_person_id?: string | null
          id?: string
          letzte_durchfuehrung?: string | null
          naechste_faelligkeit?: string | null
          norm_id?: string | null
          prozess?: string | null
          tenant_id: string
          turnus?: string | null
          verantwortlich_person_id?: string | null
          verfahren: string
          wirksamkeit?: string
        }
        Update: {
          autor_person_id?: string | null
          created_at?: string
          created_by?: string | null
          freigegeben_am?: string | null
          freigegeben_von_person_id?: string | null
          id?: string
          letzte_durchfuehrung?: string | null
          naechste_faelligkeit?: string | null
          norm_id?: string | null
          prozess?: string | null
          tenant_id?: string
          turnus?: string | null
          verantwortlich_person_id?: string | null
          verfahren?: string
          wirksamkeit?: string
        }
        Relationships: [
          {
            foreignKeyName: "kontrollen_autor_person_id_fkey"
            columns: ["autor_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrollen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrollen_freigegeben_von_person_id_fkey"
            columns: ["freigegeben_von_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrollen_norm_id_fkey"
            columns: ["norm_id"]
            isOneToOne: false
            referencedRelation: "normen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrollen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kontrollen_verantwortlich_person_id_fkey"
            columns: ["verantwortlich_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      nachweise: {
        Row: {
          aufbewahrungsfrist: string | null
          dateiname: string
          entity_id: string
          entity_type: string
          file_ref: string | null
          hash: string | null
          id: string
          module: Database["public"]["Enums"]["module_type"]
          previous_version_id: string | null
          tenant_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          aufbewahrungsfrist?: string | null
          dateiname: string
          entity_id: string
          entity_type: string
          file_ref?: string | null
          hash?: string | null
          id?: string
          module: Database["public"]["Enums"]["module_type"]
          previous_version_id?: string | null
          tenant_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          aufbewahrungsfrist?: string | null
          dateiname?: string
          entity_id?: string
          entity_type?: string
          file_ref?: string | null
          hash?: string | null
          id?: string
          module?: Database["public"]["Enums"]["module_type"]
          previous_version_id?: string | null
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "nachweise_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "nachweise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachweise_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nachweise_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      norm_risiken: {
        Row: {
          norm_id: string
          risiko_id: string
        }
        Insert: {
          norm_id: string
          risiko_id: string
        }
        Update: {
          norm_id?: string
          risiko_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "norm_risiken_norm_id_fkey"
            columns: ["norm_id"]
            isOneToOne: false
            referencedRelation: "normen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norm_risiken_risiko_id_fkey"
            columns: ["risiko_id"]
            isOneToOne: false
            referencedRelation: "risiken"
            referencedColumns: ["id"]
          },
        ]
      }
      normen: {
        Row: {
          bezeichnung: string
          created_at: string
          created_by: string
          fachbereich_person_id: string | null
          id: string
          personalunion: boolean
          quelle: string | null
          relevanz: string
          relevanz_begruendung: string | null
          relevanz_uebersteuert: boolean
          risiko: string | null
          sachgebiet: string | null
          stand: string | null
          status: string
          tenant_id: string
          wesentlichkeit: string | null
          wesentlichkeit_begruendung: string | null
        }
        Insert: {
          bezeichnung: string
          created_at?: string
          created_by: string
          fachbereich_person_id?: string | null
          id?: string
          personalunion?: boolean
          quelle?: string | null
          relevanz: string
          relevanz_begruendung?: string | null
          relevanz_uebersteuert?: boolean
          risiko?: string | null
          sachgebiet?: string | null
          stand?: string | null
          status?: string
          tenant_id: string
          wesentlichkeit?: string | null
          wesentlichkeit_begruendung?: string | null
        }
        Update: {
          bezeichnung?: string
          created_at?: string
          created_by?: string
          fachbereich_person_id?: string | null
          id?: string
          personalunion?: boolean
          quelle?: string | null
          relevanz?: string
          relevanz_begruendung?: string | null
          relevanz_uebersteuert?: boolean
          risiko?: string | null
          sachgebiet?: string | null
          stand?: string | null
          status?: string
          tenant_id?: string
          wesentlichkeit?: string | null
          wesentlichkeit_begruendung?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "normen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normen_fachbereich_person_id_fkey"
            columns: ["fachbereich_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      persons: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          org_unit: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          org_unit?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          org_unit?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_documents: {
        Row: {
          effective_from: string | null
          file_ref: string | null
          id: string
          kind: string
          module: Database["public"]["Enums"]["module_type"]
          previous_version_id: string | null
          tenant_id: string
          title: string
          uploaded_at: string
          uploaded_by: string
          version: string
        }
        Insert: {
          effective_from?: string | null
          file_ref?: string | null
          id?: string
          kind: string
          module: Database["public"]["Enums"]["module_type"]
          previous_version_id?: string | null
          tenant_id: string
          title: string
          uploaded_at?: string
          uploaded_by: string
          version: string
        }
        Update: {
          effective_from?: string | null
          file_ref?: string | null
          id?: string
          kind?: string
          module?: Database["public"]["Enums"]["module_type"]
          previous_version_id?: string | null
          tenant_id?: string
          title?: string
          uploaded_at?: string
          uploaded_by?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_documents_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "policy_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      pruefung_zuweisungen: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          person_id: string
          pruefung_id: string
          role: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          person_id: string
          pruefung_id: string
          role: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          person_id?: string
          pruefung_id?: string
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pruefung_zuweisungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefung_zuweisungen_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefung_zuweisungen_pruefung_id_fkey"
            columns: ["pruefung_id"]
            isOneToOne: false
            referencedRelation: "pruefungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefung_zuweisungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pruefungen: {
        Row: {
          actual_days: number
          budget_days: number
          created_at: string
          created_by: string | null
          durchfuehrung: string
          extern_ablage: string | null
          extern_dienstleister: string | null
          extern_einsicht: Json
          id: string
          overall_rating: string | null
          period_from: string | null
          period_to: string | null
          prepared_by: string | null
          presented_date: string | null
          presented_to: string | null
          pruefungsobjekt_id: string
          qs_checkliste: Json
          qs_completed_at: string | null
          qs_completed_by: string | null
          qs_reviewed_at: string | null
          qs_reviewed_by: string | null
          report_date: string | null
          status: string
          subject: string
          tenant_id: string
          workpaper_ref: string | null
        }
        Insert: {
          actual_days?: number
          budget_days?: number
          created_at?: string
          created_by?: string | null
          durchfuehrung?: string
          extern_ablage?: string | null
          extern_dienstleister?: string | null
          extern_einsicht?: Json
          id?: string
          overall_rating?: string | null
          period_from?: string | null
          period_to?: string | null
          prepared_by?: string | null
          presented_date?: string | null
          presented_to?: string | null
          pruefungsobjekt_id: string
          qs_checkliste?: Json
          qs_completed_at?: string | null
          qs_completed_by?: string | null
          qs_reviewed_at?: string | null
          qs_reviewed_by?: string | null
          report_date?: string | null
          status?: string
          subject: string
          tenant_id: string
          workpaper_ref?: string | null
        }
        Update: {
          actual_days?: number
          budget_days?: number
          created_at?: string
          created_by?: string | null
          durchfuehrung?: string
          extern_ablage?: string | null
          extern_dienstleister?: string | null
          extern_einsicht?: Json
          id?: string
          overall_rating?: string | null
          period_from?: string | null
          period_to?: string | null
          prepared_by?: string | null
          presented_date?: string | null
          presented_to?: string | null
          pruefungsobjekt_id?: string
          qs_checkliste?: Json
          qs_completed_at?: string | null
          qs_completed_by?: string | null
          qs_reviewed_at?: string | null
          qs_reviewed_by?: string | null
          report_date?: string | null
          status?: string
          subject?: string
          tenant_id?: string
          workpaper_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pruefungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungen_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungen_pruefungsobjekt_id_fkey"
            columns: ["pruefungsobjekt_id"]
            isOneToOne: false
            referencedRelation: "pruefungsobjekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungen_qs_completed_by_fkey"
            columns: ["qs_completed_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungen_qs_reviewed_by_fkey"
            columns: ["qs_reviewed_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pruefungsobjekte: {
        Row: {
          bereich: string | null
          bezeichnung: string
          category: string | null
          created_at: string
          created_by: string
          id: string
          last_audit_date: string | null
          materiality: string
          outsourced: boolean
          plan_year: number | null
          reg_anker: string | null
          risikokriterien: Json
          risk_rationale: Json
          risk_review_date: string | null
          risk_review_reviewer_person_id: string | null
          status: string
          tenant_id: string
          verantwortlicher_person_id: string | null
        }
        Insert: {
          bereich?: string | null
          bezeichnung: string
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_audit_date?: string | null
          materiality?: string
          outsourced?: boolean
          plan_year?: number | null
          reg_anker?: string | null
          risikokriterien?: Json
          risk_rationale?: Json
          risk_review_date?: string | null
          risk_review_reviewer_person_id?: string | null
          status?: string
          tenant_id: string
          verantwortlicher_person_id?: string | null
        }
        Update: {
          bereich?: string | null
          bezeichnung?: string
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_audit_date?: string | null
          materiality?: string
          outsourced?: boolean
          plan_year?: number | null
          reg_anker?: string | null
          risikokriterien?: Json
          risk_rationale?: Json
          risk_review_date?: string | null
          risk_review_reviewer_person_id?: string | null
          status?: string
          tenant_id?: string
          verantwortlicher_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pruefungsobjekte_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungsobjekte_risk_review_reviewer_person_id_fkey"
            columns: ["risk_review_reviewer_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungsobjekte_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungsobjekte_verantwortlicher_person_id_fkey"
            columns: ["verantwortlicher_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      pruefungsschritte: {
        Row: {
          bereich: string | null
          beurteilung: string
          created_at: string
          created_by: string | null
          ergebnis: string | null
          handlung: string | null
          id: string
          nummer: number
          pruefung_id: string
          risiko: string | null
          soll_aussage: string | null
          tenant_id: string
          testschritte: string | null
        }
        Insert: {
          bereich?: string | null
          beurteilung?: string
          created_at?: string
          created_by?: string | null
          ergebnis?: string | null
          handlung?: string | null
          id?: string
          nummer?: number
          pruefung_id: string
          risiko?: string | null
          soll_aussage?: string | null
          tenant_id: string
          testschritte?: string | null
        }
        Update: {
          bereich?: string | null
          beurteilung?: string
          created_at?: string
          created_by?: string | null
          ergebnis?: string | null
          handlung?: string | null
          id?: string
          nummer?: number
          pruefung_id?: string
          risiko?: string | null
          soll_aussage?: string | null
          tenant_id?: string
          testschritte?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pruefungsschritte_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungsschritte_pruefung_id_fkey"
            columns: ["pruefung_id"]
            isOneToOne: false
            referencedRelation: "pruefungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pruefungsschritte_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quellen: {
        Row: {
          bezeichnung: string
          bezugsweg: string | null
          created_at: string
          created_by: string | null
          id: string
          letzte_durchsicht: string | null
          tenant_id: string
          turnus: string | null
          verantwortlich_person_id: string | null
        }
        Insert: {
          bezeichnung: string
          bezugsweg?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          letzte_durchsicht?: string | null
          tenant_id: string
          turnus?: string | null
          verantwortlich_person_id?: string | null
        }
        Update: {
          bezeichnung?: string
          bezugsweg?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          letzte_durchsicht?: string | null
          tenant_id?: string
          turnus?: string | null
          verantwortlich_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quellen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quellen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quellen_verantwortlich_person_id_fkey"
            columns: ["verantwortlich_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      regulatorische_aenderungen: {
        Row: {
          created_at: string
          created_by: string | null
          disposition: string
          erfasst_am: string
          gegenstand: string
          id: string
          inkrafttreten: string | null
          kritikalitaet: string | null
          quelle_id: string | null
          tenant_id: string
          zugewiesen_an_person_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disposition?: string
          erfasst_am?: string
          gegenstand: string
          id?: string
          inkrafttreten?: string | null
          kritikalitaet?: string | null
          quelle_id?: string | null
          tenant_id: string
          zugewiesen_an_person_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disposition?: string
          erfasst_am?: string
          gegenstand?: string
          id?: string
          inkrafttreten?: string | null
          kritikalitaet?: string | null
          quelle_id?: string | null
          tenant_id?: string
          zugewiesen_an_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatorische_aenderungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatorische_aenderungen_quelle_id_fkey"
            columns: ["quelle_id"]
            isOneToOne: false
            referencedRelation: "quellen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatorische_aenderungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatorische_aenderungen_zugewiesen_an_person_id_fkey"
            columns: ["zugewiesen_an_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: Json
          created_at: string
          created_by: string
          finalized_at: string | null
          id: string
          kenntnisnahme_at: string | null
          kenntnisnahme_by: string | null
          module: Database["public"]["Enums"]["module_type"]
          period_from: string | null
          period_to: string | null
          report_type: string
          status: string
          tenant_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by: string
          finalized_at?: string | null
          id?: string
          kenntnisnahme_at?: string | null
          kenntnisnahme_by?: string | null
          module: Database["public"]["Enums"]["module_type"]
          period_from?: string | null
          period_to?: string | null
          report_type: string
          status?: string
          tenant_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string
          finalized_at?: string | null
          id?: string
          kenntnisnahme_at?: string | null
          kenntnisnahme_by?: string | null
          module?: Database["public"]["Enums"]["module_type"]
          period_from?: string | null
          period_to?: string | null
          report_type?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_kenntnisnahme_by_fkey"
            columns: ["kenntnisnahme_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_einstellungen: {
        Row: {
          angemessene_zeit_tage: number
          conflict_measures: string | null
          direct_subordination: boolean
          disproportionality_reason: string | null
          head_of_audit_person_id: string | null
          independence_confirmed: boolean
          org_form: string
          qs_intervall_monate: number
          risiko_review_intervall_monate: number
          severity_settings: Json
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          angemessene_zeit_tage?: number
          conflict_measures?: string | null
          direct_subordination?: boolean
          disproportionality_reason?: string | null
          head_of_audit_person_id?: string | null
          independence_confirmed?: boolean
          org_form?: string
          qs_intervall_monate?: number
          risiko_review_intervall_monate?: number
          severity_settings?: Json
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          angemessene_zeit_tage?: number
          conflict_measures?: string | null
          direct_subordination?: boolean
          disproportionality_reason?: string | null
          head_of_audit_person_id?: string | null
          independence_confirmed?: boolean
          org_form?: string
          qs_intervall_monate?: number
          risiko_review_intervall_monate?: number
          severity_settings?: Json
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revision_einstellungen_head_of_audit_person_id_fkey"
            columns: ["head_of_audit_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_einstellungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_einstellungen_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_gl_mitteilungen: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          decision: string
          id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          decision: string
          id?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          decision?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_gl_mitteilungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_gl_mitteilungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_personal: {
        Row: {
          advisory_active: boolean
          advisory_safeguard: string | null
          non_audit_tasks: string | null
          person_id: string
          qualifikation: string | null
          soll_fortbildung_tage: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          advisory_active?: boolean
          advisory_safeguard?: string | null
          non_audit_tasks?: string | null
          person_id: string
          qualifikation?: string | null
          soll_fortbildung_tage?: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          advisory_active?: boolean
          advisory_safeguard?: string | null
          non_audit_tasks?: string | null
          person_id?: string
          qualifikation?: string | null
          soll_fortbildung_tage?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revision_personal_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_personal_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_personal_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_projektbegleitung: {
        Row: {
          access_granted: boolean
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          ir_contact_person_id: string | null
          name: string
          notes: string | null
          role: string
          start_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          access_granted?: boolean
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          ir_contact_person_id?: string | null
          name: string
          notes?: string | null
          role?: string
          start_date?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          access_granted?: boolean
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          ir_contact_person_id?: string | null
          name?: string
          notes?: string | null
          role?: string
          start_date?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_projektbegleitung_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_projektbegleitung_ir_contact_person_id_fkey"
            columns: ["ir_contact_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_projektbegleitung_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_qualitaetssicherung: {
        Row: {
          anlass: string | null
          created_at: string
          created_by: string | null
          date: string
          id: string
          next_due: string | null
          result: string | null
          reviewer: string | null
          scope: Json
          tenant_id: string
          type: string
        }
        Insert: {
          anlass?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          next_due?: string | null
          result?: string | null
          reviewer?: string | null
          scope?: Json
          tenant_id: string
          type?: string
        }
        Update: {
          anlass?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          next_due?: string | null
          result?: string | null
          reviewer?: string | null
          scope?: Json
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_qualitaetssicherung_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_qualitaetssicherung_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_schulungen: {
        Row: {
          created_at: string
          created_by: string | null
          datum: string | null
          id: string
          nachweis_id: string | null
          nachweis_text: string | null
          person_id: string
          tenant_id: string
          titel: string
          umfang: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          datum?: string | null
          id?: string
          nachweis_id?: string | null
          nachweis_text?: string | null
          person_id: string
          tenant_id: string
          titel: string
          umfang?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          datum?: string | null
          id?: string
          nachweis_id?: string | null
          nachweis_text?: string | null
          person_id?: string
          tenant_id?: string
          titel?: string
          umfang?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "revision_schulungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_schulungen_nachweis_id_fkey"
            columns: ["nachweis_id"]
            isOneToOne: false
            referencedRelation: "nachweise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_schulungen_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_schulungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_sonderauftraege: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          ordered_by: string | null
          reason: string | null
          subject: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          ordered_by?: string | null
          reason?: string | null
          subject: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          ordered_by?: string | null
          reason?: string | null
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_sonderauftraege_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_sonderauftraege_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_sonderwissen: {
        Row: {
          created_at: string
          created_by: string | null
          duration_text: string | null
          from_unit: string | null
          id: string
          name: string | null
          person_id: string | null
          pruefung_id: string | null
          tenant_id: string
          topic: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_text?: string | null
          from_unit?: string | null
          id?: string
          name?: string | null
          person_id?: string | null
          pruefung_id?: string | null
          tenant_id: string
          topic?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_text?: string | null
          from_unit?: string | null
          id?: string
          name?: string | null
          person_id?: string | null
          pruefung_id?: string | null
          tenant_id?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revision_sonderwissen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_sonderwissen_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_sonderwissen_pruefung_id_fkey"
            columns: ["pruefung_id"]
            isOneToOne: false
            referencedRelation: "pruefungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_sonderwissen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_sperrfristen: {
        Row: {
          bar_end_date: string | null
          barred_areas: string | null
          created_at: string
          created_by: string | null
          deviation: boolean
          deviation_reason: string | null
          from_unit: string | null
          id: string
          name: string | null
          person_id: string | null
          tenant_id: string
          transfer_date: string | null
        }
        Insert: {
          bar_end_date?: string | null
          barred_areas?: string | null
          created_at?: string
          created_by?: string | null
          deviation?: boolean
          deviation_reason?: string | null
          from_unit?: string | null
          id?: string
          name?: string | null
          person_id?: string | null
          tenant_id: string
          transfer_date?: string | null
        }
        Update: {
          bar_end_date?: string | null
          barred_areas?: string | null
          created_at?: string
          created_by?: string | null
          deviation?: boolean
          deviation_reason?: string | null
          from_unit?: string | null
          id?: string
          name?: string | null
          person_id?: string | null
          tenant_id?: string
          transfer_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revision_sperrfristen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_sperrfristen_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_sperrfristen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_zugriffsvorfaelle: {
        Row: {
          area: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          escalated_to: string | null
          id: string
          resolved_date: string | null
          tenant_id: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          escalated_to?: string | null
          id?: string
          resolved_date?: string | null
          tenant_id: string
        }
        Update: {
          area?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          escalated_to?: string | null
          id?: string
          resolved_date?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_zugriffsvorfaelle_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_zugriffsvorfaelle_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revisionsfeststellung_fristverlaengerungen: {
        Row: {
          alt: string | null
          antragsteller: string | null
          begruendung: string | null
          created_at: string
          created_by: string | null
          datum: string
          feststellung_id: string
          genehmiger: string | null
          id: string
          neu: string
          tenant_id: string
        }
        Insert: {
          alt?: string | null
          antragsteller?: string | null
          begruendung?: string | null
          created_at?: string
          created_by?: string | null
          datum?: string
          feststellung_id: string
          genehmiger?: string | null
          id?: string
          neu: string
          tenant_id: string
        }
        Update: {
          alt?: string | null
          antragsteller?: string | null
          begruendung?: string | null
          created_at?: string
          created_by?: string | null
          datum?: string
          feststellung_id?: string
          genehmiger?: string | null
          id?: string
          neu?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revisionsfeststellung_fristverlaengerungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellung_fristverlaengerungen_feststellung_id_fkey"
            columns: ["feststellung_id"]
            isOneToOne: false
            referencedRelation: "revisionsbericht_feststellungen"
            referencedColumns: ["feststellung_id"]
          },
          {
            foreignKeyName: "revisionsfeststellung_fristverlaengerungen_feststellung_id_fkey"
            columns: ["feststellung_id"]
            isOneToOne: false
            referencedRelation: "revisionsfeststellungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellung_fristverlaengerungen_genehmiger_fkey"
            columns: ["genehmiger"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellung_fristverlaengerungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revisionsfeststellungen: {
        Row: {
          abschluss: Json
          abschluss_art: string | null
          beschreibung: string | null
          created_at: string
          created_by: string
          escalation: Json
          exec_escalation: Json
          executive_target: boolean
          frist_urspruenglich: string | null
          geschlossen_am: string | null
          geschlossen_von: string | null
          id: string
          massnahme_erledigt_am: string | null
          massnahme_erledigt_von: string | null
          nachschau_date: string | null
          nachschau_needed: boolean
          pruefung_id: string | null
          pruefungsobjekt_id: string
          schweregrad: string | null
          status: string
          stellungnahme: Json
          tenant_id: string
          titel: string
          verantwortlich_person_id: string | null
        }
        Insert: {
          abschluss?: Json
          abschluss_art?: string | null
          beschreibung?: string | null
          created_at?: string
          created_by: string
          escalation?: Json
          exec_escalation?: Json
          executive_target?: boolean
          frist_urspruenglich?: string | null
          geschlossen_am?: string | null
          geschlossen_von?: string | null
          id?: string
          massnahme_erledigt_am?: string | null
          massnahme_erledigt_von?: string | null
          nachschau_date?: string | null
          nachschau_needed?: boolean
          pruefung_id?: string | null
          pruefungsobjekt_id: string
          schweregrad?: string | null
          status?: string
          stellungnahme?: Json
          tenant_id: string
          titel: string
          verantwortlich_person_id?: string | null
        }
        Update: {
          abschluss?: Json
          abschluss_art?: string | null
          beschreibung?: string | null
          created_at?: string
          created_by?: string
          escalation?: Json
          exec_escalation?: Json
          executive_target?: boolean
          frist_urspruenglich?: string | null
          geschlossen_am?: string | null
          geschlossen_von?: string | null
          id?: string
          massnahme_erledigt_am?: string | null
          massnahme_erledigt_von?: string | null
          nachschau_date?: string | null
          nachschau_needed?: boolean
          pruefung_id?: string | null
          pruefungsobjekt_id?: string
          schweregrad?: string | null
          status?: string
          stellungnahme?: Json
          tenant_id?: string
          titel?: string
          verantwortlich_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisionsfeststellungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellungen_geschlossen_von_fkey"
            columns: ["geschlossen_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellungen_massnahme_erledigt_von_fkey"
            columns: ["massnahme_erledigt_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellungen_pruefung_id_fkey"
            columns: ["pruefung_id"]
            isOneToOne: false
            referencedRelation: "pruefungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellungen_pruefungsobjekt_id_fkey"
            columns: ["pruefungsobjekt_id"]
            isOneToOne: false
            referencedRelation: "pruefungsobjekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellungen_verantwortlich_person_id_fkey"
            columns: ["verantwortlich_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      risiken: {
        Row: {
          auswirkung: string | null
          bezeichnung: string
          created_at: string
          created_by: string | null
          eintrittswahrscheinlichkeit: string | null
          id: string
          inhaerent: string | null
          kontrollbewertung: string | null
          massnahme: string | null
          nr: number
          restrisiko: string | null
          tenant_id: string
          verantwortlich_person_id: string | null
        }
        Insert: {
          auswirkung?: string | null
          bezeichnung: string
          created_at?: string
          created_by?: string | null
          eintrittswahrscheinlichkeit?: string | null
          id?: string
          inhaerent?: string | null
          kontrollbewertung?: string | null
          massnahme?: string | null
          nr: number
          restrisiko?: string | null
          tenant_id: string
          verantwortlich_person_id?: string | null
        }
        Update: {
          auswirkung?: string | null
          bezeichnung?: string
          created_at?: string
          created_by?: string | null
          eintrittswahrscheinlichkeit?: string | null
          id?: string
          inhaerent?: string | null
          kontrollbewertung?: string | null
          massnahme?: string | null
          nr?: number
          restrisiko?: string | null
          tenant_id?: string
          verantwortlich_person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risiken_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risiken_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risiken_verantwortlich_person_id_fkey"
            columns: ["verantwortlich_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      risiko_kontrollen: {
        Row: {
          kontrolle_id: string
          risiko_id: string
        }
        Insert: {
          kontrolle_id: string
          risiko_id: string
        }
        Update: {
          kontrolle_id?: string
          risiko_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risiko_kontrollen_kontrolle_id_fkey"
            columns: ["kontrolle_id"]
            isOneToOne: false
            referencedRelation: "kontrollen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risiko_kontrollen_risiko_id_fkey"
            columns: ["risiko_id"]
            isOneToOne: false
            referencedRelation: "risiken"
            referencedColumns: ["id"]
          },
        ]
      }
      role_assignments: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          module: Database["public"]["Enums"]["module_type"] | null
          note: string | null
          person_id: string
          role: Database["public"]["Enums"]["internal_role"]
          tenant_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          module?: Database["public"]["Enums"]["module_type"] | null
          note?: string | null
          person_id: string
          role: Database["public"]["Enums"]["internal_role"]
          tenant_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          module?: Database["public"]["Enums"]["module_type"] | null
          note?: string | null
          person_id?: string
          role?: Database["public"]["Enums"]["internal_role"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stellenbeschreibungen: {
        Row: {
          created_at: string
          created_by: string | null
          dokument: string
          fassung: string | null
          file_ref: string | null
          genehmigt_am: string | null
          genehmigt_durch_person_id: string | null
          id: string
          naechste_ueberpruefung: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dokument: string
          fassung?: string | null
          file_ref?: string | null
          genehmigt_am?: string | null
          genehmigt_durch_person_id?: string | null
          id?: string
          naechste_ueberpruefung?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dokument?: string
          fassung?: string | null
          file_ref?: string | null
          genehmigt_am?: string | null
          genehmigt_durch_person_id?: string | null
          id?: string
          naechste_ueberpruefung?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stellenbeschreibungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stellenbeschreibungen_genehmigt_durch_person_id_fkey"
            columns: ["genehmigt_durch_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stellenbeschreibungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ueberwachungshandlungen: {
        Row: {
          bezeichnung: string
          created_at: string
          created_by: string
          durchgefuehrt_am: string | null
          durchgefuehrt_von: string | null
          faelligkeit: string | null
          id: string
          norm_id: string
          status: string
          tenant_id: string
          turnus: string | null
        }
        Insert: {
          bezeichnung: string
          created_at?: string
          created_by: string
          durchgefuehrt_am?: string | null
          durchgefuehrt_von?: string | null
          faelligkeit?: string | null
          id?: string
          norm_id: string
          status?: string
          tenant_id: string
          turnus?: string | null
        }
        Update: {
          bezeichnung?: string
          created_at?: string
          created_by?: string
          durchgefuehrt_am?: string | null
          durchgefuehrt_von?: string | null
          faelligkeit?: string | null
          id?: string
          norm_id?: string
          status?: string
          tenant_id?: string
          turnus?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ueberwachungshandlungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ueberwachungshandlungen_durchgefuehrt_von_fkey"
            columns: ["durchgefuehrt_von"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ueberwachungshandlungen_norm_id_fkey"
            columns: ["norm_id"]
            isOneToOne: false
            referencedRelation: "normen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ueberwachungshandlungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vertragscheckliste_katalog: {
        Row: {
          bezeichnung: string
          buchstabe: string | null
          code: string
          erlaeuterung: string | null
          nur_bei_weiterverlagerung: boolean
          tz_referenz: string
        }
        Insert: {
          bezeichnung: string
          buchstabe?: string | null
          code: string
          erlaeuterung?: string | null
          nur_bei_weiterverlagerung?: boolean
          tz_referenz: string
        }
        Update: {
          bezeichnung?: string
          buchstabe?: string | null
          code?: string
          erlaeuterung?: string | null
          nur_bei_weiterverlagerung?: boolean
          tz_referenz?: string
        }
        Relationships: []
      }
      weiterverlagerungen: {
        Row: {
          auslagerung_id: string
          created_at: string
          created_by: string
          ebene: number
          id: string
          leistungsbeschreibung: string | null
          sitzstaat: string | null
          status: string
          sub_anbieter: string
          tenant_id: string
          vorgaenger_id: string | null
        }
        Insert: {
          auslagerung_id: string
          created_at?: string
          created_by: string
          ebene: number
          id?: string
          leistungsbeschreibung?: string | null
          sitzstaat?: string | null
          status?: string
          sub_anbieter: string
          tenant_id: string
          vorgaenger_id?: string | null
        }
        Update: {
          auslagerung_id?: string
          created_at?: string
          created_by?: string
          ebene?: number
          id?: string
          leistungsbeschreibung?: string | null
          sitzstaat?: string | null
          status?: string
          sub_anbieter?: string
          tenant_id?: string
          vorgaenger_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weiterverlagerungen_auslagerung_id_fkey"
            columns: ["auslagerung_id"]
            isOneToOne: false
            referencedRelation: "auslagerungen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weiterverlagerungen_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weiterverlagerungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weiterverlagerungen_vorgaenger_id_fkey"
            columns: ["vorgaenger_id"]
            isOneToOne: false
            referencedRelation: "weiterverlagerungen"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      board_audit_plan_status: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audit_plan_id: string | null
          status: string | null
          submitted_at: string | null
          tenant_id: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_plans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      board_dashboard: {
        Row: {
          finalized_at: string | null
          kenntnisnahme_at: string | null
          kenntnisnahme_by: string | null
          module: Database["public"]["Enums"]["module_type"] | null
          period_from: string | null
          period_to: string | null
          report_id: string | null
          report_type: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_kenntnisnahme_by_fkey"
            columns: ["kenntnisnahme_by"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revisionsbericht_feststellungen: {
        Row: {
          created_at: string | null
          feststellung_id: string | null
          pruefungsobjekt_bezeichnung: string | null
          pruefungsobjekt_id: string | null
          schweregrad: string | null
          status: string | null
          tenant_id: string | null
          titel: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisionsfeststellungen_pruefungsobjekt_id_fkey"
            columns: ["pruefungsobjekt_id"]
            isOneToOne: false
            referencedRelation: "pruefungsobjekte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revisionsfeststellungen_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_drafts: {
        Args: { p_comment?: string; p_draft_ids: string[] }
        Returns: {
          created_at: string
          created_by: string
          entity_id: string | null
          entity_type: string
          id: string
          module: Database["public"]["Enums"]["module_type"]
          payload: Json
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["draft_status"]
          tenant_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "drafts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_person_id: { Args: { p_tenant_id: string }; Returns: string }
      grant_revisionsleiter: {
        Args: { p_person_id: string; p_tenant_id: string }
        Returns: undefined
      }
      has_module_access: {
        Args: {
          p_min: Database["public"]["Enums"]["access_level"]
          p_module: Database["public"]["Enums"]["module_type"]
          p_tenant_id: string
        }
        Returns: boolean
      }
      has_module_grant: {
        Args: {
          p_module: Database["public"]["Enums"]["module_type"]
          p_tenant_id: string
        }
        Returns: boolean
      }
      has_module_role: {
        Args: {
          p_module: Database["public"]["Enums"]["module_type"]
          p_role: Database["public"]["Enums"]["internal_role"]
          p_tenant_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["internal_role"]
          p_tenant_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { p_tenant_id: string }; Returns: boolean }
      log_access: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type?: string
          p_module: Database["public"]["Enums"]["module_type"]
          p_new_value?: Json
          p_old_value?: Json
          p_tenant_id: string
        }
        Returns: string
      }
      materialize_outsourcing_draft: {
        Args: { p_draft_id: string }
        Returns: string
      }
      reject_draft: {
        Args: { p_comment: string; p_draft_id: string }
        Returns: {
          created_at: string
          created_by: string
          entity_id: string | null
          entity_type: string
          id: string
          module: Database["public"]["Enums"]["module_type"]
          payload: Json
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["draft_status"]
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "drafts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      access_level: "none" | "read" | "write"
      draft_status: "pending" | "approved" | "rejected"
      handshake_status:
        | "vorschlag"
        | "bestaetigt"
        | "widersprochen"
        | "entschieden"
      internal_role:
        | "institution_admin"
        | "geschaeftsleitung"
        | "power_user"
        | "fachbereich"
        | "praktikant"
        | "read_only"
      module_type: "outsourcing" | "compliance" | "internal_audit"
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
      access_level: ["none", "read", "write"],
      draft_status: ["pending", "approved", "rejected"],
      handshake_status: [
        "vorschlag",
        "bestaetigt",
        "widersprochen",
        "entschieden",
      ],
      internal_role: [
        "institution_admin",
        "geschaeftsleitung",
        "power_user",
        "fachbereich",
        "praktikant",
        "read_only",
      ],
      module_type: ["outsourcing", "compliance", "internal_audit"],
    },
  },
} as const
