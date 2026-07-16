# CentralSync ERP — Sistema de Gestão Empresarial, Financeira e Logística

O **CentralSync ERP** é uma plataforma robusta e integrada projetada para o controle operacional completo de empresas de comércio e móveis. O sistema gerencia desde a prospecção/orçamentos até a entrega física e montagem final do produto com comprovação biométrica digital (dupla assinatura digital) e registros fotográficos.

---

## 📁 Estrutura de Arquitetura e Tecnologia

O projeto está dividido em duas partes fundamentais para garantir máxima performance, escalabilidade e manutenibilidade:

*   **`/frontend`**: Aplicação Single Page App (SPA) construída com **React + Vite**, estilizada com **Tailwind CSS** e integrada com **Firebase** (Authentication, Firestore Database e Firebase Storage). Configurada para deploy contínuo na Vercel.
*   **`/backend`**: Servidor API REST construído com **Node.js** e **Express**. Configurado para deploy no Render (usado para integrações auxiliares e mock de retaguarda).

---

## 🚀 Status do Projeto e Nível de Maturidade

*   **Nível Atual**: **Produção e Operação Homologada (Nível de Maturidade V — Sistema Seguro de ERP com Auditoria Operacional)**.
*   **Integrações Ativas**: Autenticação nativa via Google Auth + Senha Master de Segurança, Banco de dados Firestore em tempo real (Realtime Sync) e armazenamento de mídias de comprovação.

---

## 🛠️ Módulos e Funcionamento do Sistema

### 1. Pedidos & Orçamentos (Módulo Comercial)
*   **Emissão e Controle**: Cadastro de orçamentos e pedidos de vendas com IDs numéricos reduzidos e legíveis para facilitar a visualização física e comunicação interna.
*   **Layout Responsivo Avançado**: Telas de fechamento (Faturar Pedido) e integrações reestruturadas em layout de 2 colunas para otimização de espaço e agilidade operacional.
*   **Faturamento com Rateio (Split de Pagamentos)**: Na confirmação do faturamento, os operadores podem distribuir o valor total da venda em múltiplas formas de pagamento (ex.: R$ 300 no PIX, R$ 200 no Cartão em 2x). O sistema calcula dinamicamente o saldo restante em tempo real para evitar erros de caixa.
*   **Direcionamento de Sistema (Central vs. Alterdata)**: O fluxo de vendas foi projetado para conviver com o ERP local "Alterdata". As vendas faturadas são classificadas como **"Fechamento" (Alterdata)** ou **"Orçamento" (Central)**, com tratamento financeiro segmentado.
*   **Integração Automática**: Ao faturar um pedido, o sistema gera instantaneamente:
    1.  A baixa do produto correspondente no estoque.
    2.  Lançamentos no Contas a Receber (Financeiro) detalhados e segregados pela real forma de pagamento extraída do faturamento.
    3.  A criação da entrega programada no módulo de logística.

### 2. Catálogo de Estoque & Movimentações
*   **Controle Rigoroso de Saldo**: Registro automático de entradas (IN) por compras/retornos e saídas (OUT) por vendas/ajustes.
*   **Gestão de Devoluções a Fornecedores (Multi-Produtos)**: Fluxo "carrinho" otimizado, permitindo que os gestores adicionem múltiplos itens defeituosos de um mesmo fornecedor em uma única operação, gerando simultaneamente as baixas de estoque e os créditos no Contas a Receber.
*   **Alertas Visuais de Estoque Crítico**: Banner de notificação persistente e altamente visível no topo da tela do painel principal para administradores e estoquistas, detalhando a quantidade de produtos abaixo do estoque mínimo e botão de redirecionamento rápido para reposição.

### 3. Fluxo Financeiro e Relatórios (Contas a Pagar e Receber)
*   **Relatório Central Financeiro**: Cruzamento completo das contas pagas e faturadas, exibindo previsões reais de faturamento bruto e líquido.
*   **Relatórios Administrativos Inteligentes**: Visualização em tabela, exportação CSV e PDFs dinâmicos de Impressão. O sistema extrai inteligentemente a forma de pagamento real e destrincha automaticamente as vendas encaminhadas ao sistema "Alterdata".
*   **Margem e Custo**: Cálculo preciso do Lucro x Custo do estoque e do montante faturado, sinalizando a margem exata (%) aplicada nas vendas.
*   **Relatórios das Formas de Pagamento**: Gráficos e tabelas distribuindo as receitas de acordo com o meio de pagamento (Pix, Crédito, Débito, Dinheiro, etc.).
*   **Auditoria "Central" & "Alterdata"**: Filtros e relatórios especializados de exportação para fins contábeis e auditorias contábeis externas dos caixas integrados.

### 4. Módulo de Logística (Entregas & Montagens)
*   **Distribuição de Ordens**: Designação rápida de entregadores e montadores de móveis com definição de comissões por lote de montagem.
*   **Validação de Entrega (Dupla Assinatura & Foto)**: Para que uma entrega ou montagem seja marcada como concluída no portal móvel, o sistema exige obrigatoriamente:
    1.  A assinatura digital do cliente desenhada na tela.
    2.  A assinatura digital do funcionário (entregador/montador) desenhada na tela.
    3.  A foto física do produto entregue/montado no local.
*   **Segurança e Privacidade dos Dados**: Assinaturas digitais e fotografias comprovativas contêm dados sensíveis e são **exclusivamente visíveis para usuários administradores cadastrados**. Usuários comuns do sistema (vendedores, montadores, entregadores) visualizam apenas dados textuais da logística.
*   **Administradores Nativa e Diretamente Homologados**:
    *   `brisasofc@gmail.com` (Proprietário / Adm Geral)
    *   `isaacbomfim.00@gmail.com` (Proprietário / Adm Geral)
    *   `lucaswelglys@gmail.com` (Administrador)
    *   `natandsantosmarinho10@gmail.com` (Proprietário / Adm Geral)

---

## ⚙️ Como Executar Localmente

### Pré-requisitos
*   Node.js (versão 18 ou superior)
*   NPM

### Passos para Inicialização

1.  **Instalação Geral de Dependências (no Frontend)**:
    ```bash
    cd frontend
    npm install
    ```

2.  **Executar o Servidor de Desenvolvimento**:
    ```bash
    npm run dev
    ```
    O Frontend estará disponível e acessível em `http://localhost:3000`.

3.  **Executar o Backend (Opcional)**:
    ```bash
    cd ../backend
    npm install
    npm run dev
    ```
    O servidor auxiliar rodará em `http://localhost:3001`.

---

## ☁️ Deploy e Publicação

O fluxo de deploy é automatizado diretamente via GitHub integrando as seguintes pontas:
*   **Frontend**: Publicado e hospedado na [Vercel](https://centralsync.vercel.app/).
*   **Backend**: Publicado e hospedado no [Render](https://centralsync.onrender.com).
*   **Banco de Dados**: Gerenciado via nuvem do **Google Firebase Firestore** com regras rígidas de segurança IP, CORS e Autenticação.
