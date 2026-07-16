import React, { useState, useRef, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  MapPin, 
  User, 
  Calendar, 
  Check, 
  FileText, 
  X, 
  PenTool, 
  Smartphone, 
  UserCheck, 
  Clock, 
  AlertCircle,
  Printer,
  Lock,
  Send,
  AlertTriangle,
  Navigation,
  MessageSquare
} from 'lucide-react';
import { Delivery, Montador, Deliverer } from '../types';
import { OWNER_EMAILS } from '../config/adminEmails';
import { DeleteConfirmationDialog } from './shared/DeleteConfirmationDialog';
import { SignaturePad } from './deliveries/SignaturePad';
import { ReportProblemModal } from './deliveries/ReportProblemModal';
import { AssignAssemblerModal } from './deliveries/AssignAssemblerModal';
import { AssignDelivererModal } from './deliveries/AssignDelivererModal';
import { DeliveryReceiptModal } from './deliveries/DeliveryReceiptModal';
import { CollectDeliverySignatureModal } from './deliveries/CollectDeliverySignatureModal';
import { CollectAssemblySignatureModal } from './deliveries/CollectAssemblySignatureModal';
import { AddDeliveryModal } from './deliveries/AddDeliveryModal';

interface DeliveriesViewProps {
  deliveries: Delivery[];
  onAddDelivery: (newDel: Omit<Delivery, 'id' | 'status'>) => void;
  onCompleteDelivery: (id: string, customerSig: string, delivererSig: string, deliveryPhoto?: string, refusalDetails?: { name: string; dob: string; cpf: string }) => void;
  onDeleteDelivery?: (id: string) => void;
  userRole?: string;
  currentUserEmail?: string;
  currentMontador?: { id: string; name: string } | null;
  currentDeliverer?: { id: string; name: string } | null;
  onCompleteAssembly?: (id: string, assemblerSig: string, customerSig: string, assemblyPhoto?: string, refusalDetails?: { name: string; dob: string; cpf: string }) => void;
  onPrintDelivery?: (del: Delivery) => void;
  montadores?: Montador[];
  onAssignMontador?: (
    deliveryId: string,
    montadorId: string,
    montadorName: string,
    commissionPercent: number,
    sentToAssembler: boolean
  ) => void;
  entregadores?: Deliverer[];
  onAssignDeliverer?: (
    deliveryId: string,
    delivererId: string,
    delivererName: string,
    sentToDeliverer: boolean
  ) => void;
  onStartDeliveryRoute?: (id: string) => void;
}

/**
 * Compresses a base64 image down to a maximum width or height.
 * Useful to prevent Firebase Storage from filling up with 5MB+ mobile photos.
 */

// Draw canvas helper component

export function DeliveriesView({ 
  deliveries, 
  onAddDelivery, 
  onCompleteDelivery,
  onDeleteDelivery,
  userRole = 'admin',
  currentUserEmail,
  currentMontador,
  onCompleteAssembly,
  onPrintDelivery,
  montadores = [],
  entregadores = [],
  onAssignMontador,
  onAssignDeliverer,
  currentDeliverer,
  onStartDeliveryRoute
}: DeliveriesViewProps) {
  const isAdmin =
    userRole === 'admin' ||
    userRole === 'Proprietário / Adm Geral' ||
    (currentUserEmail !== undefined && OWNER_EMAILS.includes(currentUserEmail.trim().toLowerCase()));
  // Filters & State
  const [filter, setFilter] = useState<'ALL' | 'A_ENTREGAR' | 'ENTREGUE'>('ALL');
  const [assemblyFilter, setAssemblyFilter] = useState<'ALL' | 'PENDENTE' | 'MONTADO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideRetiradas, setHideRetiradas] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssemblySaving, setIsAssemblySaving] = useState(false);

  // Assignment Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignDelivery, setAssignDelivery] = useState<Delivery | null>(null);
  const [selectedAssemblerId, setSelectedAssemblerId] = useState('');
  const [assemblerCommission, setAssemblerCommission] = useState<number | ''>('');
  const [assignError, setAssignError] = useState('');

  // Assign Deliverer Modal States
  const [isAssignDelivererModalOpen, setIsAssignDelivererModalOpen] = useState(false);
  const [assignDelivererTarget, setAssignDelivererTarget] = useState<Delivery | null>(null);
  const [selectedDelivererId, setSelectedDelivererId] = useState('');
  const [assignDelivererError, setAssignDelivererError] = useState('');
  
  // Modal Control
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssemblySignModalOpen, setIsAssemblySignModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [deliveryToDelete, setDeliveryToDelete] = useState<Delivery | null>(null);

  // New Delivery Fields
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newDelivererName, setNewDelivererName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newItems, setNewItems] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Signatures fields
  const [customerSigImg, setCustomerSigImg] = useState('');
  const [delivererSigImg, setDelivererSigImg] = useState('');
  const [deliveryPhotoImg, setDeliveryPhotoImg] = useState('');
  const [signError, setSignError] = useState('');

  // Refusal fields (manual delivery confirmation)
  const [refuseSignatureDelivery, setRefuseSignatureDelivery] = useState(false);
  const [refusalNameDelivery, setRefusalNameDelivery] = useState('');
  const [refusalDobDelivery, setRefusalDobDelivery] = useState('');
  const [refusalCpfDelivery, setRefusalCpfDelivery] = useState('');

  const handleSubmitAssemblySigs = async () => {
    if (!assemblerSigImg) {
      setAssemblySignError('A assinatura do montador é obrigatória.');
      return;
    }
    if (refuseSignatureAssembly) {
      if (!refusalNameAssembly.trim()) {
        setAssemblySignError('O nome do cliente/recebedor é obrigatório.');
        return;
      }
      if (!refusalDobAssembly) {
        setAssemblySignError('A data de nascimento é obrigatória.');
        return;
      }
      if (!refusalCpfAssembly.trim()) {
        setAssemblySignError('O CPF é obrigatório.');
        return;
      }
    } else {
      if (!assemblyCustomerSigImg) {
        setAssemblySignError('A assinatura digital da cliente é obrigatória.');
        return;
      }
    }
    if (!assemblyPhotoImg) {
      setAssemblySignError('A foto do produto montado é obrigatória.');
      return;
    }
    if (!selectedDelivery || !onCompleteAssembly) return;
    
    try {
      setIsAssemblySaving(true);
      setAssemblySignError('');
      const refusalDetails = refuseSignatureAssembly ? {
        name: refusalNameAssembly.trim(),
        dob: refusalDobAssembly,
        cpf: refusalCpfAssembly.replace(/\D/g, '')
      } : undefined;

      await onCompleteAssembly(selectedDelivery.id, assemblerSigImg, refuseSignatureAssembly ? '' : assemblyCustomerSigImg, assemblyPhotoImg, refusalDetails);
      setIsAssemblySignModalOpen(false);
      setSelectedDelivery(null);
      setAssemblyCustomerSigImg('');
      setAssemblerSigImg('');
      setAssemblyPhotoImg('');
      setAssemblySignError('');
      setRefuseSignatureAssembly(false);
      setRefusalNameAssembly('');
      setRefusalDobAssembly('');
      setRefusalCpfAssembly('');
    } catch (err) {
      setAssemblySignError('Erro ao salvar comprovantes de montagem no servidor.');
    } finally {
      setIsAssemblySaving(false);
    }
  };

  // Assembly signature fields
  const [assemblyCustomerSigImg, setAssemblyCustomerSigImg] = useState('');
  const [assemblerSigImg, setAssemblerSigImg] = useState('');
  const [assemblyPhotoImg, setAssemblyPhotoImg] = useState('');
  const [assemblySignError, setAssemblySignError] = useState('');

  // Refusal fields (manual assembly confirmation)
  const [refuseSignatureAssembly, setRefuseSignatureAssembly] = useState(false);
  const [refusalNameAssembly, setRefusalNameAssembly] = useState('');
  const [refusalDobAssembly, setRefusalDobAssembly] = useState('');
  const [refusalCpfAssembly, setRefusalCpfAssembly] = useState('');

  // Problem reporting states
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [selectedDeliveryForProblem, setSelectedDeliveryForProblem] = useState<Delivery | null>(null);
  const [problemType, setProblemType] = useState('Falta de Parafuso/Ferragens');
  const [problemDescription, setProblemDescription] = useState('');

  const handleSendProblemReport = () => {
    if (!selectedDeliveryForProblem) return;
    
    const message = `🚨 *CentralSync - Reporte de Problema* 🚨\n\n` +
      `*Cliente:* ${selectedDeliveryForProblem.customerName}\n` +
      `*Endereço:* ${selectedDeliveryForProblem.address}\n` +
      `*Profissional:* ${userRole === 'montador' ? (currentMontador?.name || 'Montador') : (currentDeliverer?.name || 'Entregador')}\n` +
      `*Móvel/Volume:* ${selectedDeliveryForProblem.itemsDescription}\n` +
      `*Tipo de Problema:* ${problemType}\n` +
      `*Detalhes:* ${problemDescription.trim() || 'Sem observações adicionais'}`;

    const adminPhone = "5573999392585"; 
    const adminEmail = "adm@centralsync.com";

    window.open(`https://api.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(message)}`, '_blank');
    window.open(`mailto:${adminEmail}?subject=${encodeURIComponent("Reporte de Problema - " + selectedDeliveryForProblem.customerName)}&body=${encodeURIComponent(message)}`, '_blank');

    setIsProblemModalOpen(false);
    setSelectedDeliveryForProblem(null);
    setProblemDescription('');
  };

  // Calculations
  const filteredDeliveries = deliveries.filter(del => {
    const term = searchQuery.toLowerCase();
    const statusLabel = del.status === 'A_ENTREGAR' ? 'a entregar' : 'entregue';
    const matchesSearch = 
      del.customerName.toLowerCase().includes(term) ||
      del.delivererName.toLowerCase().includes(term) ||
      del.address.toLowerCase().includes(term) ||
      del.itemsDescription.toLowerCase().includes(term) ||
      statusLabel.includes(term);
    const matchesAssembly = currentMontador
      ? (del.assemblerId === currentMontador.id && del.assemblySentToAssembler === true)
      : true;

    const matchesDeliverer = currentDeliverer
      ? (del.delivererId === currentDeliverer.id && del.deliverySentToDeliverer === true)
      : true;

    let matchesFilter = false;
    if (userRole === 'montador') {
      if (assemblyFilter === 'ALL') matchesFilter = true;
      else if (assemblyFilter === 'PENDENTE') matchesFilter = del.assemblyStatus === 'PENDENTE' || !del.assemblyStatus;
      else if (assemblyFilter === 'MONTADO') matchesFilter = del.assemblyStatus === 'MONTADO';
    } else {
      matchesFilter = filter === 'ALL' || del.status === filter;
    }

    const isRetirada = del.address.toLowerCase().includes('retirada');
    if (hideRetiradas && isRetirada && userRole !== 'montador') {
      return false;
    }

    return matchesFilter && matchesSearch && matchesAssembly && matchesDeliverer;
  });

  const totals = (() => {
    let base = deliveries;
    if (currentMontador) {
      base = deliveries.filter(d => d.assemblerId === currentMontador.id && d.assemblySentToAssembler === true);
    } else {
      if (currentDeliverer) {
        base = deliveries.filter(d => d.delivererId === currentDeliverer.id && d.deliverySentToDeliverer === true);
      }
      if (hideRetiradas && userRole !== 'montador') {
        base = base.filter(d => !d.address.toLowerCase().includes('retirada'));
      }
    }
    return {
      all: base.length,
      pending: base.filter(d => d.status === 'A_ENTREGAR').length,
      delivered: base.filter(d => d.status === 'ENTREGUE').length,
      assemblyPending: base.filter(d => d.assemblyStatus === 'PENDENTE' || !d.assemblyStatus).length,
      assemblyDone: base.filter(d => d.assemblyStatus === 'MONTADO').length
    };
  })();

  const handleOpenAssignModal = (del: Delivery) => {
    setAssignDelivery(del);
    setSelectedAssemblerId(del.assemblerId || '');
    setAssemblerCommission(
      del.assemblyCommissionPercent !== undefined 
        ? del.assemblyCommissionPercent 
        : (del.assemblerId ? (montadores.find(m => m.id === del.assemblerId)?.commissionPercent || 0) : '')
    );
    setAssignError('');
    setIsAssignModalOpen(true);
  };

  const handleSelectAssembler = (id: string) => {
    setSelectedAssemblerId(id);
    const montador = montadores.find(m => m.id === id);
    if (montador && montador.commissionPercent !== undefined) {
      setAssemblerCommission(montador.commissionPercent);
    } else {
      setAssemblerCommission('');
    }
  };

  const handleSaveAssignment = (sentToAssembler: boolean) => {
    if (!assignDelivery || !onAssignMontador) return;
    if (!selectedAssemblerId) {
      setAssignError('Selecione um montador.');
      return;
    }
    const montador = montadores.find(m => m.id === selectedAssemblerId);
    if (!montador) return;

    const commission = Number(assemblerCommission) || 0;

    onAssignMontador(assignDelivery.id, montador.id, montador.name, commission, sentToAssembler);
    setIsAssignModalOpen(false);
    setAssignDelivery(null);
  };

  const handleOpenAssignDelivererModal = (del: Delivery) => {
    setAssignDelivererTarget(del);
    setSelectedDelivererId(del.delivererId || '');
    setAssignDelivererError('');
    setIsAssignDelivererModalOpen(true);
  };

  const handleSaveDelivererAssignment = (sentToDeliverer: boolean) => {
    if (!assignDelivererTarget || !onAssignDeliverer) return;
    if (!selectedDelivererId) {
      setAssignDelivererError('Selecione um entregador.');
      return;
    }
    const deliverer = entregadores.find(e => e.id === selectedDelivererId);
    if (!deliverer) return;

    onAssignDeliverer(assignDelivererTarget.id, deliverer.id, deliverer.name, sentToDeliverer);
    setIsAssignDelivererModalOpen(false);
    setAssignDelivererTarget(null);
  };

  const handleOpenSignModal = (del: Delivery) => {
    setSelectedDelivery(del);
    setCustomerSigImg('');
    setDelivererSigImg('');
    setDeliveryPhotoImg('');
    setSignError('');
    setIsSignModalOpen(true);
  };

  const handleOpenDetailModal = (del: Delivery) => {
    setSelectedDelivery(del);
    setIsDetailModalOpen(true);
  };

  const handleNotifyDelivery = (del: Delivery) => {
    const rawPhone = del.customerPhone || prompt("Digite o WhatsApp do cliente (com DDD):", "");
    if (!rawPhone) return;
    
    // Clean phone number (remove non-digits, add 55 if not present)
    let cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }

    const message = `Olá, ${del.customerName}! 🚚 Seu móvel (${del.itemsDescription}) acabou de sair para entrega! Nosso entregador está a caminho do seu endereço: ${del.address}. Agradecemos a preferência!`;
    
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSaveDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newDelivererName || !newAddress || !newItems || !newDate) return;

    onAddDelivery({
      customerName: newCustomerName,
      customerPhone: newCustomerPhone,
      delivererName: newDelivererName,
      address: newAddress,
      itemsDescription: newItems,
      scheduledDate: newDate,
      notes: newNotes
    });

    // Reset fields
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewDelivererName('');
    setNewAddress('');
    setNewItems('');
    setNewDate('');
    setNewNotes('');
    setIsAddModalOpen(false);
  };

  const handleSubmitSigs = async () => {
    if (!selectedDelivery) return;
    
    if (refuseSignatureDelivery) {
      if (!refusalNameDelivery.trim()) {
        setSignError('O nome do cliente/recebedor é obrigatório.');
        return;
      }
      if (!refusalDobDelivery) {
        setSignError('A data de nascimento é obrigatória.');
        return;
      }
      if (!refusalCpfDelivery.trim()) {
        setSignError('O CPF é obrigatório.');
        return;
      }
    } else {
      if (!customerSigImg) {
        setSignError('A assinatura digital da cliente é obrigatória.');
        return;
      }
    }
    if (!delivererSigImg) {
      setSignError('A assinatura do responsável pela entrega (entregador) é obrigatória.');
      return;
    }
    if (!deliveryPhotoImg) {
      setSignError('A foto da entrega é obrigatória.');
      return;
    }

    try {
      setIsSaving(true);
      setSignError('');
      const refusalDetails = refuseSignatureDelivery ? {
        name: refusalNameDelivery.trim(),
        dob: refusalDobDelivery,
        cpf: refusalCpfDelivery.replace(/\D/g, '')
      } : undefined;

      await onCompleteDelivery(selectedDelivery.id, refuseSignatureDelivery ? '' : customerSigImg, delivererSigImg, deliveryPhotoImg, refusalDetails);
      setIsSignModalOpen(false);
      setSelectedDelivery(null);
      setDeliveryPhotoImg('');
      setRefuseSignatureDelivery(false);
      setRefusalNameDelivery('');
      setRefusalDobDelivery('');
      setRefusalCpfDelivery('');
    } catch (err) {
      setSignError('Erro ao salvar comprovantes de entrega no servidor. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="deliveries-module">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
            {userRole === 'montador' ? 'Montagens & Entregas' : 'Status e Entregas de Móveis'}
          </h1>
          <p className="text-sm text-slate-500">
            {userRole === 'montador' 
              ? 'Visualize os pedidos pendentes de montagem e registre a conclusão com assinatura dupla.'
              : 'Controle do status de expedição físico com assinatura digital autenticada em tempo real.'}
          </p>
        </div>
        {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-all text-left cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Agendar Nova Entrega
          </button>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="deliveries-kpis">
        {userRole === 'montador' ? (
          <>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                <PenTool className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Pendentes de Montagem</span>
                <span className="text-xl font-bold font-display text-slate-900">{totals.assemblyPending} móveis</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Montagens Concluídas</span>
                <span className="text-xl font-bold font-display text-slate-900">{totals.assemblyDone} concluídas</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Serviço Autorizado</span>
                <span className="text-xs text-slate-650 font-medium leading-relaxed block mt-0.5">Assinatura digital do montador e cliente ao finalizar a montagem.</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">A Entregar</span>
                <span className="text-xl font-bold font-display text-slate-900">{totals.pending} pendentes</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Entregas Concluídas</span>
                <span className="text-xl font-bold font-display text-slate-900">{totals.delivered} assinadas</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 animate-pulse">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Assinatura Digital</span>
                <span className="text-xs text-slate-650 font-medium leading-relaxed block mt-0.5">Captura dupla e independente pelo smartphone do entregador.</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters and List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Sub Navigation tabs */}
        <div className="flex border-b border-slate-100" id="delivery-tabs">
          {userRole === 'montador' ? (
            <>
              <button
                onClick={() => setAssemblyFilter('ALL')}
                className={`flex-1 md:flex-none px-6 py-3.5 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer ${assemblyFilter === 'ALL' ? 'border-blue-600 text-blue-650 bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
              >
                Todas as Montagens ({totals.assemblyPending + totals.assemblyDone})
              </button>
              <button
                onClick={() => setAssemblyFilter('PENDENTE')}
                className={`flex-1 md:flex-none px-6 py-3.5 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer ${assemblyFilter === 'PENDENTE' ? 'border-amber-500 text-amber-600 bg-amber-50/10' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
              >
                Pendentes ({totals.assemblyPending})
              </button>
              <button
                onClick={() => setAssemblyFilter('MONTADO')}
                className={`flex-1 md:flex-none px-6 py-3.5 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer ${assemblyFilter === 'MONTADO' ? 'border-emerald-600 text-emerald-650 bg-emerald-50/10' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
              >
                Concluídas ({totals.assemblyDone})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setFilter('ALL')}
                className={`flex-1 md:flex-none px-6 py-3.5 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer ${filter === 'ALL' ? 'border-blue-600 text-blue-650 bg-slate-50/50' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
              >
                Todas as Entregas ({totals.all})
              </button>
              <button
                onClick={() => setFilter('A_ENTREGAR')}
                className={`flex-1 md:flex-none px-6 py-3.5 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer ${filter === 'A_ENTREGAR' ? 'border-amber-500 text-amber-600 bg-amber-50/10' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
              >
                A Entregar ({totals.pending})
              </button>
              <button
                onClick={() => setFilter('ENTREGUE')}
                className={`flex-1 md:flex-none px-6 py-3.5 text-xs md:text-sm font-bold border-b-2 text-center transition-all cursor-pointer ${filter === 'ENTREGUE' ? 'border-emerald-600 text-emerald-650 bg-emerald-50/10' : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/10'}`}
              >
                Entregues ({totals.delivered})
              </button>
            </>
          )}
        </div>

        {/* Search Row */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar cliente, endereço ou entregador..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full text-xs md:text-sm border border-slate-200 rounded-lg outline-none bg-white focus:border-blue-500 transition-all text-slate-800"
              />
            </div>
            {userRole !== 'montador' && (
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideRetiradas}
                  onChange={(e) => setHideRetiradas(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Ocultar Retiradas na Loja</span>
              </label>
            )}
          </div>
        </div>

        {/* Deliveries list container */}
        <div className="bg-white">
          {filteredDeliveries.length > 0 ? (
            <>
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="p-4">Pedido</th>
                        <th className="p-4">Cliente / Endereço</th>
                        <th className="p-4">Lista de Móveis</th>
                        <th className="p-4">Responsável (Entregador)</th>
                        <th className="p-4 text-center">Agendado</th>
                        <th className="p-4 text-center">Status</th>
                        {userRole !== 'montador' && <th className="p-4 text-center">Montagem</th>}
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDeliveries.map(del => (
                      <tr key={del.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 align-top pt-5">
                          <div className="text-xs font-mono text-blue-600 font-semibold" title={del.notes || ''}>
                            {(del.notes?.match(/Pedido #([\w-]+)/)?.[1] || '').length > 10
                              ? `#${(del.notes?.match(/Pedido #([\w-]+)/)?.[1] || '').slice(-6)}`
                              : (del.notes?.match(/Pedido #([\w-]+)/)?.[1] ? `#${del.notes.match(/Pedido #([\w-]+)/)![1]}` : '—')}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-sm">{del.customerName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 font-sans">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[220px]" title={del.address}>{del.address}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-slate-800 break-words max-w-[240px] whitespace-pre-wrap">{del.itemsDescription}</div>
                          {del.notes && <p className="text-[10px] text-slate-450 italic mt-0.5">Obs: {del.notes}</p>}
                        </td>
                        <td className="p-4 font-semibold text-slate-700">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{del.delivererName}</span>
                            </div>
                            {userRole !== 'entregador' && (
                              <div className="mt-1">
                                {del.delivererId ? (
                                  <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${del.deliverySentToDeliverer ? 'bg-blue-50 text-blue-800 border border-blue-200/50' : 'bg-amber-50 text-amber-800 border border-amber-200/50'}`}>
                                    {del.delivererName} {del.deliverySentToDeliverer ? '' : '(Rascunho)'}
                                  </div>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200/50 uppercase tracking-wider">
                                    Não Designado
                                  </span>
                                )}
                                {(userRole === 'admin' || userRole === 'Proprietário / Adm Geral') && (
                                  <button
                                    onClick={() => handleOpenAssignDelivererModal(del)}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer block mt-1"
                                  >
                                    {del.delivererId ? 'Reatribuir' : 'Designar Entregador'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono text-slate-600">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold">{del.scheduledDate.split('-').reverse().join('/')}</span>
                            {del.deliveredAt && (
                              <span className="text-[10px] text-emerald-650 mt-1 flex items-center gap-1 font-sans font-bold">
                                <Clock className="w-3 h-3" />
                                {new Date(del.deliveredAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {userRole === 'montador' ? (
                            del.assemblyStatus === 'MONTADO' ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-55 text-blue-800 border border-blue-200/50 uppercase tracking-wider">
                                ✔ Montado
                              </span>
                            ) : (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-55 text-amber-800 border border-amber-200/50 uppercase tracking-wider">
                                Pendente
                              </span>
                            )
                          ) : (
                            del.status === 'A_ENTREGAR' ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-55 text-amber-800 border border-amber-200/50 uppercase tracking-wider">
                                A Entregar
                              </span>
                            ) : (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-55 text-emerald-800 border border-emerald-200/50 uppercase tracking-wider">
                                ✔ Entregue
                              </span>
                            )
                          )}
                        </td>
                        {userRole !== 'montador' && (
                          <td className="p-4 text-center">
                            {del.assemblyStatus === 'MONTADO' ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-55 text-blue-800 border border-blue-200/50 uppercase tracking-wider">
                                ✔ Montado
                              </span>
                            ) : del.assemblerId ? (
                              <div className="space-y-1">
                                <div className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${del.assemblySentToAssembler ? 'bg-blue-50 text-blue-800 border border-blue-200/50' : 'bg-amber-50 text-amber-800 border border-amber-200/50'}`}>
                                  {del.assemblerName} ({del.assemblyCommissionPercent || 0}%) {del.assemblySentToAssembler ? '' : '(Rascunho)'}
                                </div>
                                {(userRole === 'admin' || userRole === 'Proprietário / Adm Geral') && (
                                  <button
                                    onClick={() => handleOpenAssignModal(del)}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer block mx-auto mt-0.5"
                                  >
                                    Enviar / Editar
                                  </button>
                                )}
                              </div>
                            ) : userRole === 'admin' || userRole === 'Proprietário / Adm Geral' ? (
                              <button
                                onClick={() => handleOpenAssignModal(del)}
                                className="px-2 py-1 text-[10px] border border-slate-350 rounded-lg bg-white hover:bg-slate-50 font-bold text-slate-700 cursor-pointer w-full text-center"
                              >
                                Designar Montador
                              </button>
                            ) : (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200/50 uppercase tracking-wider">
                                Pendente
                              </span>
                            )}
                          </td>
                        )}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(userRole === 'montador' || userRole === 'entregador') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeliveryForProblem(del);
                                  setProblemType('Falta de Parafuso/Ferragens');
                                  setProblemDescription('');
                                  setIsProblemModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                                title="Reportar Problema"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                Problema
                              </button>
                            )}
                            {del.status === 'A_ENTREGAR' && (userRole === 'admin' || userRole === 'Proprietário / Adm Geral' || userRole === 'entregador' || userRole === 'montador') && (
                              <>
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(del.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Rota no Google Maps"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Maps</span>
                                </a>
                                <a
                                  href={`https://waze.com/ul?q=${encodeURIComponent(del.address)}&navigate=yes`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Rota no Waze"
                                >
                                  <Navigation className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Waze</span>
                                </a>
                              </>
                            )}
                            {del.status === 'A_ENTREGAR' && !del.outForDelivery && (userRole === 'entregador' || userRole === 'admin' || userRole === 'Proprietário / Adm Geral') && (
                              <button
                                type="button"
                                onClick={() => onStartDeliveryRoute && onStartDeliveryRoute(del.id)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Marcar como Saída para Rota"
                              >
                                <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Iniciar Rota</span>
                              </button>
                            )}
                            {del.status === 'A_ENTREGAR' && del.outForDelivery && (userRole === 'admin' || userRole === 'Proprietário / Adm Geral') && (
                              <button
                                type="button"
                                onClick={() => handleNotifyDelivery(del)}
                                className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Notificar Saída via WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                                <span>Notificar Saída</span>
                              </button>
                            )}
                            {userRole === 'montador' ? (
                              <button
                                onClick={() => {
                                  setSelectedDelivery(del);
                                  setAssemblyCustomerSigImg('');
                                  setAssemblerSigImg('');
                                  setAssemblySignError('');
                                  setIsAssemblySignModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 hover:translate-y-[-1px] cursor-pointer"
                                title="Registrar Montagem"
                              >
                                <PenTool className="w-3.5 h-3.5" />
                                {del.assemblyStatus === 'MONTADO' ? 'Ver Montagem' : 'Registrar Montagem'}
                              </button>
                            ) : userRole === 'entregador' && del.status === 'A_ENTREGAR' ? (
                              // Entregador: botão de colher assinaturas
                              <button
                                onClick={() => handleOpenSignModal(del)}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-650 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 hover:translate-y-[-1px] cursor-pointer"
                                title="Colher assinatura do cliente e registrar entrega"
                              >
                                <PenTool className="w-3.5 h-3.5" />
                                Colher Assinaturas
                              </button>
                            ) : (isAdmin) && del.status === 'A_ENTREGAR' ? (
                              // ADM: aguarda entregador ou confirma recebimento
                              del.delivererSignature ? (
                                <button
                                  onClick={() => handleOpenSignModal(del)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 hover:translate-y-[-1px] cursor-pointer"
                                  title="Entregador já assinou — confirmar recebimento como ADM"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Confirmar Recebimento
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase tracking-wider">
                                  <Clock className="w-3 h-3" />
                                  Aguardando Entregador
                                </span>
                              )
                            ) : del.status === 'ENTREGUE' ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenDetailModal(del)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Visualizar assinaturas registradas"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Ver Recibo
                                </button>
                                {isAdmin && onPrintDelivery && (
                                  <button
                                    onClick={() => onPrintDelivery(del)}
                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/50 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Imprimir / baixar comprovante de entrega"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimir
                                  </button>
                                )}
                              </div>
                            ) : null}
                            {userRole !== 'estoquista' && userRole !== 'entregador' && onDeleteDelivery && (
                              <button
                                onClick={() => {
                                  setDeliveryToDelete(del);
                                }}
                                className="p-1 px-2 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Deletar registro de entrega"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Cards */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredDeliveries.map(del => (
                  <div key={del.id} className="p-4 space-y-3" id={`delivery-card-${del.id}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm leading-snug">{del.customerName}</div>
                        <div className="text-[11px] text-blue-600 font-mono font-semibold mt-0.5">
                          {(del.notes?.match(/Pedido #([\w-]+)/)?.[1] || '').length > 10
                            ? `Pedido #${(del.notes?.match(/Pedido #([\w-]+)/)?.[1] || '').slice(-6)}`
                            : (del.notes?.match(/Pedido #([\w-]+)/)?.[1]
                              ? `Pedido #${del.notes.match(/Pedido #([\w-]+)/)![1]}`
                              : '')}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 font-sans">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[240px]" title={del.address}>{del.address}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {del.status === 'A_ENTREGAR' ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/50 uppercase tracking-wider whitespace-nowrap">
                            A Entregar
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/50 uppercase tracking-wider whitespace-nowrap">
                            ✔ Entregue
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs pt-1">
                      <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-slate-800 whitespace-pre-wrap leading-relaxed">
                        <strong className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Móveis e Volume</strong>
                        {del.itemsDescription}
                        {del.notes && (
                          <p className="text-[10px] text-slate-500 italic mt-1 border-t border-slate-200/60 pt-1">Obs: {del.notes}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600 bg-slate-50/50 p-2 rounded border border-slate-100">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block font-semibold tracking-wider">Entregador</span>
                          <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5 font-sans">
                            <User className="w-3.5 h-3.5 text-slate-400" /> {del.delivererName}
                          </span>
                          {userRole !== 'entregador' && (
                            <div className="mt-1.5">
                              {del.delivererId ? (
                                <div className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${del.deliverySentToDeliverer ? 'bg-blue-50 text-blue-800 border border-blue-200/50' : 'bg-amber-50 text-amber-800 border border-amber-200/50'}`}>
                                  {del.deliverySentToDeliverer ? 'Portal' : 'Rascunho'}
                                </div>
                              ) : null}
                              {(userRole === 'admin' || userRole === 'Proprietário / Adm Geral') && (
                                <button
                                  onClick={() => handleOpenAssignDelivererModal(del)}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer block mt-1"
                                >
                                  {del.delivererId ? 'Reatribuir' : 'Designar'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase block font-semibold tracking-wider">Data Programada</span>
                          <span className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5 font-sans">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> {del.scheduledDate.split('-').reverse().join('/')}
                          </span>
                          {del.deliveredAt && (
                            <span className="text-[9px] text-emerald-700 bg-emerald-55/15 px-1 py-0.2 rounded font-bold block mt-1">
                              Entregue às {new Date(del.deliveredAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          )}
                        </div>
                        {userRole !== 'montador' && (
                          <div className="col-span-2 mt-1">
                            {del.assemblyStatus === 'MONTADO' ? (
                              <span className="inline-flex w-full justify-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200/50 uppercase tracking-wider">
                                ✔ Montado
                              </span>
                            ) : del.assemblerId ? (
                              <div className="space-y-1 text-center">
                                <span className={`inline-flex w-full justify-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${del.assemblySentToAssembler ? 'bg-blue-50 text-blue-800 border border-blue-200/50' : 'bg-amber-50 text-amber-800 border border-amber-200/50'}`}>
                                  {del.assemblerName} ({del.assemblyCommissionPercent || 0}%) {del.assemblySentToAssembler ? '' : '(Rascunho)'}
                                </span>
                                {(userRole === 'admin' || userRole === 'Proprietário / Adm Geral') && (
                                  <button
                                    onClick={() => handleOpenAssignModal(del)}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 underline font-bold cursor-pointer block mx-auto"
                                  >
                                    Enviar / Editar
                                  </button>
                                )}
                              </div>
                            ) : (userRole === 'admin' || userRole === 'Proprietário / Adm Geral') && montadores.length > 0 ? (
                              <button
                                onClick={() => handleOpenAssignModal(del)}
                                className="w-full px-2 py-1 text-[10px] border border-slate-350 rounded-lg bg-white hover:bg-slate-50 font-bold text-slate-700 cursor-pointer text-center"
                              >
                                Designar Montador
                              </button>
                            ) : (
                              <span className="inline-flex w-full justify-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200/50 uppercase tracking-wider">
                                Montagem Pendente
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 w-full">
                        <div className="flex items-center gap-2 w-full justify-between">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(userRole === 'montador' || userRole === 'entregador') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDeliveryForProblem(del);
                                  setProblemType('Falta de Parafuso/Ferragens');
                                  setProblemDescription('');
                                  setIsProblemModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                Problema
                              </button>
                            )}
                            {del.status === 'A_ENTREGAR' && (userRole === 'admin' || userRole === 'Proprietário / Adm Geral' || userRole === 'entregador' || userRole === 'montador') && (
                              <>
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(del.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Rota no Google Maps"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Maps</span>
                                </a>
                                <a
                                  href={`https://waze.com/ul?q=${encodeURIComponent(del.address)}&navigate=yes`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Rota no Waze"
                                >
                                  <Navigation className="w-3.5 h-3.5 text-blue-500" />
                                  <span>Waze</span>
                                </a>
                              </>
                            )}
                            {del.status === 'A_ENTREGAR' && del.delivererId && (!del.needsAssembly || del.assemblerId) && !del.outForDelivery && (userRole === 'entregador' || userRole === 'admin' || userRole === 'Proprietário / Adm Geral') && (
                              <button
                                type="button"
                                onClick={() => onStartDeliveryRoute && onStartDeliveryRoute(del.id)}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Marcar como Saída para Rota"
                              >
                                <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Iniciar Rota</span>
                              </button>
                            )}
                            {del.status === 'A_ENTREGAR' && del.outForDelivery && (userRole === 'admin' || userRole === 'Proprietário / Adm Geral') && (
                              <button
                                type="button"
                                onClick={() => handleNotifyDelivery(del)}
                                className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Notificar Saída via WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                                <span>Notificar Saída</span>
                              </button>
                            )}
                            {userRole === 'montador' ? (
                              <button
                                onClick={() => {
                                  setSelectedDelivery(del);
                                  setAssemblyCustomerSigImg('');
                                  setAssemblerSigImg('');
                                  setAssemblySignError('');
                                  setIsAssemblySignModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <PenTool className="w-3.5 h-3.5" />
                                {del.assemblyStatus === 'MONTADO' ? 'Ver Montagem' : 'Registrar Montagem'}
                              </button>
                            ) : userRole === 'entregador' && del.status === 'A_ENTREGAR' ? (
                              // Entregador: colhe assinatura
                              <button
                                onClick={() => handleOpenSignModal(del)}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-650 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                id={`btn-sign-card-${del.id}`}
                              >
                                <PenTool className="w-3.5 h-3.5" />
                                Colher Assinatura
                              </button>
                            ) : isAdmin && del.status === 'A_ENTREGAR' ? (
                              // ADM: aguarda entregador ou confirma
                              del.delivererSignature ? (
                                <button
                                  onClick={() => handleOpenSignModal(del)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                  title="Entregador já assinou — confirmar recebimento como ADM"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Confirmar Recebimento
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase tracking-wider">
                                  <Clock className="w-3 h-3" />
                                  Aguardando Entregador
                                </span>
                              )
                            ) : del.status === 'ENTREGUE' ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleOpenDetailModal(del)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Ver Recibo
                                </button>
                                {isAdmin && onPrintDelivery && (
                                  <button
                                    onClick={() => onPrintDelivery(del)}
                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/50 font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Imprimir / baixar recibo com assinaturas"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimir
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </div>

                          {userRole !== 'estoquista' && userRole !== 'entregador' && userRole !== 'montador' && onDeleteDelivery && (
                            <button
                              onClick={() => setDeliveryToDelete(del)}
                              className="p-1 px-2.5 text-rose-600 hover:bg-rose-50 rounded border border-slate-200 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            </>
          ) : (
            <div className="text-center py-12 px-4">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum registro de entrega encontrado.</p>
              <p className="text-xs text-slate-400 mt-1">Refine o filtro ou agende novos móveis a serem transportados.</p>
            </div>
          )}
        </div>
      </div>

      {/* ADICIONAR NOVA ENTREGA MODAL */}
      {isAddModalOpen && (
        <AddDeliveryModal
          newCustomerName={newCustomerName}
          newCustomerPhone={newCustomerPhone}
          newAddress={newAddress}
          newDelivererName={newDelivererName}
          newDate={newDate}
          newItems={newItems}
          newNotes={newNotes}
          onChangeCustomerName={setNewCustomerName}
          onChangeCustomerPhone={setNewCustomerPhone}
          onChangeAddress={setNewAddress}
          onChangeDelivererName={setNewDelivererName}
          onChangeDate={setNewDate}
          onChangeItems={setNewItems}
          onChangeNotes={setNewNotes}
          onCancel={() => setIsAddModalOpen(false)}
          onSubmit={handleSaveDelivery}
        />
      )}

      {/* COLETAR ASSINATURA DIGITAL MODAL */}
      {isSignModalOpen && selectedDelivery && (
        <CollectDeliverySignatureModal
          delivery={selectedDelivery}
          isAdmin={isAdmin}
          isSaving={isSaving}
          signError={signError}
          refuseSignature={refuseSignatureDelivery}
          refusalName={refusalNameDelivery}
          refusalDob={refusalDobDelivery}
          refusalCpf={refusalCpfDelivery}
          deliveryPhotoImg={deliveryPhotoImg}
          onToggleRefuseSignature={(checked) => {
            setRefuseSignatureDelivery(checked);
            setCustomerSigImg('');
            setSignError('');
          }}
          onChangeCustomerSignature={(url) => {
            setCustomerSigImg(url);
            setSignError('');
          }}
          onChangeDelivererSignature={(url) => {
            setDelivererSigImg(url);
            setSignError('');
          }}
          onChangeRefusalName={setRefusalNameDelivery}
          onChangeRefusalDob={setRefusalDobDelivery}
          onChangeRefusalCpf={setRefusalCpfDelivery}
          onChangeDeliveryPhoto={(url) => {
            setDeliveryPhotoImg(url);
            setSignError('');
          }}
          onCancel={() => setIsSignModalOpen(false)}
          onSubmit={handleSubmitSigs}
        />
      )}

      {/* ASSEMBLY SIGNATURE MODAL */}
      {isAssemblySignModalOpen && selectedDelivery && (
        <CollectAssemblySignatureModal
          delivery={selectedDelivery}
          isSaving={isAssemblySaving}
          signError={assemblySignError}
          refuseSignature={refuseSignatureAssembly}
          refusalName={refusalNameAssembly}
          refusalDob={refusalDobAssembly}
          refusalCpf={refusalCpfAssembly}
          assemblyPhotoImg={assemblyPhotoImg}
          onToggleRefuseSignature={(checked) => {
            setRefuseSignatureAssembly(checked);
            setAssemblyCustomerSigImg('');
            setAssemblySignError('');
          }}
          onChangeAssemblerSignature={(url) => {
            setAssemblerSigImg(url);
            setAssemblySignError('');
          }}
          onChangeCustomerSignature={(url) => {
            setAssemblyCustomerSigImg(url);
            setAssemblySignError('');
          }}
          onChangeRefusalName={setRefusalNameAssembly}
          onChangeRefusalDob={setRefusalDobAssembly}
          onChangeRefusalCpf={setRefusalCpfAssembly}
          onChangeAssemblyPhoto={(url) => {
            setAssemblyPhotoImg(url);
            setAssemblySignError('');
          }}
          onCancel={() => setIsAssemblySignModalOpen(false)}
          onSubmit={handleSubmitAssemblySigs}
        />
      )}

      {/* REPORTAR PROBLEMA MODAL */}
      {isProblemModalOpen && selectedDeliveryForProblem && (
        <ReportProblemModal
          delivery={selectedDeliveryForProblem}
          problemType={problemType}
          problemDescription={problemDescription}
          onChangeProblemType={setProblemType}
          onChangeProblemDescription={setProblemDescription}
          onCancel={() => {
            setIsProblemModalOpen(false);
            setSelectedDeliveryForProblem(null);
            setProblemDescription('');
          }}
          onSend={handleSendProblemReport}
        />
      )}

      {/* RECIBO DETALHADO MODAL */}
      {isDetailModalOpen && selectedDelivery && (
        <DeliveryReceiptModal
          delivery={selectedDelivery}
          isAdmin={isAdmin}
          onClose={() => setIsDetailModalOpen(false)}
          onPrint={onPrintDelivery}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {deliveryToDelete && (
        <DeleteConfirmationDialog
          domId="delete-delivery-dialog"
          icon={<X className="w-6 h-6 animate-pulse" />}
          title="Remover Entrega"
          message={<>Tem certeza que deseja remover a entrega programada para <strong className="text-slate-800 font-semibold">"{deliveryToDelete.customerName}"</strong> do painel de controle?</>}
          confirmLabel="Sim, Remover"
          onCancel={() => setDeliveryToDelete(null)}
          onConfirm={() => {
            if (onDeleteDelivery) {
              onDeleteDelivery(deliveryToDelete.id);
            }
            setDeliveryToDelete(null);
          }}
        />
      )}

      {/* DESIGNAR MONTADOR E COMISSÃO MODAL */}
      {isAssignModalOpen && assignDelivery && (
        <AssignAssemblerModal
          delivery={assignDelivery}
          montadores={montadores}
          selectedAssemblerId={selectedAssemblerId}
          assemblerCommission={assemblerCommission}
          assignError={assignError}
          onSelectAssembler={handleSelectAssembler}
          onChangeCommission={setAssemblerCommission}
          onCancel={() => { setIsAssignModalOpen(false); setAssignDelivery(null); }}
          onSave={handleSaveAssignment}
        />
      )}

      {/* DESIGNAR ENTREGADOR MODAL */}
      {isAssignDelivererModalOpen && assignDelivererTarget && (
        <AssignDelivererModal
          delivery={assignDelivererTarget}
          entregadores={entregadores}
          selectedDelivererId={selectedDelivererId}
          assignDelivererError={assignDelivererError}
          onSelectDeliverer={setSelectedDelivererId}
          onCancel={() => { setIsAssignDelivererModalOpen(false); setAssignDelivererTarget(null); }}
          onSave={handleSaveDelivererAssignment}
        />
      )}
    </div>
  );
}
