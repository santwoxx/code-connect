import React, { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Palette, 
  Search, 
  CheckCircle, 
  AlertCircle,
  Maximize2, 
  Layers, 
  Tag, 
  Sparkles,
  Calculator,
  ChevronRight,
  Info,
  Heart,
  Star,
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronLeft,
  Send,
  ShoppingBag,
  ShoppingCart,
  Minus,
  User,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
  Plus,
  Edit2,
  Trash2,
  Camera,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Check,
  Image as ImageIcon,
  Printer,
  X
} from 'lucide-react';
import { Product, Category, Seller, Sale, StockTransaction, Customer, Delivery } from '../types';
import { saveSale, removeSale, logAuditEvent, saveCustomer, fetchCustomers, saveDelivery } from '../db';
import { uploadProductImage, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { EditableText } from './showroom/EditableText';
import { EditableImageWrapper } from './showroom/EditableImageWrapper';
import { ImageEditorModal } from './showroom/ImageEditorModal';
import { ProductCard } from './showroom/ProductCard';
import { ExpirationTimer } from './showroom/ExpirationTimer';
import { DeleteConfirmationModal } from './showroom/DeleteConfirmationModal';
import { FullscreenImageLightbox } from './showroom/FullscreenImageLightbox';
import { TopBarFeatures } from './showroom/TopBarFeatures';
import { ShowroomHeader } from './showroom/ShowroomHeader';
import { CategoryNav } from './showroom/CategoryNav';
import { ProductCatalogSection } from './showroom/ProductCatalogSection';
import { CartDrawer, CartItem } from './showroom/CartDrawer';
import { FreightModal } from './showroom/FreightModal';
import { ErpPreviewBanner } from './showroom/ErpPreviewBanner';
import { IMAGES, BRAND_LOGOS, DEFAULT_CUSTOMIZATION } from '../config/showroomData';

// A Cloud Function authenticateRole troca a senha em texto puro pelo hash SHA-256
// no primeiro login do vendedor, então a confirmação de venda precisa aceitar
// tanto o texto puro (cadastro que nunca logou) quanto o hash.
async function sellerPasswordMatches(input: string, stored: string): Promise<boolean> {
  if (input === stored) return true;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const inputHash = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  return inputHash === stored;
}


interface ShowroomViewProps {
  products: Product[];
  categories: Category[];
  userRole?: string;
  onUpdateProduct?: (p: Product) => Promise<void> | void;
  onAddProduct?: (p: Omit<Product, 'id' | 'createdAt'>) => Promise<void> | void;
  onDeleteProduct?: (id: string) => Promise<void> | void;
  onBackToErp?: () => void;
  sellers?: Seller[];
  currentSeller?: Seller | null;
  onRegisterTransaction?: (transaction: Omit<StockTransaction, 'id' | 'date'>) => void;
  onPrintSale?: (sale: Sale) => void;
}

export function ShowroomView({
  products, 
  categories, 
  userRole = 'admin', 
  onUpdateProduct, 
  onAddProduct, 
  onDeleteProduct, 
  onBackToErp,
  onRegisterTransaction,
  sellers = [],
  currentSeller = null,
  onPrintSale
}: ShowroomViewProps) {
  // Filters and main Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'IMMEDIATE' | 'BACKORDER'>('ALL');

  // Multi-user / editing states
  const [showroomSuccessMsg, setShowroomSuccessMsg] = useState<string | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showroomProductToDelete, setShowroomProductToDelete] = useState<Product | null>(null);

  // Uploading states
  const [uploadingMainNew, setUploadingMainNew] = useState(false);
  const [uploadingGalleryNew, setUploadingGalleryNew] = useState(false);
  const [uploadingMainEdit, setUploadingMainEdit] = useState(false);
  const [uploadingGalleryEdit, setUploadingGalleryEdit] = useState(false);

  // Canva-like Edit Mode states
  const [visualEditMode, setVisualEditMode] = useState(false);
  
  // Customization State loaded from LocalStorage
  const [customization, setCustomization] = useState(() => {
    const saved = localStorage.getItem('centralsync_showroom_customization');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_CUSTOMIZATION, ...parsed };
      } catch (e) {
        console.error("Erro ao analisar customizações do showroom:", e);
      }
    }
    return DEFAULT_CUSTOMIZATION;
  });

  // Save customization function
  const updateCustomization = (key: string, value: any) => {
    const updated = { ...customization, [key]: value };
    setCustomization(updated);
    localStorage.setItem('centralsync_showroom_customization', JSON.stringify(updated));
  };
  
  // Helper function to update slide fields
  const updateSlide = (index: number, field: string, value: string) => {
    const slides = [...customization.carouselSlides];
    slides[index] = { ...slides[index], [field]: value };
    updateCustomization('carouselSlides', slides);
  };

  // Image Modal States
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imageEditorTargetKey, setImageEditorTargetKey] = useState<string>('');
  const [imageEditorTargetIndex, setImageEditorTargetIndex] = useState<number | null>(null);
  const [imageEditorTitle, setImageEditorTitle] = useState('');

  const triggerImageEdit = (key: string, title: string, index: number | null = null) => {
    setImageEditorTargetKey(key);
    setImageEditorTargetIndex(index);
    setImageEditorTitle(title);
    setImageEditorOpen(true);
  };

  const handleSaveImage = (newUrl: string) => {
    if (imageEditorTargetIndex !== null) {
      updateSlide(imageEditorTargetIndex, 'url', newUrl);
    } else {
      updateCustomization(imageEditorTargetKey, newUrl);
    }
  };

  // Buffer state for product edits
  const [editedSku, setEditedSku] = useState('');
  const [editedName, setEditedName] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedPrice, setEditedPrice] = useState('0');
  const [editedCostPrice, setEditedCostPrice] = useState('0');
  const [editedCurrentStock, setEditedCurrentStock] = useState('0');
  const [editedMinStock, setEditedMinStock] = useState('0');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedMaterial, setEditedMaterial] = useState('');
  const [editedDimensions, setEditedDimensions] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');
  const [editedColorsText, setEditedColorsText] = useState('');
  const [editedImagesText, setEditedImagesText] = useState('');

  // Buffer state for product creation
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPrice, setNewPrice] = useState('0');
  const [newCostPrice, setNewCostPrice] = useState('0');
  const [newCurrentStock, setNewCurrentStock] = useState('0');
  const [newMinStock, setNewMinStock] = useState('0');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [newDimensions, setNewDimensions] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newColorsText, setNewColorsText] = useState('');
  const [newImagesText, setNewImagesText] = useState('');
  
  // Interactive E-Commerce states
  const [activeCarousel, setActiveCarousel] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]); // product IDs
  const [newsletterName, setNewsletterName] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'success'>('idle');
  const [currentBrandIndex, setCurrentBrandIndex] = useState(0);

  // Modal / Detail presentation
  const [presentationProduct, setPresentationProduct] = useState<Product | null>(null);
  const [presentationColor, setPresentationColor] = useState<string>('');
  const [simulationTerm, setSimulationTerm] = useState<number>(3); // 3x default
  const [activeDetailImageUrl, setActiveDetailImageUrl] = useState<string>('');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    if (fullscreenImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [fullscreenImage]);

  // WhatsApp destination selection
  const [whatsappDestType, setWhatsappDestType] = useState<string>('default');
  const [whatsappDestCustomNum, setWhatsappDestCustomNum] = useState<string>('');
  const [whatsappDestNumber, setWhatsappDestNumber] = useState<string>('');

  const shortenUrl = async (url: string): Promise<string | null> => {
    if (!url) return null;
    try {
      // is.gd supports CORS from browsers (tinyurl.com/api-create.php does NOT — blocked by CORS policy)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (res.ok) {
        const shortened = (await res.text()).trim();
        // Validate we got a proper short URL back (not an error message)
        if (shortened.startsWith('http') && shortened.length < 50) {
          return shortened;
        }
      }
    } catch {}
    // If shortening fails, return null — a broken 400+ char Firebase URL
    // causes the WhatsApp preview to fail/bug; no link is better than a broken one
    return null;
  };

  // Sales Flow States
  const [salesMode, setSalesMode] = useState(false);
  const [selectedSalesProduct, setSelectedSalesProduct] = useState<Product | null>(null);
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
  const [loadingCep, setLoadingCep] = useState(false);
  const [salesType, setSalesType] = useState<'COMPLETED' | 'PENDING'>(userRole === 'vendedor' ? 'PENDING' : 'COMPLETED');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [salesErrors, setSalesErrors] = useState<{ name?: string; phone?: string; cpf?: string; seller?: string; street?: string; number?: string; neighborhood?: string; city?: string; state?: string; cep?: string }>({});
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);

  // Delivery/Shipping states
  const [deliveryType, setDeliveryType] = useState<'RETIRADA' | 'ENVIAR'>('RETIRADA');
  const [shippingValue, setShippingValue] = useState<number>(0);
  const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);
  const [freightInput, setFreightInput] = useState('');
  const [needsAssembly, setNeedsAssembly] = useState(true);

  // Cart states
  const [cartMode, setCartMode] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartPaymentMethod, setCartPaymentMethod] = useState<string>('');
  const [showCartCheckout, setShowCartCheckout] = useState(false);
  const [cartCreatedSales, setCartCreatedSales] = useState<Sale[] | null>(null);

  // Customer search states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const handleSelectDeliveryType = (type: 'RETIRADA' | 'ENVIAR') => {
    if (type === 'ENVIAR') {
      setFreightInput(shippingValue > 0 ? String(shippingValue) : '');
      setIsFreightModalOpen(true);
    } else {
      setDeliveryType('RETIRADA');
      setShippingValue(0);
    }
  };

  const handleConfirmFreight = () => {
    const val = parseFloat(freightInput) || 0;
    setShippingValue(val);
    setDeliveryType('ENVIAR');
    setIsFreightModalOpen(false);
  };

  const handleCancelFreight = () => {
    setIsFreightModalOpen(false);
    if (deliveryType !== 'ENVIAR') {
      setDeliveryType('RETIRADA');
    }
  };

  const searchedCustomers = useMemo(() => {
    const term = customerSearchTerm.toLowerCase().trim();
    if (!term) return customersList;
    return customersList.filter(c => 
      c.name.toLowerCase().includes(term) ||
      (c.cpf && c.cpf.includes(term)) ||
      (c.phone && c.phone.includes(term))
    );
  }, [customersList, customerSearchTerm]);

  React.useEffect(() => {
    if (selectedSalesProduct || showCartCheckout) {
      setSelectedSellerId(currentSeller?.id || '');
      setSalesType(userRole === 'vendedor' ? 'PENDING' : 'COMPLETED');
      // Fetch customers list when modal is active
      fetchCustomers().then(setCustomersList).catch(err => console.error("Erro ao buscar clientes no showroom:", err));
      setCustomerSearchTerm('');
      setIsCustomerDropdownOpen(false);
    }
  }, [selectedSalesProduct, showCartCheckout, currentSeller, userRole]);

  // Auto-expire PENDING sales whose expiresAt has passed
  React.useEffect(() => {
    const checkExpiredSales = async () => {
      try {
        const now = new Date().toISOString();
        let expiredQuery;
        if (userRole === 'vendedor' && currentSeller) {
          expiredQuery = query(
            collection(db, 'sales'),
            where('sellerId', '==', currentSeller.id),
            where('status', '==', 'PENDING'),
            where('expiresAt', '<=', now)
          );
        } else if (userRole === 'admin' || userRole === 'Proprietário / Adm Geral' || userRole === 'caixa') {
          expiredQuery = query(
            collection(db, 'sales'),
            where('status', '==', 'PENDING'),
            where('expiresAt', '<=', now)
          );
        } else {
          return;
        }

        const snap = await getDocs(expiredQuery);
        const deletePromises: Promise<void>[] = [];
        snap.forEach((doc) => {
          const sale = doc.data() as Sale;
          deletePromises.push(
            removeSale(sale.id).catch(err => console.error("Erro ao remover pedido expirado:", err))
          );
          deletePromises.push(
            logAuditEvent("Pedido Expirado Automaticamente", `Pedido ${sale.id} - ${sale.productName} de ${sale.clientName} expirou e foi removido.`).catch(err => console.error("Erro ao log expiração:", err))
          );
        });
        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      } catch (err) {
        console.error("Erro na verificação de pedidos expirados:", err);
      }
    };

    checkExpiredSales();

    const interval = setInterval(checkExpiredSales, 30000);
    return () => clearInterval(interval);
  }, [userRole, currentSeller]);

  // CEP Lookup for Showroom
  const handleShowroomCepLookup = async (cepVal: string) => {
    const cleanCEP = cepVal.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setClientStreet(data.logradouro || '');
          setClientNeighborhood(data.bairro || '');
          setClientCity(data.localidade || '');
          setClientState(data.uf || '');
        }
      } catch (err) {
        console.error("ViaCEP Lookup Failed in Showroom", err);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  // Filter products by search query & categories
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Omit inactive products from the showroom entirely
      if (p.active === false) return false;

      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.material && p.material.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const pCatLower = p.category.toLowerCase();
      let matchesCategory = true;
      if (selectedCategory !== 'ALL') {
        const selCatLower = selectedCategory.toLowerCase();
        if (selCatLower === 'sala de estar') {
          matchesCategory = pCatLower.includes('sala') || pCatLower.includes('rack') || pCatLower.includes('sofá') || pCatLower.includes('painel');
        } else if (selCatLower === 'sala de jantar') {
          matchesCategory = pCatLower.includes('jantar') || pCatLower.includes('mesa') || pCatLower.includes('cadeira') || pCatLower.includes('buffet');
        } else if (selCatLower === 'quarto') {
          matchesCategory = pCatLower.includes('quarto') || pCatLower.includes('cama') || pCatLower.includes('cabeceira') || pCatLower.includes('guarda') || pCatLower.includes('armário') || pCatLower.includes('colch') || pCatLower.includes('base box') || pCatLower.includes('cômoda') || pCatLower.includes('comoda');
        } else if (selCatLower === 'cozinha') {
          matchesCategory = pCatLower.includes('cozinha') || pCatLower.includes('gabinete') || pCatLower.includes('balcão');
        } else if (selCatLower === 'banheiro') {
          matchesCategory = pCatLower.includes('banheiro') || pCatLower.includes('gabinete') || pCatLower.includes('pia');
        } else if (selCatLower === 'eletrodomesticos') {
          matchesCategory = pCatLower.includes('eletro') || pCatLower.includes('airfryer') || pCatLower.includes('fogão') || pCatLower.includes('geladeira') || pCatLower.includes('microondas') || pCatLower.includes('liquidificador') || pCatLower.includes('batedeira') || pCatLower.includes('cafeteira') || pCatLower.includes('sanduicheira') || pCatLower.includes('torradeira') || pCatLower.includes('ventilador') || pCatLower.includes('aspirador') || pCatLower.includes('ferro');
        } else if (selCatLower === 'lavanderia') {
          matchesCategory = pCatLower.includes('lavanderia') || pCatLower.includes('tanque') || pCatLower.includes('máquina') || pCatLower.includes('vareta') || pCatLower.includes('cesto');
        } else if (selCatLower === 'escritório' || selCatLower === 'escritorio') {
          matchesCategory = pCatLower.includes('escr') || pCatLower.includes('mesa') || pCatLower.includes('cadeira') || pCatLower.includes('estante');
        } else {
          matchesCategory = pCatLower.includes(selCatLower);
        }
      }
      
      const isReadyToShip = p.currentStock > 0;
      const matchesAvail = availabilityFilter === 'ALL' || 
                           (availabilityFilter === 'IMMEDIATE' && isReadyToShip) || 
                           (availabilityFilter === 'BACKORDER' && !isReadyToShip);

      return matchesSearch && matchesCategory && matchesAvail;
    });
  }, [products, searchQuery, selectedCategory, availabilityFilter]);

  // Handle loved / favorite items toggling
  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.includes(productId)) {
      setFavorites(favorites.filter(id => id !== productId));
    } else {
      setFavorites([...favorites, productId]);
    }
  };

  // Open the presentation detail modal drawer
  const selectForPresentation = (product: Product) => {
    setPresentationProduct(product);
    setIsEditingProduct(false);
    const productColors = safeArray(product.colors);
    const productImages = safeArray(product.images);
    if (productColors.length > 0) {
      setPresentationColor(productColors[0]);
    } else {
      setPresentationColor('');
    }

    const defaultImg = product.imageUrl || (productImages.length > 0 ? productImages[0] : '');
    setActiveDetailImageUrl(defaultImg);

    setEditedSku(product.sku || '');
    setEditedName(product.name || '');
    setEditedCategory(product.category || '');
    setEditedPrice(product.price !== undefined ? String(product.price) : '0');
    setEditedCostPrice(product.costPrice !== undefined ? String(product.costPrice) : '0');
    setEditedCurrentStock(product.currentStock !== undefined ? String(product.currentStock) : '0');
    setEditedMinStock(product.minStock !== undefined ? String(product.minStock) : '0');
    setEditedDescription(product.description || '');
    setEditedLocation(product.location || '');
    setEditedMaterial(product.material || '');
    setEditedDimensions(product.dimensions || '');
    setEditedImageUrl(product.imageUrl || '');
    setEditedColorsText(productColors.join(', '));
    setEditedImagesText(productImages.join(', '));
  };

  // Swatches helper
  const getColorHexClass = (colorName: string): string => {
    const name = colorName.toLowerCase();
    if (name.includes('preto')) return 'bg-[#1A1A1A] text-white';
    if (name.includes('branco')) return 'bg-white text-slate-800 border border-slate-300';
    if (name.includes('cinza') || name.includes('grafite') || name.includes('chumbo')) return 'bg-[#4B5563] text-white';
    if (name.includes('mel') || name.includes('carvalho') || name.includes('cedro')) return 'bg-[#E5A93D] text-white';
    if (name.includes('imbuia') || name.includes('nogueira') || name.includes('freijó') || name.includes('madeira') || name.includes('amêndoa') || name.includes('noce')) return 'bg-[#814C1D] text-[#FFF5EB]';
    if (name.includes('azul')) return 'bg-[#1E3A8A] text-white';
    if (name.includes('verde')) return 'bg-[#14532D] text-white';
    if (name.includes('bege') || name.includes('creme') || name.includes('off')) return 'bg-[#F5E6D3] text-stone-800 border border-stone-250';
    return 'bg-blue-300 text-blue-900 border border-blue-200';
  };

  // Newsletter subscription
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterName.trim() && newsletterEmail.trim()) {
      setNewsletterStatus('success');
      setTimeout(() => {
        setNewsletterStatus('idle');
        setNewsletterName('');
        setNewsletterEmail('');
      }, 5000);
    }
  };

  const safeArray = (val: unknown): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  // Carousel banner loops
  const nextSlide = () => {
    setActiveCarousel((prev) => (prev + 1) % IMAGES.carousel.length);
  };
  const prevSlide = () => {
    setActiveCarousel((prev) => (prev - 1 + IMAGES.carousel.length) % IMAGES.carousel.length);
  };

  // Brand logos scrolling helper
  const scrollBrands = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      setCurrentBrandIndex((prev) => (prev - 1 + BRAND_LOGOS.length) % BRAND_LOGOS.length);
    } else {
      setCurrentBrandIndex((prev) => (prev + 1) % BRAND_LOGOS.length);
    }
  };

  // Cart functions
  const addToCart = (product: Product) => {
    const existing = cartItems.find(item => item.product.id === product.id);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.cartId === existing.cartId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      setShowroomSuccessMsg(`Quantidade de "${product.name}" atualizada no carrinho!`);
    } else {
      const newItem: CartItem = {
        cartId: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        product,
        quantity: 1,
        deliveryType: 'RETIRADA',
        needsAssembly: true,
        shippingValue: 0,
        paymentMethod: ''
      };
      setCartItems([...cartItems, newItem]);
      setShowroomSuccessMsg(`"${product.name}" adicionado ao carrinho!`);
    }
    setTimeout(() => setShowroomSuccessMsg(null), 3000);
    setIsCartOpen(true);
  };

  const removeFromCart = (cartId: string) => {
    setCartItems(cartItems.filter(item => item.cartId !== cartId));
  };

  const updateCartItemQuantity = (cartId: string, quantity: number) => {
    if (quantity < 1) return;
    setCartItems(cartItems.map(item => 
      item.cartId === cartId ? { ...item, quantity } : item
    ));
  };

  const updateCartItemDelivery = (cartId: string, deliveryType: 'RETIRADA' | 'ENVIAR') => {
    setCartItems(cartItems.map(item => 
      item.cartId === cartId ? { ...item, deliveryType, shippingValue: deliveryType === 'RETIRADA' ? 0 : item.shippingValue } : item
    ));
  };

  const updateCartItemAssembly = (cartId: string, needsAssembly: boolean) => {
    setCartItems(cartItems.map(item => 
      item.cartId === cartId ? { ...item, needsAssembly } : item
    ));
  };

  const updateCartItemShipping = (cartId: string, shippingValue: number) => {
    setCartItems(cartItems.map(item => 
      item.cartId === cartId ? { ...item, shippingValue } : item
    ));
  };

  const updateCartItemPaymentMethod = (cartId: string, paymentMethod: string) => {
    setCartItems(cartItems.map(item => 
      item.cartId === cartId ? { ...item, paymentMethod, installments: (paymentMethod === 'CARTAO' || paymentMethod === 'CARTAO_X') ? (item.installments || 1) : undefined } : item
    ));
  };

  const updateCartItemInstallments = (cartId: string, installments: number) => {
    setCartItems(cartItems.map(item => 
      item.cartId === cartId ? { ...item, installments } : item
    ));
  };

  const applyPaymentMethodToAll = (paymentMethod: string) => {
    setCartItems(cartItems.map(item => ({ ...item, paymentMethod, installments: (paymentMethod === 'CARTAO' || paymentMethod === 'CARTAO_X') ? (item.installments || 1) : undefined })));
  };

  const getCartItemPrice = (item: CartItem) => {
    let finalPrice = item.product.price;
    if ((item.paymentMethod === 'CARTAO' || item.paymentMethod === 'CARTAO_X') && item.installments && item.installments > 10) {
      finalPrice = item.product.price * Math.pow(1.015, item.installments);
    }
    return finalPrice;
  };

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (getCartItemPrice(item) * item.quantity), 0);
  }, [cartItems]);

  const cartAssemblyTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      if (item.needsAssembly) {
        const pct = item.product.assemblyPercent || 0;
        return sum + (item.product.price * (pct / 100) * item.quantity);
      }
      return sum;
    }, 0);
  }, [cartItems]);

  const cartTotalWithShipping = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const basePrice = item.product.price * item.quantity;
      const shipping = item.deliveryType === 'ENVIAR' ? item.shippingValue : 0;
      const assembly = item.needsAssembly ? (item.product.price * ((item.product.assemblyPercent || 0) / 100) * item.quantity) : 0;
      return sum + basePrice + shipping + assembly;
    }, 0);
  }, [cartItems]);

  const getPaymentMethodLabel = (method: string): string => {
    const labels: Record<string, string> = { 'DINHEIRO': 'Dinheiro', 'PIX': 'PIX', 'CARTAO': 'Cartão', 'CARTAO_X': 'Cartão Parcelado', 'CREDIARIO': 'Crediário', 'CENTRAL': 'Orçamento', 'ALTERDATA': 'Fechamento' };
    return labels[method] || method;
  };

  const shareCartWhatsApp = async () => {
    if (cartItems.length === 0) return;
    
    const targetNum = customization.whatsappLink || "5573999392585";
    let text = `*🛒 CENTRAL MÓVEIS - Carrinho de Compras*\n\n`;
    
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      const finalItemPrice = getCartItemPrice(item);
      const price = (finalItemPrice * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const unitPrice = finalItemPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      text += `*${i + 1}. ${item.product.name}*\n`;
      text += `   SKU: ${item.product.sku}\n`;
      text += `   Qtd: ${item.quantity} x ${unitPrice} = ${price}\n`;
      text += `   🚚 ${item.deliveryType === 'RETIRADA' ? 'Retirada na Loja' : 'Entrega'}\n`;
      if (item.deliveryType === 'ENVIAR' && item.shippingValue > 0) {
        text += `   📦 Frete: R$ ${item.shippingValue.toFixed(2)}\n`;
      }
      text += `   🔧 ${item.needsAssembly ? 'Com Montagem' : 'Sem Montagem'}\n`;
      if (item.paymentMethod) {
        let pmText = getPaymentMethodLabel(item.paymentMethod);
        if ((item.paymentMethod === 'CARTAO' || item.paymentMethod === 'CARTAO_X') && item.installments) {
          pmText += ` em ${item.installments}x`;
          if (item.installments > 10) pmText += ' (com juros)';
          else pmText += ' (sem juros)';
        }
        text += `   💳 ${pmText}\n`;
      }
      if (i < cartItems.length - 1) text += `\n`;
    }
    
    text += `\n━━━━━━━━━━━━━━━━━━\n`;
    text += `*💰 Total: ${cartTotalWithShipping.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*\n`;
    text += `━━━━━━━━━━━━━━━━━━\n\n`;
    text += `🛋️ *Central Móveis* - É pra sua casa, tem aqui! 💙`;
    
    window.open(`https://api.whatsapp.com/send?phone=${targetNum}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen text-slate-700 select-none pb-12 animate-fade-in" id="showroom-ecommerce-root">
      
      {/* Floating Success Alert Toast */}
      {showroomSuccessMsg && (
        <div className="fixed top-6 right-6 z-[999] bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xl border border-emerald-500 flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-100" />
          <span>{showroomSuccessMsg}</span>
        </div>
      )}

      {/* ERP PREVIEW HEADER BANNER */}
      {onBackToErp && (
        <ErpPreviewBanner
          userRole={userRole}
          visualEditMode={visualEditMode}
          cartMode={cartMode}
          salesMode={salesMode}
          cartItemCount={cartItems.length}
          orderExpirationMinutes={customization.orderExpirationMinutes}
          onToggleSalesMode={() => {
            setSalesMode(!salesMode);
            if (visualEditMode) setVisualEditMode(false);
            if (cartMode) setCartMode(false);
          }}
          onToggleCartMode={() => {
            setCartMode(!cartMode);
            if (salesMode) setSalesMode(false);
            if (visualEditMode) setVisualEditMode(false);
          }}
          onToggleVisualEditMode={() => {
            setVisualEditMode(!visualEditMode);
            if (salesMode) setSalesMode(false);
            if (cartMode) setCartMode(false);
          }}
          onResetLayout={() => {
            if (confirm("Tem certeza que deseja redefinir todas as imagens e textos do showroom para o padrão original?")) {
              setCustomization(DEFAULT_CUSTOMIZATION);
              localStorage.removeItem('centralsync_showroom_customization');
              setShowroomSuccessMsg("Customizações redefinidas!");
              setTimeout(() => setShowroomSuccessMsg(null), 3000);
            }
          }}
          onChangeOrderExpirationMinutes={(val) => {
            setCustomization({ ...customization, orderExpirationMinutes: val });
            localStorage.setItem('centralsync_showroom_customization', JSON.stringify({ ...customization, orderExpirationMinutes: val }));
          }}
          onClickCadastrarNovoMovel={() => {
            setNewSku(`M-${Math.floor(1000 + Math.random() * 9000)}`);
            setNewName('');
            setNewCategory(categories[0]?.name || 'Sala de Estar');
            setNewPrice('0');
            setNewCostPrice('0');
            setNewCurrentStock('1');
            setNewMinStock('1');
            setNewDescription('');
            setNewLocation('Showroom');
            setNewMaterial('');
            setNewDimensions('');
            setNewImageUrl('');
            setNewColorsText('');
            setNewImagesText('');
            setShowAddProductModal(true);
          }}
          onBackToErp={onBackToErp}
        />
      )}

      {/* 1. TOP BAR FEATURES */}
      <TopBarFeatures
        topBarTexts={customization.topBarTexts}
        onChangeTopBarText={(index, val) => {
          const arr = [...customization.topBarTexts];
          arr[index] = val;
          updateCustomization('topBarTexts', arr);
        }}
        visualEditMode={visualEditMode}
      />

      {/* 2. MOCK SHOP HEADER & SEARCH BAR */}
      <ShowroomHeader
        customization={customization}
        visualEditMode={visualEditMode}
        onTriggerImageEdit={(key, title) => triggerImageEdit(key, title)}
        onUpdateCustomization={updateCustomization}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        cartItemCount={cartItems.length}
        favoritesCount={favorites.length}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* 3. E-COMMERCE NAVIGATION BAR / QUICK CATEGORIES SELECTOR */}
      <CategoryNav selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      {/* MAIN CONTAINER */}
      <ProductCatalogSection
        selectedCategory={selectedCategory}
        filteredProducts={filteredProducts}
        favorites={favorites}
        salesMode={salesMode}
        userRole={userRole}
        onToggleFavorite={toggleFavorite}
        onSelectForPresentation={selectForPresentation}
        onAddToCart={addToCart}
        onSelectForSale={(p) => {
          setSelectedSalesProduct(p);
          setClientName('');
          setClientPhone('');
          setSalesErrors({});
        }}
      />

      {/* E-COMMERCE FOOTER (MINIMALIST) */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-8 px-4 font-sans text-xs text-slate-400 text-center">
        <div className="max-w-7xl mx-auto space-y-2">
          <p>© 2026 Central Móveis Showroom - Todos os direitos reservados. Av. Cinquentenário, Itabuna - BA, CEP 45600-006</p>
          <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest">SE É PRA SUA CASA, TEM AQUI! 💙 • Entrega e montagem grátis para Itabuna</p>
        </div>
      </footer>


      {/* DETAILED ACTIVE COMPONENT DRAWER / SPEC SIMULATOR MODAL */}
      {presentationProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-sans" id="showroom-modal">
          <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-400 animate-pulse" />
                <span className="font-bold text-sm tracking-wide text-white">
                  {isEditingProduct ? `Editando: ${presentationProduct.name}` : 'Visualizador Técnico & Simulação de Showroom'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'vendedor' && !isEditingProduct && (
                  <>
                    <button
                      onClick={() => setIsEditingProduct(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] uppercase tracking-wider font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                      title="Editar este móvel"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Móvel</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowroomProductToDelete(presentationProduct);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] uppercase tracking-wider font-extrabold rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                      title="Excluir do Showroom"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => {
                    setPresentationProduct(null);
                    setIsEditingProduct(false);
                  }}
                  className="p-1 px-3 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  ✕ Fechar
                </button>
              </div>
            </div>

            {isEditingProduct ? (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!presentationProduct) return;
                  
                  const updated: Product = {
                    ...presentationProduct,
                    sku: editedSku,
                    name: editedName,
                    category: editedCategory,
                    price: parseFloat(editedPrice) || 0,
                    costPrice: parseFloat(editedCostPrice) || 0,
                    currentStock: parseInt(editedCurrentStock) || 0,
                    minStock: parseInt(editedMinStock) || 0,
                    description: editedDescription,
                    location: editedLocation,
                    material: editedMaterial,
                    dimensions: editedDimensions,
                    imageUrl: editedImageUrl,
                    colors: editedColorsText.split(',').map(s => s.trim()).filter(Boolean),
                    images: editedImagesText.split(',').map(s => s.trim()).filter(Boolean)
                  };

                  if (onUpdateProduct) {
                    await onUpdateProduct(updated);
                  }
                  
                  setPresentationProduct(updated);
                  setIsEditingProduct(false);
                  setShowroomSuccessMsg("Produto atualizado com sucesso!");
                  setTimeout(() => setShowroomSuccessMsg(null), 3500);
                }} 
                className="p-6 space-y-4 overflow-y-auto bg-white relative max-h-[75vh]"
              >
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 mb-2">
                  <h4 className="text-blue-800 font-bold text-xs flex items-center gap-1">
                    <Palette className="w-4 h-4 text-blue-650" /> Área de Edição Comercial do Showroom
                  </h4>
                  <p className="text-slate-500 text-[11px] font-medium leading-relaxed">Você está modificando a ficha técnica do produto em tempo real. Todas as alterações serão refletidas no e-commerce de monstruário instantaneamente.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Nome do Móvel *</label>
                    <input
                      type="text"
                      required
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    />
                  </div>
                  {/* SKU field */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">SKU / Referência *</label>
                    <input
                      type="text"
                      required
                      value={editedSku}
                      onChange={(e) => setEditedSku(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category select dropdown */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Categoria *</label>
                    <select
                      required
                      value={editedCategory}
                      onChange={(e) => setEditedCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    >
                      <option value="">Selecione...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Sale Price (price) */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Preço de Venda (BRL) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={editedPrice}
                      onChange={(e) => setEditedPrice(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cost Price */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Preço de Custo (BRL)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editedCostPrice}
                      onChange={(e) => setEditedCostPrice(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    />
                  </div>
                  {/* Minimum Stock */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Estoque Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={editedMinStock}
                      onChange={(e) => setEditedMinStock(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-55 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Current physical stock */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Estoque Atual *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editedCurrentStock}
                      onChange={(e) => setEditedCurrentStock(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    />
                  </div>
                  {/* Physical location */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Localização Física</label>
                    <input
                      type="text"
                      placeholder="Ex: Corredor A, Prateleira 2"
                      value={editedLocation}
                      onChange={(e) => setEditedLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Material */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Material Principal</label>
                    <input
                      type="text"
                      placeholder="Ex: MDF, Madeira Maciça"
                      value={editedMaterial}
                      onChange={(e) => setEditedMaterial(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    />
                  </div>
                  {/* Dimensions */}
                  <div className="space-y-1 text-left">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Dimensões Técnicas</label>
                    <input
                      type="text"
                      placeholder="Ex: 120 x 60 x 75 cm"
                      value={editedDimensions}
                      onChange={(e) => setEditedDimensions(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                    />
                  </div>
                </div>

                {/* Image URL with live preview option */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">URL da Imagem do Móvel</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... ou link direto da foto"
                    value={editedImageUrl}
                    onChange={(e) => setEditedImageUrl(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                  />
                  
                  {/* File Upload for Main Image */}
                  <div className="mt-1.5 flex items-center gap-2">
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
                              setEditedImageUrl(url);
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
                    {editedImageUrl && !uploadingMainEdit && (
                      <span className="text-[10px] text-emerald-600 font-medium">✓ Foto enviada com sucesso</span>
                    )}
                  </div>
                </div>

                {/* Secondary Images URLs in Showroom View */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Outras Fotos / Galeria (Separadas por vírgula)</label>
                  <textarea
                    placeholder="https://imagem1.jpg, https://imagem2.jpg"
                    value={editedImagesText}
                    onChange={(e) => setEditedImagesText(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                  />
                  
                  {/* File Upload for Gallery */}
                  <div className="mt-1.5 flex items-center gap-2">
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
                              setEditedImagesText(prev => {
                                const current = prev ? prev.split(',').map(i => i.trim()).filter(Boolean) : [];
                                return [...current, ...urls].join(', ');
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
                </div>

                {/* Available colors */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Cores Disponíveis (Separadas por vírgula)</label>
                  <input
                    type="text"
                    placeholder="Branco, Preto, Mel, Amêndoa"
                    value={editedColorsText}
                    onChange={(e) => setEditedColorsText(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                  />
                  <p className="text-[10px] text-slate-455 text-slate-400 font-medium font-sans">Forneça as paletas separadas por vírgulas para habilitar a alteração interativa de acabamento no showroom.</p>
                </div>

                {/* Description and specifications */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Descrição / Notas Comerciais</label>
                  <textarea
                    rows={3}
                    placeholder="Móvel requintado ideal para salas de jantar ou estar decoradas..."
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-blue-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold shadow-xs transition-all"
                  />
                </div>

                {/* Action footer inside edit form */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-150 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditingProduct(false)}
                    className="px-4 py-2 bg-slate-105 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Voltar ao Visualizador
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingMainEdit || uploadingGalleryEdit}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span>{uploadingMainEdit || uploadingGalleryEdit ? 'Enviando Imagens...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </form>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0 overflow-y-auto">
              
              {/* Product Visual side */}
              <div className="md:col-span-5 bg-slate-50 p-6 flex flex-col justify-between border-r border-slate-100">
                <div className="space-y-4">
                  {(() => {
                    const imagesArray = safeArray(presentationProduct.images);
                    const allProductImages = Array.from(
                      new Set([
                        presentationProduct.imageUrl,
                        ...imagesArray
                      ])
                    ).filter(Boolean) as string[];

                    const displayImg = activeDetailImageUrl || (allProductImages.length > 0 ? allProductImages[0] : '');

                    return (
                      <div className="space-y-3">
                        {displayImg ? (
                          <div className="relative rounded-xl overflow-hidden aspect-video md:aspect-square bg-white border border-slate-200 shadow-inner p-4 flex items-center justify-center group cursor-pointer"
                            onClick={() => setFullscreenImage(displayImg)}
                          >
                            <img 
                              src={displayImg} 
                              alt={presentationProduct.name}
                              referrerPolicy="no-referrer"
                              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                                <Maximize2 className="w-3.5 h-3.5" />
                                Ver em tela cheia
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl aspect-square bg-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5">
                            <ImageIcon className="w-10 h-10 mb-1" />
                            <span>Sem imagem cadastrada</span>
                          </div>
                        )}

                        {/* Thumbnail Row */}
                        {allProductImages.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-slate-350">
                            {allProductImages.map((imgUrl, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveDetailImageUrl(imgUrl)}
                                className={`w-10 h-10 rounded-lg border-2 overflow-hidden flex items-center justify-center shrink-0 transition-all ${activeDetailImageUrl === imgUrl ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300'}`}
                              >
                                <img src={imgUrl} className="w-full h-full object-contain bg-white" alt={`Preview ${idx + 1}`} referrerPolicy="no-referrer" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Technical description */}
                  <div className="space-y-2 pt-1 text-left">
                    <span className="inline-block bg-slate-200 text-slate-700 text-[9px] font-extrabold uppercase py-0.5 px-2.5 rounded tracking-wider">
                      Ref: {presentationProduct.sku}
                    </span>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {presentationProduct.name}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {presentationProduct.description || "Móvel de alto conforto para complementação de layouts planejados ou sob medida no showroom comercial."}
                    </p>
                  </div>
                </div>

                {/* Stock levels and availability tags */}
                <div className="mt-8 pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Estoque Showroom:</span>
                    {presentationProduct.currentStock > 0 ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                        {presentationProduct.currentStock} {presentationProduct.unit || 'UN'} pronta entrega
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                        Somente sob encomenda
                      </span>
                    )}
                  </div>
                  {presentationProduct.location && (
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Localização física:</span>
                      <strong className="font-bold text-slate-600">{presentationProduct.location}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Customization side */}
              <div className="md:col-span-7 p-6 space-y-6">
                
                {/* 1. Finishes / Colors Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 text-left">
                    <Palette className="w-4 h-4 text-blue-600" /> Cores & Acabamentos do Showroom
                  </h4>
                  
                  {(() => {
                    const colors = safeArray(presentationProduct.colors);
                    if (colors.length === 0) {
                      return (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-150 text-slate-500 text-xs leading-normal text-left">
                          Ambiente sem paletas de cores múltiplas cadastradas. Consulte a equipe comercial para personalizações.
    </div>
  );
}
                    return (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-400 text-left">Marque a variação correspondente ao interesse do cliente:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {colors.map(color => {
                            const isSelected = presentationColor === color;
                            const swatchClass = getColorHexClass(color);
                            return (
                              <button
                                key={color}
                                type="button"
                                onClick={() => setPresentationColor(color)}
                                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all text-left border cursor-pointer ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
                              >
                                <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${swatchClass}`} />
                                <span className="truncate">{color}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Specs details */}
                <div className="grid grid-cols-3 gap-4 py-3 border-y border-slate-100 text-left">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Material</span>
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5 inline-block truncate max-w-full" title={presentationProduct.material}>
                      {presentationProduct.material || "Padrão"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Dimensões</span>
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5 inline-block truncate max-w-full" title={presentationProduct.dimensions}>
                      {presentationProduct.dimensions || "Padrão"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold">Unidade</span>
                    <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                      {presentationProduct.unit || "UN"}
                    </span>
                  </div>
                </div>

                {/* 3. SIMULATOR OF TERMS */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider block">Preço de Venda Showroom</span>
                      <span className="text-xl font-black text-slate-900">
                        {presentationProduct.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                        <Calculator className="w-4 h-4 text-blue-600" /> Simular Parcelamento na Tela
                      </span>
                      
                      <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 shadow-inner">
                        {[1, 3, 6, 10, 12].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setSimulationTerm(t)}
                            className={`px-2 py-1 text-[10px] font-black rounded transition-all cursor-pointer ${simulationTerm === t ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-50'}`}
                          >
                            {t}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Simulation Result */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-800 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-medium">Condição comercial:</span>
                        <span className="font-extrabold text-slate-900">{simulationTerm} parcela(s)</span>
                      </div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-slate-400 font-bold">Valor da Parcela:</span>
                        <span className="text-base font-black text-blue-600">
                          {((simulationTerm <= 10 ? presentationProduct.price : presentationProduct.price * Math.pow(1.015, simulationTerm)) / simulationTerm).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-400 block leading-tight pt-1">
                        {simulationTerm <= 10 
                          ? "* Simulador sem juros integrado com o intermediador de pagamentos do showroom."
                          : "* Simulação inclui acréscimo de juros operacionais (1.5% a.m.) para parcelamentos acima de 10x."}
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp Destination Selector */}
                  {!salesMode && (
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-800 text-xs space-y-2 text-left mt-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" /> Enviar Mensagem WhatsApp para:
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <select
                          value={whatsappDestType}
                          onChange={(e) => {
                            const type = e.target.value;
                            setWhatsappDestType(type);
                            if (type === 'default') {
                              setWhatsappDestNumber(customization.whatsappLink || "5573999392585");
                            } else if (type === 'custom') {
                              const cleaned = whatsappDestCustomNum.replace(/\D/g, "");
                              setWhatsappDestNumber(cleaned.startsWith("55") ? cleaned : "55" + cleaned);
                            }
                          }}
                          className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="default">Padrão: Central Móveis ({customization.whatsappNumber || "(73) 99939-2585"})</option>
                          <option value="custom">Outro número...</option>
                        </select>

                        {whatsappDestType === 'custom' && (
                          <div className="flex-grow flex gap-2">
                            <input
                              type="text"
                              placeholder="Telefone com DDD (ex: 73999999999)"
                              value={whatsappDestCustomNum}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWhatsappDestCustomNum(val);
                                const cleaned = val.replace(/\D/g, "");
                                setWhatsappDestNumber(cleaned.startsWith("55") ? cleaned : "55" + cleaned);
                              }}
                              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-850 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Selector Button / WhatsApp Purchase */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium">
                    📍 Showroom Central Móveis • Itabuna
                  </span>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setPresentationProduct(null)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition-colors text-center"
                    >
                      Voltar ao catálogo
                    </button>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        if (salesMode) {
                          setSelectedSalesProduct(presentationProduct);
                          setClientName('');
                          setClientPhone('');
                          setSalesErrors({});
                        } else {
                          const targetNum = (whatsappDestType === 'custom' && whatsappDestNumber)
                            ? whatsappDestNumber
                            : (customization.whatsappLink || "5573999392585");
                          const price = presentationProduct.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                          const finalSimPrice = simulationTerm <= 10 ? presentationProduct.price : presentationProduct.price * Math.pow(1.015, simulationTerm);
                          const installment = (finalSimPrice / simulationTerm).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                          // Pick best available image URL then try to shorten it
                          const rawImageUrl = presentationProduct.imageUrl || safeArray(presentationProduct.images)[0] || '';
                          const photoUrl = rawImageUrl ? await shortenUrl(rawImageUrl) : null;
                          let text = `*🌟 CENTRAL MÓVEIS - Showroom Virtual*\n\n`;
                          text += `📦 *Produto:* ${presentationProduct.name}\n`;
                          text += `🔖 *SKU:* ${presentationProduct.sku}\n`;
                          text += `📁 *Categoria:* ${presentationProduct.category}\n`;
                          if (presentationColor) text += `🎨 *Cor:* ${presentationColor}\n`;
                          text += `💰 *Preço:* ${price}\n`;
                          text += `💳 *${simulationTerm}x de ${installment}* ${simulationTerm <= 10 ? 'sem juros' : 'com juros'} no cartão\n`;
                          // Only add photo link when shortening succeeded (never send long Firebase URLs — they break WhatsApp preview)
                          if (photoUrl) text += `\n📸 *Veja a foto:* ${photoUrl}`;
                          text += `\n\n_🏡 É pra sua casa, tem aqui!_\nGostaria de agendar a entrega e montagem gratuita para Itabuna. Como podemos concluir? 💙`;
                          
                          window.open(`https://api.whatsapp.com/send?phone=${targetNum}&text=${encodeURIComponent(text)}`, '_blank');
                          setPresentationProduct(null);
                        }
                      }}
                      className="flex-grow sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 transform active:scale-95 animate-pulse"
                    >
                      <span>{salesMode ? (userRole === 'vendedor' ? "📋 Enviar Proposta" : "🛒 Comprar Produto") : "💬 Comprar pelo WhatsApp"}</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
            )}

          </div>
        </div>
      )}

      {/* 1. BRAND NEW PRODUCT CREATION MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-sans" id="showroom-create-modal">
          <div className="bg-white rounded-2xl shadow-2xl border border-emerald-105 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-emerald-900 p-4 text-white flex justify-between items-center shrink-0 border-b border-emerald-800">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm tracking-wide text-white">Cadastrar Novo Produto para o Showroom</span>
              </div>
              <button 
                onClick={() => setShowAddProductModal(false)}
                className="p-1 px-3 rounded-lg hover:bg-white/10 text-emerald-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Form Body */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newName.trim()) return;

                const newProd: Omit<Product, 'id' | 'createdAt'> = {
                  sku: newSku,
                  name: newName,
                  category: newCategory || (categories[0]?.name || 'Sala de Estar'),
                  price: parseFloat(newPrice) || 0,
                  costPrice: parseFloat(newCostPrice) || 0,
                  currentStock: parseInt(newCurrentStock) || 0,
                  minStock: parseInt(newMinStock) || 0,
                  description: newDescription,
                  location: newLocation || 'Showroom',
                  material: newMaterial,
                  dimensions: newDimensions,
                  imageUrl: newImageUrl,
                  colors: newColorsText.split(',').map(s => s.trim()).filter(Boolean),
                  images: newImagesText.split(',').map(s => s.trim()).filter(Boolean)
                };

                if (onAddProduct) {
                  await onAddProduct(newProd);
                }

                setShowAddProductModal(false);
                setShowroomSuccessMsg("Novo móvel cadastrado no showroom!");
                setTimeout(() => setShowroomSuccessMsg(null), 3500);
              }}
              className="p-6 space-y-4 overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Nome do Móvel *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cadeira de Jantar Provence"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  />
                </div>
                {/* SKU */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">SKU / Referência *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CAD-PROV"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category select dropdown */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Categoria *</label>
                  <select
                    required
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Sale Price */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Preço de Venda (BRL) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="999.90"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cost Price */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Preço de Custo (BRL)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="450.00"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  />
                </div>
                {/* Minimum Stock */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Estoque Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Current physical stock */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Estoque Atual *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newCurrentStock}
                    onChange={(e) => setNewCurrentStock(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  />
                </div>
                {/* Physical location */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Localização Física</label>
                  <input
                    type="text"
                    placeholder="Ex: Showroom"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Material */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Material Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: MDF, Madeira Maciça, Chenille"
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  />
                </div>
                {/* Dimensions */}
                <div className="space-y-1 text-left">
                  <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Dimensões Técnicas</label>
                  <input
                    type="text"
                    placeholder="Ex: 80 x 60 x 75 cm"
                    value={newDimensions}
                    onChange={(e) => setNewDimensions(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-1 text-left">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">URL da Imagem para Exibição</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... ou link direto da foto do móvel"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                />
                
                {/* File Upload for Main Image */}
                <div className="mt-1.5 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 cursor-pointer transition-colors">
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
                            setNewImageUrl(url);
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
                  {newImageUrl && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Foto enviada com sucesso</span>
                  )}
                </div>
              </div>

              {/* Secondary Images URLs in Showroom Add View */}
              <div className="space-y-1 text-left">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Outras Fotos / Galeria (Separadas por vírgula)</label>
                <textarea
                  placeholder="https://imagem1.jpg, https://imagem2.jpg"
                  value={newImagesText}
                  onChange={(e) => setNewImagesText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                />
                
                {/* File Upload for Gallery */}
                <div className="mt-1.5 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 cursor-pointer transition-colors">
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
                            setNewImagesText(prev => {
                              const current = prev ? prev.split(',').map(i => i.trim()).filter(Boolean) : [];
                              return [...current, ...urls].join(', ');
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
              </div>

              {/* Color swatches */}
              <div className="space-y-1 text-left">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Cores / Variações (Separadas por vírgula)</label>
                <input
                  type="text"
                  placeholder="Branco, Preto, Mel, Imbuia, Cinza"
                  value={newColorsText}
                  onChange={(e) => setNewColorsText(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                />
                <p className="text-[10px] text-slate-400 font-medium font-sans">Cadastre as paletas separadas por vírgulas para que os vendedores possam alternar na simulação em tempo de atendimento.</p>
              </div>

              {/* Description etc */}
              <div className="space-y-1 text-left">
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Descrição / Notas Gerais</label>
                <textarea
                  rows={3}
                  placeholder="Móvel de altíssima qualidade sob indicação de designers..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 focus:ring-1 focus:ring-emerald-500 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold transition-all shadow-xs"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingMainNew || uploadingGalleryNew}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-md font-sans uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>{uploadingMainNew || uploadingGalleryNew ? 'Enviando Imagens...' : 'Concluir Cadastro'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 2. DELETE CONFIRMATION DIALOG MODAL */}
      {showroomProductToDelete && (
        <DeleteConfirmationModal
          product={showroomProductToDelete}
          onCancel={() => setShowroomProductToDelete(null)}
          onConfirm={async () => {
            if (onDeleteProduct) {
              await onDeleteProduct(showroomProductToDelete.id);
            }
            setShowroomProductToDelete(null);
            setPresentationProduct(null); // Close the details views
            setIsEditingProduct(false);   // Reset editing
            setShowroomSuccessMsg("Móvel excluído do showroom com sucesso.");
            setTimeout(() => setShowroomSuccessMsg(null), 3500);
          }}
        />
      )}

      {/* 2.5. CUSTOMER IDENTIFICATION MODAL FOR SALES FLOW */}
      {selectedSalesProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-sans" id="showroom-sales-modal">
          {createdSale ? (
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 max-w-md w-full overflow-hidden p-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-650 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-8 h-8 stroke-[3] text-emerald-600" />
              </div>

              <div className="space-y-1.5 text-center">
                <h3 className="text-lg font-black text-slate-900 font-display">
                  {createdSale.status === 'PENDING' ? 'Proposta Criada!' : 'Pedido Confirmado!'}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {createdSale.status === 'PENDING' ? (
                    <>
                      A proposta comercial do item <strong className="text-slate-800 font-bold">{createdSale.productName}</strong> no valor de <strong className="text-slate-900 font-bold">{createdSale.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> foi registrada como orçamento com sucesso.
                    </>
                  ) : (
                    <>
                      A venda do item <strong className="text-slate-800 font-bold">{createdSale.productName}</strong> no valor de <strong className="text-slate-900 font-bold">{createdSale.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> foi registrada com sucesso.
                    </>
                  )}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs text-left text-slate-655 font-mono">
                <div className="flex justify-between">
                  <span>ID {createdSale.status === 'PENDING' ? 'Orçamento' : 'Pedido'}:</span>
                  <span className="font-bold text-slate-800 break-all select-all">{createdSale.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-bold text-slate-800">{createdSale.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>WhatsApp:</span>
                  <span className="font-bold text-slate-800">{createdSale.clientPhone}</span>
                </div>
                {createdSale.status === 'PENDING' && createdSale.expiresAt && (
                  <ExpirationTimer expiresAt={createdSale.expiresAt} />
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                {onPrintSale && (
                  <button
                    type="button"
                    onClick={() => {
                      onPrintSale(createdSale);
                    }}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-white" />
                    <span>{createdSale.status === 'PENDING' ? 'Imprimir Proposta / Orçamento' : 'Imprimir Recibo de Pedido'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    const cleanPhone = createdSale.clientPhone.replace(/\D/g, "");
                    let whatsappNum = cleanPhone;
                    if ((whatsappNum.length === 10 || whatsappNum.length === 11) && !whatsappNum.startsWith("55")) {
                      whatsappNum = "55" + whatsappNum;
                    }
                    
                    const labelType = createdSale.status === 'PENDING' ? 'Proposta Comercial' : 'Venda Confirmada';
                    const statusText = createdSale.status === 'PENDING' ? 'Aguardando Aprovação' : '✅ Faturado / A entregar';
                    const valueStr = createdSale.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    const photoUrl = createdSale.productImageUrl ? await shortenUrl(createdSale.productImageUrl) : null;
                    
                    let text = `Olá *${createdSale.clientName.trim()}*! 🙋\n\n`;
                    text += `Segue o resumo da sua *${labelType}* na *Central Móveis*:\n\n`;
                    text += `━━━━━━━━━━━━━━━━━━\n`;
                    text += `📦 *Produto:* ${createdSale.productName}\n`;
                    text += `🔖 *SKU:* ${createdSale.productSku}\n`;
                    text += `💰 *Valor:* R$ ${valueStr}\n`;
                    text += `📌 *Status:* ${statusText}\n`;
                    if (selectedSalesProduct?.material) text += `🪵 *Material:* ${selectedSalesProduct.material}\n`;
                    if (selectedSalesProduct?.dimensions) text += `📐 *Dimensões:* ${selectedSalesProduct.dimensions}\n`;
                    if (selectedSalesProduct?.description) text += `📝 *Descrição:* ${selectedSalesProduct.description}\n`;
                    if (photoUrl) text += `📸 *Foto:* ${photoUrl}\n`;
                    text += `━━━━━━━━━━━━━━━━━━\n\n`;
                    text += `Agradecemos a preferência! Estamos à disposição para qualquer dúvida. 😊`;
                    
                    window.open(`https://api.whatsapp.com/send?phone=${whatsappNum}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>{createdSale.status === 'PENDING' ? 'Reenviar Proposta (WhatsApp)' : 'Enviar por WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSalesProduct(null);
                    setCreatedSale(null);
                    setClientName('');
                    setClientPhone('');
                    setSalesErrors({});
                    setSelectedSellerId('');
                  }}
                  className="w-full py-2 px-4 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {createdSale.status === 'PENDING' ? 'Concluir / Nova Proposta' : 'Concluir / Nova Venda'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 max-w-lg w-full overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 font-display">
                  <ShoppingBag className="w-4 h-4 text-indigo-600" />
                  <span>{salesType === 'PENDING' ? 'Identificação do Cliente & Enviar Proposta' : 'Identificação do Cliente & Faturamento'}</span>
                </h3>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedSalesProduct(null);
                    setCreatedSale(null);
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
                    setSalesErrors({});
                    setDeliveryType('RETIRADA');
                    setShippingValue(0);
                    setFreightInput('');
                  }}
                  className="text-slate-400 hover:text-slate-900 font-extrabold text-sm transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Product Summary */}
              <div className="bg-indigo-50/50 border border-indigo-100/40 p-3 rounded-xl flex items-center gap-3 shrink-0">
                {selectedSalesProduct.imageUrl ? (
                  <img src={selectedSalesProduct.imageUrl} className="w-12 h-12 object-contain bg-white rounded-lg border p-1" alt={selectedSalesProduct.name} />
                ) : (
                  <div className="w-12 h-12 bg-white rounded-lg border flex items-center justify-center text-indigo-300">
                    <Palette className="w-6 h-6" />
                  </div>
                )}
                <div className="text-left">
                  <span className="text-[9px] font-extrabold text-indigo-650 uppercase tracking-wider block">{selectedSalesProduct.category}</span>
                  <span className="font-bold text-xs text-slate-800 line-clamp-1">{selectedSalesProduct.name}</span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5">
                    {selectedSalesProduct.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              {/* Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  // Form validation
                  const errors: Record<string, string> = {};
                  if (!clientName.trim()) {
                    errors.name = "O nome do cliente é obrigatório.";
                  }
                  const cleanPhone = clientPhone.replace(/\D/g, "");
                  if (!clientPhone.trim()) {
                    errors.phone = "O número de telefone é obrigatório.";
                  } else if (cleanPhone.length < 10) {
                    errors.phone = "Por favor, informe um número de telefone com DDD.";
                  }

                  const cleanCPF = clientCpf.replace(/\D/g, "");
                  if (!clientCpf.trim()) {
                    errors.cpf = "O CPF do cliente é obrigatório.";
                  } else {
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

                  if (deliveryType === 'ENVIAR') {
                    if (!clientStreet.trim()) errors.street = "A rua é obrigatória para envio.";
                    if (!clientNumber.trim()) errors.number = "O número é obrigatório.";
                    if (!clientNeighborhood.trim()) errors.neighborhood = "O bairro é obrigatório.";
                    if (!clientCity.trim()) errors.city = "A cidade é obrigatória.";
                    if (!clientState.trim()) errors.state = "O estado (UF) é obrigatório.";
                    if (!clientCep.trim()) errors.cep = "O CEP é obrigatório.";
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
                    if (selectedSellerId) {
                      const foundSeller = sellers?.find(s => s.id === selectedSellerId);
                      if (foundSeller) {
                        finalSellerId = foundSeller.id;
                        finalSellerName = foundSeller.name;
                      } else {
                        errors.seller = "Vendedor selecionado inválido.";
                      }
                    } else if (userRole === 'Proprietário / Adm Geral' || userRole === 'admin' || userRole === 'caixa') {
                      finalSellerId = user?.uid || 'admin';
                      finalSellerName = user?.displayName || 'Administrador';
                    } else {
                      errors.seller = "Você deve atribuir esta venda a um vendedor.";
                    }
                  }

                  if (Object.keys(errors).length > 0) {
                    setSalesErrors(errors);
                    return;
                  }

                  // Verify Seller password
                  const resolvedSeller = sellers?.find(s => s.id === finalSellerId) || currentSeller;
                  if (resolvedSeller && resolvedSeller.password) {
                    const passInput = window.prompt(`Confirmação de Venda: Digite a senha de acesso do vendedor ${resolvedSeller.name}:`);
                    if (passInput === null) return; // User cancelled
                    if (!(await sellerPasswordMatches(passInput, resolvedSeller.password))) {
                      alert("Senha incorreta! A venda não foi efetuada.");
                      return;
                    }
                  }

                  const getCommissionPercent = (cat?: string) => {
                    if (!cat) return 2.5;
                    const c = cat.toLowerCase().trim();
                    return c.includes('eletro') ? 1.2 : 2.5;
                  };

                  const saleId = `sale-${Date.now().toString().slice(-6)}`;
                  const commissionPercent = getCommissionPercent(selectedSalesProduct.category);
                  const commissionValue = (selectedSalesProduct.price * commissionPercent) / 100;
                  
                  const fullAddress = clientStreet.trim() 
                    ? `${clientStreet.trim()}, ${clientNumber.trim()}${clientComplement.trim() ? ` - ${clientComplement.trim()}` : ''} - ${clientNeighborhood.trim()}, ${clientCity.trim()} - ${clientState.trim()}${clientCep.trim() ? ` (CEP: ${clientCep.trim()})` : ''}`
                    : '';

                  const newSale: Sale = {
                    id: saleId,
                    createdAt: new Date().toISOString(),
                    productId: selectedSalesProduct.id,
                    productName: selectedSalesProduct.name,
                    productSku: selectedSalesProduct.sku,
                    productCategory: selectedSalesProduct.category,
                    productImageUrl: selectedSalesProduct.imageUrl || '',
                    value: selectedSalesProduct.price,
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
                    origin: 'Mostruário Vendas',
                    status: salesType,
                    deliveryType: deliveryType,
                    shippingValue: shippingValue,
                    expiresAt: salesType === 'PENDING' ? new Date(Date.now() + (customization.orderExpirationMinutes || 60) * 60 * 1000).toISOString() : undefined
                  };

                  // Auto-save/update customer in CRM database
                  const custId = selectedCustomerId || `cust-${Date.now()}`;
                  saveCustomer({
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
                  }).catch(err => console.error("Erro ao cadastrar cliente:", err));
                  
                  // Create delivery record automatically
                  const deliveryAddress = deliveryType === 'RETIRADA'
                    ? 'Retirada na Loja'
                    : (clientStreet.trim()
                      ? `${clientStreet.trim()}, ${clientNumber.trim()}${clientComplement.trim() ? ` - ${clientComplement.trim()}` : ''} - ${clientNeighborhood.trim()}, ${clientCity.trim()} - ${clientState.trim()}${clientCep.trim() ? ` (CEP: ${clientCep.trim()})` : ''}`
                      : 'Retirada na Loja');

                  const deliveryNotes = deliveryType === 'ENVIAR' && shippingValue > 0
                    ? `Gerado automaticamente a partir do Pedido #${saleId} | Frete: R$ ${shippingValue.toFixed(2)}`
                    : `Gerado automaticamente a partir do Pedido #${saleId}`;

                  if (!navigator.onLine) {
                    // Save to offline queue
                    const offlineSales = JSON.parse(localStorage.getItem('offline_sales') || '[]');
                    const offlineDeliveries = JSON.parse(localStorage.getItem('offline_deliveries') || '[]');
                    
                    const offlineSale = { ...newSale, id: newSale.id || `sale-${Date.now()}` };
                    const offlineDelivery = {
                      id: `del-${Date.now()}`,
                      customerName: clientName.trim(),
                      customerPhone: clientPhone.trim(),
                      delivererName: 'Central Entregas',
                      address: deliveryAddress,
                      itemsDescription: `1x ${selectedSalesProduct.name} (SKU: ${selectedSalesProduct.sku})`,
                      status: 'A_ENTREGAR',
                      scheduledDate: new Date().toISOString().split('T')[0],
                      notes: deliveryNotes,
                      needsAssembly
                    };
                    
                    offlineSales.push(offlineSale);
                    offlineDeliveries.push(offlineDelivery);
                    
                    localStorage.setItem('offline_sales', JSON.stringify(offlineSales));
                    localStorage.setItem('offline_deliveries', JSON.stringify(offlineDeliveries));
                    
                    alert(`[OFFLINE] Venda de ${clientName.trim()} salva localmente no dispositivo. Será sincronizada automaticamente assim que a conexão retornar.`);
                  } else {
                    // Save Sale and log event
                    saveSale(newSale).catch(err => console.error("Erro ao salvar venda no Firestore:", err));
                    try {
                      await saveDelivery({
                        id: `del-${Date.now()}`,
                        customerName: clientName.trim(),
                        customerPhone: clientPhone.trim(),
                        delivererName: 'Central Entregas',
                        address: deliveryAddress,
                        itemsDescription: `1x ${selectedSalesProduct.name} (SKU: ${selectedSalesProduct.sku})`,
                        status: 'A_ENTREGAR',
                        scheduledDate: new Date().toISOString().split('T')[0],
                        notes: deliveryNotes,
                        needsAssembly
                      });
                    } catch (err) {
                      console.error("Erro ao salvar entrega no Firestore:", err);
                    }
                  }

                  // Register stock reduction transaction (ONLY if it is Venda Direta / COMPLETED)
                  if (salesType === 'COMPLETED') {
                    if (onRegisterTransaction) {
                      onRegisterTransaction({
                        productId: selectedSalesProduct.id,
                        productName: selectedSalesProduct.name,
                        type: 'OUT',
                        quantity: 1,
                        reason: 'VENDA',
                        description: `Venda direta via Showroom para ${clientName.trim()}`,
                        value: selectedSalesProduct.price
                      });
                    }
                  }
                  
                  logAuditEvent(
                    salesType === 'COMPLETED' ? "Venda Criada" : "Orçamento Criado", 
                    `${salesType === 'COMPLETED' ? 'Venda' : 'Orçamento'} do produto ${newSale.productName} no valor de R$ ${newSale.value.toFixed(2)} atribuída ao vendedor ${newSale.sellerName} para o cliente ${newSale.clientName}.`
                  ).catch(err => console.error("Erro ao salvar log de auditoria:", err));


                  // Open WhatsApp
                  let whatsappNum = cleanPhone;
                  if ((whatsappNum.length === 10 || whatsappNum.length === 11) && !whatsappNum.startsWith("55")) {
                    whatsappNum = "55" + whatsappNum;
                  }
                  
                  const labelType = salesType === 'COMPLETED' ? 'Venda Confirmada' : 'Proposta Comercial';
                  const statusText = salesType === 'COMPLETED' ? '✅ Faturado / A entregar' : 'Aguardando Aprovação';
                  const valueStr = selectedSalesProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  const photoUrl = selectedSalesProduct.imageUrl ? await shortenUrl(selectedSalesProduct.imageUrl) : null;
                  
                  let text = `Olá *${clientName.trim()}*! 🙋\n\n`;
                  text += `Segue o resumo da sua *${labelType}* na *Central Móveis*:\n\n`;
                  text += `━━━━━━━━━━━━━━━━━━\n`;
                  text += `📦 *Produto:* ${selectedSalesProduct.name}\n`;
                  text += `🔖 *SKU:* ${selectedSalesProduct.sku}\n`;
                  text += `💰 *Valor:* R$ ${valueStr}\n`;
                  text += `📌 *Status:* ${statusText}\n`;
                  if (selectedSalesProduct.material) text += `🪵 *Material:* ${selectedSalesProduct.material}\n`;
                  if (selectedSalesProduct.dimensions) text += `📐 *Dimensões:* ${selectedSalesProduct.dimensions}\n`;
                  if (selectedSalesProduct.description) text += `📝 *Descrição:* ${selectedSalesProduct.description}\n`;
                  if (photoUrl) text += `📸 *Foto:* ${photoUrl}\n`;
                  text += `━━━━━━━━━━━━━━━━━━\n\n`;
                  text += `Agradecemos a preferência! Estamos à disposição para qualquer dúvida. 😊`;
                  
                  window.open(`https://api.whatsapp.com/send?phone=${whatsappNum}&text=${encodeURIComponent(text)}`, '_blank');
                  
                  setCreatedSale(newSale);

                  // Reset states
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
                  setSalesErrors({});
                  setSelectedSellerId('');
                  setCustomerSearchTerm('');
                  setIsCustomerDropdownOpen(false);
                  setDeliveryType('RETIRADA');
                  setShippingValue(0);
                  setFreightInput('');
                }}
                className="space-y-4 text-left overflow-y-auto pr-1 pb-2 flex-1 animate-fade-in"
              >
                {/* Sales Type Selection */}
                {userRole !== 'vendedor' && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Registro</label>
                    <select
                      value={salesType}
                      onChange={(e) => setSalesType(e.target.value as 'COMPLETED' | 'PENDING')}
                      className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-lg bg-indigo-50/30 focus:bg-white text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="COMPLETED">🛒 Venda Direta (Faturada - Baixa estoque imediata)</option>
                      <option value="PENDING">📋 Orçamento / Pedido (Aberto - Sem baixa de estoque)</option>
                    </select>
                  </div>
                )}

                {/* Customer Selector */}
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
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none"
                    />
                    {isCustomerDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[140]" onClick={() => setIsCustomerDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-[150] divide-y divide-slate-100">
                          <div
                            onClick={() => {
                              setSelectedCustomerId('');
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
                                  setSelectedCustomerId(c.id);
                                  setClientName(c.name);
                                  setClientPhone(c.phone);
                                  setClientCpf(c.cpf ? c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : '');
                                  setClientCep(c.cep || '');
                                  setClientStreet(c.street || '');
                                  setClientNumber(c.number || '');
                                  setClientComplement(c.complement || '');
                                  setClientNeighborhood(c.neighborhood || '');
                                  setClientCity(c.city || '');
                                  setClientState(c.state || '');
                                  setIsCustomerDropdownOpen(false);
                                  setCustomerSearchTerm(c.name);
                                  setSalesErrors({});
                                }}
                                className="p-2 hover:bg-slate-50 cursor-pointer text-xs text-left transition-colors"
                              >
                                <span className="font-bold text-slate-800 block leading-tight">{c.name}</span>
                                <span className="text-[10px] text-slate-555 font-mono block">
                                  CPF: {c.cpf ? c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : 'Não informado'} • Tel: {c.phone}
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

                {/* Client Name Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome do Cliente *</label>
                  <input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (salesErrors.name) setSalesErrors({ ...salesErrors, name: undefined });
                    }}
                    className={`w-full px-3 py-2 text-xs border ${salesErrors.name ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-500'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:ring-1 focus:outline-none`}
                  />
                  {salesErrors.name && (
                    <span className="text-[10px] font-bold text-rose-600 block">{salesErrors.name}</span>
                  )}
                </div>

                {/* CPF and Phone Inputs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">CPF do Cliente *</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={clientCpf}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '');
                        let fmt = clean;
                        if (clean.length > 9) {
                          fmt = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
                        } else if (clean.length > 6) {
                          fmt = clean.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
                        } else if (clean.length > 3) {
                          fmt = clean.replace(/(\d{3})(\d{1,3})/, "$1.$2");
                        }
                        setClientCpf(fmt);
                        if (salesErrors.cpf) setSalesErrors({ ...salesErrors, cpf: undefined });
                      }}
                      maxLength={14}
                      className={`w-full px-3 py-2 text-xs border ${salesErrors.cpf ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-500'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold focus:ring-1 focus:outline-none`}
                    />
                    {salesErrors.cpf && (
                      <span className="text-[10px] font-bold text-rose-600 block">{salesErrors.cpf}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telefone (WhatsApp) *</label>
                    <input
                      type="text"
                      placeholder="Ex: (73) 99999-9999"
                      value={clientPhone}
                      onChange={(e) => {
                        setClientPhone(e.target.value);
                        if (salesErrors.phone) setSalesErrors({ ...salesErrors, phone: undefined });
                      }}
                      className={`w-full px-3 py-2 text-xs border ${salesErrors.phone ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-500'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:ring-1 focus:outline-none`}
                    />
                    {salesErrors.phone && (
                      <span className="text-[10px] font-bold text-rose-600 block">{salesErrors.phone}</span>
                    )}
                  </div>
                </div>

                {/* Delivery Type Toggle */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Retirada / Entrega *</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelectDeliveryType('RETIRADA')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        deliveryType === 'RETIRADA'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Retirada na Loja
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectDeliveryType('ENVIAR')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        deliveryType === 'ENVIAR'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Enviar (Entrega) {shippingValue > 0 && `(+ R$ ${shippingValue.toFixed(2).replace('.', ',')})`}
                    </button>
                  </div>
                </div>
                {/* Montagem toggle */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Montagem</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setNeedsAssembly(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        needsAssembly
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Com Montagem
                    </button>
                    <button
                      type="button"
                      onClick={() => setNeedsAssembly(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        !needsAssembly
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Sem Montagem
                    </button>
                  </div>
                </div>
                {/* Address Section */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {deliveryType === 'ENVIAR' ? 'Endereço de Entrega (Obrigatório)' : 'Endereço do Cliente (Opcional)'}
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">CEP {deliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="00000-000"
                          value={clientCep}
                          maxLength={9}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            const val = raw.length > 5 ? raw.replace(/(\d{5})(\d{1,3})/, "$1-$2") : raw;
                            setClientCep(val);
                            handleShowroomCepLookup(val);
                          }}
                          className={`w-full px-2 py-1.5 text-xs border ${salesErrors.cep ? 'border-rose-500' : 'border-slate-300'} rounded-lg focus:outline-none bg-slate-50 focus:bg-white text-slate-800 font-bold`}
                        />
                        {loadingCep && (
                          <span className="absolute right-2 top-2 text-[9px] text-slate-400 animate-pulse">Buscando...</span>
                        )}
                      </div>
                      {salesErrors.cep && <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{salesErrors.cep}</span>}
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">UF {deliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        placeholder="UF"
                        value={clientState}
                        maxLength={2}
                        onChange={(e) => setClientState(e.target.value.toUpperCase())}
                        className={`w-full px-2 py-1.5 text-xs border ${salesErrors.state ? 'border-rose-500' : 'border-slate-300'} rounded-lg bg-slate-50 text-slate-800 font-bold`}
                      />
                      {salesErrors.state && <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{salesErrors.state}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cidade {deliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        placeholder="Cidade"
                        value={clientCity}
                        onChange={(e) => setClientCity(e.target.value)}
                        className={`w-full px-2 py-1.5 text-xs border ${salesErrors.city ? 'border-rose-500' : 'border-slate-300'} rounded-lg bg-slate-50`}
                      />
                      {salesErrors.city && <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{salesErrors.city}</span>}
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bairro {deliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        placeholder="Bairro"
                        value={clientNeighborhood}
                        onChange={(e) => setClientNeighborhood(e.target.value)}
                        className={`w-full px-2 py-1.5 text-xs border ${salesErrors.neighborhood ? 'border-rose-500' : 'border-slate-300'} rounded-lg bg-slate-50`}
                      />
                      {salesErrors.neighborhood && <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{salesErrors.neighborhood}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rua / Logradouro {deliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        placeholder="Av. das Flores..."
                        value={clientStreet}
                        onChange={(e) => setClientStreet(e.target.value)}
                        className={`w-full px-2 py-1.5 text-xs border ${salesErrors.street ? 'border-rose-500' : 'border-slate-300'} rounded-lg bg-slate-50`}
                      />
                      {salesErrors.street && <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{salesErrors.street}</span>}
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Número {deliveryType === 'ENVIAR' && <span className="text-rose-500">*</span>}</label>
                      <input
                        type="text"
                        placeholder="Ex: 123"
                        value={clientNumber}
                        onChange={(e) => setClientNumber(e.target.value)}
                        className={`w-full px-2 py-1.5 text-xs border ${salesErrors.number ? 'border-rose-500' : 'border-slate-300'} rounded-lg bg-slate-50 text-slate-800 font-bold`}
                      />
                      {salesErrors.number && <span className="text-[10px] font-bold text-rose-600 block mt-0.5">{salesErrors.number}</span>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Complemento</label>
                    <input
                      type="text"
                      placeholder="Apto 101, Bloco B..."
                      value={clientComplement}
                      onChange={(e) => setClientComplement(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50"
                    />
                  </div>
                </div>

                {/* Seller Select Input (only for managers / admins) */}
                {userRole !== 'vendedor' && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atribuir Pedido a {(userRole === 'Proprietário / Adm Geral' || userRole === 'admin' || userRole === 'caixa') ? '(Opcional)' : '*'}</label>
                    <select
                      value={selectedSellerId}
                      onChange={(e) => {
                        setSelectedSellerId(e.target.value);
                        if (salesErrors.seller) setSalesErrors({ ...salesErrors, seller: undefined });
                      }}
                      className={`w-full px-3 py-2 text-xs border ${salesErrors.seller ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 focus:ring-indigo-500'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:ring-1 focus:outline-none`}
                    >
                      <option value="">Selecione um vendedor...</option>
                      {sellers && sellers.filter(s => s.active).map(s => (
                        <option key={s.id} value={s.id}>{s.name} (@{s.username})</option>
                      ))}
                    </select>
                    {salesErrors.seller && (
                      <span className="text-[10px] font-bold text-rose-600 block">{salesErrors.seller}</span>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSalesProduct(null);
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
                      setSalesErrors({});
                      setSelectedSellerId('');
                      setCustomerSearchTerm('');
                      setIsCustomerDropdownOpen(false);
                      setDeliveryType('RETIRADA');
                      setShippingValue(0);
                      setFreightInput('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-md font-sans uppercase tracking-wider"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{salesType === 'COMPLETED' ? 'Faturar e Finalizar' : 'Gerar e Enviar Proposta'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Frete Modal */}
      <FreightModal
        isOpen={isFreightModalOpen}
        freightInput={freightInput}
        onChangeFreightInput={setFreightInput}
        onCancel={handleCancelFreight}
        onConfirm={handleConfirmFreight}
      />

      {/* CART DRAWER */}
      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        cartTotal={cartTotal}
        cartAssemblyTotal={cartAssemblyTotal}
        cartTotalWithShipping={cartTotalWithShipping}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={removeFromCart}
        onUpdateQuantity={updateCartItemQuantity}
        onUpdateDelivery={updateCartItemDelivery}
        onUpdateAssembly={updateCartItemAssembly}
        onUpdateShipping={updateCartItemShipping}
        onApplyPaymentMethodToAll={applyPaymentMethodToAll}
        onUpdatePaymentMethod={updateCartItemPaymentMethod}
        onUpdateInstallments={updateCartItemInstallments}
        getCartItemPrice={getCartItemPrice}
        onShareWhatsApp={shareCartWhatsApp}
        onStartCheckout={() => {
          setIsCartOpen(false);
          setShowCartCheckout(true);
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
          setSalesErrors({});
          setCartPaymentMethod('');
          setSelectedCustomerId('');
          setCustomerSearchTerm('');
          setIsCustomerDropdownOpen(false);
        }}
      />

      {/* CART CHECKOUT MODAL */}
      {showCartCheckout && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto font-sans" id="showroom-cart-checkout-modal">
          {cartCreatedSales ? (
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 max-w-lg w-full overflow-hidden p-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 text-emerald-650 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-8 h-8 stroke-[3] text-emerald-600" />
              </div>

              <div className="space-y-1.5 text-center">
                <h3 className="text-lg font-black text-slate-900 font-display">
                  {cartCreatedSales[0]?.status === 'PENDING' ? 'Propostas Criadas!' : 'Pedidos Confirmados!'}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {cartCreatedSales.length} {cartCreatedSales.length === 1 ? 'item foi registrado' : 'itens foram registrados'} com sucesso para <strong className="text-slate-800 font-bold">{cartCreatedSales[0]?.clientName}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 text-xs text-left text-slate-600">
                {cartCreatedSales.map((s, i) => (
                  <div key={s.id} className="flex justify-between items-center">
                    <span className="truncate font-medium">{i + 1}. {s.productName}</span>
                    <span className="font-bold text-slate-800 whitespace-nowrap ml-2">{s.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-slate-900">
                  <span>Total</span>
                  <span>{cartTotalWithShipping.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const cleanPhone = cartCreatedSales[0].clientPhone.replace(/\D/g, "");
                    let whatsappNum = cleanPhone;
                    if ((whatsappNum.length === 10 || whatsappNum.length === 11) && !whatsappNum.startsWith("55")) {
                      whatsappNum = "55" + whatsappNum;
                    }
                    
                    const labelType = cartCreatedSales[0].status === 'PENDING' ? 'Propostas Comerciais' : 'Vendas Confirmadas';
                    let text = `Olá *${cartCreatedSales[0].clientName.trim()}*! 🙋\n\n`;
                    text += `Segue o resumo ${cartCreatedSales.length > 1 ? 'dos seus pedidos' : 'do seu pedido'} na *Central Móveis*:\n\n`;
                    text += `━━━━━━━━━━━━━━━━━━\n`;
                    let totalValue = 0;
                    cartCreatedSales.forEach((s) => {
                      text += `📦 *${s.productName}* - R$ ${s.value.toFixed(2)}\n`;
                      text += `   🔖 SKU: ${s.productSku}\n`;
                      text += `   📍 ${s.deliveryType === 'RETIRADA' ? 'Retirada na Loja' : 'Entrega'}\n`;
                      totalValue += s.value;
                    });
                    text += `━━━━━━━━━━━━━━━━━━\n`;
                    text += `💰 *Total: R$ ${totalValue.toFixed(2)}*\n`;
                    text += `━━━━━━━━━━━━━━━━━━\n\n`;
                    text += `Agradecemos a preferência! Estamos à disposição para qualquer dúvida. 😊`;
                    
                    window.open(`https://api.whatsapp.com/send?phone=${whatsappNum}&text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCartCheckout(false);
                    setCartCreatedSales(null);
                    setCartItems([]);
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
                    setSalesErrors({});
                    setCartPaymentMethod('');
                    setSelectedCustomerId('');
                    setCustomerSearchTerm('');
                    setIsCustomerDropdownOpen(false);
                  }}
                  className="w-full py-2 px-4 border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl border border-emerald-100 max-w-lg w-full overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 font-display">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  <span>Finalizar Pedido ({cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'})</span>
                </h3>
                <button type="button" onClick={() => { setShowCartCheckout(false); setCartCreatedSales(null); setSelectedCustomerId(''); setCustomerSearchTerm(''); setIsCustomerDropdownOpen(false); }} className="text-slate-400 hover:text-slate-900 font-extrabold text-sm transition-colors">✕</button>
              </div>

              {/* Cart Items Summary */}
              <div className="bg-emerald-50/50 border border-emerald-100/40 rounded-xl p-3 space-y-2 shrink-0 max-h-40 overflow-y-auto">
                {cartItems.map((item, i) => (
                  <div key={item.cartId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-400 w-4 shrink-0">{i + 1}.</span>
                      <span className="font-semibold text-slate-700 truncate">{item.product.name}</span>
                      <span className="text-slate-400">x{item.quantity}</span>
                    </div>
                    <span className="font-bold text-slate-800 whitespace-nowrap ml-2">
                      {(item.product.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                ))}
                {cartItems.some(i => i.deliveryType === 'ENVIAR' && i.shippingValue > 0) && (
                  <div className="flex justify-between text-xs pt-1 border-t border-emerald-100">
                    <span className="text-slate-500">Fretes:</span>
                    <span className="font-bold text-slate-700">
                      + {cartItems.reduce((sum, i) => sum + (i.deliveryType === 'ENVIAR' ? i.shippingValue : 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-emerald-100">
                  <span>Total:</span>
                  <span className="text-sm font-black text-slate-900">{cartTotalWithShipping.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              {/* Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  
                  const errors: Record<string, string> = {};
                  if (!clientName.trim()) errors.name = "O nome do cliente é obrigatório.";
                  const cleanPhone = clientPhone.replace(/\D/g, "");
                  if (!clientPhone.trim()) errors.phone = "O telefone é obrigatório.";
                  else if (cleanPhone.length < 10) errors.phone = "Informe um telefone com DDD.";
                  
                  let finalSellerId = '';
                  let finalSellerName = '';
                  if (userRole === 'vendedor') {
                    if (!currentSeller) errors.seller = "Nenhum vendedor conectado.";
                    else { finalSellerId = currentSeller.id; finalSellerName = currentSeller.name; }
                  } else {
                    if (selectedSellerId) {
                      const foundSeller = sellers?.find(s => s.id === selectedSellerId);
                      if (foundSeller) { finalSellerId = foundSeller.id; finalSellerName = foundSeller.name; }
                      else errors.seller = "Vendedor inválido.";
                    } else if (userRole === 'Proprietário / Adm Geral' || userRole === 'admin' || userRole === 'caixa') {
                      finalSellerId = user?.uid || 'admin';
                      finalSellerName = user?.displayName || 'Administrador';
                    } else {
                      errors.seller = "Atribua a venda a um vendedor.";
                    }
                  }

                  if (Object.keys(errors).length > 0) { setSalesErrors(errors); return; }

                  // Verify Seller password
                  const resolvedSeller = sellers?.find(s => s.id === finalSellerId) || currentSeller;
                  if (resolvedSeller && resolvedSeller.password) {
                    const passInput = window.prompt(`Confirmação de Venda: Digite a senha de acesso do vendedor ${resolvedSeller.name}:`);
                    if (passInput === null) return; // User cancelled
                    if (!(await sellerPasswordMatches(passInput, resolvedSeller.password))) {
                      alert("Senha incorreta! A venda não foi efetuada.");
                      return;
                    }
                  }

                  const createdSales: Sale[] = [];
                  const batchId = `cart-${Date.now()}`;
                  
                  for (const item of cartItems) {
                    const saleId = `sale-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3)}`;
                    const commissionPercent = (item.product.category || '').toLowerCase().includes('eletro') ? 1.2 : 2.5;
                    const commissionValue = (getCartItemPrice(item) * item.quantity * commissionPercent) / 100;
                    
                    const assemblyValue = item.needsAssembly 
                      ? (getCartItemPrice(item) * (item.product.assemblyPercent || 0) / 100) * item.quantity 
                      : 0;
                    const taxPercent = item.product.taxPercent || 0;
                    const taxValue = (getCartItemPrice(item) * item.quantity * taxPercent) / 100;

                    const newSale: Sale = {
                      id: saleId,
                      createdAt: new Date().toISOString(),
                      productId: item.product.id,
                      productName: item.product.name,
                      productSku: item.product.sku,
                      productCategory: item.product.category,
                      productImageUrl: item.product.imageUrl || '',
                      value: getCartItemPrice(item) * item.quantity,
                      clientName: clientName.trim(),
                      clientPhone: clientPhone.trim(),
                      clientCpf: clientCpf.replace(/\D/g, '') || undefined,
                      sellerId: finalSellerId,
                      sellerName: finalSellerName,
                      commissionPercent,
                      commissionValue,
                      commissionStatus: 'PENDING',
                      origin: 'Carrinho Monstruário',
                      status: salesType,
                      deliveryType: item.deliveryType,
                      shippingValue: item.deliveryType === 'ENVIAR' ? item.shippingValue : undefined,
                      paymentMethod: (item.paymentMethod || cartPaymentMethod) as any || undefined,
                      installments: (item.paymentMethod === 'CARTAO' || item.paymentMethod === 'CARTAO_X') ? item.installments : undefined,
                      notes: `Pedido em lote: ${batchId} | ${cartItems.length} item(ns) no total`,
                      expiresAt: salesType === 'PENDING' ? new Date(Date.now() + (customization.orderExpirationMinutes || 60) * 60 * 1000).toISOString() : undefined,
                      needsAssembly: item.needsAssembly,
                      assemblyValue,
                      taxPercent,
                      taxValue
                    };
                    
                    if (!navigator.onLine) {
                      // Save to offline queue
                      const offlineSales = JSON.parse(localStorage.getItem('offline_sales') || '[]');
                      const offlineDeliveries = JSON.parse(localStorage.getItem('offline_deliveries') || '[]');
                      
                      const offlineSale = { ...newSale };
                      const deliveryAddress = item.deliveryType === 'RETIRADA' ? 'Retirada na Loja' : (clientStreet.trim() ? `${clientStreet.trim()}, ${clientNumber.trim()}${clientComplement.trim() ? ` - ${clientComplement.trim()}` : ''} - ${clientNeighborhood.trim()}, ${clientCity.trim()} - ${clientState.trim()}${clientCep.trim() ? ` (CEP: ${clientCep.trim()})` : ''}` : 'Retirada na Loja');
                      
                      const offlineDelivery = {
                        id: `del-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                        customerName: clientName.trim(),
                        customerPhone: clientPhone.trim(),
                        delivererName: 'Central Entregas',
                        address: deliveryAddress,
                        itemsDescription: `${item.quantity}x ${item.product.name} (SKU: ${item.product.sku})`,
                        status: 'A_ENTREGAR',
                        scheduledDate: new Date().toISOString().split('T')[0],
                        notes: `Pedido lote: ${batchId} | Frete: R$ ${item.shippingValue?.toFixed(2) || '0,00'}${item.needsAssembly ? ` | Montagem: R$ ${assemblyValue.toFixed(2)}` : ''}`,
                        needsAssembly: item.needsAssembly
                      };
                      
                      offlineSales.push(offlineSale);
                      offlineDeliveries.push(offlineDelivery);
                      
                      localStorage.setItem('offline_sales', JSON.stringify(offlineSales));
                      localStorage.setItem('offline_deliveries', JSON.stringify(offlineDeliveries));
                    } else {
                      saveSale(newSale).catch(err => console.error("Erro ao salvar venda:", err));
                      // Create delivery record
                      const deliveryAddress = item.deliveryType === 'RETIRADA' ? 'Retirada na Loja' : (clientStreet.trim() ? `${clientStreet.trim()}, ${clientNumber.trim()}${clientComplement.trim() ? ` - ${clientComplement.trim()}` : ''} - ${clientNeighborhood.trim()}, ${clientCity.trim()} - ${clientState.trim()}${clientCep.trim() ? ` (CEP: ${clientCep.trim()})` : ''}` : 'Retirada na Loja');
                      
                      try {
                        await saveDelivery({
                          id: `del-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                          customerName: clientName.trim(),
                          customerPhone: clientPhone.trim(),
                          delivererName: 'Central Entregas',
                          address: deliveryAddress,
                          itemsDescription: `${item.quantity}x ${item.product.name} (SKU: ${item.product.sku})`,
                          status: 'A_ENTREGAR',
                          scheduledDate: new Date().toISOString().split('T')[0],
                          notes: `Pedido lote: ${batchId} | Frete: R$ ${item.shippingValue?.toFixed(2) || '0,00'}${item.needsAssembly ? ` | Montagem: R$ ${assemblyValue.toFixed(2)}` : ''}`,
                          needsAssembly: item.needsAssembly
                        });
                      } catch (err) {
                        console.error("Erro ao salvar entrega:", err);
                      }
                    }
                    createdSales.push(newSale);

                    // Register stock transaction if COMPLETED
                    if (salesType === 'COMPLETED' && onRegisterTransaction) {
                      onRegisterTransaction({
                        productId: item.product.id,
                        productName: item.product.name,
                        type: 'OUT',
                        quantity: item.quantity,
                        reason: 'VENDA',
                        description: `Venda via Carrinho Showroom para ${clientName.trim()}`,
                        value: getCartItemPrice(item) * item.quantity
                      });
                    }
                  }

                  logAuditEvent(
                    salesType === 'COMPLETED' ? "Vendas em Lote Criadas" : "Orçamentos em Lote Criados",
                    `${createdSales.length} ${salesType === 'COMPLETED' ? 'vendas' : 'orçamentos'} criados via carrinho para ${clientName.trim()} no valor total de R$ ${cartTotalWithShipping.toFixed(2)}.`
                  ).catch(err => console.error("Erro ao salvar log:", err));

                  // Save customer
                  const fullAddress = clientStreet.trim() ? `${clientStreet.trim()}, ${clientNumber.trim()}${clientComplement.trim() ? ` - ${clientComplement.trim()}` : ''} - ${clientNeighborhood.trim()}, ${clientCity.trim()} - ${clientState.trim()}` : '';
                  saveCustomer({
                    id: selectedCustomerId || `cust-${Date.now()}`,
                    name: clientName.trim(),
                    phone: clientPhone.trim(),
                    cpf: clientCpf.replace(/\D/g, ''),
                    cep: clientCep.trim() || undefined,
                    street: clientStreet.trim() || undefined,
                    number: clientNumber.trim() || undefined,
                    complement: clientComplement.trim() || undefined,
                    neighborhood: clientNeighborhood.trim() || undefined,
                    city: clientCity.trim() || undefined,
                    state: clientState.trim() || undefined,
                    address: fullAddress || undefined,
                    createdAt: new Date().toISOString()
                  }).catch(err => console.error("Erro ao cadastrar cliente:", err));

                  // Send WhatsApp
                  let whatsappNum = cleanPhone;
                  if ((whatsappNum.length === 10 || whatsappNum.length === 11) && !whatsappNum.startsWith("55")) {
                    whatsappNum = "55" + whatsappNum;
                  }
                  
                  let text = `Olá *${clientName.trim()}*! 🙋\n\n`;
                  text += `Segue o resumo ${cartItems.length > 1 ? 'dos seus pedidos' : 'do seu pedido'} na *Central Móveis*:\n\n`;
                  text += `━━━━━━━━━━━━━━━━━━\n`;
                  let totalVal = 0;
                  cartItems.forEach((item) => {
                    const itemTotal = getCartItemPrice(item) * item.quantity;
                    text += `🛒 *${item.product.name}* - R$ ${itemTotal.toFixed(2)}\n`;
                    text += `   🔖 SKU: ${item.product.sku} | Qtd: ${item.quantity}\n`;
                    text += `   📍 ${item.deliveryType === 'RETIRADA' ? 'Retirada na Loja' : 'Entrega'}${item.needsAssembly ? ' | 🔧 Montagem' : ''}\n`;
                    const pm = item.paymentMethod || cartPaymentMethod;
                    if (pm) text += `   💳 ${getPaymentMethodLabel(pm)}\n`;
                    totalVal += itemTotal;
                  });
                  text += `━━━━━━━━━━━━━━━━━━\n`;
                  text += `💰 *Total: R$ ${totalVal.toFixed(2)}*\n`;
                  text += `━━━━━━━━━━━━━━━━━━\n\n`;
                  text += `Agradecemos a preferência! Estamos à disposição para qualquer dúvida. 😊`;
                  
                  if (navigator.onLine) {
                    window.open(`https://api.whatsapp.com/send?phone=${whatsappNum}&text=${encodeURIComponent(text)}`, '_blank');
                  } else {
                    alert(`[OFFLINE] Vendas salvas localmente no dispositivo! Elas serão sincronizadas automaticamente com o servidor assim que a conexão retornar.`);
                  }

                  setCartCreatedSales(createdSales);
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
                  setSalesErrors({});
                  setSelectedSellerId('');
                  setCartPaymentMethod('');
                  setSelectedCustomerId('');
                  setCustomerSearchTerm('');
                  setIsCustomerDropdownOpen(false);
                }}
                className="space-y-4 text-left overflow-y-auto pr-1 pb-2 flex-1 animate-fade-in"
              >
                {/* Customer Selector */}
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
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none"
                    />
                    {isCustomerDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[200]" onClick={() => setIsCustomerDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-[210] divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                          <div
                            onClick={() => {
                              setSelectedCustomerId('');
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
                                  setSelectedCustomerId(c.id);
                                  setClientName(c.name);
                                  setClientPhone(c.phone);
                                  setClientCpf(c.cpf ? c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : '');
                                  setClientCep(c.cep || '');
                                  setClientStreet(c.street || '');
                                  setClientNumber(c.number || '');
                                  setClientComplement(c.complement || '');
                                  setClientNeighborhood(c.neighborhood || '');
                                  setClientCity(c.city || '');
                                  setClientState(c.state || '');
                                  setIsCustomerDropdownOpen(false);
                                  setCustomerSearchTerm(c.name);
                                  setSalesErrors({});
                                }}
                                className="p-2 hover:bg-slate-50 cursor-pointer text-xs text-left transition-colors"
                              >
                                <span className="font-bold text-slate-800 block leading-tight">{c.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono block">
                                  CPF: {c.cpf ? c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : 'Não informado'} • Tel: {c.phone}
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

                {/* Client Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome do Cliente *</label>
                  <input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={clientName}
                    onChange={(e) => { setClientName(e.target.value); if (salesErrors.name) setSalesErrors({ ...salesErrors, name: undefined }); }}
                    className={`w-full px-3 py-2 text-xs border ${salesErrors.name ? 'border-rose-500' : 'border-slate-300'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none`}
                  />
                  {salesErrors.name && <span className="text-[10px] font-bold text-rose-600 block">{salesErrors.name}</span>}
                </div>

                {/* Phone and CPF */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telefone (WhatsApp) *</label>
                    <input
                      type="text"
                      placeholder="(73) 99999-9999"
                      value={clientPhone}
                      onChange={(e) => { setClientPhone(e.target.value); if (salesErrors.phone) setSalesErrors({ ...salesErrors, phone: undefined }); }}
                      className={`w-full px-3 py-2 text-xs border ${salesErrors.phone ? 'border-rose-500' : 'border-slate-300'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none`}
                    />
                    {salesErrors.phone && <span className="text-[10px] font-bold text-rose-600 block">{salesErrors.phone}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">CPF</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={clientCpf}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '');
                        let fmt = clean;
                        if (clean.length > 9) fmt = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
                        else if (clean.length > 6) fmt = clean.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
                        else if (clean.length > 3) fmt = clean.replace(/(\d{3})(\d{1,3})/, "$1.$2");
                        setClientCpf(fmt);
                      }}
                      maxLength={14}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Address (optional) */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Endereço (Opcional)</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">CEP</label>
                      <input type="text" placeholder="00000-000" value={clientCep} maxLength={9}
                        onChange={(e) => { const raw = e.target.value.replace(/\D/g, ''); const val = raw.length > 5 ? raw.replace(/(\d{5})(\d{1,3})/, "$1-$2") : raw; setClientCep(val); handleShowroomCepLookup(val); }}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">UF</label>
                      <input type="text" placeholder="UF" value={clientState} maxLength={2}
                        onChange={(e) => setClientState(e.target.value.toUpperCase())}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cidade</label>
                      <input type="text" placeholder="Cidade" value={clientCity} onChange={(e) => setClientCity(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bairro</label>
                      <input type="text" placeholder="Bairro" value={clientNeighborhood} onChange={(e) => setClientNeighborhood(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rua</label>
                      <input type="text" placeholder="Av. das Flores..." value={clientStreet} onChange={(e) => setClientStreet(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Número</label>
                      <input type="text" placeholder="123" value={clientNumber} onChange={(e) => setClientNumber(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 font-bold" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Complemento</label>
                    <input type="text" placeholder="Apto 101" value={clientComplement} onChange={(e) => setClientComplement(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50" />
                  </div>
                </div>

                {/* Sales Type and Seller */}
                {userRole !== 'vendedor' && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Registro</label>
                      <select value={salesType} onChange={(e) => setSalesType(e.target.value as 'COMPLETED' | 'PENDING')}
                        className="w-full px-3 py-2 text-xs border border-emerald-200 rounded-lg bg-emerald-50/30 focus:bg-white text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="COMPLETED">🛒 Venda Direta (Baixa estoque imediata)</option>
                        <option value="PENDING">📋 Orçamento / Pedido (Sem baixa de estoque)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atribuir a *</label>
                      <select value={selectedSellerId} onChange={(e) => setSelectedSellerId(e.target.value)}
                        className={`w-full px-3 py-2 text-xs border ${salesErrors.seller ? 'border-rose-500' : 'border-slate-300'} rounded-lg bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                      >
                        <option value="">Selecione um vendedor...</option>
                        {sellers && sellers.filter(s => s.active).map(s => (
                          <option key={s.id} value={s.id}>{s.name} (@{s.username})</option>
                        ))}
                      </select>
                      {salesErrors.seller && <span className="text-[10px] font-bold text-rose-600 block">{salesErrors.seller}</span>}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 shrink-0">
                  <button type="button" onClick={() => { setShowCartCheckout(false); setCartCreatedSales(null); setSelectedCustomerId(''); setCustomerSearchTerm(''); setIsCustomerDropdownOpen(false); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 shadow-md font-sans uppercase tracking-wider"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{salesType === 'COMPLETED' ? 'Faturar Pedidos' : 'Gerar Propostas'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 3. IMAGE CUSTOMIZATION EDITOR MODAL */}
      <ImageEditorModal
        isOpen={imageEditorOpen}
        onClose={() => setImageEditorOpen(false)}
        onSave={handleSaveImage}
        currentUrl={imageEditorTargetIndex !== null ? customization.carouselSlides[imageEditorTargetIndex].url : ((customization as any)[imageEditorTargetKey] || '')}
        title={imageEditorTitle}
      />

      {/* 4. FULLSCREEN IMAGE LIGHTBOX */}
      <FullscreenImageLightbox imageUrl={fullscreenImage} onClose={() => setFullscreenImage(null)} />

    </div>
  );
}

