/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle,
  FileText,
  SearchIcon,
  Home
} from 'lucide-react';
import { Customer } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void> | void;
  onUpdateCustomer: (customer: Customer) => Promise<void> | void;
  onDeleteCustomer: (id: string) => Promise<void> | void;
}

// Helper: Formata CPF
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

// Helper: Formata CEP
const formatCEP = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
};

// Helper: Valida CPF
const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleanCPF)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form States (Add)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit States
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editCep, setEditCep] = useState('');
  const [editStreet, setEditStreet] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editComplement, setEditComplement] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [loadingEditCep, setLoadingEditCep] = useState(false);

  // Delete State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Search Filter
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.cpf && c.cpf.includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.address && c.address.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // CEP API Lookup Helper
  const handleCepLookup = async (cepValue: string, isEdit: boolean) => {
    const cleanCEP = cepValue.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      if (isEdit) setLoadingEditCep(true);
      else setLoadingCep(true);

      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (isEdit) {
            setEditStreet(data.logradouro || '');
            setEditNeighborhood(data.bairro || '');
            setEditCity(data.localidade || '');
            setEditState(data.uf || '');
          } else {
            setStreet(data.logradouro || '');
            setNeighborhood(data.bairro || '');
            setCity(data.localidade || '');
            setState(data.uf || '');
          }
        }
      } catch (err) {
        console.error("ViaCEP Lookup Failed", err);
      } finally {
        if (isEdit) setLoadingEditCep(false);
        else setLoadingCep(false);
      }
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    setFormSuccess(null);

    if (!name.trim() || !phone.trim() || !cpf.trim()) {
      setFormError("Nome, Telefone e CPF são campos obrigatórios.");
      return;
    }

    const cleanCPF = cpf.replace(/\D/g, '');
    if (!validateCPF(cleanCPF)) {
      setFormError("CPF inválido. Por favor, insira um CPF válido.");
      return;
    }

    // Validação de Duplicidade
    const isDuplicate = customers.some(c => c.cpf === cleanCPF);
    if (isDuplicate) {
      setFormError("Já existe um cliente cadastrado com este CPF/CNPJ.");
      return;
    }

    if (!street.trim() || !number.trim() || !neighborhood.trim() || !city.trim() || !state.trim()) {
      setFormError("O endereço completo (Rua, Número, Bairro, Cidade e Estado) é obrigatório.");
      return;
    }

    const fullAddress = street.trim() 
      ? `${street.trim()}, ${number.trim()}${complement.trim() ? ` - ${complement.trim()}` : ''} - ${neighborhood.trim()}, ${city.trim()} - ${state.trim()}${cep.trim() ? ` (CEP: ${cep.trim()})` : ''}`
      : '';

    setIsSubmitting(true);
    try {
      await onAddCustomer({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: fullAddress || undefined,
        cpf: cleanCPF,
        cep: cep.trim() || undefined,
        street: street.trim() || undefined,
        number: number.trim() || undefined,
        complement: complement.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined
      });
      
      setFormSuccess("Cliente cadastrado com sucesso!");
      setName('');
      setPhone('');
      setEmail('');
      setCpf('');
      setCep('');
      setStreet('');
      setNumber('');
      setComplement('');
      setNeighborhood('');
      setCity('');
      setState('');
      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err: any) {
      alert("Erro ao cadastrar cliente: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || isSubmitting) return;

    if (!editName.trim() || !editPhone.trim() || !editCpf.trim()) {
      alert("Nome, Telefone e CPF são campos obrigatórios.");
      return;
    }

    const cleanCPF = editCpf.replace(/\D/g, '');
    if (!validateCPF(cleanCPF)) {
      alert("CPF inválido. Por favor, insira um CPF válido.");
      return;
    }

    if (!editStreet.trim() || !editNumber.trim() || !editNeighborhood.trim() || !editCity.trim() || !editState.trim()) {
      alert("O endereço completo (Rua, Número, Bairro, Cidade e Estado) é obrigatório.");
      return;
    }

    const fullAddress = editStreet.trim() 
      ? `${editStreet.trim()}, ${editNumber.trim()}${editComplement.trim() ? ` - ${editComplement.trim()}` : ''} - ${editNeighborhood.trim()}, ${editCity.trim()} - ${editState.trim()}${editCep.trim() ? ` (CEP: ${editCep.trim()})` : ''}`
      : '';

    setIsSubmitting(true);
    try {
      await onUpdateCustomer({
        ...editingCustomer,
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
        address: fullAddress || undefined,
        cpf: cleanCPF,
        cep: editCep.trim() || undefined,
        street: editStreet.trim() || undefined,
        number: editNumber.trim() || undefined,
        complement: editComplement.trim() || undefined,
        neighborhood: editNeighborhood.trim() || undefined,
        city: editCity.trim() || undefined,
        state: editState.trim() || undefined
      });
      setEditingCustomer(null);
      alert("Cadastro de cliente atualizado com sucesso!");
    } catch (err) {
      alert("Erro ao atualizar cliente.");
    }
  };

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600" />
          <span>Cadastro e Gestão de Clientes</span>
        </h1>
        <p className="text-sm text-slate-500">Cadastre clientes com CPF obrigatório e endereço completo para emissão futura de Notas Fiscais (NF-e).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Add Customer Form */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-max">
          <h3 className="text-base font-bold font-display text-slate-900 mb-3 flex items-center gap-1.5">
            <Plus className="w-4.5 h-4.5 text-blue-600 font-bold" /> Novo Cliente
          </h3>
          
          <form onSubmit={handleAddSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nome Completo <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  CPF <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  WhatsApp / Celular <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="(73) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-semibold"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                E-mail (Opcional)
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-blue-600" /> Endereço de Faturamento (NF-e)
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="00000-000"
                      value={cep}
                      maxLength={9}
                      onChange={(e) => {
                        const val = formatCEP(e.target.value);
                        setCep(val);
                        handleCepLookup(val, false);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-all text-slate-800 font-bold"
                    />
                    {loadingCep && (
                      <span className="absolute right-2 top-2 text-[9px] text-slate-400 animate-pulse">Buscando...</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Estado / UF</label>
                  <input
                    type="text"
                    placeholder="UF"
                    value={state}
                    maxLength={2}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cidade</label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bairro</label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Rua / Logradouro</label>
                  <input
                    type="text"
                    placeholder="Rua..."
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Número</label>
                  <input
                    type="text"
                    placeholder="Nº"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Complemento (Opcional)</label>
                <input
                  type="text"
                  placeholder="Apto, Bloco, etc."
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                />
              </div>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 text-[11px] rounded-lg">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSubmitting ? 'Processando...' : 'Cadastrar Cliente'}
            </button>
          </form>
        </div>

        {/* Right column: Customer List */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 mb-1">Clientes Registrados</h3>
              <p className="text-xs text-slate-500 font-sans">Lista de clientes sincronizados em tempo real.</p>
            </div>
            
            {/* Search bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou tel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl bg-white">
            {filteredCustomers.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/60">
                    <th className="p-3">Nome / CPF</th>
                    <th className="p-3">Contato</th>
                    <th className="p-3">Endereço de Faturamento</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono font-semibold">CPF: {cust.cpf ? formatCPF(cust.cpf) : 'Não informado'}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">Cadastrado em {new Date(cust.createdAt).toLocaleDateString('pt-BR')}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 text-slate-700 font-semibold">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{cust.phone}</span>
                        </div>
                        {cust.email && (
                          <div className="flex items-center gap-1 text-slate-500 text-[10px] mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{cust.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-655 max-w-[240px] truncate" title={cust.address || ''}>
                        {cust.address ? (
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="break-words line-clamp-2">{cust.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-350 italic">Sem endereço cadastrado</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(cust);
                              setEditName(cust.name);
                              setEditPhone(cust.phone);
                              setEditEmail(cust.email || '');
                              setEditCpf(cust.cpf ? formatCPF(cust.cpf) : '');
                              setEditCep(cust.cep || '');
                              setEditStreet(cust.street || '');
                              setEditNumber(cust.number || '');
                              setEditComplement(cust.complement || '');
                              setEditNeighborhood(cust.neighborhood || '');
                              setEditCity(cust.city || '');
                              setEditState(cust.state || '');
                            }}
                            className="p-1 text-blue-650 hover:bg-blue-50 border border-blue-100 hover:border-transparent rounded cursor-pointer"
                            title="Editar Cliente"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(cust)}
                            className="p-1 text-rose-500 hover:bg-rose-50 border border-rose-100 hover:border-transparent rounded cursor-pointer"
                            title="Excluir Cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                <p className="text-slate-800 font-semibold text-sm">Nenhum cliente encontrado</p>
                <p className="text-xs text-slate-400 mt-0.5">Cadastre novos clientes no menu lateral esquerdo.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal Dialog */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="edit-customer-dialog">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b pb-3 shrink-0">
              <h3 className="text-base font-bold font-display text-slate-900">Editar Cadastro do Cliente</h3>
              <button onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">✕</button>
            </div>
            
            <form
              onSubmit={handleEditSubmit}
              className="space-y-4 text-left overflow-y-auto pr-1"
            >
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Completo <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CPF <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editCpf}
                    onChange={(e) => setEditCpf(formatCPF(e.target.value))}
                    maxLength={14}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Telefone / WhatsApp <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800 font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-blue-600" /> Endereço de Faturamento (NF-e)
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">CEP</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="00000-000"
                        value={editCep}
                        maxLength={9}
                        onChange={(e) => {
                          const val = formatCEP(e.target.value);
                          setEditCep(val);
                          handleCepLookup(val, true);
                        }}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                      />
                      {loadingEditCep && (
                        <span className="absolute right-2 top-2 text-[9px] text-slate-400 animate-pulse">Buscando...</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">UF</label>
                    <input
                      type="text"
                      placeholder="UF"
                      value={editState}
                      maxLength={2}
                      onChange={(e) => setEditState(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cidade</label>
                    <input
                      type="text"
                      placeholder="Cidade"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Bairro</label>
                    <input
                      type="text"
                      placeholder="Bairro"
                      value={editNeighborhood}
                      onChange={(e) => setEditNeighborhood(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Rua / Logradouro</label>
                    <input
                      type="text"
                      placeholder="Rua..."
                      value={editStreet}
                      onChange={(e) => setEditStreet(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Número</label>
                    <input
                      type="text"
                      placeholder="Nº"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50 text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Complemento</label>
                  <input
                    type="text"
                    placeholder="Complemento"
                    value={editComplement}
                    onChange={(e) => setEditComplement(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 text-white text-sm font-bold rounded-lg shadow-sm cursor-pointer transition-colors ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in" id="delete-customer-dialog">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 transform scale-100 transition-all duration-300">
            <div className="p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">Excluir Cadastro do Cliente</h3>
              <p className="text-sm text-slate-500 mb-6 px-2">
                Tem certeza de que deseja excluir o cadastro de <strong className="text-slate-850 font-semibold">{customerToDelete.name}</strong>? Esta ação removerá o registro permanentemente do sistema.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-655 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteCustomer(customerToDelete.id);
                    setCustomerToDelete(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Excluir Registro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
