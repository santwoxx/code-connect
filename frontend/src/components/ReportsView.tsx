/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  Layers, 
  Plus, 
  Trash2, 
  Edit, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  CheckCircle,
  FileCheck,
  AlertTriangle,
  X,
  Shield,
  Users,
  Lock,
  UserPlus,
  Database,
  ShieldAlert,
  Truck,
  Package,
  Wrench,
  RefreshCw,
  Search,
  Cloud,
  Clock
} from 'lucide-react';
import { Category, Product, Payment, Seller, Deliverer, Estoquista, Caixa, Montador, Sale, Delivery } from '../types';
import { fetchAllowedEmails, whitelistEmail, removeAllowedEmail, saveMasterPin, fetchSellers, saveSeller, logAuditEvent, importCommercialCatalog, fetchDeliverers, saveDeliverer, removeSeller, removeDeliverer, fetchEstoquistas, saveEstoquista, removeEstoquista, fetchCaixas, saveCaixa, removeCaixa, fetchMontadores, saveMontador, removeMontador, saveProduct, saveTransaction, removeProduct, fetchAuditLogs } from '../db';
import { getBackupInfo } from '../firebase';
import { isOwnerEmail } from '../config/adminEmails';
import { CSV_HEADER_ALIASES } from '../config/reportsData';
import { SellerDashboardView } from './SellerDashboardView';
import { AuditMetricsCards } from './reports/AuditMetricsCards';
import { DiagnosisCard } from './reports/DiagnosisCard';
import { CategoryForm } from './reports/CategoryForm';
import { CategoriesTable } from './reports/CategoriesTable';
import { EditSellerModal } from './reports/EditSellerModal';
import { EditDelivererModal } from './reports/EditDelivererModal';
import { EditEstoquistaModal } from './reports/EditEstoquistaModal';
import { EditCaixaModal } from './reports/EditCaixaModal';
import { EditMontadorModal } from './reports/EditMontadorModal';
import { DeleteConfirmationDialog } from './shared/DeleteConfirmationDialog';

interface ReportsViewProps {
  categories: Category[];
  products: Product[];
  payments: Payment[];
  sales: Sale[];
  deliveries: Delivery[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onImportData: (data: { products: Product[]; categories: Category[]; payments: any[] }) => void;
  onClearDatabase?: () => Promise<void> | void;
  onPrintSale?: (sale: Sale) => void;
}

function parseCSV(text: string, separator: string = ','): string[][] {
  const lines: string[][] = [];
  let row: string[] = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === separator && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  categories,
  products,
  payments,
  sales,
  deliveries,
  onAddCategory,
  onDeleteCategory,
  onImportData,
  onClearDatabase,
  onPrintSale
}) => {
  // Tabs: Categories vs Financial reports, backups, and security
  const [activeSubTab, setActiveSubTab] = useState<'CATEGORIES' | 'AUDIT' | 'SECURITY' | 'SELLERS' | 'AUDIT_LOGS'>('AUDIT');



  // Backup notice
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupInfo, setBackupInfo] = useState<{ lastBackup: string | null; todayBackupExists: boolean }>({ lastBackup: null, todayBackupExists: false });

  useEffect(() => {
    getBackupInfo().then(setBackupInfo);
  }, []);

  // Security Whitelisting states
  const [allowedEmails, setAllowedEmails] = useState<{ email: string; role: string; createdAt: string }[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailRole, setNewEmailRole] = useState('admin');
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Pin setting states
  const [newPinInput, setNewPinInput] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);

  // Custom Confirmation States to circumvent blocked iframe browser prompts
  const [emailToRevoke, setEmailToRevoke] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [backupParsedToImport, setBackupParsedToImport] = useState<any | null>(null);
  const [showProductionResetDialog, setShowProductionResetDialog] = useState(false);
  const [productionResetKeyInput, setProductionResetKeyInput] = useState('');

  // Operator selection
  const [operatorType, setOperatorType] = useState<'vendedor' | 'entregador' | 'estoquista' | 'caixa' | 'montador'>('vendedor');

  // Seller Whitelisting and management states
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerUser, setNewSellerUser] = useState('');
  const [newSellerPass, setNewSellerPass] = useState('');
  const [newSellerPin, setNewSellerPin] = useState('');
  const [newSellerGmail, setNewSellerGmail] = useState('');
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [editSellerName, setEditSellerName] = useState('');
  const [editSellerUser, setEditSellerUser] = useState('');
  const [editSellerPass, setEditSellerPass] = useState('');
  const [editSellerPin, setEditSellerPin] = useState('');
  const [editSellerGmail, setEditSellerGmail] = useState('');

  // Deliverer Whitelisting and management states
  const [deliverers, setDeliverers] = useState<Deliverer[]>([]);
  const [loadingDeliverers, setLoadingDeliverers] = useState(false);
  const [newDelivererName, setNewDelivererName] = useState('');
  const [newDelivererUser, setNewDelivererUser] = useState('');
  const [newDelivererPass, setNewDelivererPass] = useState('');
  const [newDelivererGmail, setNewDelivererGmail] = useState('');
  const [editingDeliverer, setEditingDeliverer] = useState<Deliverer | null>(null);
  const [editDelivererName, setEditDelivererName] = useState('');
  const [editDelivererUser, setEditDelivererUser] = useState('');
  const [editDelivererPass, setEditDelivererPass] = useState('');
  const [editDelivererGmail, setEditDelivererGmail] = useState('');

  // Estoquista management states
  const [estoquistas, setEstoquistas] = useState<Estoquista[]>([]);
  const [loadingEstoquistas, setLoadingEstoquistas] = useState(false);
  const [newEstoquistaName, setNewEstoquistaName] = useState('');
  const [newEstoquistaUser, setNewEstoquistaUser] = useState('');
  const [newEstoquistaPass, setNewEstoquistaPass] = useState('');
  const [newEstoquistaGmail, setNewEstoquistaGmail] = useState('');
  const [editingEstoquista, setEditingEstoquista] = useState<Estoquista | null>(null);
  const [editEstoquistaName, setEditEstoquistaName] = useState('');
  const [editEstoquistaUser, setEditEstoquistaUser] = useState('');
  const [editEstoquistaPass, setEditEstoquistaPass] = useState('');
  const [editEstoquistaGmail, setEditEstoquistaGmail] = useState('');

  // Montador management states
  const [montadores, setMontadores] = useState<Montador[]>([]);
  const [loadingMontadores, setLoadingMontadores] = useState(false);
  const [newMontadorName, setNewMontadorName] = useState('');
  const [newMontadorUser, setNewMontadorUser] = useState('');
  const [newMontadorPass, setNewMontadorPass] = useState('');
  const [newMontadorCommission, setNewMontadorCommission] = useState('');
  const [newMontadorGmail, setNewMontadorGmail] = useState('');
  const [editingMontador, setEditingMontador] = useState<Montador | null>(null);
  const [editMontadorName, setEditMontadorName] = useState('');
  const [editMontadorUser, setEditMontadorUser] = useState('');
  const [editMontadorPass, setEditMontadorPass] = useState('');
  const [editMontadorCommission, setEditMontadorCommission] = useState('');
  const [editMontadorGmail, setEditMontadorGmail] = useState('');

  // Caixa management states
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [loadingCaixas, setLoadingCaixas] = useState(false);
  const [newCaixaName, setNewCaixaName] = useState('');
  const [newCaixaUser, setNewCaixaUser] = useState('');
  const [newCaixaPass, setNewCaixaPass] = useState('');
  const [newCaixaGmail, setNewCaixaGmail] = useState('');
  const [editingCaixa, setEditingCaixa] = useState<Caixa | null>(null);
  const [editCaixaName, setEditCaixaName] = useState('');
  const [editCaixaUser, setEditCaixaUser] = useState('');
  const [editCaixaPass, setEditCaixaPass] = useState('');
  const [editCaixaGmail, setEditCaixaGmail] = useState('');

  const [viewingSellerDashboard, setViewingSellerDashboard] = useState<Seller | null>(null);
  const [viewingDelivererDashboard, setViewingDelivererDashboard] = useState<Deliverer | null>(null);

  const loadAllowedEmails = async () => {
    setLoadingEmails(true);
    try {
      const data = await fetchAllowedEmails();
      setAllowedEmails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const loadSellers = async () => {
    setLoadingSellers(true);
    try {
      const data = await fetchSellers();
      setSellers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSellers(false);
    }
  };

  const loadDeliverers = async () => {
    setLoadingDeliverers(true);
    try {
      const data = await fetchDeliverers();
      setDeliverers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDeliverers(false);
    }
  };

  const loadEstoquistas = async () => {
    setLoadingEstoquistas(true);
    try {
      const data = await fetchEstoquistas();
      setEstoquistas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEstoquistas(false);
    }
  };

  const loadCaixas = async () => {
    setLoadingCaixas(true);
    try {
      const data = await fetchCaixas();
      setCaixas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCaixas(false);
    }
  };

  const loadMontadores = async () => {
    setLoadingMontadores(true);
    try {
      const data = await fetchMontadores();
      setMontadores(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMontadores(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'SECURITY') {
      loadAllowedEmails();
    } else if (activeSubTab === 'SELLERS') {
      loadSellers();
      loadDeliverers();
      loadEstoquistas();
      loadCaixas();
      loadMontadores();
    }
  }, [activeSubTab]);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const emailToWhitelist = newEmail.trim().toLowerCase();
    if (!emailToWhitelist) return;

    if (!emailToWhitelist.includes('@')) {
      setEmailError('Por favor, insira um endereço de e-mail válido.');
      return;
    }

    try {
      await whitelistEmail(emailToWhitelist, newEmailRole);
      setNewEmail('');
      setNewEmailRole('admin');
      setEmailSuccess(`E-mail ${emailToWhitelist} autorizado para login com sucesso!`);
      loadAllowedEmails();
      setTimeout(() => setEmailSuccess(null), 4000);
    } catch (err: any) {
      setEmailError(`Erro ao autorizar e-mail: ${err.message || err}`);
    }
  };

  const handleRemoveEmail = (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (isOwnerEmail(cleanEmail)) {
      alert('Proprietários administradores nativos não podem ser removidos do controle de login.');
      return;
    }
    setEmailToRevoke(cleanEmail);
  };

  const executeRemoveEmail = async (cleanEmail: string) => {
    setEmailError(null);
    setEmailSuccess(null);
    try {
      await removeAllowedEmail(cleanEmail);
      setEmailSuccess(`Acesso do e-mail ${cleanEmail} removido com sucesso.`);
      loadAllowedEmails();
      setTimeout(() => setEmailSuccess(null), 4000);
    } catch (err: any) {
      setEmailError(`Erro ao revogar acesso: ${err.message || err}`);
    }
  };

  const handleUpdateMasterPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    const pin = newPinInput.trim();
    if (!pin) return;

    if (pin.length < 4) {
      setPinError('A nova senha master de segurança deve conter pelo menos 4 caracteres.');
      return;
    }

    setSavingPin(true);
    try {
      await saveMasterPin(pin);
      setNewPinInput('');
      setPinSuccess('Senha Master de Segurança atualizada de forma segura no banco de dados!');
      setTimeout(() => setPinSuccess(null), 4000);
    } catch (err: any) {
      setPinError(`Erro ao atualizar senha master: ${err.message || err}`);
    } finally {
      setSavingPin(false);
    }
  };

  // 1. Calculations: Valuation of Inventory
  const auditMetrics = useMemo(() => {
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let totalItemsStocked = 0;
    let productsWithProfit = 0;
    let totalItemsWithProfitSum = 0;

    products.forEach(p => {
      totalCostValuation += p.costPrice * p.currentStock;
      totalRetailValuation += p.price * p.currentStock;
      totalItemsStocked += p.currentStock;
      
      if (p.price > p.costPrice) {
        productsWithProfit++;
        totalItemsWithProfitSum += (p.price - p.costPrice) * p.currentStock;
      }
    });

    const averageMarginPercent = products.length > 0 
      ? products.reduce((acc, p) => acc + (p.price > 0 ? ((p.price - p.costPrice) / p.price) * 100 : 0), 0) / products.length 
      : 0;

    return {
      totalCostValuation,
      totalRetailValuation,
      totalItemsStocked,
      productsWithProfit,
      totalItemsWithProfitSum,
      averageMarginPercent
    };
  }, [products]);



  // Export JSON file
  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
        JSON.stringify({
          version_export: '1.0',
          exported_at: new Date().toISOString(),
          products,
          categories,
          payments
        }, null, 2)
      );
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `backup_estoque_er_financeiro_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupMessage('Backup exportado com sucesso! Salve seu arquivo para restaurações futuras.');
      setTimeout(() => setBackupMessage(null), 6000);
    } catch (e) {
      alert('Erro ao exportar arquivo de dados local.');
    }
  };

   // Import JSON file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.categories)) {
          setBackupParsedToImport(parsed);
        } else {
          alert('Este arquivo JSON não possui um formato compatível para restauração.');
        }
      } catch (err) {
        alert('Falha na leitura ou conversão sintática do arquivo enviado.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  const executeImportBackup = (parsed: any) => {
    onImportData({
      products: parsed.products,
      categories: parsed.categories,
      payments: Array.isArray(parsed.payments) ? parsed.payments : []
    });
    setBackupMessage('Os dados do sistema foram carregados e validados perfeitamente!');
    setTimeout(() => setBackupMessage(null), 6000);
  };

  // CSV Import States
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImportMode, setCsvImportMode] = useState<'MERGE_ADD' | 'MERGE_SET' | 'OVERWRITE'>('MERGE_ADD');
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);

  // Audit Logs States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsSearchQuery, setLogsSearchQuery] = useState('');
  const [logsActionFilter, setLogsActionFilter] = useState('ALL');

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const logs = await fetchAuditLogs();
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(logs);
    } catch (err) {
      console.error("Erro ao carregar logs de auditoria:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'AUDIT_LOGS') {
      loadLogs();
    }
  }, [activeSubTab]);

  const handleProcessCsv = (text: string) => {
    try {
      setCsvParseError(null);
      if (!text.trim()) {
        setCsvPreview([]);
        return;
      }

      const separator = text.includes(';') ? ';' : ',';
      const lines = parseCSV(text, separator);
      if (lines.length < 2) {
        setCsvParseError('A planilha deve conter pelo menos uma linha de cabeçalho e uma linha de dados.');
        return;
      }

      const headers = lines[0].map(h => h.trim().toLowerCase());
      
      const getHeaderIndex = (aliases: string[]) => {
        return headers.findIndex(h => aliases.some(alias => h.includes(alias)));
      };

      const skuIdx = getHeaderIndex(CSV_HEADER_ALIASES.sku);
      const nameIdx = getHeaderIndex(CSV_HEADER_ALIASES.name);
      const priceIdx = getHeaderIndex(CSV_HEADER_ALIASES.price);
      const costIdx = getHeaderIndex(CSV_HEADER_ALIASES.cost);
      const stockIdx = getHeaderIndex(CSV_HEADER_ALIASES.stock);
      const minStockIdx = getHeaderIndex(CSV_HEADER_ALIASES.minStock);
      const categoryIdx = getHeaderIndex(CSV_HEADER_ALIASES.category);
      const descIdx = getHeaderIndex(CSV_HEADER_ALIASES.description);
      const locationIdx = getHeaderIndex(CSV_HEADER_ALIASES.location);

      if (skuIdx === -1 || nameIdx === -1) {
        setCsvParseError('Não foi possível identificar as colunas obrigatórias "SKU" e "Nome" no cabeçalho.');
        return;
      }

      const parsedProductsList: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        if (row.length < 2 || !row[skuIdx]?.trim()) continue;

        const sku = row[skuIdx].trim();
        const name = row[nameIdx].trim();
        const price = priceIdx !== -1 ? (parseFloat(row[priceIdx].replace(',', '.')) || 0) : 0;
        const costPrice = costIdx !== -1 ? (parseFloat(row[costIdx].replace(',', '.')) || 0) : 0;
        const currentStock = stockIdx !== -1 ? (parseInt(row[stockIdx]) || 0) : 0;
        const minStock = minStockIdx !== -1 ? (parseInt(row[minStockIdx]) || 0) : 0;
        const category = categoryIdx !== -1 ? (row[categoryIdx]?.trim() || 'Geral') : 'Geral';
        const description = descIdx !== -1 ? row[descIdx]?.trim() : '';
        const location = locationIdx !== -1 ? row[locationIdx]?.trim() : '';

        parsedProductsList.push({
          sku,
          name,
          price,
          costPrice,
          currentStock,
          minStock,
          category,
          description,
          location
        });
      }

      if (parsedProductsList.length === 0) {
        setCsvParseError('Nenhum produto válido encontrado nas linhas de dados.');
      } else {
        setCsvPreview(parsedProductsList);
      }
    } catch (err: any) {
      setCsvParseError(`Erro ao processar planilha: ${err.message || err}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setCsvText(text);
        handleProcessCsv(text);
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteCsvImport = async () => {
    if (csvPreview.length === 0) return;
    
    try {
      setBackupMessage('Iniciando importação de planilha...');
      
      if (csvImportMode === 'OVERWRITE') {
        if (!confirm('ATENÇÃO: A opção "Sobrescrever Catálogo" irá deletar todos os produtos e movimentações de estoque existentes antes de importar. Deseja continuar?')) {
          return;
        }
        for (const p of products) {
          await removeProduct(p.id);
        }
      }

      let importedCount = 0;
      let updatedCount = 0;

      for (const item of csvPreview) {
        const existing = products.find(p => p.sku.toLowerCase() === item.sku.toLowerCase());

        let finalProduct: Product;
        let diffStock = item.currentStock;
        let isAddition = true;

        if (existing) {
          let newStock = existing.currentStock;
          if (csvImportMode === 'MERGE_ADD') {
            newStock = existing.currentStock + item.currentStock;
            diffStock = item.currentStock;
            isAddition = true;
          } else if (csvImportMode === 'MERGE_SET') {
            newStock = item.currentStock;
            diffStock = item.currentStock - existing.currentStock;
            isAddition = diffStock >= 0;
            diffStock = Math.abs(diffStock);
          }

          finalProduct = {
            ...existing,
            name: item.name || existing.name,
            price: item.price || existing.price,
            costPrice: item.costPrice || existing.costPrice,
            currentStock: newStock,
            minStock: item.minStock || existing.minStock,
            category: item.category || existing.category,
            description: item.description || existing.description,
            location: item.location || existing.location
          };
          updatedCount++;
        } else {
          const productId = `prod-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          finalProduct = {
            id: productId,
            sku: item.sku,
            name: item.name,
            price: item.price,
            costPrice: item.costPrice,
            currentStock: item.currentStock,
            minStock: item.minStock,
            category: item.category,
            description: item.description,
            location: item.location,
            createdAt: new Date().toISOString(),
            active: true
          };
          importedCount++;
        }

        await saveProduct(finalProduct);

        if (diffStock > 0 || !existing) {
          const txId = `t-csv-${finalProduct.sku}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await saveTransaction({
            id: txId,
            productId: finalProduct.id,
            productName: finalProduct.name,
            type: isAddition ? 'IN' : 'OUT',
            quantity: diffStock,
            reason: 'AJUSTE',
            description: existing 
              ? `Ajuste de estoque via importação de planilha CSV (Modo: ${csvImportMode === 'MERGE_ADD' ? 'Somar' : 'Definir'})`
              : 'Lançamento de estoque inicial via planilha CSV',
            date: new Date().toISOString(),
            value: diffStock * (isAddition ? finalProduct.costPrice : finalProduct.price)
          });
        }
      }

      setBackupMessage(`Importação concluída! ${importedCount} novos produtos adicionados, ${updatedCount} produtos atualizados.`);
      setIsCsvModalOpen(false);
      setCsvText('');
      setCsvPreview([]);
      setCsvFile(null);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      alert(`Erro na importação: ${err.message || err}`);
    }
  };

  const handleProductionReset = () => {
    if (!onClearDatabase) return;
    setProductionResetKeyInput('');
    setShowProductionResetDialog(true);
  };

  const executeProductionReset = async () => {
    if (!onClearDatabase) return;
    if (productionResetKeyInput.trim() !== "PRODUCAO") {
      alert("Para confirmar esta operação, você deve digitar exatamente a palavra 'PRODUCAO' em letras maiúsculas.");
      return;
    }

    try {
      await onClearDatabase();
      setBackupMessage("Banco de dados completamente zerado! O sistema agora está vazio e 100% pronto para a produção da sua loja. Cadastre suas próprias categorias e móveis no estoque.");
      setTimeout(() => setBackupMessage(null), 10000);
      setShowProductionResetDialog(false);
    } catch (err: any) {
      alert(`Falha ao estabelecer conexão de limpeza: ${err.message || err}`);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Configurações & Auditoria Financeira</h1>
        <p className="text-sm text-slate-500">Acesse métricas de circulação de mercadoria, mude categorias do sistema ou baixe backups seguros de salvamento local.</p>
      </div>

      {/* Internal Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-none" id="subtabs-reports">
        <button
          onClick={() => setActiveSubTab('AUDIT')}
          className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer shrink-0 ${activeSubTab === 'AUDIT' ? 'border-blue-600 text-blue-650 bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
        >
          Análise de Margens & Backup
        </button>
        <button
          onClick={() => setActiveSubTab('CATEGORIES')}
          className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer shrink-0 ${activeSubTab === 'CATEGORIES' ? 'border-blue-600 text-blue-650 bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
        >
          <span className="flex items-center gap-1.5 justify-center">
            <Layers className="w-4 h-4 shrink-0" />
            <span>Categorizar Produtos ({categories.length})</span>
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('SECURITY')}
          className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer shrink-0 ${activeSubTab === 'SECURITY' ? 'border-blue-600 text-blue-650 bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
        >
          <span className="flex items-center gap-1.5 justify-center">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Segurança & Usuários</span>
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('SELLERS')}
          className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer shrink-0 ${activeSubTab === 'SELLERS' ? 'border-blue-600 text-blue-650 bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
        >
          <span className="flex items-center gap-1.5 justify-center">
            <Users className="w-4 h-4 shrink-0" />
            <span>Vendedores & Operadores</span>
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('AUDIT_LOGS')}
          className={`px-5 py-3 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer shrink-0 ${activeSubTab === 'AUDIT_LOGS' ? 'border-blue-600 text-blue-650 bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
        >
          <span className="flex items-center gap-1.5 justify-center">
            <FileCheck className="w-4 h-4 shrink-0" />
            <span>Logs de Auditoria</span>
          </span>
        </button>
      </div>

      {backupMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{backupMessage}</span>
          </div>
          <button onClick={() => setBackupMessage(null)} className="text-emerald-700 hover:text-emerald-900 font-bold shrink-0">
            Fechar
          </button>
        </div>
      )}

      {activeSubTab === 'AUDIT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="audit-sub-panel">
          {/* Audit Metrics block */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-base font-bold font-display text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-650" /> Valuation Patrimonial de Estoque Físico
              </h3>
              
              <AuditMetricsCards auditMetrics={auditMetrics} />
            </div>

            {/* Practical Advice based on stocks */}
            <DiagnosisCard averageMarginPercent={auditMetrics.averageMarginPercent} />
          </div>

          {/* Backup Action box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-max">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 mb-2 flex items-center gap-2">
                <Download className="w-5 h-5 text-slate-600 font-bold" /> Cópia Fiel de Segurança
              </h3>
              <p className="text-xs text-slate-450 mb-4 leading-relaxed">
                Garanta a integridade total do seu histórico de transações. Os arquivos baixados são guardados localmente de forma privada no formato JSON.
              </p>
            </div>

            {/* Daily Backup Status */}
            <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Backup Automático Diário</span>
              </div>
              {backupInfo.todayBackupExists ? (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Backup de hoje realizado</span>
                  <span className="text-slate-400 ml-auto">{backupInfo.lastBackup}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-700 font-semibold">Backup de hoje pendente</span>
                  {backupInfo.lastBackup && (
                    <span className="text-slate-400 ml-auto">Último: {backupInfo.lastBackup}</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              {/* Backup export trigger */}
              <button
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-xs cursor-pointer transition-all hover:translate-y-[-1px]"
                id="btn-export-backup"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Dados (.JSON)</span>
              </button>

              {/* Import trigger */}
              <div className="relative">
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-sm rounded-lg shadow-xs cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Restaurar Backup (.JSON)</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    title="Selecione um arquivo de backup em JSON gerado anteriormente neste sistema"
                  />
                </label>
              </div>

              {/* Import CSV button */}
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-sm rounded-lg shadow-xs cursor-pointer transition-all"
                id="btn-import-csv"
              >
                <FileCheck className="w-4 h-4" />
                <span>Importar Planilha (CSV)</span>
              </button>

              {onClearDatabase && (
                <div className="pt-3 border-t border-dashed border-slate-100 mt-2 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2 text-center">Ambiente de Operação</span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm("Deseja importar a tabela completa com os 418 produtos da loja? Esta ação criará ou atualizará o estoque padrão e as categorias.")) {
                        try {
                          setBackupMessage("Importando catálogo de produtos (418 itens)...");
                          await importCommercialCatalog();
                          setBackupMessage("Catálogo comercial de 418 produtos importado com sucesso! Recarregando os dados...");
                          setTimeout(() => window.location.reload(), 1500);
                        } catch (err) {
                          alert("Erro ao importar catálogo: " + err);
                        }
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 font-black text-xs rounded-lg transition-all shadow-xs cursor-pointer"
                    id="btn-import-catalog-418"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Importar Catálogo da Loja (418 Itens)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleProductionReset}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-700 font-black text-xs rounded-lg transition-all shadow-xs cursor-pointer"
                    id="btn-clear-production"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Exemplos para Produção</span>
                  </button>
                </div>
              )}

              <span className="text-[10px] text-slate-450 block text-center leading-normal">
                Formatos compatíveis: .JSON ou .CSV
              </span>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT PLANILHA CSV MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in text-slate-850">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold font-display text-slate-900 flex items-center gap-2 text-sm">
                <Database className="w-5 h-5 text-blue-600" />
                Importar Estoque (Planilha CSV)
              </h3>
              <button 
                onClick={() => { setIsCsvModalOpen(false); setCsvPreview([]); setCsvParseError(null); }} 
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="bg-blue-50 border border-blue-150 p-4 rounded-xl text-blue-800 space-y-2 leading-relaxed">
                <p className="font-bold">Como preparar sua planilha:</p>
                <p>1. Crie uma planilha no Excel ou Google Sheets com os cabeçalhos: <code className="font-mono bg-blue-100 px-1.5 py-0.2 rounded font-bold">sku</code>, <code className="font-mono bg-blue-100 px-1.5 py-0.2 rounded font-bold">nome</code>, <code className="font-mono bg-blue-100 px-1.5 py-0.2 rounded font-bold">preco</code>, <code className="font-mono bg-blue-100 px-1.5 py-0.2 rounded font-bold">custo</code>, <code className="font-mono bg-blue-100 px-1.5 py-0.2 rounded font-bold">estoque</code>, <code className="font-mono bg-blue-100 px-1.5 py-0.2 rounded font-bold">minimo</code>, <code className="font-mono bg-blue-100 px-1.5 py-0.2 rounded font-bold">categoria</code>, <code className="font-mono bg-blue-100 px-1.5 py-0.2 rounded font-bold">descricao</code>, <code className="font-mono bg-blue-100 px-1.5 py-0.2 rounded font-bold">localizacao</code>.</p>
                <p>2. Salve o arquivo no formato **CSV (Separado por vírgulas ou ponto e vírgula)**.</p>
                <p>3. Faça o upload do arquivo abaixo ou cole o conteúdo diretamente.</p>
              </div>

              {/* Upload input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Selecionar arquivo CSV</label>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-slate-200 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-750 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {/* Textarea paste */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Ou colar dados em formato CSV (cabeçalho na primeira linha)</label>
                <textarea
                  placeholder="sku;nome;preco;custo;estoque;categoria&#10;CADA-01;Cadeira Presidente;899.90;450.00;10;Cadeiras"
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    handleProcessCsv(e.target.value);
                  }}
                  rows={4}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800"
                />
              </div>

              {/* Import Mode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Modo de Importação</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setCsvImportMode('MERGE_ADD')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${csvImportMode === 'MERGE_ADD' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <span className="font-bold text-xs block text-slate-850">Somar ao Estoque</span>
                    <span className="text-[10px] text-slate-400 mt-1 block leading-normal">Soma a quantidade da planilha ao estoque atual do SKU.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCsvImportMode('MERGE_SET')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${csvImportMode === 'MERGE_SET' ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <span className="font-bold text-xs block text-slate-850">Definir Novo Saldo</span>
                    <span className="text-[10px] text-slate-400 mt-1 block leading-normal">Substitui o saldo atual pelo valor da planilha.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCsvImportMode('OVERWRITE')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${csvImportMode === 'OVERWRITE' ? 'border-rose-500 bg-rose-50/10' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <span className="font-bold text-xs block text-rose-700">Sobrescrever Tudo</span>
                    <span className="text-[10px] text-slate-400 mt-1 block leading-normal">Apaga todos os produtos existentes antes de importar.</span>
                  </button>
                </div>
              </div>

              {/* Error logs */}
              {csvParseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{csvParseError}</span>
                </div>
              )}

              {/* Preview table */}
              {csvPreview.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Pré-visualização ({csvPreview.length} produtos encontrados)</label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                          <th className="p-2">SKU</th>
                          <th className="p-2">Nome</th>
                          <th className="p-2">Preço</th>
                          <th className="p-2">Custo</th>
                          <th className="p-2 text-center">Estoque</th>
                          <th className="p-2">Categoria</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {csvPreview.slice(0, 5).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 font-mono text-blue-600 font-bold">{item.sku}</td>
                            <td className="p-2 truncate max-w-[150px]">{item.name}</td>
                            <td className="p-2">{formatCurrency(item.price)}</td>
                            <td className="p-2">{formatCurrency(item.costPrice)}</td>
                            <td className="p-2 text-center">{item.currentStock}</td>
                            <td className="p-2">{item.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.length > 5 && (
                    <p className="text-[10px] text-slate-450 italic text-right">Exibindo os primeiros 5 de {csvPreview.length} itens encontrados.</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5 shrink-0 text-xs">
              <button
                type="button"
                onClick={() => { setIsCsvModalOpen(false); setCsvPreview([]); setCsvParseError(null); }}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteCsvImport}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                disabled={csvPreview.length === 0}
              >
                Confirmar Importação de {csvPreview.length} Itens
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'AUDIT_LOGS' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="audit-logs-panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900">Histórico de Auditoria</h3>
              <p className="text-xs text-slate-400">Registro cronológico de todas as operações e eventos de segurança do sistema.</p>
            </div>
            <button
              onClick={loadLogs}
              disabled={loadingLogs}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por operador, detalhes ou ação..."
                value={logsSearchQuery}
                onChange={(e) => setLogsSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>
            <div>
              <select
                value={logsActionFilter}
                onChange={(e) => setLogsActionFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="ALL">Todas as Ações</option>
                {Array.from(new Set(auditLogs.map(l => l.action))).map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            {loadingLogs ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Carregando logs de auditoria...</span>
              </div>
            ) : (
              (() => {
                const filtered = auditLogs.filter(log => {
                  const term = logsSearchQuery.toLowerCase();
                  const matchesSearch = 
                    (log.operator || '').toLowerCase().includes(term) ||
                    (log.action || '').toLowerCase().includes(term) ||
                    (log.details || '').toLowerCase().includes(term);
                  const matchesAction = logsActionFilter === 'ALL' || log.action === logsActionFilter;
                  return matchesSearch && matchesAction;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Nenhum registro de auditoria encontrado.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider text-[10px]">
                          <th className="p-3">Data & Hora</th>
                          <th className="p-3">Operador</th>
                          <th className="p-3">Ação</th>
                          <th className="p-3">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {filtered.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-3 whitespace-nowrap text-slate-450 font-mono text-[11px]">
                              {new Date(log.date).toLocaleDateString('pt-BR')} {new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-3 font-semibold text-slate-900 truncate max-w-[150px]" title={log.operator}>
                              {log.operator || 'Sistema'}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-850 border border-blue-100 rounded text-[10px] font-bold">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 max-w-sm break-words leading-relaxed">
                              {log.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'CATEGORIES' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="categories-panel">
          {/* Left panel: add category form */}
          <CategoryForm onAddCategory={onAddCategory} />

          {/* Right panel: list of current categories */}
          <CategoriesTable categories={categories} onDeleteRequest={setCategoryToDelete} />
        </div>
      )}

      {activeSubTab === 'SECURITY' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="security-panel">
          
          {/* Left panel: Update master pin */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-max">
            <h3 className="text-base font-bold font-display text-slate-900 mb-2 flex items-center gap-2">
              <Lock className="w-4.5 h-4.5 text-blue-600 shrink-0" /> Alterar Senha Master
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-normal font-sans">
              A senha master / PIN protege as chamadas administrativas de banco de dados e ações de salvamento e exclusão física no CentralSync.
            </p>

            <form onSubmit={handleUpdateMasterPin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nova Senha Master ou PIN <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Mínimo 4 caracteres"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all font-mono"
                  required
                />
              </div>

              {pinError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded-lg">
                  {pinError}
                </div>
              )}

              {pinSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg">
                  {pinSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={savingPin}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {savingPin ? 'Salvando...' : 'Gravar Nova Senha'}
              </button>
            </form>
          </div>

          {/* Right panel: Whitelist of allowed emails */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600 shrink-0" /> Usuários Validados (Google Sign-In)
              </h3>
              <p className="text-xs text-slate-500 leading-normal font-sans">
                Apenas os e-mails listados abaixo terão autorização de acesso e edição ao sistema do ERP CentralSync após a autenticação corporativa via Google.
              </p>
            </div>

            {/* Form to whitelist new email */}
            <form onSubmit={handleAddEmail} className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50 rounded-xl border border-slate-250">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  E-mail do Novo Operador / Administrador <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Ex: operador@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white transition-all"
                  required
                />
              </div>
              <div className="w-full md:w-56">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Cargo / Perfil de Acesso <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newEmailRole}
                  onChange={(e) => setNewEmailRole(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white transition-all cursor-pointer font-medium text-slate-700"
                >
                  <option value="admin">Administrador Geral</option>
                  <option value="estoquista">Estoquista / Entregador</option>
                  <option value="caixa">Caixa</option>
                </select>
              </div>
              <div className="md:self-end">
                <button
                  type="submit"
                  className="w-full md:w-auto px-5 py-2 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5 h-[36px]"
                >
                  <Plus className="w-4 h-4 shrink-0" /> Autorizar
                </button>
              </div>
            </form>

            {emailError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
                {emailError}
              </div>
            )}

            {emailSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
                {emailSuccess}
              </div>
            )}

            {/* Whitelisted emails table list */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lista de Acessos Atuais</p>
              
              {loadingEmails ? (
                <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                  Carregando lista de acessos...
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {allowedEmails.map((item) => {
                    const isProtected = isOwnerEmail(item.email);
                    return (
                      <div key={item.email} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-xs sm:text-xs font-mono truncate">{item.email}</p>
                          <div className="flex gap-2 items-center">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isProtected ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : item.role === 'estoquista' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                              {item.role === 'estoquista' ? 'Estoquista / Entregador' : item.role === 'admin' ? 'Administrador' : item.role}
                            </span>
                            <span className="text-[10px] text-slate-400">cadastrado em {new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div>
                          {isProtected ? (
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50/60 px-2 py-1 rounded border border-indigo-100 flex items-center gap-1 cursor-not-allowed select-none" title="Administrador nativo protegido.">
                              <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Proprietário Nativo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(item.email)}
                              className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-205 hover:border-transparent rounded-lg text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all"
                              title="Revogar Acesso"
                            >
                <Trash2 className="w-3.5 h-3.5 shrink-0" /> Revogar Permissão
                            </button>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2.5. SELLERS MANAGEMENT SUB-TAB */}
        {activeSubTab === 'SELLERS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub-toggle between Vendedores, Entregadores, Estoquistas, Caixas */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/60 font-sans">
            <button
              type="button"
              onClick={() => setOperatorType('vendedor')}
              className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${operatorType === 'vendedor' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Users className="w-3.5 h-3.5" />
              Vendedores
            </button>
            <button
              type="button"
              onClick={() => setOperatorType('entregador')}
              className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${operatorType === 'entregador' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Truck className="w-3.5 h-3.5" />
              Entregadores
            </button>
            <button
              type="button"
              onClick={() => setOperatorType('estoquista')}
              className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${operatorType === 'estoquista' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Package className="w-3.5 h-3.5" />
              Estoquistas
            </button>
            <button
              type="button"
              onClick={() => setOperatorType('caixa')}
              className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${operatorType === 'caixa' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Caixas
            </button>
            <button
              type="button"
              onClick={() => setOperatorType('montador')}
              className={`py-1.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${operatorType === 'montador' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Montadores
            </button>
          </div>

          {operatorType === 'vendedor' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="sellers-panel">
              {/* Left panel: Add Seller form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-max">
                <h3 className="text-base font-bold font-display text-slate-900 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5 text-blue-600 font-bold" /> Novo Vendedor
                </h3>
                
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newSellerName.trim() || !newSellerUser.trim() || !newSellerPass.trim()) return;
                    
                    // Check username duplicate
                    if (sellers.some(s => s.username.toLowerCase() === newSellerUser.trim().toLowerCase())) {
                      alert("Este nome de usuário já está em uso por outro vendedor.");
                      return;
                    }

                     const newSel: Seller = {
                      id: `seller-${Date.now()}`,
                      name: newSellerName.trim(),
                      username: newSellerUser.trim(),
                      password: newSellerPass.trim(),
                      pin: newSellerPin.trim() || undefined,
                      googleEmail: newSellerGmail.trim() || undefined,
                      active: true,
                      createdAt: new Date().toISOString()
                    };
 
                    try {
                      await saveSeller(newSel);
                      await logAuditEvent("Cadastro de Vendedor", `Vendedor ${newSel.name} (${newSel.username}) cadastrado.`);
                      setNewSellerName('');
                      setNewSellerUser('');
                      setNewSellerPass('');
                      setNewSellerPin('');
                      setNewSellerGmail('');
                      loadSellers();
                      alert("Vendedor cadastrado com sucesso!");
                    } catch (err) {
                      alert("Erro ao cadastrar vendedor.");
                    }
                  }}
                  className="space-y-4 text-left"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Nome Completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: João Silva"
                      value={newSellerName}
                      onChange={(e) => setNewSellerName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-semibold"
                      required
                    />
                  </div>
 
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Nome de Usuário (Username) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: joaosilva"
                      value={newSellerUser}
                      onChange={(e) => setNewSellerUser(e.target.value.replace(/\s/g, ""))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono"
                      required
                    />
                  </div>
 
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Senha de Acesso <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Ex: 123456"
                      value={newSellerPass}
                      onChange={(e) => setNewSellerPass(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      E-mail do Google (Gmail)
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: vendedores@gmail.com"
                      value={newSellerGmail}
                      onChange={(e) => setNewSellerGmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800"
                    />
                  </div>
 
                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Cadastrar Vendedor
                  </button>
                </form>
              </div>

              {/* Right panel: list of registered sellers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900 mb-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600 shrink-0" /> Vendedores Cadastrados
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal font-sans">
                    Gerencie credenciais internas dos vendedores, ative ou desative o status e gerencie vínculos com contas Google.
                  </p>
                </div>

                {loadingSellers ? (
                  <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                    Carregando lista de vendedores...
                  </div>
                ) : sellers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-455 border border-dashed rounded-xl">
                    Nenhum vendedor cadastrado no momento.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {sellers.map((s) => {
                      return (
                        <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors text-left">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border">
                                Usuário: {s.username}
                              </span>
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${s.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                {s.active ? 'Ativo' : 'Inativo'}
                              </span>
                              {s.googleEmail ? (
                                <span className="text-[10px] text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-150">
                                  Google: {s.googleEmail}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  Aguardando vínculo Google
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingSellerDashboard(s)}
                              className="px-2.5 py-1 text-purple-650 hover:text-white hover:bg-purple-600 border border-purple-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer"
                            >
                              Ver Desempenho
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSeller(s);
                                setEditSellerName(s.name);
                                setEditSellerUser(s.username);
                                setEditSellerPass(s.password || '');
                                setEditSellerPin(s.pin || '');
                                setEditSellerGmail(s.googleEmail || '');
                              }}
                              className="px-2.5 py-1 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const updated = { ...s, active: !s.active };
                                await saveSeller(updated);
                                await logAuditEvent("Alteração de Vendedor", `Status do vendedor ${s.name} alterado para ${updated.active ? 'Ativo' : 'Inativo'}.`);
                                loadSellers();
                              }}
                              className={`px-2.5 py-1 ${s.active ? 'text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-200' : 'text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200'} rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer`}
                            >
                              {s.active ? 'Desativar' : 'Ativar'}
                            </button>
                            {s.googleEmail ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Remover vínculo com a conta Google (${s.googleEmail}) do vendedor ${s.name}?`)) {
                                    const updated = { ...s, googleEmail: '' };
                                    await saveSeller(updated);
                                    await logAuditEvent("Alteração de Vendedor", `Desvinculada conta Google do vendedor ${s.name}.`);
                                    loadSellers();
                                  }
                                }}
                                className="px-2 py-1 text-slate-500 hover:text-white hover:bg-slate-650 border rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer"
                                title="Desvincular Google"
                              >
                                Desvincular
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Deseja realmente excluir permanentemente o vendedor ${s.name}?`)) {
                                  try {
                                    await removeSeller(s.id);
                                    await logAuditEvent("Exclusão de Vendedor", `Vendedor ${s.name} (${s.username}) excluído.`);
                                    loadSellers();
                                    alert("Vendedor excluído com sucesso!");
                                  } catch (err) {
                                    alert("Erro ao excluir vendedor.");
                                  }
                                }
                              }}
                              className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : operatorType === 'entregador' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="deliverers-panel">
              {/* Left panel: Add Deliverer form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-max">
                <h3 className="text-base font-bold font-display text-slate-900 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5 text-blue-600 font-bold" /> Novo Entregador
                </h3>
                
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newDelivererName.trim() || !newDelivererUser.trim() || !newDelivererPass.trim()) return;
                    
                    // Check username duplicate
                    if (deliverers.some(d => d.username.toLowerCase() === newDelivererUser.trim().toLowerCase())) {
                      alert("Este nome de usuário já está em uso por outro entregador.");
                      return;
                    }

                    const newDel: Deliverer = {
                      id: `deliverer-${Date.now()}`,
                      name: newDelivererName.trim(),
                      username: newDelivererUser.trim(),
                      password: newDelivererPass.trim(),
                      googleEmail: newDelivererGmail.trim() || undefined,
                      active: true,
                      createdAt: new Date().toISOString()
                    };

                    try {
                      await saveDeliverer(newDel);
                      await logAuditEvent("Cadastro de Entregador", `Entregador ${newDel.name} (${newDel.username}) cadastrado.`);
                      setNewDelivererName('');
                      setNewDelivererUser('');
                      setNewDelivererPass('');
                      setNewDelivererGmail('');
                      loadDeliverers();
                      alert("Entregador cadastrado com sucesso!");
                    } catch (err) {
                      alert("Erro ao cadastrar entregador.");
                    }
                  }}
                  className="space-y-4 text-left"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Nome Completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Silva"
                      value={newDelivererName}
                      onChange={(e) => setNewDelivererName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Nome de Usuário (Username) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: carlossilva"
                      value={newDelivererUser}
                      onChange={(e) => setNewDelivererUser(e.target.value.replace(/\s/g, ""))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Senha de Acesso <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Ex: 123456"
                      value={newDelivererPass}
                      onChange={(e) => setNewDelivererPass(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      E-mail do Google (Gmail)
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: entregadores@gmail.com"
                      value={newDelivererGmail}
                      onChange={(e) => setNewDelivererGmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Cadastrar Entregador
                  </button>
                </form>
              </div>

              {/* Right panel: list of registered deliverers */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900 mb-1 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600 shrink-0" /> Entregadores Cadastrados
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal font-sans">
                    Gerencie credenciais internas dos entregadores, ative ou desative o status e gerencie vínculos com contas Google.
                  </p>
                </div>

                {loadingDeliverers ? (
                  <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                    Carregando lista de entregadores...
                  </div>
                ) : deliverers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-455 border border-dashed rounded-xl">
                    Nenhum entregador cadastrado no momento.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {deliverers.map((d) => {
                      return (
                        <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors text-left">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 text-sm">{d.name}</p>
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border">
                                Usuário: {d.username}
                              </span>
                              <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${d.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                {d.active ? 'Ativo' : 'Inativo'}
                              </span>
                              {d.googleEmail ? (
                                <span className="text-[10px] text-indigo-600 font-mono bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-150">
                                  Google: {d.googleEmail}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  Aguardando vínculo Google
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingDelivererDashboard(d)}
                              className="px-2.5 py-1 text-purple-650 hover:text-white hover:bg-purple-600 border border-purple-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer"
                            >
                              Ver Desempenho
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDeliverer(d);
                                setEditDelivererName(d.name);
                                setEditDelivererUser(d.username);
                                setEditDelivererPass(d.password || '');
                                setEditDelivererGmail(d.googleEmail || '');
                              }}
                              className="px-2.5 py-1 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const updated = { ...d, active: !d.active };
                                await saveDeliverer(updated);
                                await logAuditEvent("Alteração de Entregador", `Status do entregador ${d.name} alterado para ${updated.active ? 'Ativo' : 'Inativo'}.`);
                                loadDeliverers();
                              }}
                              className={`px-2.5 py-1 ${d.active ? 'text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-200' : 'text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200'} rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer`}
                            >
                              {d.active ? 'Desativar' : 'Ativar'}
                            </button>
                            {d.googleEmail ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Remover vínculo com a conta Google (${d.googleEmail}) do entregador ${d.name}?`)) {
                                    const updated = { ...d, googleEmail: '' };
                                    await saveDeliverer(updated);
                                    await logAuditEvent("Alteração de Entregador", `Desvinculada conta Google do entregador ${d.name}.`);
                                    loadDeliverers();
                                  }
                                }}
                                className="px-2 py-1 text-slate-500 hover:text-white hover:bg-slate-650 border rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer"
                                title="Desvincular Google"
                              >
                                Desvincular
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Deseja realmente excluir permanentemente o entregador ${d.name}?`)) {
                                  try {
                                    await removeDeliverer(d.id);
                                    await logAuditEvent("Exclusão de Entregador", `Entregador ${d.name} (${d.username}) excluído.`);
                                    loadDeliverers();
                                    alert("Entregador excluído com sucesso!");
                                  } catch (err) {
                                    alert("Erro ao excluir entregador.");
                                  }
                                }
                              }}
                              className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : operatorType === 'estoquista' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="estoquistas-panel">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-max">
                <h3 className="text-base font-bold font-display text-slate-900 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5 text-blue-600 font-bold" /> Novo Estoquista
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newEstoquistaName.trim() || !newEstoquistaUser.trim() || !newEstoquistaPass.trim()) return;
                    if (estoquistas.some(u => u.username.toLowerCase() === newEstoquistaUser.trim().toLowerCase())) {
                      alert("Este nome de usuário já está em uso por outro estoquista.");
                      return;
                    }
                    const newUser: Estoquista = {
                      id: `estoquista-${Date.now()}`,
                      name: newEstoquistaName.trim(),
                      username: newEstoquistaUser.trim(),
                      password: newEstoquistaPass.trim(),
                      googleEmail: newEstoquistaGmail.trim() || undefined,
                      active: true,
                      createdAt: new Date().toISOString()
                    };
                    try {
                      await saveEstoquista(newUser);
                      await logAuditEvent("Cadastro de Estoquista", `Estoquista ${newUser.name} (${newUser.username}) cadastrado.`);
                      setNewEstoquistaName(''); setNewEstoquistaUser(''); setNewEstoquistaPass(''); setNewEstoquistaGmail('');
                      loadEstoquistas();
                      alert("Estoquista cadastrado com sucesso!");
                    } catch (err) {
                      alert("Erro ao cadastrar estoquista.");
                    }
                  }}
                  className="space-y-4 text-left"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Completo <span className="text-rose-500">*</span></label>
                    <input type="text" placeholder="Ex: Maria Santos" value={newEstoquistaName} onChange={(e) => setNewEstoquistaName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-semibold" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome de Usuário <span className="text-rose-500">*</span></label>
                    <input type="text" placeholder="Ex: mariasantos" value={newEstoquistaUser} onChange={(e) => setNewEstoquistaUser(e.target.value.replace(/\s/g, ""))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Senha de Acesso <span className="text-rose-500">*</span></label>
                    <input type="password" placeholder="Ex: 123456" value={newEstoquistaPass} onChange={(e) => setNewEstoquistaPass(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail do Google (Gmail)</label>
                    <input type="email" placeholder="Ex: estoquistas@gmail.com" value={newEstoquistaGmail} onChange={(e) => setNewEstoquistaGmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer">Cadastrar Estoquista</button>
                </form>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900 mb-1 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600 shrink-0" /> Estoquistas Cadastrados
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal font-sans">Gerencie credenciais internas dos estoquistas.</p>
                </div>
                {loadingEstoquistas ? (
                  <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Carregando lista de estoquistas...</div>
                ) : estoquistas.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-455 border border-dashed rounded-xl">Nenhum estoquista cadastrado no momento.</div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {estoquistas.map((u) => (
                      <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors text-left">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border">Usuário: {u.username}</span>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${u.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{u.active ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEditingEstoquista(u); setEditEstoquistaName(u.name); setEditEstoquistaUser(u.username); setEditEstoquistaPass(u.password || ''); setEditEstoquistaGmail(u.googleEmail || ''); }} className="px-2.5 py-1 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer">Editar</button>
                          <button type="button" onClick={async () => { const updated = { ...u, active: !u.active }; await saveEstoquista(updated); await logAuditEvent("Alteração de Estoquista", `Status do estoquista ${u.name} alterado para ${updated.active ? 'Ativo' : 'Inativo'}.`); loadEstoquistas(); }} className={`px-2.5 py-1 ${u.active ? 'text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-200' : 'text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200'} rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer`}>{u.active ? 'Desativar' : 'Ativar'}</button>
                          <button type="button" onClick={async () => { if (confirm(`Deseja realmente excluir permanentemente o estoquista ${u.name}?`)) { try { await removeEstoquista(u.id); await logAuditEvent("Exclusão de Estoquista", `Estoquista ${u.name} (${u.username}) excluído.`); loadEstoquistas(); alert("Estoquista excluído com sucesso!"); } catch { alert("Erro ao excluir estoquista."); } } }} className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer">Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : operatorType === 'montador' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="montadores-panel">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-max">
                <h3 className="text-base font-bold font-display text-slate-900 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5 text-blue-600 font-bold" /> Novo Montador
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newMontadorName.trim() || !newMontadorUser.trim() || !newMontadorPass.trim()) return;
                    if (montadores.some(u => u.username.toLowerCase() === newMontadorUser.trim().toLowerCase())) {
                      alert("Este nome de usuário já está em uso por outro montador.");
                      return;
                    }
                    const newUser: Montador = {
                      id: `montador-${Date.now()}`,
                      name: newMontadorName.trim(),
                      username: newMontadorUser.trim(),
                      password: newMontadorPass.trim(),
                      googleEmail: newMontadorGmail.trim() || undefined,
                      active: true,
                      createdAt: new Date().toISOString(),
                      commissionPercent: newMontadorCommission ? parseFloat(newMontadorCommission) : undefined
                    };
                    try {
                      await saveMontador(newUser);
                      await logAuditEvent("Cadastro de Montador", `Montador ${newUser.name} (${newUser.username}) cadastrado.`);
                      setNewMontadorName(''); setNewMontadorUser(''); setNewMontadorPass(''); setNewMontadorCommission(''); setNewMontadorGmail('');
                      loadMontadores();
                      alert("Montador cadastrado com sucesso!");
                    } catch (err) {
                      alert("Erro ao cadastrar montador.");
                    }
                  }}
                  className="space-y-4 text-left"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Completo <span className="text-rose-500">*</span></label>
                    <input type="text" placeholder="Ex: João Pereira" value={newMontadorName} onChange={(e) => setNewMontadorName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-semibold" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome de Usuário <span className="text-rose-500">*</span></label>
                    <input type="text" placeholder="Ex: joaopereira" value={newMontadorUser} onChange={(e) => setNewMontadorUser(e.target.value.replace(/\s/g, ""))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Senha de Acesso <span className="text-rose-500">*</span></label>
                    <input type="password" placeholder="Ex: 123456" value={newMontadorPass} onChange={(e) => setNewMontadorPass(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Comissão (%)</label>
                    <input type="number" step="0.1" min="0" max="100" placeholder="Ex: 5" value={newMontadorCommission} onChange={(e) => setNewMontadorCommission(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail do Google (Gmail)</label>
                    <input type="email" placeholder="Ex: montadores@gmail.com" value={newMontadorGmail} onChange={(e) => setNewMontadorGmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer">Cadastrar Montador</button>
                </form>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900 mb-1 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-blue-600 shrink-0" /> Montadores Cadastrados
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal font-sans">Gerencie credenciais internas dos montadores.</p>
                </div>
                {loadingMontadores ? (
                  <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Carregando lista de montadores...</div>
                ) : montadores.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-455 border border-dashed rounded-xl">Nenhum montador cadastrado no momento.</div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {montadores.map((u) => (
                      <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors text-left">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border">Usuário: {u.username}</span>
                            {u.commissionPercent !== undefined && u.commissionPercent !== null && (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{u.commissionPercent}% comissão</span>
                            )}
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${u.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{u.active ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEditingMontador(u); setEditMontadorName(u.name); setEditMontadorUser(u.username); setEditMontadorPass(u.password || ''); setEditMontadorCommission(u.commissionPercent !== undefined ? String(u.commissionPercent) : ''); setEditMontadorGmail(u.googleEmail || ''); }} className="px-2.5 py-1 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer">Editar</button>
                          <button type="button" onClick={async () => { const updated = { ...u, active: !u.active }; await saveMontador(updated); await logAuditEvent("Alteração de Montador", `Status do montador ${u.name} alterado para ${updated.active ? 'Ativo' : 'Inativo'}.`); loadMontadores(); }} className={`px-2.5 py-1 ${u.active ? 'text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-200' : 'text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200'} rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer`}>{u.active ? 'Desativar' : 'Ativar'}</button>
                          <button type="button" onClick={async () => { if (confirm(`Deseja realmente excluir permanentemente o montador ${u.name}?`)) { try { await removeMontador(u.id); await logAuditEvent("Exclusão de Montador", `Montador ${u.name} (${u.username}) excluído.`); loadMontadores(); alert("Montador excluído com sucesso!"); } catch { alert("Erro ao excluir montador."); } } }} className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer">Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="caixas-panel">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-max">
                <h3 className="text-base font-bold font-display text-slate-900 mb-3 flex items-center gap-1.5">
                  <Plus className="w-4.5 h-4.5 text-blue-600 font-bold" /> Novo Caixa
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newCaixaName.trim() || !newCaixaUser.trim() || !newCaixaPass.trim()) return;
                    if (caixas.some(u => u.username.toLowerCase() === newCaixaUser.trim().toLowerCase())) {
                      alert("Este nome de usuário já está em uso por outro caixa.");
                      return;
                    }
                    const newUser: Caixa = {
                      id: `caixa-${Date.now()}`,
                      name: newCaixaName.trim(),
                      username: newCaixaUser.trim(),
                      password: newCaixaPass.trim(),
                      googleEmail: newCaixaGmail.trim() || undefined,
                      active: true,
                      createdAt: new Date().toISOString()
                    };
                    try {
                      await saveCaixa(newUser);
                      await logAuditEvent("Cadastro de Caixa", `Caixa ${newUser.name} (${newUser.username}) cadastrado.`);
                      setNewCaixaName(''); setNewCaixaUser(''); setNewCaixaPass(''); setNewCaixaGmail('');
                      loadCaixas();
                      alert("Caixa cadastrado com sucesso!");
                    } catch (err) {
                      alert("Erro ao cadastrar caixa.");
                    }
                  }}
                  className="space-y-4 text-left"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Completo <span className="text-rose-500">*</span></label>
                    <input type="text" placeholder="Ex: João Pereira" value={newCaixaName} onChange={(e) => setNewCaixaName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-semibold" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome de Usuário <span className="text-rose-500">*</span></label>
                    <input type="text" placeholder="Ex: joaopereira" value={newCaixaUser} onChange={(e) => setNewCaixaUser(e.target.value.replace(/\s/g, ""))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Senha de Acesso <span className="text-rose-500">*</span></label>
                    <input type="password" placeholder="Ex: 123456" value={newCaixaPass} onChange={(e) => setNewCaixaPass(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-mono" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail do Google (Gmail)</label>
                    <input type="email" placeholder="Ex: caixas@gmail.com" value={newCaixaGmail} onChange={(e) => setNewCaixaGmail(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800" />
                  </div>
                  <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer">Cadastrar Caixa</button>
                </form>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900 mb-1 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600 shrink-0" /> Caixas Cadastrados
                  </h3>
                  <p className="text-xs text-slate-500 leading-normal font-sans">Gerencie credenciais internas dos operadores de caixa.</p>
                </div>
                {loadingCaixas ? (
                  <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Carregando lista de caixas...</div>
                ) : caixas.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-455 border border-dashed rounded-xl">Nenhum caixa cadastrado no momento.</div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {caixas.map((u) => (
                      <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors text-left">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border">Usuário: {u.username}</span>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${u.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{u.active ? 'Ativo' : 'Inativo'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEditingCaixa(u); setEditCaixaName(u.name); setEditCaixaUser(u.username); setEditCaixaPass(u.password || ''); setEditCaixaGmail(u.googleEmail || ''); }} className="px-2.5 py-1 text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer">Editar</button>
                          <button type="button" onClick={async () => { const updated = { ...u, active: !u.active }; await saveCaixa(updated); await logAuditEvent("Alteração de Caixa", `Status do caixa ${u.name} alterado para ${updated.active ? 'Ativo' : 'Inativo'}.`); loadCaixas(); }} className={`px-2.5 py-1 ${u.active ? 'text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-200' : 'text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-200'} rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer`}>{u.active ? 'Desativar' : 'Ativar'}</button>
                          <button type="button" onClick={async () => { if (confirm(`Deseja realmente excluir permanentemente o caixa ${u.name}?`)) { try { await removeCaixa(u.id); await logAuditEvent("Exclusão de Caixa", `Caixa ${u.name} (${u.username}) excluído.`); loadCaixas(); alert("Caixa excluído com sucesso!"); } catch { alert("Erro ao excluir caixa."); } } }} className="px-2.5 py-1 text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer">Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seller Performance Dashboard Modal */}
      {viewingSellerDashboard && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="seller-performance-dialog">
          <div className="bg-slate-950 rounded-2xl shadow-2xl max-w-6xl w-full border border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="text-lg font-black font-display text-white">
                  Desempenho de Vendas: {viewingSellerDashboard.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Visualização de faturamento, comissões, vendas e histórico do vendedor em tempo real.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setViewingSellerDashboard(null)} 
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-1 bg-slate-950 rounded-xl">
              <SellerDashboardView 
                currentSeller={viewingSellerDashboard}
                sales={sales}
                products={products}
                onPrintSale={onPrintSale}
              />
            </div>
          </div>
        </div>
      )}

      {/* Deliverer Performance Dashboard Modal */}
      {viewingDelivererDashboard && (() => {
        const matchedDeliveries = deliveries.filter(
          (d) => d.delivererName.toLowerCase() === viewingDelivererDashboard.name.toLowerCase()
        );
        const totalDel = matchedDeliveries.length;
        const completedDel = matchedDeliveries.filter((d) => d.status === 'ENTREGUE').length;
        const pendingDel = matchedDeliveries.filter((d) => d.status === 'A_ENTREGAR').length;
        const successRate = totalDel > 0 ? Math.round((completedDel / totalDel) * 100) : 0;

        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="deliverer-performance-dialog">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-100 p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] text-slate-800">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3 shrink-0">
                <div>
                  <h3 className="text-lg font-black font-display text-slate-900">
                    Desempenho de Logística: {viewingDelivererDashboard.name}
                  </h3>
                  <p className="text-xs text-slate-505">
                    Métricas de entregas e histórico de despachos de logística atribuídos em tempo real.
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setViewingDelivererDashboard(null)} 
                  className="px-3 py-1.5 bg-slate-105 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  ✕ Fechar
                </button>
              </div>

              {/* Stats KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Entregas</span>
                  <span className="block text-2xl font-black text-slate-900 mt-1">{totalDel}</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                  <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Concluídas</span>
                  <span className="block text-2xl font-black text-emerald-800 mt-1">{completedDel}</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                  <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pendentes</span>
                  <span className="block text-2xl font-black text-amber-800 mt-1">{pendingDel}</span>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                  <span className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider">Taxa de Sucesso</span>
                  <span className="block text-2xl font-black text-blue-800 mt-1">{successRate}%</span>
                </div>
              </div>

              {/* History Table */}
              <div className="flex-1 overflow-y-auto min-h-0 border border-slate-100 rounded-xl">
                {matchedDeliveries.length > 0 ? (
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60 sticky top-0 z-10">
                        <th className="p-3">Data Agendada</th>
                        <th className="p-3">Cliente / Endereço</th>
                        <th className="p-3">Descrição dos Itens</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {matchedDeliveries.map((del) => {
                        return (
                          <tr key={del.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="p-3 font-mono text-slate-600">
                              <span className="font-semibold">{del.scheduledDate.split('-').reverse().join('/')}</span>
                              {del.deliveredAt && (
                                <span className="block text-[10px] text-emerald-600 mt-0.5">
                                  Entregue em: {new Date(del.deliveredAt).toLocaleDateString('pt-BR')} às {new Date(del.deliveredAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">{del.customerName}</div>
                              <div className="text-[10px] text-slate-400 max-w-[200px] truncate" title={del.address}>{del.address}</div>
                            </td>
                            <td className="p-3 text-slate-700 font-medium max-w-[250px] truncate" title={del.itemsDescription}>
                              {del.itemsDescription}
                            </td>
                            <td className="p-3 text-center">
                              {del.status === 'A_ENTREGAR' ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  A Entregar
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ✔ Entregue
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-505 italic max-w-[150px] truncate" title={del.notes || ''}>
                              {del.notes || 'Sem observações'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 h-full">
                    <Truck className="w-10 h-10 text-slate-300 stroke-1 mb-2" />
                    <p className="text-slate-800 font-medium text-sm">Nenhuma entrega atribuída</p>
                    <p className="text-xs text-slate-450 mt-0.5">Os despachos logísticos vinculados a este entregador aparecerão aqui.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Seller Dialog Modal */}
      {editingSeller && (
        <EditSellerModal
          name={editSellerName}
          username={editSellerUser}
          password={editSellerPass}
          googleEmail={editSellerGmail}
          onChangeName={setEditSellerName}
          onChangeUsername={setEditSellerUser}
          onChangePassword={setEditSellerPass}
          onChangeGoogleEmail={setEditSellerGmail}
          onCancel={() => setEditingSeller(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editSellerName.trim() || !editSellerUser.trim() || !editSellerPass.trim()) return;

            if (sellers.some(s => s.id !== editingSeller.id && s.username.toLowerCase() === editSellerUser.trim().toLowerCase())) {
              alert("Este nome de usuário já está em uso por outro vendedor.");
              return;
            }

            const updated: Seller = {
              ...editingSeller,
              name: editSellerName.trim(),
              username: editSellerUser.trim(),
              password: editSellerPass.trim(),
              pin: editSellerPin.trim() || undefined,
              googleEmail: editSellerGmail.trim() || undefined,
            };

            try {
              await saveSeller(updated);
              await logAuditEvent("Alteração de Vendedor", `Dados do vendedor ${updated.name} editados.`);
              setEditingSeller(null);
              loadSellers();
              alert("Cadastro atualizado com sucesso!");
            } catch (err) {
              alert("Erro ao salvar alterações.");
            }
          }}
        />
      )}

      {/* Edit Deliverer Dialog Modal */}
      {editingDeliverer && (
        <EditDelivererModal
          name={editDelivererName}
          username={editDelivererUser}
          password={editDelivererPass}
          googleEmail={editDelivererGmail}
          onChangeName={setEditDelivererName}
          onChangeUsername={setEditDelivererUser}
          onChangePassword={setEditDelivererPass}
          onChangeGoogleEmail={setEditDelivererGmail}
          onCancel={() => setEditingDeliverer(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editDelivererName.trim() || !editDelivererUser.trim() || !editDelivererPass.trim()) return;

            if (deliverers.some(d => d.id !== editingDeliverer.id && d.username.toLowerCase() === editDelivererUser.trim().toLowerCase())) {
              alert("Este nome de usuário já está em uso por outro entregador.");
              return;
            }

            const updated: Deliverer = {
              ...editingDeliverer,
              name: editDelivererName.trim(),
              username: editDelivererUser.trim(),
              password: editDelivererPass.trim(),
              googleEmail: editDelivererGmail.trim() || undefined,
            };

            try {
              await saveDeliverer(updated);
              await logAuditEvent("Alteração de Entregador", `Dados do entregador ${updated.name} editados.`);
              setEditingDeliverer(null);
              loadDeliverers();
              alert("Cadastro atualizado com sucesso!");
            } catch (err) {
              alert("Erro ao salvar alterações.");
            }
          }}
        />
      )}

      {/* Edit Estoquista Dialog Modal */}
      {editingEstoquista && (
        <EditEstoquistaModal
          name={editEstoquistaName}
          username={editEstoquistaUser}
          password={editEstoquistaPass}
          googleEmail={editEstoquistaGmail}
          onChangeName={setEditEstoquistaName}
          onChangeUsername={setEditEstoquistaUser}
          onChangePassword={setEditEstoquistaPass}
          onChangeGoogleEmail={setEditEstoquistaGmail}
          onCancel={() => setEditingEstoquista(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editEstoquistaName.trim() || !editEstoquistaUser.trim() || !editEstoquistaPass.trim()) return;
            if (estoquistas.some(s => s.id !== editingEstoquista.id && s.username.toLowerCase() === editEstoquistaUser.trim().toLowerCase())) {
              alert("Este nome de usuário já está em uso por outro estoquista.");
              return;
            }
            const updated: Estoquista = {
              ...editingEstoquista,
              name: editEstoquistaName.trim(),
              username: editEstoquistaUser.trim(),
              password: editEstoquistaPass.trim(),
              googleEmail: editEstoquistaGmail.trim() || undefined,
            };
            try {
              await saveEstoquista(updated);
              await logAuditEvent("Alteração de Estoquista", `Dados do estoquista ${updated.name} editados.`);
              setEditingEstoquista(null);
              loadEstoquistas();
              alert("Cadastro atualizado com sucesso!");
            } catch (err) {
              alert("Erro ao salvar alterações.");
            }
          }}
        />
      )}

      {/* Edit Caixa Dialog Modal */}
      {editingCaixa && (
        <EditCaixaModal
          name={editCaixaName}
          username={editCaixaUser}
          password={editCaixaPass}
          googleEmail={editCaixaGmail}
          onChangeName={setEditCaixaName}
          onChangeUsername={setEditCaixaUser}
          onChangePassword={setEditCaixaPass}
          onChangeGoogleEmail={setEditCaixaGmail}
          onCancel={() => setEditingCaixa(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editCaixaName.trim() || !editCaixaUser.trim() || !editCaixaPass.trim()) return;
            if (caixas.some(s => s.id !== editingCaixa.id && s.username.toLowerCase() === editCaixaUser.trim().toLowerCase())) {
              alert("Este nome de usuário já está em uso por outro caixa.");
              return;
            }
            const updated: Caixa = {
              ...editingCaixa,
              name: editCaixaName.trim(),
              username: editCaixaUser.trim(),
              password: editCaixaPass.trim(),
              googleEmail: editCaixaGmail.trim() || undefined,
            };
            try {
              await saveCaixa(updated);
              await logAuditEvent("Alteração de Caixa", `Dados do caixa ${updated.name} editados.`);
              setEditingCaixa(null);
              loadCaixas();
              alert("Cadastro atualizado com sucesso!");
            } catch (err) {
              alert("Erro ao salvar alterações.");
            }
          }}
        />
      )}

      {/* Edit Montador Dialog Modal */}
      {editingMontador && (
        <EditMontadorModal
          name={editMontadorName}
          username={editMontadorUser}
          password={editMontadorPass}
          commission={editMontadorCommission}
          googleEmail={editMontadorGmail}
          onChangeName={setEditMontadorName}
          onChangeUsername={setEditMontadorUser}
          onChangePassword={setEditMontadorPass}
          onChangeCommission={setEditMontadorCommission}
          onChangeGoogleEmail={setEditMontadorGmail}
          onCancel={() => setEditingMontador(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!editMontadorName.trim() || !editMontadorUser.trim() || !editMontadorPass.trim()) return;
            if (montadores.some(s => s.id !== editingMontador.id && s.username.toLowerCase() === editMontadorUser.trim().toLowerCase())) {
              alert("Este nome de usuário já está em uso por outro montador.");
              return;
            }
            const updated: Montador = {
              ...editingMontador,
              name: editMontadorName.trim(),
              username: editMontadorUser.trim(),
              password: editMontadorPass.trim(),
              googleEmail: editMontadorGmail.trim() || undefined,
              commissionPercent: editMontadorCommission ? parseFloat(editMontadorCommission) : undefined,
            };
            try {
              await saveMontador(updated);
              await logAuditEvent("Alteração de Montador", `Dados do montador ${updated.name} editados.`);
              setEditingMontador(null);
              loadMontadores();
              alert("Cadastro atualizado com sucesso!");
            } catch (err) {
              alert("Erro ao salvar alterações.");
            }
          }}
        />
      )}

      {/* 1. Email Revoke Custom Dialog */}
      {emailToRevoke && (
        <DeleteConfirmationDialog
          domId="revoke-email-dialog"
          icon={<Trash2 className="w-6 h-6 animate-pulse" />}
          title="Revogar Acesso"
          message={<>Tem certeza de que deseja revogar o acesso de <strong className="text-slate-800 font-semibold">{emailToRevoke}</strong>? Esse usuário perderá o acesso imediato ao sistema ERP.</>}
          confirmLabel="Sim, Revogar"
          onCancel={() => setEmailToRevoke(null)}
          onConfirm={() => {
            executeRemoveEmail(emailToRevoke);
            setEmailToRevoke(null);
          }}
        />
      )}

      {/* 2. Category Delete Custom Dialog */}
      {categoryToDelete && (
        <DeleteConfirmationDialog
          domId="delete-category-dialog"
          icon={<Trash2 className="w-6 h-6" />}
          title="Remover Categoria"
          message={<>Gostaria de deletar a categoria <strong className="text-slate-800 font-semibold">"{categoryToDelete.name}"</strong>? Isso não apagará os produtos associados, mas é recomendado alterá-los para outras categorias após este ato.</>}
          confirmLabel="Confirmar Exclusão"
          onCancel={() => setCategoryToDelete(null)}
          onConfirm={() => {
            onDeleteCategory(categoryToDelete.id);
            setCategoryToDelete(null);
          }}
        />
      )}

      {/* 3. Backup Import Custom Dialog */}
      {backupParsedToImport && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="import-backup-dialog">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 transform scale-100 transition-all duration-300">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">Importar Backup de Dados</h3>
              <p className="text-sm text-slate-500 mb-6 opacity-95">
                Atenção! Ao importar este arquivo de dados, você substituirá o estoque existente por esta versão e os lançamentos locais correspondentes. Gostaria de continuar?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setBackupParsedToImport(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    executeImportBackup(backupParsedToImport);
                    setBackupParsedToImport(null);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Importar e Sobrepor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Production Reset Custom Dialog */}
      {showProductionResetDialog && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="production-reset-dialog">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 transform scale-100 transition-all duration-300">
            <div className="p-5">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 font-display text-center">Limpeza Definitiva do Estoque</h3>
              <p className="text-xs text-rose-600 font-semibold mb-3 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                ATENÇÃO! Você apagará TODOS os dados, móveis, pagamentos, vendas e entregas. Esta ação é definitiva e irreversível!
              </p>
              <p className="text-sm text-slate-500 mb-4 text-center">
                Isso deixará o banco de dados completamente vazio, livre de dados modelos e pronto para as informações reais do negócio.
              </p>
              
              <div className="mb-5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 text-center">
                  Digite a palavra de segurança <strong className="text-slate-800">PRODUCAO</strong> para confirmar:
                </label>
                <input
                  type="text"
                  placeholder="DIGITE PRODUCAO AQUI"
                  value={productionResetKeyInput}
                  onChange={(e) => setProductionResetKeyInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold tracking-widest text-slate-800 uppercase focus:outline-none focus:border-rose-500 bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductionResetDialog(false);
                    setProductionResetKeyInput('');
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={executeProductionReset}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer font-bold"
                  disabled={productionResetKeyInput.trim() !== "PRODUCAO"}
                >
                  Zerar Tudo para Produção
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
