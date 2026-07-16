/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;       // Preço de venda
  costPrice: number;   // Preço de custo
  currentStock: number;
  minStock: number;
  description?: string;
  location?: string;   // Localização física no estoque (ex: Corredor A, Prateleira 2)
  createdAt: string;
  colors?: string[];   // Cores disponíveis para monstruário (ex: ["Mel", "Amêndoa", "Preto"])
  material?: string;   // Material principal (ex: MDF, Madeira Maciça, Chenille)
  dimensions?: string; // Dimensões (ex: 120 x 60 x 75 cm)
  imageUrl?: string;   // Ilustração ou imagem do item para monstruário
  active?: boolean;    // Status (Ativo/Inativo)
  unit?: string;       // Unidade (Ex: UN, PC, CJ)
  images?: string[];   // Múltiplas imagens do produto
  needsAssembly?: boolean;     // Se necessita de montagem por padrão
  assemblyPercent?: number;    // Taxa de montagem (%)
  taxPercent?: number;         // Impostos (%)
  markupPercent?: number;      // Markup/Margem (Multiplicador)
  freightPercent?: number;     // Valor de Frete (%)
  barcode?: string;            // Código de barras (EAN/GTIN)
  ncm?: string;                // Nomenclatura Comum do Mercosul
  lastSyncDate?: string;       // ISO timestamp da última sincronização com ERP
  syncStatus?: 'synced' | 'not_found'; // Status da última sincronização
}

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: 'COMPRA' | 'VENDA' | 'PERDA' | 'RETORNO' | 'AJUSTE' | 'OUTROS';
  description?: string;
  date: string;
  value?: number; // Valor financeiro total do movimento
}

export type PaymentType = 'INCOME' | 'EXPENSE'; // Entrada (Receitas) ou Saída (Despesas)

export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export type PaymentMethod = 'DINHEIRO' | 'CREDIARIO' | 'CARTAO' | 'CARTAO_X' | 'CENTRAL' | 'ALTERDATA' | 'PIX';

export type PaymentCategory = 
  | 'VENDAS' 
  | 'FORNECEDORES' 
  | 'PRODUTOS' 
  | 'SALARIOS' 
  | 'SERVICOS' 
  | 'ESTRUTURA' // Aluguel, água, luz, etc.
  | 'OUTROS';

export interface Payment {
  id: string;
  description: string;
  amount: number;
  type: PaymentType;
  category: PaymentCategory;
  dueDate: string;          // Data de Vencimento
  paymentDate?: string;     // Data do Pagamento efetivo
  status: PaymentStatus;
  entityName: string;       // Cliente ou Fornecedor
  notes?: string;
  associatedProductId?: string; // Produto associado se houver
  associatedSaleId?: string; // Venda associada (Orçamento/Pedido)
  paymentMethod?: PaymentMethod; // Método de pagamento se aplicável
  isFixed?: boolean; // Despesa/Receita fixa recorrente (ex: aluguel)
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Delivery {
  id: string;
  customerName: string;
  customerPhone?: string; // Telefone do cliente para notificações
  delivererName: string;
  address: string;
  itemsDescription: string; // e.g., "1 Cadeira Ergonômica Pro, 1 Mesa Office"
  productImageUrl?: string; // Imagem do produto para o montador visualizar
  status: 'A_ENTREGAR' | 'ENTREGUE';
  customerSignature?: string; // Base64 png data URL
  delivererSignature?: string; // Base64 png data URL
  delivererId?: string; // ID do entregador designado
  deliverySentToDeliverer?: boolean; // Se foi enviado para o portal do entregador
  scheduledDate: string;
  deliveredAt?: string;
  deliveryPhoto?: string; // Base64 da foto da entrega
  notes?: string;
  // Se o pedido necessita de montagem
  needsAssembly?: boolean;
  // Campos de Montagem
  assemblyStatus?: 'PENDENTE' | 'MONTADO';
  assemblerName?: string;
  assemblerId?: string;
  assemblerSignature?: string; // Assinatura do montador
  assemblyCustomerSignature?: string; // Assinatura do cliente na montagem
  assemblyPhoto?: string; // Base64 da foto do produto montado
  assembledAt?: string; // ISO timestamp da conclusão da montagem
  assemblyCommissionPercent?: number; // Comissão da montagem específica deste pedido
  assemblySentToAssembler?: boolean; // Flag de envio ao portal do montador
  
  // Campos de recusa de assinatura (Confirmação manual de entrega)
  customerRefusalName?: string;
  customerRefusalDob?: string;
  customerRefusalCpf?: string;
  
  // Campos de recusa de assinatura (Confirmação manual de montagem)
  assemblyCustomerRefusalName?: string;
  assemblyCustomerRefusalDob?: string;
  assemblyCustomerRefusalCpf?: string;

  // Status de saída para rota
  outForDelivery?: boolean;
}

export interface Seller {
  id: string;
  name: string;
  username: string;
  password?: string;
  googleEmail?: string; // Vinculado no primeiro login com Google
  active: boolean;
  createdAt: string;
  pin?: string; // PIN de 4 dígitos para bloqueio rápido
}

export interface Sale {
  id: string;
  createdAt: string;
  productId: string;
  productName: string;
  productSku: string;
  productCategory: string;
  productImageUrl?: string;
  quantity?: number;
  value: number;
  clientName: string;
  clientPhone: string;
  clientCpf?: string;
  clientCep?: string;
  clientStreet?: string;
  clientNumber?: string;
  clientComplement?: string;
  clientNeighborhood?: string;
  clientCity?: string;
  clientState?: string;
  sellerId: string;
  sellerName: string;
  commissionPercent: number; // Estrutura para comissões futuras
  commissionValue: number;   // Estrutura para comissões futuras
  commissionStatus: 'PENDING' | 'PAID' | 'CANCELLED';
  origin: string; // Ex: "Mostruário Vendas"
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  paymentMethod?: PaymentMethod; // Método de pagamento quando faturado
  installments?: number; // Quantidade de parcelas se for cartão
  paymentSplits?: any[]; // Divisão de pagamentos
  notes?: string;
  deliveryType?: 'RETIRADA' | 'ENVIAR';
  shippingValue?: number;
  adminSignature?: string;
  expiresAt?: string; // ISO timestamp when this PENDING sale expires
  needsAssembly?: boolean; // Se o pedido necessita de montagem
  assemblyValue?: number;   // Valor cobrado pela montagem
  taxPercent?: number;      // Porcentagem de imposto cobrada
  taxValue?: number;        // Valor monetário de imposto
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
}

export interface Deliverer {
  id: string;
  name: string;
  username: string;
  password?: string;
  googleEmail?: string;
  firebaseUid?: string; // UID da sessão anônima do Firebase vinculada no login direto (usuário/senha)
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  cpf: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  createdAt: string;
}

export interface Estoquista {
  id: string;
  name: string;
  username: string;
  password?: string;
  googleEmail?: string;
  active: boolean;
  createdAt: string;
}

export interface Caixa {
  id: string;
  name: string;
  username: string;
  password?: string;
  googleEmail?: string;
  active: boolean;
  createdAt: string;
}

export interface Montador {
  id: string;
  name: string;
  username: string;
  password?: string;
  googleEmail?: string;
  firebaseUid?: string; // UID da sessão anônima do Firebase vinculada no login direto (usuário/senha)
  active: boolean;
  createdAt: string;
  commissionPercent?: number; // Comissão do montador sobre o valor do pedido
}

export interface MonthlyGoal {
  id: string;
  sellerId?: string;
  sellerName?: string;
  type: 'INDIVIDUAL' | 'TEAM';
  month: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseReturn {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  supplierName: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  reason: string;
  createdAt: string;
  generateReceivable: boolean;
  receivableId?: string;
  status: 'PENDING' | 'RESOLVED' | 'CANCELLED';
}


