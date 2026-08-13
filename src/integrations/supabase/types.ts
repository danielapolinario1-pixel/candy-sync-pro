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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cidade: string | null
          created_at: string
          documento: string | null
          endereco: string | null
          id: string
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          responsavel: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          documento?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cidade?: string | null
          created_at?: string
          documento?: string | null
          endereco?: string | null
          id?: string
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          responsavel?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      empresa: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          cnpj: string
          created_at: string
          email: string
          endereco: string
          estado: string
          id: string
          inscricao_estadual: string
          logo_url: string | null
          nome_fantasia: string
          numero: string
          razao_social: string
          site: string
          telefone: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          bairro?: string
          cep?: string
          cidade?: string
          cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          estado?: string
          id?: string
          inscricao_estadual?: string
          logo_url?: string | null
          nome_fantasia?: string
          numero?: string
          razao_social?: string
          site?: string
          telefone?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          estado?: string
          id?: string
          inscricao_estadual?: string
          logo_url?: string | null
          nome_fantasia?: string
          numero?: string
          razao_social?: string
          site?: string
          telefone?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          produto_id: string | null
          produto_nome: string
          quantidade: number
          saldo_apos: number
          tipo: string
          usuario_nome: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          produto_id?: string | null
          produto_nome: string
          quantidade: number
          saldo_apos: number
          tipo: string
          usuario_nome?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          produto_id?: string | null
          produto_nome?: string
          quantidade?: number
          saldo_apos?: number
          tipo?: string
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string
          embalagem: string
          id: string
          pedido_id: string
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string
          quantidade: number
          subtotal: number
          unidade: string
          unidades_por_embalagem: number
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          embalagem?: string
          id?: string
          pedido_id: string
          produto_codigo?: string | null
          produto_id?: string | null
          produto_nome: string
          quantidade: number
          subtotal: number
          unidade?: string
          unidades_por_embalagem?: number
          valor_unitario: number
        }
        Update: {
          created_at?: string
          embalagem?: string
          id?: string
          pedido_id?: string
          produto_codigo?: string | null
          produto_id?: string | null
          produto_nome?: string
          quantidade?: number
          subtotal?: number
          unidade?: string
          unidades_por_embalagem?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string | null
          cliente_nome: string
          condicao_pagamento: string | null
          created_at: string
          desconto: number
          id: string
          numero: number
          observacoes: string | null
          prazo_entrega: string | null
          subtotal: number
          total: number
          vendedor_id: string
          vendedor_nome: string
        }
        Insert: {
          cliente_id?: string | null
          cliente_nome: string
          condicao_pagamento?: string | null
          created_at?: string
          desconto?: number
          id?: string
          numero?: number
          observacoes?: string | null
          prazo_entrega?: string | null
          subtotal?: number
          total?: number
          vendedor_id: string
          vendedor_nome: string
        }
        Update: {
          cliente_id?: string | null
          cliente_nome?: string
          condicao_pagamento?: string | null
          created_at?: string
          desconto?: number
          id?: string
          numero?: number
          observacoes?: string | null
          prazo_entrega?: string | null
          subtotal?: number
          total?: number
          vendedor_id?: string
          vendedor_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria: string
          codigo: string | null
          codigo_barras: string | null
          created_at: string
          estoque_atual: number
          estoque_minimo: number
          favorito: boolean
          id: string
          marca: string | null
          nome: string
          preco: number
          preco_custo: number
          preco_embalagem: number
          tipo_embalagem: string
          unidade: string
          unidades_embalagem: number
          updated_at: string
        }
        Insert: {
          categoria?: string
          codigo?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          favorito?: boolean
          id?: string
          marca?: string | null
          nome: string
          preco?: number
          preco_custo?: number
          preco_embalagem?: number
          tipo_embalagem?: string
          unidade?: string
          unidades_embalagem?: number
          updated_at?: string
        }
        Update: {
          categoria?: string
          codigo?: string | null
          codigo_barras?: string | null
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          favorito?: boolean
          id?: string
          marca?: string | null
          nome?: string
          preco?: number
          preco_custo?: number
          preco_embalagem?: number
          tipo_embalagem?: string
          unidade?: string
          unidades_embalagem?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id: string
          nome?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "vendedor"
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
      app_role: ["admin", "vendedor"],
    },
  },
} as const
