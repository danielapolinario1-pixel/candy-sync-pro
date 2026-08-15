-- PERFIS
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Vendedor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CLIENTES
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  responsavel TEXT,
  documento TEXT,
  telefone TEXT,
  whatsapp TEXT,
  cidade TEXT,
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_all" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_clientes_razao ON public.clientes (lower(razao_social));
CREATE INDEX idx_clientes_cidade ON public.clientes (lower(cidade));

-- PRODUTOS
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  marca TEXT,
  preco NUMERIC(12,2) NOT NULL DEFAULT 0,
  codigo_barras TEXT,
  estoque_atual NUMERIC(12,2) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'UN',
  favorito BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produtos_all" ON public.produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_produtos_nome ON public.produtos (lower(nome));
CREATE INDEX idx_produtos_codigo ON public.produtos (codigo);
CREATE INDEX idx_produtos_categoria ON public.produtos (categoria);

-- PEDIDOS
CREATE SEQUENCE public.pedido_numero_seq START 1001;
GRANT USAGE, SELECT ON SEQUENCE public.pedido_numero_seq TO authenticated;
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero BIGINT NOT NULL DEFAULT nextval('public.pedido_numero_seq'),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  vendedor_id UUID NOT NULL,
  vendedor_nome TEXT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  condicao_pagamento TEXT DEFAULT 'A combinar',
  prazo_entrega TEXT DEFAULT 'A combinar',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_all" ON public.pedidos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  produto_codigo TEXT,
  unidade TEXT NOT NULL DEFAULT 'UN',
  quantidade NUMERIC(12,2) NOT NULL,
  valor_unitario NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_itens TO authenticated;
GRANT ALL ON public.pedido_itens TO service_role;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedido_itens_all" ON public.pedido_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_itens_pedido ON public.pedido_itens (pedido_id);

-- MOVIMENTACOES
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
  produto_nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  quantidade NUMERIC(12,2) NOT NULL,
  saldo_apos NUMERIC(12,2) NOT NULL,
  motivo TEXT,
  usuario_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mov_all" ON public.movimentacoes_estoque FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_mov_created ON public.movimentacoes_estoque (created_at DESC);

-- BAIXA AUTOMATICA DE ESTOQUE
CREATE OR REPLACE FUNCTION public.baixa_estoque_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE novo_saldo NUMERIC; vend TEXT;
BEGIN
  IF NEW.produto_id IS NULL THEN RETURN NEW; END IF;
  UPDATE public.produtos SET estoque_atual = estoque_atual - NEW.quantidade
  WHERE id = NEW.produto_id RETURNING estoque_atual INTO novo_saldo;
  SELECT vendedor_nome INTO vend FROM public.pedidos WHERE id = NEW.pedido_id;
  INSERT INTO public.movimentacoes_estoque (produto_id, produto_nome, tipo, quantidade, saldo_apos, motivo, usuario_nome)
  VALUES (NEW.produto_id, NEW.produto_nome, 'saida', NEW.quantidade, COALESCE(novo_saldo,0), 'Venda pedido', vend);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_baixa_estoque AFTER INSERT ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.baixa_estoque_item();

-- REALTIME
ALTER TABLE public.produtos REPLICA IDENTITY FULL;
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes_estoque;