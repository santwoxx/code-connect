/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Edit, 
  MapPin, 
  AlertTriangle,
  AlertCircle,
  MoveUp,
  MoveDown,
  RefreshCw,
  X,
  PlusCircle,
  TrendingUp,
  Upload,
  FileText,
  Download,
  FileSpreadsheet,
  Package,
  Database,
  DollarSign,
  Calculator
} from 'lucide-react';
import { Product, Category, StockTransaction } from '../types';
import { uploadProductImage } from '../firebase';
import { BatchEditModal } from './products/BatchEditModal';
import { ImportTab, ParsedProductRow } from './products/ImportTab';
import { DeleteConfirmationDialog } from './shared/DeleteConfirmationDialog';
import { AdjustInventoryModal } from './products/AdjustInventoryModal';
import { ProductReportModal } from './products/ProductReportModal';
import { StockHistoryDrawer } from './products/StockHistoryDrawer';
import { BatchActionsBar } from './products/BatchActionsBar';
import { formatCurrency } from '../utils/format';
import { TaxCalculatorModal, TaxResultItem } from './shared/TaxCalculatorModal';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onRegisterTransaction: (transaction: Omit<StockTransaction, 'id' | 'date'>) => void;
  userRole?: string;
  transactions?: StockTransaction[];
  onAddCategory?: (category: Omit<Category, 'id'>) => Promise<void>;
}

interface ParsedInvoiceItem {
  sku: string;
  name: string;
  quantity: number;
  costPrice: number;
  unit: string;
  ipi?: number;
  frete?: number;
  desconto?: number;
  creditoIcms?: number;
}

interface ReviewInvoiceItem {
  sku: string;
  name: string;
  quantity: number;
  costPrice: number;
  price: number;
  category: string;
  unit: string;
  isExisting: boolean;
  existingProduct?: Product;
  ipi?: number;
  frete?: number;
  desconto?: number;
  creditoIcms?: number;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onRegisterTransaction,
  userRole = 'admin',
  transactions = [],
  onAddCategory
}) => {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW'>('ALL');

  // Import spreadsheet list states
  const [activeTab, setActiveTab] = useState<'catalog' | 'import' | 'invoice'>('catalog');
  const [importText, setImportText] = useState('');
  const [importProducts, setImportProducts] = useState<ParsedProductRow[]>([]);
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('update');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | undefined>(undefined);

  // Invoice import states
  const [invoiceText, setInvoiceText] = useState('');
  const [reviewInvoiceItems, setReviewInvoiceItems] = useState<ReviewInvoiceItem[]>([]);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);
  const [showInvoiceCalculator, setShowInvoiceCalculator] = useState(false);

  const guessCategory = (name: string): string => {
    const n = name.toLowerCase();
    let categoryName = 'Outros';
    
    if (n.includes('armário de aço') || n.includes('armario de aco') || n.includes('balcão de aço') || n.includes('balcao de aco')) {
      categoryName = 'Escritório';
    } else if (n.includes('tábua de passar') || n.includes('tabua de passar')) {
      categoryName = 'Lavanderia';
    } else if (n.includes('panela')) {
      categoryName = 'Utilidades Domésticas';
    } else if (n.includes('caixa amplificada')) {
      categoryName = 'Áudio';
    } else if (n.includes('air fryer') || n.includes('ferro') || n.includes('extrator') || n.includes('batedeira') || n.includes('liquidificador') || n.includes('ventilador')) {
      categoryName = 'Eletroportáteis';
    } else if (n.includes('fogão') || n.includes('fogao') || n.includes('cooktop') || n.includes('lavadora') || n.includes('centrífuga') || n.includes('centrifuga') || n.includes('purificador') || n.includes('bebedouro') || n.includes('depurador')) {
      categoryName = 'Eletrodomésticos';
    } else if (n.includes('kit mesa') || (n.includes('mesa') && n.includes('cadeira'))) {
      categoryName = 'Sala de Jantar';
    } else if (n.includes('cadeira')) {
      categoryName = 'Cadeira';
    } else if (n.includes('mesa') || n.includes('conjunto mesa')) {
      categoryName = 'Mesa de Jantar';
    } else if (n.includes('aparador')) {
      categoryName = 'Aparador';
    } else if (n.includes('buffet')) {
      categoryName = 'Buffet';
    } else if (n.includes('bancada tv') || n.includes('painel tv') || n.includes('rack') || n.includes('home suspenso')) {
      categoryName = 'Rack / Home';
    } else if (n.includes('bancada')) {
      categoryName = 'Bancada';
    } else if (n.includes('painel ripado') || n.includes('painel')) {
      categoryName = 'Painel para TV';
    } else if (n.includes('sofá') || n.includes('sofa') || n.includes('estofado') || n.includes('retrátil') || n.includes('retratil') || n.includes('canto')) {
      categoryName = 'Estofado';
    } else if (n.includes('kit cama')) {
      categoryName = 'Colchões e Camas';
    } else if (n.includes('base box') || n.includes('base baú') || n.includes('base bau')) {
      categoryName = 'Base Box';
    } else if (n.includes('colchão') || n.includes('colchao') || n.includes('ortopedic') || n.includes('ortogan') || n.includes('itapuã') || n.includes('itapua')) {
      categoryName = 'Colchão';
    } else if (n.includes('cabeceira') || n.includes('criado')) {
      categoryName = 'Cabeceira';
    } else if (n.includes('guarda-roupas infantil') || n.includes('guarda roupa infantil') || n.includes('cômoda infantil') || n.includes('comoda infantil')) {
      categoryName = 'Quarto Infantil';
    } else if (n.includes('berço') || n.includes('berco')) {
      categoryName = 'Berço';
    } else if (n.includes('multiuso')) {
      categoryName = 'Multiuso';
    } else if (n.includes('sapateira')) {
      categoryName = 'Sapateira';
    } else if (n.includes('cômoda') || n.includes('comoda')) {
      categoryName = 'Cômoda';
    } else if (n.includes('roupeiro') || n.includes('guarda-roupa') || n.includes('guarda roupa')) {
      categoryName = 'Guarda-Roupa';
    } else if (n.includes('armário aéreo') || n.includes('armario aereo') || n.includes('balcão') || n.includes('balcao') || n.includes('paneleiro') || n.includes('cristaleira') || n.includes('fruteira') || n.includes('kit cozinha') || n.includes('cozinha')) {
      categoryName = 'Cozinha';
    }
    
    const exists = categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    if (exists) {
      return categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase())?.name || categoryName;
    }
    return categories[0]?.name || 'Outros';
  };

  const handleAutoCategorizeAll = async () => {
    if (!window.confirm("Deseja aplicar a categorização inteligente a todos os produtos do estoque? Isso atualizará automaticamente a categoria de todos os itens cadastrados baseado em seus nomes comerciais.")) {
      return;
    }

    setIsImporting(true);
    let updatedCount = 0;
    try {
      for (const product of products) {
        const guessed = guessCategory(product.name);
        if (product.category !== guessed) {
          await onUpdateProduct({
            ...product,
            category: guessed
          });
          updatedCount++;
        }
      }
      alert(`Processo concluído com sucesso!\n- ${updatedCount} produtos foram recategorizados.`);
    } catch (err) {
      console.error("Erro na recategorização:", err);
      alert("Ocorreu um erro ao atualizar as categorias.");
    } finally {
      setIsImporting(false);
    }
  };

  function parseXmlInvoice(xmlText: string): ParsedInvoiceItem[] {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const parseError = xmlDoc.getElementsByTagName("parsererror");
    if (parseError.length > 0) {
      throw new Error("Erro ao ler o arquivo XML. Certifique-se de que é uma Nota Fiscal eletrônica válida.");
    }
    
    const detElements = xmlDoc.getElementsByTagName("det");
    const items: ParsedInvoiceItem[] = [];
    
    for (let i = 0; i < detElements.length; i++) {
      const det = detElements[i];
      const prod = det.getElementsByTagName("prod")[0];
      if (!prod) continue;
      
      const sku = prod.getElementsByTagName("cProd")[0]?.textContent || '';
      const name = prod.getElementsByTagName("xProd")[0]?.textContent || '';
      const qtyText = prod.getElementsByTagName("qCom")[0]?.textContent || '0';
      const costText = prod.getElementsByTagName("vUnCom")[0]?.textContent || '0';
      const unit = prod.getElementsByTagName("uCom")[0]?.textContent || 'UN';
      
      const quantity = Math.round(parseFloat(qtyText));
      const costPrice = parseFloat(costText);
      
      const imposto = det.getElementsByTagName("imposto")[0];
      let vICMS = 0;
      let vIPI = 0;
      if (imposto) {
        const icmsNode = imposto.getElementsByTagName("vICMS")[0];
        if (icmsNode) vICMS = parseFloat(icmsNode.textContent || '0');
        
        const ipiNode = imposto.getElementsByTagName("vIPI")[0];
        if (ipiNode) vIPI = parseFloat(ipiNode.textContent || '0');
      }
      
      const vFrete = parseFloat(prod.getElementsByTagName("vFrete")[0]?.textContent || '0');
      const vDesc = parseFloat(prod.getElementsByTagName("vDesc")[0]?.textContent || '0');
      
      items.push({
        sku: sku.trim(),
        name: name.trim().toUpperCase(),
        quantity,
        costPrice,
        unit: unit.trim().toUpperCase(),
        ipi: vIPI,
        frete: vFrete,
        desconto: vDesc,
        creditoIcms: vICMS
      });
    }
    
    return items;
  }

  function parseTextInvoice(text: string): ParsedInvoiceItem[] {
    // If it looks like a DANFE copy-paste
    if (text.includes('DADOS DOS PRODUTOS') && text.includes('CÓDIGO') && text.includes('NCM')) {
      // Find where the table header ends, usually at "ALÍQ. IPI" or "ALIQ. IPI"
      const headerEndIndex = text.indexOf('IPI');
      if (headerEndIndex !== -1) {
        // We look for the last 'IPI' in the header area, or just split the whole text into a single line
        const singleLineText = text.replace(/\n/g, ' ');
        // Regex matches standard DANFE columns
        const regex = /(\S+)\s+([\s\S]+?)\s+(\d{8})\s+([^\s]+)\s+(\d{4})\s+([A-Za-z]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/g;
        
        const items: ParsedInvoiceItem[] = [];
        let match;
        while ((match = regex.exec(singleLineText)) !== null) {
          // Check if SKU is reasonable (not words like "DADOS", "VALOR")
          const sku = match[1];
          if (sku.toUpperCase() === 'DADOS' || sku.toUpperCase() === 'CÓDIGO' || sku.toUpperCase() === 'VALOR') {
            continue; // Skip false positive from header
          }

          // Clean up the description just in case it swallowed header words
          let name = match[2].trim();
          const lastHeaderIndex = name.lastIndexOf('IPI');
          if (lastHeaderIndex !== -1) {
            // Usually if it matched header, it means it started matching too early
            name = name.substring(lastHeaderIndex + 3).trim();
          }

          const quantity = parseFloat(match[7].replace(/\./g, '').replace(',', '.')) || 1;
          const vUnit = parseFloat(match[8].replace(/\./g, '').replace(',', '.')) || 0;
          const vIpi = parseFloat(match[13].replace(/\./g, '').replace(',', '.')) || 0;
          const vDesc = parseFloat(match[10].replace(/\./g, '').replace(',', '.')) || 0;
          const vIcms = parseFloat(match[12].replace(/\./g, '').replace(',', '.')) || 0;
          
          items.push({
            sku,
            name,
            quantity: Math.max(1, quantity),
            costPrice: vUnit,
            unit: match[6],
            ipi: vIpi,
            desconto: vDesc,
            creditoIcms: vIcms
          });
        }
        
        if (items.length > 0) return items;
      }
    }

    const parsed = parseImportText(text);
    return parsed.map(p => ({
      sku: p.sku,
      name: p.name,
      quantity: Math.max(1, p.currentStock),
      costPrice: p.costPrice,
      unit: p.unit
    }));
  }

  function handleLoadInvoiceText() {
    if (!invoiceText.trim()) {
      alert("Por favor, cole o texto da nota ou selecione um arquivo XML.");
      return;
    }
    
    try {
      let items: ParsedInvoiceItem[] = [];
      if (invoiceText.trim().startsWith("<?xml") || invoiceText.trim().includes("<det") || invoiceText.trim().includes("<nfeProc")) {
        items = parseXmlInvoice(invoiceText);
      } else {
        items = parseTextInvoice(invoiceText);
      }
      
      if (items.length === 0) {
        alert("Nenhum item de nota fiscal pôde ser extraído. Verifique o formato do texto ou do arquivo XML.");
        return;
      }
      
      prepareReviewItems(items);
    } catch (err: any) {
      alert("Erro ao ler dados da nota: " + err.message);
    }
  }

  function handleXmlFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInvoiceText(text);
      try {
        const items = parseXmlInvoice(text);
        if (items.length === 0) {
          alert("Nenhum item encontrado no arquivo XML da NF-e.");
          return;
        }
        prepareReviewItems(items);
      } catch (err: any) {
        alert("Erro ao ler XML da nota: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  function prepareReviewItems(items: ParsedInvoiceItem[]) {
    const reviewList: ReviewInvoiceItem[] = items.map(item => {
      const existingProduct = products.find(p => p.sku.toLowerCase() === item.sku.toLowerCase() || p.name.toLowerCase() === item.name.toLowerCase());
      
      const isExisting = !!existingProduct;
      const category = isExisting 
        ? (existingProduct.category || categories[0]?.name || 'Outros')
        : guessCategory(item.name);
        
      const price = isExisting ? existingProduct.price : Math.round(item.costPrice * 1.5);
      
      return {
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        costPrice: item.costPrice,
        price,
        category,
        unit: item.unit || 'UN',
        isExisting,
        existingProduct,
        ipi: item.ipi,
        frete: item.frete,
        desconto: item.desconto,
        creditoIcms: item.creditoIcms
      };
    });
    
    setReviewInvoiceItems(reviewList);
  }

  const handleConfirmInvoiceImport = async () => {
    if (reviewInvoiceItems.length === 0) return;
    if (!window.confirm(`Confirma a entrada de nota fiscal com ${reviewInvoiceItems.length} itens no estoque?`)) {
      return;
    }
    
    setIsProcessingInvoice(true);
    let newCount = 0;
    let existingCount = 0;
    
    try {
      for (const item of reviewInvoiceItems) {
        if (item.isExisting && item.existingProduct) {
          const updatedProduct: Product = {
            ...item.existingProduct,
            costPrice: item.costPrice,
            price: item.price,
            category: item.category,
            unit: item.unit
          };
          
          await onUpdateProduct(updatedProduct);
          
          await onRegisterTransaction({
            productId: item.existingProduct.id,
            productName: item.existingProduct.name,
            type: 'IN',
            quantity: item.quantity,
            reason: 'AJUSTE',
            description: `Entrada via Importação de Nota (SKU: ${item.sku})`,
            value: item.costPrice * item.quantity
          });
          
          existingCount++;
        } else {
          await onAddProduct({
            sku: item.sku,
            name: item.name,
            costPrice: item.costPrice,
            price: item.price,
            currentStock: item.quantity,
            minStock: 5,
            category: item.category,
            unit: item.unit,
            active: true
          });
          
          newCount++;
        }
      }
      
      alert(`Entrada de Nota Fiscal finalizada!\n- ${newCount} novos produtos cadastrados.\n- ${existingCount} produtos existentes tiveram estoque adicionado e preços de custo atualizados.`);
      setReviewInvoiceItems([]);
      setInvoiceText('');
      setActiveTab('catalog');
    } catch (err: any) {
      console.error(err);
      alert("Erro ao processar entrada de nota: " + err.message);
    } finally {
      setIsProcessingInvoice(false);
    }
  };

  function parseImportText(text: string): ParsedProductRow[] {
    let cleanedText = text;
    
    // Check for Alterdata Multiline Format
    if (text.match(/^\d{8}\s+\d{1,3}\/\d{2,3}\s+\d{4}\s+/m)) {
      const lines = text.split('\n');
      const items: ParsedProductRow[] = [];
      let currentItem: Partial<ParsedProductRow> | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Matches the NCM line: NCM (8 digits) | CST (0/00) | CFOP (4 digits) | Unit | Quantity | Cost
        const valuesMatch = line.match(/^(\d{8})\s+\d{1,3}\/\d{2,3}\s+\d{4}\s+([A-Z]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/);
        if (valuesMatch) {
          if (currentItem && currentItem.sku && currentItem.name) {
            currentItem.ncm = valuesMatch[1];
            currentItem.unit = valuesMatch[2];
            currentItem.currentStock = parseFloat(valuesMatch[3].replace(/\./g, '').replace(',', '.')) || 0;
            currentItem.costPrice = parseFloat(valuesMatch[4].replace(/\./g, '').replace(',', '.')) || 0;
            currentItem.price = currentItem.costPrice * 1.5;
            currentItem.minPrice = currentItem.costPrice;
            currentItem.category = guessCategory(currentItem.name);
            currentItem.selected = true;
            
            items.push(currentItem as ParsedProductRow);
            currentItem = null;
          }
        } else {
          if (!currentItem) {
            const codeMatch = line.match(/^([\d.]+)\s+(.*)/);
            if (codeMatch) {
              currentItem = {
                sku: codeMatch[1],
                name: codeMatch[2]
              };
            } else {
               currentItem = { sku: 'UNKNOWN', name: line };
            }
          } else {
            currentItem.name += ' ' + line;
          }
        }
      }
      if (items.length > 0) return items;
    }

    // Pre-process: if the text is single-line (or very few lines) but contains multiple SKUs, split them by inserting newlines!
    if (!text.includes('\n') || text.split('\n').length < 3) {
      cleanedText = text.replace(/\s+(\d{6})\b/g, '\n$1');
    }

    const lines = cleanedText.split('\n');
    const items: ParsedProductRow[] = [];
    
    if (lines.length === 0) return items;

    // Detect column indices based on header
    let headerLine = lines[0].toLowerCase();
    let hasHeader = headerLine.includes('código') || headerLine.includes('produto') || headerLine.includes('ncm') || headerLine.includes('custo');
    
    // Default indices if no header
    let colSku = 0;
    let colName = 1;
    let colCost = 2;
    let colPrice = 3;
    let colMin = 4;
    let colStock = 5;
    let colUnit = 6;
    let colNcm = -1;
    let colBarcode = -1;

    let startRow = 0;

    if (hasHeader) {
      const headers = headerLine.split('\t').length > 2 ? headerLine.split('\t') : headerLine.split(/\s{2,}/);
      headers.forEach((h, idx) => {
        if (h.includes('código') || h.includes('sku')) colSku = idx;
        else if (h.includes('produto') || h.includes('descrição') || h.includes('nome')) colName = idx;
        else if (h.includes('custo') || h.includes('repos')) colCost = idx;
        else if (h.includes('venda')) colPrice = idx;
        else if (h.includes('min') || h.includes('mín')) colMin = idx;
        else if (h.includes('estoque') || h.includes('qtd')) colStock = idx;
        else if (h.includes('unid')) colUnit = idx;
        else if (h.includes('ncm')) colNcm = idx;
        else if (h.includes('barras') || h.includes('ean')) colBarcode = idx;
      });
      startRow = 1;
    }
    
    for (let i = startRow; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      let parts = line.split('\t');
      if (parts.length < 2) {
        parts = line.split(/\s{2,}/);
      }
      
      // If still fewer than 5 columns, try splitting by single space and analyzing backward!
      if (parts.length < 5) {
        const spaceParts = line.split(/\s+/).filter(Boolean);
        if (spaceParts.length >= 7) {
          // Verify if the last few columns look like numbers
          const unit = spaceParts[spaceParts.length - 1]; // UN / PC / CJ
          const stock = spaceParts[spaceParts.length - 2]; // Qtd (e.g. 3,00)
          const minPrice = spaceParts[spaceParts.length - 3]; // Min Price (e.g. 949,00)
          const price = spaceParts[spaceParts.length - 4]; // Price (e.g. 949,00)
          const cost = spaceParts[spaceParts.length - 5]; // Cost (e.g. 434,02)
          const sku = spaceParts[0];
          
          // Join the name parts
          const nameParts = spaceParts.slice(1, spaceParts.length - 5);
          const name = nameParts.join(' ');
          
          parts = [];
          parts[colSku] = sku;
          parts[colName] = name;
          parts[colCost] = cost;
          parts[colPrice] = price;
          parts[colMin] = minPrice;
          parts[colStock] = stock;
          parts[colUnit] = unit;
        }
      }
      
      if (parts.length >= 2) {
        const sku = parts[colSku]?.trim() || '';
        const name = parts[colName]?.trim() || '';
        
        if (!sku || !name) continue;
        
        const rawCost = parts[colCost] || '0';
        const costPrice = parseFloat(rawCost.replace(/\./g, '').replace(',', '.')) || 0;
        
        const rawPrice = parts[colPrice] || '0';
        const price = parseFloat(rawPrice.replace(/\./g, '').replace(',', '.')) || 0;

        const rawMin = parts[colMin] || '0';
        const minPrice = parseFloat(rawMin.replace(/\./g, '').replace(',', '.')) || 0;
        
        const rawStock = parts[colStock] || '0';
        const currentStock = parseFloat(rawStock.replace(/\./g, '').replace(',', '.')) || 0;
        
        const unit = parts[colUnit]?.trim() || 'UN';
        
        let ncm = colNcm !== -1 ? parts[colNcm]?.trim() : undefined;
        let barcode = colBarcode !== -1 ? parts[colBarcode]?.trim() : undefined;

        if (!ncm) {
          const ncmMatch = line.match(/\b(\d{8})\b/);
          if (ncmMatch) ncm = ncmMatch[1];
        }

        if (!barcode) {
          const barcodeMatch = line.match(/\b(\d{13,14})\b/);
          if (barcodeMatch) barcode = barcodeMatch[1];
        }

        const category = guessCategory(name);
        
        items.push({
          sku,
          name,
          costPrice,
          price,
          minPrice,
          currentStock,
          unit,
          category,
          ncm,
          barcode,
          selected: true
        });
      }
    }
    return items;
  }

  const handleConfirmImport = async () => {
    const selectedItems = importProducts.filter(item => item.selected);
    if (selectedItems.length === 0) {
      alert("Nenhum item selecionado para importação.");
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedItems.length });
    
    let createdCount = 0;
    let updatedCount = 0;

    try {
      // Process in chunks of 50
      const chunkSize = 50;
      for (let i = 0; i < selectedItems.length; i += chunkSize) {
        const chunk = selectedItems.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (item) => {
          const existing = products.find(p => p.sku === item.sku);
          if (existing) {
            const hasChanges = 
              existing.currentStock !== item.currentStock ||
              existing.costPrice !== item.costPrice ||
              existing.price !== item.price ||
              (existing.name && item.name && existing.name.toUpperCase() !== item.name.toUpperCase()) ||
              (item.barcode && existing.barcode !== item.barcode) ||
              (item.ncm && existing.ncm !== item.ncm) ||
              (existing.unit || 'UN') !== (item.unit || 'UN');

            if (hasChanges) {
              await onUpdateProduct({
                ...existing,
                currentStock: item.currentStock,
                costPrice: item.costPrice,
                price: item.price,
                name: item.name || existing.name,
                unit: item.unit || existing.unit,
                barcode: item.barcode || existing.barcode,
                ncm: item.ncm || existing.ncm,
                lastSyncDate: new Date().toISOString(),
                syncStatus: 'synced'
              });
              
              // Register transaction if stock changed
              if (item.currentStock > existing.currentStock) {
                 const diff = item.currentStock - existing.currentStock;
                 await onRegisterTransaction({
                  productId: existing.id,
                  productName: existing.name,
                  type: 'IN',
                  quantity: diff,
                  reason: 'AJUSTE',
                  description: `Sincronização: Entrada de saldo (+${diff})`,
                  value: item.costPrice * diff
                });
              } else if (item.currentStock < existing.currentStock) {
                 const diff = existing.currentStock - item.currentStock;
                 await onRegisterTransaction({
                  productId: existing.id,
                  productName: existing.name,
                  type: 'OUT',
                  quantity: diff,
                  reason: 'AJUSTE',
                  description: `Sincronização: Ajuste de quebra/perda (-${diff})`,
                  value: item.costPrice * diff
                });
              }
              updatedCount++;
            } else {
              // Just update the sync timestamp
              await onUpdateProduct({
                ...existing,
                lastSyncDate: new Date().toISOString(),
                syncStatus: 'synced'
              });
            }
          } else {
            await onAddProduct({
              sku: item.sku,
              name: item.name,
              category: item.category || categories[0]?.name || 'Outros',
              price: item.price,
              costPrice: item.costPrice,
              currentStock: item.currentStock,
              minStock: 5,
              unit: item.unit || 'UN',
              barcode: item.barcode,
              ncm: item.ncm,
              active: true,
              lastSyncDate: new Date().toISOString(),
              syncStatus: 'synced'
            });
            createdCount++;
          }
        }));
        
        setImportProgress({ current: Math.min(i + chunkSize, selectedItems.length), total: selectedItems.length });
        
        // Small delay to allow UI to breathe
        await new Promise(r => setTimeout(r, 100));
      }
      
      // Step 2: Mark products not found in the import
      const importedSkus = new Set(selectedItems.map(i => i.sku));
      const notFoundProducts = products.filter(p => !importedSkus.has(p.sku) && p.syncStatus !== 'not_found');
      
      for (let i = 0; i < notFoundProducts.length; i += chunkSize) {
        const chunk = notFoundProducts.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (p) => {
          await onUpdateProduct({
            ...p,
            syncStatus: 'not_found'
          });
        }));
        await new Promise(r => setTimeout(r, 50));
      }

      alert(`Sincronização concluída com sucesso!\n- Novos: ${createdCount}\n- Atualizados: ${updatedCount}\n- Não Encontrados: ${notFoundProducts.length}`);
      setActiveTab('catalog');
      setImportProducts([]);
    } catch (err) {
      console.error("Erro na sincronização:", err);
      alert("Ocorreu um erro durante a sincronização dos itens. Verifique o console.");
    } finally {
      setIsImporting(false);
      setImportProgress(undefined);
    }
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isBatchEditModalOpen, setIsBatchEditModalOpen] = useState(false);

  // Batch selection state
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [batchEditState, setBatchEditState] = useState<{ category: string, taxPercent: string, markupPercent: string, freightPercent: string }>({ category: '', taxPercent: '', markupPercent: '', freightPercent: '' });
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [showBatchCalculator, setShowBatchCalculator] = useState(false);

  // Focus item state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Uploading states
  const [uploadingMainNew, setUploadingMainNew] = useState(false);
  const [uploadingGalleryNew, setUploadingGalleryNew] = useState(false);
  const [uploadingMainEdit, setUploadingMainEdit] = useState(false);
  const [uploadingGalleryEdit, setUploadingGalleryEdit] = useState(false);

  // New Product Form state
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    category: '',
    price: '',
    costPrice: '',
    currentStock: '0',
    minStock: '5',
    description: '',
    location: '',
    colors: '',
    material: '',
    dimensions: '',
    imageUrl: '',
    unit: 'UN',
    active: true,
    imagesText: '',
    needsAssembly: false,
    assemblyPercent: '0',
    taxPercent: '0',
    markupPercent: '0',
    freightPercent: '0'
  });

  // Edit Product Form state
  const [editProductState, setEditProductState] = useState<Product | null>(null);

  const [showProductCalculator, setShowProductCalculator] = useState<'NEW' | 'EDIT' | null>(null);

  const updateNewProductPricing = (cost: string, freight: string, tax: string, markup: string, price?: string) => {
    const c = parseFloat(cost) || 0;
    const f = parseFloat(freight) || 0;
    const t = parseFloat(tax) || 0;
    const m = parseFloat(markup) || 0;
    
    if (price !== undefined) {
      const p = parseFloat(price) || 0;
      let calculatedMarkup = 0;
      if (c > 0) {
        calculatedMarkup = ((p / c) - 1 - (f / 100) - (t / 100)) * 100;
      }
      setNewProduct(prev => ({
        ...prev,
        costPrice: cost,
        freightPercent: freight,
        taxPercent: tax,
        markupPercent: calculatedMarkup.toFixed(1),
        price: price
      }));
    } else {
      const calculatedPrice = c * (1 + f / 100 + t / 100 + m / 100);
      setNewProduct(prev => ({
        ...prev,
        costPrice: cost,
        freightPercent: freight,
        taxPercent: tax,
        markupPercent: markup,
        price: calculatedPrice.toFixed(2)
      }));
    }
  };

  const updateEditProductPricing = (cost: number, freight: number, tax: number, markup: number, price?: number) => {
    if (!editProductState) return;
    
    if (price !== undefined) {
      let calculatedMarkup = 0;
      if (cost > 0) {
        calculatedMarkup = ((price / cost) - 1 - (freight / 100) - (tax / 100)) * 100;
      }
      setEditProductState(prev => prev ? ({
        ...prev,
        costPrice: cost,
        freightPercent: freight,
        taxPercent: tax,
        markupPercent: parseFloat(calculatedMarkup.toFixed(1)),
        price: price
      }) : null);
    } else {
      const calculatedPrice = cost * (1 + freight / 100 + tax / 100 + markup / 100);
      setEditProductState(prev => prev ? ({
        ...prev,
        costPrice: cost,
        freightPercent: freight,
        taxPercent: tax,
        markupPercent: markup,
        price: parseFloat(calculatedPrice.toFixed(2))
      }) : null);
    }
  };

  // Delete product confirmation state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Adjust Stock Form state
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustReason, setAdjustReason] = useState<any>('AJUSTE');
  const [adjustDesc, setAdjustDesc] = useState('');

  // History Drawer state
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // Product Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const reportProducts = useMemo(() => products.filter(p => p.currentStock > 0), [products]);

  // Filtered transactions for drawer
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.productName.toLowerCase().includes(historySearchQuery.toLowerCase()) || 
                            (tx.description && tx.description.toLowerCase().includes(historySearchQuery.toLowerCase())) ||
                            tx.productId.toLowerCase().includes(historySearchQuery.toLowerCase());
      const matchesType = historyTypeFilter === 'ALL' || tx.type === historyTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, historySearchQuery, historyTypeFilter]);

  // 1. Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      
      const matchesStock = stockFilter === 'ALL' || p.currentStock <= p.minStock;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  // Helper: auto-generate sequential SKU if left empty
  const handleAutoGenerateSku = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const catShort = (newProduct.category || 'PROD').substring(0, 3).toUpperCase();
    setNewProduct(prev => ({
      ...prev,
      sku: `${catShort}-${randomSuffix}`
    }));
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.category || !newProduct.price || !newProduct.costPrice) {
      alert('Por favor, preencha todos os campos obrigatórios (Nome, Categoria, Preço de venda e Preço de custo)');
      return;
    }

    const priceNum = parseFloat(newProduct.price);
    const costPriceNum = parseFloat(newProduct.costPrice);
    const stockNum = parseInt(newProduct.currentStock, 10);
    const minStockNum = parseInt(newProduct.minStock, 10);

    if (isNaN(priceNum) || isNaN(costPriceNum)) {
      alert('Os preços informados devem ser numéricos.');
      return;
    }

    const skuFinal = newProduct.sku.trim() || `SKU-${Date.now().toString().slice(-6)}`;

    // Parse color list
    const colorsList = newProduct.colors 
      ? newProduct.colors.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    // Parse secondary images
    const secondaryImagesList = newProduct.imagesText 
      ? newProduct.imagesText.split(',').map(img => img.trim()).filter(Boolean)
      : [];

    // Trigger API propagation
    onAddProduct({
      sku: skuFinal,
      name: newProduct.name.trim(),
      category: newProduct.category,
      price: priceNum,
      costPrice: costPriceNum,
      currentStock: isNaN(stockNum) ? 0 : stockNum,
      minStock: isNaN(minStockNum) ? 5 : minStockNum,
      description: newProduct.description.trim() || undefined,
      location: newProduct.location.trim() || undefined,
      colors: colorsList.length > 0 ? colorsList : undefined,
      material: newProduct.material.trim() || undefined,
      dimensions: newProduct.dimensions.trim() || undefined,
      imageUrl: newProduct.imageUrl.trim() || undefined,
      unit: newProduct.unit,
      active: newProduct.active,
      images: secondaryImagesList.length > 0 ? secondaryImagesList : undefined,
      needsAssembly: newProduct.needsAssembly,
      assemblyPercent: parseFloat(newProduct.assemblyPercent) || 0,
      taxPercent: parseFloat(newProduct.taxPercent) || 0,
      markupPercent: parseFloat(newProduct.markupPercent) || 0
    });

    // Reset Form
    setNewProduct({
      sku: '',
      name: '',
      category: categories[0]?.name || '',
      price: '',
      costPrice: '',
      currentStock: '0',
      minStock: '5',
      description: '',
      location: '',
      colors: '',
      material: '',
      dimensions: '',
      imageUrl: '',
      unit: 'UN',
      active: true,
      imagesText: '',
      needsAssembly: false,
      assemblyPercent: '0',
      taxPercent: '0',
      markupPercent: '0',
      freightPercent: '0'
    });
    setIsAddModalOpen(false);
  };

  const handleUpdateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProductState || !editProductState.name || !editProductState.category) {
      alert('Nome e Categoria são de preenchimento obrigatório');
      return;
    }

    onUpdateProduct(editProductState);
    setIsEditModalOpen(false);
    setEditProductState(null);
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllProductsSelection = () => {
    if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBatchEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductIds.size === 0) return;
    setIsProcessingBatch(true);
    
    try {
      const updates = [];
      const hasCategory = batchEditState.category.trim() !== '';
      const hasTax = batchEditState.taxPercent.trim() !== '';
      const hasMarkup = batchEditState.markupPercent.trim() !== '';
      const hasFreight = batchEditState.freightPercent.trim() !== '';
      
      const taxVal = hasTax ? parseFloat(batchEditState.taxPercent) : undefined;
      const markupVal = hasMarkup ? parseFloat(batchEditState.markupPercent) : undefined;
      const freightVal = hasFreight ? parseFloat(batchEditState.freightPercent) : undefined;

      for (const id of Array.from(selectedProductIds)) {
        const product = products.find(p => p.id === id);
        if (product) {
          const updated = { ...product };
          if (hasCategory) updated.category = batchEditState.category;
          if (hasTax && !isNaN(taxVal as number)) updated.taxPercent = taxVal;
          if (hasMarkup && !isNaN(markupVal as number)) updated.markupPercent = markupVal;
          if (hasFreight && !isNaN(freightVal as number)) updated.freightPercent = freightVal;
          
          const c = updated.costPrice || 0;
          const f = updated.freightPercent || 0;
          const t = updated.taxPercent || 0;
          const m = updated.markupPercent || 0;
          updated.price = parseFloat((c * (1 + f / 100 + t / 100 + m / 100)).toFixed(2));
          
          updates.push(onUpdateProduct(updated));
        }
      }
      
      await Promise.all(updates);
      alert(`${updates.length} produtos atualizados com sucesso!`);
      setSelectedProductIds(new Set());
      setIsBatchEditModalOpen(false);
      setBatchEditState({ category: '', taxPercent: '', markupPercent: '', freightPercent: '' });
    } catch (err) {
      console.error(err);
      alert('Erro ao processar edição em lote.');
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!onAddCategory) {
      alert("Operação não disponível.");
      return;
    }
    const catName = prompt("Digite o nome da nova categoria:");
    if (!catName || !catName.trim()) return;
    try {
      await onAddCategory({ name: catName.trim() });
      setBatchEditState(prev => ({ ...prev, category: catName.trim() }));
      alert("Categoria criada com sucesso!");
    } catch (err) {
      console.error(err);
      alert('Erro ao criar categoria.');
    }
  };

  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const qtyNum = parseInt(adjustQty, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert('Insira uma quantidade válida de unidades maior que zero');
      return;
    }

    // Trigger transaction registration (parent will adjust current level of product automatically)
    onRegisterTransaction({
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      type: adjustType,
      quantity: qtyNum,
      reason: adjustReason,
      description: adjustDesc.trim() || undefined,
      value: adjustType === 'IN' 
        ? selectedProduct.costPrice * qtyNum 
        : selectedProduct.price * qtyNum
    });

    // Reset fields
    setAdjustQty('1');
    setAdjustDesc('');
    setAdjustReason('AJUSTE');
    setIsAdjustModalOpen(false);
    setSelectedProduct(null);
  };

  const openAdjustModal = (product: Product, type: 'IN' | 'OUT') => {
    setSelectedProduct(product);
    setAdjustType(type);
    setAdjustReason(type === 'IN' ? 'COMPRA' : 'VENDA');
    setIsAdjustModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditProductState({ ...product });
    setIsEditModalOpen(true);
  };


  const handleExportProductsCsv = () => {
    const headers = ['ID', 'SKU', 'Nome', 'Categoria', 'Preço Venda (R$)', 'Preço Custo (R$)', 'Estoque Atual', 'Estoque Mínimo', 'Localização', 'Unidade', 'Cor/Material/Medidas', 'Descrição', 'Status'];
    const rows = filteredProducts.map(p => [
      p.id,
      p.sku,
      p.name,
      p.category,
      p.price.toFixed(2),
      p.costPrice.toFixed(2),
      p.currentStock.toString(),
      p.minStock.toString(),
      p.location || '',
      p.unit || 'UN',
      `${p.colors || ''} / ${p.material || ''} / ${p.dimensions || ''}`,
      p.description || '',
      p.active !== false ? 'Ativo' : 'Inativo'
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `estoque_centralsync_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">Catálogo & Controle de Estoque</h1>
          <p className="text-sm text-slate-500">
            {(userRole === 'estoquista' || userRole === 'entregador')
              ? 'Visualize a disponibilidade física do catálogo de móveis e a localização de prateleira de cada item.'
              : 'Cadastre novos produtos, gerencie níveis mínimos de segurança física e registre fluxos de movimentação.'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={() => setIsHistoryDrawerOpen(true)}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg border border-slate-300 shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0] cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Histórico de Movimentações</span>
            </button>
          )}
          {userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={handleExportProductsCsv}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0] cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar CSV</span>
            </button>
          )}
          {userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={() => setIsReportModalOpen(true)}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg border border-emerald-300 shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0] cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>Relatório de Produtos</span>
            </button>
          )}
          {userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={handleAutoCategorizeAll}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-sm font-semibold rounded-lg border border-amber-300 shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0] cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-500" />
              <span>Recategorizar Estoque</span>
            </button>
          )}
          {userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
            <button
              onClick={() => {
                // Pre-select first category if available
                setNewProduct(prev => ({ ...prev, category: categories[0]?.name || '' }));
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all hover:translate-y-[-1px] active:translate-y-[0]"
              id="btn-add-product"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Cadastrar Produto</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 mb-6 bg-slate-100 p-1 rounded-xl gap-1 w-fit">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/55'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catálogo de Itens</span>
        </button>
        {userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
          <button
            onClick={() => {
              setImportText('');
              setImportProducts([]);
              setActiveTab('import');
            }}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/55'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar / Colar Estoque</span>
          </button>
        )}
        {userRole !== 'entregador' && userRole !== 'montador' && userRole !== 'vendedor' && userRole !== 'caixa' && (
          <button
            onClick={() => {
              setInvoiceText('');
              setReviewInvoiceItems([]);
              setActiveTab('invoice');
            }}
            className={`px-5 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'invoice'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/55'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Importar Nota (Entrada de Saldo)</span>
          </button>
        )}
      </div>

      {activeTab === 'catalog' && (
        <>
          {/* 1.5. SUMMARY METRICS CARD GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="products-metric-grid">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 text-left">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider font-sans">Total de Itens</span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5 font-display">{products.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 text-left">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider font-sans">Estoque Físico Total</span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5 font-display">
              {products.reduce((sum, p) => sum + (p.currentStock || 0), 0)} <span className="text-xs text-slate-400 font-medium">unidades</span>
            </span>
          </div>
        </div>

        {userRole !== 'estoquista' && userRole !== 'entregador' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 text-left">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider font-sans">Total em Custo</span>
              <span className="text-xl font-black text-slate-900 block mt-0.5 font-display">
                {formatCurrency(products.reduce((sum, p) => sum + (p.costPrice || 0) * (p.currentStock || 0), 0))}
              </span>
            </div>
          </div>
        )}

        {userRole !== 'estoquista' && userRole !== 'entregador' && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 text-left">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider font-sans">Total Potencial (Venda)</span>
              <span className="text-xl font-black text-slate-900 block mt-0.5 font-display">
                {formatCurrency(products.reduce((sum, p) => sum + (p.price || 0) * (p.currentStock || 0), 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Filters Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3" id="filters-panel">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search SKU, Name, Desc */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome do produto, SKU ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              id="search-input"
            />
          </div>

          {/* Filter standard categories */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              id="category-filter"
            >
              <option value="ALL">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Low Stock highlights tab — hidden for entregador */}
          {userRole !== 'entregador' && (
          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all cursor-pointer"
              id="stock-filter"
            >
              <option value="ALL">Todos os Níveis de Estoque</option>
              <option value="LOW">⚠️ Apenas Estoque Crítico</option>
            </select>
          </div>
          )}
        </div>

        {/* Dynamic counts indicator */}
        <div className="flex justify-between items-center text-xs text-slate-400 font-medium px-1">
          <span>Exibindo {filteredProducts.length} de {products.length} produtos cadastrados</span>
          {stockFilter === 'LOW' && (
            <span className="text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100 flex items-center gap-1 font-sans">
              <AlertTriangle className="w-3 h-3" />
              Filtrado por estoque crítico
            </span>
          )}
        </div>
      </div>

      {/* Main Grid View is designed with responsive cards for mobile and a list layout for desktop */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="products-table-container">
        {filteredProducts.length > 0 ? (
          <>
            {/* Desktop View Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0}
                        onChange={toggleAllProductsSelection}
                        className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-4">SKU & Produto</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4 hidden md:table-cell">Endereço Físico</th>
                    {userRole !== 'entregador' && (
                      <th className="p-4 text-right">{userRole === 'estoquista' ? 'Preço de Venda' : 'Preço (Custo / Venda)'}</th>
                    )}
                    {userRole !== 'entregador' && (
                      <th className="p-4 text-center">Definição de Estoque</th>
                    )}
                    <th className="p-4 text-center">Status</th>
                    {userRole !== 'estoquista' && userRole !== 'entregador' && <th className="p-4 text-right">Ajuste de Saldo</th>}
                    {userRole !== 'estoquista' && userRole !== 'entregador' && <th className="p-4 text-center">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map(product => {
                    const isCritical = product.currentStock <= product.minStock;
                    const isSelected = selectedProductIds.has(product.id);
                    return (
                      <tr key={product.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''} ${isCritical ? 'bg-amber-50/20' : ''}`} id={`product-row-${product.id}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        {/* SKU & PRODUCT */}
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-sm">{product.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-blue-600 font-semibold px-1 rounded bg-blue-50 border border-blue-100">
                              {product.sku}
                            </span>
                            {isCritical && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.2 font-semibold border border-amber-200">
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Restock
                              </span>
                            )}
                          </div>
                          {product.description && (
                            <div className="text-slate-400 text-xs mt-1 truncate max-w-[280px] hidden sm:block italic" title={product.description}>
                              {product.description}
                            </div>
                          )}
                        </td>

                        {/* CATEGORY */}
                        <td className="p-4">
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200/50">
                            {product.category}
                          </span>
                        </td>

                        {/* SHELF LOCATION */}
                        <td className="p-4 hidden md:table-cell">
                          {product.location ? (
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[150px]">{product.location}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Não fixado</span>
                          )}
                        </td>

                        {/* PRICES — hidden for entregador */}
                        {userRole !== 'entregador' && (
                        <td className="p-4 text-right">
                          <div>
                            <div className="text-slate-900 font-bold">{formatCurrency(product.price)}</div>
                            {userRole !== 'estoquista' && userRole !== 'entregador' && (
                              <div className="text-[11px] text-slate-400">Custo: {formatCurrency(product.costPrice)}</div>
                            )}
                          </div>
                        </td>
                        )}

                        {/* INVENTORY STRENGTH AND LEVELS — hidden for entregador */}
                        {userRole !== 'entregador' && (
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={`inline-flex px-3 py-1 rounded-full font-extrabold text-sm ${isCritical ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-blue-50 text-blue-800'}`}>
                              {product.currentStock} {product.unit || 'UN'}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-1">Lançado Min: {product.minStock}</span>
                          </div>
                        </td>
                        )}

                        {/* STATUS */}
                        <td className="p-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${product.active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            {product.active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>

                        {/* QUICK MANUAL STOCK LAUNCH */}
                        {userRole !== 'estoquista' && userRole !== 'entregador' && (
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => openAdjustModal(product, 'IN')}
                                className="p-1 px-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1"
                                title="Lançar Nova Entrada de Estoque"
                                id={`btn-stock-in-${product.id}`}
                              >
                                <MoveUp className="w-3.5 h-3.5" />
                                <span>Entrada</span>
                              </button>
                              <button
                                onClick={() => openAdjustModal(product, 'OUT')}
                                className="p-1 px-2.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded border border-amber-200 text-xs font-bold transition-all flex items-center gap-1"
                                title="Lançar Nova Baixa/Saída de Estoque"
                                id={`btn-stock-out-${product.id}`}
                              >
                                <MoveDown className="w-3.5 h-3.5" />
                                <span>Dar Baixa (Loja)</span>
                              </button>
                            </div>
                          </td>
                        )}

                        {/* DETAILED DELETE AND EDIT ACTIONS */}
                        {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'vendedor' && (
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEditModal(product)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded transition-all cursor-pointer"
                                title="Editar Produto"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setProductToDelete(product);
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded transition-all cursor-pointer"
                                title="Excluir Produto"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredProducts.map(product => {
                const isCritical = product.currentStock <= product.minStock;
                const isSelected = selectedProductIds.has(product.id);
                return (
                  <div key={product.id} className={`p-4 space-y-3 ${isSelected ? 'bg-blue-50/50' : ''} ${isCritical ? 'bg-amber-50/20' : ''}`} id={`product-card-${product.id}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex gap-3 items-start min-w-0">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProductSelection(product.id)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-snug">{product.name}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                          <span className="font-mono text-[10px] text-blue-600 font-semibold px-1 rounded bg-blue-50 border border-blue-100">
                            {product.sku}
                          </span>
                          <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200/50">
                            {product.category}
                          </span>
                          <span className={`inline-flex px-1.5 py-0.2 text-[9px] font-bold rounded-full ${product.active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            {product.active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                      </div>
                      {isCritical && (
                        <span className="flex items-center gap-0.5 text-[9px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 font-bold border border-amber-200 whitespace-nowrap">
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Restock
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      {userRole !== 'entregador' && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Preço</span>
                        <span className="text-slate-900 font-bold text-sm">{formatCurrency(product.price)}</span>
                        {userRole !== 'estoquista' && userRole !== 'entregador' && (
                          <span className="text-[10px] text-slate-400 block">Custo: {formatCurrency(product.costPrice)}</span>
                        )}
                      </div>
                      )}
                      {userRole !== 'entregador' && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Estoque Atual</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-extrabold text-xs mt-0.5 ${isCritical ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                          {product.currentStock} / {product.minStock} {product.unit || 'UN'}
                        </span>
                      </div>
                      )}
                      {product.location && (
                        <div className="col-span-2 flex items-center gap-1.5 text-slate-500 text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Endereço: <strong className="text-slate-700">{product.location}</strong></span>
                        </div>
                      )}
                    </div>

                    {userRole !== 'estoquista' && userRole !== 'entregador' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => openAdjustModal(product, 'IN')}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded border border-emerald-200 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <MoveUp className="w-3 h-3" />
                            <span>Entrada</span>
                          </button>
                          <button
                            onClick={() => openAdjustModal(product, 'OUT')}
                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-650 hover:text-white rounded border border-amber-200 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <MoveDown className="w-3 h-3" />
                            <span>Dar Baixa (Loja)</span>
                          </button>
                        </div>
                        
                        {userRole !== 'vendedor' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => openEditModal(product)}
                              className="p-1 px-2 text-blue-600 hover:bg-blue-50 rounded border border-slate-200 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => setProductToDelete(product)}
                              className="p-1 px-2 text-rose-500 hover:bg-rose-50 rounded border border-slate-200 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <AlertTriangle className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Nenhum produto encontrado</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery || selectedCategory !== 'ALL' || stockFilter !== 'ALL'
                ? 'Tente alterar os filtros desejados para ampliar sua busca.'
                : 'Utilize o botão superior "Cadastrar Produto" para lançar seu inventário em estoque.'}
            </p>
          </div>
        )}
      </div>
      </>
      )}

      <ImportTab
              isActive={activeTab === 'import'}
              importProducts={importProducts}
              setImportProducts={setImportProducts}
              importText={importText}
              setImportText={setImportText}
              duplicateAction={duplicateAction}
              setDuplicateAction={setDuplicateAction}
              isImporting={isImporting}
              importProgress={importProgress}
              categories={categories}
              products={products}
              onCancel={() => {
                setImportText('');
                setImportProducts([]);
                setActiveTab('catalog');
              }}
              onAnalyze={(parsed) => setImportProducts(parsed)}
              onConfirmImport={handleConfirmImport}
              parseImportText={parseImportText}
            />

      {activeTab === 'invoice' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col font-sans text-left space-y-4">
          <div className="border-b border-slate-200 pb-4 mb-2 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-600" /> Importar Nota Fiscal (Entrada de Saldo)
              </h3>
              <p className="text-xs text-slate-450 mt-1">Carregue o arquivo XML da NF-e ou cole a lista de itens para registrar compras de mercadorias no estoque.</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col space-y-4">
            {reviewInvoiceItems.length === 0 ? (
              // Upload & Textarea Phase
              <div className="flex-1 flex flex-col space-y-4 min-h-[300px]">
                {/* Drag and Drop Zone */}
                <div className="border-2 border-dashed border-slate-250 hover:border-slate-350 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col items-center justify-center gap-3 group relative cursor-pointer">
                  <input
                    type="file"
                    accept=".xml"
                    onChange={handleXmlFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-slate-655 transition-colors">
                    <Upload className="w-6 h-6 stroke-1.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Selecione o arquivo XML da NF-e</p>
                    <p className="text-[10px] text-slate-400 mt-1">Clique ou arraste o arquivo XML (.xml) da sua nota fiscal aqui</p>
                  </div>
                </div>

                <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider my-1">— OU COLE O TEXTO DA NOTA FISCAL ABAIXO —</div>

                <textarea
                  value={invoiceText}
                  onChange={(e) => setInvoiceText(e.target.value)}
                  placeholder="Cole aqui o texto ou planilha contendo os dados da nota. Formato esperado:
Código / SKU [espaço/tab] Nome do Produto [espaço/tab] Qtd [espaço/tab] Preço de Custo [espaço/tab] Unidade"
                  className="w-full h-40 p-4 border border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800 text-xs font-mono leading-relaxed"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleLoadInvoiceText}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2"
                  >
                    <span>Analisar Nota</span>
                  </button>
                </div>
              </div>
            ) : (
              // Review and Edit Phase
              <div className="flex-1 flex flex-col space-y-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-xs leading-normal flex items-start gap-3 text-left">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-605 mt-0.5" />
                  <div>
                    <span className="font-bold block">Revisão e Entrada de Nota Fiscal</span>
                    O sistema identificou os produtos abaixo. Ajuste os campos editáveis se desejar (Preço de Venda, Preço Mínimo, Categoria e Unidade).
                    Ao confirmar, a quantidade será **adicionada ao saldo existente** de estoque.
                  </div>
                </div>

                <div className="max-h-[450px] overflow-y-auto border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Código (SKU)</th>
                        <th className="p-3">Produto</th>
                        <th className="p-3 text-center">Qtd Entrada</th>
                        <th className="p-3 text-right">Custo Unit.</th>
                        <th className="p-3 text-right">Preço Venda</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {reviewInvoiceItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/20 transition-colors">
                          <td className="p-3 font-mono text-xs font-semibold text-slate-600">{item.sku}</td>
                          <td className="p-3 font-semibold text-slate-800 text-xs truncate max-w-[200px]" title={item.name}>{item.name}</td>
                          <td className="p-3 text-center font-bold text-slate-900 text-xs bg-slate-50/30">{item.quantity} {item.unit}</td>
                          <td className="p-3 text-right font-mono text-xs font-bold text-blue-650">{formatCurrency(item.costPrice)}</td>
                          
                          {/* Price Edit Input */}
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...reviewInvoiceItems];
                                updated[idx].price = val;
                                setReviewInvoiceItems(updated);
                              }}
                              className="w-20 px-1.5 py-1 text-xs border border-slate-200 rounded-lg text-right font-semibold font-mono"
                            />
                          </td>

                          {/* Category Edit Dropdown */}
                          <td className="p-2">
                            <select
                              value={item.category}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = [...reviewInvoiceItems];
                                updated[idx].category = val;
                                setReviewInvoiceItems(updated);
                              }}
                              className="px-1.5 py-1 text-xs border border-slate-200 rounded-lg bg-white w-28 truncate select-none"
                            >
                              {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </td>

                          {/* Status Badge */}
                          <td className="p-3 text-center">
                            {item.isExisting ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                Existente
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Novo
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setReviewInvoiceItems([])}
                    disabled={isProcessingInvoice}
                    className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setShowInvoiceCalculator(true)}
                    disabled={isProcessingInvoice || reviewInvoiceItems.length === 0}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                  >
                    Calcular Preços (Impostos)
                  </button>
                  <button
                    onClick={handleConfirmInvoiceImport}
                    disabled={isProcessingInvoice}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-sm rounded-lg shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    {isProcessingInvoice ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Processando nota...</span>
                      </>
                    ) : (
                      <span>Registrar Entrada ({reviewInvoiceItems.length} Itens)</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-blue-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-blue-600 hover:bg-blue-700 p-4 text-white flex justify-between items-center transition-all shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-white" /> Cadastrar Novo Item no Estoque
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Product generic categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Categoria <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    SKU (Código de Barras / Referência)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: ELE-MON-12"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAutoGenerateSku}
                      className="px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg whitespace-nowrap cursor-pointer hover:border-blue-300 transition-colors"
                      title="Gerar código SKU automático baseado na categoria"
                    >
                      Gerar
                    </button>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nome Comercial do Produto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Monitor Gamer AOC Sniper 24''"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              {/* Cost, Tax, Markup and Retail Prices */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Custo (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newProduct.costPrice}
                    onChange={(e) => updateNewProductPricing(e.target.value, String(newProduct.freightPercent || 0), String(newProduct.taxPercent || 0), String(newProduct.markupPercent || 0))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-medium font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Frete (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={newProduct.freightPercent || ''}
                    onChange={(e) => updateNewProductPricing(String(newProduct.costPrice), e.target.value, String(newProduct.taxPercent || 0), String(newProduct.markupPercent || 0))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Imposto (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={newProduct.taxPercent || ''}
                    onChange={(e) => updateNewProductPricing(String(newProduct.costPrice), String(newProduct.freightPercent || 0), e.target.value, String(newProduct.markupPercent || 0))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Markup (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProduct.markupPercent || ''}
                    onChange={(e) => updateNewProductPricing(String(newProduct.costPrice), String(newProduct.freightPercent || 0), String(newProduct.taxPercent || 0), e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Venda (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newProduct.price}
                    onChange={(e) => updateNewProductPricing(String(newProduct.costPrice), String(newProduct.freightPercent || 0), String(newProduct.taxPercent || 0), String(newProduct.markupPercent || 0), e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-bold text-blue-800 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end mt-1 mb-2">
                <button
                  type="button"
                  onClick={() => setShowProductCalculator('NEW')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer border border-indigo-200 flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" /> Calcular Preço com Impostos
                </button>
              </div>

              {/* Assembly Config */}
              <div className="bg-blue-50/45 border border-blue-100 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newNeedsAssembly"
                    checked={newProduct.needsAssembly}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, needsAssembly: e.target.checked }))}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="newNeedsAssembly" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Necessita Montagem por Padrão
                  </label>
                </div>
                {newProduct.needsAssembly && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Porcentagem da Montagem (%) *
                    </label>
                    <div className="relative max-w-[160px]">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="10"
                        value={newProduct.assemblyPercent}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, assemblyPercent: e.target.value }))}
                        className="w-full pr-8 pl-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-slate-800 font-bold font-mono"
                        required
                      />
                      <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block">Ex: 10% do valor do produto será somado como taxa de montagem.</span>
                  </div>
                )}
              </div>

              {/* Stocks - Starting and Minimum */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Estoque Inicial (unidades)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.currentStock}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, currentStock: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Estoque de Alerta Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, minStock: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-bold text-rose-700"
                  />
                </div>
              </div>

              {/* Physical Shelving Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Localização Física no Almoxarifado
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Corredor D - Prateleira 3"
                    value={newProduct.location}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Dimensões (A x L x P)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 120 x 80 x 75 cm"
                    value={newProduct.dimensions}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, dimensions: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Unit of Measurement and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="PC">PC (Peça)</option>
                    <option value="CJ">CJ (Conjunto)</option>
                    <option value="JG">JG (Jogo)</option>
                    <option value="M">M (Metro)</option>
                    <option value="M2">M² (Metro Quadrado)</option>
                    <option value="KG">KG (Quilograma)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="new-active"
                    checked={newProduct.active}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, active: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="new-active" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Disponível no Showroom (Ativo)
                  </label>
                </div>
              </div>

              {/* Showroom Attributes: Materials and Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Material Principal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: MDF, Madeira Maciça, Linho"
                    value={newProduct.material}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, material: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Cores (Separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Preto, Carvalho, Mel"
                    value={newProduct.colors}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, colors: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Image URL with preset selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  URL da Imagem / Foto do Móvel
                </label>
                <input
                  type="url"
                  placeholder="Insira um link HTTP/HTTPS público..."
                  value={newProduct.imageUrl}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, imageUrl: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono text-xs"
                />
                
                {/* File Upload for Main Image */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingMainNew ? 'Enviando...' : 'Upload Foto Principal'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      disabled={uploadingMainNew}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setUploadingMainNew(true);
                            const url = await uploadProductImage(file);
                            setNewProduct(prev => ({ ...prev, imageUrl: url }));
                          } catch (err) {
                            console.error(err);
                            alert("Erro ao enviar imagem ao Firebase Storage.");
                          } finally {
                            setUploadingMainNew(false);
                          }
                        }
                      }}
                    />
                  </label>
                  {newProduct.imageUrl && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Foto enviada com sucesso</span>
                  )}
                </div>
                
                {/* Visual Preset selection */}
                <div className="mt-2">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Ou escolha um visual modelo para monstruário:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "🛋️ Sofá", url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600" },
                      { label: "🪑 Cadeira Office", url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80&w=600" },
                      { label: "💻 Mesa de Trabalho", url: "https://images.unsplash.com/photo-1530018607912-eff2df114f11?auto=format&fit=crop&q=80&w=600" },
                      { label: "🚪 Guarda-Roupa", url: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=600" },
                      { label: "📺 Painel Home", url: "https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?auto=format&fit=crop&q=80&w=600" }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setNewProduct(prev => ({ ...prev, imageUrl: preset.url }))}
                        className={`text-[10px] px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer ${newProduct.imageUrl === preset.url ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold' : ''}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Secondary Images URLs */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Outras URLs de Imagem (Separadas por vírgula)
                </label>
                <textarea
                  placeholder="https://imagem1.jpg, https://imagem2.jpg"
                  value={newProduct.imagesText}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, imagesText: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono text-xs"
                />
                
                {/* File Upload for Gallery */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 cursor-pointer transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{uploadingGalleryNew ? 'Enviando...' : 'Adicionar Foto da Galeria'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      className="hidden" 
                      disabled={uploadingGalleryNew}
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          try {
                            setUploadingGalleryNew(true);
                            const urls: string[] = [];
                            for (const file of Array.from(files) as File[]) {
                              const url = await uploadProductImage(file);
                              urls.push(url);
                            }
                            setNewProduct(prev => {
                              const current = prev.imagesText ? prev.imagesText.split(',').map(i => i.trim()).filter(Boolean) : [];
                              return { ...prev, imagesText: [...current, ...urls].join(', ') };
                            });
                          } catch (err) {
                            console.error(err);
                            alert("Erro ao enviar imagens ao Firebase Storage.");
                          } finally {
                            setUploadingGalleryNew(false);
                          }
                        }
                      }}
                    />
                  </label>
                  {uploadingGalleryNew && (
                    <span className="text-[10px] text-blue-600 font-medium animate-pulse">Enviando arquivos...</span>
                  )}
                </div>
                
                <span className="text-[10px] text-slate-400 mt-0.5 block">Insira links adicionais ou faça upload de fotos locais para a galeria do showroom.</span>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição / Notas de Produto
                </label>
                <textarea
                  placeholder="Especificações internas, dimensões, garantias adicionais ou links do produto comercial."
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingMainNew || uploadingGalleryNew}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingMainNew || uploadingGalleryNew ? 'Enviando Imagens...' : 'Cadastrar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PRODUCT */}
      {isEditModalOpen && editProductState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-blue-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-blue-700 p-4 text-white flex justify-between items-center shrink-0">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Edit className="w-5 h-5 text-white" /> Editar Cadastro do Produto
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditProductState(null);
                }}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProductSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Categoria
                  </label>
                  <select
                    value={editProductState.category}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    SKU (Código único)
                  </label>
                  <input
                    type="text"
                    value={editProductState.sku}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, sku: e.target.value.trim() }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nome do Produto
                </label>
                <input
                  type="text"
                  value={editProductState.name}
                  onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              {/* Cost, Tax, Markup and Retail Prices */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Custo (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editProductState.costPrice || 0}
                    onChange={(e) => updateEditProductPricing(parseFloat(e.target.value) || 0, editProductState.freightPercent || 0, editProductState.taxPercent || 0, editProductState.markupPercent || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-medium font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Frete (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={editProductState.freightPercent || 0}
                    onChange={(e) => updateEditProductPricing(editProductState.costPrice || 0, parseFloat(e.target.value) || 0, editProductState.taxPercent || 0, editProductState.markupPercent || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Imposto (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="0"
                    value={editProductState.taxPercent || 0}
                    onChange={(e) => updateEditProductPricing(editProductState.costPrice || 0, editProductState.freightPercent || 0, parseFloat(e.target.value) || 0, editProductState.markupPercent || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Markup (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editProductState.markupPercent || 0}
                    onChange={(e) => updateEditProductPricing(editProductState.costPrice || 0, editProductState.freightPercent || 0, editProductState.taxPercent || 0, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Venda (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editProductState.price || 0}
                    onChange={(e) => updateEditProductPricing(editProductState.costPrice || 0, editProductState.freightPercent || 0, editProductState.taxPercent || 0, editProductState.markupPercent || 0, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-bold text-blue-800 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end mt-1 mb-2">
                <button
                  type="button"
                  onClick={() => setShowProductCalculator('EDIT')}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer border border-indigo-200 flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" /> Calcular Preço com Impostos
                </button>
              </div>

              {/* Assembly Config */}
              <div className="bg-blue-50/45 border border-blue-100 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editNeedsAssembly"
                    checked={!!editProductState.needsAssembly}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, needsAssembly: e.target.checked }) : null)}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="editNeedsAssembly" className="text-xs font-bold text-slate-700 select-none cursor-pointer">
                    Necessita Montagem por Padrão
                  </label>
                </div>
                {editProductState.needsAssembly && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Porcentagem da Montagem (%) *
                    </label>
                    <div className="relative max-w-[160px]">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="10"
                        value={editProductState.assemblyPercent || 0}
                        onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, assemblyPercent: parseFloat(e.target.value) || 0 }) : null)}
                        className="w-full pr-8 pl-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white text-slate-800 font-bold font-mono"
                        required
                      />
                      <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">%</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block">Ex: 10% do valor do produto será somado como taxa de montagem.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 text-blue-700">
                    Estoque Físico Atual (Editável)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editProductState.currentStock}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, currentStock: parseInt(e.target.value, 10) || 0 }) : null)}
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 bg-blue-50/50 font-bold text-blue-900"
                    title="Altere o estoque diretamente se necessário"
                  />
                  <span className="text-[10px] text-blue-600 mt-0.5 block">Você pode alterar o saldo manualmente nesta ficha cadastral.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Mínimo em Estoque
                  </label>
                  <input
                    type="number"
                    value={editProductState.minStock}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, minStock: parseInt(e.target.value, 10) || 0 }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* Unit of Measurement and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={editProductState.unit || 'UN'}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, unit: e.target.value }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  >
                    <option value="UN">UN (Unidade)</option>
                    <option value="PC">PC (Peça)</option>
                    <option value="CJ">CJ (Conjunto)</option>
                    <option value="JG">JG (Jogo)</option>
                    <option value="M">M (Metro)</option>
                    <option value="M2">M² (Metro Quadrado)</option>
                    <option value="KG">KG (Quilograma)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="edit-active"
                    checked={editProductState.active !== false}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, active: e.target.checked }) : null)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="edit-active" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Disponível no Showroom (Ativo)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Localização Física
                  </label>
                  <input
                    type="text"
                    value={editProductState.location || ''}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, location: e.target.value }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Dimensões (A x L x P)
                  </label>
                  <input
                    type="text"
                    value={editProductState.dimensions || ''}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, dimensions: e.target.value }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Material Principal
                  </label>
                  <input
                    type="text"
                    value={editProductState.material || ''}
                    onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, material: e.target.value }) : null)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Cores (Separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={Array.isArray(editProductState.colors) ? editProductState.colors.join(', ') : (editProductState.colors || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditProductState(prev => prev ? ({ ...prev, colors: val ? val.split(',').map(c => c.trim()).filter(Boolean) : [] }) : null);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  URL da Imagem / Foto do Móvel
                </label>
                <input
                  type="url"
                  value={editProductState.imageUrl || ''}
                  onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, imageUrl: e.target.value }) : null)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 font-mono text-xs"
                />
                
                {/* File Upload for Main Image */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingMainEdit ? 'Enviando...' : 'Upload Foto Principal'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      disabled={uploadingMainEdit}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setUploadingMainEdit(true);
                            const url = await uploadProductImage(file);
                            setEditProductState(prev => prev ? ({ ...prev, imageUrl: url }) : null);
                          } catch (err) {
                            console.error(err);
                            alert("Erro ao enviar imagem ao Firebase Storage.");
                          } finally {
                            setUploadingMainEdit(false);
                          }
                        }
                      }}
                    />
                  </label>
                  {editProductState.imageUrl && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Foto enviada com sucesso</span>
                  )}
                </div>
                
                {/* Visual Preset selection inside edit */}
                <div className="mt-2 text-slate-700">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">Ou escolha um visual modelo:</span>
                  <div className="flex flex-wrap gap-1.5 font-sans">
                    {[
                      { label: "🛋️ Sofá", url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=600" },
                      { label: "🪑 Cadeira Office", url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80&w=600" },
                      { label: "💻 Mesa de Trabalho", url: "https://images.unsplash.com/photo-1530018607912-eff2df114f11?auto=format&fit=crop&q=80&w=600" },
                      { label: "🚪 Guarda-Roupa", url: "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=600" },
                      { label: "📺 Painel Home", url: "https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?auto=format&fit=crop&q=80&w=600" }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setEditProductState(prev => prev ? ({ ...prev, imageUrl: preset.url }) : null)}
                        className={`text-[10px] px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition-colors cursor-pointer ${editProductState.imageUrl === preset.url ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold' : ''}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Secondary Images URLs */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Outras URLs de Imagem (Separadas por vírgula)
                </label>
                <textarea
                  placeholder="https://imagem1.jpg, https://imagem2.jpg"
                  value={Array.isArray(editProductState.images) ? editProductState.images.join(', ') : (editProductState.images || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditProductState(prev => prev ? ({ ...prev, images: val ? val.split(',').map(img => img.trim()).filter(Boolean) : [] }) : null);
                  }}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white font-mono text-xs"
                />
                
                {/* File Upload for Gallery */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 cursor-pointer transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    <span>{uploadingGalleryEdit ? 'Enviando...' : 'Adicionar Foto da Galeria'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      className="hidden" 
                      disabled={uploadingGalleryEdit}
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          try {
                            setUploadingGalleryEdit(true);
                            const urls: string[] = [];
                            for (const file of Array.from(files) as File[]) {
                              const url = await uploadProductImage(file);
                              urls.push(url);
                            }
                            setEditProductState(prev => {
                              if (!prev) return null;
                              const current = prev.images || [];
                              return { ...prev, images: [...current, ...urls] };
                            });
                          } catch (err) {
                            console.error(err);
                            alert("Erro ao enviar imagens ao Firebase Storage.");
                          } finally {
                            setUploadingGalleryEdit(false);
                          }
                        }
                      }}
                    />
                  </label>
                  {uploadingGalleryEdit && (
                    <span className="text-[10px] text-blue-600 font-medium animate-pulse">Enviando arquivos...</span>
                  )}
                </div>
                
                <span className="text-[10px] text-slate-400 mt-0.5 block">Insira links adicionais ou faça upload de fotos locais para a galeria do showroom.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Notas / Detalhes de Produto
                </label>
                <textarea
                  value={editProductState.description || ''}
                  onChange={(e) => setEditProductState(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditProductState(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingMainEdit || uploadingGalleryEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingMainEdit || uploadingGalleryEdit ? 'Enviando Imagens...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADJUST INVENTORY FLOW (INPUT & OUTPUT DIRECT IN METRIC TIME) */}
      {isAdjustModalOpen && selectedProduct && (
        <AdjustInventoryModal
          product={selectedProduct}
          adjustType={adjustType}
          adjustQty={adjustQty}
          adjustReason={adjustReason}
          adjustDesc={adjustDesc}
          onChangeQty={setAdjustQty}
          onChangeReason={setAdjustReason}
          onChangeDesc={setAdjustDesc}
          onCancel={() => {
            setIsAdjustModalOpen(false);
            setSelectedProduct(null);
          }}
          onSubmit={handleAdjustStockSubmit}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {productToDelete && (
        <DeleteConfirmationDialog
          domId="delete-confirm-dialog"
          icon={<Trash2 className="w-6 h-6" />}
          title="Confirmar Exclusão"
          message={<>Tem certeza que gostaria de excluir o produto <strong className="text-slate-800 font-semibold">"{productToDelete.name}"</strong>? Esta ação removerá o registro para sempre e não pode ser desfeita.</>}
          confirmLabel="Confirmar Exclusão"
          onCancel={() => setProductToDelete(null)}
          onConfirm={() => {
            onDeleteProduct(productToDelete.id);
            setProductToDelete(null);
          }}
        />
      )}

      {/* SIDE DRAWER: STOCK TRANSACTION HISTORY */}
      <StockHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        transactions={filteredTransactions}
        searchQuery={historySearchQuery}
        typeFilter={historyTypeFilter}
        onChangeSearchQuery={setHistorySearchQuery}
        onChangeTypeFilter={setHistoryTypeFilter}
        onClose={() => setIsHistoryDrawerOpen(false)}
      />

      {/* PRODUCT REPORT MODAL */}
      {isReportModalOpen && (
        <ProductReportModal products={reportProducts} onClose={() => setIsReportModalOpen(false)} />
      )}

      {/* FLOATING ACTION BAR FOR BATCH ACTIONS */}
      {selectedProductIds.size > 0 && activeTab === 'catalog' && (
        <BatchActionsBar
          selectedCount={selectedProductIds.size}
          onCancel={() => setSelectedProductIds(new Set())}
          onEditBatch={() => setIsBatchEditModalOpen(true)}
          onCalculateTaxes={() => setShowBatchCalculator(true)}
        />
      )}

      {/* BATCH EDIT MODAL */}
      <BatchEditModal
        isOpen={isBatchEditModalOpen}
        onClose={() => setIsBatchEditModalOpen(false)}
        selectedCount={selectedProductIds.size}
        batchEditState={batchEditState}
        setBatchEditState={setBatchEditState}
        onSubmit={handleBatchEditSubmit}
        isProcessing={isProcessingBatch}
        categories={categories}
        onAddCategory={onAddCategory ? handleCreateCategory : undefined}
      />

      {/* TAX CALCULATOR FOR BATCH UPDATE */}
      {showBatchCalculator && (
        <TaxCalculatorModal
          initialItems={products.filter(p => selectedProductIds.has(p.id)).map(p => ({
            id: p.id,
            name: p.name,
            costPrice: p.costPrice
          }))}
          onClose={() => setShowBatchCalculator(false)}
          onConfirm={async (results) => {
            // Because onUpdateProduct is async and might take a moment, show processing state
            setIsProcessingBatch(true);
            try {
              for (const result of results) {
                const product = products.find(p => p.id === result.id);
                if (product) {
                  await onUpdateProduct({
                    ...product,
                    costPrice: result.custoLiquido,
                    price: result.precoVenda,
                    lastSyncDate: new Date().toISOString(),
                    syncStatus: 'synced'
                  });
                }
              }
              setSelectedProductIds(new Set());
            } catch (err: any) {
              alert("Erro ao atualizar os preços: " + err.message);
            } finally {
              setIsProcessingBatch(false);
              setShowBatchCalculator(false);
            }
          }}
          title="Calculadora de Impostos em Lote"
          description="Ajuste os valores dos impostos para recalcular os custos líquidos e os preços de venda sugeridos dos itens selecionados."
        />
      )}

      {/* TAX CALCULATOR FOR INVOICE IMPORT */}
      {showInvoiceCalculator && (
        <TaxCalculatorModal
          initialItems={reviewInvoiceItems.map(item => ({
            id: item.sku,
            name: item.name,
            costPrice: item.costPrice,
            ipi: item.ipi,
            frete: item.frete,
            desconto: item.desconto
          }))}
          onClose={() => setShowInvoiceCalculator(false)}
          onConfirm={(results: TaxResultItem[]) => {
            const updated = reviewInvoiceItems.map(item => {
              const res = results.find(r => r.id === item.sku);
              if (res) {
                return {
                  ...item,
                  costPrice: res.custoLiquido,
                  price: res.precoVenda
                };
              }
              return item;
            });
            setReviewInvoiceItems(updated);
            setShowInvoiceCalculator(false);
          }}
          title="Calculadora de Impostos - Importação NF-e"
          description="Preencha informações faltantes (ex: IPI) para calcular os custos líquidos e preços finais sugeridos para os itens da nota."
        />
      )}

      {/* TAX CALCULATOR FOR SINGLE PRODUCT */}
      {showProductCalculator && (
        <TaxCalculatorModal
          initialItems={[{
            id: 'temp',
            name: showProductCalculator === 'NEW' ? newProduct.name : (editProductState?.name || ''),
            costPrice: showProductCalculator === 'NEW' ? Number(newProduct.costPrice) : (editProductState?.costPrice || 0)
          }]}
          onClose={() => setShowProductCalculator(null)}
          onConfirm={(results: TaxResultItem[]) => {
            const res = results[0];
            if (res) {
              if (showProductCalculator === 'NEW') {
                updateNewProductPricing(
                  String(res.custoLiquido),
                  String(newProduct.freightPercent || 0),
                  String(newProduct.taxPercent || 0),
                  String(res.markup),
                  String(res.precoVenda)
                );
              } else if (showProductCalculator === 'EDIT' && editProductState) {
                updateEditProductPricing(
                  res.custoLiquido,
                  editProductState.freightPercent || 0,
                  editProductState.taxPercent || 0,
                  res.markup,
                  res.precoVenda
                );
              }
            }
            setShowProductCalculator(null);
          }}
          title="Calculadora de Impostos - Cadastro"
          description="Informe os adicionais (ex: IPI, ICMS) para definir automaticamente o Custo Líquido e o Preço de Venda do produto."
        />
      )}
    </div>
  );
};
