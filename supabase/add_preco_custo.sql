-- Preço de custo unitário para cálculo de Lucro Líquido nos Relatórios.
-- Execute no SQL Editor do Supabase.

alter table public.produtos
  add column if not exists preco_custo numeric(12, 2) not null default 0;

comment on column public.produtos.preco_custo is
  'Custo unitário do produto. Lucro = (preço de venda - preco_custo) * quantidade vendida.';
