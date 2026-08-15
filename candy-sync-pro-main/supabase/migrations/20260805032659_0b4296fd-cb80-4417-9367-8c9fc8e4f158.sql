CREATE TABLE public.empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL DEFAULT 'SSD ATACADO DE DOCES E BEBIDAS LTDA',
  nome_fantasia text NOT NULL DEFAULT 'SSD ATACADO',
  cnpj text NOT NULL DEFAULT '',
  inscricao_estadual text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  numero text NOT NULL DEFAULT '',
  bairro text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT '',
  cep text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  site text NOT NULL DEFAULT '',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.empresa TO authenticated;
GRANT ALL ON public.empresa TO service_role;

ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores e admins podem ver a empresa"
ON public.empresa FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['vendedor'::app_role, 'admin'::app_role])));

CREATE POLICY "Vendedores e admins podem criar a empresa"
ON public.empresa FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['vendedor'::app_role, 'admin'::app_role])));

CREATE POLICY "Vendedores e admins podem editar a empresa"
ON public.empresa FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['vendedor'::app_role, 'admin'::app_role])))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = ANY (ARRAY['vendedor'::app_role, 'admin'::app_role])));

CREATE TRIGGER empresa_updated BEFORE UPDATE ON public.empresa
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.empresa (razao_social, nome_fantasia) VALUES ('SSD ATACADO DE DOCES E BEBIDAS LTDA', 'SSD ATACADO');

ALTER TABLE public.produtos
  ADD COLUMN tipo_embalagem text NOT NULL DEFAULT 'Unidade',
  ADD COLUMN unidades_embalagem numeric NOT NULL DEFAULT 1,
  ADD COLUMN preco_embalagem numeric NOT NULL DEFAULT 0;

ALTER TABLE public.pedido_itens
  ADD COLUMN embalagem text NOT NULL DEFAULT 'Unidade',
  ADD COLUMN unidades_por_embalagem numeric NOT NULL DEFAULT 1;