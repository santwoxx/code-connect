import React, { useState } from 'react';
import { 
  KeyRound, 
  ShieldAlert, 
  LogOut, 
  CheckCircle,
  HelpCircle,
  Lock,
  Compass,
  ArrowRight,
  Truck,
  User as UserIcon,
  ShoppingBag,
  Package,
  DollarSign,
  Download
} from 'lucide-react';
import { signInWithPopup, signInAnonymously, signOut, User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, googleProvider, MASTER_PASSWORD, functions } from '../firebase';
import { checkEmailIsAllowed, getMasterPin, saveMasterPin, getUserRole, fetchSellers, saveSeller, logAuditEvent, fetchDeliverers, saveDeliverer, linkDelivererDevice, fetchEstoquistas, fetchCaixas, saveEstoquista, saveCaixa, fetchMontadores, saveMontador, linkMontadorDevice, fetchUserCustomPin } from '../db';
import { Seller, Deliverer, Estoquista, Caixa, Montador } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User, customRole?: string, entityId?: string, entityName?: string) => void;
}

// Utility to securely hash passwords
async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Google login, 2: Master Password prompt, 3: Create Master Password (first access)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  
  // PWA Install states
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  React.useEffect(() => {
    // Check if the prompt was already captured globally
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setShowInstallBtn(true);
    }

    const handleAppInstallable = () => {
      setDeferredPrompt(window.deferredPrompt);
      setShowInstallBtn(true);
    };

    window.addEventListener('app-installable', handleAppInstallable);
    
    // Also keep the original listener just in case
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('app-installable', handleAppInstallable);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBtn(false);
      }
      setDeferredPrompt(null);
    }
  };
  
  // First access secure setup password states
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('');

  // Troubleshooting states for Firebase redirect domain limits in preview/deployed sandbox environments
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  // Custom states for Delivery Driver Mode
  const [loginMode, setLoginMode] = useState<'manager' | 'entregador' | 'vendedor' | 'estoquista' | 'caixa' | 'montador'>('manager');
  const [entregadorUsername, setEntregadorUsername] = useState('');
  const [entregadorPassword, setEntregadorPassword] = useState('');

  // Montador states
  const [montadorUsername, setMontadorUsername] = useState('');
  const [montadorPassword, setMontadorPassword] = useState('');

  // Vendedor states
  const [vendedorUsername, setVendedorUsername] = useState('');
  const [vendedorPassword, setVendedorPassword] = useState('');

  // Estoquista states
  const [estoquistaUsername, setEstoquistaUsername] = useState('');
  const [estoquistaPassword, setEstoquistaPassword] = useState('');

  // Caixa states
  const [caixaUsername, setCaixaUsername] = useState('');
  const [caixaPassword, setCaixaPassword] = useState('');

  // Manager (admin) credential states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Vendedores compartilham uma única conta Google (vendacentralmoveis@gmail.com).
  // handleLogout não desloga essa conta do Firebase ao trocar de vendedor (só limpa
  // o vendedor atual), então se essa sessão Google ainda estiver ativa ao montar a
  // tela, pula direto para a etapa de usuário/senha em vez de reabrir o popup do
  // Google — a troca de vendedor continua exigindo usuário/senha normalmente.
  React.useEffect(() => {
    const existingUser = auth.currentUser;
    if (existingUser && existingUser.email?.toLowerCase() === 'vendacentralmoveis@gmail.com') {
      setLoginMode('vendedor');
      setCurrentUser(existingUser);
      setStep(2);
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDomain(text);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  const handleDirectEntregadorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const cleanUser = entregadorUsername.trim().toLowerCase();
    const pass = entregadorPassword;

    try {
      const authFn = httpsCallable(functions, 'authenticateRole');
      const response = await authFn({ role: 'entregador', username: cleanUser, password: pass });
      const data = response.data as any;

      if (!data.success) {
        setErrorMsg(data.error);
        setLoading(false);
        return;
      }

      const target = data.user;

      if (target.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        setLoading(false);
        return;
      }

      // Autentica de verdade no Firebase (sessão anônima) e vincula ao cadastro,
      // pra que as regras do Firestore consigam confirmar quem é o entregador logado.
      const cred = await signInAnonymously(auth);
      await linkDelivererDevice(target.id, cred.user.uid);

      const mockUser = {
        uid: cred.user.uid,
        email: target.googleEmail || `${target.username}@centralsync.com`,
        displayName: target.name
      } as any;

      await logAuditEvent("Login Entregador", `Entregador ${target.name} logou via credenciais diretas.`);
      onLoginSuccess(mockUser, 'entregador', target.id, target.name);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao validar credenciais do entregador: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDirectMontadorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const cleanUser = montadorUsername.trim().toLowerCase();
    const pass = montadorPassword;

    try {
      const authFn = httpsCallable(functions, 'authenticateRole');
      const response = await authFn({ role: 'montador', username: cleanUser, password: pass });
      const data = response.data as any;

      if (!data.success) {
        setErrorMsg(data.error);
        setLoading(false);
        return;
      }

      const target = data.user;

      if (target.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        setLoading(false);
        return;
      }

      // Autentica de verdade no Firebase (sessão anônima) e vincula ao cadastro,
      // pra que as regras do Firestore consigam confirmar quem é o montador logado.
      const cred = await signInAnonymously(auth);
      await linkMontadorDevice(target.id, cred.user.uid);

      const mockUser = {
        uid: cred.user.uid,
        email: target.googleEmail || `${target.username}@centralsync.com`,
        displayName: target.name
      } as any;

      await logAuditEvent("Login Montador", `Montador ${target.name} logou via credenciais diretas.`);
      onLoginSuccess(mockUser, 'montador', target.id, target.name);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao validar credenciais do montador: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInForVendedor = async () => {
    setLoading(true);
    setErrorMsg(null);
    if (!navigator.onLine) {
      setErrorMsg("Sem conexão com a internet. Verifique sua rede Wi-Fi/dados e tente novamente.");
      setLoading(false);
      return;
    }
    localStorage.setItem('centralsync_linking', 'true');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error("Não foi possível obter o e-mail da conta Google.");
      }

      // Check if user email is authorized in Firestore database rules
      const isAllowed = await checkEmailIsAllowed(user.email);
      if (!isAllowed) {
        setErrorMsg(`Acesso Bloqueado: O e-mail (${user.email}) não está autorizado no CentralSync Central. Solicite permissão ao administrador corporativo.`);
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }

      const cleanEmail = user.email.toLowerCase();
      
      // Auto-route shared accounts to their proper roles
      if (cleanEmail === 'estoquecentralmoveis@gmail.com') {
        setLoginMode('estoquista');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }
      if (cleanEmail === 'caixacentralmoveis@gmail.com') {
        setLoginMode('caixa');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }

      // Check if already linked
      const sellerList = await fetchSellers();
      const matched = sellerList.find((s) => s.googleEmail?.toLowerCase() === user.email.toLowerCase());

      // Always require credential verification — even if already linked via Google
      if (matched && matched.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }
      // Always go to step 2 to verify username + password
      setCurrentUser(user);
      setStep(2);
    } catch (e: any) {
      console.error(e);
      localStorage.removeItem('centralsync_linking');
      const errCode = e.code || '';
      const errMessage = e.message || '';
      if (errCode === 'auth/unauthorized-domain' || errMessage.toLowerCase().includes('unauthorized-domain')) {
        setShowDomainHelp(true);
        setErrorMsg("Erro de Domínio Não Autorizado (Firebase Auth).");
      } else if (errCode === 'auth/network-request-failed') {
        setErrorMsg("Falha de conexão durante a autenticação. Verifique sua internet e tente novamente.");
      } else {
        setErrorMsg(errMessage || "Ocorreu um erro ao autenticar no Google como Vendedor.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySellerCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!currentUser || !currentUser.email) {
      setErrorMsg("Sessão Google inválida.");
      setLoading(false);
      return;
    }

    try {
      const authFn = httpsCallable(functions, 'authenticateRole');
      const response = await authFn({ role: 'vendedor', username: vendedorUsername.trim().toLowerCase(), password: vendedorPassword });
      const data = response.data as any;

      if (!data.success) {
        setErrorMsg(data.error);
        setLoading(false);
        return;
      }

      const targetSeller = data.user;

      if (targetSeller.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        setLoading(false);
        return;
      }

      // Check Google link mapping
      if (targetSeller.googleEmail) {
        if (targetSeller.googleEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
          setErrorMsg(`Erro de Vínculo: Este usuário já está vinculado a outra conta Google (${targetSeller.googleEmail}).`);
          setLoading(false);
          return;
        }
      } else {
        // Link Google account to this seller internal record
        const linkedSeller: Seller = {
          ...targetSeller,
          googleEmail: currentUser.email
        };
        await saveSeller(linkedSeller);
        await logAuditEvent("Vínculo Vendedor", `Conta Google ${currentUser.email} vinculada ao vendedor ${targetSeller.name}.`);
      }

      localStorage.removeItem('centralsync_linking');
      // Successfully logged in!
      await logAuditEvent("Login Vendedor", `Vendedor ${targetSeller.name} logou via Google.`);
      onLoginSuccess(currentUser, 'vendedor', targetSeller.id, targetSeller.name);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro durante validação do vendedor: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    if (!navigator.onLine) {
      setErrorMsg("Sem conexão com a internet. Verifique sua rede Wi-Fi/dados e tente novamente.");
      setLoading(false);
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error("Não foi possível obter o e-mail da conta Google.");
      }

      // Check if user email is authorized in Firestore database rules
      const isAllowed = await checkEmailIsAllowed(user.email);
      if (!isAllowed) {
        setErrorMsg(`Acesso Bloqueado: O e-mail (${user.email}) não está autorizado no CentralSync Central. Solicite permissão ao administrador corporativo.`);
        await signOut(auth);
        setLoading(false);
        return;
      }

      const cleanEmail = user.email.toLowerCase();
      
      // Auto-route shared accounts to their proper roles
      if (cleanEmail === 'vendacentralmoveis@gmail.com') {
        setLoginMode('vendedor');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }
      if (cleanEmail === 'estoquecentralmoveis@gmail.com') {
        setLoginMode('estoquista');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }
      if (cleanEmail === 'caixacentralmoveis@gmail.com') {
        setLoginMode('caixa');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }

      // Email is authorized! Always require credentials step — no direct entry
      setCurrentUser(user);
      // Pre-fill admin username with their email for convenience
      setAdminUsername(user.email);
      const dbPin = await getMasterPin();
      if (cleanEmail === 'centralmoveis26@gmail.com') {
        setStep(2);
      } else if (!dbPin) {
        // First access! Route to step 3 to let user create the system master password
        setStep(3);
      } else {
        // Require master password verification (step 2)
        setStep(2);
      }
    } catch (e: any) {
      console.error(e);
      const errCode = e.code || '';
      const errMessage = e.message || '';
      if (errCode === 'auth/unauthorized-domain' || errMessage.toLowerCase().includes('unauthorized-domain')) {
        setShowDomainHelp(true);
        setErrorMsg("Erro de Domínio Não Autorizado (Firebase Auth). Para liberar o Login Google na URL deste ambiente de testes, siga o guia de reparação abaixo.");
      } else if (errCode === 'auth/popup-closed-by-user') {
        setErrorMsg("A autenticação via Google foi cancelada antes de terminar.");
      } else if (errCode === 'auth/network-request-failed') {
        setErrorMsg("Falha de conexão durante a autenticação. Verifique sua internet e tente novamente.");
      } else {
        setErrorMsg(errMessage || "Ocorreu um erro ao autenticar no Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyManagerCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!currentUser || !currentUser.email) {
      setErrorMsg("Sessão Google inválida. Faça login novamente.");
      setLoading(false);
      return;
    }

    // Validate that the typed username matches the Google email
    if (adminUsername.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
      setErrorMsg("Usuário inválido: o nome de usuário deve ser o e-mail da conta Google autenticada.");
      setLoading(false);
      return;
    }

    try {
      const activePin = await getMasterPin() || MASTER_PASSWORD;
      const inputPin = adminPassword.trim();
      const userEmail = currentUser.email.toLowerCase();

      // Check per-user custom PIN first (stored in Firestore, never in source code)
      const userCustomPin = await fetchUserCustomPin(userEmail);

      let isPasswordValid = false;
      if (userCustomPin && inputPin === userCustomPin) {
        // User has their own PIN configured in Firestore
        isPasswordValid = true;
      } else if (inputPin === activePin || inputPin === MASTER_PASSWORD) {
        // Fall back to global master PIN
        isPasswordValid = true;
      }

      if (!isPasswordValid) {
        setErrorMsg("Senha Master incorreta! Verifique e tente novamente.");
        setLoading(false);
        return;
      }

      await logAuditEvent("Login Administrativo", `Administrador ${currentUser.email} autenticou com Google + Senha Master.`);
      onLoginSuccess(currentUser);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao verificar credenciais: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInForEntregador = async () => {
    setLoading(true);
    setErrorMsg(null);
    localStorage.setItem('centralsync_linking', 'true');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error("Não foi possível obter o e-mail da conta Google.");
      }

      // Check if user email is authorized in Firestore database rules
      const isAllowed = await checkEmailIsAllowed(user.email);
      if (!isAllowed) {
        setErrorMsg(`Acesso Bloqueado: O e-mail (${user.email}) não está autorizado no CentralSync Central. Solicite permissão ao administrador corporativo.`);
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }

      const cleanEmail = user.email.toLowerCase();
      
      // Auto-route shared accounts to their proper roles
      if (cleanEmail === 'vendacentralmoveis@gmail.com') {
        setLoginMode('vendedor');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }
      if (cleanEmail === 'estoquecentralmoveis@gmail.com') {
        setLoginMode('estoquista');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }
      if (cleanEmail === 'caixacentralmoveis@gmail.com') {
        setLoginMode('caixa');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }

      // Check if already linked
      const delivererList = await fetchDeliverers();
      const matched = delivererList.find((d) => d.googleEmail?.toLowerCase() === user.email.toLowerCase());

      // Always require credential verification — even if already linked via Google
      if (matched && matched.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }
      // Always go to step 2 to verify username + password
      setCurrentUser(user);
      setStep(2);
    } catch (e: any) {
      console.error(e);
      localStorage.removeItem('centralsync_linking');
      const errCode = e.code || '';
      const errMessage = e.message || '';
      if (errCode === 'auth/unauthorized-domain' || errMessage.toLowerCase().includes('unauthorized-domain')) {
        setShowDomainHelp(true);
        setErrorMsg("Erro de Domínio Não Autorizado (Firebase Auth).");
      } else {
        setErrorMsg(errMessage || "Ocorreu um erro ao autenticar no Google como Entregador.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDelivererCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!currentUser || !currentUser.email) {
      setErrorMsg("Sessão Google inválida.");
      setLoading(false);
      return;
    }

    const cleanUser = entregadorUsername.trim().toLowerCase();
    const pass = entregadorPassword;

    // Support legacy fallback
    if (cleanUser === 'central entregas' && pass === '@#central@#') {
      await logAuditEvent("Vínculo Entregador", `Conta Google ${currentUser.email} vinculada ao entregador legado.`);
      localStorage.removeItem('centralsync_linking');
      
      const mockUser = {
        uid: 'central-entregas-id',
        email: 'central_entregas@centralsync.com',
        displayName: 'Central Entregas'
      } as any;
      onLoginSuccess(mockUser, 'entregador');
      setLoading(false);
      return;
    }

    try {
      const authFn = httpsCallable(functions, 'authenticateRole');
      const response = await authFn({ role: 'entregador', username: cleanUser, password: pass });
      const data = response.data as any;

      if (!data.success) {
        setErrorMsg(data.error);
        setLoading(false);
        return;
      }

      const targetDeliverer = data.user;

      if (targetDeliverer.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        setLoading(false);
        return;
      }

      // Check Google link mapping
      if (targetDeliverer.googleEmail) {
        if (targetDeliverer.googleEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
          setErrorMsg(`Erro de Vínculo: Este usuário já está vinculado a outra conta Google (${targetDeliverer.googleEmail}).`);
          setLoading(false);
          return;
        }
      } else {
        // Link Google account to this deliverer document
        const linkedDeliverer = {
          ...targetDeliverer,
          googleEmail: currentUser.email
        };
        await saveDeliverer(linkedDeliverer);
        await logAuditEvent("Vínculo Entregador", `Conta Google ${currentUser.email} vinculada ao entregador ${targetDeliverer.name}.`);
      }

      localStorage.removeItem('centralsync_linking');
      await logAuditEvent("Login Entregador", `Entregador ${targetDeliverer.name} logou via Google.`);
      onLoginSuccess(currentUser, 'entregador', targetDeliverer.id, targetDeliverer.name);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro durante validação do entregador: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInForEstoquista = async () => {
    setLoading(true);
    setErrorMsg(null);
    localStorage.setItem('centralsync_linking', 'true');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error("Não foi possível obter o e-mail da conta Google.");
      }

      // Check if user email is authorized in Firestore database rules
      const isAllowed = await checkEmailIsAllowed(user.email);
      if (!isAllowed) {
        setErrorMsg(`Acesso Bloqueado: O e-mail (${user.email}) não está autorizado no CentralSync Central. Solicite permissão ao administrador corporativo.`);
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }

      const cleanEmail = user.email.toLowerCase();
      
      // Auto-route shared accounts to their proper roles
      if (cleanEmail === 'vendacentralmoveis@gmail.com') {
        setLoginMode('vendedor');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }
      if (cleanEmail === 'caixacentralmoveis@gmail.com') {
        setLoginMode('caixa');
        setCurrentUser(user);
        setStep(2);
        setLoading(false);
        return;
      }

      // Check if already linked
      const estoquistaList = await fetchEstoquistas();
      const matched = estoquistaList.find((e) => e.googleEmail?.toLowerCase() === user.email.toLowerCase());

      // Always require credential verification — even if already linked via Google
      if (matched && matched.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }
      // Always go to step 2 to verify username + password
      setCurrentUser(user);
      setStep(2);
    } catch (e: any) {
      console.error(e);
      localStorage.removeItem('centralsync_linking');
      const errCode = e.code || '';
      const errMessage = e.message || '';
      if (errCode === 'auth/unauthorized-domain' || errMessage.toLowerCase().includes('unauthorized-domain')) {
        setShowDomainHelp(true);
        setErrorMsg("Erro de Domínio Não Autorizado (Firebase Auth).");
      } else {
        setErrorMsg(errMessage || "Ocorreu um erro ao autenticar no Google como Estoquista.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInForCaixa = async () => {
    setLoading(true);
    setErrorMsg(null);
    localStorage.setItem('centralsync_linking', 'true');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error("Não foi possível obter o e-mail da conta Google.");
      }

      // Check if user email is authorized in Firestore database rules
      const isAllowed = await checkEmailIsAllowed(user.email);
      if (!isAllowed) {
        setErrorMsg(`Acesso Bloqueado: O e-mail (${user.email}) não está autorizado no CentralSync Central. Solicite permissão ao administrador corporativo.`);
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }

      // Check if already linked
      const caixaList = await fetchCaixas();
      const matched = caixaList.find((c) => c.googleEmail?.toLowerCase() === user.email.toLowerCase());

      // Always require credential verification — even if already linked via Google
      if (matched && matched.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }
      // Always go to step 2 to verify username + password
      setCurrentUser(user);
      setStep(2);
    } catch (e: any) {
      console.error(e);
      localStorage.removeItem('centralsync_linking');
      const errCode = e.code || '';
      const errMessage = e.message || '';
      if (errCode === 'auth/unauthorized-domain' || errMessage.toLowerCase().includes('unauthorized-domain')) {
        setShowDomainHelp(true);
        setErrorMsg("Erro de Domínio Não Autorizado (Firebase Auth).");
      } else {
        setErrorMsg(errMessage || "Ocorreu um erro ao autenticar no Google como Caixa.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEstoquistaCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!currentUser || !currentUser.email) {
      setErrorMsg("Sessão Google inválida.");
      setLoading(false);
      return;
    }

    try {
      const authFn = httpsCallable(functions, 'authenticateRole');
      const response = await authFn({ role: 'estoquista', username: estoquistaUsername.trim().toLowerCase(), password: estoquistaPassword });
      const data = response.data as any;

      if (!data.success) {
        setErrorMsg(data.error);
        setLoading(false);
        return;
      }

      const target = data.user;

      if (target.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        setLoading(false);
        return;
      }

      // Check Google link mapping
      if (target.googleEmail) {
        if (target.googleEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
          setErrorMsg(`Erro de Vínculo: Este usuário já está vinculado a outra conta Google (${target.googleEmail}).`);
          setLoading(false);
          return;
        }
      } else {
        // Link Google account to this estoquista internal record
        const linked = {
          ...target,
          googleEmail: currentUser.email
        };
        await saveEstoquista(linked);
        await logAuditEvent("Vínculo Estoquista", `Conta Google ${currentUser.email} vinculada ao estoquista ${target.name}.`);
      }

      localStorage.removeItem('centralsync_linking');
      await logAuditEvent("Login Estoquista", `Estoquista ${target.name} logou via Google.`);
      onLoginSuccess(currentUser, 'estoquista', target.id, target.name);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao validar credenciais: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCaixaCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!currentUser || !currentUser.email) {
      setErrorMsg("Sessão Google inválida.");
      setLoading(false);
      return;
    }

    try {
      const authFn = httpsCallable(functions, 'authenticateRole');
      const response = await authFn({ role: 'caixa', username: caixaUsername.trim().toLowerCase(), password: caixaPassword });
      const data = response.data as any;

      if (!data.success) {
        setErrorMsg(data.error);
        setLoading(false);
        return;
      }

      const target = data.user;

      if (target.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        setLoading(false);
        return;
      }

      // Check Google link mapping
      if (target.googleEmail) {
        if (target.googleEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
          setErrorMsg(`Erro de Vínculo: Este usuário já está vinculado a outra conta Google (${target.googleEmail}).`);
          setLoading(false);
          return;
        }
      } else {
        // Link Google account to this caixa internal record
        const linked = {
          ...target,
          googleEmail: currentUser.email
        };
        await saveCaixa(linked);
        await logAuditEvent("Vínculo Caixa", `Conta Google ${currentUser.email} vinculada ao caixa ${target.name}.`);
      }

      localStorage.removeItem('centralsync_linking');
      await logAuditEvent("Login Caixa", `Caixa ${target.name} logou via Google.`);
      onLoginSuccess(currentUser, 'caixa', target.id, target.name);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao validar credenciais: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInForMontador = async () => {
    setLoading(true);
    setErrorMsg(null);
    localStorage.setItem('centralsync_linking', 'true');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (!user.email) {
        throw new Error("Não foi possível obter o e-mail da conta Google.");
      }

      // Check if user email is authorized in Firestore database rules
      const isAllowed = await checkEmailIsAllowed(user.email);
      if (!isAllowed) {
        setErrorMsg(`Acesso Bloqueado: O e-mail (${user.email}) não está autorizado no CentralSync Central. Solicite permissão ao administrador corporativo.`);
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }

      // Check if already linked
      const montadorList = await fetchMontadores();
      const matched = montadorList.find((m) => m.googleEmail?.toLowerCase() === user.email.toLowerCase());

      // Always require credential verification — even if already linked via Google
      if (matched && matched.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        await signOut(auth);
        localStorage.removeItem('centralsync_linking');
        setLoading(false);
        return;
      }
      // Always go to step 2 to verify username + password
      setCurrentUser(user);
      setStep(2);
    } catch (e: any) {
      console.error(e);
      localStorage.removeItem('centralsync_linking');
      const errCode = e.code || '';
      const errMessage = e.message || '';
      if (errCode === 'auth/unauthorized-domain' || errMessage.toLowerCase().includes('unauthorized-domain')) {
        setShowDomainHelp(true);
        setErrorMsg("Erro de Domínio Não Autorizado (Firebase Auth).");
      } else {
        setErrorMsg(errMessage || "Ocorreu um erro ao autenticar no Google como Montador.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMontadorCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    if (!currentUser || !currentUser.email) {
      setErrorMsg("Sessão Google inválida.");
      setLoading(false);
      return;
    }

    const cleanUser = montadorUsername.trim().toLowerCase();
    const pass = montadorPassword;

    try {
      const montadorList = await fetchMontadores();
      const inputHash = await hashPassword(pass);
      const target = montadorList.find(
        (m) => m.username.toLowerCase() === cleanUser && 
               (m.password === pass || m.password === inputHash)
      );

      if (!target) {
        setErrorMsg("Credenciais inválidas: Usuário ou Senha incorretos.");
        setLoading(false);
        return;
      }

      // Upgrade plain text password to hash
      if (target.password === pass) {
        try {
          await saveMontador({ ...target, password: inputHash });
        } catch (e) {
          console.error("Failed to upgrade password hash silently", e);
        }
      }

      if (target.active === false) {
        setErrorMsg("Conta Desativada: Seu acesso foi temporariamente bloqueado pelo administrador.");
        setLoading(false);
        return;
      }

      // Check Google link mapping
      if (target.googleEmail) {
        if (target.googleEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
          setErrorMsg(`Erro de Vínculo: Este usuário já está vinculado a outra conta Google (${target.googleEmail}).`);
          setLoading(false);
          return;
        }
      } else {
        // Link Google account to this montador document
        const linked = {
          ...target,
          googleEmail: currentUser.email
        };
        await saveMontador(linked);
        await logAuditEvent("Vínculo Montador", `Conta Google ${currentUser.email} vinculada ao montador ${target.name}.`);
      }

      localStorage.removeItem('centralsync_linking');
      await logAuditEvent("Login Montador", `Montador ${target.name} logou via Google.`);
      onLoginSuccess(currentUser, 'montador', target.id, target.name);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro durante validação do montador: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (currentUser?.email?.toLowerCase() === 'centralmoveis26@gmail.com') {
        if (masterPasswordInput.trim() === '537985') {
          onLoginSuccess(currentUser, 'admin');
          return;
        } else {
          setErrorMsg("Senha incorreta! Tente novamente.");
          setLoading(false);
          return;
        }
      }

      const activePin = await getMasterPin() || MASTER_PASSWORD;
      if (masterPasswordInput.trim() === activePin || masterPasswordInput.trim() === MASTER_PASSWORD) {
        if (currentUser) {
          onLoginSuccess(currentUser);
        }
      } else {
        setErrorMsg("Senha Master de Segurança incorreta! Tente novamente.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Erro ao verificar senha master de segurança no banco.");
    } finally {
      setLoading(false);
    }
  };

  // Keep handleVerifyMasterPassword as legacy, but manager flow now uses handleVerifyManagerCredentials

  const handleCreateMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newMasterPassword.trim().length < 4) {
      setErrorMsg("A Senha Master deve ter pelo menos 4 caracteres para garantir a segurança do ERP.");
      return;
    }

    if (newMasterPassword !== confirmMasterPassword) {
      setErrorMsg("A confirmação da senha não coincide. Por favor, redigite.");
      return;
    }

    setLoading(true);
    try {
      await saveMasterPin(newMasterPassword);
      if (currentUser) {
        onLoginSuccess(currentUser);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Falha ao salvar a senha master definitiva: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut(auth);
    setStep(1);
    setCurrentUser(null);
    setMasterPasswordInput('');
    setNewMasterPassword('');
    setConfirmMasterPassword('');
    setAdminUsername('');
    setAdminPassword('');
    setVendedorUsername('');
    setVendedorPassword('');
    setEstoquistaUsername('');
    setEstoquistaPassword('');
    setCaixaUsername('');
    setCaixaPassword('');
    setMontadorUsername('');
    setMontadorPassword('');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative ambient background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="max-w-md w-full bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 relative">
        
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-900/50 border border-slate-850 text-blue-400 mb-2 shadow-inner">
            <img src="/logo.png" alt="CentralSync Logo" className="w-16 h-16 object-contain rounded-xl" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">CentralSync ERP</h1>
          <p className="text-xs text-slate-400">
            Painel Administrativo & Gestão de Showroom de Móveis
          </p>
        </div>

        {showInstallBtn && step === 1 && (
          <div className="mb-6 flex justify-center">
            <button
              onClick={handleInstallApp}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 border border-emerald-400/30 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-95 cursor-pointer group"
            >
              <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
              <span>Instalar Aplicativo (Baixar)</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/40 text-red-200 text-xs flex gap-2.5 items-start">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* TAB SELECTOR FOR ROLES */}
        {step === 1 && (
          <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 mb-6 font-sans flex-wrap gap-1">
            <button
              type="button"
              onClick={() => { setLoginMode('manager'); setErrorMsg(null); }}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${loginMode === 'manager' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Lock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              Administrativo
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('vendedor'); setErrorMsg(null); }}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${loginMode === 'vendedor' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              Modo Vendedor
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('entregador'); setErrorMsg(null); }}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${loginMode === 'entregador' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              Entregador
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('estoquista'); setErrorMsg(null); }}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${loginMode === 'estoquista' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Package className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              Estoquista
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('caixa'); setErrorMsg(null); }}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${loginMode === 'caixa' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <DollarSign className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              Caixa
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('montador'); setErrorMsg(null); }}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${loginMode === 'montador' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Package className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              Montador
            </button>
          </div>
        )}

        {/* STEP 1: AUTHENTICATION */}
        {step === 1 && (
          <div className="space-y-6">
            {loginMode === 'entregador' ? (
              <form onSubmit={handleDirectEntregadorLogin} className="space-y-4">
                <div className="text-center text-xs text-slate-400 space-y-1 mb-2">
                  <span className="font-semibold text-slate-300 block">Acesso Entregador</span>
                  <span>Entre com o usuário e senha criados pelo administrador.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Usuário do Entregador
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Nome de usuário cadastrado"
                      required
                      value={entregadorUsername}
                      onChange={(e) => setEntregadorUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Senha do Entregador
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Senha do entregador"
                      required
                      value={entregadorPassword}
                      onChange={(e) => setEntregadorPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>
              </form>
            ) : loginMode === 'montador' ? (
              <form onSubmit={handleDirectMontadorLogin} className="space-y-4">
                <div className="text-center text-xs text-slate-400 space-y-1 mb-2">
                  <span className="font-semibold text-slate-300 block">Acesso Montador</span>
                  <span>Entre com o usuário e senha criados pelo administrador.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Usuário do Montador
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Nome de usuário cadastrado"
                      required
                      value={montadorUsername}
                      onChange={(e) => setMontadorUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Senha do Montador
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Senha do montador"
                      required
                      value={montadorPassword}
                      onChange={(e) => setMontadorPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>
              </form>
            ) : (
              <>
                <div className="text-center text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300 block">Controle de Segurança Ativado</span>
                  <span>
                    {loginMode === 'vendedor' 
                      ? 'Autentique-se com sua conta Google vinculada para prosseguir para a área de vendas.' 
                      : loginMode === 'estoquista'
                      ? 'Autentique-se com sua conta Google vinculada para prosseguir para a área de estoque.'
                      : loginMode === 'caixa'
                      ? 'Autentique-se com sua conta Google vinculada para prosseguir para a área de caixa.'
                      : 'Apenas e-mails autenticados e previamente validados têm permissão de acesso e edição ao sistema.'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (loginMode === 'vendedor') handleGoogleSignInForVendedor();
                    else if (loginMode === 'estoquista') handleGoogleSignInForEstoquista();
                    else if (loginMode === 'caixa') handleGoogleSignInForCaixa();
                    else handleGoogleSignIn();
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold text-sm transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      <span>Conectando ao Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      <span>Entrar com Conta Google</span>
                    </>
                  )}
                </button>
              </>
            )}

            {showDomainHelp && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-4 text-xs animate-fade-in mt-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">🛠️ Guia de Liberação Rápida</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Como este é um ambiente de testes dinâmico, você precisa autorizar os domínios do painel do Firebase Console do seu app para permitir o OAuth do Google.
                </p>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passo 1: Acesse as Configurações</p>
                  <a 
                    href="https://console.firebase.google.com/project/centralsync-c5b50/authentication/settings" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:underline font-semibold"
                  >
                    Abrir Firebase Console <HelpCircle className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passo 2: Adicione em Autenticação &gt; "Domínios Autorizados"</p>
                  
                  <div className="space-y-1.5">
                    {[
                      window.location.hostname,
                      "centralsync-c5b550.firebaseapp.com",
                      "centralsync-c5b50.firebaseapp.com"
                    ].filter(Boolean).map((domain) => (
                      <div key={domain} className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[10px]">
                        <span className="text-slate-200 select-all truncate">{domain}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(domain)}
                          className="px-2 py-0.5 text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 rounded text-[9px] font-bold transition-all shrink-0 cursor-pointer"
                        >
                          {copiedDomain === domain ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic leading-snug">
                  * Após salvar no Firebase, basta recarregar esta página para realizar o login Google normalmente.
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CREDENTIAL VERIFICATION (MASTER, SELLER, OR DELIVERER) */}
        {step === 2 && currentUser && (
          loginMode === 'vendedor' ? (
            <form onSubmit={handleVerifySellerCredentials} className="space-y-5">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs uppercase font-bold text-slate-400">Google Vendedor Autenticado</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 block">E-mail:</span>
                  <span className="font-bold text-white text-xs">{currentUser.email}</span>
                </div>
              </div>

              <div className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Usuário do Vendedor
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Nome de usuário cadastrado"
                      required
                      value={vendedorUsername}
                      onChange={(e) => setVendedorUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Senha do Vendedor
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Senha do vendedor"
                      required
                      value={vendedorPassword}
                      onChange={(e) => setVendedorPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Voltar
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Verificar & Entrar <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : loginMode === 'entregador' ? (
            <form onSubmit={handleVerifyDelivererCredentials} className="space-y-5">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs uppercase font-bold text-slate-400">Google Entregador Autenticado</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 block">E-mail:</span>
                  <span className="font-bold text-white text-xs">{currentUser.email}</span>
                </div>
              </div>

              <div className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Usuário do Entregador
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Nome de usuário cadastrado"
                      required
                      value={entregadorUsername}
                      onChange={(e) => setEntregadorUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Senha do Entregador
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Senha do entregador"
                      required
                      value={entregadorPassword}
                      onChange={(e) => setEntregadorPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Voltar
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Verificar & Entrar <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : loginMode === 'estoquista' ? (
            <form onSubmit={handleVerifyEstoquistaCredentials} className="space-y-5">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs uppercase font-bold text-slate-400">Google Estoquista Autenticado</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 block">E-mail:</span>
                  <span className="font-bold text-white text-xs">{currentUser.email}</span>
                </div>
              </div>

              <div className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Usuário do Estoquista
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Nome de usuário cadastrado"
                      required
                      value={estoquistaUsername}
                      onChange={(e) => setEstoquistaUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Senha do Estoquista
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Senha do estoquista"
                      required
                      value={estoquistaPassword}
                      onChange={(e) => setEstoquistaPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Voltar
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Verificar & Entrar <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : loginMode === 'caixa' ? (
            <form onSubmit={handleVerifyCaixaCredentials} className="space-y-5">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs uppercase font-bold text-slate-400">Google Caixa Autenticado</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 block">E-mail:</span>
                  <span className="font-bold text-white text-xs">{currentUser.email}</span>
                </div>
              </div>

              <div className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Usuário do Caixa
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Nome de usuário cadastrado"
                      required
                      value={caixaUsername}
                      onChange={(e) => setCaixaUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Senha do Caixa
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Senha do caixa"
                      required
                      value={caixaPassword}
                      onChange={(e) => setCaixaPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Voltar
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Verificar & Entrar <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : loginMode === 'montador' ? (
            <form onSubmit={handleVerifyMontadorCredentials} className="space-y-5">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs uppercase font-bold text-slate-400">Google Montador Autenticado</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 block">E-mail:</span>
                  <span className="font-bold text-white text-xs">{currentUser.email}</span>
                </div>
              </div>

              <div className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Usuário do Montador
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Nome de usuário cadastrado"
                      required
                      value={montadorUsername}
                      onChange={(e) => setMontadorUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Senha do Montador
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Senha do montador"
                      required
                      value={montadorPassword}
                      onChange={(e) => setMontadorPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Voltar
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Verificar & Entrar <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          ) : (
            // Manager / Admin: requires email (username) + master password
            <form onSubmit={handleVerifyManagerCredentials} className="space-y-5">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs uppercase font-bold text-slate-400">Google Autenticado — Verificação de Credenciais</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 block">Conta Google:</span>
                  <span className="font-bold text-white text-xs">{currentUser.displayName || 'Administrador'}</span>
                  <span className="text-[10px] text-slate-400 block truncate font-mono mt-0.5">{currentUser.email}</span>
                </div>
              </div>

              <div className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Usuário (E-mail Administrativo)
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="E-mail da conta administrativa"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Senha Master de Segurança
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Senha master do sistema"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                      autoComplete="current-password"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-snug">
                    * Além do Google, é necessário informar suas credenciais do sistema para acessar o painel administrativo.
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Voltar
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Verificar & Entrar <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          )
        )}

        {/* STEP 3: CREATE DEFINITIVE MASTER SECURITY PASSWORD (FIRST ACCESS) */}
        {step === 3 && currentUser && (
          <form onSubmit={handleCreateMasterPassword} className="space-y-5">
            <div className="bg-amber-950/40 p-4 border border-amber-800/20 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                <span className="text-xs uppercase font-bold text-amber-400 tracking-wide">Primeiro Acesso Detectado</span>
              </div>
              <p className="text-[11.5px] text-amber-200 leading-relaxed font-sans">
                Seu e-mail está habilitado como administrador inicial. Como este é o primeiro login do sistema, você deve cadastrar a **Senha Master / PIN** definitiva para os controles gerais do ERP.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Crie sua Nova Senha Master
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Digite a senha master"
                    required
                    value={newMasterPassword}
                    onChange={(e) => setNewMasterPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Confirme a Senha Master
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Confirme a senha master"
                    required
                    value={confirmMasterPassword}
                    onChange={(e) => setConfirmMasterPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-900 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <span className="text-[10px] text-slate-500 block leading-snug">
              * Guarde essa senha com segurança. Ela será necessária para logins futuros de administradores e liberação de funções confidenciais.
            </span>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer text-center disabled:opacity-50 animate-pulse"
              >
                Voltar
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer"
              >
                {loading ? "Salvando..." : "Criar & Entrar"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
