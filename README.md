# SweetStock Sync

Você é um desenvolvedor sênior especialista em React, TypeScript, Capacitor, SQLite/Supabase e aplicativos móveis.

Crie um aplicativo PROFISSIONAL nativo para dispositivos móveis chamado SSD ATACADO.

==================================================

OBJETIVO & ARQUITETURA

==================================================

Aplicativo para vendedores externos de uma distribuidora de doces, chocolates, balas, pirulitos, salgadinhos e bebidas.

- Desenvolvido em React + TypeScript + Capacitor + Tailwind CSS.

- O aplicativo DEVE utilizar banco de dados na nuvem (Supabase) integrado com cache offline (SQLite/LocalStorage).

- SINCRONIZAÇÃO EM TEMPO REAL: Os 3 vendedores externos devem acessar o mesmo estoque centralizado em tempo real. Quando um vendedor salvar um pedido, a baixa de estoque DEVE refletir instantaneamente para os outros 2 vendedores no celular deles.

- Nome e link personalizado do projeto: ssdatacado (https://ssdatacado.lovable.app).

- Preparado para compilação nativa em Android (.APK via Capacitor) e iOS.

==================================================

IDENTIDADE VISUAL

==================================================

Nome: SSD ATACADO

Cores Primárias: Vermelho (#D62828), Preto (#111111), Branco (#FFFFFF).

Design: Interface mobile nativa moderna, minimalista, botões e letras grandes para uso confortável com apenas uma mão.

NENHUMA TELA DE DASHBOARD DESKTOP/COMPUTADOR. 100% Mobile First.

==================================================

LOGIN E MULTI-VENDEDOR

==================================================

- Campos: E-mail e Senha.

- Suporte a múltiplos vendedores com contas individuais (ex: Vendedor 1, Vendedor 2, Vendedor 3).

- Todos os vendedores compartilham o MESMO cadastro de clientes, catálogo de produtos e estoque central na nuvem.

==================================================

NAVEGAÇÃO E MENUS

==================================================

Menu Inferior Fixo (Bottom Navigation):

🏠 Início | 🛒 Pedidos | 📦 Produtos | 👥 Clientes | ⚙ Configurações

Tela de Início (Home):

Exibir apenas botões grandes de acesso rápido:

[ NOVO PEDIDO ]

[ PRODUTOS ]

[ CLIENTES ]

[ HISTÓRICO DE PEDIDOS ]

[ ESTOQUE ]

==================================================

CADASTRO DE CLIENTES

==================================================

Funções: Cadastrar, Editar, Excluir, Pesquisar instantaneamente por nome/cidade.

Campos: Razão Social/Nome, Nome Fantasia, Responsável, CNPJ/CPF, Telefone, WhatsApp, Cidade, Endereço e Observações.

==================================================

CADASTRO DE PRODUTOS

==================================================

Funções: Cadastrar, Editar, Excluir, Favoritar, Pesquisa instantânea por código ou nome (performance para +10.000 itens).

Categorias Fixas: Chocolate, Balas, Pirulitos, Trento, Elma Chips, Treps, Salgadinhos, Bebidas, Outros.

Campos: Nome, Categoria, Marca, Preço de Venda, Código de Barras, Estoque Atual, Estoque Mínimo, Favorito (Sim/Não).

==================================================

FLUXO DE NOVO PEDIDO (VENDAS)

==================================================

1. Selecionar Cliente.

2. Campo de busca de produto instantâneo: ao digitar (ex: "tre"), filtrar na hora "Trento Blanco", "Trento Dark" sem apertar Enter.

3. Ao tocar no produto, abrir Modal Modal Rápido: Nome, Preço, Quantidade (com botões + e -), Subtotal e botão [ADICIONAR].

4. Lista do Pedido: Exibir itens adicionados, permitindo alterar quantidade ou excluir item.

5. Rodapé Fixo: Quantidade total de itens e Valor Total acumulado.

6. Ao Finalizar Pedido:

   - Registrar número do pedido, data, hora, cliente e nome do vendedor logado.

   - DAR BAIXA AUTOMÁTICA NO ESTOQUE CENTRALIZADO NA NUVEM.

==================================================

ESTOQUE CENTRALIZADO

==================================================

- Baixa automática ao fechar cada pedido.

- Recursos: Entrada manual de mercadoria, ajuste de estoque, histórico de movimentações e alertas em vermelho para itens com "Estoque Mínimo" atingido.

==================================================

INTEGRAÇÃO WHATSAPP

==================================================

Botão [Enviar Pedido por WhatsApp]:

Gera automaticamente texto formatado e abre o app do WhatsApp no celular do cliente:

"📦 SSD ATACADO

Cliente: {NomeCliente}

Pedido Nº: #{NumeroPedido}

--------------------------------

{Qtd}x {Produto} ........ R$ {Subtotal}

--------------------------------

TOTAL: R$ {ValorTotal}

Obrigado pela preferência!"

==================================================

GERAÇÃO DE PDF DE PEDIDO DE VENDA (A4 PROFISSIONAL)

==================================================

Substituir o PDF antigo por um documento comercial A4 no padrão das grandes distribuidoras brasileiras (sem nenhuma marca d'água de plataforma externa):

- Cabeçalho: Nome "SSD ATACADO DE DOCES E BEBIDAS LTDA", CNPJ, Endereço, Cidade/UF, Telefone, E-mail.

- Caixa Destacada (Direita): "PEDIDO DE VENDA", Nº do Pedido, Data/Hora de Emissão, Vendedor.

- Dados do Cliente: Razão Social, Nome Fantasia, CNPJ/CPF, Endereço, Cidade, Telefone, Observações.

- Tabela de Produtos: Código, Descrição, Qtd, Unidade, Valor Unitário, Subtotal.

- Totalização: Subtotal, Desconto, VALOR TOTAL EM DESTAQUE (Vermelho #D62828).

- Rodapé Comercial: Condição de Pagamento, Prazo de Entrega, Campo para Assinatura do Vendedor e Assinatura/Carimbo do Cliente.

- Texto Obrigatório: "* ESTE DOCUMENTO É UM PEDIDO DE VENDA E NÃO TEM VALOR DE NOTA FISCAL *".

- Ações no App: [ Baixar PDF ], [ Compartilhar PDF ] e [ Enviar PDF por WhatsApp ].

==================================================

BACKUP & SEGURANÇA

==================================================

Opção de exportar e importar arquivo JSON com backup completo dos dados no celular para total segurança offline.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://candy-sync-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ff44507a-1b9d-46dc-b22c-e3616b0c3db4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
