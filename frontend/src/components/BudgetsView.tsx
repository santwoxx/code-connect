/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ClipboardList, 
  Search, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Printer, 
  User, 
  DollarSign, 
  Calendar, 
  MapPin, 
  FileSpreadsheet, 
  AlertTriangle,
  Send,
  Loader2,
  Phone,
  Plus,
  Trash2,
  Minus,
  Download
} from 'lucide-react';
import { Sale, Product, Seller, Customer, PaymentMethod, Delivery } from '../types';
import { saveSale, saveCustomer, logAuditEvent, saveDelivery, createBudgetTransactionally, createBudgetsTransactionally } from '../db';
import { auth } from '../firebase';
import { AlterdataModal } from './AlterdataModal';
import { formatCurrency } from '../utils/format';
import { BudgetsHeader } from './budgets/BudgetsHeader';
import { BudgetsSummary } from './budgets/BudgetsSummary';
import { EditFreightModal } from './budgets/EditFreightModal';
import { DeleteConfirmationDialog } from './shared/DeleteConfirmationDialog';
import { EmitNfeModal } from './budgets/EmitNfeModal';
import { METHOD_LABELS } from '../config/budgetsData';


interface BudgetsViewProps {
  sales: Sale[];
  products: Product[];
  sellers: Seller[];
  customers: Customer[];
  onUpdateSale: (sale: Sale) => Promise<void> | void;
  onInvoiceSale: (
    saleId: string,
    caixa: PaymentMethod,
    splits: { method: PaymentMethod; amount: number; installments?: number }[]
  ) => Promise<void> | void;
  onCancelSale: (saleId: string) => Promise<void> | void;
  onDeleteSale: (saleId: string) => Promise<void> | void;
  onPrintSale: (sale: Sale) => void;
  userRole: string;
  currentSeller?: Seller | null;
  deliveries?: Delivery[];
}

// Helpers formatters
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
};

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  sales,
  products,
  sellers,
  customers,
  onUpdateSale,
  onInvoiceSale,
  onCancelSale,
  onDeleteSale,
  onPrintSale,
  userRole,
  currentSeller,
  deliveries = []
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState<string>('');

  // Add Order Modal States
  interface SelectedBudgetItem {
    id: string;
    product: Product;
    quantity: number;
    deliveryType: 'RETIRADA' | 'ENVIAR';
    needsAssembly: boolean;
    shippingValue: number;
    customValue?: number;
  }

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedBudgetItem[]>([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [clientCep, setClientCep] = useState('');
  const [clientStreet, setClientStreet] = useState('');
  const [clientNumber, setClientNumber] = useState('');
  const [clientComplement, setClientComplement] = useState('');
  const [clientNeighborhood, setClientNeighborhood] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientState, setClientState] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  // Payment states for order creation
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('DINHEIRO');

  // Edit Delivery/Shipping states
  const [editDeliveryType, setEditDeliveryType] = useState<'RETIRADA' | 'ENVIAR'>('RETIRADA');
  const [editShippingValue, setEditShippingValue] = useState<number>(0);
  const [isEditFreightModalOpen, setIsEditFreightModalOpen] = useState(false);
  const [editFreightInput, setEditFreightInput] = useState('');

  // Product and Customer Search States
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Filtered lists for autocomplete
  const searchedProducts = useMemo(() => {
    const term = productSearchTerm.toLowerCase().trim();
    if (!term) return products.filter(p => p.active !== false);
    return products.filter(p => 
      p.active !== false && 
      (p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))
    );
  }, [products, productSearchTerm]);

  const searchedCustomers = useMemo(() => {
    const term = customerSearchTerm.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.cpf && c.cpf.includes(term)) || 
      (c.phone && c.phone.includes(term))
    );
  }, [customers, customerSearchTerm]);

  // Reset add modal state when opening
  const openAddModal = () => {
    setIsAddModalOpen(true);
    setSelectedItems([]);
    setSelectedSellerId(currentSeller?.id || '');
    setProductSearchTerm('');
    setCustomerSearchTerm('');
    setIsProductDropdownOpen(false);
    setIsCustomerDropdownOpen(false);
  };

  // Add mode handlers
  const handleAddProductItem = (prod: Product) => {
    const existing = selectedItems.find(item => item.product.id === prod.id);
    if (existing) {
      setSelectedItems(selectedItems.map(item =>
        item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSelectedItems([...selectedItems, {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product: prod,
        quantity: 1,
        deliveryType: 'RETIRADA',
        needsAssembly: true,
        shippingValue: 0,
        customValue: prod.price
      }]);
    }
  };

  // Edit mode handlers
  const handleSelectEditDeliveryType = (type: 'RETIRADA' | 'ENVIAR') => {
    if (type === 'ENVIAR') {
      setEditFreightInput(editShippingValue > 0 ? String(editShippingValue) : '');
      setIsEditFreightModalOpen(true);
    } else {
      setEditDeliveryType('RETIRADA');
      setEditShippingValue(0);
    }
  };

  const handleConfirmEditFreight = () => {
    const val = parseFloat(editFreightInput) || 0;
    setEditShippingValue(val);
    setEditDeliveryType('ENVIAR');
    setIsEditFreightModalOpen(false);
  };

  const handleCancelEditFreight = () => {
    setIsEditFreightModalOpen(false);
    if (editDeliveryType !== 'ENVIAR') {
      setEditDeliveryType('RETIRADA');
    }
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (customerId) {
      const found = customers.find(c => c.id === customerId);
      if (found) {
        setClientName(found.name);
        setClientPhone(found.phone);
        setClientCpf(found.cpf ? formatCPF(found.cpf) : '');
        setClientCep(found.cep || '');
        setClientStreet(found.street || '');
        setClientNumber(found.number || '');
        setClientComplement(found.complement || '');
        setClientNeighborhood(found.neighborhood || '');
        setClientCity(found.city || '');
        setClientState(found.state || '');
      }
    } else {
      setClientName('');
      setClientPhone('');
      setClientCpf('');
      setClientCep('');
      setClientStreet('');
      setClientNumber('');
      setClientComplement('');
      setClientNeighborhood('');
      setClientCity('');
      setClientState('');
    }
  };

  const handleAddCepLookup = async (cepVal: string) => {
    const clean = cepVal.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setClientStreet(data.logradouro || '');
          setClientNeighborhood(data.bairro || '');
          setClientCity(data.localidade || '');
          setClientState(data.uf || '');
        }
      } catch (err) {
        console.error("ViaCEP Failed on lookup", err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (selectedItems.length === 0) {
      errors.product = "Selecione pelo menos um produto.";
    }
    if (!clientName.trim()) {
      errors.name = "O nome do cliente é obrigatório.";
    }
    if (!clientPhone.trim()) {
      errors.phone = "O telefone é obrigatório.";
    }
    if (!clientCpf.trim()) {
      errors.cpf = "O CPF é obrigatório.";
    }

    const isAnyShipping = selectedItems.some(item => item.deliveryType === 'ENVIAR');
    if (isAnyShipping) {
      if (!clientStreet.trim()) errors.street = "A rua é obrigatória para envio.";
      if (!clientNumber.trim()) errors.number = "O número é obrigatório.";
      if (!clientNeighborhood.trim()) errors.neighborhood = "O bairro é obrigatório.";
      if (!clientCity.trim()) errors.city = "A cidade é obrigatória.";
      if (!clientState.trim()) errors.state = "O estado (UF) é obrigatório.";
      if (!clientCep.trim()) errors.cep = "O CEP é obrigatório.";
    }

    const cleanCPF = clientCpf.replace(/\D/g, "");
    if (clientCpf.trim()) {
      const validateCpfLocal = (val: string) => {
        const clean = val.replace(/\D/g, '');
        if (clean.length !== 11) return false;
        if (/^(\d)\1+$/.test(clean)) return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
        let rev = 11 - (sum % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(clean.charAt(9))) return false;
        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
        rev = 11 - (sum % 11);
        if (rev === 10 || rev === 11) rev = 0;
        if (rev !== parseInt(clean.charAt(10))) return false;
        return true;
      };
      if (!validateCpfLocal(cleanCPF)) {
        errors.cpf = "Por favor, informe um CPF válido.";
      }
    }

    let finalSellerId = '';
    let finalSellerName = '';

    if (userRole === 'vendedor') {
      if (!currentSeller) {
        errors.seller = "Nenhum vendedor conectado encontrado.";
      } else {
        finalSellerId = currentSeller.id;
        finalSellerName = currentSeller.name;
      }
    } else {
      if (!selectedSellerId) {
        errors.seller = "Atribua este pedido a um vendedor.";
      } else {
        const foundSeller = sellers.find(s => s.id === selectedSellerId);
        if (foundSeller) {
          finalSellerId = foundSeller.id;
          finalSellerName = foundSeller.name;
        } else {
          errors.seller = "Vendedor inválido.";
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    const getCommissionPercent = (cat?: string) => {
      if (!cat) return 2.5;
      const c = cat.toLowerCase().trim();
      return c.includes('eletro') ? 1.2 : 2.5;
    };

    const batchId = `cart-${Date.now()}`;
    const newSales: Sale[] = [];

    for (const item of selectedItems) {
      const saleId = `sale-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3)}`;
      const valFloat = (item.customValue ?? item.product.price) * item.quantity;
      const commissionPercent = getCommissionPercent(item.product.category);
      const commissionValue = (valFloat * commissionPercent) / 100;

      const assemblyValue = item.needsAssembly 
        ? (valFloat * (item.product.assemblyPercent || 0)) / 100 
        : 0;
      const taxPercent = item.product.taxPercent || 0;
      const taxValue = (valFloat * taxPercent) / 100;

      const itemNotes = notes.trim()
        ? `${notes.trim()} | Pedido lote: ${batchId} | Item ${selectedItems.indexOf(item) + 1} de ${selectedItems.length}`
        : `Pedido lote: ${batchId} | Item ${selectedItems.indexOf(item) + 1} de ${selectedItems.length}`;

      const newSale: Sale = {
        id: saleId,
        createdAt: new Date().toISOString(),
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        productCategory: item.product.category,
        productImageUrl: item.product.imageUrl || '',
        quantity: item.quantity,
        value: valFloat,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientCpf: cleanCPF,
        clientCep: clientCep.trim() || undefined,
        clientStreet: clientStreet.trim() || undefined,
        clientNumber: clientNumber.trim() || undefined,
        clientComplement: clientComplement.trim() || undefined,
        clientNeighborhood: clientNeighborhood.trim() || undefined,
        clientCity: clientCity.trim() || undefined,
        clientState: clientState.trim() || undefined,
        sellerId: finalSellerId,
        sellerName: finalSellerName,
        commissionPercent,
        commissionValue,
        commissionStatus: 'PENDING',
        origin: 'Módulo Pedidos',
        status: 'PENDING',
        notes: itemNotes,
        deliveryType: item.deliveryType,
        shippingValue: item.deliveryType === 'ENVIAR' ? item.shippingValue : undefined,
        paymentMethod: paymentMethod,
        needsAssembly: item.needsAssembly,
        assemblyValue,
        taxPercent,
        taxValue
      };

      newSales.push(newSale);
    }

    const fullAddress = clientStreet.trim() 
      ? `${clientStreet.trim()}, ${clientNumber.trim()}${clientComplement.trim() ? ` - ${clientComplement.trim()}` : ''} - ${clientNeighborhood.trim()}, ${clientCity.trim()} - ${clientState.trim()}${clientCep.trim() ? ` (CEP: ${clientCep.trim()})` : ''}`
      : '';

    try {
      const custId = selectedCustomerId || `cust-${Date.now()}`;
      const customerRecord: Customer = {
        id: custId,
        name: clientName.trim(),
        phone: clientPhone.trim(),
        cpf: cleanCPF,
        cep: clientCep.trim() || undefined,
        street: clientStreet.trim() || undefined,
        number: clientNumber.trim() || undefined,
        complement: clientComplement.trim() || undefined,
        neighborhood: clientNeighborhood.trim() || undefined,
        city: clientCity.trim() || undefined,
        state: clientState.trim() || undefined,
        address: fullAddress || undefined,
        createdAt: new Date().toISOString()
      };

      const itemsSummary = selectedItems.map(item => `${item.quantity}x ${item.product.name}`).join(", ");
      const totalOrderValue = selectedItems.reduce((sum, item) => {
        const itemVal = (item.customValue ?? item.product.price) * item.quantity;
        const freight = item.deliveryType === 'ENVIAR' ? (item.shippingValue || 0) : 0;
        return sum + itemVal + freight;
      }, 0);

      const auditLogRecord = {
        id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser?.uid || 'system',
        userEmail: auth.currentUser?.email || 'system',
        action: "Orçamento Criado",
        details: `Orçamento/Pedido em lote contendo [${itemsSummary}] no valor total de R$ ${totalOrderValue.toFixed(2)} criado via módulo de pedidos para o cliente ${clientName.trim()}.`
      };

      await createBudgetsTransactionally(newSales, customerRecord, auditLogRecord);

      setIsAddModalOpen(false);
      setSelectedItems([]);
      setClientName('');
      setClientPhone('');
      setClientCpf('');
      setClientCep('');
      setClientStreet('');
      setClientNumber('');
      setClientComplement('');
      setClientNeighborhood('');
      setClientCity('');
      setClientState('');
      setSelectedCustomerId('');
      setSelectedSellerId('');
      setNotes('');
      setPaymentMethod('DINHEIRO');
      setAddErrors({});
      setProductSearchTerm('');
      setCustomerSearchTerm('');
      setIsProductDropdownOpen(false);
      setIsCustomerDropdownOpen(false);
      alert("Pedido/Orçamento criado com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao criar pedido/orçamento.");
    }
  };

  // Edit Dialog States
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientCpf, setEditClientCpf] = useState('');
  const [editClientCep, setEditClientCep] = useState('');
  const [editClientStreet, setEditClientStreet] = useState('');
  const [editClientNumber, setEditClientNumber] = useState('');
  const [editClientComplement, setEditClientComplement] = useState('');
  const [editClientNeighborhood, setEditClientNeighborhood] = useState('');
  const [editClientCity, setEditClientCity] = useState('');
  const [editClientState, setEditClientState] = useState('');
  const [editSellerId, setEditSellerId] = useState('');
  const [editValue, setEditValue] = useState('0');
  const [editNotes, setEditNotes] = useState('');
  const [loadingEditCep, setLoadingEditCep] = useState(false);

  // Alterdata integration states
  const [alterdataSale, setAlterdataSale] = useState<Sale | null>(null);

  // Faturamento payment selection states
  const [faturandoSale, setFaturandoSale] = useState<Sale | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('DINHEIRO');

  // Split payment states
  const [paymentSplits, setPaymentSplits] = useState<{ method: PaymentMethod; amount: number; installments?: number }[]>([]);
  const [splitMethod, setSplitMethod] = useState<PaymentMethod>('DINHEIRO');
  const [splitAmount, setSplitAmount] = useState('');
  const [splitInstallments, setSplitInstallments] = useState<number>(1);

  // NF-e simulation states
  const [simulatingNfeSale, setSimulatingNfeSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  const dateFilteredSales = useMemo(() => {
    return sales.filter(s => {
      if (!filterDate) return true;
      return s.createdAt.startsWith(filterDate);
    });
  }, [sales, filterDate]);

  // Filter Sales list based on tab and search
  const filteredSales = useMemo(() => {
    return dateFilteredSales.filter(s => {
      // Status Filter
      if (activeTab !== 'ALL' && s.status !== activeTab) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.clientName.toLowerCase().includes(term) ||
        s.productName.toLowerCase().includes(term) ||
        s.productSku.toLowerCase().includes(term) ||
        (s.clientCpf && s.clientCpf.includes(term)) ||
        s.sellerName.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
      );
    });
  }, [dateFilteredSales, activeTab, searchTerm]);

  // Resumo Orçamento x Fechamento: as duas contam como venda, só em categorias
  // diferentes de faturamento (rótulos definidos em METHOD_LABELS, linha ~62:
  // CENTRAL='Orçamento'/ALTERDATA='Fechamento') -- mutuamente exclusivas:
  // orçamento = ainda não faturado OU faturado na categoria Orçamento;
  // fechamento = faturado na categoria Fechamento.
  const orcamentoFechamentoSummary = useMemo(() => {
    const orcamento = dateFilteredSales.filter(s => s.status === 'PENDING' || s.paymentMethod === 'CENTRAL');
    const fechamento = dateFilteredSales.filter(s => s.paymentMethod === 'ALTERDATA');
    return {
      orcamentoCount: orcamento.length,
      orcamentoTotal: orcamento.reduce((acc, s) => acc + s.value, 0),
      fechamentoCount: fechamento.length,
      fechamentoTotal: fechamento.reduce((acc, s) => acc + s.value, 0)
    };
  }, [dateFilteredSales]);

  // Handle Edit CEP lookup
  const handleEditCepLookup = async (cepVal: string) => {
    const clean = cepVal.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingEditCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setEditClientStreet(data.logradouro || '');
          setEditClientNeighborhood(data.bairro || '');
          setEditClientCity(data.localidade || '');
          setEditClientState(data.uf || '');
        }
      } catch (err) {
        console.error("ViaCEP Failed on edit budget lookup", err);
      } finally {
        setLoadingEditCep(false);
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    if (!editClientName.trim() || !editClientPhone.trim() || !editClientCpf.trim()) {
      alert("Nome, Telefone e CPF são obrigatórios.");
      return;
    }

    const cleanCpf = editClientCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      alert("CPF deve conter 11 dígitos.");
      return;
    }

    if (editDeliveryType === 'ENVIAR') {
      if (!editClientStreet.trim() || !editClientNumber.trim() || !editClientNeighborhood.trim() || !editClientCity.trim() || !editClientState.trim() || !editClientCep.trim()) {
        alert("Todos os campos do endereço (Rua, Número, Bairro, Cidade, Estado, CEP) são obrigatórios para envio.");
        return;
      }
    }

    const selectedSeller = sellers.find(s => s.id === editSellerId);

    try {
      const getCommissionPercent = (cat?: string) => {
        if (!cat) return 2.5;
        const c = cat.toLowerCase().trim();
        return c.includes('eletro') ? 1.2 : 2.5;
      };

      const valFloat = parseFloat(editValue) || editingSale.value;
      const commissionPercent = getCommissionPercent(editingSale.productCategory);
      const commissionValue = (valFloat * commissionPercent) / 100;

      const editingProduct = products.find(p => p.id === editingSale.productId);
      const taxPercent = editingProduct ? (editingProduct.taxPercent || 0) : (editingSale.taxPercent || 0);
      const taxValue = (valFloat * taxPercent) / 100;
      
      const assemblyPercent = editingProduct ? (editingProduct.assemblyPercent || 0) : 0;
      const assemblyValue = editingSale.needsAssembly 
        ? (valFloat * assemblyPercent) / 100 
        : 0;

      // Update associated physical delivery if exists
      const matchingDelivery = deliveries.find(d => d.notes?.includes(editingSale.id));
      if (matchingDelivery) {
        const updatedAddress = editDeliveryType === 'RETIRADA' 
          ? 'Retirada na Loja' 
          : (editClientStreet.trim() 
            ? `${editClientStreet.trim()}, ${editClientNumber.trim()}${editClientComplement.trim() ? ` - ${editClientComplement.trim()}` : ''} - ${editClientNeighborhood.trim()}, ${editClientCity.trim()} - ${editClientState.trim()}${editClientCep.trim() ? ` (CEP: ${editClientCep.trim()})` : ''}`
            : 'Retirada na Loja');
            
        await saveDelivery({
          ...matchingDelivery,
          customerName: editClientName.trim(),
          address: updatedAddress,
          itemsDescription: `1x ${editingSale.productName} (SKU: ${editingSale.productSku})`,
          needsAssembly: editingSale.needsAssembly
        });
      }

      await onUpdateSale({
        ...editingSale,
        clientName: editClientName.trim(),
        clientPhone: editClientPhone.trim(),
        clientCpf: cleanCpf,
        clientCep: editClientCep.trim() || undefined,
        clientStreet: editClientStreet.trim() || undefined,
        clientNumber: editClientNumber.trim() || undefined,
        clientComplement: editClientComplement.trim() || undefined,
        clientNeighborhood: editClientNeighborhood.trim() || undefined,
        clientCity: editClientCity.trim() || undefined,
        clientState: editClientState.trim() || undefined,
        sellerId: editSellerId,
        sellerName: selectedSeller ? selectedSeller.name : editingSale.sellerName,
        value: valFloat,
        commissionPercent,
        commissionValue,
        notes: editNotes.trim() || undefined,
        deliveryType: editDeliveryType,
        shippingValue: editShippingValue,
        assemblyValue,
        taxPercent,
        taxValue
      });
      setEditingSale(null);
      alert("Pedido atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar pedido.");
    }
  };

  // Trigger NF-e Flow
  const triggerNfeSimulation = (sale: Sale) => {
    setSimulatingNfeSale(sale);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportBudgetsAndFechamentoCsv = () => {
    // Filter sales that went to Orçamento (status PENDING or paymentMethod CENTRAL) or Fechamento (paymentMethod ALTERDATA)
    const targetSales = dateFilteredSales.filter(s => 
      s.status === 'PENDING' || 
      s.paymentMethod === 'CENTRAL' || 
      s.paymentMethod === 'ALTERDATA'
    );

    if (targetSales.length === 0) {
      alert("Nenhum registro de Orçamento ou Fechamento encontrado para exportação.");
      return;
    }

    const headers = [
      'ID Pedido', 
      'Data', 
      'Cliente', 
      'CPF', 
      'Telefone', 
      'Vendedor', 
      'Produto', 
      'SKU',
      'Valor (R$)', 
      'Forma Pagamento', 
      'Status',
      'Tipo Entrega',
      'Valor Frete (R$)',
      'Necessita Montagem',
      'Valor Montagem (R$)',
      'Observacoes'
    ];

    const getPaymentMethodLabel = (pm?: string, status?: string) => {
      if (status === 'PENDING') return 'Orçamento (Pendente)';
      if (pm === 'CENTRAL') return 'Orçamento (Faturado)';
      if (pm === 'ALTERDATA') return 'Fechamento';
      return pm || '';
    };

    const rows = targetSales.map(s => [
      s.id,
      new Date(s.createdAt).toLocaleDateString('pt-BR') + ' ' + new Date(s.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      s.clientName,
      s.clientCpf || '',
      s.clientPhone || '',
      s.sellerName || '',
      s.productName,
      s.productSku,
      s.value.toFixed(2),
      getPaymentMethodLabel(s.paymentMethod, s.status),
      s.status === 'COMPLETED' ? 'Faturado' : s.status === 'PENDING' ? 'Pendente' : 'Cancelado',
      s.deliveryType || '',
      (s.shippingValue || 0).toFixed(2),
      s.needsAssembly ? 'Sim' : 'Não',
      (s.assemblyValue || 0).toFixed(2),
      s.notes || ''
    ]);

    // Linhas de resumo ao final: total de pedidos e valor por categoria, pra não
    // precisar somar manualmente depois de baixar a planilha.
    const { orcamentoCount, orcamentoTotal, fechamentoCount, fechamentoTotal } = orcamentoFechamentoSummary;
    const summaryRows: string[][] = [
      [],
      ['RESUMO'],
      ['Total Orçamento (qtd. pedidos)', String(orcamentoCount), 'Total Orçamento (R$)', orcamentoTotal.toFixed(2)],
      ['Total Fechamento (qtd. pedidos)', String(fechamentoCount), 'Total Fechamento (R$)', fechamentoTotal.toFixed(2)],
      ['Total Geral (qtd. pedidos)', String(orcamentoCount + fechamentoCount), 'Total Geral (R$)', (orcamentoTotal + fechamentoTotal).toFixed(2)]
    ];

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';')),
      ...summaryRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_fechamento_orcamentos_${filterDate || new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header Banner */}
      <BudgetsHeader 
        handleExportCsv={handleExportBudgetsAndFechamentoCsv}
        onOpenAddModal={openAddModal}
        activeTab={activeTab}
        setActiveTab={setActiveTab as any}
      />

      {/* Resumo Orçamento x Fechamento -- as duas categorias contam como venda */}
      <BudgetsSummary summary={orcamentoFechamentoSummary} />

      {/* Main filter & table block */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Search & Actions Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, CPF, produto ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>
            <div className="w-full sm:w-auto">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 font-semibold text-center"
                title="Filtrar por data"
              />
            </div>
          </div>
          
          <div className="text-xs text-slate-400">
            Exibindo <span className="font-bold text-slate-700">{filteredSales.length}</span> registros de {dateFilteredSales.length} no total.
          </div>
        </div>

        {/* Sales/Budgets Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
          {filteredSales.length > 0 ? (
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60">
                  <th className="p-3">Data</th>
                  <th className="p-3">ID Pedido</th>
                  <th className="p-3">Cliente / CPF</th>
                  <th className="p-3">Produto / SKU</th>
                  <th className="p-3 text-right">Valor Venda</th>
                  <th className="p-3 text-center">Vendedor</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => {
                  const saleDate = new Date(sale.createdAt);
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Date */}
                      <td className="p-3 text-slate-500 font-mono">
                        <div>{saleDate.toLocaleDateString('pt-BR')}</div>
                        <div className="text-[10px] text-slate-400">{saleDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      
                      {/* ID */}
                      <td className="p-3 font-mono font-bold text-slate-600 uppercase text-[11px]">
                        {sale.id.replace('sale-', '').split('-')[0].slice(-6)}
                      </td>

                      {/* Client / CPF */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{sale.clientName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">CPF: {sale.clientCpf ? formatCPF(sale.clientCpf) : 'Não informado'}</div>
                        {sale.clientPhone && (
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">{sale.clientPhone}</div>
                        )}
                      </td>

                      {/* Product */}
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 line-clamp-1">{sale.productName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">SKU: {sale.productSku} • {sale.productCategory}</div>
                      </td>

                      {/* Value */}
                      <td className="p-3 text-right font-black text-slate-900 font-mono text-sm">
                        <div>{formatCurrency(sale.value)}</div>
                        {sale.deliveryType && (
                          <div className="text-[10px] font-sans font-semibold text-slate-500 mt-0.5">
                            {sale.deliveryType === 'RETIRADA' ? 'Retirada' : `Frete: ${formatCurrency(sale.shippingValue || 0)}`}
                          </div>
                        )}
                      </td>

                      {/* Seller */}
                      <td className="p-3 text-center text-slate-700 font-medium">
                        {sale.sellerName}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {sale.status === 'PENDING' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">Orçamento</span>
                          )}
                          {sale.status === 'COMPLETED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">Faturado</span>
                          )}
                          {sale.status === 'CANCELLED' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wider">Cancelado</span>
                          )}
                          {(() => {
                            const matchingDelivery = deliveries.find(d => d.notes?.includes(sale.id));
                            if (!matchingDelivery) return null;
                            return (
                              <span 
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-tight ${
                                  matchingDelivery.status === 'A_ENTREGAR'
                                    ? 'bg-blue-50/80 text-blue-700 border-blue-200/50'
                                    : 'bg-emerald-50/80 text-emerald-700 border-emerald-200/50'
                                }`}
                                title={matchingDelivery.status === 'A_ENTREGAR' ? 'Entrega física pendente' : 'Entregue e assinado'}
                              >
                                {matchingDelivery.status === 'A_ENTREGAR' ? 'A Entregar' : '✔ Entregue'}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex gap-1.5 justify-end items-center">
                          {/* Faturar Button (only if Pending and not seller) */}
                          {sale.status === 'PENDING' && userRole !== 'vendedor' && (
                            <button
                              type="button"
                              onClick={() => {
                                setFaturandoSale(sale);
                              }}
                              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-xs cursor-pointer active:scale-95 transition-all"
                              title="Faturar Orçamento (Baixar Estoque)"
                            >
                              Faturar
                            </button>
                          )}

                          {/* Simulate NF-e (only if Completed and not seller) */}
                          {sale.status === 'COMPLETED' && userRole !== 'vendedor' && (
                            <button
                              type="button"
                              onClick={() => triggerNfeSimulation(sale)}
                              className="px-2 py-1 text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-100 cursor-pointer"
                              title="Gerar/Simular Nota Fiscal (NF-e)"
                            >
                              Nota Fiscal
                            </button>
                          )}

                          {/* Integrar Alterdata (only if Completed and not seller) */}
                          {sale.status === 'COMPLETED' && userRole !== 'vendedor' && (
                            <button
                              type="button"
                              onClick={() => {
                                setAlterdataSale(sale);
                              }}
                              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white rounded shadow-xs cursor-pointer active:scale-95 transition-all"
                              title="Integração Alterdata"
                            >
                              Integrar
                            </button>
                          )}

                          {/* Print Budget/Receipt */}
                          {userRole !== 'vendedor' && (
                            <button
                              type="button"
                              onClick={() => onPrintSale(sale)}
                              className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer border border-slate-200"
                              title="Imprimir Pedido/Orçamento"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Details (sellers can only edit pending budgets) */}
                          {sale.status !== 'CANCELLED' && (userRole !== 'vendedor' || sale.status === 'PENDING') && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSale(sale);
                                setEditClientName(sale.clientName);
                                setEditClientPhone(sale.clientPhone);
                                setEditClientCpf(sale.clientCpf ? formatCPF(sale.clientCpf) : '');
                                setEditClientCep(sale.clientCep || '');
                                setEditClientStreet(sale.clientStreet || '');
                                setEditClientNumber(sale.clientNumber || '');
                                setEditClientComplement(sale.clientComplement || '');
                                setEditClientNeighborhood(sale.clientNeighborhood || '');
                                setEditClientCity(sale.clientCity || '');
                                setEditClientState(sale.clientState || '');
                                setEditSellerId(sale.sellerId);
                                setEditValue(String(sale.value));
                                setEditNotes(sale.notes || '');
                                setEditDeliveryType(sale.deliveryType || 'RETIRADA');
                                setEditShippingValue(sale.shippingValue || 0);
                                setEditFreightInput(sale.shippingValue ? String(sale.shippingValue) : '');
                              }}
                              className="p-1 text-blue-650 hover:bg-blue-50 rounded cursor-pointer border border-blue-200/40"
                              title="Editar Pedido/Orçamento"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Cancel Order (sellers can only cancel pending budgets) */}
                          {sale.status !== 'CANCELLED' && (userRole !== 'vendedor' || sale.status === 'PENDING') && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Deseja realmente CANCELAR este pedido? Se estiver faturado, o item de estoque será devolvido (${sale.productName}) e os valores fiscais cancelados.`)) {
                                  onCancelSale(sale.id);
                                }
                              }}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer border border-rose-200/40"
                              title="Cancelar Pedido"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete cancelled order */}
                          {sale.status === 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => setSaleToDelete(sale)}
                              className="p-1 text-red-700 hover:bg-red-50 rounded cursor-pointer border border-red-300/40"
                              title="Excluir Pedido Cancelado"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <ClipboardList className="w-12 h-12 mx-auto text-slate-300 stroke-1 mb-2 animate-bounce" />
              <p className="text-slate-800 font-bold text-sm">Nenhum pedido encontrado</p>
              <p className="text-xs text-slate-450 mt-0.5">Mude o filtro de status ou tente buscar outros termos.</p>
            </div>
          )}
        </div>

      </div>

      {/* Edit Sale/Budget Modal */}
      {editingSale && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider">
                Editar {editingSale.status === 'PENDING' ? 'Orçamento' : 'Pedido Faturado'}
              </h3>
              <button onClick={() => setEditingSale(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-left overflow-y-auto pr-1 flex-1">
              {/* Product Info (Read-only) */}
              <div className="bg-slate-50 p-3 rounded-lg border text-xs">
                <span className="block text-[9px] font-bold text-slate-400 uppercase">Item Vinculado</span>
                <span className="font-bold text-slate-800">{editingSale.productName}</span>
                <span className="block text-[10px] text-slate-500 font-mono mt-0.5">SKU: {editingSale.productSku} • Ref ID: {editingSale.productId}</span>
              </div>

              {/* Client Info */}
              <div className="space-y-3">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Informações do Cliente</span>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Nome do Cliente *</label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase mb-0.5">CPF *</label>
                    <input
                      type="text"
                      value={editClientCpf}
                      onChange={(e) => setEditClientCpf(formatCPF(e.target.value))}
                      maxLength={14}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase mb-0.5">Telefone *</label>
                    <input
                      type="text"
                      value={editClientPhone}
                      onChange={(e) => setEditClientPhone(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Edit Delivery Type Toggle */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Retirada / Entrega *</label>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectEditDeliveryType('RETIRADA')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      editDeliveryType === 'RETIRADA' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Retirada na Loja
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectEditDeliveryType('ENVIAR')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      editDeliveryType === 'ENVIAR' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Enviar (Entrega) {editShippingValue > 0 && `(+ ${formatCurrency(editShippingValue)})`}
                  </button>
                </div>
              </div>

              {/* Billing Address Details */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {editDeliveryType === 'ENVIAR' ? 'Endereço de Entrega (Obrigatório)' : 'Endereço do Cliente (Opcional)'}
                </span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">CEP {editDeliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editClientCep}
                        maxLength={9}
                        onChange={(e) => {
                          const val = formatCEP(e.target.value);
                          setEditClientCep(val);
                          handleEditCepLookup(val);
                        }}
                        className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-800 font-bold"
                      />
                      {loadingEditCep && (
                        <span className="absolute right-2 top-1 text-[8px] text-slate-400 animate-pulse">Buscando...</span>
                      )}
                </div>
              </div>

              <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">UF {editDeliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                    <input
                      type="text"
                      value={editClientState}
                      maxLength={2}
                      onChange={(e) => setEditClientState(e.target.value.toUpperCase())}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Cidade {editDeliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                    <input
                      type="text"
                      value={editClientCity}
                      onChange={(e) => setEditClientCity(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Bairro {editDeliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                    <input
                      type="text"
                      value={editClientNeighborhood}
                      onChange={(e) => setEditClientNeighborhood(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Rua / Logradouro {editDeliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                    <input
                      type="text"
                      value={editClientStreet}
                      onChange={(e) => setEditClientStreet(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Número {editDeliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                    <input
                      type="text"
                      value={editClientNumber}
                      onChange={(e) => setEditClientNumber(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Complemento</label>
                  <input
                    type="text"
                    value={editClientComplement}
                    onChange={(e) => setEditClientComplement(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50"
                  />
                </div>
              </div>

              {/* Financial & Seller details */}
              <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Valor do Pedido (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-850 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Vendedor Atribuído</label>
                  {userRole === 'vendedor' ? (
                    <input
                      type="text"
                      value={sellers.find(s => s.id === editSellerId)?.name || ''}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-600 font-semibold"
                      disabled
                    />
                  ) : (
                    <select
                      value={editSellerId}
                      onChange={(e) => setEditSellerId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 font-semibold"
                    >
                      {sellers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase mb-0.5">Observações Gerais</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  placeholder="Instruções de entrega, cor selecionada, etc..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer"
                >
                  Salvar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emit NF-e Modal */}
      {simulatingNfeSale && (
        <EmitNfeModal
          sale={simulatingNfeSale}
          onClose={() => setSimulatingNfeSale(null)}
          formatCPF={formatCPF}
        />
      )}

      {/* Add Sale/Budget Modal */}
      {isAddModalOpen && (() => {
        const isAnyShipping = selectedItems.some(item => item.deliveryType === 'ENVIAR');
        return (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full overflow-hidden border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center border-b pb-3 shrink-0">
                <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider">
                  Gerar Novo Pedido / Orçamento
                </h3>
                <button 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setSelectedItems([]);
                    setAddErrors({});
                  }} 
                  className="text-slate-405 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="text-left flex flex-col flex-1 min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto pr-2 pb-2">
                  {/* Left Column: Products */}
                  <div className="space-y-4 lg:border-r lg:border-slate-100 lg:pr-4">

                {/* Product Selection */}
                <div className="space-y-1 relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selecionar Produto *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar produto por nome ou SKU..."
                      value={productSearchTerm}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        setIsProductDropdownOpen(true);
                      }}
                      onFocus={() => setIsProductDropdownOpen(true)}
                      className={`w-full pl-8 pr-3 py-1.5 text-xs border ${addErrors.product ? 'border-rose-500' : 'border-slate-200'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none`}
                    />
                    {isProductDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[140]" onClick={() => setIsProductDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1 max-h-[300px] overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-[150] divide-y divide-slate-100">
                          {searchedProducts.length > 0 ? (
                            searchedProducts.map(p => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  handleAddProductItem(p);
                                  setIsProductDropdownOpen(false);
                                  setProductSearchTerm('');
                                  if (addErrors.product) setAddErrors({ ...addErrors, product: '' });
                                }}
                                className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {p.imageUrl && (
                                    <img src={p.imageUrl} className="w-6 h-6 object-contain rounded bg-white border" alt={p.name} />
                                  )}
                                  <div className="text-left">
                                    <span className="font-bold text-slate-800 block leading-tight">{p.name}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">SKU: {p.sku} | Estoque: <span className={p.stock > 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>{p.stock}</span></span>
                                  </div>
                                </div>
                                <span className="font-bold text-slate-900 font-mono shrink-0 pl-2">{formatCurrency(p.price)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-center text-slate-400 text-xs">Nenhum produto encontrado</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {addErrors.product && (
                    <span className="text-[10px] font-bold text-rose-600 block">{addErrors.product}</span>
                  )}
                </div>

                {/* Selected Products List */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Itens Selecionados ({selectedItems.length})</label>
                  
                  {selectedItems.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      Nenhum produto selecionado. Use o campo acima para pesquisar e adicionar produtos ao pedido.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                      {selectedItems.map((item) => (
                        <div key={item.id} className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2">
                          
                          {/* Row 1: Product Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.product.imageUrl && (
                                <img src={item.product.imageUrl} className="w-8 h-8 object-contain rounded bg-white border shrink-0" alt={item.product.name} />
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-slate-800 block text-xs truncate">{item.product.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">SKU: {item.product.sku} • Preço Padrão: {formatCurrency(item.product.price)}</span>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setSelectedItems(selectedItems.filter(si => si.id !== item.id))}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Row 2: Price and Quantity */}
                          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-405 uppercase">Preço Unitário (R$)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.customValue ?? item.product.price}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setSelectedItems(selectedItems.map(si =>
                                    si.id === item.id ? { ...si, customValue: isNaN(val) ? undefined : val } : si
                                  ));
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-850 font-bold focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-405 uppercase">Quantidade</label>
                              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 mt-0.5 max-w-[100px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantity > 1) {
                                      setSelectedItems(selectedItems.map(si => si.id === item.id ? { ...si, quantity: si.quantity - 1 } : si));
                                    }
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-600 font-bold text-xs cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="flex-1 text-center text-xs font-black text-slate-800">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedItems(selectedItems.map(si => si.id === item.id ? { ...si, quantity: si.quantity + 1 } : si));
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-600 font-bold text-xs cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Row 3: Delivery and Assembly */}
                          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-405 uppercase">Forma de Retirada/Entrega</label>
                              <div className="flex bg-slate-100 p-0.5 rounded-lg gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedItems(selectedItems.map(si => si.id === item.id ? { ...si, deliveryType: 'RETIRADA', shippingValue: 0 } : si))}
                                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-all text-center cursor-pointer ${
                                    item.deliveryType === 'RETIRADA' 
                                      ? 'bg-blue-600 text-white shadow-xs' 
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Retirada
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedItems(selectedItems.map(si => si.id === item.id ? { ...si, deliveryType: 'ENVIAR' } : si))}
                                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-all text-center cursor-pointer ${
                                    item.deliveryType === 'ENVIAR' 
                                      ? 'bg-blue-600 text-white shadow-xs' 
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Entrega
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-405 uppercase">Montagem</label>
                              <div className="flex bg-slate-100 p-0.5 rounded-lg gap-1 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedItems(selectedItems.map(si => si.id === item.id ? { ...si, needsAssembly: true } : si))}
                                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-all text-center cursor-pointer ${
                                    item.needsAssembly 
                                      ? 'bg-blue-600 text-white shadow-xs' 
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Com
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedItems(selectedItems.map(si => si.id === item.id ? { ...si, needsAssembly: false } : si))}
                                  className={`flex-1 py-1 rounded text-[10px] font-bold transition-all text-center cursor-pointer ${
                                    !item.needsAssembly 
                                      ? 'bg-blue-600 text-white shadow-xs' 
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Sem
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Freight Value input */}
                          {item.deliveryType === 'ENVIAR' && (
                            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                              <span className="text-[9px] font-bold text-slate-450 uppercase">Valor do Frete (R$) *</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.shippingValue || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setSelectedItems(selectedItems.map(si => si.id === item.id ? { ...si, shippingValue: val } : si));
                                }}
                                className="w-24 px-2 py-1 text-xs border border-slate-200 rounded bg-white font-bold text-slate-800 focus:outline-none"
                                placeholder="0,00"
                                required
                              />
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  )}
                </div>
                </div>

                {/* Right Column: Customer & Details */}
                <div className="space-y-4 lg:pl-2">

                {/* Customer Selection */}
                <div className="space-y-1 relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Selecionar Cliente Cadastrado</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar cliente por nome, CPF ou telefone..."
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none"
                    />
                    {isCustomerDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[140]" onClick={() => setIsCustomerDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-[150] divide-y divide-slate-100">
                          <div
                            onClick={() => {
                              handleCustomerChange('');
                              setIsCustomerDropdownOpen(false);
                              setCustomerSearchTerm('');
                            }}
                            className="p-2 hover:bg-slate-50 cursor-pointer text-xs font-bold text-blue-600 text-left transition-colors"
                          >
                            + Cadastrar Novo Cliente
                          </div>
                          {searchedCustomers.length > 0 ? (
                            searchedCustomers.map(c => (
                              <div
                                key={c.id}
                                onClick={() => {
                                  handleCustomerChange(c.id);
                                  setIsCustomerDropdownOpen(false);
                                  setCustomerSearchTerm(c.name);
                                }}
                                className="p-2 hover:bg-slate-50 cursor-pointer text-xs text-left transition-colors"
                              >
                                <span className="font-bold text-slate-800 block leading-tight">{c.name}</span>
                                <span className="text-[10px] text-slate-550 font-mono block">
                                  CPF: {c.cpf ? formatCPF(c.cpf) : 'Não informado'} • Tel: {c.phone}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-center text-slate-400 text-xs">Nenhum cliente encontrado</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Client Info */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Informações do Cliente</span>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Nome do Cliente *</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => {
                        setClientName(e.target.value);
                        if (addErrors.name) setAddErrors({ ...addErrors, name: '' });
                      }}
                      className={`w-full px-3 py-1.5 text-xs border ${addErrors.name ? 'border-rose-500' : 'border-slate-200'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold`}
                      required
                    />
                    {addErrors.name && (
                      <span className="text-[10px] font-bold text-rose-600 block">{addErrors.name}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase mb-0.5">CPF *</label>
                      <input
                        type="text"
                        value={clientCpf}
                        onChange={(e) => {
                          setClientCpf(formatCPF(e.target.value));
                          if (addErrors.cpf) setAddErrors({ ...addErrors, cpf: '' });
                        }}
                        maxLength={14}
                        className={`w-full px-3 py-1.5 text-xs border ${addErrors.cpf ? 'border-rose-500' : 'border-slate-200'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold`}
                        required
                      />
                      {addErrors.cpf && (
                        <span className="text-[10px] font-bold text-rose-600 block">{addErrors.cpf}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-455 uppercase mb-0.5">Telefone *</label>
                      <input
                        type="text"
                        value={clientPhone}
                        onChange={(e) => {
                          setClientPhone(e.target.value);
                          if (addErrors.phone) setAddErrors({ ...addErrors, phone: '' });
                        }}
                        className={`w-full px-3 py-1.5 text-xs border ${addErrors.phone ? 'border-rose-500' : 'border-slate-200'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold`}
                        required
                      />
                      {addErrors.phone && (
                        <span className="text-[10px] font-bold text-rose-600 block">{addErrors.phone}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Billing Address Details */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isAnyShipping ? 'Endereço de Entrega (Obrigatório)' : 'Endereço do Cliente (Opcional)'}
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">CEP {isAnyShipping && <span className="text-rose-500">*</span>}</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={clientCep}
                          maxLength={9}
                          onChange={(e) => {
                            const val = formatCEP(e.target.value);
                            setClientCep(val);
                            handleAddCepLookup(val);
                            if (addErrors.cep) setAddErrors({ ...addErrors, cep: '' });
                          }}
                          className={`w-full px-2 py-1 text-xs border ${addErrors.cep ? 'border-rose-500' : 'border-slate-200'} rounded bg-slate-50 text-slate-800 font-bold`}
                        />
                        {loadingCep && (
                          <span className="absolute right-2 top-1 text-[8px] text-slate-400 animate-pulse">Buscando...</span>
                        )}
                      </div>
                      {addErrors.cep && (
                        <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{addErrors.cep}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">UF {isAnyShipping && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        value={clientState}
                        maxLength={2}
                        onChange={(e) => {
                          setClientState(e.target.value.toUpperCase());
                          if (addErrors.state) setAddErrors({ ...addErrors, state: '' });
                        }}
                        className={`w-full px-2 py-1 text-xs border ${addErrors.state ? 'border-rose-500' : 'border-slate-200'} rounded bg-slate-50 text-slate-800 font-bold`}
                      />
                      {addErrors.state && (
                        <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{addErrors.state}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Cidade {isAnyShipping && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        value={clientCity}
                        onChange={(e) => {
                          setClientCity(e.target.value);
                          if (addErrors.city) setAddErrors({ ...addErrors, city: '' });
                        }}
                        className={`w-full px-2 py-1 text-xs border ${addErrors.city ? 'border-rose-500' : 'border-slate-200'} rounded bg-slate-50`}
                      />
                      {addErrors.city && (
                        <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{addErrors.city}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Bairro {isAnyShipping && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        value={clientNeighborhood}
                        onChange={(e) => {
                          setClientNeighborhood(e.target.value);
                          if (addErrors.neighborhood) setAddErrors({ ...addErrors, neighborhood: '' });
                        }}
                        className={`w-full px-2 py-1 text-xs border ${addErrors.neighborhood ? 'border-rose-500' : 'border-slate-200'} rounded bg-slate-50`}
                      />
                      {addErrors.neighborhood && (
                        <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{addErrors.neighborhood}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Rua / Logradouro {isAnyShipping && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        value={clientStreet}
                        onChange={(e) => {
                          setClientStreet(e.target.value);
                          if (addErrors.street) setAddErrors({ ...addErrors, street: '' });
                        }}
                        className={`w-full px-2 py-1 text-xs border ${addErrors.street ? 'border-rose-500' : 'border-slate-200'} rounded bg-slate-50`}
                      />
                      {addErrors.street && (
                        <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{addErrors.street}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Número {isAnyShipping && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        value={clientNumber}
                        onChange={(e) => {
                          setClientNumber(e.target.value);
                          if (addErrors.number) setAddErrors({ ...addErrors, number: '' });
                        }}
                        className={`w-full px-2 py-1 text-xs border ${addErrors.number ? 'border-rose-500' : 'border-slate-200'} rounded bg-slate-50 text-slate-800 font-bold`}
                      />
                      {addErrors.number && (
                        <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{addErrors.number}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Complemento</label>
                    <input
                      type="text"
                      value={clientComplement}
                      onChange={(e) => setClientComplement(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50"
                    />
                  </div>
                </div>

                {/* Financial & Seller details */}
                <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-450 uppercase mb-0.5">Valor do Pedido (R$)</label>
                    <div className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-850 font-bold">
                      {formatCurrency(selectedItems.reduce((sum, item) => {
                        const val = (item.customValue ?? item.product.price) * item.quantity;
                        const freight = item.deliveryType === 'ENVIAR' ? (item.shippingValue || 0) : 0;
                        return sum + val + freight;
                      }, 0))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-455 uppercase mb-0.5">Vendedor Atribuído *</label>
                    {userRole === 'vendedor' ? (
                      <input
                        type="text"
                        value={currentSeller?.name || ''}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-650 font-semibold"
                        disabled
                      />
                    ) : (
                      <select
                        value={selectedSellerId}
                        onChange={(e) => {
                          setSelectedSellerId(e.target.value);
                          if (addErrors.seller) setAddErrors({ ...addErrors, seller: '' });
                        }}
                        className={`w-full px-3 py-1.5 text-xs border ${addErrors.seller ? 'border-rose-500' : 'border-slate-200'} rounded-lg bg-slate-50 font-semibold`}
                      >
                        <option value="">Selecione um vendedor...</option>
                        {sellers.filter(s => s.active !== false).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    )}
                    {addErrors.seller && (
                      <span className="text-[10px] font-bold text-rose-600 block">{addErrors.seller}</span>
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento *</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1 flex-wrap">
                    {([
                      { value: 'DINHEIRO', label: 'Dinheiro' },
                      { value: 'CREDIARIO', label: 'Crediário' },
                      { value: 'CARTAO', label: 'Cartão' },
                      { value: 'CARTAO_X', label: 'Cartão X' },
                      { value: 'PIX', label: 'PIX' }
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPaymentMethod(opt.value)}
                        className={`flex-1 min-w-[70px] py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                          paymentMethod === opt.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-455 uppercase mb-0.5">Observações Gerais</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
                    placeholder="Instruções de entrega, cor selecionada, etc..."
                  />
                </div>
                </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setSelectedItems([]);
                      setAddErrors({});
                      setPaymentMethod('DINHEIRO');
                    }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer"
                  >
                    Salvar Pedido/Orçamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal de Confirmação de Faturamento (Escolha da Forma de Pagamento) */}
      {faturandoSale && (() => {
        const totalSaleValue = faturandoSale.value;
        const totalAllocated = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
        const remainingAmount = Math.max(0, parseFloat((totalSaleValue - totalAllocated).toFixed(2)));
        const isFullyAllocated = Math.abs(remainingAmount) < 0.01;

        return (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b pb-3 shrink-0">
                <h3 className="text-sm font-black text-slate-900 font-display uppercase tracking-wider">
                  Confirmar Faturamento
                </h3>
                <button 
                  onClick={() => setFaturandoSale(null)} 
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-600 font-medium leading-relaxed text-left">
                  Você está faturando o pedido de <span className="font-bold text-slate-900">{faturandoSale.clientName}</span> no valor de <span className="font-bold text-slate-900">{formatCurrency(faturandoSale.value)}</span>.
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1 text-left">
                  <span className="font-semibold text-slate-700 block">{faturandoSale.productName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">SKU: {faturandoSale.productSku}</span>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Caixa</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    {([
                      { value: 'CENTRAL' as PaymentMethod, label: 'Orçamento' },
                      { value: 'ALTERDATA' as PaymentMethod, label: 'Fechamento' }
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(opt.value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                          selectedPaymentMethod === opt.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Splits management */}
                <div className="space-y-2 text-left border-t border-slate-100 pt-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Divisão de Pagamentos</label>
                  
                  {/* List of current splits */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {paymentSplits.length > 0 ? (
                      paymentSplits.map((split, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
                          <span className="font-semibold text-slate-800">
                            {METHOD_LABELS[split.method] || split.method}{split.installments && split.installments > 1 ? ` (${split.installments}x)` : ''}: <span className="font-bold text-slate-900">{formatCurrency(split.amount)}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentSplits(paymentSplits.filter((_, i) => i !== idx));
                            }}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic text-center py-1">Nenhuma forma de pagamento alocada.</p>
                    )}
                  </div>

                  {/* Allocation summary */}
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100/60 text-[10px] font-bold text-center">
                    <div className="bg-slate-100 p-1.5 rounded text-slate-600">
                      <span>Total</span>
                      <span className="block text-xs font-black text-slate-800 font-mono mt-0.5">{formatCurrency(totalSaleValue)}</span>
                    </div>
                    <div className="bg-blue-50 p-1.5 rounded text-blue-600">
                      <span>Alocado</span>
                      <span className="block text-xs font-black text-blue-800 font-mono mt-0.5">{formatCurrency(totalAllocated)}</span>
                    </div>
                    <div className={`p-1.5 rounded ${isFullyAllocated ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      <span>{isFullyAllocated ? 'Pago' : 'Faltando'}</span>
                      <span className="block text-xs font-black font-mono mt-0.5">{formatCurrency(remainingAmount)}</span>
                    </div>
                  </div>

                  {/* Add new split */}
                  {remainingAmount > 0 && (
                    <div className="bg-slate-50/50 border border-slate-200/60 p-2.5 rounded-xl mt-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Forma</label>
                          <select
                            value={splitMethod}
                            onChange={(e) => setSplitMethod(e.target.value as PaymentMethod)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded text-slate-800 font-bold focus:outline-none"
                          >
                            <option value="DINHEIRO">Dinheiro</option>
                            <option value="PIX">PIX</option>
                            <option value="CARTAO">Cartão</option>
                            <option value="CARTAO_X">Cartão X</option>
                            <option value="CREDIARIO">Crediário</option>
                          </select>
                        </div>
                        {(splitMethod === 'CARTAO' || splitMethod === 'CARTAO_X') && (
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Parcelas</label>
                            <select
                              value={splitInstallments}
                              onChange={(e) => setSplitInstallments(Number(e.target.value))}
                              className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded text-slate-800 font-bold focus:outline-none"
                            >
                              {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                                <option key={n} value={n}>{n}x</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={remainingAmount}
                            placeholder={remainingAmount.toFixed(2)}
                            value={splitAmount}
                            onChange={(e) => setSplitAmount(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 bg-white rounded text-slate-800 font-bold focus:outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseFloat(splitAmount) || remainingAmount;
                          if (val <= 0) return;
                          if (val > remainingAmount + 0.01) {
                            alert("O valor não pode exceder o montante faltante.");
                            return;
                          }
                          // Add or merge split
                          const existingIdx = paymentSplits.findIndex(s => s.method === splitMethod && s.installments === splitInstallments);
                          if (existingIdx !== -1) {
                            const updated = [...paymentSplits];
                            updated[existingIdx].amount = parseFloat((updated[existingIdx].amount + val).toFixed(2));
                            setPaymentSplits(updated);
                          } else {
                            setPaymentSplits([...paymentSplits, { method: splitMethod, amount: parseFloat(val.toFixed(2)), installments: splitInstallments }]);
                          }
                          setSplitAmount('');
                          setSplitInstallments(1);
                        }}
                        className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded transition-colors uppercase tracking-wider cursor-pointer font-sans"
                      >
                        Adicionar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t shrink-0">
                <button
                  type="button"
                  onClick={() => setFaturandoSale(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer font-sans"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={!isFullyAllocated}
                  onClick={async () => {
                    await onInvoiceSale(faturandoSale.id, selectedPaymentMethod, paymentSplits);
                    if (selectedPaymentMethod === 'ALTERDATA') {
                      setAlterdataSale({ ...faturandoSale, status: 'COMPLETED', paymentMethod: selectedPaymentMethod, paymentSplits });
                    }
                    setFaturandoSale(null);
                  }}
                  className={`px-4 py-2 text-white text-xs font-black rounded-lg shadow-sm cursor-pointer transition-colors font-sans ${
                    isFullyAllocated
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  Faturar Pedido
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de valor do frete (Edit Mode) */}
      <EditFreightModal
        isOpen={isEditFreightModalOpen}
        freightInput={editFreightInput}
        setFreightInput={setEditFreightInput}
        onCancel={handleCancelEditFreight}
        onConfirm={handleConfirmEditFreight}
      />

      {/* Modal de Integração Alterdata */}
      {alterdataSale && (
        <AlterdataModal 
          alterdataSale={alterdataSale}
          onClose={() => setAlterdataSale(null)}
          onInvoiceSale={onInvoiceSale}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      {saleToDelete && (
        <DeleteConfirmationDialog
          icon={<Trash2 className="w-6 h-6" />}
          title="Excluir Pedido"
          message={<>Tem certeza que deseja EXCLUIR permanentemente este pedido cancelado de <strong>{saleToDelete.clientName}</strong> ({saleToDelete.productName})? Esta ação não pode ser desfeita.</>}
          confirmLabel="Sim, excluir pedido"
          onCancel={() => setSaleToDelete(null)}
          onConfirm={() => {
            onDeleteSale(saleToDelete.id);
            setSaleToDelete(null);
          }}
        />
      )}

    </div>
  );
};
